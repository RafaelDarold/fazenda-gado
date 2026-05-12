import { api } from "../lib/api.js";
import { renderLayout } from "../components/layout.js";
import { toast } from "../lib/toast.js";
import { formatArroba } from "../utils/arroba.js";
import { formatDate } from "../utils/date.js";

interface AnimalDetalhado {
  id: string;
  brinco: string;
  nome: string | null;
  raca: string;
  sexo: string;
  categoria: string;
  lote_id: string | null;
  lote_nome: string | null;
  pasto_nome: string | null;
  mae_brinco: string | null;
  pai_brinco: string | null;
  peso_entrada_arroba: string | null;
  peso_entrada_kg: string | null;
  ultimo_peso_arroba: string | null;
  ultima_pesagem_data: string | null;
  gmd_arroba: string | null;
  ativo: boolean;
  data_nascimento: string | null;
  observacao: string | null;
}
interface Lote {
  id: string;
  nome: string;
  categoria_principal: string;
}
interface Pesagem {
  id: string;
  data: string;
  peso_arroba: string;
  peso_kg: string;
  gmd_arroba: string | null;
  responsavel: string | null;
}

export async function animalDetalhePage(params: Record<string, string>) {
  const id = params.id;
  renderLayout(
    "Animal",
    '<div class="loading"><div class="spinner"></div>Carregando...</div>',
  );

  try {
    const [animalRes, lotesRes, pesagensRes] = await Promise.all([
      api.get<{ data: AnimalDetalhado }>(`/animais/${id}`),
      api.get<{ data: Lote[] }>("/lotes"),
      api.get<{ data: Pesagem[] }>(`/pesagens/animal/${id}?limite=10`),
    ]);

    const a = animalRes.data;
    const lotes = lotesRes.data;
    const pesagens = pesagensRes.data;
    const lotesOpts = lotes
      .map(
        (l) =>
          `<option value="${l.id}" ${l.id === a.lote_id ? "selected" : ""}>${l.nome} (${l.categoria_principal})</option>`,
      )
      .join("");

    const pesagensHtml =
      pesagens.length > 0
        ? pesagens
            .map(
              (p) => `
          <tr>
            <td>${formatDate(p.data)}</td>
            <td class="text-right"><strong>${formatArroba(parseFloat(p.peso_arroba))}</strong></td>
            <td class="text-right">${parseFloat(p.peso_kg).toFixed(2)} kg</td>
            <td class="text-right" style="color:${p.gmd_arroba && parseFloat(p.gmd_arroba) > 0 ? "var(--verde-medio)" : "var(--cor-texto-3)"}">
              ${p.gmd_arroba ? parseFloat(p.gmd_arroba).toFixed(4) + " @/dia" : "-"}
            </td>
            <td class="text-muted text-sm">${p.responsavel ?? "-"}</td>
          </tr>`,
            )
            .join("")
        : '<tr><td colspan="5"><p class="text-muted" style="padding:var(--sp-4)">Nenhuma pesagem registrada.</p></td></tr>';

    document.getElementById("app")!.innerHTML = `
      <div class="page-header">
        <div>
          <a href="#/animais" style="color:var(--cor-texto-3);font-size:.85rem">← Voltar para Animais</a>
          <h2 class="page-header__title" style="margin-top:var(--sp-2)">
            Brinco ${a.brinco}${a.nome ? ` — ${a.nome}` : ""}
          </h2>
          <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-2)">
            <span class="badge badge--verde">${a.categoria}</span>
            <span class="badge badge--cinza">${a.sexo === "M" ? "Macho" : "Femea"}</span>
            <span class="badge badge--cinza">${a.raca}</span>
            ${!a.ativo ? '<span class="badge badge--vermelho">Inativo</span>' : ""}
          </div>
        </div>
        <button class="btn btn--primario" id="btn-editar-animal">Editar Animal</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-bottom:var(--sp-5)">

        <!-- Dados principais -->
        <div class="card">
          <div class="card__title">Dados do Animal</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4)">
            ${[
              ["Brinco", a.brinco],
              ["Nome", a.nome ?? "-"],
              ["Raca", a.raca],
              ["Sexo", a.sexo === "M" ? "Macho" : "Femea"],
              ["Categoria", a.categoria],
              [
                "Nascimento",
                a.data_nascimento ? formatDate(a.data_nascimento) : "-",
              ],
              ["Mae", a.mae_brinco ?? "-"],
              ["Pai", a.pai_brinco ?? "-"],
            ]
              .map(
                ([label, value]) => `
              <div>
                <div class="text-sm text-muted">${label}</div>
                <div style="font-weight:600">${value}</div>
              </div>
            `,
              )
              .join("")}
          </div>
          ${a.observacao ? `<div style="margin-top:var(--sp-4);padding:var(--sp-3);background:var(--cor-surface-2);border-radius:var(--raio-sm)"><div class="text-sm text-muted">Observacao</div><div class="text-sm">${a.observacao}</div></div>` : ""}
        </div>

        <!-- Peso e localização -->
        <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
          <div class="kpi-grid" style="grid-template-columns:1fr 1fr;margin-bottom:0">
            <div class="kpi kpi--verde">
              <div class="kpi__label">Ultimo peso</div>
              <div class="kpi__value" style="font-size:1.4rem">${a.ultimo_peso_arroba ? formatArroba(parseFloat(a.ultimo_peso_arroba)) : "-"}</div>
              <div class="kpi__sub">${a.ultima_pesagem_data ? formatDate(a.ultima_pesagem_data) : "Sem pesagem"}</div>
            </div>
            <div class="kpi kpi--dourado">
              <div class="kpi__label">GMD</div>
              <div class="kpi__value" style="font-size:1.4rem">${a.gmd_arroba ? parseFloat(a.gmd_arroba).toFixed(4) : "-"}</div>
              <div class="kpi__sub">@/dia</div>
            </div>
          </div>

          <div class="card">
            <div class="card__title">Localizacao atual</div>
            <div style="display:flex;flex-direction:column;gap:var(--sp-3)">
              <div>
                <div class="text-sm text-muted">Lote</div>
                <div style="font-weight:600">${a.lote_nome ?? "Sem lote"}</div>
              </div>
              <div>
                <div class="text-sm text-muted">Pasto</div>
                <div style="font-weight:600">${a.pasto_nome ?? "Sem pasto"}</div>
              </div>
              <div>
                <div class="text-sm text-muted">Peso de entrada</div>
                <div style="font-weight:600">${a.peso_entrada_arroba ? formatArroba(parseFloat(a.peso_entrada_arroba)) : "-"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Historico de pesagens -->
      <div class="card">
        <div class="card__title">Historico de Pesagens</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data</th><th class="text-right">Peso (@)</th><th class="text-right">Peso (kg)</th><th class="text-right">GMD</th><th>Responsavel</th></tr></thead>
            <tbody>${pesagensHtml}</tbody>
          </table>
        </div>
      </div>

      <!-- Modal de edicao -->
      <div class="modal-overlay" id="modal-editar" style="display:none">
        <div class="modal">
          <h2 class="modal__title">Editar Animal — Brinco ${a.brinco}</h2>
          <form id="form-editar-animal">
            <div class="form-grid form-grid--2">
              <div class="form-group">
                <label class="form-label">Nome</label>
                <input class="form-input" name="nome" value="${a.nome ?? ""}" placeholder="Opcional">
              </div>
              <div class="form-group">
                <label class="form-label">Raca</label>
                <input class="form-input" name="raca" value="${a.raca}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Categoria</label>
                <select class="form-select" name="categoria" required>
                  ${["bezerro", "bezerra", "novilha", "vaca", "boi", "touro"]
                    .map(
                      (c) =>
                        `<option value="${c}" ${c === a.categoria ? "selected" : ""}>${c}</option>`,
                    )
                    .join("")}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Data de nascimento</label>
                <input class="form-input" name="data_nascimento" type="date" value="${a.data_nascimento ? a.data_nascimento.slice(0, 10) : ""}">
              </div>
            </div>

            <!-- Vincular a lote -->
            <div class="form-group">
              <label class="form-label">Lote</label>
              <select class="form-select" name="lote_id">
                <option value="">Sem lote</option>
                ${lotesOpts}
              </select>
              <p class="text-muted text-sm" style="margin-top:4px">Alterar o lote move o animal e atualiza os contadores automaticamente.</p>
            </div>

            <div class="form-group">
              <label class="form-label">Observacao</label>
              <textarea class="form-textarea" name="observacao" rows="2">${a.observacao ?? ""}</textarea>
            </div>

            <div class="modal__footer">
              <button type="button" class="btn btn--fantasma" id="btn-fechar-editar">Cancelar</button>
              <button type="submit" class="btn btn--primario">Salvar alteracoes</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const modal = document.getElementById("modal-editar") as HTMLElement;
    document
      .getElementById("btn-editar-animal")
      ?.addEventListener("click", () => (modal.style.display = "flex"));
    document
      .getElementById("btn-fechar-editar")
      ?.addEventListener("click", () => (modal.style.display = "none"));

    document
      .getElementById("form-editar-animal")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(
          new FormData(e.target as HTMLFormElement),
        );
        const payload: Record<string, unknown> = {
          nome: data.nome || undefined,
          raca: data.raca,
          categoria: data.categoria,
          data_nascimento: data.data_nascimento || undefined,
          lote_id: data.lote_id || null,
          observacao: data.observacao || undefined,
        };
        try {
          await api.patch(`/animais/${id}`, payload);
          toast.success("Animal atualizado com sucesso!");
          modal.style.display = "none";
          animalDetalhePage(params);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro ao salvar");
        }
      });
  } catch (err) {
    document.getElementById("app")!.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">!</div>
        <h3>Erro ao carregar animal</h3>
        <p class="text-muted mt-4">${err instanceof Error ? err.message : "Erro desconhecido"}</p>
      </div>
    `;
  }
}
