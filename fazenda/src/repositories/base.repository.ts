import type { PoolConnection } from 'mysql2/promise'
import { query, execute } from '../db/index.js'
import type { UUID, Paginated, PaginationParams } from '../types/index.js'

/**
 * Classe base para todos os repositórios.
 * Fornece operações CRUD genéricas e suporte a transações.
 */
export abstract class BaseRepository<T> {
  constructor(protected readonly tableName: string) {}

  // ── Busca por ID ────────────────────────────────────────────────────────────

  async findById(id: UUID, conn?: PoolConnection): Promise<T | null> {
    const sql = `SELECT * FROM \`${this.tableName}\` WHERE id = ? LIMIT 1`
    const rows = conn
      ? (await conn.query(sql, [id]))[0] as T[]
      : await query<T>(sql, [id])
    return rows[0] ?? null
  }

  // ── Paginação genérica ──────────────────────────────────────────────────────

  async paginate(
    params: PaginationParams & { where?: string; values?: unknown[] },
  ): Promise<Paginated<T>> {
    const page     = Math.max(1, params.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20))
    const offset   = (page - 1) * pageSize
    const where    = params.where ? `WHERE ${params.where}` : ''
    const values   = params.values ?? []

    const countSql = `SELECT COUNT(*) as total FROM \`${this.tableName}\` ${where}`
    const dataSql  = `SELECT * FROM \`${this.tableName}\` ${where} LIMIT ? OFFSET ?`

    const [countRows, dataRows] = await Promise.all([
      query<{ total: number }>(countSql, values),
      query<T>(dataSql, [...values, pageSize, offset]),
    ])

    const total = countRows[0]?.total ?? 0

    return {
      data: dataRows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  // ── Soft delete (ativo = 0) ─────────────────────────────────────────────────

  async deactivate(id: UUID, conn?: PoolConnection): Promise<boolean> {
    const sql = `UPDATE \`${this.tableName}\` SET ativo = 0 WHERE id = ?`
    const result = conn
      ? (await conn.execute(sql, [id]))[0] as import('mysql2').ResultSetHeader
      : await execute(sql, [id])
    return result.affectedRows > 0
  }

  // ── Delete físico (usar com cautela) ───────────────────────────────────────

  async delete(id: UUID, conn?: PoolConnection): Promise<boolean> {
    const sql = `DELETE FROM \`${this.tableName}\` WHERE id = ?`
    const result = conn
      ? (await conn.execute(sql, [id]))[0] as import('mysql2').ResultSetHeader
      : await execute(sql, [id])
    return result.affectedRows > 0
  }

  // ── Verificação de existência ───────────────────────────────────────────────

  async exists(id: UUID): Promise<boolean> {
    const rows = await query<{ c: number }>(
      `SELECT 1 as c FROM \`${this.tableName}\` WHERE id = ? LIMIT 1`,
      [id],
    )
    return rows.length > 0
  }
}
