import mysql from "mysql2/promise";
import { env } from "../config/env.js";

// Pool singleton — criado uma vez, reutilizado em toda a aplicação
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  connectionLimit: 3,
  waitForConnections: true,
  queueLimit: 0,
  timezone: "-03:00",
  decimalNumbers: false,
  typeCast(field, next) {
    if (field.type === "BIT" && field.length === 1) {
      const bytes = field.buffer();
      return bytes ? bytes[0] === 1 : null;
    }
    if (field.type === "TINY" && field.length === 1) {
      return field.string() === "1";
    }
    return next();
  },
});

// Configura timeout de lock por sessao ao criar cada conexao
pool.on("connection", (conn) => {
  conn.query("SET innodb_lock_wait_timeout = 10");
  conn.query("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED");
});

// ── Utilitários de query ─────────────────────────────────────────────────────

/**
 * Executa uma query SELECT e retorna array de linhas tipadas.
 * Uso: const animais = await query<Animal>('SELECT * FROM animal WHERE ativo = 1')
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

/**
 * Executa INSERT / UPDATE / DELETE.
 * Retorna ResultSetHeader com insertId, affectedRows, changedRows.
 */
export async function execute(
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any[],
): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

/**
 * Executa múltiplas operações dentro de uma transação.
 * Em caso de erro faz rollback automático e relança a exceção.
 *
 * Uso:
 *   await transaction(async (conn) => {
 *     await conn.execute('INSERT INTO movimentacao ...', [...])
 *     await conn.execute('INSERT INTO lancamento_financeiro ...', [...])
 *   })
 */
export async function transaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Testa a conexão com o banco de dados.
 * Chame no startup do servidor para falhar rápido se o banco não responder.
 */
export async function testConnection(): Promise<void> {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

export default pool;
