import { BaseRepository } from "./base.repository.js";
import { query, execute } from "../db/index.js";
import { uuid } from "../utils/index.js";
import type {
  SaudeEvento,
  SaudeEventoDetalhado,
  SaudeEventoAnimal,
  FiltroSaudeEvento,
  UUID,
} from "../types/index.js";
import type { PoolConnection } from "mysql2/promise";

export class SaudeEventoRepository extends BaseRepository<SaudeEvento> {
  constructor() {
    super("saude_evento");
  }

  // ── Listagens ───────────────────────────────────────────────────────────────

  async findAll(
    filtro: FiltroSaudeEvento = {},
  ): Promise<SaudeEventoDetalhado[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filtro.tipo) {
      conditions.push("se.tipo = ?");
      values.push(filtro.tipo);
    }
    if (filtro.escopo) {
      conditions.push("se.escopo = ?");
      values.push(filtro.escopo);
    }
    if (filtro.lote_id) {
      conditions.push("se.lote_id = ?");
      values.push(filtro.lote_id);
    }
    if (filtro.data_inicio) {
      conditions.push("se.data_aplicacao >= ?");
      values.push(filtro.data_inicio);
    }
    if (filtro.data_fim) {
      conditions.push("se.data_aplicacao <= ?");
      values.push(filtro.data_fim);
    }
    if (filtro.proximos_dias !== undefined) {
      conditions.push(
        "se.data_proxima BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)",
      );
      values.push(filtro.proximos_dias);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    return query<SaudeEventoDetalhado>(
      `
      SELECT se.*, l.nome AS lote_nome
      FROM saude_evento se
      LEFT JOIN lote l ON l.id = se.lote_id
      ${where}
      ORDER BY se.data_aplicacao DESC
    `,
      values,
    );
  }

  /** Eventos próximos de repetição — para alertas no dashboard */
  async findProximosReforcos(dias = 30): Promise<SaudeEventoDetalhado[]> {
    return this.findAll({ proximos_dias: dias });
  }

  // ── Vínculo individual ──────────────────────────────────────────────────────

  async findAnimaisByEvento(eventoId: UUID): Promise<SaudeEventoAnimal[]> {
    return query<SaudeEventoAnimal>(
      `
      SELECT
        sea.*,
        a.brinco    AS animal_brinco,
        a.nome      AS animal_nome,
        a.categoria AS animal_categoria
      FROM saude_evento_animal sea
      JOIN animal a ON a.id = sea.animal_id
      WHERE sea.saude_evento_id = ?
      ORDER BY a.brinco
    `,
      [eventoId],
    );
  }

  async findByAnimal(animalId: UUID): Promise<SaudeEventoDetalhado[]> {
    return query<SaudeEventoDetalhado>(
      `
      SELECT se.*, l.nome AS lote_nome
      FROM saude_evento se
      LEFT JOIN lote l ON l.id = se.lote_id
      WHERE se.id IN (
        SELECT saude_evento_id FROM saude_evento_animal WHERE animal_id = ?
      )
      ORDER BY se.data_aplicacao DESC
    `,
      [animalId],
    );
  }

  // ── Escrita ─────────────────────────────────────────────────────────────────

  async createEvento(
    dados: Omit<SaudeEvento, "id" | "created_at">,
    conn?: PoolConnection,
  ): Promise<SaudeEvento> {
    const id = uuid();
    const sql = `
      INSERT INTO saude_evento
        (id, fazenda_id, escopo, lote_id, tipo, produto, fabricante, lote_produto,
         data_aplicacao, data_proxima, dose_ml_por_animal, quantidade_animais,
         custo_total, lancamento_financeiro_id, responsavel, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      id,
      (dados as any).fazenda_id ?? "",
      dados.escopo,
      dados.lote_id ?? null,
      dados.tipo,
      dados.produto,
      dados.fabricante ?? null,
      dados.lote_produto ?? null,
      dados.data_aplicacao,
      dados.data_proxima ?? null,
      dados.dose_ml_por_animal ?? null,
      dados.quantidade_animais,
      dados.custo_total ?? null,
      dados.lancamento_financeiro_id ?? null,
      dados.responsavel ?? null,
      dados.observacao ?? null,
    ];
    if (conn) {
      await conn.execute(sql, params);
    } else {
      await execute(sql, params);
    }
    return (await this.findById(id))!;
  }

  /** Vincula um animal a um evento de saúde */
  async vincularAnimal(
    eventoId: UUID,
    animalId: UUID,
    doseAplicadaMl?: number,
    observacaoIndividual?: string,
    conn?: PoolConnection,
  ): Promise<void> {
    const id = uuid();
    const sql = `
      INSERT IGNORE INTO saude_evento_animal
        (id, saude_evento_id, animal_id, dose_aplicada_ml, observacao_individual)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      id,
      eventoId,
      animalId,
      doseAplicadaMl ?? null,
      observacaoIndividual ?? null,
    ];
    if (conn) {
      await conn.execute(sql, params);
    } else {
      await execute(sql, params);
    }
  }

  /** Vincula todos os animais ativos de um lote a um evento */
  async vincularLote(
    eventoId: UUID,
    loteId: UUID,
    conn?: PoolConnection,
  ): Promise<number> {
    const animais = await query<{ id: UUID }>(
      "SELECT id FROM animal WHERE lote_id = ? AND ativo = 1",
      [loteId],
    );
    for (const animal of animais) {
      await this.vincularAnimal(
        eventoId,
        animal.id,
        undefined,
        undefined,
        conn,
      );
    }
    return animais.length;
  }

  /** Vincula todos os animais ativos do rebanho a um evento */
  async vincularTodos(eventoId: UUID, conn?: PoolConnection): Promise<number> {
    const animais = await query<{ id: UUID }>(
      "SELECT id FROM animal WHERE ativo = 1",
    );
    for (const animal of animais) {
      await this.vincularAnimal(
        eventoId,
        animal.id,
        undefined,
        undefined,
        conn,
      );
    }
    return animais.length;
  }
}

export const saudeEventoRepository = new SaudeEventoRepository();
