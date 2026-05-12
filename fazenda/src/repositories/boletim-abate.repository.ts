import { BaseRepository } from "./base.repository.js";
import { query, execute } from "../db/index.js";
import { uuid } from "../utils/index.js";
import type {
  BoletimAbate,
  BoletimAbateDetalhado,
  UUID,
} from "../types/index.js";
import type { PoolConnection } from "mysql2/promise";

export class BoletimAbateRepository extends BaseRepository<BoletimAbate> {
  constructor() {
    super("boletim_abate");
  }

  async findByLancamento(
    lancamentoId: UUID,
  ): Promise<BoletimAbateDetalhado | null> {
    const rows = await query<BoletimAbateDetalhado>(
      `
      SELECT
        b.*,
        ROUND(b.peso_carcaca_total_arroba / b.quantidade_animais, 3) AS peso_medio_carcaca_arroba,
        ROUND(b.valor_calculado           / b.quantidade_animais, 2) AS valor_por_animal
      FROM boletim_abate b
      WHERE b.lancamento_financeiro_id = ?
      LIMIT 1
    `,
      [lancamentoId],
    );
    return rows[0] ?? null;
  }

  async findAll(): Promise<BoletimAbateDetalhado[]> {
    return query<BoletimAbateDetalhado>(`
      SELECT
        b.*,
        ROUND(b.peso_carcaca_total_arroba / b.quantidade_animais, 3) AS peso_medio_carcaca_arroba,
        ROUND(b.valor_calculado           / b.quantidade_animais, 2) AS valor_por_animal
      FROM boletim_abate b
      ORDER BY b.data_abate DESC
    `);
  }

  async create(
    dados: {
      lancamento_financeiro_id: UUID;
      frigorifico: string;
      data_abate: string;
      data_boletim: string;
      quantidade_animais: number;
      peso_vivo_total_arroba?: number;
      peso_carcaca_total_arroba: number;
      rendimento_percent: number;
      valor_arroba: number;
      bonificacoes?: number;
      descontos?: number;
      numero_gta?: string;
      numero_nfe?: string;
      arquivo_boletim?: string;
      confirmado_por?: string;
    },
    conn?: PoolConnection,
  ): Promise<BoletimAbate> {
    const id = uuid();
    const sql = `
      INSERT INTO boletim_abate
        (id, lancamento_financeiro_id, frigorifico, data_abate, data_boletim,
         quantidade_animais, peso_vivo_total_arroba, peso_carcaca_total_arroba,
         rendimento_percent, valor_arroba, bonificacoes, descontos,
         numero_gta, numero_nfe, arquivo_boletim,
         confirmado_em, confirmado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `;
    const params = [
      id,
      dados.lancamento_financeiro_id,
      dados.frigorifico,
      dados.data_abate,
      dados.data_boletim,
      dados.quantidade_animais,
      dados.peso_vivo_total_arroba ?? null,
      dados.peso_carcaca_total_arroba,
      dados.rendimento_percent,
      dados.valor_arroba,
      dados.bonificacoes ?? 0,
      dados.descontos ?? 0,
      dados.numero_gta ?? null,
      dados.numero_nfe ?? null,
      dados.arquivo_boletim ?? null,
      dados.confirmado_por ?? null,
    ];
    if (conn) {
      await conn.execute(sql, params);
      const [[row]] = await conn.query<any[]>(
        "SELECT * FROM boletim_abate WHERE id = ? LIMIT 1",
        [id],
      );
      return row;
    } else {
      await execute(sql, params);
      return (await this.findById(id))!;
    }
  }
}

export const boletimAbateRepository = new BoletimAbateRepository();
