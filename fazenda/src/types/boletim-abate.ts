import type { UUID, DateString, DateTimeString } from './common.js'

// ─────────────────────────────────────────────────────────────────────────────
// Entidade
// ─────────────────────────────────────────────────────────────────────────────

export interface BoletimAbate {
  id: UUID
  lancamento_financeiro_id: UUID
  frigorifico: string
  data_abate: DateString
  data_boletim: DateString
  quantidade_animais: number

  // Pesos informados em arroba — padrão do frigorífico
  peso_vivo_total_arroba: string | null    // DECIMAL como string, opcional
  peso_carcaca_total_arroba: string        // DECIMAL como string, obrigatório

  rendimento_percent: string              // Ex: "54.30"
  valor_arroba: string                    // R$ por @
  bonificacoes: string                    // Default "0.00"
  descontos: string                       // Default "0.00"

  // Colunas GENERATED — somente leitura, calculadas pelo banco
  peso_vivo_total_kg: string | null       // peso_vivo_total_arroba * 15
  peso_carcaca_total_kg: string           // peso_carcaca_total_arroba * 15
  valor_calculado: string                 // peso_carcaca_arroba * R$/@ + bonif - desc

  numero_gta: string | null
  numero_nfe: string | null
  arquivo_boletim: string | null          // Path ou URL do PDF

  confirmado_em: DateTimeString | null
  confirmado_por: string | null
  created_at: DateTimeString
}

/**
 * Boletim com dados do lançamento — para exibição no detalhe da venda.
 */
export interface BoletimAbateDetalhado extends BoletimAbate {
  // Dados calculados para exibição
  peso_medio_carcaca_arroba: string       // peso_carcaca_total / quantidade
  valor_por_animal: string               // valor_calculado / quantidade
}
