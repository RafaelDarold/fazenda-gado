import type { UUID, DateString, DateTimeString } from './common.js'

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type SexoAnimal = 'M' | 'F'

export type CategoriaAnimal =
  | 'bezerro'
  | 'bezerra'
  | 'novilha'
  | 'vaca'
  | 'boi'
  | 'touro'

// ─────────────────────────────────────────────────────────────────────────────
// Entidade
// ─────────────────────────────────────────────────────────────────────────────

export interface Animal {
  id: UUID
  brinco: string
  nome: string | null
  raca: string
  sexo: SexoAnimal
  categoria: CategoriaAnimal
  data_nascimento: DateString | null
  mae_id: UUID | null
  pai_id: UUID | null
  lote_id: UUID | null

  // Peso de entrada — informado em arrobas
  peso_entrada_arroba: string | null   // DECIMAL como string

  // Coluna GENERATED — somente leitura
  peso_entrada_kg: string | null       // peso_entrada_arroba * 15

  ativo: boolean
  observacao: string | null
  created_at: DateTimeString
  updated_at: DateTimeString
}

/**
 * Animal com dados de relacionamentos resolvidos —
 * retornado nas listagens com JOIN.
 */
export interface AnimalDetalhado extends Animal {
  lote_nome: string | null
  pasto_nome: string | null
  mae_brinco: string | null
  pai_brinco: string | null
  // Última pesagem registrada
  ultimo_peso_arroba: string | null
  ultima_pesagem_data: DateString | null
  // GMD desde a última pesagem
  gmd_arroba: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateAnimalDTO {
  brinco: string
  nome?: string
  raca: string
  sexo: SexoAnimal
  categoria: CategoriaAnimal
  data_nascimento?: DateString
  mae_id?: UUID
  pai_id?: UUID
  lote_id?: UUID
  peso_entrada_arroba?: number
  observacao?: string
}

export interface UpdateAnimalDTO {
  nome?: string
  raca?: string
  categoria?: CategoriaAnimal
  lote_id?: UUID | null
  data_nascimento?: DateString
  mae_id?: UUID | null
  pai_id?: UUID | null
  ativo?: boolean
  observacao?: string
}

/** Filtros para listagem de animais */
export interface FiltroAnimal {
  ativo?: boolean
  sexo?: SexoAnimal
  categoria?: CategoriaAnimal
  lote_id?: UUID
  raca?: string
  brinco?: string
}
