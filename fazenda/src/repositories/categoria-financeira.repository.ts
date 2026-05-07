import { BaseRepository } from './base.repository.js'
import { query, execute } from '../db/index.js'
import { uuid } from '../utils/index.js'
import type {
  CategoriaFinanceira,
  CreateCategoriaFinanceiraDTO,
  UpdateCategoriaFinanceiraDTO,
  TipoLancamento,
  UUID,
} from '../types/index.js'

export class CategoriaFinanceiraRepository extends BaseRepository<CategoriaFinanceira> {
  constructor() {
    super('categoria_financeira')
  }

  // ── Listagens ───────────────────────────────────────────────────────────────

  async findAll(tipo?: TipoLancamento): Promise<CategoriaFinanceira[]> {
    if (tipo) {
      return query<CategoriaFinanceira>(
        'SELECT * FROM categoria_financeira WHERE tipo = ? AND ativo = 1 ORDER BY nome',
        [tipo],
      )
    }
    return query<CategoriaFinanceira>(
      'SELECT * FROM categoria_financeira WHERE ativo = 1 ORDER BY tipo, nome',
    )
  }

  async findReceitas(): Promise<CategoriaFinanceira[]> {
    return this.findAll('receita')
  }

  async findDespesas(): Promise<CategoriaFinanceira[]> {
    return this.findAll('despesa')
  }

  // ── Busca por nome ──────────────────────────────────────────────────────────

  async findByNomeETipo(nome: string, tipo: TipoLancamento): Promise<CategoriaFinanceira | null> {
    const rows = await query<CategoriaFinanceira>(
      'SELECT * FROM categoria_financeira WHERE nome = ? AND tipo = ? LIMIT 1',
      [nome, tipo],
    )
    return rows[0] ?? null
  }

  // ── Escrita ─────────────────────────────────────────────────────────────────

  async create(dto: CreateCategoriaFinanceiraDTO): Promise<CategoriaFinanceira> {
    const id = uuid()
    await execute(
      `INSERT INTO categoria_financeira (id, nome, tipo, descricao, is_sistema)
       VALUES (?, ?, ?, ?, 0)`,
      [id, dto.nome, dto.tipo, dto.descricao ?? null],
    )
    return (await this.findById(id))!
  }

  async update(id: UUID, dto: UpdateCategoriaFinanceiraDTO): Promise<CategoriaFinanceira | null> {
    const fields: string[] = []
    const values: unknown[] = []

    if (dto.nome      !== undefined) { fields.push('nome = ?');      values.push(dto.nome) }
    if (dto.descricao !== undefined) { fields.push('descricao = ?'); values.push(dto.descricao) }
    if (dto.ativo     !== undefined) { fields.push('ativo = ?');     values.push(dto.ativo ? 1 : 0) }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    await execute(
      `UPDATE categoria_financeira SET ${fields.join(', ')} WHERE id = ? AND is_sistema = 0`,
      values,
    )
    return this.findById(id)
  }

  /** Categorias do sistema não podem ser excluídas */
  async deleteSafe(id: UUID): Promise<boolean> {
    const result = await execute(
      'DELETE FROM categoria_financeira WHERE id = ? AND is_sistema = 0',
      [id],
    )
    return result.affectedRows > 0
  }
}

export const categoriaFinanceiraRepository = new CategoriaFinanceiraRepository()
