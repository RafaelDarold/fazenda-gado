import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query, execute } from "../db/index.js";
import { authConfig } from "../config/env.js";
import { uuid } from "../utils/uuid.js";

export type PerfilUsuario = "owner" | "super_admin" | "admin" | "caseiro";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  fazenda_id: string | null;
  ativo: boolean;
  senha_temporaria: boolean;
  created_at: string;
}

export interface TokenPayload {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  fazenda_id: string | null;
}

const OWNER_EMAIL = "adarold.dev@gmail.com";

export class AuthService {
  async login(
    email: string,
    senha: string,
  ): Promise<{ token: string; usuario: Usuario; senhaTemporaria: boolean }> {
    const rows = await query<Usuario & { senha_hash: string }>(
      "SELECT * FROM usuario WHERE email = ? AND ativo = 1 LIMIT 1",
      [email],
    );
    const usuario = rows[0];
    if (!usuario) throw new Error("Email ou senha invalidos");
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) throw new Error("Email ou senha invalidos");

    const payload: TokenPayload = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      fazenda_id: usuario.fazenda_id,
    };
    const token = jwt.sign(payload, authConfig.jwtSecret, {
      expiresIn: authConfig.jwtExpiresIn as any,
    });
    const { senha_hash: _, ...usuarioSemSenha } = usuario;
    return {
      token,
      usuario: usuarioSemSenha as Usuario,
      senhaTemporaria: !!usuario.senha_temporaria,
    };
  }

  verificarToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, authConfig.jwtSecret) as TokenPayload;
    } catch {
      throw new Error("Token invalido ou expirado");
    }
  }

  async listar(fazendaId?: string): Promise<Usuario[]> {
    if (fazendaId) {
      return query<Usuario>(
        "SELECT id, nome, email, perfil, fazenda_id, ativo, senha_temporaria, created_at FROM usuario WHERE fazenda_id = ? ORDER BY nome",
        [fazendaId],
      );
    }
    return query<Usuario>(
      "SELECT id, nome, email, perfil, fazenda_id, ativo, senha_temporaria, created_at FROM usuario ORDER BY nome",
    );
  }

  async criar(
    nome: string,
    email: string,
    senha: string,
    perfil: PerfilUsuario,
    fazenda_id?: string,
  ): Promise<Usuario> {
    const existente = await query<{ id: string }>(
      "SELECT id FROM usuario WHERE email = ? LIMIT 1",
      [email],
    );
    if (existente.length > 0) throw new Error("Este email ja esta em uso");
    const id = uuid();
    const senhaHash = await bcrypt.hash(senha, 12);
    await execute(
      "INSERT INTO usuario (id, nome, email, senha_hash, perfil, fazenda_id, senha_temporaria) VALUES (?, ?, ?, ?, ?, ?, 1)",
      [id, nome, email, senhaHash, perfil, fazenda_id ?? null],
    );
    const rows = await query<Usuario>(
      "SELECT id, nome, email, perfil, fazenda_id, ativo, senha_temporaria, created_at FROM usuario WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0];
  }

  async atualizarDados(
    id: string,
    nome: string,
    email: string,
    solicitanteId: string,
  ): Promise<Usuario> {
    // Owner nao pode ser modificado por ninguem exceto por si mesmo
    const alvo = await query<{ perfil: string }>(
      "SELECT perfil FROM usuario WHERE id = ? LIMIT 1",
      [id],
    );
    if (alvo[0]?.perfil === "owner" && id !== solicitanteId) {
      throw new Error("O usuario owner nao pode ser modificado");
    }
    const existente = await query<{ id: string }>(
      "SELECT id FROM usuario WHERE email = ? AND id != ? LIMIT 1",
      [email, id],
    );
    if (existente.length > 0) throw new Error("Este email ja esta em uso");
    await execute("UPDATE usuario SET nome = ?, email = ? WHERE id = ?", [
      nome,
      email,
      id,
    ]);
    const rows = await query<Usuario>(
      "SELECT id, nome, email, perfil, fazenda_id, ativo, senha_temporaria, created_at FROM usuario WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0];
  }

  async alterarSenha(
    id: string,
    senhaAtual: string,
    novaSenha: string,
  ): Promise<void> {
    const rows = await query<{ senha_hash: string }>(
      "SELECT senha_hash FROM usuario WHERE id = ? LIMIT 1",
      [id],
    );
    if (!rows[0]) throw new Error("Usuario nao encontrado");
    const valida = await bcrypt.compare(senhaAtual, rows[0].senha_hash);
    if (!valida) throw new Error("Senha atual incorreta");
    const novaHash = await bcrypt.hash(novaSenha, 12);
    await execute(
      "UPDATE usuario SET senha_hash = ?, senha_temporaria = 0 WHERE id = ?",
      [novaHash, id],
    );
  }

  async redefinirSenha(
    id: string,
    novaSenha: string,
    solicitanteId: string,
  ): Promise<void> {
    const alvo = await query<{ perfil: string }>(
      "SELECT perfil FROM usuario WHERE id = ? LIMIT 1",
      [id],
    );
    if (alvo[0]?.perfil === "owner" && id !== solicitanteId) {
      throw new Error(
        "A senha do owner nao pode ser redefinida por outro usuario",
      );
    }
    const hash = await bcrypt.hash(novaSenha, 12);
    await execute(
      "UPDATE usuario SET senha_hash = ?, senha_temporaria = 0 WHERE id = ?",
      [hash, id],
    );
  }

  async excluir(id: string, solicitanteId: string): Promise<void> {
    if (id === solicitanteId)
      throw new Error("Voce nao pode excluir sua propria conta");
    const alvo = await query<{ perfil: string; email: string }>(
      "SELECT perfil, email FROM usuario WHERE id = ? LIMIT 1",
      [id],
    );
    if (!alvo[0]) throw new Error("Usuario nao encontrado");
    if (alvo[0].perfil === "owner")
      throw new Error("O usuario owner nao pode ser excluido");
    // super_admin so pode ser excluido pelo owner
    const solicitante = await query<{ perfil: string }>(
      "SELECT perfil FROM usuario WHERE id = ? LIMIT 1",
      [solicitanteId],
    );
    if (
      alvo[0].perfil === "super_admin" &&
      solicitante[0]?.perfil !== "owner"
    ) {
      throw new Error("Apenas o owner pode excluir super_admins");
    }
    await execute("DELETE FROM usuario WHERE id = ?", [id]);
  }

  async toggleAtivo(id: string, solicitanteId: string): Promise<void> {
    const alvo = await query<{ perfil: string }>(
      "SELECT perfil FROM usuario WHERE id = ? LIMIT 1",
      [id],
    );
    if (alvo[0]?.perfil === "owner")
      throw new Error("O usuario owner nao pode ser desativado");
    const solicitante = await query<{ perfil: string }>(
      "SELECT perfil FROM usuario WHERE id = ? LIMIT 1",
      [solicitanteId],
    );
    if (
      alvo[0]?.perfil === "super_admin" &&
      solicitante[0]?.perfil !== "owner"
    ) {
      throw new Error("Apenas o owner pode desativar super_admins");
    }
    await execute("UPDATE usuario SET ativo = NOT ativo WHERE id = ?", [id]);
  }

  async garantirOwner(): Promise<void> {
    const rows = await query<{ id: string }>(
      `SELECT id FROM usuario WHERE email = ? LIMIT 1`,
      [OWNER_EMAIL],
    );
    if (rows.length > 0) {
      // Garante que o perfil seja sempre owner
      await execute(
        `UPDATE usuario SET perfil = 'owner', fazenda_id = NULL WHERE email = ?`,
        [OWNER_EMAIL],
      );
      return;
    }
    console.log(`   Criando usuario owner: ${OWNER_EMAIL}`);
    const id = uuid();
    const hash = await bcrypt.hash("owner@2026", 12);
    await execute(
      `INSERT INTO usuario (id, nome, email, senha_hash, perfil, fazenda_id, senha_temporaria) VALUES (?, ?, ?, ?, 'owner', NULL, 1)`,
      [id, "Owner", OWNER_EMAIL, hash],
    );
  }

  async garantirAdminPadrao(): Promise<void> {
    await this.garantirOwner();
    const rows = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM usuario WHERE perfil NOT IN ('owner')`,
    );
    if ((rows[0]?.total ?? 0) > 0) return;
    console.log(
      "   Criando usuario admin padrao: admin@fazenda.com / admin123",
    );
    await this.criar(
      "Administrador",
      "admin@fazenda.com",
      "admin123",
      "admin",
      "00000000-0000-0000-0000-000000000001",
    );
  }
}

export const authService = new AuthService();
