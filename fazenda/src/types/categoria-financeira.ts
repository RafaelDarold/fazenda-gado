import type { UUID, DateTimeString } from './common.js'

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type TipoLancamento = 'receita' | 'despesa'

// ─────────────────────────────────────────────────────────────────────────────
// Entidade
// ─────────────────────────────────────────────────────────────────────────────

export interface CategoriaFinanceira {
  id: UUID
  nome: string
  tipo: TipoLancamento
  descricao: string | null
  is_sistema: boolean       // true = não pode ser excluída
  ativo: boolean
  created_at: DateTimeString
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs (Data Transfer Objects) — usados nos formulários e na API
// ─────────────────────────────────────────────────────────────────────────────

/** Criação de uma nova categoria (usuário não pode setar is_sistema) */
export interface CreateCategoriaFinanceiraDTO {
  nome: string
  tipo: TipoLancamento
  descricao?: string
}

/** Atualização parcial */
export interface UpdateCategoriaFinanceiraDTO {
  nome?: string
  descricao?: string
  ativo?: boolean
}
