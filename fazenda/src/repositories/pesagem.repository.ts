import { BaseRepository } from "./base.repository.js";
import { query, execute } from "../db/index.js";
import { uuid } from "../utils/index.js";
import type {
  Pesagem,
  PesagemDetalhada,
  CreatePesagemDTO,
  UUID,
  DateString,
} from "../types/index.js";
import type { PoolConnection } from "mysql2/promise";

export class PesagemRepository extends BaseRepository<Pesagem> {
  constructor() {
    super("pesagem");
  }

  // ── Listagens ───────────────────────────────────────────────────────────────

  async findByAnimal(animalId: UUID, limite = 20): Promise<PesagemDetalhada[]> {
    return query<PesagemDetalhada>(
      `
      SELECT
        p.*,
        a.brinco        AS animal_brinco,
        a.nome          AS animal_nome,
        a.categoria     AS animal_categoria,
        ant.peso_arroba AS peso_anterior_arroba,
        DATEDIFF(p.data, ant.data) AS dias_desde_ultima_pesagem
      FROM pesagem p
      JOIN animal a ON a.id = p.animal_id
      LEFT JOIN pesagem ant
        ON ant.animal_id = p.animal_id
        AND ant.data = (
          SELECT MAX(data) FROM pesagem
          WHERE animal_id = p.animal_id AND data < p.data
        )
      WHERE p.animal_id = ?
      ORDER BY p.data DESC
      LIMIT ?
    `,
      [animalId, limite],
    );
  }

  async findByLote(
    loteId: UUID,
    data?: DateString,
  ): Promise<PesagemDetalhada[]> {
    const dateFilter = data ? "AND p.data = ?" : "";
    const params: unknown[] = [loteId];
    if (data) params.push(data);

    return query<PesagemDetalhada>(
      `
      SELECT
        p.*,
        a.brinco    AS animal_brinco,
        a.nome      AS animal_nome,
        a.categoria AS animal_categoria,
        NULL        AS peso_anterior_arroba,
        NULL        AS dias_desde_ultima_pesagem
      FROM pesagem p
      JOIN animal a ON a.id = p.animal_id
      WHERE a.lote_id = ? ${dateFilter}
      ORDER BY p.data DESC, a.brinco
    `,
      params,
    );
  }

  /** Última pesagem de cada animal de um lote — para calcular peso médio */
  async findUltimasPorLote(loteId: UUID): Promise<Pesagem[]> {
    return query<Pesagem>(
      `
      SELECT p.*
      FROM pesagem p
      JOIN animal a ON a.id = p.animal_id
      WHERE a.lote_id = ? AND a.ativo = 1
        AND p.data = (
          SELECT MAX(data) FROM pesagem WHERE animal_id = p.animal_id
        )
    `,
      [loteId],
    );
  }

  // ── Escrita ─────────────────────────────────────────────────────────────────

  async create(
    dto: CreatePesagemDTO,
    gmdArroba?: number,
    conn?: PoolConnection,
  ): Promise<Pesagem> {
    const id = uuid();
    const sql = `
      INSERT INTO pesagem (id, fazenda_id, animal_id, data, peso_arroba, gmd_arroba, responsavel, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      id,
      (dto as any).fazenda_id ?? "",
      dto.animal_id,
      dto.data,
      dto.peso_arroba,
      gmdArroba ?? null,
      dto.responsavel ?? null,
      dto.observacao ?? null,
    ];

    if (conn) {
      await conn.execute(sql, params);
      const [[row]] = await conn.query<any[]>(
        "SELECT * FROM pesagem WHERE id = ? LIMIT 1",
        [id],
      );
      return row;
    } else {
      await execute(sql, params);
    }
    return (await this.findById(id))!;
  }

  /** Retorna a pesagem mais recente de um animal */
  async findUltima(animalId: UUID): Promise<Pesagem | null> {
    const rows = await query<Pesagem>(
      "SELECT * FROM pesagem WHERE animal_id = ? ORDER BY data DESC LIMIT 1",
      [animalId],
    );
    return rows[0] ?? null;
  }
}

export const pesagemRepository = new PesagemRepository();
