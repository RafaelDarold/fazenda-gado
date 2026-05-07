import { transaction } from '../db/index.js'
import { animalRepository }   from '../repositories/animal.repository.js'
import { loteRepository }     from '../repositories/lote.repository.js'
import { pesagemRepository }  from '../repositories/pesagem.repository.js'
import type {
  Animal,
  AnimalDetalhado,
  CreateAnimalDTO,
  UpdateAnimalDTO,
  FiltroAnimal,
  Paginated,
  PaginationParams,
  UUID,
} from '../types/index.js'

export class AnimalService {

  // ── Consultas ───────────────────────────────────────────────────────────────

  async buscarPorId(id: UUID): Promise<AnimalDetalhado> {
    const animal = await animalRepository.findDetalhadoById(id)
    if (!animal) throw new Error(`Animal não encontrado: ${id}`)
    return animal
  }

  async buscarPorBrinco(brinco: string): Promise<Animal> {
    const animal = await animalRepository.findByBrinco(brinco)
    if (!animal) throw new Error(`Animal não encontrado com brinco: ${brinco}`)
    return animal
  }

  async listar(
    filtro: FiltroAnimal = {},
    pagination?: PaginationParams,
  ): Promise<Paginated<AnimalDetalhado>> {
    return animalRepository.findAll(filtro, pagination)
  }

  async listarPorLote(loteId: UUID): Promise<Animal[]> {
    return animalRepository.findByLote(loteId)
  }

  async contarPorCategoria() {
    return animalRepository.contarPorCategoria()
  }

  async totalAtivo(): Promise<number> {
    return animalRepository.totalAtivo()
  }

  // ── Cadastro ────────────────────────────────────────────────────────────────

  async cadastrar(dto: CreateAnimalDTO): Promise<Animal> {
    // Valida brinco único
    const existente = await animalRepository.findByBrinco(dto.brinco)
    if (existente) throw new Error(`Já existe um animal com o brinco: ${dto.brinco}`)

    // Valida lote se informado
    if (dto.lote_id) {
      const lote = await loteRepository.findById(dto.lote_id)
      if (!lote) throw new Error(`Lote não encontrado: ${dto.lote_id}`)
    }

    return transaction(async (conn) => {
      const animal = await animalRepository.create(dto, conn)

      // Ajusta contador do lote
      if (dto.lote_id) {
        await loteRepository.ajustarQuantidade(dto.lote_id, +1, conn)
      }

      return animal
    })
  }

  // ── Edição ──────────────────────────────────────────────────────────────────

  async atualizar(id: UUID, dto: UpdateAnimalDTO): Promise<Animal> {
    const animal = await animalRepository.findById(id)
    if (!animal) throw new Error(`Animal não encontrado: ${id}`)

    // Se está mudando de lote, ajusta contadores dos dois lotes
    if (dto.lote_id !== undefined && dto.lote_id !== animal.lote_id) {
      await transaction(async (conn) => {
        // Sai do lote atual
        if (animal.lote_id) {
          await loteRepository.ajustarQuantidade(animal.lote_id, -1, conn)
        }
        // Entra no novo lote
        if (dto.lote_id) {
          await loteRepository.ajustarQuantidade(dto.lote_id, +1, conn)
        }
        await animalRepository.update(id, dto)
      })
    } else {
      await animalRepository.update(id, dto)
    }

    return (await animalRepository.findById(id))!
  }

  // ── Inativação ──────────────────────────────────────────────────────────────

  /**
   * Inativa o animal e ajusta o contador do lote.
   * Usado internamente pelo MovimentacaoService nas saídas.
   */
  async inativar(id: UUID): Promise<void> {
    const animal = await animalRepository.findById(id)
    if (!animal) throw new Error(`Animal não encontrado: ${id}`)

    await transaction(async (conn) => {
      await animalRepository.update(id, { ativo: false })
      if (animal.lote_id) {
        await loteRepository.ajustarQuantidade(animal.lote_id, -1, conn)
      }
    })
  }

  // ── Histórico de pesagem ────────────────────────────────────────────────────

  async historicoPesagem(animalId: UUID, limite = 20) {
    const animal = await animalRepository.findById(animalId)
    if (!animal) throw new Error(`Animal não encontrado: ${animalId}`)
    return pesagemRepository.findByAnimal(animalId, limite)
  }
}

export const animalService = new AnimalService()
