export type PerfilUsuario = "admin" | "caseiro";

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  senha_temporaria?: boolean;
}

const TOKEN_KEY = "fazenda_token";
const USUARIO_KEY = "fazenda_usuario";

export const auth = {
  salvar(token: string, usuario: UsuarioLogado) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  },

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  usuario(): UsuarioLogado | null {
    const raw = localStorage.getItem(USUARIO_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  logado(): boolean {
    return !!this.token() && !!this.usuario();
  },

  isAdmin(): boolean {
    return this.usuario()?.perfil === "admin";
  },

  isCaseiro(): boolean {
    return this.usuario()?.perfil === "caseiro";
  },

  precisaTrocarSenha(): boolean {
    return !!this.usuario()?.senha_temporaria;
  },

  marcarSenhaTrocada() {
    const u = this.usuario();
    if (u) {
      u.senha_temporaria = false;
      localStorage.setItem(USUARIO_KEY, JSON.stringify(u));
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    window.location.hash = "/login";
  },
};

export const ROTAS_BLOQUEADAS_CASEIRO = new Set([
  "/animais",
  "/pesagens",
  "/movimentacoes",
  "/financeiro",
  "/saude",
  "/relatorios",
  "/recategorizacao",
]);

export function podeAcessar(rota: string): boolean {
  if (!auth.logado()) return rota === "/login";
  if (auth.isAdmin()) return true;
  const base = "/" + rota.split("/")[1];
  return !ROTAS_BLOQUEADAS_CASEIRO.has(base);
}
