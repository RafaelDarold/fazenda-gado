import { api } from "../lib/api.js";
import { renderLayout } from "../components/layout.js";
import { auth } from "../lib/auth.js";
import { toast, confirmar } from "../lib/toast.js";

interface FazendaRow {
  id: string;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  created_at: string;
  total_usuarios?: number;
  total_animais?: number;
}

export async function painelPage() {
  renderLayout(
    "Painel Global",
    '<div class="loading"><div class="spinner"></div>Carregando...</div>',
  );

  const isOwner = auth.isOwner();

  try {
    const res = await api.get<{ data: FazendaRow[] }>("/fazendas");
    const fazendas = res.data;

    const cards =
      fazendas
        .map(
          (f) => `
      <div class="card" style="position:relative">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--sp-4)">
          <div>
            <div style="font-family:var(--fonte-display);font-size:1.1rem;font-weight:700;color:var(--verde-escuro)">${f.nome}</div>
            ${f.razao_social ? `<div class="text-sm text-muted">${f.razao_social}</div>` : ""}
            ${f.cnpj ? `<div class="text-sm text-muted">CNPJ: ${f.cnpj}</div>` : ""}
          </div>
          <span class="badge ${f.ativo ? "badge--verde" : "badge--cinza"}">${f.ativo ? "Ativa" : "Inativa"}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-4)">
          <div style="background:var(--cor-surface-2);border-radius:var(--raio-sm);padding:var(--sp-3)">
            <div class="text-sm text-muted">Usuarios</div>
            <div style="font-weight:700;font-size:1.1rem;color:var(--verde-escuro)">${f.total_usuarios ?? 0}</div>
          </div>
          <div style="background:var(--cor-surface-2);border-radius:var(--raio-sm);padding:var(--sp-3)">
            <div class="text-sm text-muted">Animais</div>
            <div style="font-weight:700;font-size:1.1rem;color:var(--verde-escuro)">${f.total_animais ?? 0}</div>
          </div>
        </div>
        ${f.email ? `<div class="text-sm text-muted" style="margin-bottom:var(--sp-2)">${f.email}</div>` : ""}
        ${f.telefone ? `<div class="text-sm text-muted" style="margin-bottom:var(--sp-4)">${f.telefone}</div>` : ""}
        <div style="display:flex;gap:var(--sp-2)">
          <button class="btn btn--primario btn-entrar-fazenda" data-id="${f.id}" data-nome="${f.nome}"
            style="flex:1;font-size:.8rem;justify-content:center">
            Entrar na fazenda
          </button>
          <button class="btn btn--fantasma btn-editar-fazenda" data-id="${f.id}"
            style="font-size:.8rem;padding:var(--sp-2) var(--sp-3)">
            Editar
          </button>
          ${
            isOwner
              ? `
          <button class="btn btn--perigo btn-toggle-fazenda" data-id="${f.id}" data-ativo="${f.ativo}"
            style="font-size:.8rem;padding:var(--sp-2) var(--sp-3)">
            ${f.ativo ? "Desativar" : "Ativar"}
          </button>`
              : ""
          }
        </div>
      </div>
    `,
        )
        .join("") ||
      `<div class="empty-state"><h3>Nenhuma fazenda cadastrada</h3></div>`;

    document.getElementById("app")!.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-header__title">Painel Global</h2>
          <p class="page-header__sub">${fazendas.length} fazenda(s) cadastrada(s)</p>
        </div>
        <button class="btn btn--primario" id="btn-nova-fazenda">+ Nova Fazenda</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp-5)">
        ${cards}
      </div>

      <!-- Modal nova fazenda -->
      <div class="modal-overlay" id="modal-fazenda" style="display:none">
        <div class="modal" style="max-width:600px">
          <h2 class="modal__title" id="modal-fazenda-titulo">Nova Fazenda</h2>
          <form id="form-fazenda">
            <input type="hidden" id="fazenda-edit-id">
            <div class="form-grid form-grid--2">
              <div class="form-group">
                <label class="form-label">Nome *</label>
                <input class="form-input" name="nome" required placeholder="Nome da fazenda">
              </div>
              <div class="form-group">
                <label class="form-label">Razao Social</label>
                <input class="form-input" name="razao_social" placeholder="Razao social">
              </div>
              <div class="form-group">
                <label class="form-label">CNPJ</label>
                <input class="form-input" name="cnpj" placeholder="00.000.000/0000-00">
              </div>
              <div class="form-group">
                <label class="form-label">Telefone</label>
                <input class="form-input" name="telefone" placeholder="(xx) xxxxx-xxxx">
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input class="form-input" name="email" type="email" placeholder="contato@fazenda.com">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Endereco</label>
              <input class="form-input" name="endereco" placeholder="Endereco completo">
            </div>
            <div class="modal__footer">
              <button type="button" class="btn btn--fantasma" id="btn-fechar-fazenda">Cancelar</button>
              <button type="submit" class="btn btn--primario" id="btn-salvar-fazenda">Criar Fazenda</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const modal = document.getElementById("modal-fazenda") as HTMLElement;
    document
      .getElementById("btn-nova-fazenda")
      ?.addEventListener("click", () => {
        document.getElementById("modal-fazenda-titulo")!.textContent =
          "Nova Fazenda";
        document.getElementById("btn-salvar-fazenda")!.textContent =
          "Criar Fazenda";
        (document.getElementById("fazenda-edit-id") as HTMLInputElement).value =
          "";
        (document.getElementById("form-fazenda") as HTMLFormElement).reset();
        modal.style.display = "flex";
      });
    document
      .getElementById("btn-fechar-fazenda")
      ?.addEventListener("click", () => (modal.style.display = "none"));

    // Editar fazenda
    document.querySelectorAll(".btn-editar-fazenda").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.id!;
        const fazenda = fazendas.find((f) => f.id === id)!;
        document.getElementById("modal-fazenda-titulo")!.textContent =
          `Editar — ${fazenda.nome}`;
        document.getElementById("btn-salvar-fazenda")!.textContent =
          "Salvar alteracoes";
        (document.getElementById("fazenda-edit-id") as HTMLInputElement).value =
          id;
        const form = document.getElementById("form-fazenda") as HTMLFormElement;
        (form.querySelector('[name="nome"]') as HTMLInputElement).value =
          fazenda.nome ?? "";
        (
          form.querySelector('[name="razao_social"]') as HTMLInputElement
        ).value = fazenda.razao_social ?? "";
        (form.querySelector('[name="cnpj"]') as HTMLInputElement).value =
          fazenda.cnpj ?? "";
        (form.querySelector('[name="telefone"]') as HTMLInputElement).value =
          fazenda.telefone ?? "";
        (form.querySelector('[name="email"]') as HTMLInputElement).value =
          fazenda.email ?? "";
        (form.querySelector('[name="endereco"]') as HTMLInputElement).value =
          "";
        modal.style.display = "flex";
      });
    });

    document
      .getElementById("form-fazenda")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
          new FormData(e.target as HTMLFormElement),
        );
        const editId = (
          document.getElementById("fazenda-edit-id") as HTMLInputElement
        ).value;
        const payload = {
          nome: data.nome,
          razao_social: data.razao_social || undefined,
          cnpj: data.cnpj || undefined,
          telefone: data.telefone || undefined,
          email: data.email || undefined,
          endereco: data.endereco || undefined,
        };
        try {
          if (editId) {
            await api.patch(`/fazendas/${editId}`, payload);
            toast.success("Fazenda atualizada!");
          } else {
            await api.post("/fazendas", payload);
            toast.success("Fazenda criada!");
          }
          modal.style.display = "none";
          painelPage();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      });

    // Toggle ativo
    document.querySelectorAll(".btn-toggle-fazenda").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.id!;
        const ativo = (btn as HTMLElement).dataset.ativo === "true";
        const ok = await confirmar(
          `Deseja ${ativo ? "desativar" : "ativar"} esta fazenda?`,
          {
            titulo: ativo ? "Desativar fazenda" : "Ativar fazenda",
            tipo: "aviso",
            textoBotaoOk: ativo ? "Desativar" : "Ativar",
          },
        );
        if (!ok) return;
        try {
          await api.patch(`/fazendas/${id}`, { ativo: !ativo });
          toast.success(`Fazenda ${ativo ? "desativada" : "ativada"}!`);
          painelPage();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      });
    });

    // Entrar na fazenda (impersonar)
    document.querySelectorAll(".btn-entrar-fazenda").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.id!;
        const nome = (btn as HTMLElement).dataset.nome!;
        // Salva fazenda selecionada e navega para dashboard
        localStorage.setItem("fazenda_selecionada_id", id);
        localStorage.setItem("fazenda_selecionada_nome", nome);
        // Atualiza o usuario em memoria com a fazenda selecionada
        const u = auth.usuario()!;
        (u as any).fazenda_id = id;
        localStorage.setItem("fazenda_usuario", JSON.stringify(u));
        toast.success(`Entrando na fazenda: ${nome}`);
        window.location.hash = "/";
      });
    });
  } catch (err) {
    document.getElementById("app")!.innerHTML =
      `<div class="empty-state"><h3>Erro ao carregar painel</h3></div>`;
  }
}
