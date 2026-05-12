import { transaction } from "../db/index.js";
import { animalRepository } from "../repositories/animal.repository.js";
import { loteRepository } from "../repositories/lote.repository.js";
import { movimentacaoRepository } from "../repositories/movimentacao.repository.js";
import { lancamentoFinanceiroRepository } from "../repositories/lancamento-financeiro.repository.js";
import { boletimAbateRepository } from "../repositories/boletim-abate.repository.js";
import { categoriaFinanceiraRepository } from "../repositories/categoria-financeira.repository.js";
import { calcValorFrigorifico } from "../utils/index.js";
import type {
  Movimentacao,
  MovimentacaoDetalhada,
  ConfirmarCompraDTO,
  ConfirmarVendaFrigorificoEtapa1DTO,
  ConfirmarBoletimAbateDTO,
  RegistrarObitoDTO,
  RegistrarNascimentoDTO,
  FiltroMovimentacao,
  LancamentoFinanceiro,
  UUID,
  Paginated,
  PaginationParams,
} from "../types/index.js";

export class MovimentacaoService {
  // ── Consultas ───────────────────────────────────────────────────────────────

  async listar(
    filtro: FiltroMovimentacao = {},
    pagination?: PaginationParams,
  ): Promise<Paginated<MovimentacaoDetalhada>> {
    return movimentacaoRepository.findAll(filtro, pagination);
  }

  async historicoPorAnimal(animalId: UUID): Promise<MovimentacaoDetalhada[]> {
    return movimentacaoRepository.findByAnimal(animalId);
  }

  // ── COMPRA ──────────────────────────────────────────────────────────────────

  /**
   * Fluxo de compra — executado após confirmação do usuário.
   *
   * Para cada animal no DTO:
   *   1. Valida brinco único
   *   2. Cria o registro em `animal`
   *   3. Cria a `movimentacao` (tipo=compra, direcao=entrada)
   *   4. Ajusta o contador do lote
   *
   * Ao final, cria um único `lancamento_financeiro` de despesa
   * com o valor total da compra, vinculado a todas as movimentações.
   *
   * Tudo dentro de uma transação — se qualquer INSERT falhar, reverte tudo.
   */
  async confirmarCompra(dto: ConfirmarCompraDTO): Promise<{
    animais: Movimentacao[];
    lancamento: LancamentoFinanceiro;
  }> {
    // Valida lote de destino
    const lote = await loteRepository.findById(dto.lote_destino_id);
    if (!lote) throw new Error(`Lote não encontrado: ${dto.lote_destino_id}`);

    // Valida brincos antes de abrir a transação
    for (const a of dto.animais) {
      const existente = await animalRepository.findByBrinco(a.brinco);
      if (existente) throw new Error(`Brinco já cadastrado: ${a.brinco}`);
    }

    // Busca categoria "Compra de animais" (seed do sistema)
    const categoria = await categoriaFinanceiraRepository.findByNomeETipo(
      "Compra de animais",
      "despesa",
    );
    if (!categoria)
      throw new Error(
        'Categoria "Compra de animais" não encontrada no sistema',
      );

    const valorTotal = dto.animais.reduce(
      (acc, a) => acc + a.valor_unitario,
      0,
    );

    return transaction(async (conn) => {
      // Cria o lançamento financeiro primeiro (sem ID de movimentação ainda)
      const lancamento = await lancamentoFinanceiroRepository.createCompra(
        {
          data: dto.data,
          categoria_id: categoria.id,
          valor_final: valorTotal,
          descricao: `Compra ${dto.animais.length} animal(is) — ${dto.origem}`,
          forma_pagamento: dto.forma_pagamento as any,
          data_vencimento: dto.data_vencimento,
          observacao: dto.observacao,
        },
        conn,
      );

      const movimentacoes: Movimentacao[] = [];

      for (const a of dto.animais) {
        // Cria o animal
        const animal = await animalRepository.create(
          {
            brinco: a.brinco,
            nome: a.nome,
            raca: a.raca,
            sexo: a.sexo,
            categoria: a.categoria,
            data_nascimento: a.data_nascimento,
            lote_id: dto.lote_destino_id,
            peso_entrada_arroba: a.peso_entrada_arroba,
            fazenda_id: (dto as any).fazenda_id || "",
          },
          conn,
        );

        // Cria a movimentação vinculada ao lançamento
        const mov = await movimentacaoRepository.create(
          {
            animal_id: animal.id,
            tipo: "compra",
            direcao: "entrada",
            data: dto.data,
            lote_destino_id: dto.lote_destino_id,
            pasto_destino_id: dto.pasto_destino_id,
            origem_destino: dto.origem,
            lancamento_financeiro_id: lancamento.id,
            numero_gta: dto.numero_gta,
            observacao: dto.observacao,
          },
          conn,
        );

        movimentacoes.push(mov);
      }

      // Ajusta contador do lote (+N animais)
      await loteRepository.ajustarQuantidade(
        dto.lote_destino_id,
        dto.animais.length,
        conn,
      );

      return { animais: movimentacoes, lancamento };
    });
  }

