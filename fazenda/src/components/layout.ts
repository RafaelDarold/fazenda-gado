import { auth } from "../lib/auth.js";
import { confirmar } from "../lib/toast.js";

const NAV_ITEMS_ADMIN = [
  { section: "Principal" },
  { path: "/", icon: "◉", label: "Dashboard" },
  { section: "Rebanho" },
  { path: "/animais", icon: "🐄", label: "Animais" },
  { path: "/lotes", icon: "⬡", label: "Lotes" },
  { path: "/pesagens", icon: "⚖", label: "Pesagens" },
  { path: "/movimentacoes", icon: "↔", label: "Movimentacoes" },
  { section: "Campo" },
  { path: "/pastos", icon: "🌿", label: "Pastagens" },
  { path: "/saude", icon: "💉", label: "Saude e Vacinas" },
  { section: "Financeiro" },
  { path: "/financeiro", icon: "₿", label: "Lancamentos" },
  { path: "/relatorios", icon: "📊", label: "Relatorios" },
  { section: "Gestao" },
  { path: "/recategorizacao", icon: "↑", label: "Recategorizacao" },
  { path: "/configuracoes", icon: "⚙", label: "Configuracoes" },
];

const NAV_ITEMS_CASEIRO = [
  { section: "Principal" },
  { path: "/", icon: "◉", label: "Dashboard" },
  { section: "Campo" },
  { path: "/lotes", icon: "⬡", label: "Lotes" },
  { path: "/pastos", icon: "🌿", label: "Pastagens" },
  { section: "Conta" },
  { path: "/configuracoes", icon: "⚙", label: "Configuracoes" },
];

const ICONE_LOGOUT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;

export function renderLayout(pageTitle: string, content: string): void {
  const currentPath = window.location.hash.slice(1) || "/";
  const usuario = auth.usuario();
  const navItems =
    usuario?.perfil === "caseiro" ? NAV_ITEMS_CASEIRO : NAV_ITEMS_ADMIN;

  const navHtml = navItems
    .map((item) => {
      if ("section" in item) {
        return `<div class="nav-section">${item.section}</div>`;
      }
      const active = currentPath === item.path ? "active" : "";
      return `
      <a class="nav-link ${active}" href="#${item.path}">
        <span class="nav-link__icon">${item.icon}</span>
        ${item.label}
      </a>`;
    })
    .join("");

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const nomeUsuario = usuario?.nome ?? "";
  const perfilLabel = usuario?.perfil === "admin" ? "Administrador" : "Caseiro";
  const perfilColor =
    usuario?.perfil === "admin" ? "var(--dourado)" : "var(--verde-claro)";
  const perfilText =
    usuario?.perfil === "admin" ? "var(--verde-escuro)" : "#fff";

  document.getElementById("root")!.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar__logo">
          <div class="sidebar__logo-title">Gestao do Sitio</div>
          <div class="sidebar__logo-sub">Sistema de Gado</div>
        </div>

        <nav class="sidebar__nav">${navHtml}</nav>

        <!-- Rodape com usuario e logout -->
        <div style="padding:var(--sp-4) var(--sp-5);border-top:1px solid rgba(255,255,255,.1)">
          <div style="margin-bottom:var(--sp-3)">
            <div style="font-size:.82rem;font-weight:700;color:#fff;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nomeUsuario}</div>
            <span style="background:${perfilColor};color:${perfilText};font-size:.65rem;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:.04em">${perfilLabel}</span>
          </div>
          <button id="btn-logout-sidebar" style="
            display:flex;align-items:center;gap:8px;
            width:100%;padding:8px 12px;
            background:rgba(255,255,255,.08);
            border:1px solid rgba(255,255,255,.12);
            border-radius:6px;
            color:rgba(255,255,255,.8);
            font-size:.8rem;cursor:pointer;
            transition:all .15s;
            font-family:inherit;
          ">
            ${ICONE_LOGOUT}
            Sair do sistema
          </button>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <h1 class="topbar__title">${pageTitle}</h1>
          <span class="topbar__date">${today}</span>
        </header>
        <main class="page" id="app">${content}</main>
      </div>
    </div>
  `;

  // Hover no botão de logout
  const btnLogout = document.getElementById("btn-logout-sidebar");
  btnLogout?.addEventListener("mouseenter", () => {
    if (btnLogout) {
      btnLogout.style.background = "rgba(192,57,43,.4)";
      btnLogout.style.borderColor = "rgba(192,57,43,.6)";
    }
  });
  btnLogout?.addEventListener("mouseleave", () => {
    if (btnLogout) {
      btnLogout.style.background = "rgba(255,255,255,.08)";
      btnLogout.style.borderColor = "rgba(255,255,255,.12)";
    }
  });
  btnLogout?.addEventListener("click", async () => {
    const ok = await confirmar(
      "Voce sera redirecionado para a tela de login.",
      { titulo: "Sair do sistema", textoBotaoOk: "Sair", tipo: "aviso" },
    );
    if (ok) auth.logout();
  });
}

export function setLoading(msg = "Carregando...") {
  const app = document.getElementById("app");
  if (app)
    app.innerHTML = `<div class="loading"><div class="spinner"></div>${msg}</div>`;
}
