// ─────────────────────────────────────────────────────────────────────────────
// Tipos base reutilizados em todas as entidades
// ─────────────────────────────────────────────────────────────────────────────

/** UUID v4 no formato CHAR(36) do banco */
export type UUID = string

/** Data no formato MySQL: 'YYYY-MM-DD' */
export type DateString = string

/** Datetime no formato MySQL: 'YYYY-MM-DD HH:MM:SS' */
export type DateTimeString = string

/**
 * Campos de auditoria presentes em todas as tabelas.
 * Gerados automaticamente pelo banco — nunca enviados no INSERT.
 */
export interface Timestamps {
  created_at: DateTimeString
  updated_at?: DateTimeString
}

/**
 * Resultado paginado para listagens.
 */
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Parâmetros de paginação para queries.
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

/**
 * Resposta padrão da API para operações de escrita.
 */
export interface MutationResult {
  success: boolean
  id?: UUID
  affectedRows?: number
  message?: string
}
