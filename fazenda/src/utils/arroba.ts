/** 1 arroba brasileira = 15 kg (padrão bovino de corte) */
export const KG_POR_ARROBA = 15

/**
 * Converte quilogramas para arrobas.
 * Ex: kgParaArroba(450) → 30.000
 */
export function kgParaArroba(kg: number): number {
  return Math.round((kg / KG_POR_ARROBA) * 1000) / 1000
}

/**
 * Converte arrobas para quilogramas.
 * Ex: arrobaParaKg(18.5) → 277.50
 */
export function arrobaParaKg(arroba: number): number {
  return Math.round(arroba * KG_POR_ARROBA * 100) / 100
}

/**
 * Formata um valor em arrobas para exibição.
 * Ex: formatArroba(18.5) → "18,500 @"
 */
export function formatArroba(arroba: number | string | null | undefined): string {
  if (arroba === null || arroba === undefined) return '—'
  const n = typeof arroba === 'string' ? parseFloat(arroba) : arroba
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} @`
}

/**
 * Formata um valor em kg para exibição.
 * Ex: formatKg(277.5) → "277,50 kg"
 */
export function formatKg(kg: number | string | null | undefined): string {
  if (kg === null || kg === undefined) return '—'
  const n = typeof kg === 'string' ? parseFloat(kg) : kg
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
}

/**
 * Calcula o Ganho Médio Diário (GMD) em arrobas.
 * Ex: calcGmd(18.5, 15.0, 60) → 0.0583 @/dia
 */
export function calcGmd(
  pesoAtualArroba: number,
  pesoAnteriorArroba: number,
  dias: number,
): number | null {
  if (dias <= 0) return null
  return Math.round(((pesoAtualArroba - pesoAnteriorArroba) / dias) * 10000) / 10000
}

/**
 * Calcula o valor de venda baseado no boletim do frigorífico.
 * Fórmula: peso_carcaça_arroba × R$/@ + bonificações − descontos
 */
export function calcValorFrigorifico(params: {
  pesoCarcacaArroba: number
  valorArroba: number
  bonificacoes?: number
  descontos?: number
}): number {
  const { pesoCarcacaArroba, valorArroba, bonificacoes = 0, descontos = 0 } = params
  const bruto = pesoCarcacaArroba * valorArroba
  return Math.round((bruto + bonificacoes - descontos) * 100) / 100
}

/**
 * Calcula o rendimento de carcaça em percentual.
 * Ex: calcRendimento(270, 500) → 54.00 (%)
 */
export function calcRendimento(pesoCarcacaKg: number, pesoVivoKg: number): number {
  if (pesoVivoKg <= 0) return 0
  return Math.round((pesoCarcacaKg / pesoVivoKg) * 10000) / 100
}
