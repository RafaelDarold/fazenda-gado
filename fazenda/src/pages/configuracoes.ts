import { api } from "../lib/api.js";
import { renderLayout } from "../components/layout.js";
import { auth } from "../lib/auth.js";
import { toast, ativarToggleSenha, confirmar } from "../lib/toast.js";
import { formatDate } from "../utils/date.js";

interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  perfil: "admin" | "caseiro";
  ativo: boolean;
  created_at: string;
}

type Aba = "minha-conta" | "usuarios";

export async function configuracoesPage(abaInicial: Aba = "minha-conta") {
  renderLayout(
    "Configuracoes",
    '<div class="loading"><div class="spinner"></div>Carregando...</div>',
  );

  const isAdmin = auth.isAdmin();
  const eu = auth.usuario()!;

  document.getElementById("app")!.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-header__title">Configuracoes</h2>
        <p class="page-header__sub">Gerencie sua conta e usuarios do sistema</p>
      </div>
    </div>
    <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-6)">
      <button class="btn ${abaInicial === "minha-conta" ? "btn--primario" : "btn--fantasma"} aba-config" data-aba="minha-conta">Minha Conta</button>
      ${isAdmin ? `<button class="btn ${abaInicial === "usuarios" ? "btn--primario" : "btn--fantasma"} aba-config" data-aba="usuarios">Gerenciar Usuarios</button>` : ""}
    </div>
    <div id="config-conteudo"></div>
  `;

  document.querySelectorAll(".aba-config").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".aba-config")
        .forEach((b) => b.classList.replace("btn--primario", "btn--fantasma"));
      btn.classList.replace("btn--fantasma", "btn--primario");
      carregarAba((btn as HTMLElement).dataset.aba as Aba, eu, isAdmin);
    });
  });

  carregarAba(abaInicial, eu, isAdmin);
}

async function carregarAba(
  aba: Aba,
  eu: NonNullable<ReturnType<typeof auth.usuario>>,
  isAdmin: boolean,
) {
  const el = document.getElementById("config-conteudo")!;
  if (aba === "minha-conta") renderMinhaConta(el, eu);
  if (aba === "usuarios" && isAdmin) await renderUsuarios(el, eu);
}

function renderMinhaConta(
  el: HTMLElement,
  eu: NonNullable<ReturnType<typeof auth.usuario>>,
) {
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5)">
      <div class="card">
        <div class="card__title">Dados Pessoais</div>
        <form id="form-minha-conta">
          <div class="form-group">
            <label class="form-label">Nome *</label>
            <input class="form-input" name="nome" required value="${eu.nome}">
          </div>
          <div class="form-group">
            <label class="form-label">Email *</label>
            <input class="form-input" name="email" type="email" required value="${eu.email}">
          </div>
          <div class="form-group">
            <label class="form-label">Perfil</label>
            <input class="form-input" value="${eu.perfil === "admin" ? "Administrador" : "Caseiro"}" disabled style="background:var(--cor-surface-2);color:var(--cor-texto-3)">
            <p class="text-sm text-muted" style="margin-top:4px">O tipo de usuario nao pode ser alterado.</p>
          </div>
          <button type="submit" class="btn btn--primario">Salvar alteracoes</button>
        </form>
      </div>
      <div class="card">
        <div class="card__title">Alterar Senha</div>
        <form id="form-alterar-senha">
          <div class="form-group">
            <label class="form-label">Senha atual *</label>
            <div class="senha-wrapper"><input class="form-input" name="senha_atual" type="password" required placeholder="Sua senha atual"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Nova senha *</label>
            <div class="senha-wrapper"><input class="form-input" name="nova_senha" type="password" required placeholder="Minimo 6 caracteres" minlength="6"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar nova senha *</label>
            <div class="senha-wrapper"><input class="form-input" name="confirmar" type="password" required></div>
          </div>
          <button type="submit" class="btn btn--primario">Alterar senha</button>
        </form>
      </div>
    </div>
  `;

  ativarToggleSenha();

  document
    .getElementById("form-minha-conta")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(
        new FormData(e.target as HTMLFormElement),
      );
      try {
        const res = await api.patch<{ data: UsuarioRow }>(
          `/auth/usuarios/${eu.id}/dados`,
          { nome: data.nome, email: data.email },
        );
        const u = auth.usuario()!;
        u.nome = res.data.nome;
        u.email = res.data.email;
        localStorage.setItem("fazenda_usuario", JSON.stringify(u));
        toast.success("Dados atualizados!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });

  document
    .getElementById("form-alterar-senha")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(
        new FormData(e.target as HTMLFormElement),
      );
      if (data.nova_senha !== data.confirmar) {
        toast.error("As senhas nao coincidem");
        return;
      }
      try {
        await api.patch("/auth/alterar-senha", {
          senha_atual: data.senha_atual,
          nova_senha: data.nova_senha,
        });
        toast.success("Senha alterada com sucesso!");
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
}

async function renderUsuarios(
  el: HTMLElement,
  eu: NonNullable<ReturnType<typeof auth.usuario>>,
) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await api.get<{ data: UsuarioRow[] }>("/auth/usuarios");
    const usuarios = res.data;

    const linhas = usuarios
      .map(
        (u) => `
      <tr>
        <td><div style="font-weight:700">${u.nome}</div><div class="text-sm text-muted">${u.email}</div></td>
        <td><span class="badge ${u.perfil === "admin" ? "badge--amarelo" : "badge--verde"}">${u.perfil === "admin" ? "Admin" : "Caseiro"}</span></td>
        <td><span class="badge ${u.ativo ? "badge--verde" : "badge--cinza"}">${u.ativo ? "Ativo" : "Inativo"}</span></td>
        <td>${formatDate(u.created_at)}</td>
        <td>
          <div style="display:flex;gap:var(--sp-2)">
            ${
              u.id !== eu.id
                ? `
              <button class="btn btn--fantasma btn-toggle" data-id="${u.id}" data-ativo="${u.ativo}" style="font-size:.75rem;padding:2px 10px">${u.ativo ? "Desativar" : "Ativar"}</button>
              <button class="btn btn--fantasma btn-redef" data-id="${u.id}" data-nome="${u.nome}" style="font-size:.75rem;padding:2px 10px">Redefinir senha</button>
              <button class="btn btn--perigo btn-del" data-id="${u.id}" data-nome="${u.nome}" style="font-size:.75rem;padding:2px 10px">Excluir</button>
            `
                : '<span class="text-muted text-sm">Voce</span>'
            }
          </div>
        </td>
      </tr>
    `,
      )
      .join("");

    el.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-5)">
          <div class="card__title" style="margin-bottom:0">Usuarios do Sistema</div>
          <button class="btn btn--primario" id="btn-novo-user">+ Novo Usuario</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nome / Email</th><th>Perfil</th><th>Status</th><th>Cadastrado</th><th>Acoes</th></tr></thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
      </div>

      <div class="modal-overlay" id="modal-novo-user" style="display:none">
        <div class="modal">
          <h2 class="modal__title">Novo Usuario</h2>
          <form id="form-novo-user">
            <div class="form-group"><label class="form-label">Nome *</label><input class="form-input" name="nome" required placeholder="Nome completo"></div>
            <div class="form-group"><label class="form-label">Email *</label><input class="form-input" name="email" type="email" required></div>
            <div class="form-group">
              <label class="form-label">Senha inicial *</label>
              <div class="senha-wrapper"><input class="form-input" name="senha" type="password" required minlength="6"></div>
              <p class="text-sm text-muted" style="margin-top:4px">O usuario devera trocar no primeiro acesso.</p>
            </div>
            <div class="form-group">
              <label class="form-label">Perfil *</label>
              <select class="form-select" name="perfil">
                <option value="caseiro">Caseiro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div class="modal__footer">
              <button type="button" class="btn btn--fantasma" id="btn-fechar-novo-user">Cancelar</button>
              <button type="submit" class="btn btn--primario">Criar</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-overlay" id="modal-redef" style="display:none">
        <div class="modal">
          <h2 class="modal__title">Redefinir Senha</h2>
          <p id="redef-nome" class="text-muted" style="margin-bottom:var(--sp-4)"></p>
          <form id="form-redef">
            <input type="hidden" id="redef-id">
            <div class="form-group"><label class="form-label">Nova senha *</label><div class="senha-wrapper"><input class="form-input" name="nova_senha" type="password" required minlength="6"></div></div>
            <div class="form-group"><label class="form-label">Confirmar *</label><div class="senha-wrapper"><input class="form-input" name="confirmar" type="password" required></div></div>
            <div class="modal__footer">
              <button type="button" class="btn btn--fantasma" id="btn-fechar-redef">Cancelar</button>
              <button type="submit" class="btn btn--primario">Redefinir</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const modalNovo = document.getElementById("modal-novo-user") as HTMLElement;
    const modalRedef = document.getElementById("modal-redef") as HTMLElement;

    document
      .getElementById("btn-novo-user")
      ?.addEventListener("click", () => (modalNovo.style.display = "flex"));
    document
      .getElementById("btn-fechar-novo-user")
      ?.addEventListener("click", () => (modalNovo.style.display = "none"));
    document
      .getElementById("btn-fechar-redef")
      ?.addEventListener("click", () => (modalRedef.style.display = "none"));

    document
      .getElementById("form-novo-user")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
          new FormData(e.target as HTMLFormElement),
        );
        try {
          await api.post("/auth/usuarios", data);
          toast.success("Usuario criado!");
          modalNovo.style.display = "none";
          await renderUsuarios(el, eu);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      });

    document.querySelectorAll(".btn-toggle").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.id!;
        const ativo = (btn as HTMLElement).dataset.ativo === "true";
        const ok = await confirmar(
          `Deseja ${ativo ? "desativar" : "ativar"} este usuario?`,
          {
            titulo: ativo ? "Desativar usuario" : "Ativar usuario",
            textoBotaoOk: ativo ? "Desativar" : "Ativar",
            tipo: ativo ? "aviso" : "info",
          },
        );
        if (!ok) return;
        try {
          await api.patch(`/auth/usuarios/${id}/toggle`, {});
          await renderUsuarios(el, eu);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      });
    });

    document.querySelectorAll(".btn-redef").forEach((btn) => {
      btn.addEventListener("click", () => {
        (document.getElementById("redef-id") as HTMLInputElement).value = (
          btn as HTMLElement
        ).dataset.id!;
        document.getElementById("redef-nome")!.textContent =
          `Usuario: ${(btn as HTMLElement).dataset.nome}`;
        modalRedef.style.display = "flex";
      });
    });

    document
      .getElementById("form-redef")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
          new FormData(e.target as HTMLFormElement),
        );
        const id = (document.getElementById("redef-id") as HTMLInputElement)
          .value;
        if (data.nova_senha !== data.confirmar) {
          toast.error("Senhas nao coincidem");
          return;
        }
        try {
          await api.patch(`/auth/usuarios/${id}/redefinir-senha`, {
            nova_senha: data.nova_senha,
          });
          toast.success("Senha redefinida!");
          modalRedef.style.display = "none";
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      });

    document.querySelectorAll(".btn-del").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.id!;
        const nome = (btn as HTMLElement).dataset.nome!;
        const okDel = await confirmar(
          `O usuario <strong>${nome}</strong> sera excluido permanentemente.`,
          {
            titulo: "Excluir usuario",
            textoBotaoOk: "Excluir",
            tipo: "perigo",
          },
        );
        if (!okDel) return;
        try {
          await api.delete(`/auth/usuarios/${id}`);
          toast.success(`Usuario excluido.`);
          await renderUsuarios(el, eu);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      });
    });
  } catch {
    el.innerHTML = `<div class="empty-state"><h3>Erro ao carregar usuarios</h3></div>`;
  }
}
