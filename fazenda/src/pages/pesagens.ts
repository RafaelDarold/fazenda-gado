import { api } from "../lib/api.js";
import { renderLayout } from "../components/layout.js";
import { toast } from "../lib/toast.js";
import { formatArroba } from "../utils/arroba.js";
import { formatDate, hoje } from "../utils/date.js";

interface Animal {
  id: string;
  brinco: string;
  nome: string | null;
  categoria: string;
  lote_id: string | null;
  ultimo_peso_arroba: string | null;
}
interface Lote {
  id: string;
  nome: string;
  quantidade_atual: number;
}
interface Pesagem {
  id: string;
  data: string;
  peso_arroba: string;
  peso_kg: string;
  gmd_arroba: string | null;
  animal_brinco: string;
  animal_categoria: string;
  responsavel: string | null;
}

export async function pesagensPage() {
  renderLayout(
    "Pesagens",
    '<div class="loading"><div class="spinner"></div>Carregando...</div>',
  );

  try {
    const [lotesRes, animaisRes] = await Promise.all([
      api.get<{ data: Lote[] }>("/lotes"),
      api.get<{ data: Animal[] }>("/animais?pageSize=500"),
    ]);

    const lotes = lotesRes.data;
    const animais = animaisRes.data;

    const lotesOpts = lotes
      .map(
        (l) =>
          `<option value="${l.id}">${l.nome} (${l.quantidade_atual} animais)</option>`,
      )
      .join("");
    const animaisOpts = animais
      .map(
        (a) =>
          `<option value="${a.id}">${a.brinco}${a.nome ? " — " + a.nome : ""} (${a.categoria})</option>`,
      )
      .join("");

    document.getElementById("app")!.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-header__title">Pesagens</h2>
          <p class="page-header__sub">Registre pesagens individuais ou por lote inteiro</p>
        </div>
      </div>

      <!-- Abas -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5)">

        <!-- Formulário individual -->
        <div class="card" id="form-individual-card">
          <div class="card__title">Pesagem Individual</div>
          <form id="form-pesagem-individual">
            <div class="form-group">
              <label class="form-label">Animal *</label>
              <select class="form-select" name="animal_id" required>
                <option value="">Selecione o animal</option>
                ${animaisOpts}
              </select>
            </div>
            <div class="form-grid form-grid--2">
              <div class="form-group">
                <label class="form-label">Data *</label>
                <input class="form-input" name="data" type="date" required value="${hoje()}">
              </div>
              <div class="form-group">
                <label class="form-label">Peso (@) *</label>
                <input class="form-input" name="peso_arroba" type="number" step="0.001" required placeholder="Ex: 18.500">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Responsável</label>
              <input class="form-input" name="responsavel" placeholder="Nome de quem pesou">
            </div>
            <div class="form-group">
              <label class="form-label">Observação</label>
              <textarea class="form-textarea" name="observacao" rows="2"></textarea>
            </div>
            <button type="submit" class="btn btn--primario w-full">Registrar Pesagem</button>
          </form>
        </div>

        <!-- Formulário em lote -->
        <div class="card" id="form-lote-card">
          <div class="card__title">Pesagem em Lote</div>
          <form id="form-pesagem-lote-select">
            <div class="form-group">
              <label class="form-label">Lote *</label>
              <select class="form-select" name="lote_id" id="sel-lote-pesagem" required>
                <option value="">Selecione o lote</option>
                ${lotesOpts}
              </select>
            </div>
            <div class="form-grid form-grid--2">
              <div class="form-group">
                <label class="form-label">Data *</label>
                <input class="form-input" name="data" type="date" required value="${hoje()}">
              </div>
              <div class="form-group">
                <label class="form-label">Responsável</label>
                <input class="form-input" name="responsavel" placeholder="Opcional">
              </div>
            </div>
            <button type="button" class="btn btn--fantasma w-full" id="btn-carregar-animais-lote">Carregar animais do lote →</button>
          </form>

          <!-- Tabela de pesagem em lote (aparece após carregar) -->
          <div id="tabela-lote-pesagem" style="display:none;margin-top:var(--sp-5)">
            <div id="animais-lote-lista"></div>
            <button type="button" class="btn btn--primario w-full mt-4" id="btn-salvar-pesagem-lote">Salvar Pesagem do Lote</button>
          </div>
        </div>
      </div>

      <!-- Histórico recente -->
      <div class="card mt-6" id="historico-pesagens">
        <div class="card__title">Histórico Recente</div>
        <div class="loading"><div class="spinner"></div>Carregando histórico...</div>
      </div>

      <!-- Modal resultado -->
      <div class="modal-overlay" id="modal-resultado" style="display:none">
        <div class="modal">
          <h2 class="modal__title">✅ Pesagem Registrada</h2>
          <div id="resultado-content"></div>
          <div class="modal__footer">
            <button class="btn btn--primario" id="btn-fechar-resultado">Fechar</button>
          </div>
        </div>
      </div>
    `;

    // ── Pesagem individual ──────────────────────────────────────────────────

    document
      .getElementById("form-pesagem-individual")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data = Object.fromEntries(new FormData(form));
        try {
          const res = await api.post<{
            data: {
              peso_arroba: string;
              peso_kg: string;
              gmd_arroba: string | null;
            };
          }>("/pesagens", {
            animal_id: data.animal_id,
            data: data.data,
            peso_arroba: parseFloat(data.peso_arroba as string),
            responsavel: data.responsavel || undefined,
            observacao: data.observacao || undefined,
          });
          toast.success("Pesagem registrada com sucesso!");
          form.reset();
          (form.querySelector('[name="data"]') as HTMLInputElement).value =
            hoje();

          // Mostra resultado com GMD se disponível
          const p = res.data;
          const gmdInfo = p.gmd_arroba
            ? `<p style="color:var(--verde-medio);font-weight:700">GMD: ${parseFloat(p.gmd_arroba).toFixed(4)} @/dia</p>`
            : '<p class="text-muted">Primeira pesagem — GMD calculado na próxima.</p>';

          document.getElementById("resultado-content")!.innerHTML = `
          <div style="text-align:center;padding:var(--sp-4)">
            <div style="font-size:2rem;font-weight:700;font-family:var(--fonte-display);color:var(--verde-escuro)">${formatArroba(parseFloat(p.peso_arroba))}</div>
            <div class="text-muted">${parseFloat(p.peso_kg).toFixed(2)} kg</div>
            <div style="margin-top:var(--sp-4)">${gmdInfo}</div>
          </div>
        `;
          (
            document.getElementById("modal-resultado") as HTMLElement
          ).style.display = "flex";
          carregarHistorico();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Erro ao registrar");
        }
      });

    // ── Pesagem em lote ─────────────────────────────────────────────────────

    document
      .getElementById("btn-carregar-animais-lote")
      ?.addEventListener("click", async () => {
        const loteId = (
          document.getElementById("sel-lote-pesagem") as HTMLSelectElement
        ).value;
        if (!loteId) {
          toast.warning("Selecione um lote primeiro");
          return;
        }

        try {
          const res = await api.get<{ data: Animal[] }>(
            `/lotes/${loteId}/animais`,
          );
          const animaisLote = res.data;

          if (animaisLote.length === 0) {
            toast.warning("Este lote não tem animais cadastrados");
            return;
          }

          const linhas = animaisLote
            .map(
              (a) => `
          <tr>
            <td><strong>${a.brinco}</strong>${a.nome ? ` <span class="text-muted text-sm">- ${a.nome}</span>` : ""}</td>
            <td><span class="badge badge--verde">${a.categoria}</span></td>
            <td class="text-right">
              ${
                a.ultimo_peso_arroba
                  ? `<span style="font-weight:700;color:var(--verde-medio)">${parseFloat(a.ultimo_peso_arroba).toFixed(3)} @</span>`
                  : '<span class="text-muted text-sm">-</span>'
              }
            </td>
            <td>
              <input
                class="form-input peso-lote-input"
                type="number" step="0.001"
                placeholder="Novo peso (@)"
                data-animal-id="${a.id}"
                style="width:140px;padding:6px 10px"
              >
            </td>
          </tr>
        `,
            )
            .join("");

          document.getElementById("animais-lote-lista")!.innerHTML = `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Brinco / Nome</th><th>Categoria</th><th class="text-right">Peso atual</th><th>Novo peso (@) *</th></tr></thead>
              <tbody>${linhas}</tbody>
            </table>
          </div>
          <p class="text-muted text-sm mt-4">Deixe o campo em branco para pular um animal.</p>
        `;
          (
            document.getElementById("tabela-lote-pesagem") as HTMLElement
          ).style.display = "block";
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Erro ao carregar animais",
          );
        }
      });

    document
      .getElementById("btn-salvar-pesagem-lote")
      ?.addEventListener("click", async () => {
        const form = document.getElementById(
          "form-pesagem-lote-select",
        ) as HTMLFormElement;
        const formData = Object.fromEntries(new FormData(form));
        const loteId = (
          document.getElementById("sel-lote-pesagem") as HTMLSelectElement
        ).value;
        const inputs =
          document.querySelectorAll<HTMLInputElement>(".peso-lote-input");

        const pesagens: Array<{ animal_id: string; peso_arroba: number }> = [];
        inputs.forEach((input) => {
          if (input.value) {
            pesagens.push({
              animal_id: input.dataset.animalId!,
              peso_arroba: parseFloat(input.value),
            });
          }
        });

        if (pesagens.length === 0) {
          toast.warning("Informe o peso de pelo menos um animal");
          return;
        }

        try {
          const res = await api.post<{
            data: {
              registradas: number;
              ignoradas: number;
              pesoMedioLote: number;
            };
          }>("/pesagens/lote", {
            lote_id: loteId,
            data: formData.data,
            responsavel: formData.responsavel || undefined,
            pesagens,
          });
          const r = res.data;
          toast.success(
            `${r.registradas} pesagem(ns) registrada(s)! Peso médio do lote: ${formatArroba(r.pesoMedioLote)}`,
          );
          (
            document.getElementById("tabela-lote-pesagem") as HTMLElement
          ).style.display = "none";
          form.reset();
          (form.querySelector('[name="data"]') as HTMLInputElement).value =
            hoje();
          carregarHistorico();
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Erro ao salvar pesagens",
          );
        }
      });

    document
      .getElementById("btn-fechar-resultado")
      ?.addEventListener("click", () => {
        (
          document.getElementById("modal-resultado") as HTMLElement
        ).style.display = "none";
      });

    carregarHistorico();
  } catch (err) {
    document.getElementById("app")!.innerHTML =
      `<div class="empty-state"><h3>Erro ao carregar pesagens</h3></div>`;
  }
}

async function carregarHistorico() {
  const el = document.getElementById("historico-pesagens");
  if (!el) return;

  try {
    // Busca últimas pesagens de todos os animais via movimentações recentes
    const res = await api
      .get<{ data: Pesagem[] }>("/pesagens/lote/all?pageSize=30")
      .catch(() => ({ data: [] }));

    if (!res.data || res.data.length === 0) {
      el.innerHTML = `
        <div class="card__title">Histórico Recente</div>
        <div class="empty-state" style="padding:var(--sp-8)">
          <div class="empty-state__icon">⚖</div>
          <h3>Nenhuma pesagem registrada ainda</h3>
        </div>
      `;
      return;
    }

    const linhas = res.data
      .map(
        (p: Pesagem) => `
      <tr>
        <td>${formatDate(p.data)}</td>
        <td><strong>${p.animal_brinco}</strong></td>
        <td><span class="badge badge--verde">${p.animal_categoria}</span></td>
        <td class="text-right"><strong>${formatArroba(parseFloat(p.peso_arroba))}</strong></td>
        <td class="text-right text-muted">${parseFloat(p.peso_kg).toFixed(2)} kg</td>
        <td class="text-right" style="color:${p.gmd_arroba && parseFloat(p.gmd_arroba) > 0 ? "var(--verde-medio)" : "var(--cor-perigo)"}">
          ${p.gmd_arroba ? parseFloat(p.gmd_arroba).toFixed(4) + " @/dia" : "—"}
        </td>
        <td class="text-muted text-sm">${p.responsavel ?? "—"}</td>
      </tr>
    `,
      )
      .join("");

    el.innerHTML = `
      <div class="card__title">Histórico Recente</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Brinco</th><th>Categoria</th>
              <th class="text-right">Peso (@)</th><th class="text-right">Peso (kg)</th>
              <th class="text-right">GMD</th><th>Responsável</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  } catch {
    el.innerHTML = `<div class="card__title">Histórico Recente</div><p class="text-muted">Erro ao carregar histórico.</p>`;
  }
}
