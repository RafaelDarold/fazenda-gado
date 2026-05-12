import { BaseRepository } from "./base.repository.js";
import { query, execute } from "../db/index.js";
import { uuid } from "../utils/index.js";
import type {
  LancamentoFinanceiro,
  LancamentoDetalhado,
  CreateLancamentoDTO,
  CreateLancamentoCompraDTO,
  CreateLancamentoVendaFrigorificoDTO,
  ConfirmarLancamentoVendaDTO,
  FiltroLancamento,
  StatusLancamento,
  UUID,
  DateString,
  Paginated,
  PaginationParams,
} from "../types/index.js";
import type { PoolConnection } from "mysql2/promise";

export class LancamentoFinanceiroRepository extends BaseRepository<LancamentoFinanceiro> {
  constructor() {
    super("lancamento_financeiro");
  }

  // ── Listagem com filtros ────────────────────────────────────────────────────

  async findAll(
    filtro: FiltroLancamento = {},
    pagination?: PaginationParams,
  ): Promise<Paginated<LancamentoDetalhado>> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filtro.tipo) {
      conditions.push("lf.tipo = ?");
      values.push(filtro.tipo);
    }
    if (filtro.status) {
      conditions.push("lf.status = ?");
      values.push(filtro.status);
    }
    if (filtro.categoria_id) {
      conditions.push("lf.categoria_id = ?");
      values.push(filtro.categoria_id);
    }
    if (filtro.pago !== undefined) {
      conditions.push("lf.pago = ?");
      values.push(filtro.pago ? 1 : 0);
    }
    if (filtro.pasto_id) {
      conditions.push("lf.pasto_id = ?");
      values.push(filtro.pasto_id);
    }
    if (filtro.data_inicio) {
      conditions.push("lf.data >= ?");
      values.push(filtro.data_inicio);
    }
    if (filtro.data_fim) {
      conditions.push("lf.data <= ?");
      values.push(filtro.data_fim);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const page = Math.max(1, pagination?.page ?? 1);
    const size = Math.min(100, pagination?.pageSize ?? 20);
    const offset = (page - 1) * size;

    const baseSql = `
      FROM lancamento_financeiro lf
      JOIN categoria_financeira cf ON cf.id = lf.categoria_id
      LEFT JOIN pasto p ON p.id = lf.pasto_id
      ${where}
    `;

    const selectFields = `
      lf.*,
      cf.nome AS categoria_nome,
      p.nome  AS pasto_nome,
      COALESCE(lf.valor_final, lf.valor_estimado) AS valor_efetivo
    `;

    const [countRows, dataRows] = await Promise.all([
      query<{ total: number }>(`SELECT COUNT(*) AS total ${baseSql}`, values),
      query<LancamentoDetalhado>(
        `SELECT ${selectFields} ${baseSql} ORDER BY lf.data DESC LIMIT ? OFFSET ?`,
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

  async findPendentes(fazendaId?: string): Promise<LancamentoDetalhado[]> {
    return query<LancamentoDetalhado>(`
      SELECT lf.*, cf.nome AS categoria_nome, p.nome AS pasto_nome,
             COALESCE(lf.valor_final, lf.valor_estimado) AS valor_efetivo
      FROM lancamento_financeiro lf
      JOIN categoria_financeira cf ON cf.id = lf.categoria_id
      LEFT JOIN pasto p ON p.id = lf.pasto_id
      WHERE lf.status = 'pendente'
        ${fazendaId ? `AND lf.fazenda_id = '${fazendaId}'` : ""}
      ORDER BY lf.data DESC
    `);
  }

  async findAVencer(dias = 30): Promise<LancamentoDetalhado[]> {
    return query<LancamentoDetalhado>(
      `
      SELECT lf.*, cf.nome AS categoria_nome, p.nome AS pasto_nome,
             COALESCE(lf.valor_final, lf.valor_estimado) AS valor_efetivo
      FROM lancamento_financeiro lf
      JOIN categoria_financeira cf ON cf.id = lf.categoria_id
      LEFT JOIN pasto p ON p.id = lf.pasto_id
      WHERE lf.pago = 0
        AND lf.status = 'confirmado'
        AND lf.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY lf.data_vencimento
    `,
      [dias],
    );
  }

  // ── Resumo financeiro para dashboard ───────────────────────────────────────

  async resumoPeriodo(
    dataInicio: DateString,
    dataFim: DateString,
    fazendaId?: string,
  ) {
    return query<{
      tipo: string;
      total: string;
      quantidade: number;
    }>(
      `
      SELECT
        tipo,
        SUM(COALESCE(valor_final, valor_estimado)) AS total,
        COUNT(*) AS quantidade
      FROM lancamento_financeiro
      WHERE status != 'cancelado'
        AND data BETWEEN ? AND ?
        ${fazendaId ? `AND fazenda_id = '${fazendaId}'` : ""}
      GROUP BY tipo
    `,
      [dataInicio, dataFim],
    );
  }

  // ── Escrita ─────────────────────────────────────────────────────────────────

  async create(
    dto: CreateLancamentoDTO,
    conn?: PoolConnection,
  ): Promise<LancamentoFinanceiro> {
    const id = uuid();
    const sql = `
  INSERT INTO lancamento_financeiro
    (id, fazenda_id, data, tipo, categoria_id, status, valor_final, descricao,
     forma_pagamento, pago, data_vencimento, data_pagamento, pasto_id, observacao)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
    const params = [
      id,
      (dto as any).fazenda_id ?? "",
      dto.data,
      dto.tipo,
      dto.categoria_id,
      "confirmado",
      dto.valor_final,
      dto.descricao,
      dto.forma_pagamento ?? null,
      dto.pago ? 1 : 0,
      dto.data_vencimento ?? null,
      dto.data_pagamento ?? null,
      dto.pasto_id ?? null,
      dto.observacao ?? null,
    ];
    if (conn) {
      await conn.execute(sql, params);
      const [[row]] = await conn.query<any[]>(
        "SELECT * FROM lancamento_financeiro WHERE id = ? LIMIT 1",
        [id],
      );
      return row;
    } else {
      await execute(sql, params);
      return (await this.findById(id))!;
    }
  }

  async createCompra(
    dto: CreateLancamentoCompraDTO,
    conn?: PoolConnection,
  ): Promise<LancamentoFinanceiro> {
    const id = uuid();
    const sql = `
      INSERT INTO lancamento_financeiro
        (id, fazenda_id, data, tipo, categoria_id, status, valor_final, descricao,
         forma_pagamento, pago, data_vencimento)
      VALUES (?, ?, 'despesa', ?, 'confirmado', ?, ?, ?, 0, ?)
    `;
    const params = [
      id,
      (dto as any).fazenda_id ?? "",
      dto.data,
      dto.categoria_id,
      dto.valor_final,
      dto.descricao,
      dto.forma_pagamento,
      dto.data_vencimento ?? null,
    ];
    if (conn) {
      await conn.execute(sql, params);
      const [[row]] = await conn.query<any[]>(
        "SELECT * FROM lancamento_financeiro WHERE id = ? LIMIT 1",
        [id],
      );
      return row;
    } else {
      await execute(sql, params);
      return (await this.findById(id))!;
    }
  }

  /** Etapa 1 da venda ao frigorífico — cria lançamento pendente */
  async createVendaFrigorifico(
    dto: CreateLancamentoVendaFrigorificoDTO,
    conn?: PoolConnection,
  ): Promise<LancamentoFinanceiro> {
    const id = uuid();
    const sql = `
      INSERT INTO lancamento_financeiro
        (id, fazenda_id, data, tipo, categoria_id, status, valor_estimado, descricao,
         forma_pagamento, pago, observacao)
      VALUES (?, ?, 'receita', ?, 'pendente', ?, ?, ?, 0, ?)
    `;
    const params = [
      id,
      (dto as any).fazenda_id ?? "",
      dto.data,
      dto.categoria_id,
      dto.valor_estimado ?? null,
      dto.descricao,
      dto.forma_pagamento ?? null,
      dto.observacao ?? null,
    ];
    if (conn) {
      await conn.execute(sql, params);
      const [[row]] = await conn.query<any[]>(
        "SELECT * FROM lancamento_financeiro WHERE id = ? LIMIT 1",
        [id],
      );
      return row;
    } else {
      await execute(sql, params);
      return (await this.findById(id))!;
    }
  }

  /** Etapa 2 — confirma o lançamento com valor real do boletim */
  async confirmarVenda(
    id: UUID,
    dto: ConfirmarLancamentoVendaDTO,
  ): Promise<LancamentoFinanceiro | null> {
    await execute(
      `
      UPDATE lancamento_financeiro
      SET status          = 'confirmado',
          valor_final     = ?,
          forma_pagamento = COALESCE(?, forma_pagamento),
          data_vencimento = COALESCE(?, data_vencimento),
          observacao      = COALESCE(?, observacao)
      WHERE id = ?
    `,
      [
        dto.valor_final,
        dto.forma_pagamento ?? null,
        dto.data_vencimento ?? null,
        dto.observacao ?? null,
        id,
      ],
    );
    return this.findById(id);
  }

  async marcarComoPago(id: UUID, dataPagamento: DateString): Promise<void> {
    await execute(
      `UPDATE lancamento_financeiro SET pago = 1, data_pagamento = ? WHERE id = ?`,
      [dataPagamento, id],
    );
  }

  async cancelar(id: UUID): Promise<void> {
    await execute(
      `UPDATE lancamento_financeiro SET status = 'cancelado' WHERE id = ? AND is_sistema != 1`,
      [id],
    );
  }

  async updateStatus(
    id: UUID,
    status: StatusLancamento,
    conn?: PoolConnection,
  ): Promise<void> {
    const sql = `UPDATE lancamento_financeiro SET status = ? WHERE id = ?`;
    if (conn) {
      await conn.execute(sql, [status, id]);
    } else {
      await execute(sql, [status, id]);
    }
  }
}

export const lancamentoFinanceiroRepository =
  new LancamentoFinanceiroRepository();
