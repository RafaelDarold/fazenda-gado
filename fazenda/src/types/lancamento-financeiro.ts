import type { UUID, DateString, DateTimeString } from './common.js'
import type { TipoLancamento } from './categoria-financeira.js'

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type StatusLancamento = 'pendente' | 'confirmado' | 'cancelado'

export type FormaPagamento =
  | 'avista'
  | 'prazo'
  | 'parcelas'
  | 'boleto'
  | 'pix'
  | 'transferencia'
  | 'outro'

// ─────────────────────────────────────────────────────────────────────────────
// Entidade
// ─────────────────────────────────────────────────────────────────────────────

export interface LancamentoFinanceiro {
  id: UUID
  data: DateString
  tipo: TipoLancamento
  categoria_id: UUID
  status: StatusLancamento

  // Venda ao frigorífico: valor_estimado preenchido na etapa 1,
  // valor_final preenchido na etapa 2 (boletim de abate)
  valor_estimado: string | null   // DECIMAL como string
  valor_final: string | null      // DECIMAL como string

  descricao: string
  forma_pagamento: FormaPagamento | null
  pago: boolean
  data_vencimento: DateString | null
  data_pagamento: DateString | null
  pasto_id: UUID | null
  observacao: string | null
  created_at: DateTimeString
  updated_at: DateTimeString
}

/**
 * Lançamento com dados de relacionamentos resolvidos.
 */
export interface LancamentoDetalhado extends LancamentoFinanceiro {
  categoria_nome: string
  pasto_nome: string | null
  // Valor efetivo para cálculos: valor_final ?? valor_estimado
  valor_efetivo: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

/** Lançamento avulso — criado diretamente pelo usuário */
export interface CreateLancamentoDTO {
  data: DateString
  tipo: TipoLancamento
  categoria_id: UUID
  valor_final: number
  descricao: string
  forma_pagamento?: FormaPagamento
  pago?: boolean
  data_vencimento?: DateString
  data_pagamento?: DateString
  pasto_id?: UUID
  observacao?: string
}

/**
 * Lançamento gerado automaticamente na compra de animais.
 * Status inicia como 'confirmado' após confirmação do usuário.
 */
export interface CreateLancamentoCompraDTO {
  data: DateString
  categoria_id: UUID          // 'Compra de animais'
  valor_final: number
  descricao: string           // Ex: "Compra 15 bois — Fazenda Silva"
  forma_pagamento: FormaPagamento
  data_vencimento?: DateString
  observacao?: string
}

/**
 * Lançamento gerado na etapa 1 da venda ao frigorífico.
 * Status inicia como 'pendente' — aguarda boletim de abate.
 */
export interface CreateLancamentoVendaFrigorificoDTO {
  data: DateString
  categoria_id: UUID          // 'Venda de boi gordo'
  valor_estimado?: number     // Estimativa opcional na etapa 1
  descricao: string           // Ex: "Venda 20 bois — Frigorífico X"
  forma_pagamento?: FormaPagamento
  observacao?: string
}

/**
 * Confirmação do lançamento na etapa 2 — após receber o boletim.
 * Atualiza status para 'confirmado' e define valor_final.
 */
export interface ConfirmarLancamentoVendaDTO {
  valor_final: number
  forma_pagamento?: FormaPagamento
  data_vencimento?: DateString
  observacao?: string
}

/** Filtros para listagem de lançamentos */
export interface FiltroLancamento {
  tipo?: TipoLancamento
  status?: StatusLancamento
  categoria_id?: UUID
  pago?: boolean
  data_inicio?: DateString
  data_fim?: DateString
  pasto_id?: UUID
}