  // ── VENDA AO FRIGORÍFICO — ETAPA 1 ─────────────────────────────────────────

  /**
   * Registra a saída dos animais e cria o lançamento pendente.
   * O valor financeiro só é confirmado na etapa 2 (boletim de abate).
   */
  async confirmarVendaFrigorificoEtapa1(
    dto: ConfirmarVendaFrigorificoEtapa1DTO,
  ): Promise<{
    movimentacoes: Movimentacao[];
    lancamento: LancamentoFinanceiro;
  }> {
    if (dto.animal_ids.length === 0)
      throw new Error("Nenhum animal selecionado para venda");

    const categoria = await categoriaFinanceiraRepository.findByNomeETipo(
      "Venda de boi gordo",
      "receita",
    );
    if (!categoria)
      throw new Error('Categoria "Venda de boi gordo" não encontrada');

    // Valida que todos os animais existem e estão ativos
    for (const id of dto.animal_ids) {
      const animal = await animalRepository.findById(id);
      if (!animal) throw new Error(`Animal não encontrado: ${id}`);
      if (!animal.ativo)
        throw new Error(`Animal inativo: ${id} — brinco ${animal.brinco}`);
    }

    return transaction(async (conn) => {
      // Cria lançamento PENDENTE (sem valor final)
      const lancamento =
        await lancamentoFinanceiroRepository.createVendaFrigorifico(
          {
            data: dto.data,
            categoria_id: categoria.id,
            valor_estimado: dto.valor_arroba_estimado
              ? dto.animal_ids.length * dto.valor_arroba_estimado
              : undefined,
            descricao: `Venda ${dto.animal_ids.length} animal(is) — ${dto.frigorifico}`,
            observacao: dto.observacao,
          },
          conn,
        );

      const movimentacoes: Movimentacao[] = [];
      const lotesPendentes = new Set<UUID>();

      for (const animalId of dto.animal_ids) {
        const animal = await animalRepository.findById(animalId);
        if (!animal) continue;

        // Registra saída
        const mov = await movimentacaoRepository.create(
          {
            animal_id: animalId,
            tipo: "venda",
            direcao: "saida",
            data: dto.data,
            origem_destino: dto.frigorifico,
            lancamento_financeiro_id: lancamento.id,
            numero_gta: dto.numero_gta,
            observacao: dto.observacao,
          },
          conn,
        );

        movimentacoes.push(mov);

        // Inativa o animal
        await animalRepository.update(animalId, { ativo: false });

        // Marca o lote para ajuste de contador
        if (animal.lote_id) lotesPendentes.add(animal.lote_id);
      }

      // Ajusta contadores dos lotes afetados
      for (const loteId of lotesPendentes) {
        const qtd = dto.animal_ids.filter(async (id) => {
          const a = await animalRepository.findById(id);
          return a?.lote_id === loteId;
        }).length;
        await loteRepository.ajustarQuantidade(loteId, -qtd, conn);
      }

      return { movimentacoes, lancamento };
    });
  }

