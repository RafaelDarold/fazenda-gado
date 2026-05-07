import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query, execute } from "../db/index.js";
import { authConfig } from "../config/env.js";
import { uuid } from "../utils/uuid.js";

export type PerfilUsuario = "admin" | "caseiro";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  senha_temporaria: boolean;
  created_at: string;
}

export interface TokenPayload {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
}

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

  async listar(): Promise<Usuario[]> {
    return query<Usuario>(
      "SELECT id, nome, email, perfil, ativo, senha_temporaria, created_at FROM usuario ORDER BY nome",
    );
  }

  async criar(
    nome: string,
    email: string,
    senha: string,
    perfil: PerfilUsuario,
  ): Promise<Usuario> {
    const existente = await query<{ id: string }>(
      "SELECT id FROM usuario WHERE email = ? LIMIT 1",
      [email],
    );
    if (existente.length > 0) throw new Error("Este email ja esta em uso");

    const id = uuid();
    const senhaHash = await bcrypt.hash(senha, 12);
    await execute(
      "INSERT INTO usuario (id, nome, email, senha_hash, perfil, senha_temporaria) VALUES (?, ?, ?, ?, ?, 1)",
      [id, nome, email, senhaHash, perfil],
    );
    const rows = await query<Usuario>(
      "SELECT id, nome, email, perfil, ativo, senha_temporaria, created_at FROM usuario WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0];
  }

  async atualizarDados(
    id: string,
    nome: string,
    email: string,
  ): Promise<Usuario> {
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
      "SELECT id, nome, email, perfil, ativo, senha_temporaria, created_at FROM usuario WHERE id = ? LIMIT 1",
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

  async redefinirSenha(id: string, novaSenha: string): Promise<void> {
    const hash = await bcrypt.hash(novaSenha, 12);
    await execute(
      "UPDATE usuario SET senha_hash = ?, senha_temporaria = 0 WHERE id = ?",
      [hash, id],
    );
  }

  async excluir(id: string, adminId: string): Promise<void> {
    if (id === adminId)
      throw new Error("Voce nao pode excluir sua propria conta");
    const rows = await query<{ id: string }>(
      "SELECT id FROM usuario WHERE id = ? LIMIT 1",
      [id],
    );
    if (!rows[0]) throw new Error("Usuario nao encontrado");
    await execute("DELETE FROM usuario WHERE id = ?", [id]);
  }

  async toggleAtivo(id: string): Promise<void> {
    await execute("UPDATE usuario SET ativo = NOT ativo WHERE id = ?", [id]);
  }

  async garantirAdminPadrao(): Promise<void> {
    const rows = await query<{ total: number }>(
      "SELECT COUNT(*) AS total FROM usuario",
    );
    if ((rows[0]?.total ?? 0) > 0) return;
    console.log(
      "   Criando usuario admin padrao: admin@fazenda.com / admin123",
    );
    await this.criar("Administrador", "admin@fazenda.com", "admin123", "admin");
  }
}

export const authService = new AuthService();
