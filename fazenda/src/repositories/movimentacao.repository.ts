import { BaseRepository } from "./base.repository.js";
import { query, execute } from "../db/index.js";
import { uuid } from "../utils/index.js";
import type {
  Movimentacao,
  MovimentacaoDetalhada,
  TipoMovimentacao,
  DirecaoMovimentacao,
  FiltroMovimentacao,
  UUID,
  Paginated,
  PaginationParams,
} from "../types/index.js";
import type { PoolConnection } from "mysql2/promise";

export class MovimentacaoRepository extends BaseRepository<Movimentacao> {
  constructor() {
    super("movimentacao");
  }

  // ── Listagem ────────────────────────────────────────────────────────────────

  async findAll(
    filtro: FiltroMovimentacao = {},
    pagination?: PaginationParams,
  ): Promise<Paginated<MovimentacaoDetalhada>> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filtro.tipo) {
      conditions.push("m.tipo = ?");
      values.push(filtro.tipo);
    }
    if (filtro.direcao) {
      conditions.push("m.direcao = ?");
      values.push(filtro.direcao);
    }
    if (filtro.animal_id) {
      conditions.push("m.animal_id = ?");
      values.push(filtro.animal_id);
    }
    if (filtro.data_inicio) {
      conditions.push("m.data >= ?");
      values.push(filtro.data_inicio);
    }
    if (filtro.data_fim) {
      conditions.push("m.data <= ?");
      values.push(filtro.data_fim);
    }
    if (filtro.lote_id) {
      conditions.push("m.lote_destino_id = ?");
      values.push(filtro.lote_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const page = Math.max(1, pagination?.page ?? 1);
    const size = Math.min(100, pagination?.pageSize ?? 20);
    const offset = (page - 1) * size;

    const baseSql = `
      FROM movimentacao m
      JOIN animal a ON a.id = m.animal_id
      LEFT JOIN lote  l ON l.id = m.lote_destino_id
      LEFT JOIN pasto p ON p.id = m.pasto_destino_id
      ${where}
    `;

    const [countRows, dataRows] = await Promise.all([
      query<{ total: number }>(`SELECT COUNT(*) AS total ${baseSql}`, values),
      query<MovimentacaoDetalhada>(
        `
        SELECT
          m.*,
          a.brinco    AS animal_brinco,
          a.nome      AS animal_nome,
          a.categoria AS animal_categoria,
          l.nome      AS lote_destino_nome,
          p.nome      AS pasto_destino_nome
        ${baseSql}
        ORDER BY m.data DESC, m.created_at DESC
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

  async findByAnimal(animalId: UUID): Promise<MovimentacaoDetalhada[]> {
    return query<MovimentacaoDetalhada>(
      `
      SELECT
        m.*,
        a.brinco    AS animal_brinco,
        a.nome      AS animal_nome,
        a.categoria AS animal_categoria,
        l.nome      AS lote_destino_nome,
        p.nome      AS pasto_destino_nome
      FROM movimentacao m
      JOIN animal a ON a.id = m.animal_id
      LEFT JOIN lote  l ON l.id = m.lote_destino_id
      LEFT JOIN pasto p ON p.id = m.pasto_destino_id
      WHERE m.animal_id = ?
      ORDER BY m.data DESC
    `,
      [animalId],
    );
  }

  // ── Escrita ─────────────────────────────────────────────────────────────────

  async create(
    dados: {
      animal_id: UUID;
      tipo: TipoMovimentacao;
      direcao: DirecaoMovimentacao;
      data: string;
      pasto_destino_id?: UUID;
      lote_destino_id?: UUID;
      origem_destino?: string;
      causa_obito?: string;
      lancamento_financeiro_id?: UUID;
      numero_gta?: string;
      observacao?: string;
    },
    conn?: PoolConnection,
  ): Promise<Movimentacao> {
    const id = uuid();
    const sql = `
      INSERT INTO movimentacao
        (id, fazenda_id, animal_id, tipo, direcao, data, pasto_destino_id, lote_destino_id,
         origem_destino, causa_obito, lancamento_financeiro_id, numero_gta, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      id,
      dados.animal_id,
      dados.tipo,
      dados.direcao,
      dados.data,
      dados.pasto_destino_id ?? null,
      dados.lote_destino_id ?? null,
      dados.origem_destino ?? null,
      dados.causa_obito ?? null,
      dados.lancamento_financeiro_id ?? null,
      dados.numero_gta ?? null,
      dados.observacao ?? null,
    ];

    if (conn) {
      await conn.execute(sql, params);
      const [[row]] = await conn.query<any[]>(
        "SELECT * FROM movimentacao WHERE id = ? LIMIT 1",
        [id],
      );
      return row;
    } else {
      await execute(sql, params);
      return (await this.findById(id))!;
    }
  }

  // ── Relatórios ──────────────────────────────────────────────────────────────

  async contarPorTipoPeriodo(dataInicio: string, dataFim: string) {
    return query<{ tipo: string; direcao: string; total: number }>(
      `
      SELECT tipo, direcao, COUNT(*) AS total
      FROM movimentacao
      WHERE data BETWEEN ? AND ?
      GROUP BY tipo, direcao
      ORDER BY total DESC
    `,
      [dataInicio, dataFim],
    );
  }
}

export const movimentacaoRepository = new MovimentacaoRepository();
