import { BaseRepository } from './base.repository.js'
import { query, execute } from '../db/index.js'
import { uuid } from '../utils/index.js'
import type {
  OcupacaoPasto,
  OcupacaoPastoDetalhada,
  CreateOcupacaoPastoDTO,
  EncerrarOcupacaoDTO,
  UUID,
} from '../types/index.js'
import type { PoolConnection } from 'mysql2/promise'

export class OcupacaoPastoRepository extends BaseRepository<OcupacaoPasto> {
  constructor() {
    super('ocupacao_pasto')
  }

  /** Ocupação atual (data_saida IS NULL) de um pasto */
  async findAtualByPasto(pastoId: UUID): Promise<OcupacaoPastoDetalhada | null> {
    const rows = await query<OcupacaoPastoDetalhada>(`
      SELECT op.*, p.nome AS pasto_nome, l.nome AS lote_nome, NULL AS dias_ocupacao
      FROM ocupacao_pasto op
      JOIN pasto p ON p.id = op.pasto_id
      JOIN lote  l ON l.id = op.lote_id
      WHERE op.pasto_id = ? AND op.data_saida IS NULL
      LIMIT 1
    `, [pastoId])
    return rows[0] ?? null
  }

  /** Histórico completo de um pasto */
  async findHistoricoByPasto(pastoId: UUID): Promise<OcupacaoPastoDetalhada[]> {
    return query<OcupacaoPastoDetalhada>(`
      SELECT
        op.*,
        p.nome AS pasto_nome,
        l.nome AS lote_nome,
        DATEDIFF(COALESCE(op.data_saida, CURDATE()), op.data_entrada) AS dias_ocupacao
      FROM ocupacao_pasto op
      JOIN pasto p ON p.id = op.pasto_id
      JOIN lote  l ON l.id = op.lote_id
      WHERE op.pasto_id = ?
      ORDER BY op.data_entrada DESC
    `, [pastoId])
  }

  /** Histórico de um lote — em quais pastos esteve */
  async findByLote(loteId: UUID): Promise<OcupacaoPastoDetalhada[]> {
    return query<OcupacaoPastoDetalhada>(`
      SELECT
        op.*,
        p.nome AS pasto_nome,
        l.nome AS lote_nome,
        DATEDIFF(COALESCE(op.data_saida, CURDATE()), op.data_entrada) AS dias_ocupacao
      FROM ocupacao_pasto op
      JOIN pasto p ON p.id = op.pasto_id
      JOIN lote  l ON l.id = op.lote_id
      WHERE op.lote_id = ?
      ORDER BY op.data_entrada DESC
    `, [loteId])
  }

  async create(dto: CreateOcupacaoPastoDTO, conn?: PoolConnection): Promise<OcupacaoPasto> {
    const id = uuid()
    const sql = `
      INSERT INTO ocupacao_pasto
        (id, fazenda_id, pasto_id, lote_id, data_entrada, quantidade_animais, lotacao_ua, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    const params = [
      id, dto.pasto_id, dto.lote_id, dto.data_entrada,
      dto.quantidade_animais, dto.lotacao_ua ?? null, dto.observacao ?? null,
    ]
    if (conn) {
      await conn.execute(sql, params)
      const [[row]] = await conn.query<any[]>("SELECT * FROM ocupacao_pasto WHERE id = ? LIMIT 1", [id])
      return row
    } else {
      await execute(sql, params)
      return (await this.findById(id))!
    }
  }

  /** Encerra a ocupação atual de um lote em um pasto */
  async encerrar(id: UUID, dto: EncerrarOcupacaoDTO, conn?: PoolConnection): Promise<void> {
    const sql = `
      UPDATE ocupacao_pasto
      SET data_saida = ?, observacao = COALESCE(?, observacao)
      WHERE id = ?
    `
    const params = [dto.data_saida, dto.observacao ?? null, id]
    if (conn) { await conn.execute(sql, params) } else { await execute(sql, params) }
  }
}

export const ocupacaoPastoRepository = new OcupacaoPastoRepository()
