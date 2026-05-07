import { transaction } from '../db/index.js'
import { saudeEventoRepository }          from '../repositories/saude.repository.js'
import { lancamentoFinanceiroRepository } from '../repositories/lancamento-financeiro.repository.js'
import { categoriaFinanceiraRepository }  from '../repositories/categoria-financeira.repository.js'
import type {
  SaudeEvento,
  SaudeEventoDetalhado,
  SaudeEventoAnimal,
  CreateSaudeEventoDTO,
  FiltroSaudeEvento,
  UUID,
} from '../types/index.js'

export class SaudeService {

  // ── Consultas ───────────────────────────────────────────────────────────────

  async listar(filtro: FiltroSaudeEvento = {}): Promise<SaudeEventoDetalhado[]> {
    return saudeEventoRepository.findAll(filtro)
  }

  async proximosReforcos(dias = 30): Promise<SaudeEventoDetalhado[]> {
    return saudeEventoRepository.findProximosReforcos(dias)
  }

  async historicoPorAnimal(animalId: UUID): Promise<SaudeEventoDetalhado[]> {
    return saudeEventoRepository.findByAnimal(animalId)
  }

  async animaisDoEvento(eventoId: UUID): Promise<SaudeEventoAnimal[]> {
    return saudeEventoRepository.findAnimaisByEvento(eventoId)
  }

  // ── Registro ────────────────────────────────────────────────────────────────

  /**
   * Cria um evento de saúde em qualquer um dos três escopos.
   *
   * - individual: vincula os animais da lista
   * - lote:       vincula todos os animais do lote (se expandir_para_animais = true)
   * - todos:      vincula todo o rebanho ativo (se expandir_para_animais = true)
   *
   * Se houver custo, gera despesa em "Medicamentos e sanidade" automaticamente.
   */
  async registrar(dto: CreateSaudeEventoDTO): Promise<{
    evento: SaudeEvento
    animaisVinculados: number
  }> {
    // Busca categoria de saúde
    const categoria = await categoriaFinanceiraRepository.findByNomeETipo(
      'Medicamentos e sanidade', 'despesa',
    )

    return transaction(async (conn) => {
      let lancamentoId: UUID | undefined

      // Gera despesa se houver custo informado
      const custo = 'custo_total' in dto ? dto.custo_total : undefined
      if (custo && custo > 0 && categoria) {
        const lanc = await lancamentoFinanceiroRepository.create(
          {
            data:         dto.data_aplicacao,
            tipo:         'despesa',
            categoria_id: categoria.id,
            valor_final:  custo,
            descricao:    `${dto.tipo} — ${dto.produto}`,
            pago:         false,
          },
          conn,
        )
        lancamentoId = lanc.id
      }

      // Conta animais para quantidade_animais
      const qtdAnimais =
        dto.escopo === 'individual'
          ? dto.animais.length
          : dto.escopo === 'lote'
          ? 0  // será contado após vincular
          : 0  // idem

      // Cria o evento principal
      const loteId = 'lote_id' in dto ? dto.lote_id : undefined
      const evento = await saudeEventoRepository.createEvento(
        {
          escopo:                    dto.escopo,
          lote_id:                   loteId ?? null,
          tipo:                      dto.tipo,
          produto:                   dto.produto,
          fabricante:                dto.fabricante ?? null,
          lote_produto:              dto.lote_produto ?? null,
          data_aplicacao:            dto.data_aplicacao,
          data_proxima:              dto.data_proxima ?? null,
          dose_ml_por_animal:        dto.dose_ml_por_animal?.toString() ?? null,
          quantidade_animais:        qtdAnimais,
          custo_total:               custo?.toString() ?? null,
          lancamento_financeiro_id:  lancamentoId ?? null,
          responsavel:               dto.responsavel ?? null,
          observacao:                dto.observacao ?? null,
        },
        conn,
      )

      // Vincula animais conforme escopo
      let animaisVinculados = 0

      if (dto.escopo === 'individual') {
        for (const item of dto.animais) {
          await saudeEventoRepository.vincularAnimal(
            evento.id,
            item.animal_id,
            item.dose_aplicada_ml,
            item.observacao_individual,
            conn,
          )
        }
        animaisVinculados = dto.animais.length

      } else if (dto.escopo === 'lote' && dto.lote_id) {
        const expandir = 'expandir_para_animais' in dto ? dto.expandir_para_animais : false
        if (expandir) {
          animaisVinculados = await saudeEventoRepository.vincularLote(evento.id, dto.lote_id, conn)
        }

      } else if (dto.escopo === 'todos') {
        const expandir = 'expandir_para_animais' in dto ? dto.expandir_para_animais : false
        if (expandir) {
          animaisVinculados = await saudeEventoRepository.vincularTodos(evento.id, conn)
        }
      }

      // Atualiza quantidade real de animais no evento
      if (animaisVinculados > 0 && animaisVinculados !== qtdAnimais) {
        await conn.execute(
          'UPDATE saude_evento SET quantidade_animais = ? WHERE id = ?',
          [animaisVinculados, evento.id],
        )
      }

      return { evento, animaisVinculados }
    })
  }
}

export const saudeService = new SaudeService()
