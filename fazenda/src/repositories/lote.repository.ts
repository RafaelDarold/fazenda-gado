import { BaseRepository } from "./base.repository.js";
import { query, execute } from "../db/index.js";
import { uuid } from "../utils/index.js";
import type {
  Lote,
  LoteComPasto,
  CreateLoteDTO,
  UpdateLoteDTO,
  AtualizarPesoLoteDTO,
  CategoriaLote,
  UUID,
} from "../types/index.js";

export class LoteRepository extends BaseRepository<Lote> {
  constructor() {
    super("lote");
  }

  // ── Listagens ───────────────────────────────────────────────────────────────

  async findAll(
    apenasAtivos = true,
    fazendaId?: string,
  ): Promise<LoteComPasto[]> {
    const conds: string[] = [];
    const vals: unknown[] = [];
    if (apenasAtivos) conds.push("l.ativo = 1");
    if (fazendaId) {
      conds.push("l.fazenda_id = ?");
      vals.push(fazendaId);
    }
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
    return query<LoteComPasto>(
      `
      SELECT l.*, p.nome AS pasto_nome
      FROM lote l
      LEFT JOIN pasto p ON p.id = l.pasto_atual_id
      ${where}
      ORDER BY l.nome
    `,
      vals,
    );
  }

  async findByCategoria(
    categoria: CategoriaLote,
    fazendaId?: string,
  ): Promise<LoteComPasto[]> {
    const vals: unknown[] = [categoria];
    let extra = "";
    if (fazendaId) {
      extra = " AND l.fazenda_id = ?";
      vals.push(fazendaId);
    }
    return query<LoteComPasto>(
      `
      SELECT l.*, p.nome AS pasto_nome
      FROM lote l
      LEFT JOIN pasto p ON p.id = l.pasto_atual_id
      WHERE l.categoria_principal = ?${extra} AND l.ativo = 1
      ORDER BY l.nome
    `,
      vals,
    );
  }

  async findByPasto(pastoId: UUID): Promise<Lote[]> {
    return query<Lote>(
      "SELECT * FROM lote WHERE pasto_atual_id = ? AND ativo = 1",
      [pastoId],
    );
  }

  // ── Escrita ─────────────────────────────────────────────────────────────────

  async create(dto: CreateLoteDTO): Promise<Lote> {
    const id = uuid();
    await execute(
      `INSERT INTO lote (id, fazenda_id, nome, categoria_principal, pasto_atual_id, observacao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        (dto as any).fazenda_id ?? "",
        dto.nome,
        dto.categoria_principal,
        dto.pasto_atual_id ?? null,
        dto.observacao ?? null,
      ],
    );
    return (await this.findById(id))!;
  }

  async update(
    id: UUID,
    dto: UpdateLoteDTO,
    conn?: import("mysql2/promise").PoolConnection,
  ): Promise<Lote | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.nome !== undefined) {
      fields.push("nome = ?");
      values.push(dto.nome);
    }
    if (dto.categoria_principal !== undefined) {
      fields.push("categoria_principal = ?");
      values.push(dto.categoria_principal);
    }
    if (dto.pasto_atual_id !== undefined) {
      fields.push("pasto_atual_id = ?");
      values.push(dto.pasto_atual_id);
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
    const sql = `UPDATE lote SET ${fields.join(", ")} WHERE id = ?`;
    if (conn) {
      await conn.execute(sql, values as any);
    } else {
      await execute(sql, values);
    }
    return this.findById(id);
  }

  /**
   * Atualiza o peso médio do lote após uma rodada de pesagem.
   * Chamado automaticamente pelo serviço de pesagem.
   */
  async atualizarPeso(id: UUID, dto: AtualizarPesoLoteDTO): Promise<void> {
    await execute(
      `UPDATE lote
       SET peso_medio_arroba = ?, data_ultima_pesagem = ?
       WHERE id = ?`,
      [dto.peso_medio_arroba, dto.data_ultima_pesagem, id],
    );
  }

  /**
   * Incrementa ou decrementa a quantidade atual do lote.
   * Usado nas movimentações de entrada e saída.
   */
  async ajustarQuantidade(
    id: UUID,
    delta: number,
    conn?: import("mysql2/promise").PoolConnection,
  ): Promise<void> {
    const sql = `
      UPDATE lote
      SET quantidade_atual = GREATEST(0, quantidade_atual + ?)
      WHERE id = ?
    `;
    if (conn) {
      await conn.execute(sql, [delta, id]);
    } else {
      await execute(sql, [delta, id]);
    }
  }
}

export const loteRepository = new LoteRepository();

// Utilitário para recalcular contadores de todos os lotes baseado na contagem real
export async function recalcularContadoresLotes(): Promise<void> {
  const { execute } = await import("../db/index.js");
  await execute(`
    UPDATE lote l
    SET quantidade_atual = (
      SELECT COUNT(*) FROM animal a
      WHERE a.lote_id = l.id AND a.ativo = 1
    )
  `);
}
