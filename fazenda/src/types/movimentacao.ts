import type { UUID, DateString, DateTimeString } from './common.js'

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type TipoMovimentacao =
  | 'compra'
  | 'venda'
  | 'nascimento'
  | 'obito'
  | 'abate'
  | 'transferencia'
  | 'doacao'
  | 'outros'

export type DirecaoMovimentacao = 'entrada' | 'saida'

// Mapa de direção padrão por tipo — útil para validação no frontend
export const DIRECAO_POR_TIPO: Record<TipoMovimentacao, DirecaoMovimentacao> = {
  compra:        'entrada',
  nascimento:    'entrada',
  venda:         'saida',
  obito:         'saida',
  abate:         'saida',
  transferencia: 'entrada', // depende do contexto — ajustado na lógica
  doacao:        'entrada', // depende do contexto
  outros:        'entrada',
}

// ─────────────────────────────────────────────────────────────────────────────
// Entidade
// ─────────────────────────────────────────────────────────────────────────────

export interface Movimentacao {
  id: UUID
  animal_id: UUID
  tipo: TipoMovimentacao
  direcao: DirecaoMovimentacao
  data: DateString
  pasto_destino_id: UUID | null
  lote_destino_id: UUID | null
  origem_destino: string | null    // Nome do vendedor, comprador ou frigorífico
  causa_obito: string | null
  lancamento_financeiro_id: UUID | null
  numero_gta: string | null
  observacao: string | null
  created_at: DateTimeString
}

/**
 * Movimentação com dados de relacionamentos resolvidos.
 */
export interface MovimentacaoDetalhada extends Movimentacao {
  animal_brinco: string
  animal_nome: string | null
  animal_categoria: string
  lote_destino_nome: string | null
  pasto_destino_nome: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs — Compra
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dados do formulário de confirmação de compra.
 * Uma compra pode trazer múltiplos animais de uma vez.
 */
export interface ConfirmarCompraDTO {
  data: DateString
  origem: string                  // Nome do vendedor / fazenda de origem
  lote_destino_id: UUID
  pasto_destino_id?: UUID
  numero_gta?: string
  forma_pagamento: import('./lancamento-financeiro.js').FormaPagamento
  data_vencimento?: DateString
  observacao?: string
  // Cada animal da compra
  animais: Array<{
    brinco: string
    nome?: string
    raca: string
    sexo: import('./animal.js').SexoAnimal
    categoria: import('./animal.js').CategoriaAnimal
    data_nascimento?: DateString
    peso_entrada_arroba?: number
    valor_unitario: number        // Valor pago por este animal
  }>
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs — Venda ao frigorífico (2 etapas)
// ─────────────────────────────────────────────────────────────────────────────

/** Etapa 1: registra a saída dos animais */
export interface ConfirmarVendaFrigorificoEtapa1DTO {
  data: DateString
  frigorifico: string             // Nome do frigorífico
  numero_gta?: string
  lote_id: UUID                   // Lote de onde saem os animais
  animal_ids: UUID[]              // IDs dos animais que saíram
  valor_arroba_estimado?: number  // R$/@ estimado (opcional)
  observacao?: string
}

/** Etapa 2: recebe boletim e finaliza o lançamento financeiro */
export interface ConfirmarBoletimAbateDTO {
  movimentacao_ids: UUID[]        // IDs das movimentações da etapa 1
  lancamento_financeiro_id: UUID
  frigorifico: string
  data_abate: DateString
  data_boletim: DateString
  quantidade_animais: number
  peso_vivo_total_arroba?: number
  peso_carcaca_total_arroba: number
  rendimento_percent: number
  valor_arroba: number
  bonificacoes?: number
  descontos?: number
  numero_gta?: string
  numero_nfe?: string
  arquivo_boletim?: string        // Path ou URL do PDF
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs — Outras movimentações
// ─────────────────────────────────────────────────────────────────────────────

export interface RegistrarObitoDTO {
  animal_id: UUID
  data: DateString
  causa_obito: string
  observacao?: string
}

export interface RegistrarNascimentoDTO {
  data: DateString
  brinco: string
  sexo: import('./animal.js').SexoAnimal
  mae_id?: UUID
  pai_id?: UUID
  lote_destino_id: UUID
  peso_entrada_arroba?: number
  observacao?: string
}

/** Filtros para listagem de movimentações */
export interface FiltroMovimentacao {
  tipo?: TipoMovimentacao
  direcao?: DirecaoMovimentacao
  animal_id?: UUID
  lote_id?: UUID
  data_inicio?: DateString
  data_fim?: DateString
}
