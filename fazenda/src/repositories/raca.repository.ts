import { query, execute } from "../db/index.js";
import { uuid } from "../utils/uuid.js";

export interface Raca {
  id: string;
  nome: string;
  origem: string | null;
  ativo: boolean;
  created_at: string;
}

export class RacaRepository {
  async findAll(apenasAtivas = true): Promise<Raca[]> {
    const where = apenasAtivas ? "WHERE ativo = 1" : "";
    return query<Raca>(`SELECT * FROM raca_bovina ${where} ORDER BY nome`);
  }

  async findById(id: string): Promise<Raca | null> {
    const rows = await query<Raca>(
      "SELECT * FROM raca_bovina WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ?? null;
  }

  async create(nome: string, origem?: string): Promise<Raca> {
    const id = uuid();
    await execute(
      "INSERT INTO raca_bovina (id, nome, origem) VALUES (?, ?, ?)",
      [id, nome, origem ?? null],
    );
    return (await this.findById(id))!;
  }

  async update(
    id: string,
    nome: string,
    origem?: string,
  ): Promise<Raca | null> {
    await execute("UPDATE raca_bovina SET nome = ?, origem = ? WHERE id = ?", [
      nome,
      origem ?? null,
      id,
    ]);
    return this.findById(id);
  }

  async toggleAtivo(id: string): Promise<void> {
    await execute("UPDATE raca_bovina SET ativo = NOT ativo WHERE id = ?", [
      id,
    ]);
  }

  async delete(id: string): Promise<void> {
    await execute("DELETE FROM raca_bovina WHERE id = ?", [id]);
  }
}

export const racaRepository = new RacaRepository();
