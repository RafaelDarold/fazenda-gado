import { BaseRepository } from "./base.repository.js";
import { query, execute } from "../db/index.js";
import { uuid } from "../utils/index.js";
import type {
  AbastecimentoCocho,
  AbastecimentoCochoDetalhado,
  CreateAbastecimentoCochoDTO,
  UUID,
  DateString,
} from "../types/index.js";
import type { PoolConnection } from "mysql2/promise";

export class AbastecimentoCochoRepository extends BaseRepository<AbastecimentoCocho> {
  constructor() {
    super("abastecimento_cocho");
  }

  async findByPasto(
    pastoId: UUID,
    dataInicio?: DateString,
    dataFim?: DateString,
  ): Promise<AbastecimentoCochoDetalhado[]> {
    const conditions = ["ac.pasto_id = ?"];
    const values: unknown[] = [pastoId];

    if (dataInicio) {
      conditions.push("ac.data >= ?");
      values.push(dataInicio);
    }
    if (dataFim) {
      conditions.push("ac.data <= ?");
      values.push(dataFim);
    }

    return query<AbastecimentoCochoDetalhado>(
      `
      SELECT
        ac.*,
        p.nome AS pasto_nome,
        CASE WHEN ac.custo_total IS NOT NULL AND ac.quantidade_kg > 0
          THEN ROUND(ac.custo_total / ac.quantidade_kg, 4)
          ELSE NULL
        END AS custo_por_kg
      FROM abastecimento_cocho ac
      JOIN pasto p ON p.id = ac.pasto_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ac.data DESC
    `,
      values,
    );
  }

  async findAll(
    dataInicio?: DateString,
    dataFim?: DateString,
  ): Promise<AbastecimentoCochoDetalhado[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (dataInicio) {
      conditions.push("ac.data >= ?");
      values.push(dataInicio);
    }
    if (dataFim) {
      conditions.push("ac.data <= ?");
      values.push(dataFim);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    return query<AbastecimentoCochoDetalhado>(
      `
      SELECT
        ac.*,
        p.nome AS pasto_nome,
        CASE WHEN ac.custo_total IS NOT NULL AND ac.quantidade_kg > 0
          THEN ROUND(ac.custo_total / ac.quantidade_kg, 4)
          ELSE NULL
        END AS custo_por_kg
      FROM abastecimento_cocho ac
      JOIN pasto p ON p.id = ac.pasto_id
      ${where}
      ORDER BY ac.data DESC
    `,
      values,
    );
  }

  async create(
    dto: CreateAbastecimentoCochoDTO,
    lancamentoId?: UUID,
    conn?: PoolConnection,
  ): Promise<AbastecimentoCocho> {
    const id = uuid();
    const sql = `
      INSERT INTO abastecimento_cocho
        (id, fazenda_id, pasto_id, data, tipo, quantidade_kg, custo_total,
         fornecedor, lancamento_financeiro_id, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      id,
      dto.pasto_id,
      dto.data,
      dto.tipo,
      dto.quantidade_kg,
      dto.custo_total ?? null,
      dto.fornecedor ?? null,
      lancamentoId ?? null,
      dto.observacao ?? null,
    ];
    if (conn) {
      await conn.execute(sql, params);
      const [[row]] = await conn.query<any[]>(
        "SELECT * FROM abastecimento_cocho WHERE id = ? LIMIT 1",
        [id],
      );
      return row;
    } else {
      await execute(sql, params);
      return (await this.findById(id))!;
    }
  }
}

export const abastecimentoCochoRepository = new AbastecimentoCochoRepository();