  // ── VENDA AO FRIGORÍFICO — ETAPA 2 ─────────────────────────────────────────

  /**
   * Recebe o boletim de abate do frigorífico, calcula o valor final
   * e confirma o lançamento financeiro.
   *
   * O valor é calculado pelo banco via coluna GENERATED, mas também
   * calculamos aqui para confirmar no lançamento financeiro.
   */
  async confirmarBoletimAbate(dto: ConfirmarBoletimAbateDTO): Promise<{
    boletim: Awaited<ReturnType<typeof boletimAbateRepository.findById>>;
    valorFinal: number;
  }> {
    const lancamento = await lancamentoFinanceiroRepository.findById(
      dto.lancamento_financeiro_id,
    );
    if (!lancamento) throw new Error("Lançamento financeiro não encontrado");
    if (lancamento.status !== "pendente") {
      throw new Error("Este lançamento já foi confirmado ou cancelado");
    }

    const valorFinal = calcValorFrigorifico({
      pesoCarcacaArroba: dto.peso_carcaca_total_arroba,
      valorArroba: dto.valor_arroba,
      bonificacoes: dto.bonificacoes,
      descontos: dto.descontos,
    });

    return transaction(async (conn) => {
      // Cria o boletim de abate
      const boletim = await boletimAbateRepository.create(
        {
          lancamento_financeiro_id: dto.lancamento_financeiro_id,
          frigorifico: dto.frigorifico,
          data_abate: dto.data_abate,
          data_boletim: dto.data_boletim,
          quantidade_animais: dto.quantidade_animais,
          peso_vivo_total_arroba: dto.peso_vivo_total_arroba,
          peso_carcaca_total_arroba: dto.peso_carcaca_total_arroba,
          rendimento_percent: dto.rendimento_percent,
          valor_arroba: dto.valor_arroba,
          bonificacoes: dto.bonificacoes,
          descontos: dto.descontos,
          numero_gta: dto.numero_gta,
          numero_nfe: dto.numero_nfe,
          arquivo_boletim: dto.arquivo_boletim,
        },
        conn,
      );

      // Confirma o lançamento com o valor real
      await lancamentoFinanceiroRepository.confirmarVenda(
        dto.lancamento_financeiro_id,
        { valor_final: valorFinal },
      );

      return { boletim, valorFinal };
    });
  }

  // ── ÓBITO ───────────────────────────────────────────────────────────────────

  async confirmarVendaDireta(dto: {
    data: string;
    comprador: string;
    lote_id: string;
    animal_ids: string[];
    tipo_preco: "por_cabeca" | "por_peso";
    valor_total: number;
    valor_por_cabeca?: number;
    valor_por_arroba?: number;
    peso_total_arroba?: number;
    forma_pagamento: string;
    numero_gta?: string;
    observacao?: string;
  }): Promise<{
    movimentacoes: Movimentacao[];
    lancamento: LancamentoFinanceiro;
  }> {
    if (dto.animal_ids.length === 0)
      throw new Error("Nenhum animal selecionado");

    const categoria = await categoriaFinanceiraRepository.findByNomeETipo(
      "Venda de boi gordo",
      "receita",
    );
    if (!categoria)
      throw new Error('Categoria "Venda de boi gordo" nao encontrada');

    for (const id of dto.animal_ids) {
      const animal = await animalRepository.findById(id);
      if (!animal) throw new Error(`Animal nao encontrado: ${id}`);
      if (!animal.ativo)
        throw new Error(`Animal inativo: brinco ${animal.brinco}`);
    }

    return transaction(async (conn) => {
      const descricao =
        dto.tipo_preco === "por_cabeca"
          ? `Venda direta ${dto.animal_ids.length} animal(is) a ${dto.comprador} — R$${dto.valor_por_cabeca}/cab`
          : `Venda direta ${dto.animal_ids.length} animal(is) a ${dto.comprador} — R$${dto.valor_por_arroba}/@`;

      const lancamento = await lancamentoFinanceiroRepository.create(
        {
          data: dto.data,
          tipo: "receita",
          categoria_id: categoria.id,
          valor_final: dto.valor_total,
          descricao,
          forma_pagamento: dto.forma_pagamento as any,
          pago: false,
          observacao: dto.observacao,
        },
        conn,
      );

      const movimentacoes: Movimentacao[] = [];
      const lotesPendentes = new Map<string, number>();

      for (const animalId of dto.animal_ids) {
        const animal = await animalRepository.findById(animalId);
        if (!animal) continue;

        const mov = await movimentacaoRepository.create(
          {
            animal_id: animalId,
            tipo: "venda",
            direcao: "saida",
            data: dto.data,
            origem_destino: dto.comprador,
            lancamento_financeiro_id: lancamento.id,
            numero_gta: dto.numero_gta,
            observacao: dto.observacao,
          },
          conn,
        );

        movimentacoes.push(mov);
        await conn.execute("UPDATE animal SET ativo = 0 WHERE id = ?", [
          animalId,
        ]);

        if (animal.lote_id) {
          lotesPendentes.set(
            animal.lote_id,
            (lotesPendentes.get(animal.lote_id) ?? 0) + 1,
          );
        }
      }

      for (const [loteId, qtd] of lotesPendentes) {
        await conn.execute(
          "UPDATE lote SET quantidade_atual = GREATEST(0, quantidade_atual - ?) WHERE id = ?",
          [qtd, loteId],
        );
      }

      return { movimentacoes, lancamento };
    });
  }

