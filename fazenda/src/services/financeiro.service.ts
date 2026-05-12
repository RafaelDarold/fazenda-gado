import { lancamentoFinanceiroRepository } from "../repositories/lancamento-financeiro.repository.js";
import { categoriaFinanceiraRepository } from "../repositories/categoria-financeira.repository.js";
import type {
  LancamentoFinanceiro,
  LancamentoDetalhado,
  CreateLancamentoDTO,
  FiltroLancamento,
  CategoriaFinanceira,
  TipoLancamento,
  Paginated,
  PaginationParams,
  UUID,
  DateString,
} from "../types/index.js";

export class FinanceiroService {
  // ── Categorias ──────────────────────────────────────────────────────────────

  async listarCategorias(
    tipo?: TipoLancamento,
  ): Promise<CategoriaFinanceira[]> {
    return categoriaFinanceiraRepository.findAll(tipo);
  }

  // ── Lançamentos ─────────────────────────────────────────────────────────────

  async listar(
    filtro: FiltroLancamento = {},
    pagination?: PaginationParams,
  ): Promise<Paginated<LancamentoDetalhado>> {
    return lancamentoFinanceiroRepository.findAll(filtro, pagination);
  }

  async buscarPorId(id: UUID): Promise<LancamentoDetalhado> {
    const lanc = await lancamentoFinanceiroRepository.findById(id);
    if (!lanc) throw new Error(`Lançamento não encontrado: ${id}`);
    // Retorna com JOIN resolvido
    return lanc as unknown as LancamentoDetalhado;
  }

  async pendentes(fazendaId?: string): Promise<LancamentoDetalhado[]> {
    return lancamentoFinanceiroRepository.findPendentes(fazendaId);
  }

  async aVencer(dias = 30): Promise<LancamentoDetalhado[]> {
    return lancamentoFinanceiroRepository.findAVencer(dias);
  }

  // ── Criação avulsa ──────────────────────────────────────────────────────────

  async lancar(dto: CreateLancamentoDTO): Promise<LancamentoFinanceiro> {
    const categoria = await categoriaFinanceiraRepository.findById(
      dto.categoria_id,
    );
    if (!categoria)
      throw new Error(`Categoria não encontrada: ${dto.categoria_id}`);
    if (categoria.tipo !== dto.tipo) {
      throw new Error(
        `Tipo inválido: categoria "${categoria.nome}" é ${categoria.tipo}, não ${dto.tipo}`,
      );
    }
    return lancamentoFinanceiroRepository.create(dto);
  }

  // ── Pagamento ───────────────────────────────────────────────────────────────

  async marcarComoPago(id: UUID, dataPagamento: DateString): Promise<void> {
    const lanc = await lancamentoFinanceiroRepository.findById(id);
    if (!lanc) throw new Error(`Lançamento não encontrado: ${id}`);
    if (lanc.pago) throw new Error("Lançamento já está marcado como pago");
    await lancamentoFinanceiroRepository.marcarComoPago(id, dataPagamento);
  }

  async cancelar(id: UUID): Promise<void> {
    const lanc = await lancamentoFinanceiroRepository.findById(id);
    if (!lanc) throw new Error(`Lançamento não encontrado: ${id}`);
    if (lanc.status === "cancelado")
      throw new Error("Lançamento já está cancelado");
    await lancamentoFinanceiroRepository.cancelar(id);
  }

  // ── Resumo para dashboard ───────────────────────────────────────────────────

  async resumoPeriodo(
    dataInicio: DateString,
    dataFim: DateString,
    fazendaId?: string,
  ): Promise<{
    totalReceitas: number;
    totalDespesas: number;
    saldo: number;
    qtdReceitas: number;
    qtdDespesas: number;
    qtdPendentes: number;
  }> {
    const [resumo, pendentes] = await Promise.all([
      lancamentoFinanceiroRepository.resumoPeriodo(
        dataInicio,
        dataFim,
        fazendaId,
      ),
      lancamentoFinanceiroRepository.findPendentes(),
    ]);

    let totalReceitas = 0;
    let totalDespesas = 0;
    let qtdReceitas = 0;
    let qtdDespesas = 0;

    for (const linha of resumo) {
      if (linha.tipo === "receita") {
        totalReceitas += parseFloat(linha.total);
        qtdReceitas += linha.quantidade;
      } else {
        totalDespesas += parseFloat(linha.total);
        qtdDespesas += linha.quantidade;
      }
    }

    return {
      totalReceitas: Math.round(totalReceitas * 100) / 100,
      totalDespesas: Math.round(totalDespesas * 100) / 100,
      saldo: Math.round((totalReceitas - totalDespesas) * 100) / 100,
      qtdReceitas,
      qtdDespesas,
      qtdPendentes: pendentes.length,
    };
  }
}

export const financeiroService = new FinanceiroService();
