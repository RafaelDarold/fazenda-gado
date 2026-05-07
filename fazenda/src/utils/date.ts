/**
 * Converte um Date ou string ISO para o formato MySQL DATE: 'YYYY-MM-DD'.
 */
export function toMysqlDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/**
 * Formata uma data para exibição no padrão brasileiro: 'DD/MM/AAAA'.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const str = typeof date === "string" ? date : date.toISOString();
  // Pega só YYYY-MM-DD e formata manualmente para evitar problema de timezone
  const parts = str.slice(0, 10).split("-");
  if (parts.length !== 3) return "—";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
/**
 * Calcula a diferença em dias entre duas datas (b - a).
 * Ex: diffDias('2024-01-01', '2024-03-01') → 60
 */
export function diffDias(
  dataInicio: string | Date,
  dataFim: string | Date,
): number {
  const a = typeof dataInicio === "string" ? new Date(dataInicio) : dataInicio;
  const b = typeof dataFim === "string" ? new Date(dataFim) : dataFim;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Retorna a data de hoje no formato MySQL: 'YYYY-MM-DD'.
 */
export function hoje(): string {
  return toMysqlDate(new Date());
}
