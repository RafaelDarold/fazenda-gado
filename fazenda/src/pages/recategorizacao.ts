import { api } from "../lib/api.js";
import { renderLayout } from "../components/layout.js";
import { toast } from "../lib/toast.js";
import { formatDate } from "../utils/date.js";

interface AnimalPendente {
  id: string;
  brinco: string;
  nome: string | null;
  categoria_atual: string;
  categoria_sugerida: string;
  data_nascimento: string;
  idade_meses: number;
  lote_nome: string | null;
}

interface Parametro {
  id: string;
  categoria_de: string;
  categoria_para: string;
  meses_minimos: number;
  ativo: boolean;
  observacao: string | null;
}

type Aba = "pendentes" | "parametros";

function abaBtn(id: Aba, label: string, ativa: Aba) {
  return `<button class="btn ${id === ativa ? "btn--primario" : "btn--fantasma"} aba-recat" data-aba="${id}">${label}</button>`;
}

export async function recategorizacaoPage(abaInicial: Aba = "pendentes") {
  renderLayout(
    "Recategorizacao",
    '<div class="loading"><div class="spinner"></div>Carregando...</div>',
  );

  document.getElementById("app")!.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-header__title">Recategorizacao de Animais</h2>
        <p class="page-header__sub">Promova categorias individualmente ou em lote</p>
      </div>
    </div>
    <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-6)">
      ${abaBtn("pendentes", "Animais Pendentes", abaInicial)}
      ${abaBtn("parametros", "Configurar Parametros", abaInicial)}
    </div>
    <div id="recat-conteudo"><div class="loading"><div class="spinner"></div></div></div>
  `;

  document.querySelectorAll(".aba-recat").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".aba-recat")
        .forEach((b) => b.classList.replace("btn--primario", "btn--fantasma"));
      btn.classList.replace("btn--fantasma", "btn--primario");
      carregarAba((btn as HTMLElement).dataset.aba as Aba);
    });
  });

  carregarAba(abaInicial);
}

async function carregarAba(aba: Aba) {
  const el = document.getElementById("recat-conteudo")!;
  el.innerHTML =
    '<div class="loading"><div class="spinner"></div>Carregando...</div>';
  if (aba === "pendentes") await renderPendentes(el);
  if (aba === "parametros") await renderParametros(el);
}

async function renderPendentes(el: HTMLElement) {
  try {
    const res = await api.get<{ data: AnimalPendente[] }>(
      "/recategorizacao/pendentes",
    );
    const animais = res.data;

    if (animais.length === 0) {
      el.innerHTML = `
        <div class="card">
          <div class="empty-state" style="padding:var(--sp-10)">
            <h3>Nenhum animal pendente</h3>
            <p class="text-muted mt-4">Todos os animais estao na categoria correta para a idade atual.</p>
          </div>
        </div>`;
      return;
    }

    const grupos = animais.reduce(
      (acc, a) => {
        const key = `${a.categoria_atual} -> ${a.categoria_sugerida}`;
        if (!acc[key]) acc[key] = 0;
        acc[key]++;
        return acc;
      },
      {} as Record<string, number>,
    );

    const linhas = animais
      .map(
        (a) => `
      <tr>
        <td>
          <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer">
            <input type="checkbox" class="animal-recat-check" value="${a.id}"
              data-para="${a.categoria_sugerida}"
              style="width:16px;height:16px;accent-color:var(--verde-medio)">
            <strong>${a.brinco}</strong>${a.nome ? " - " + a.nome : ""}
          </label>
        </td>
        <td><span class="badge badge--cinza">${a.categoria_atual}</span></td>
        <td><span class="badge badge--verde">${a.categoria_sugerida}</span></td>
        <td class="text-right">${a.idade_meses} meses</td>
        <td>${formatDate(a.data_nascimento)}</td>
        <td>${a.lote_nome ?? '<span class="text-muted">-</span>'}</td>
      </tr>`,
      )
      .join("");

    const gruposHtml = Object.entries(grupos)
      .map(
        ([key, qtd]) => `
      <div style="background:var(--verde-suave);border-radius:var(--raio-sm);padding:var(--sp-3) var(--sp-4);margin-bottom:var(--sp-2)">
        <span style="font-weight:700;color:var(--verde-escuro)">${key}</span>
        <span class="badge badge--verde" style="margin-left:var(--sp-2)">${qtd} animal(is)</span>
      </div>`,
      )
      .join("");

    el.innerHTML = `
      <div class="card" style="margin-bottom:var(--sp-5)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-4)">
          <div class="card__title" style="margin-bottom:0">${animais.length} animal(is) para recategorizar</div>
          <div style="display:flex;gap:var(--sp-3)">
            <button class="btn btn--fantasma" id="btn-sel-todos">Selecionar todos</button>
            <button class="btn btn--primario" id="btn-recategorizar">Recategorizar Selecionados</button>
          </div>
        </div>
        ${gruposHtml}
      </div>
      <div class="card">
        <div class="card__title">Animais para Recategorizar</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Animal</th><th>Categoria atual</th><th>Sugerida</th><th class="text-right">Idade</th><th>Nascimento</th><th>Lote</th></tr></thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
      </div>
      <div class="modal-overlay" id="modal-recat" style="display:none">
        <div class="modal">
          <h2 class="modal__title">Confirmar Recategorizacao</h2>
          <div id="modal-recat-resumo"></div>
          <div class="form-group" style="margin-top:var(--sp-4)">
            <label class="form-label">Responsavel</label>
            <input class="form-input" id="recat-responsavel" placeholder="Nome do responsavel">
          </div>
          <div class="form-group">
            <label class="form-label">Observacao</label>
            <textarea class="form-textarea" id="recat-obs" rows="2"></textarea>
          </div>
          <div class="modal__footer">
            <button class="btn btn--fantasma" id="btn-cancelar-recat">Cancelar</button>
            <button class="btn btn--primario" id="btn-confirmar-recat">Confirmar</button>
          </div>
        </div>
      </div>`;

    document.getElementById("btn-sel-todos")?.addEventListener("click", () => {
      document
        .querySelectorAll<HTMLInputElement>(".animal-recat-check")
        .forEach((c) => (c.checked = true));
    });

    document
      .getElementById("btn-cancelar-recat")
      ?.addEventListener("click", () => {
        (document.getElementById("modal-recat") as HTMLElement).style.display =
          "none";
      });

    document
      .getElementById("btn-recategorizar")
      ?.addEventListener("click", () => {
        const selecionados = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            ".animal-recat-check:checked",
          ),
        );
        if (selecionados.length === 0) {
          toast.warning("Selecione pelo menos um animal");
          return;
        }

        const agrupado = selecionados.reduce(
          (acc, inp) => {
            const para = inp.dataset.para!;
            acc[para] = (acc[para] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        document.getElementById("modal-recat-resumo")!.innerHTML = `
        <p style="margin-bottom:var(--sp-3)"><strong>${selecionados.length}</strong> animal(is) serao recategorizados:</p>
        ${Object.entries(agrupado)
          .map(
            ([cat, qtd]) => `
          <div style="display:flex;align-items:center;gap:var(--sp-2);padding:var(--sp-2);background:var(--cor-surface-2);border-radius:var(--raio-sm);margin-bottom:var(--sp-2)">
            <span class="badge badge--verde">${cat}</span><span>${qtd} animal(is)</span>
          </div>`,
          )
          .join("")}`;
        (document.getElementById("modal-recat") as HTMLElement).style.display =
          "flex";
      });

    document
      .getElementById("btn-confirmar-recat")
      ?.addEventListener("click", async () => {
        const selecionados = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            ".animal-recat-check:checked",
          ),
        ).map((inp) => ({
          animal_id: inp.value,
          categoria_para: inp.dataset.para as any,
        }));
        const responsavel = (
          document.getElementById("recat-responsavel") as HTMLInputElement
        ).value;
        const observacao = (
          document.getElementById("recat-obs") as HTMLTextAreaElement
        ).value;
        try {
          const res = await api.post<{
            data: { total: number; sucesso: number; erros: string[] };
          }>("/recategorizacao/executar", {
            animais: selecionados,
            responsavel: responsavel || undefined,
            observacao: observacao || undefined,
          });
          const r = res.data;
          toast.success(`${r.sucesso} animal(is) recategorizados!`);
          (
            document.getElementById("modal-recat") as HTMLElement
          ).style.display = "none";
          await renderPendentes(el);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      });
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><h3>Erro ao carregar pendentes</h3></div>`;
  }
}

