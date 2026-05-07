import { query, execute, transaction } from "../db/index.js";
import { hoje } from "../utils/date.js";
import type { UUID, CategoriaAnimal } from "../types/index.js";

export interface ParametroRecategorizacao {
  id: UUID;
  categoria_de: CategoriaAnimal;
  categoria_para: CategoriaAnimal;
  meses_minimos: number;
  ativo: boolean;
  observacao: string | null;
}

export interface AnimalParaRecategorizar {
  id: UUID;
  brinco: string;
  nome: string | null;
  categoria_atual: CategoriaAnimal;
  categoria_sugerida: CategoriaAnimal;
  data_nascimento: string;
  idade_meses: number;
  lote_nome: string | null;
  pasto_nome: string | null;
}

export interface ResultadoRecategorizacao {
  total: number;
  sucesso: number;
  erros: string[];
}

export class RecategorizacaoService {
  async listarParametros(): Promise<ParametroRecategorizacao[]> {
    return query<ParametroRecategorizacao>(
      "SELECT * FROM parametro_recategorizacao ORDER BY categoria_de",
    );
  }

  async atualizarParametro(
    id: UUID,
    meses_minimos: number,
    ativo: boolean,
  ): Promise<void> {
    await execute(
      "UPDATE parametro_recategorizacao SET meses_minimos = ?, ativo = ? WHERE id = ?",
      [meses_minimos, ativo ? 1 : 0, id],
    );
  }

  async buscarAnimaisParaRecategorizar(): Promise<AnimalParaRecategorizar[]> {
    return query<AnimalParaRecategorizar>(`
      SELECT
        a.id,
        a.brinco,
        a.nome,
        a.categoria AS categoria_atual,
        pr.categoria_para AS categoria_sugerida,
        a.data_nascimento,
        TIMESTAMPDIFF(MONTH, a.data_nascimento, CURDATE()) AS idade_meses,
        l.nome AS lote_nome,
        p.nome AS pasto_nome
      FROM animal a
      JOIN parametro_recategorizacao pr
        ON pr.categoria_de = a.categoria
        AND pr.ativo = 1
        AND TIMESTAMPDIFF(MONTH, a.data_nascimento, CURDATE()) >= pr.meses_minimos
      LEFT JOIN lote  l ON l.id = a.lote_id
      LEFT JOIN pasto p ON p.id = l.pasto_atual_id
      WHERE a.ativo = 1
        AND a.data_nascimento IS NOT NULL
      ORDER BY idade_meses DESC
    `);
  }

  async contarPendentes(): Promise<number> {
    const rows = await query<{ total: number }>(`
      SELECT COUNT(*) AS total
      FROM animal a
      JOIN parametro_recategorizacao pr
        ON pr.categoria_de = a.categoria
        AND pr.ativo = 1
        AND TIMESTAMPDIFF(MONTH, a.data_nascimento, CURDATE()) >= pr.meses_minimos
      WHERE a.ativo = 1
        AND a.data_nascimento IS NOT NULL
    `);
    return rows[0]?.total ?? 0;
  }

  async recategorizarEmLote(
    animais: Array<{ animal_id: UUID; categoria_para: CategoriaAnimal }>,
    responsavel?: string,
    observacao?: string,
  ): Promise<ResultadoRecategorizacao> {
    const dataHoje = hoje();
    const erros: string[] = [];
    let sucesso = 0;

    await transaction(async (conn) => {
      for (const item of animais) {
        try {
          const [rows] = await conn.query<any[]>(
            "SELECT categoria, brinco FROM animal WHERE id = ? AND ativo = 1 LIMIT 1",
            [item.animal_id],
          );
          const animal = rows[0];
          if (!animal) {
            erros.push(`Animal ${item.animal_id} nao encontrado`);
            continue;
          }

          await conn.execute("UPDATE animal SET categoria = ? WHERE id = ?", [
            item.categoria_para,
            item.animal_id,
          ]);

          await conn.execute(
            `INSERT INTO historico_recategorizacao
              (id, animal_id, categoria_de, categoria_para, data, responsavel, observacao)
             VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
            [
              item.animal_id,
              animal.categoria,
              item.categoria_para,
              dataHoje,
              responsavel ?? null,
              observacao ?? null,
            ],
          );

          sucesso++;
        } catch (err) {
          erros.push(
            `Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
          );
        }
      }
    });

    return { total: animais.length, sucesso, erros };
  }

  async historicoPorAnimal(animalId: UUID) {
    return query<{
      id: UUID;
      categoria_de: string;
      categoria_para: string;
      data: string;
      responsavel: string | null;
    }>(
      `SELECT id, categoria_de, categoria_para, data, responsavel
       FROM historico_recategorizacao
       WHERE animal_id = ?
       ORDER BY data DESC`,
      [animalId],
    );
  }
}

export const recategorizacaoService = new RecategorizacaoService();
