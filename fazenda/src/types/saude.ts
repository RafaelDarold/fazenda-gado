import type { UUID, DateString, DateTimeString } from './common.js'

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type EscopoSaudeEvento = 'individual' | 'lote' | 'todos'

export type TipoSaudeEvento =
  | 'vacina'
  | 'vermifugo'
  | 'medicamento'
  | 'exame'
  | 'cirurgia'
  | 'outro'

// ─────────────────────────────────────────────────────────────────────────────
// Entidades
// ─────────────────────────────────────────────────────────────────────────────

export interface SaudeEvento {
  id: UUID
  escopo: EscopoSaudeEvento
  lote_id: UUID | null              // Preenchido quando escopo = 'lote'
  tipo: TipoSaudeEvento
  produto: string
  fabricante: string | null
  lote_produto: string | null       // Número do lote do produto veterinário
  data_aplicacao: DateString
  data_proxima: DateString | null   // Próximo reforço
  dose_ml_por_animal: string | null
  quantidade_animais: number
  custo_total: string | null
  lancamento_financeiro_id: UUID | null
  responsavel: string | null
  observacao: string | null
  created_at: DateTimeString
}

/** Evento com nome do lote resolvido */
export interface SaudeEventoDetalhado extends SaudeEvento {
  lote_nome: string | null
  animais?: SaudeEventoAnimal[]     // Populado quando escopo = 'individual'
}

/** Vínculo individual entre evento e animal */
export interface SaudeEventoAnimal {
  id: UUID
  saude_evento_id: UUID
  animal_id: UUID
  dose_aplicada_ml: string | null
  observacao_individual: string | null
  created_at: DateTimeString
  // Dados do animal resolvidos via JOIN
  animal_brinco?: string
  animal_nome?: string | null
  animal_categoria?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

/** Registro de evento para um ou mais animais individuais */
export interface CreateSaudeEventoIndividualDTO {
  escopo: 'individual'
  tipo: TipoSaudeEvento
  produto: string
  fabricante?: string
  lote_produto?: string
  data_aplicacao: DateString
  data_proxima?: DateString
  dose_ml_por_animal?: number
  custo_total?: number
  responsavel?: string
  observacao?: string
  // Lista de animais com doses individuais opcionais
  animais: Array<{
    animal_id: UUID
    dose_aplicada_ml?: number
    observacao_individual?: string
  }>
}

/** Registro de evento para um lote inteiro */
export interface CreateSaudeEventoLoteDTO {
  escopo: 'lote'
  lote_id: UUID
  tipo: TipoSaudeEvento
  produto: string
  fabricante?: string
  lote_produto?: string
  data_aplicacao: DateString
  data_proxima?: DateString
  dose_ml_por_animal?: number
  custo_total?: number
  responsavel?: string
  observacao?: string
  /**
   * Se true, o serviço expande automaticamente o evento para
   * todos os animais do lote em saude_evento_animal.
   */
  expandir_para_animais?: boolean
}

/** Registro de evento para todo o rebanho ativo */
export interface CreateSaudeEventoTodosDTO {
  escopo: 'todos'
  tipo: TipoSaudeEvento
  produto: string
  fabricante?: string
  lote_produto?: string
  data_aplicacao: DateString
  data_proxima?: DateString
  dose_ml_por_animal?: number
  custo_total?: number
  responsavel?: string
  observacao?: string
  expandir_para_animais?: boolean
}

export type CreateSaudeEventoDTO =
  | CreateSaudeEventoIndividualDTO
  | CreateSaudeEventoLoteDTO
  | CreateSaudeEventoTodosDTO

/** Filtros para listagem de eventos de saúde */
export interface FiltroSaudeEvento {
  tipo?: TipoSaudeEvento
  escopo?: EscopoSaudeEvento
  lote_id?: UUID
  data_inicio?: DateString
  data_fim?: DateString
  /** Busca eventos com data_proxima nos próximos N dias */
  proximos_dias?: number
}
