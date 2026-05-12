export type PerfilUsuario = "owner" | "super_admin" | "admin" | "caseiro";

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  fazenda_id: string | null;
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

  isOwner(): boolean {
    return this.usuario()?.perfil === "owner";
  },

  isSuperAdmin(): boolean {
    return this.usuario()?.perfil === "super_admin";
  },

  isAdmin(): boolean {
    const p = this.usuario()?.perfil;
    return p === "admin" || p === "owner" || p === "super_admin";
  },

  isCaseiro(): boolean {
    return this.usuario()?.perfil === "caseiro";
  },

  fazendaId(): string | null {
    return this.usuario()?.fazenda_id ?? null;
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
    localStorage.removeItem("fazenda_selecionada_id");
    localStorage.removeItem("fazenda_selecionada_nome");
    window.location.hash = "/login";
  },
};

export const ROTAS_PAINEL_GLOBAL = new Set(["/painel"]);
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
  const perfil = auth.usuario()?.perfil;
  if (perfil === "owner" || perfil === "super_admin") return true;
  if (perfil === "admin") {
    const base = "/" + rota.split("/")[1];
    return !ROTAS_PAINEL_GLOBAL.has(base);
  }
  const base = "/" + rota.split("/")[1];
  return !ROTAS_BLOQUEADAS_CASEIRO.has(base) && !ROTAS_PAINEL_GLOBAL.has(base);
}
