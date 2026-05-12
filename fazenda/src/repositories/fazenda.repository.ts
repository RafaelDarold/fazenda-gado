import { query, execute } from "../db/index.js";
import { uuid } from "../utils/uuid.js";
import type {
  Fazenda,
  CreateFazendaDTO,
  UpdateFazendaDTO,
} from "../types/fazenda.js";

export class FazendaRepository {
  async findAll(): Promise<Fazenda[]> {
    return query<Fazenda>(`
      SELECT f.*,
        (SELECT COUNT(*) FROM usuario u WHERE u.fazenda_id = f.id AND u.ativo = 1) AS total_usuarios,
        (SELECT COUNT(*) FROM animal a WHERE a.fazenda_id = f.id AND a.ativo = 1) AS total_animais
      FROM fazenda f ORDER BY f.nome
    `);
  }

  async findById(id: string): Promise<Fazenda | null> {
    const rows = await query<Fazenda>(
      "SELECT * FROM fazenda WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ?? null;
  }

  async create(dto: CreateFazendaDTO): Promise<Fazenda> {
    const id = uuid();
    await execute(
      `INSERT INTO fazenda (id, nome, razao_social, cnpj, endereco, telefone, email, logo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dto.nome,
        dto.razao_social ?? null,
        dto.cnpj ?? null,
        dto.endereco ?? null,
        dto.telefone ?? null,
        dto.email ?? null,
        dto.logo_url ?? null,
      ],
    );
    return (await this.findById(id))!;
  }

  async update(id: string, dto: UpdateFazendaDTO): Promise<Fazenda | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (dto.nome !== undefined) {
      fields.push("nome = ?");
      values.push(dto.nome);
    }
    if (dto.razao_social !== undefined) {
      fields.push("razao_social = ?");
      values.push(dto.razao_social);
    }
    if (dto.cnpj !== undefined) {
      fields.push("cnpj = ?");
      values.push(dto.cnpj);
    }
    if (dto.endereco !== undefined) {
      fields.push("endereco = ?");
      values.push(dto.endereco);
    }
    if (dto.telefone !== undefined) {
      fields.push("telefone = ?");
      values.push(dto.telefone);
    }
    if (dto.email !== undefined) {
      fields.push("email = ?");
      values.push(dto.email);
    }
    if (dto.logo_url !== undefined) {
      fields.push("logo_url = ?");
      values.push(dto.logo_url);
    }
    if (dto.ativo !== undefined) {
      fields.push("ativo = ?");
      values.push(dto.ativo ? 1 : 0);
    }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await execute(
      `UPDATE fazenda SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await execute("DELETE FROM fazenda WHERE id = ?", [id]);
  }
}

export const fazendaRepository = new FazendaRepository();