async function renderParametros(el: HTMLElement) {
  try {
    const res = await api.get<{ data: Parametro[] }>(
      "/recategorizacao/parametros",
    );
    const params = res.data;

    el.innerHTML = `
      <div class="card">
        <div class="card__title" style="margin-bottom:var(--sp-4)">Parametros de Recategorizacao</div>
        <p class="text-muted text-sm" style="margin-bottom:var(--sp-5)">
          Configure quantos meses um animal precisa ter em cada categoria antes de ser sugerido para a proxima.
        </p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Transicao</th><th>Descricao</th><th class="text-right">Idade minima</th><th class="text-right">Status</th><th></th></tr></thead>
            <tbody>
              ${params
                .map(
                  (p) => `
                <tr>
                  <td>
                    <span class="badge badge--cinza">${p.categoria_de}</span>
                    <span style="margin:0 var(--sp-2);color:var(--cor-texto-3)">-></span>
                    <span class="badge badge--verde">${p.categoria_para}</span>
                  </td>
                  <td class="text-muted text-sm">${p.observacao ?? "-"}</td>
                  <td class="text-right">
                    <input type="number" class="form-input param-meses" data-id="${p.id}"
                      value="${p.meses_minimos}" min="1" max="120"
                      style="width:80px;padding:4px 8px;text-align:center">
                    <span class="text-sm text-muted" style="margin-left:4px">meses</span>
                  </td>
                  <td class="text-right">
                    <label style="display:flex;align-items:center;gap:var(--sp-2);justify-content:flex-end;cursor:pointer">
                      <input type="checkbox" class="param-ativo" data-id="${p.id}" ${p.ativo ? "checked" : ""}
                        style="width:16px;height:16px;accent-color:var(--verde-medio)">
                      <span class="text-sm">${p.ativo ? "Ativo" : "Inativo"}</span>
                    </label>
                  </td>
                  <td>
                    <button class="btn btn--fantasma btn-salvar-param" data-id="${p.id}"
                      style="font-size:.75rem;padding:4px 12px">Salvar</button>
                  </td>
                </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="mt-6" style="background:var(--cor-surface-2);border-radius:var(--raio-sm);padding:var(--sp-4)">
          <p class="text-sm" style="font-weight:700;margin-bottom:var(--sp-2)">Como funciona:</p>
          <p class="text-sm text-muted">Quando um animal atingir a idade minima configurada, ele aparece em Animais Pendentes e no alerta do Dashboard. A recategorizacao nunca e automatica.</p>
        </div>
      </div>`;

    document.querySelectorAll(".btn-salvar-param").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.id!;
        const meses = parseInt(
          (
            document.querySelector(
              `.param-meses[data-id="${id}"]`,
            ) as HTMLInputElement
          ).value,
        );
        const ativo = (
          document.querySelector(
            `.param-ativo[data-id="${id}"]`,
          ) as HTMLInputElement
        ).checked;
        try {
          await api.patch(`/recategorizacao/parametros/${id}`, {
            meses_minimos: meses,
            ativo,
          });
          toast.success("Parametro salvo!");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro");
        }
      });
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><h3>Erro ao carregar parametros</h3></div>`;
  }
}
