import { BaseRepository } from "./base.repository.js";
import { query, execute } from "../db/index.js";
import { uuid } from "../utils/index.js";
import type {
  Pasto,
  PastoComOcupacao,
  CreatePastoDTO,
  UpdatePastoDTO,
  UUID,
} from "../types/index.js";

export class PastoRepository extends BaseRepository<Pasto> {
  constructor() {
    super("pasto");
  }

  // ── Listagens ───────────────────────────────────────────────────────────────

  async findAll(apenasAtivos = true, fazendaId?: string): Promise<Pasto[]> {
    const conds: string[] = [];
    const vals: unknown[] = [];
    if (apenasAtivos) conds.push("ativo = 1");
    if (fazendaId) {
      conds.push("fazenda_id = ?");
      vals.push(fazendaId);
    }
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
    return query<Pasto>(`SELECT * FROM pasto ${where} ORDER BY nome`, vals);
  }

  /**
   * Retorna todos os pastos com informações de ocupação atual.
   * Usado no dashboard de pastagens.
   */
  async findComOcupacao(fazendaId?: string): Promise<PastoComOcupacao[]> {
    const extra = fazendaId ? `WHERE p.fazenda_id = '${fazendaId}'` : "";
    return query<PastoComOcupacao>(`
      SELECT
        p.*,
        l.nome                  AS lote_atual_nome,
        op.quantidade_animais   AS quantidade_animais_atual,
        op.lotacao_ua           AS lotacao_atual_ua,
        CASE
          WHEN p.capacidade_ua IS NOT NULL AND op.lotacao_ua IS NOT NULL
          THEN ROUND((op.lotacao_ua / p.capacidade_ua) * 100, 1)
          ELSE NULL
        END                     AS percentual_lotacao
      FROM pasto p
      LEFT JOIN ocupacao_pasto op
        ON op.pasto_id = p.id AND op.data_saida IS NULL
      LEFT JOIN lote l
        ON l.id = op.lote_id
      WHERE p.ativo = 1
      ORDER BY p.nome
    `);
  }

  // ── Escrita ─────────────────────────────────────────────────────────────────

  async create(dto: CreatePastoDTO): Promise<Pasto> {
    const id = uuid();
    await execute(
      `INSERT INTO pasto (id, fazenda_id, nome, area_hectares, tipo_capim, capacidade_ua, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        (dto as any).fazenda_id ?? "",
        dto.nome,
        dto.area_hectares,
        dto.tipo_capim ?? null,
        dto.capacidade_ua ?? null,
        dto.observacao ?? null,
      ],
    );
    return (await this.findById(id))!;
  }

  async update(id: UUID, dto: UpdatePastoDTO): Promise<Pasto | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.nome !== undefined) {
      fields.push("nome = ?");
      values.push(dto.nome);
    }
    if (dto.area_hectares !== undefined) {
      fields.push("area_hectares = ?");
      values.push(dto.area_hectares);
    }
    if (dto.tipo_capim !== undefined) {
      fields.push("tipo_capim = ?");
      values.push(dto.tipo_capim);
    }
    if (dto.capacidade_ua !== undefined) {
      fields.push("capacidade_ua = ?");
      values.push(dto.capacidade_ua);
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
    await execute(`UPDATE pasto SET ${fields.join(", ")} WHERE id = ?`, values);
    return this.findById(id);
  }
}

export const pastoRepository = new PastoRepository();