  async registrarObito(dto: RegistrarObitoDTO): Promise<Movimentacao> {
    const animal = await animalRepository.findById(dto.animal_id);
    if (!animal) throw new Error(`Animal não encontrado: ${dto.animal_id}`);
    if (!animal.ativo) throw new Error(`Animal já está inativo`);

    return transaction(async (conn) => {
      const mov = await movimentacaoRepository.create(
        {
          animal_id: dto.animal_id,
          tipo: "obito",
          direcao: "saida",
          data: dto.data,
          causa_obito: dto.causa_obito,
          origem_destino: dto.causa_obito,
          observacao: dto.observacao,
        },
        conn,
      );

      // Inativa o animal e ajusta lote
      await animalRepository.update(dto.animal_id, { ativo: false });
      if (animal.lote_id) {
        await loteRepository.ajustarQuantidade(animal.lote_id, -1, conn);
      }

      return mov;
    });
  }

  // ── NASCIMENTO ──────────────────────────────────────────────────────────────

  async registrarNascimento(dto: RegistrarNascimentoDTO): Promise<{
    animal: import("../types/index.js").Animal;
    movimentacao: Movimentacao;
  }> {
    const existente = await animalRepository.findByBrinco(dto.brinco);
    if (existente) throw new Error(`Brinco já cadastrado: ${dto.brinco}`);

    const lote = await loteRepository.findById(dto.lote_destino_id);
    if (!lote) throw new Error(`Lote não encontrado: ${dto.lote_destino_id}`);

    return transaction(async (conn) => {
      const animal = await animalRepository.create(
        {
          brinco: dto.brinco,
          nome: (dto as any).nome || undefined,
          raca: (dto as any).raca || lote.categoria_principal || "Nao definida",
          sexo: dto.sexo,
          categoria: dto.sexo === "M" ? "bezerro" : "bezerra",
          data_nascimento: dto.data,
          mae_id: dto.mae_id,
          pai_id: dto.pai_id,
          lote_id: dto.lote_destino_id,
          peso_entrada_arroba: dto.peso_entrada_arroba,
          fazenda_id: (dto as any).fazenda_id || "",
          observacao: dto.observacao,
        },
        conn,
      );

      const mov = await movimentacaoRepository.create(
        {
          animal_id: animal.id,
          tipo: "nascimento",
          direcao: "entrada",
          data: dto.data,
          lote_destino_id: dto.lote_destino_id,
          observacao: dto.observacao,
        },
        conn,
      );

      await loteRepository.ajustarQuantidade(dto.lote_destino_id, +1, conn);

      return { animal, movimentacao: mov };
    });
  }
}

export const movimentacaoService = new MovimentacaoService();
