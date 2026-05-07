const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
})

/**
 * Formata um número como moeda brasileira.
 * Ex: formatBRL(1234.5) → "R$ 1.234,50"
 */
export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'string' ? parseFloat(value) : value
  return BRL.format(n)
}

/**
 * Analisa uma string de moeda brasileira e retorna o número.
 * Ex: parseBRL("R$ 1.234,50") → 1234.5
 */
export function parseBRL(value: string): number {
  return parseFloat(value.replace(/[R$\s.]/g, '').replace(',', '.'))
}
