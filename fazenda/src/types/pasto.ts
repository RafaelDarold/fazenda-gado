import type { UUID, DateTimeString } from './common.js'

// ─────────────────────────────────────────────────────────────────────────────
// Entidade
// ─────────────────────────────────────────────────────────────────────────────

export interface Pasto {
  id: UUID
  nome: string
  area_hectares: string        // DECIMAL retorna como string no mysql2
  tipo_capim: string | null
  capacidade_ua: string | null // Unidades Animal suportadas
  ativo: boolean
  observacao: string | null
  created_at: DateTimeString
  updated_at: DateTimeString
}

/** Pasto com informações de ocupação atual — usado no dashboard */
export interface PastoComOcupacao extends Pasto {
  lote_atual_nome: string | null
  quantidade_animais_atual: number | null
  lotacao_atual_ua: string | null
  percentual_lotacao: number | null  // lotacao_atual / capacidade_ua * 100
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatePastoDTO {
  nome: string
  area_hectares: number
  tipo_capim?: string
  capacidade_ua?: number
  observacao?: string
}

export interface UpdatePastoDTO {
  nome?: string
  area_hectares?: number
  tipo_capim?: string
  capacidade_ua?: number
  ativo?: boolean
  observacao?: string
}
