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
  async listar(
    filtro: FiltroMovimentacao = {},
    pagination?: PaginationParams,
  ): Promise<Paginated<MovimentacaoDetalhada>> {
    return movimentacaoRepository.findAll(filtro, pagination);
  }

  async historicoPorAnimal(animalId: UUID): Promise<MovimentacaoDetalhada[]> {
    return movimentacaoRepository.findByAnimal(animalId);
  }

  async confirmarCompra(
    dto: ConfirmarCompraDTO,
  ): Promise<{ animais: Movimentacao[]; lancamento: LancamentoFinanceiro }> {
    const lote = await loteRepository.findById(dto.lote_destino_id);
    if (!lote) throw new Error(`Lote nao encontrado: ${dto.lote_destino_id}`);

    for (const a of dto.animais) {
      const existente = await animalRepository.findByBrinco(a.brinco);
      if (existente) throw new Error(`Brinco ja cadastrado: ${a.brinco}`);
    }

    const categoria = await categoriaFinanceiraRepository.findByNomeETipo(
      "Compra de animais",
      "despesa",
    );
    if (!categoria)
      throw new Error('Categoria "Compra de animais" nao encontrada');

    const valorTotal = dto.animais.reduce(
      (acc, a) => acc + a.valor_unitario,
      0,
    );

    return transaction(async (conn) => {
      const lancamento = await lancamentoFinanceiroRepository.createCompra(
        {
          data: dto.data,
          categoria_id: categoria.id,
          valor_final: valorTotal,
          descricao: `Compra ${dto.animais.length} animal(is) - ${dto.origem}`,
          forma_pagamento: dto.forma_pagamento,
          data_vencimento: dto.data_vencimento,
          observacao: dto.observacao,
        },
        conn,
      );

      const movimentacoes: Movimentacao[] = [];

      for (const a of dto.animais) {
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
          },
          conn,
        );

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

      await conn.execute(
        "UPDATE lote SET quantidade_atual = quantidade_atual + ? WHERE id = ?",
        [dto.animais.length, dto.lote_destino_id],
      );

      return { animais: movimentacoes, lancamento };
    });
  }

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
      throw new Error('Categoria "Venda de boi gordo" nao encontrada');

    for (const id of dto.animal_ids) {
      const animal = await animalRepository.findById(id);
      if (!animal) throw new Error(`Animal nao encontrado: ${id}`);
      if (!animal.ativo)
        throw new Error(`Animal inativo: brinco ${animal.brinco}`);
    }

    return transaction(async (conn) => {
      const lancamento =
        await lancamentoFinanceiroRepository.createVendaFrigorifico(
          {
            data: dto.data,
            categoria_id: categoria.id,
            valor_estimado: dto.valor_arroba_estimado
              ? dto.animal_ids.length * dto.valor_arroba_estimado
              : undefined,
            descricao: `Venda ${dto.animal_ids.length} animal(is) - ${dto.frigorifico}`,
            observacao: dto.observacao,
          },
          conn,
        );

      const movimentacoes: Movimentacao[] = [];
      const lotesPendentes = new Map<UUID, number>();

      for (const animalId of dto.animal_ids) {
        const animal = await animalRepository.findById(animalId);
        if (!animal) continue;

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

  async confirmarBoletimAbate(
    dto: ConfirmarBoletimAbateDTO,
  ): Promise<{
    boletim: Awaited<ReturnType<typeof boletimAbateRepository.findById>>;
    valorFinal: number;
  }> {
    const lancamento = await lancamentoFinanceiroRepository.findById(
      dto.lancamento_financeiro_id,
    );
    if (!lancamento) throw new Error("Lancamento financeiro nao encontrado");
    if (lancamento.status !== "pendente")
      throw new Error("Este lancamento ja foi confirmado ou cancelado");

    const valorFinal = calcValorFrigorifico({
      pesoCarcacaArroba: dto.peso_carcaca_total_arroba,
      valorArroba: dto.valor_arroba,
      bonificacoes: dto.bonificacoes,
      descontos: dto.descontos,
    });

    return transaction(async (conn) => {
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

      await lancamentoFinanceiroRepository.confirmarVenda(
        dto.lancamento_financeiro_id,
        { valor_final: valorFinal },
        conn,
      );

      return { boletim, valorFinal };
    });
  }

  async registrarObito(dto: RegistrarObitoDTO): Promise<Movimentacao> {
    const animal = await animalRepository.findById(dto.animal_id);
    if (!animal) throw new Error(`Animal nao encontrado: ${dto.animal_id}`);
    if (!animal.ativo) throw new Error(`Animal ja esta inativo`);

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

      await conn.execute("UPDATE animal SET ativo = 0 WHERE id = ?", [
        dto.animal_id,
      ]);

      if (animal.lote_id) {
        await conn.execute(
          "UPDATE lote SET quantidade_atual = GREATEST(0, quantidade_atual - 1) WHERE id = ?",
          [animal.lote_id],
        );
      }

      return mov;
    });
  }

  async registrarNascimento(
    dto: RegistrarNascimentoDTO,
  ): Promise<{
    animal: import("../types/index.js").Animal;
    movimentacao: Movimentacao;
  }> {
    const existente = await animalRepository.findByBrinco(dto.brinco);
    if (existente) throw new Error(`Brinco ja cadastrado: ${dto.brinco}`);

    const lote = await loteRepository.findById(dto.lote_destino_id);
    if (!lote) throw new Error(`Lote nao encontrado: ${dto.lote_destino_id}`);

    return transaction(async (conn) => {
      const animal = await animalRepository.create(
        {
          brinco: dto.brinco,
          raca:
            lote.categoria_principal === "misto"
              ? "Nao definida"
              : lote.categoria_principal,
          sexo: dto.sexo,
          categoria: dto.sexo === "M" ? "bezerro" : "bezerra",
          data_nascimento: dto.data,
          mae_id: dto.mae_id,
          pai_id: dto.pai_id,
          lote_id: dto.lote_destino_id,
          peso_entrada_arroba: dto.peso_entrada_arroba,
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

      await conn.execute(
        "UPDATE lote SET quantidade_atual = quantidade_atual + 1 WHERE id = ?",
        [dto.lote_destino_id],
      );

      return { animal, movimentacao: mov };
    });
  }
}

export const movimentacaoService = new MovimentacaoService();
