import type { UUID, DateString, DateTimeString } from './common.js'

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type CategoriaLote =
  | 'bezerros'
  | 'bezerra'
  | 'novilhas'
  | 'vacas'
  | 'bois'
  | 'touros'
  | 'misto'

// ─────────────────────────────────────────────────────────────────────────────
// Entidade
// ─────────────────────────────────────────────────────────────────────────────

export interface Lote {
  id: UUID
  nome: string
  categoria_principal: CategoriaLote
  pasto_atual_id: UUID | null

  quantidade_atual: number

  // Peso médio — informado após pesagem do lote
  peso_medio_arroba: string | null   // DECIMAL como string
  data_ultima_pesagem: DateString | null

  // Colunas GENERATED — calculadas pelo banco, somente leitura
  peso_medio_kg: string | null       // peso_medio_arroba * 15
  peso_total_arroba: string | null   // peso_medio_arroba * quantidade_atual

  ativo: boolean
  observacao: string | null
  created_at: DateTimeString
  updated_at: DateTimeString
}

/** Lote com o nome do pasto atual — para exibição em tabelas */
export interface LoteComPasto extends Lote {
  pasto_nome: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateLoteDTO {
  nome: string
  categoria_principal: CategoriaLote
  pasto_atual_id?: UUID
  observacao?: string
}

export interface UpdateLoteDTO {
  nome?: string
  categoria_principal?: CategoriaLote
  pasto_atual_id?: UUID | null
  ativo?: boolean
  observacao?: string
}

/**
 * DTO para atualizar o peso médio do lote após uma rodada de pesagem.
 * Chamado pelo serviço de pesagem automaticamente.
 */
export interface AtualizarPesoLoteDTO {
  peso_medio_arroba: number
  data_ultima_pesagem: DateString
}
