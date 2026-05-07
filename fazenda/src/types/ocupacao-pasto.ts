import type { UUID, DateString, DateTimeString } from './common.js'

// ─────────────────────────────────────────────────────────────────────────────
// Entidade
// ─────────────────────────────────────────────────────────────────────────────

export interface OcupacaoPasto {
  id: UUID
  pasto_id: UUID
  lote_id: UUID
  data_entrada: DateString
  data_saida: DateString | null   // NULL = ocupação atual ainda ativa
  quantidade_animais: number
  lotacao_ua: string | null       // Unidades Animal
  observacao: string | null
  created_at: DateTimeString
}

/** Ocupação com nomes resolvidos — para exibição em relatórios */
export interface OcupacaoPastoDetalhada extends OcupacaoPasto {
  pasto_nome: string
  lote_nome: string
  dias_ocupacao: number | null    // null se ainda ativa
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateOcupacaoPastoDTO {
  pasto_id: UUID
  lote_id: UUID
  data_entrada: DateString
  quantidade_animais: number
  lotacao_ua?: number
  observacao?: string
}

/** Encerra a ocupação atual de um lote em um pasto */
export interface EncerrarOcupacaoDTO {
  data_saida: DateString
  observacao?: string
}
