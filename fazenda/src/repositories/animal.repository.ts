import { BaseRepository } from "./base.repository.js";
import { query, execute } from "../db/index.js";
import { uuid } from "../utils/index.js";
import type {
  Animal,
  AnimalDetalhado,
  CreateAnimalDTO,
  UpdateAnimalDTO,
  FiltroAnimal,
  UUID,
  Paginated,
  PaginationParams,
} from "../types/index.js";

export class AnimalRepository extends BaseRepository<Animal> {
  constructor() {
    super("animal");
  }

  // ── Busca individual ────────────────────────────────────────────────────────

  async findByBrinco(brinco: string): Promise<Animal | null> {
    const rows = await query<Animal>(
      "SELECT * FROM animal WHERE brinco = ? LIMIT 1",
      [brinco],
    );
    return rows[0] ?? null;
  }

  /**
   * Retorna animal com todos os relacionamentos resolvidos via JOIN.
   * Inclui último peso e GMD calculado.
   */
  async findDetalhadoById(id: UUID): Promise<AnimalDetalhado | null> {
    const rows = await query<AnimalDetalhado>(
      `
      SELECT
        a.*,
        l.nome                        AS lote_nome,
        p.nome                        AS pasto_nome,
        mae.brinco                    AS mae_brinco,
        pai.brinco                    AS pai_brinco,
        ult.peso_arroba               AS ultimo_peso_arroba,
        ult.data                      AS ultima_pesagem_data,
        ult.gmd_arroba                AS gmd_arroba
      FROM animal a
      LEFT JOIN lote    l   ON l.id  = a.lote_id
      LEFT JOIN pasto   p   ON p.id  = l.pasto_atual_id
      LEFT JOIN animal  mae ON mae.id = a.mae_id
      LEFT JOIN animal  pai ON pai.id = a.pai_id
      LEFT JOIN (
        SELECT animal_id, peso_arroba, data, gmd_arroba
        FROM pesagem
        WHERE (animal_id, data) IN (
          SELECT animal_id, MAX(data) FROM pesagem GROUP BY animal_id
        )
      ) ult ON ult.animal_id = a.id
      WHERE a.id = ?
      LIMIT 1
    `,
      [id],
    );
    return rows[0] ?? null;
  }

  // ── Listagem com filtros ────────────────────────────────────────────────────

  async findAll(
    filtro: FiltroAnimal = {},
    pagination?: PaginationParams,
  ): Promise<Paginated<AnimalDetalhado>> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    conditions.push("a.ativo = ?");
    values.push(filtro.ativo !== false ? 1 : 0);

