import { transaction } from '../db/index.js'
import { pesagemRepository } from '../repositories/pesagem.repository.js'
import { animalRepository }  from '../repositories/animal.repository.js'
import { loteRepository }    from '../repositories/lote.repository.js'
import { calcGmd }           from '../utils/index.js'
import { diffDias, hoje }    from '../utils/index.js'
import type {
  Pesagem,
  PesagemDetalhada,
  CreatePesagemDTO,
  CreatePesagemLoteDTO,
  UUID,
} from '../types/index.js'

export class PesagemService {

  // ── Pesagem individual ──────────────────────────────────────────────────────

  async registrar(dto: CreatePesagemDTO): Promise<Pesagem> {
    const animal = await animalRepository.findById(dto.animal_id)
    if (!animal) throw new Error(`Animal não encontrado: ${dto.animal_id}`)
    if (!animal.ativo) throw new Error(`Animal inativo não pode ser pesado`)

    return transaction(async (conn) => {
      // Busca pesagem anterior para calcular GMD
      const anterior = await pesagemRepository.findUltima(dto.animal_id)
      let gmd: number | null = null

      if (anterior) {
        const dias = diffDias(anterior.data, dto.data)
        gmd = calcGmd(
          dto.peso_arroba,
          parseFloat(anterior.peso_arroba),
          dias,
        )
      }

      const pesagem = await pesagemRepository.create(dto, gmd ?? undefined, conn)

      // Atualiza peso médio do lote se o animal pertence a um
      if (animal.lote_id) {
        await this._recalcularPesoMedioLote(animal.lote_id)
      }

      return pesagem
    })
  }

  // ── Pesagem em lote ─────────────────────────────────────────────────────────

  /**
   * Registra a pesagem de múltiplos animais de um lote de uma vez.
   * Calcula o GMD de cada animal individualmente e atualiza o
   * peso médio do lote ao final com a média das últimas pesagens.
   */
  async registrarEmLote(dto: CreatePesagemLoteDTO): Promise<{
    registradas: number
    ignoradas: number
    pesoMedioLote: number
  }> {
    const lote = await loteRepository.findById(dto.lote_id)
    if (!lote) throw new Error(`Lote não encontrado: ${dto.lote_id}`)

    let registradas = 0
    let ignoradas   = 0

    await transaction(async (conn) => {
      for (const item of dto.pesagens) {
        const animal = await animalRepository.findById(item.animal_id)
        if (!animal || !animal.ativo) { ignoradas++; continue }

        // GMD individual
        const anterior = await pesagemRepository.findUltima(item.animal_id)
        let gmd: number | null = null
        if (anterior) {
          const dias = diffDias(anterior.data, dto.data)
          gmd = calcGmd(item.peso_arroba, parseFloat(anterior.peso_arroba), dias)
        }

        await pesagemRepository.create(
          {
            animal_id:   item.animal_id,
            data:        dto.data,
            peso_arroba: item.peso_arroba,
            responsavel: dto.responsavel,
            observacao:  item.observacao,
          },
          gmd ?? undefined,
          conn,
        )
        registradas++
      }
    })

    // Recalcula e persiste peso médio do lote
    const pesoMedioLote = await this._recalcularPesoMedioLote(dto.lote_id, dto.data)

    return { registradas, ignoradas, pesoMedioLote }
  }

  // ── Histórico ───────────────────────────────────────────────────────────────

  async historicoPorAnimal(animalId: UUID, limite = 20): Promise<PesagemDetalhada[]> {
    return pesagemRepository.findByAnimal(animalId, limite)
  }

  async pesagensPorLote(loteId: UUID, data?: string): Promise<PesagemDetalhada[]> {
    return pesagemRepository.findByLote(loteId, data)
  }

  // ── Utilitário interno ──────────────────────────────────────────────────────

  /**
   * Recalcula o peso médio do lote com base nas últimas pesagens
   * de cada animal ativo e persiste em lote.peso_medio_arroba.
   * Retorna o novo peso médio.
   */
  private async _recalcularPesoMedioLote(loteId: UUID, data?: string): Promise<number> {
    const ultimas = await pesagemRepository.findUltimasPorLote(loteId)

    if (ultimas.length === 0) return 0

    const soma = ultimas.reduce((acc, p) => acc + parseFloat(p.peso_arroba), 0)
    const media = Math.round((soma / ultimas.length) * 1000) / 1000

    await loteRepository.atualizarPeso(loteId, {
      peso_medio_arroba:   media,
      data_ultima_pesagem: data ?? hoje(),
    })

    return media
  }
}

export const pesagemService = new PesagemService()
