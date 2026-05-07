import type { UUID, DateString, DateTimeString } from './common.js'

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type TipoSuplemento =
  | 'sal_mineral'
  | 'racao'
  | 'proteinado'
  | 'volumoso'
  | 'outro'

// ─────────────────────────────────────────────────────────────────────────────
// Entidade
// ─────────────────────────────────────────────────────────────────────────────

export interface AbastecimentoCocho {
  id: UUID
  pasto_id: UUID
  data: DateString
  tipo: TipoSuplemento
  quantidade_kg: string           // DECIMAL como string
  custo_total: string | null
  fornecedor: string | null
  lancamento_financeiro_id: UUID | null
  observacao: string | null
  created_at: DateTimeString
}

/** Com nome do pasto — para listagens */
export interface AbastecimentoCochoDetalhado extends AbastecimentoCocho {
  pasto_nome: string
  custo_por_kg: string | null     // custo_total / quantidade_kg
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateAbastecimentoCochoDTO {
  pasto_id: UUID
  data: DateString
  tipo: TipoSuplemento
  quantidade_kg: number
  custo_total?: number
  fornecedor?: string
  observacao?: string
}