    if (filtro.sexo) {
      conditions.push("a.sexo = ?");
      values.push(filtro.sexo);
    }
    if (filtro.categoria) {
      conditions.push("a.categoria = ?");
      values.push(filtro.categoria);
    }
    if (filtro.lote_id) {
      conditions.push("a.lote_id = ?");
      values.push(filtro.lote_id);
    }
    if (filtro.raca) {
      conditions.push("a.raca = ?");
      values.push(filtro.raca);
    }
    if (filtro.brinco) {
      conditions.push("a.brinco LIKE ?");
      values.push(`%${filtro.brinco}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const page = Math.max(1, pagination?.page ?? 1);
    const size = Math.min(100, pagination?.pageSize ?? 20);
    const offset = (page - 1) * size;

    const baseSql = `
      FROM animal a
      LEFT JOIN lote   l   ON l.id   = a.lote_id
      LEFT JOIN pasto  p   ON p.id   = l.pasto_atual_id
      LEFT JOIN animal mae ON mae.id = a.mae_id
      LEFT JOIN animal pai ON pai.id = a.pai_id
      LEFT JOIN (
        SELECT animal_id, peso_arroba, data, gmd_arroba
        FROM pesagem
        WHERE (animal_id, data) IN (
          SELECT animal_id, MAX(data) FROM pesagem GROUP BY animal_id
        )
      ) ult ON ult.animal_id = a.id
      ${where}
    `;

    const [countRows, dataRows] = await Promise.all([
      query<{ total: number }>(`SELECT COUNT(*) AS total ${baseSql}`, values),
      query<AnimalDetalhado>(
        `
        SELECT
          a.*,
          l.nome       AS lote_nome,
          p.nome       AS pasto_nome,
          mae.brinco   AS mae_brinco,
          pai.brinco   AS pai_brinco,
          ult.peso_arroba        AS ultimo_peso_arroba,
          ult.data               AS ultima_pesagem_data,
          ult.gmd_arroba         AS gmd_arroba
        ${baseSql}
        ORDER BY a.brinco
        LIMIT ? OFFSET ?
      `,
        [...values, size, offset],
      ),
    ]);

    const total = countRows[0]?.total ?? 0;
    return {
      data: dataRows,
      total,
      page,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    };
  }

  /** Retorna todos os animais de um lote — usado na pesagem em lote */
  async findByLote(loteId: UUID): Promise<Animal[]> {
    return query<Animal>(
      "SELECT * FROM animal WHERE lote_id = ? AND ativo = 1 ORDER BY brinco",
      [loteId],
    );
  }

  /** Retorna filhos de uma matriz */
  async findCrias(maeId: UUID): Promise<Animal[]> {
    return query<Animal>(
      "SELECT * FROM animal WHERE mae_id = ? ORDER BY data_nascimento DESC",
      [maeId],
    );
  }

  // ── Escrita ─────────────────────────────────────────────────────────────────

  async create(
    dto: CreateAnimalDTO,
    conn?: import("mysql2/promise").PoolConnection,
  ): Promise<Animal> {
    const id = uuid();
    const sql = `
    INSERT INTO animal
      (id, brinco, nome, raca, sexo, categoria, data_nascimento,
       mae_id, pai_id, lote_id, peso_entrada_arroba, observacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const params = [
      id,
      dto.brinco,
      dto.nome ?? null,
      dto.raca,
      dto.sexo,
      dto.categoria,
      dto.data_nascimento ?? null,
      dto.mae_id ?? null,
      dto.pai_id ?? null,
      dto.lote_id ?? null,
      dto.peso_entrada_arroba ?? null,
      dto.observacao ?? null,
    ];

    if (conn) {
      await conn.execute(sql, params);
      const [rows] = await conn.query<any[]>(
        "SELECT * FROM animal WHERE id = ? LIMIT 1",
        [id],
      );
      return rows[0] as Animal;
    } else {
      await execute(sql, params);
      return (await this.findById(id))!;
    }
  }
  async update(id: UUID, dto: UpdateAnimalDTO): Promise<Animal | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.nome !== undefined) {
      fields.push("nome = ?");
      values.push(dto.nome);
    }
    if (dto.raca !== undefined) {
      fields.push("raca = ?");
      values.push(dto.raca);
    }
    if (dto.categoria !== undefined) {
      fields.push("categoria = ?");
      values.push(dto.categoria);
    }
    if (dto.lote_id !== undefined) {
      fields.push("lote_id = ?");
      values.push(dto.lote_id);
    }
    if (dto.data_nascimento !== undefined) {
      fields.push("data_nascimento = ?");
      values.push(dto.data_nascimento);
    }
    if (dto.mae_id !== undefined) {
      fields.push("mae_id = ?");
      values.push(dto.mae_id);
    }
    if (dto.pai_id !== undefined) {
      fields.push("pai_id = ?");
      values.push(dto.pai_id);
    }
    if (dto.ativo !== undefined) {
      fields.push("ativo = ?");
      values.push(dto.ativo ? 1 : 0);
    }
    if (dto.observacao !== undefined) {
      fields.push("observacao = ?");
      values.push(dto.observacao);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await execute(
      `UPDATE animal SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  }

  // ── Contagens para dashboard ────────────────────────────────────────────────

  async contarPorCategoria(): Promise<
    Array<{ categoria: string; total: number }>
  > {
    return query(
      `SELECT categoria, COUNT(*) AS total
       FROM animal WHERE ativo = 1
       GROUP BY categoria ORDER BY categoria`,
    );
  }

  async totalAtivo(): Promise<number> {
    const rows = await query<{ total: number }>(
      "SELECT COUNT(*) AS total FROM animal WHERE ativo = 1",
    );
    return rows[0]?.total ?? 0;
  }
}

export const animalRepository = new AnimalRepository();
