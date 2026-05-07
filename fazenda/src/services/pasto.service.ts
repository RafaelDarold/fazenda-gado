import { transaction } from '../db/index.js'
import { pastoRepository }             from '../repositories/pasto.repository.js'
import { loteRepository }              from '../repositories/lote.repository.js'
import { ocupacaoPastoRepository }     from '../repositories/ocupacao-pasto.repository.js'
import { abastecimentoCochoRepository } from '../repositories/abastecimento-cocho.repository.js'
import { lancamentoFinanceiroRepository } from '../repositories/lancamento-financeiro.repository.js'
import { categoriaFinanceiraRepository }  from '../repositories/categoria-financeira.repository.js'

import type {
  Pasto,
  PastoComOcupacao,
  CreatePastoDTO,
  UpdatePastoDTO,
  OcupacaoPastoDetalhada,
  CreateOcupacaoPastoDTO,
  AbastecimentoCocho,
  CreateAbastecimentoCochoDTO,
  UUID,
  DateString,
} from '../types/index.js'

export class PastoService {

  // ── Pastos ──────────────────────────────────────────────────────────────────

  async listar(): Promise<PastoComOcupacao[]> {
    return pastoRepository.findComOcupacao()
  }

  async buscarPorId(id: UUID): Promise<Pasto> {
    const pasto = await pastoRepository.findById(id)
    if (!pasto) throw new Error(`Pasto não encontrado: ${id}`)
    return pasto
  }

  async cadastrar(dto: CreatePastoDTO): Promise<Pasto> {
    return pastoRepository.create(dto)
  }

  async atualizar(id: UUID, dto: UpdatePastoDTO): Promise<Pasto> {
    const pasto = await pastoRepository.update(id, dto)
    if (!pasto) throw new Error(`Pasto não encontrado: ${id}`)
    return pasto
  }

  // ── Ocupação / Rotação ──────────────────────────────────────────────────────

  async historicoOcupacao(pastoId: UUID): Promise<OcupacaoPastoDetalhada[]> {
    return ocupacaoPastoRepository.findHistoricoByPasto(pastoId)
  }

  /**
   * Move um lote de um pasto para outro.
   * Encerra a ocupação atual e abre uma nova.
   */
  async moverLote(
    loteId: UUID,
    novoPastoId: UUID,
    data: DateString,
    observacao?: string,
  ): Promise<void> {
    const lote = await loteRepository.findById(loteId)
    if (!lote) throw new Error(`Lote não encontrado: ${loteId}`)

    const novoPasto = await pastoRepository.findById(novoPastoId)
    if (!novoPasto) throw new Error(`Pasto destino não encontrado: ${novoPastoId}`)

    await transaction(async (conn) => {
      // Encerra ocupação atual se existir
      if (lote.pasto_atual_id) {
        const ocAtual = await ocupacaoPastoRepository.findAtualByPasto(lote.pasto_atual_id)
        if (ocAtual) {
          await ocupacaoPastoRepository.encerrar(ocAtual.id, { data_saida: data, observacao }, conn)
        }
      }

      // Abre nova ocupação
      await ocupacaoPastoRepository.create(
        {
          pasto_id:           novoPastoId,
          lote_id:            loteId,
          data_entrada:       data,
          quantidade_animais: lote.quantidade_atual,
          observacao,
        },
        conn,
      )

      // Atualiza pasto atual do lote
      await loteRepository.update(loteId, { pasto_atual_id: novoPastoId })
    })
  }

  async abrirOcupacao(dto: CreateOcupacaoPastoDTO): Promise<OcupacaoPastoDetalhada> {
    await ocupacaoPastoRepository.create(dto)
    const ocAtual = await ocupacaoPastoRepository.findAtualByPasto(dto.pasto_id)
    if (!ocAtual) throw new Error('Erro ao criar ocupação')
    return ocAtual
  }

  // ── Cocho / Suplementação ───────────────────────────────────────────────────

  async registrarAbastecimento(dto: CreateAbastecimentoCochoDTO): Promise<AbastecimentoCocho> {
    const pasto = await pastoRepository.findById(dto.pasto_id)
    if (!pasto) throw new Error(`Pasto não encontrado: ${dto.pasto_id}`)

    return transaction(async (conn) => {
      let lancamentoId: UUID | undefined

      // Se tem custo, gera despesa automaticamente
      if (dto.custo_total && dto.custo_total > 0) {
        const categoria = await categoriaFinanceiraRepository.findByNomeETipo(
          'Racao e suplemento', 'despesa',
        )
        if (categoria) {
          const lanc = await lancamentoFinanceiroRepository.create(
            {
              data:        dto.data,
              tipo:        'despesa',
              categoria_id: categoria.id,
              valor_final: dto.custo_total,
              descricao:   `${dto.tipo.replace('_', ' ')} — ${pasto.nome}`,
              pago:        false,
              pasto_id:    dto.pasto_id,
              observacao:  dto.observacao,
            },
            conn,
          )
          lancamentoId = lanc.id
        }
      }

      return abastecimentoCochoRepository.create(dto, lancamentoId, conn)
    })
  }

  async historicoCocho(
    pastoId: UUID,
    dataInicio?: DateString,
    dataFim?: DateString,
  ) {
    return abastecimentoCochoRepository.findByPasto(pastoId, dataInicio, dataFim)
  }
}

export const pastoService = new PastoService()
