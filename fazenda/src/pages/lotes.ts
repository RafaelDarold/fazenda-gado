import { api } from "../lib/api.js";
import { renderLayout } from "../components/layout.js";
import { toast } from "../lib/toast.js";
import { formatArroba } from "../utils/arroba.js";

interface LoteRow {
  id: string;
  nome: string;
  categoria_principal: string;
  quantidade_atual: number;
  peso_medio_arroba: string | null;
  peso_total_arroba: string | null;
  pasto_nome: string | null;
  pasto_atual_id: string | null;
  ativo: boolean;
  data_ultima_pesagem: string | null;
}
interface Pasto {
  id: string;
  nome: string;
  area_hectares: string;
}
interface Animal {
  id: string;
  brinco: string;
  nome: string | null;
  categoria: string;
  ultimo_peso_arroba: string | null;
}

export async function lotesPage() {
  renderLayout(
    "Lotes",
    '<div class="loading"><div class="spinner"></div>Carregando...</div>',
  );

  try {
    const [lotesRes, pastosRes] = await Promise.all([
      api.get<{ data: LoteRow[] }>("/lotes"),
      api.get<{ data: Pasto[] }>("/pastos"),
    ]);

    const lotes = lotesRes.data;
    const pastos = pastosRes.data;
    const pastosOpts = pastos
      .map(
        (p) =>
          `<option value="${p.id}">${p.nome} (${parseFloat(p.area_hectares).toFixed(1)} ha)</option>`,
      )
      .join("");

    const cards =
      lotes
        .map((l) => {
          const pesoTotal = l.peso_total_arroba
            ? parseFloat(l.peso_total_arroba)
            : null;
          return `
        <div class="card" style="position:relative">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--sp-4)">
            <div>
              <div class="card__title" style="margin-bottom:var(--sp-1)">${l.nome}</div>
              <span class="badge badge--verde">${l.categoria_principal}</span>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--fonte-display);font-size:2rem;font-weight:700;color:var(--verde-escuro);line-height:1">${l.quantidade_atual}</div>
              <div class="text-muted text-sm">animais</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-4)">
            <div style="background:var(--cor-surface-2);border-radius:var(--raio-sm);padding:var(--sp-3)">
              <div class="text-sm text-muted">Peso medio</div>
              <div style="font-weight:700;color:var(--verde-escuro)">${l.peso_medio_arroba ? formatArroba(parseFloat(l.peso_medio_arroba)) : "-"}</div>
            </div>
            <div style="background:var(--cor-surface-2);border-radius:var(--raio-sm);padding:var(--sp-3)">
              <div class="text-sm text-muted">Peso total</div>
              <div style="font-weight:700;color:var(--verde-escuro)">${pesoTotal ? formatArroba(pesoTotal) : "-"}</div>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-4)">
            <div class="text-sm" style="color:var(--cor-texto-2)">
              Pasto: <strong>${l.pasto_nome ?? "Nenhum"}</strong>
            </div>
            <button class="btn btn--fantasma btn-mover-pasto" data-id="${l.id}" data-nome="${l.nome}"
              style="font-size:.75rem;padding:4px 10px">
              Mover pasto
            </button>
          </div>

          <div style="display:flex;gap:var(--sp-2)">
            <button class="btn btn--fantasma btn-ver-animais" data-id="${l.id}" data-nome="${l.nome}"
              style="font-size:.8rem;flex:1;justify-content:center">
              Ver animais
            </button>
            <button class="btn btn--fantasma btn-editar-lote" data-id="${l.id}" data-nome="${l.nome}"
              data-categoria="${l.categoria_principal}"
              style="font-size:.8rem;flex:1;justify-content:center">
              Editar
            </button>
          </div>
        </div>
      `;
        })
        .join("") ||
      `<div class="empty-state"><div class="empty-state__icon">!</div><h3>Nenhum lote cadastrado</h3></div>`;

    document.getElementById("app")!.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-header__title">Lotes</h2>
          <p class="page-header__sub">${lotes.length} lote(s) ativo(s)</p>
        </div>
        <button class="btn btn--primario" id="btn-novo-lote">+ Novo Lote</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--sp-5)" id="lotes-grid">
        ${cards}
      </div>

      <!-- Modal novo lote -->
      <div class="modal-overlay" id="modal-lote" style="display:none">
        <div class="modal">
          <h2 class="modal__title">Novo Lote</h2>
          <form id="form-lote">
            <div class="form-group">
              <label class="form-label">Nome do lote *</label>
              <input class="form-input" name="nome" required placeholder="Ex: Lote A — Bois gordo">
            </div>
            <div class="form-grid form-grid--2">
              <div class="form-group">
                <label class="form-label">Categoria principal *</label>
                <select class="form-select" name="categoria_principal" required>
                  <option value="">Selecione</option>
                  <option value="bezerros">Bezerros</option>
                  <option value="bezerra">Bezerra</option>
                  <option value="novilhas">Novilhas</option>
                  <option value="vacas">Vacas</option>
                  <option value="bois">Bois</option>
                  <option value="touros">Touros</option>
                  <option value="misto">Misto</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Pasto inicial</label>
                <select class="form-select" name="pasto_atual_id">
                  <option value="">Sem pasto</option>
                  ${pastosOpts}
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Observacao</label>
              <textarea class="form-textarea" name="observacao" rows="2"></textarea>
            </div>
            <div class="modal__footer">
              <button type="button" class="btn btn--fantasma" id="btn-fechar-lote">Cancelar</button>
              <button type="submit" class="btn btn--primario">Criar Lote</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal mover pasto -->
      <div class="modal-overlay" id="modal-mover-pasto" style="display:none">
        <div class="modal">
          <h2 class="modal__title" id="modal-mover-titulo">Mover Lote para Pasto</h2>
          <form id="form-mover-pasto">
            <input type="hidden" name="lote_id" id="mover-lote-id">
            <div class="form-group">
              <label class="form-label">Pasto de destino *</label>
              <select class="form-select" name="pasto_id" required>
                <option value="">Selecione o pasto</option>
                ${pastosOpts}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Data de entrada *</label>
              <input class="form-input" name="data" type="date" required value="${new Date().toISOString().slice(0, 10)}">
            </div>
            <div class="form-group">
              <label class="form-label">Observacao</label>
              <textarea class="form-textarea" name="observacao" rows="2"></textarea>
            </div>
            <div class="modal__footer">
              <button type="button" class="btn btn--fantasma" id="btn-fechar-mover">Cancelar</button>
              <button type="submit" class="btn btn--primario">Mover Lote</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal ver animais do lote -->
      <div class="modal-overlay" id="modal-animais-lote" style="display:none">
        <div class="modal" style="max-width:700px">
          <h2 class="modal__title" id="modal-animais-titulo">Animais do Lote</h2>
          <div id="animais-lote-conteudo"><div class="loading"><div class="spinner"></div></div></div>
          <div class="modal__footer">
            <button type="button" class="btn btn--fantasma" id="btn-fechar-animais">Fechar</button>
          </div>
        </div>
      </div>

      <!-- Modal editar lote -->
      <div class="modal-overlay" id="modal-editar-lote" style="display:none">
        <div class="modal">
          <h2 class="modal__title">Editar Lote</h2>
          <form id="form-editar-lote">
            <input type="hidden" name="lote_id" id="editar-lote-id">
            <div class="form-group">
              <label class="form-label">Nome *</label>
              <input class="form-input" name="nome" id="editar-lote-nome" required>
            </div>
            <div class="form-group">
              <label class="form-label">Categoria principal *</label>
              <select class="form-select" name="categoria_principal" id="editar-lote-categoria">
                <option value="bezerros">Bezerros</option>
                <option value="bezerra">Bezerra</option>
                <option value="novilhas">Novilhas</option>
                <option value="vacas">Vacas</option>
                <option value="bois">Bois</option>
                <option value="touros">Touros</option>
                <option value="misto">Misto</option>
              </select>
            </div>
            <div class="modal__footer">
              <button type="button" class="btn btn--fantasma" id="btn-fechar-editar-lote">Cancelar</button>
              <button type="submit" class="btn btn--primario">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Modal novo lote
    const modalLote = document.getElementById("modal-lote") as HTMLElement;
    document
      .getElementById("btn-novo-lote")
      ?.addEventListener("click", () => (modalLote.style.display = "flex"));
    document
      .getElementById("btn-fechar-lote")
      ?.addEventListener("click", () => (modalLote.style.display = "none"));

    document
      .getElementById("form-lote")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
          new FormData(e.target as HTMLFormElement),
        );
        try {
          await api.post("/lotes", {
            nome: data.nome,
            categoria_principal: data.categoria_principal,
            pasto_atual_id: data.pasto_atual_id || undefined,
            observacao: data.observacao || undefined,
          });
          toast.success("Lote criado com sucesso!");
          modalLote.style.display = "none";
          lotesPage();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      });

    // Modal mover pasto
    const modalMover = document.getElementById(
      "modal-mover-pasto",
    ) as HTMLElement;
    document
      .getElementById("btn-fechar-mover")
      ?.addEventListener("click", () => (modalMover.style.display = "none"));

    document.querySelectorAll(".btn-mover-pasto").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.id!;
        const nome = (btn as HTMLElement).dataset.nome!;
        (document.getElementById("mover-lote-id") as HTMLInputElement).value =
          id;
        document.getElementById("modal-mover-titulo")!.textContent =
          `Mover Lote "${nome}" para Pasto`;
        modalMover.style.display = "flex";
      });
    });

    document
      .getElementById("form-mover-pasto")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
          new FormData(e.target as HTMLFormElement),
        );
        try {
          await api.post("/pastos/mover-lote", {
            lote_id: data.lote_id,
            pasto_id: data.pasto_id,
            data: data.data,
            observacao: data.observacao || undefined,
          });
          toast.success("Lote movido com sucesso!");
          modalMover.style.display = "none";
          lotesPage();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      });

    // Modal ver animais
    const modalAnimais = document.getElementById(
      "modal-animais-lote",
    ) as HTMLElement;
    document
      .getElementById("btn-fechar-animais")
      ?.addEventListener("click", () => (modalAnimais.style.display = "none"));

    document.querySelectorAll(".btn-ver-animais").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.id!;
        const nome = (btn as HTMLElement).dataset.nome!;
        document.getElementById("modal-animais-titulo")!.textContent =
          `Animais do Lote — ${nome}`;
        document.getElementById("animais-lote-conteudo")!.innerHTML =
          '<div class="loading"><div class="spinner"></div></div>';
        modalAnimais.style.display = "flex";

        try {
          const res = await api.get<{ data: Animal[] }>(`/lotes/${id}/animais`);
          const animais = res.data;
          if (animais.length === 0) {
            document.getElementById("animais-lote-conteudo")!.innerHTML =
              '<p class="text-muted" style="padding:var(--sp-4)">Nenhum animal neste lote.</p>';
            return;
          }
          document.getElementById("animais-lote-conteudo")!.innerHTML = `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Brinco</th><th>Nome</th><th>Categoria</th><th class="text-right">Ultimo Peso</th><th></th></tr></thead>
                <tbody>
                  ${animais
                    .map(
                      (a) => `
                    <tr>
                      <td><strong>${a.brinco}</strong></td>
                      <td>${a.nome ?? "-"}</td>
                      <td><span class="badge badge--verde">${a.categoria}</span></td>
                      <td class="text-right">${a.ultimo_peso_arroba ? formatArroba(parseFloat(a.ultimo_peso_arroba)) : "-"}</td>
                      <td><a href="#/animais/${a.id}" class="btn btn--fantasma" style="font-size:.75rem;padding:2px 10px" onclick="document.getElementById('modal-animais-lote').style.display='none'">Ver</a></td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `;
        } catch {
          document.getElementById("animais-lote-conteudo")!.innerHTML =
            '<p class="text-muted">Erro ao carregar animais.</p>';
        }
      });
    });

    // Modal editar lote
    const modalEditarLote = document.getElementById(
      "modal-editar-lote",
    ) as HTMLElement;
    document
      .getElementById("btn-fechar-editar-lote")
      ?.addEventListener(
        "click",
        () => (modalEditarLote.style.display = "none"),
      );

    document.querySelectorAll(".btn-editar-lote").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.id!;
        const nome = (btn as HTMLElement).dataset.nome!;
        const categoria = (btn as HTMLElement).dataset.categoria!;
        (document.getElementById("editar-lote-id") as HTMLInputElement).value =
          id;
        (
          document.getElementById("editar-lote-nome") as HTMLInputElement
        ).value = nome;
        (
          document.getElementById("editar-lote-categoria") as HTMLSelectElement
        ).value = categoria;
        modalEditarLote.style.display = "flex";
      });
    });

    document
      .getElementById("form-editar-lote")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
          new FormData(e.target as HTMLFormElement),
        );
        try {
          await api.patch(`/lotes/${data.lote_id}`, {
            nome: data.nome,
            categoria_principal: data.categoria_principal,
          });
          toast.success("Lote atualizado!");
          modalEditarLote.style.display = "none";
          lotesPage();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      });
  } catch (err) {
    document.getElementById("app")!.innerHTML =
      `<div class="empty-state"><h3>Erro ao carregar lotes</h3></div>`;
  }
}
