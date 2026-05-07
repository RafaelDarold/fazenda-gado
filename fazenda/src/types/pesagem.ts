import type { UUID, DateString, DateTimeString } from './common.js'

// ─────────────────────────────────────────────────────────────────────────────
// Entidade
// ─────────────────────────────────────────────────────────────────────────────

export interface Pesagem {
  id: UUID
  animal_id: UUID
  data: DateString

  // Peso informado em arrobas
  peso_arroba: string         // DECIMAL como string

  // Coluna GENERATED — somente leitura
  peso_kg: string             // peso_arroba * 15

  // GMD calculado pela camada de serviço e persistido
  gmd_arroba: string | null   // ganho médio diário em @/dia

  responsavel: string | null
  observacao: string | null
  created_at: DateTimeString
}

/**
 * Pesagem com dados do animal — para exibição em histórico.
 */
export interface PesagemDetalhada extends Pesagem {
  animal_brinco: string
  animal_nome: string | null
  animal_categoria: string
  // Pesagem anterior para cálculo de evolução
  peso_anterior_arroba: string | null
  dias_desde_ultima_pesagem: number | null
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatePesagemDTO {
  animal_id: UUID
  data: DateString
  peso_arroba: number
  responsavel?: string
  observacao?: string
}

/**
 * Para pesagem em lote — registra a mesma data e responsável
 * para vários animais de uma vez, com pesos individuais.
 */
export interface CreatePesagemLoteDTO {
  lote_id: UUID
  data: DateString
  responsavel?: string
  // Mapa brinco → peso em arroba
  pesagens: Array<{
    animal_id: UUID
    peso_arroba: number
    observacao?: string
  }>
}
