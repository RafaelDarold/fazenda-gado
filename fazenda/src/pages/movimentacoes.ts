import { api } from "../lib/api.js";
import { renderLayout } from "../components/layout.js";
import { toast, confirmar } from "../lib/toast.js";
import { formatDate, hoje } from "../utils/date.js";
import { formatBRL } from "../utils/currency.js";

interface Lote {
  id: string;
  nome: string;
  quantidade_atual: number;
  categoria_principal: string;
}
interface Animal {
  id: string;
  brinco: string;
  nome: string | null;
  categoria: string;
  lote_id: string | null;
  peso_entrada_arroba: string | null;
}
interface MovRow {
  id: string;
  data: string;
  tipo: string;
  direcao: string;
  animal_brinco: string;
  animal_categoria: string;
  origem_destino: string | null;
  lote_destino_nome: string | null;
}

type Aba = "compra" | "venda" | "obito" | "nascimento" | "historico";

function abaBtn(id: Aba, label: string, icon: string, ativa: Aba) {
  return `<button class="btn ${id === ativa ? "btn--primario" : "btn--fantasma"} aba-btn" data-aba="${id}">${icon} ${label}</button>`;
}

function tipoBadge(tipo: string, direcao: string) {
  const cores: Record<string, string> = {
    compra: "azul",
    nascimento: "verde",
    venda: "amarelo",
    obito: "vermelho",
    abate: "vermelho",
    transferencia: "cinza",
  };
  const cor = cores[tipo] ?? "cinza";
  const seta = direcao === "entrada" ? "↑" : "↓";
  return `<span class="badge badge--${cor}">${seta} ${tipo}</span>`;
}

export async function movimentacoesPage(abaInicial: Aba = "historico") {
  renderLayout(
    "Movimentações",
    '<div class="loading"><div class="spinner"></div>Carregando...</div>',
  );

  try {
    const [lotesRes, animaisRes, racasRes] = await Promise.all([
      api.get<{ data: Lote[] }>("/lotes"),
      api.get<{ data: Animal[] }>("/animais?pageSize=500"),
      api
        .get<{ data: { id: string; nome: string }[] }>("/racas")
        .catch(() => ({ data: [] })),
    ]);

    const racasDatalist =
      '<datalist id="racas-list">' +
      racasRes.data
        .map((r: { nome: string }) => `<option value="${r.nome}">`)
        .join("") +
      "</datalist>";
    const lotes = lotesRes.data;
    const animais = animaisRes.data;
    const ativos = animais.filter((a) => a);

    renderTela(abaInicial, lotes, ativos);
  } catch (err) {
    document.getElementById("app")!.innerHTML =
      `<div class="empty-state"><h3>Erro ao carregar</h3></div>`;
  }
}

function renderTela(aba: Aba, lotes: Lote[], animais: Animal[]) {
  const lotesOpts = lotes
    .map(
      (l) =>
        `<option value="${l.id}">${l.nome} (${l.categoria_principal})</option>`,
    )
    .join("");
  const animaisOpts = animais
    .map(
      (a) =>
        `<option value="${a.id}">${a.brinco}${a.nome ? " — " + a.nome : ""} (${a.categoria})</option>`,
    )
    .join("");

  const abas = `
    <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-6)">
      ${abaBtn("compra", "Compra", "🛒", aba)}
      ${abaBtn("venda", "Venda", "", aba)}
      ${abaBtn("obito", "Óbito", "✝", aba)}
      ${abaBtn("nascimento", "Nascimento", "🐄", aba)}
      ${abaBtn("historico", "Histórico", "📋", aba)}
    </div>
  `;

  let conteudo = "";

  if (aba === "compra") {
    conteudo = formCompra(lotesOpts);
  } else if (aba === "venda") {
    conteudo = modalTipoVenda();
  } else if (aba === "obito") {
    conteudo = formObito(animaisOpts);
  } else if (aba === "nascimento") {
    conteudo = formNascimento(lotesOpts, animaisOpts);
  } else {
    conteudo = `<div class="card" id="historico-mov"><div class="loading"><div class="spinner"></div>Carregando histórico...</div></div>`;
  }

  document.getElementById("app")!.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-header__title">Movimentações</h2>
        <p class="page-header__sub">Entradas e saídas do rebanho</p>
      </div>
    </div>
    ${abas}
    ${conteudo}
  `;

  // Troca de abas
  document.querySelectorAll(".aba-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const novaAba = (btn as HTMLElement).dataset.aba as Aba;
      renderTela(novaAba, lotes, animais);
      if (novaAba === "historico") carregarHistoricoMov();
    });
  });

  // Bind dos formulários
  if (aba === "compra") bindCompra(lotes);
  if (aba === "venda") bindModalTipoVenda(animais, lotesOpts);
  if (aba === "obito") bindObito();
  if (aba === "nascimento") bindNascimento();
  if (aba === "historico") carregarHistoricoMov();
}

// ── COMPRA ──────────────────────────────────────────────────────────────────

function formCompra(lotesOpts: string) {
  return `
    <div class="card">
      <div class="card__title">🛒 Registrar Compra de Animais</div>
      <p class="text-muted text-sm mb-6">Preencha os dados da compra. Cada animal será cadastrado individualmente.</p>

      <form id="form-compra">
        <div class="form-grid form-grid--3">
          <div class="form-group">
            <label class="form-label">Data da compra *</label>
            <input class="form-input" name="data" type="date" required value="${hoje()}">
          </div>
          <div class="form-group">
            <label class="form-label">Vendedor / Origem *</label>
            <input class="form-input" name="origem" required placeholder="Ex: Fazenda São João">
          </div>
          <div class="form-group">
            <label class="form-label">Lote de destino *</label>
            <select class="form-select" name="lote_destino_id" required>
              <option value="">Selecione</option>
              ${lotesOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Forma de pagamento *</label>
            <select class="form-select" name="forma_pagamento" required>
              <option value="avista">À vista</option>
              <option value="pix">PIX</option>
              <option value="transferencia">Transferência</option>
              <option value="boleto">Boleto</option>
              <option value="prazo">A prazo</option>
              <option value="parcelas">Parcelado</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Vencimento</label>
            <input class="form-input" name="data_vencimento" type="date">
          </div>
          <div class="form-group">
            <label class="form-label">GTA</label>
            <input class="form-input" name="numero_gta" placeholder="Número da GTA">
          </div>
        </div>

        <div style="border-top:1px solid var(--cor-borda);padding-top:var(--sp-5);margin-top:var(--sp-2)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-4)">
            <strong>Animais comprados</strong>
            <button type="button" class="btn btn--fantasma" id="btn-add-animal-compra">+ Adicionar animal</button>
          </div>
          <div id="animais-compra-lista"></div>
          <div id="total-compra" class="text-muted text-sm mt-4"></div>
        </div>

        <div class="modal__footer" style="margin-top:var(--sp-5)">
          <button type="submit" class="btn btn--primario" id="btn-confirmar-compra" disabled>
            Confirmar Compra
          </button>
        </div>
      </form>
    </div>
  `;
}

let animaisCompra: Array<{
  id: number;
  brinco: string;
  nome: string;
  raca: string;
  sexo: string;
  categoria: string;
  peso: string;
  valor: string;
}> = [];
let nextId = 0;

function bindCompra(lotes: Lote[]) {
  animaisCompra = [];
  nextId = 0;
  renderAnimaisCompra();

  document
    .getElementById("btn-add-animal-compra")
    ?.addEventListener("click", () => {
      animaisCompra.push({
        id: nextId++,
        brinco: "",
        nome: "",
        raca: "",
        sexo: "M",
        categoria: "boi",
        peso: "",
        valor: "",
      });
      renderAnimaisCompra();
    });

  document
    .getElementById("form-compra")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const data = Object.fromEntries(new FormData(form));

      if (animaisCompra.length === 0) {
        toast.warning("Adicione pelo menos um animal");
        return;
      }

      const animaisPayload = animaisCompra.map((a) => ({
        brinco: a.brinco,
        nome: a.nome || undefined,
        raca: a.raca,
        sexo: a.sexo as "M" | "F",
        categoria: a.categoria,
        peso_entrada_arroba: a.peso ? parseFloat(a.peso) : undefined,
        valor_unitario: parseFloat(a.valor) || 0,
      }));

      try {
        await api.post("/movimentacoes/compra", {
          data: data.data,
          origem: data.origem,
          lote_destino_id: data.lote_destino_id,
          forma_pagamento: data.forma_pagamento,
          data_vencimento: data.data_vencimento || undefined,
          numero_gta: data.numero_gta || undefined,
          animais: animaisPayload,
        });

        const total = animaisPayload.reduce((s, a) => s + a.valor_unitario, 0);
        toast.success(
          `Compra de ${animaisCompra.length} animal(is) registrada! Total: ${formatBRL(total)}`,
        );
        animaisCompra = [];
        nextId = 0;
        renderTela("historico", lotes, []);
        movimentacoesPage("historico");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao registrar compra",
        );
      }
    });
}

function renderAnimaisCompra() {
  const lista = document.getElementById("animais-compra-lista");
  const btn = document.getElementById(
    "btn-confirmar-compra",
  ) as HTMLButtonElement;
  if (!lista) return;

  if (animaisCompra.length === 0) {
    lista.innerHTML = `<p class="text-muted text-sm">Nenhum animal adicionado. Clique em "+ Adicionar animal".</p>`;
    if (btn) btn.disabled = true;
    return;
  }

  if (btn) btn.disabled = false;

  lista.innerHTML = animaisCompra
    .map(
      (a) => `
    <div style="background:var(--cor-surface-2);border:1px solid var(--cor-borda);border-radius:var(--raio-sm);padding:var(--sp-4);margin-bottom:var(--sp-3)">
      <div style="display:grid;grid-template-columns:repeat(6,1fr) auto;gap:var(--sp-3);align-items:end">
        <div>
          <div class="form-label">Brinco *</div>
          <input class="form-input" value="${a.brinco}" placeholder="001"
            onchange="window.__updateAnimal(${a.id},'brinco',this.value)" style="padding:6px 10px">
        </div>
        <div>
          <div class="form-label">Raça *</div>
          <input class="form-input" value="${a.raca}" placeholder="Nelore" list="racas-list"
            onchange="window.__updateAnimal(${a.id},'raca',this.value)" style="padding:6px 10px">
        </div>
        <div>
          <div class="form-label">Sexo *</div>
          <select class="form-select" onchange="window.__updateAnimal(${a.id},'sexo',this.value)" style="padding:6px 10px">
            <option value="M" ${a.sexo === "M" ? "selected" : ""}>Macho</option>
            <option value="F" ${a.sexo === "F" ? "selected" : ""}>Fêmea</option>
          </select>
        </div>
        <div>
          <div class="form-label">Categoria *</div>
          <select class="form-select" onchange="window.__updateAnimal(${a.id},'categoria',this.value)" style="padding:6px 10px">
            <option value="bezerro"  ${a.categoria === "bezerro" ? "selected" : ""}>Bezerro</option>
            <option value="bezerra"  ${a.categoria === "bezerra" ? "selected" : ""}>Bezerra</option>
            <option value="novilha"  ${a.categoria === "novilha" ? "selected" : ""}>Novilha</option>
            <option value="vaca"     ${a.categoria === "vaca" ? "selected" : ""}>Vaca</option>
            <option value="boi"      ${a.categoria === "boi" ? "selected" : ""}>Boi</option>
            <option value="touro"    ${a.categoria === "touro" ? "selected" : ""}>Touro</option>
          </select>
        </div>
        <div>
          <div class="form-label">Peso (@)</div>
          <input class="form-input" type="number" step="0.001" value="${a.peso}" placeholder="18.500"
            onchange="window.__updateAnimal(${a.id},'peso',this.value)" style="padding:6px 10px">
        </div>
        <div>
          <div class="form-label">Valor (R$) *</div>
          <input class="form-input" type="number" step="0.01" value="${a.valor}" placeholder="0,00"
            onchange="window.__updateAnimal(${a.id},'valor',this.value)" style="padding:6px 10px">
        </div>
        <button type="button" onclick="window.__removeAnimal(${a.id})"
          style="background:none;border:none;color:var(--cor-perigo);font-size:1.2rem;padding:4px;cursor:pointer;align-self:center">✕</button>
      </div>
    </div>
  `,
    )
    .join("");

  const total = animaisCompra.reduce(
    (s, a) => s + (parseFloat(a.valor) || 0),
    0,
  );
  const totalEl = document.getElementById("total-compra");
  if (totalEl)
    totalEl.innerHTML = `Total: <strong style="color:var(--verde-escuro)">${formatBRL(total)}</strong> (${animaisCompra.length} animal(is))`;

    // Expõe funções globais para os handlers inline
  (window as any).__updateAnimal = (
    id: number,
    campo: string,
    valor: string,
  ) => {
    const a = animaisCompra.find((x) => x.id === id);
    if (a) {
      (a as any)[campo] = valor;
      renderAnimaisCompra();
    }
  };
  (window as any).__removeAnimal = (id: number) => {
    animaisCompra = animaisCompra.filter((x) => x.id !== id);
    renderAnimaisCompra();
  };
}

// MODAL SELECAO TIPO DE VENDA

function modalTipoVenda(): string {
  return `
    <div style="display:flex;align-items:center;justify-content:center;min-height:300px">
      <div class="card" style="max-width:560px;width:100%">
        <div class="card__title" style="text-align:center;font-size:1.3rem;margin-bottom:var(--sp-2)">Tipo de Venda</div>
        <p class="text-muted text-sm" style="text-align:center;margin-bottom:var(--sp-6)">Selecione como sera realizada a venda dos animais</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-4)">
          <button id="btn-tipo-frigorifico" style="
            border:2px solid var(--cor-borda);border-radius:var(--raio-md);
            padding:var(--sp-6);background:var(--cor-surface);cursor:pointer;
            transition:all .2s;text-align:center;font-family:inherit
          ">
            <div style="font-size:2rem;margin-bottom:var(--sp-3)">🏭</div>
            <div style="font-family:var(--fonte-display);font-size:1rem;font-weight:700;color:var(--verde-escuro);margin-bottom:var(--sp-2)">Frigorifico</div>
            <div style="font-size:.8rem;color:var(--cor-texto-3);line-height:1.4">Venda por rendimento de carcaca com boletim de abate em 2 etapas</div>
          </button>
          <button id="btn-tipo-direta" style="
            border:2px solid var(--cor-borda);border-radius:var(--raio-md);
            padding:var(--sp-6);background:var(--cor-surface);cursor:pointer;
            transition:all .2s;text-align:center;font-family:inherit
          ">
            <div style="font-size:2rem;margin-bottom:var(--sp-3)">🤝</div>
            <div style="font-family:var(--fonte-display);font-size:1rem;font-weight:700;color:var(--verde-escuro);margin-bottom:var(--sp-2)">Venda Direta</div>
            <div style="font-size:.8rem;color:var(--cor-texto-3);line-height:1.4">Venda para pecuarista por peso vivo ou valor por cabeca</div>
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindModalTipoVenda(animais: Animal[], lotesOpts: string) {
  const hovers = ["btn-tipo-frigorifico", "btn-tipo-direta"];
  hovers.forEach((id) => {
    const btn = document.getElementById(id);
    btn?.addEventListener("mouseenter", () => {
      if (btn) {
        btn.style.borderColor = "var(--verde-claro)";
        btn.style.background = "var(--verde-suave)";
      }
    });
    btn?.addEventListener("mouseleave", () => {
      if (btn) {
        btn.style.borderColor = "var(--cor-borda)";
        btn.style.background = "var(--cor-surface)";
      }
    });
  });

  document
    .getElementById("btn-tipo-frigorifico")
    ?.addEventListener("click", () => {
      const app =
        document.querySelector('#app > div[style*="display:flex"]')
          ?.parentElement ?? document.getElementById("app");
      if (app) {
        app.innerHTML = formVenda(animais, lotesOpts);
        bindVenda(animais);
      }
    });

  document.getElementById("btn-tipo-direta")?.addEventListener("click", () => {
    const app =
      document.querySelector('#app > div[style*="display:flex"]')
        ?.parentElement ?? document.getElementById("app");
    if (app) {
      app.innerHTML = formVendaDireta(lotesOpts);
      bindVendaDireta(animais);
    }
  });
}

// VENDA FRIGORIFICO

type VendaAba = "etapa1" | "etapa2";

function formVenda(_animais: Animal[], lotesOpts: string) {
  return renderVendaTela("etapa1", lotesOpts);
}

function renderVendaTela(aba: VendaAba, lotesOpts: string): string {
  const btn1 = `<button class="btn ${aba === "etapa1" ? "btn--primario" : "btn--fantasma"} aba-venda-btn" data-aba="etapa1" style="flex:1">Etapa 1 — Registrar Saida</button>`;
  const btn2 = `<button class="btn ${aba === "etapa2" ? "btn--primario" : "btn--fantasma"} aba-venda-btn" data-aba="etapa2" style="flex:1">Etapa 2 — Boletim de Abate</button>`;

  if (aba === "etapa1") {
    return `
      <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-5)">${btn1}${btn2}</div>
      <div class="card">
        <div class="card__title">Etapa 1 — Registrar Saida de Animais para Frigorifico</div>
        <p class="text-muted text-sm" style="margin-bottom:var(--sp-5)">
          Registre a saida dos animais. Um lancamento financeiro pendente sera criado automaticamente
          e ficara aguardando o boletim do abate para confirmar o valor.
        </p>
        <form id="form-venda-etapa1">
          <div class="form-grid form-grid--2">
            <div class="form-group">
              <label class="form-label">Frigorifico *</label>
              <input class="form-input" name="frigorifico" required placeholder="Ex: Frigon Jaru">
            </div>
            <div class="form-group">
              <label class="form-label">Data de saida *</label>
              <input class="form-input" name="data" type="date" required value="${hoje()}">
            </div>
            <div class="form-group">
              <label class="form-label">GTA</label>
              <input class="form-input" name="numero_gta" placeholder="Numero da GTA">
            </div>
            <div class="form-group">
              <label class="form-label">R$/@ estimado (opcional)</label>
              <input class="form-input" name="valor_arroba_estimado" type="number" step="0.01" placeholder="Ex: 310.00">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Lote de origem *</label>
            <select class="form-select" name="lote_id" id="sel-lote-venda" required>
              <option value="">Selecione o lote</option>
              ${lotesOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Animais *</label>
            <button type="button" class="btn btn--fantasma w-full" id="btn-carregar-animais-venda">
              Carregar animais do lote selecionado
            </button>
            <div id="animais-venda-lista" style="margin-top:var(--sp-3)"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Observacao</label>
            <textarea class="form-textarea" name="observacao" rows="2"></textarea>
          </div>
          <button type="submit" class="btn btn--primario w-full" style="margin-top:var(--sp-2)">
            Registrar Saida (Etapa 1)
          </button>
        </form>
      </div>`;
  }

  // Etapa 2
  return `
    <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-5)">${btn1}${btn2}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5)">

      <!-- Lista de vendas pendentes -->
      <div class="card">
        <div class="card__title">Vendas Aguardando Boletim</div>
        <p class="text-muted text-sm" style="margin-bottom:var(--sp-4)">
          Selecione a venda para preencher o boletim automaticamente.
        </p>
        <div id="lista-pendentes-venda">
          <div class="loading"><div class="spinner"></div>Carregando...</div>
        </div>
      </div>

      <!-- Formulario etapa 2 -->
      <div class="card">
        <div class="card__title">Preencher Boletim de Abate</div>
        <div id="etapa2-selecionado" style="background:var(--cor-surface-2);border-radius:var(--raio-sm);padding:var(--sp-3);margin-bottom:var(--sp-4);display:none">
          <div class="text-sm text-muted">Venda selecionada</div>
          <div id="etapa2-selecionado-info" style="font-weight:700"></div>
        </div>
        <form id="form-venda-etapa2">
          <input type="hidden" name="lancamento_financeiro_id" id="input-lanc-id">
          <div class="form-group">
            <label class="form-label">Frigorifico *</label>
            <input class="form-input" name="frigorifico" id="input-frigorifico" required>
          </div>
          <div class="form-grid form-grid--2">
            <div class="form-group">
              <label class="form-label">Data do abate *</label>
              <input class="form-input" name="data_abate" type="date" required value="${hoje()}">
            </div>
            <div class="form-group">
              <label class="form-label">Data do boletim *</label>
              <input class="form-input" name="data_boletim" type="date" required value="${hoje()}">
            </div>
            <div class="form-group">
              <label class="form-label">Qtd de animais *</label>
              <input class="form-input" name="quantidade_animais" type="number" required id="input-qtd">
            </div>
            <div class="form-group">
              <label class="form-label">Peso carcaca total (@) *</label>
              <input class="form-input" name="peso_carcaca_total_arroba" type="number" step="0.001" required placeholder="Ex: 420.500">
            </div>
            <div class="form-group">
              <label class="form-label">Rendimento (%) *</label>
              <input class="form-input" name="rendimento_percent" type="number" step="0.01" required placeholder="Ex: 54.30">
            </div>
            <div class="form-group">
              <label class="form-label">R$/@ *</label>
              <input class="form-input" name="valor_arroba" type="number" step="0.01" required placeholder="Ex: 315.00">
            </div>
            <div class="form-group">
              <label class="form-label">Bonificacoes (R$)</label>
              <input class="form-input" name="bonificacoes" type="number" step="0.01" value="0">
            </div>
            <div class="form-group">
              <label class="form-label">Descontos (R$)</label>
              <input class="form-input" name="descontos" type="number" step="0.01" value="0">
            </div>
          </div>
          <div id="preview-valor" style="background:var(--verde-suave);border-radius:var(--raio-sm);padding:var(--sp-4);margin-bottom:var(--sp-4);display:none">
            <div class="text-sm text-muted">Valor calculado</div>
            <div id="preview-valor-num" style="font-family:var(--fonte-display);font-size:1.6rem;font-weight:700;color:var(--verde-escuro)"></div>
          </div>
          <button type="submit" class="btn btn--acento w-full">Confirmar Boletim (Etapa 2)</button>
        </form>
      </div>
    </div>`;
}

function bindVenda(_animais: Animal[]) {
  let animaisSelecionados: string[] = [];
  const currentLotes =
    (document.querySelector("[data-lotes]") as HTMLElement)?.dataset.lotes ??
    "";

  // Troca de aba
  document.querySelectorAll(".aba-venda-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const novaAba = (btn as HTMLElement).dataset.aba as VendaAba;
      const lotesOpts = currentLotes;
      const container = document
        .querySelector(".aba-venda-btn")
        ?.closest(".page, #app > div") as HTMLElement;
      if (!container) return;
      const vendaContainer = btn.closest(
        'div[style*="display:flex"]',
      )?.parentElement;
      if (!vendaContainer) return;
      vendaContainer.innerHTML = renderVendaTela(novaAba, lotesOpts);
      bindVenda([]);
      if (novaAba === "etapa2") carregarPendentesVenda();
    });
  });

  // Carregar animais do lote
  document
    .getElementById("btn-carregar-animais-venda")
    ?.addEventListener("click", async () => {
      const loteId = (
        document.getElementById("sel-lote-venda") as HTMLSelectElement
      ).value;
      if (!loteId) {
        toast.warning("Selecione o lote primeiro");
        return;
      }

      try {
        const res = await api.get<{ data: Animal[] }>(
          `/lotes/${loteId}/animais`,
        );
        animaisSelecionados = res.data.map((a) => a.id);

        const lista = document.getElementById("animais-venda-lista")!;
        if (res.data.length === 0) {
          lista.innerHTML =
            '<p class="text-muted text-sm">Nenhum animal neste lote.</p>';
          return;
        }

        lista.innerHTML = `
        <div style="border:1px solid var(--cor-borda);border-radius:var(--raio-sm);padding:var(--sp-3);max-height:200px;overflow-y:auto">
          <div style="display:flex;justify-content:space-between;margin-bottom:var(--sp-2)">
            <span class="text-sm text-muted">${res.data.length} animal(is) encontrado(s)</span>
            <button type="button" id="btn-deselect-todos" class="text-sm" style="background:none;border:none;color:var(--cor-texto-3);cursor:pointer">Desmarcar todos</button>
          </div>
          ${res.data
            .map(
              (a) => `
            <label style="display:flex;align-items:center;gap:var(--sp-2);padding:4px 0;cursor:pointer">
              <input type="checkbox" value="${a.id}" checked
                class="animal-venda-check" style="width:16px;height:16px;accent-color:var(--verde-medio)">
              <span class="text-sm"><strong>${a.brinco}</strong>${a.nome ? " — " + a.nome : ""}
                <span class="badge badge--verde" style="font-size:.65rem;margin-left:4px">${a.categoria}</span>
              </span>
            </label>`,
            )
            .join("")}
        </div>`;

        document
          .querySelectorAll<HTMLInputElement>(".animal-venda-check")
          .forEach((cb) => {
            cb.addEventListener("change", () => {
              animaisSelecionados = Array.from(
                document.querySelectorAll<HTMLInputElement>(
                  ".animal-venda-check:checked",
                ),
              ).map((c) => c.value);
            });
          });

        document
          .getElementById("btn-deselect-todos")
          ?.addEventListener("click", () => {
            document
              .querySelectorAll<HTMLInputElement>(".animal-venda-check")
              .forEach((c) => (c.checked = false));
            animaisSelecionados = [];
          });
      } catch (err) {
        toast.error("Erro ao carregar animais do lote");
      }
    });

  // Submit etapa 1
  document
    .getElementById("form-venda-etapa1")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (animaisSelecionados.length === 0) {
        toast.warning("Selecione ao menos um animal");
        return;
      }

      const data = Object.fromEntries(
        new FormData(e.target as HTMLFormElement),
      );
      const loteId = (
        document.getElementById("sel-lote-venda") as HTMLSelectElement
      ).value;

      try {
        const res = await api.post<{
          data: { lancamento: { id: string }; movimentacoes: unknown[] };
        }>("/movimentacoes/venda/frigorifico/etapa1", {
          data: data.data,
          frigorifico: data.frigorifico,
          lote_id: loteId,
          animal_ids: animaisSelecionados,
          numero_gta: data.numero_gta || undefined,
          valor_arroba_estimado: data.valor_arroba_estimado
            ? parseFloat(data.valor_arroba_estimado as string)
            : undefined,
          observacao: data.observacao || undefined,
        });

        const lancId = res.data.lancamento.id;
        toast.success(
          `Saida registrada! ${animaisSelecionados.length} animal(is) enviados ao frigorifico.`,
        );

        // Limpa o form
        (e.target as HTMLFormElement).reset();
        (
          (e.target as HTMLFormElement).querySelector(
            '[name="data"]',
          ) as HTMLInputElement
        ).value = hoje();
        document.getElementById("animais-venda-lista")!.innerHTML = "";
        animaisSelecionados = [];

        // Sugere ir para etapa 2
        const sugestao = document.createElement("div");
        sugestao.style.cssText =
          "background:var(--verde-suave);border-radius:var(--raio-sm);padding:var(--sp-4);margin-top:var(--sp-4)";
        sugestao.innerHTML = `
        <p style="font-weight:700;color:var(--verde-escuro);margin-bottom:var(--sp-2)">Saida registrada com sucesso!</p>
        <p class="text-sm text-muted">Quando receber o boletim do frigorifico, acesse a Etapa 2 para confirmar o valor.</p>
        <p class="text-sm" style="margin-top:var(--sp-2)">ID do lancamento: <strong>${lancId}</strong></p>
        <button class="btn btn--primario" style="margin-top:var(--sp-3);font-size:.85rem"
          onclick="document.querySelector('.aba-venda-btn[data-aba=etapa2]')?.click()">
          Ir para Etapa 2
        </button>`;
        document.getElementById("form-venda-etapa1")!.appendChild(sugestao);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao registrar saida",
        );
      }
    });

  // Carregar pendentes para etapa 2
  if (document.getElementById("lista-pendentes-venda")) {
    carregarPendentesVenda();
  }

  // Preview valor etapa 2
  const calcPreview = () => {
    const carcaca = parseFloat(
      (
        document.querySelector(
          '[name="peso_carcaca_total_arroba"]',
        ) as HTMLInputElement
      )?.value,
    );
    const arroba = parseFloat(
      (document.querySelector('[name="valor_arroba"]') as HTMLInputElement)
        ?.value,
    );
    const bonif =
      parseFloat(
        (document.querySelector('[name="bonificacoes"]') as HTMLInputElement)
          ?.value,
      ) || 0;
    const desc =
      parseFloat(
        (document.querySelector('[name="descontos"]') as HTMLInputElement)
          ?.value,
      ) || 0;
    if (carcaca && arroba) {
      const valor = carcaca * arroba + bonif - desc;
      const prev = document.getElementById("preview-valor")!;
      prev.style.display = "block";
      document.getElementById("preview-valor-num")!.textContent =
        formatBRL(valor);
    }
  };
  document
    .querySelectorAll('#form-venda-etapa2 input[type="number"]')
    .forEach((i) => i.addEventListener("input", calcPreview));

  // Submit etapa 2
  document
    .getElementById("form-venda-etapa2")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const lancId = (
        document.getElementById("input-lanc-id") as HTMLInputElement
      ).value;
      if (!lancId) {
        toast.warning("Selecione uma venda pendente na lista ao lado");
        return;
      }

      const data = Object.fromEntries(
        new FormData(e.target as HTMLFormElement),
      );
      try {
        const res = await api.post<{ data: { valorFinal: number } }>(
          "/movimentacoes/venda/frigorifico/etapa2",
          {
            lancamento_financeiro_id: lancId,
            frigorifico: data.frigorifico,
            data_abate: data.data_abate,
            data_boletim: data.data_boletim,
            quantidade_animais: parseInt(data.quantidade_animais as string),
            peso_carcaca_total_arroba: parseFloat(
              data.peso_carcaca_total_arroba as string,
            ),
            rendimento_percent: parseFloat(data.rendimento_percent as string),
            valor_arroba: parseFloat(data.valor_arroba as string),
            bonificacoes: parseFloat(data.bonificacoes as string) || 0,
            descontos: parseFloat(data.descontos as string) || 0,
          },
        );
        toast.success(
          `Boletim confirmado! Valor final: ${formatBRL(res.data.valorFinal)}`,
        );
        (e.target as HTMLFormElement).reset();
        (document.getElementById("input-lanc-id") as HTMLInputElement).value =
          "";
        (
          document.getElementById("etapa2-selecionado") as HTMLElement
        ).style.display = "none";
        carregarPendentesVenda();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao confirmar boletim",
        );
      }
    });
}

async function carregarPendentesVenda() {
  const el = document.getElementById("lista-pendentes-venda");
  if (!el) return;

  try {
    const res = await api.get<{
      data: Array<{
        id: string;
        descricao: string;
        data: string;
        valor_estimado: string | null;
        status: string;
      }>;
    }>("/financeiro/lancamentos/pendentes");

    const vendas = res.data.filter(
      (l) =>
        l.descricao.toLowerCase().includes("venda") ||
        l.descricao.toLowerCase().includes("frigorifico") ||
        l.descricao.toLowerCase().includes("frigorifico"),
    );

    if (vendas.length === 0) {
      el.innerHTML = `
        <div class="empty-state" style="padding:var(--sp-6)">
          <p style="font-size:1.5rem;opacity:.4;text-align:center;margin-bottom:var(--sp-3)">OK</p>
          <p class="text-muted text-sm" style="text-align:center">Nenhuma venda aguardando boletim.</p>
          <p class="text-muted text-sm" style="text-align:center;margin-top:var(--sp-2)">Use a Etapa 1 para registrar saidas.</p>
        </div>`;
      return;
    }

    el.innerHTML = vendas
      .map(
        (v) => `
      <div class="venda-pendente-item" data-id="${v.id}" data-descricao="${v.descricao}"
        style="border:1px solid var(--cor-borda);border-radius:var(--raio-sm);padding:var(--sp-3);margin-bottom:var(--sp-2);cursor:pointer;transition:all .15s">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-weight:700;font-size:.9rem">${v.descricao}</div>
            <div class="text-sm text-muted">${formatDate(v.data)}</div>
          </div>
          <div style="text-align:right">
            ${
              v.valor_estimado
                ? `<div style="font-weight:700;color:var(--verde-medio)">${formatBRL(parseFloat(v.valor_estimado))} est.</div>`
                : '<span class="badge badge--amarelo">Aguardando</span>'
            }
          </div>
        </div>
        <div style="margin-top:var(--sp-2)">
          <button class="btn btn--primario" style="font-size:.75rem;padding:4px 12px;width:100%">
            Selecionar esta venda
          </button>
        </div>
      </div>`,
      )
      .join("");

    document.querySelectorAll(".venda-pendente-item button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".venda-pendente-item") as HTMLElement;
        const id = item.dataset.id!;
        const desc = item.dataset.descricao!;

        // Preenche o formulario
        (document.getElementById("input-lanc-id") as HTMLInputElement).value =
          id;
        (
          document.getElementById("input-frigorifico") as HTMLInputElement
        ).value = desc.includes("—") ? (desc.split("—")[1]?.trim() ?? "") : "";

        const infoEl = document.getElementById("etapa2-selecionado")!;
        infoEl.style.display = "block";
        document.getElementById("etapa2-selecionado-info")!.textContent = desc;

        // Destaca o item selecionado
        document.querySelectorAll(".venda-pendente-item").forEach((i) => {
          (i as HTMLElement).style.borderColor = "var(--cor-borda)";
          (i as HTMLElement).style.background = "";
        });
        item.style.borderColor = "var(--verde-claro)";
        item.style.background = "var(--verde-suave)";

        toast.info("Venda selecionada. Preencha os dados do boletim.");
      });
    });
  } catch {
    el.innerHTML =
      '<p class="text-muted text-sm">Erro ao carregar vendas pendentes.</p>';
  }
}

// ── ÓBITO ────────────────────────────────────────────────────────────────────

// VENDA DIRETA

function formVendaDireta(lotesOpts: string): string {
  return `
    <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-5)">
      <button class="btn btn--fantasma aba-venda-voltar" style="padding:var(--sp-2) var(--sp-4)">← Voltar</button>
    </div>
    <div class="card">
      <div class="card__title">Venda Direta para Pecuarista</div>
      <form id="form-venda-direta">
        <div class="form-grid form-grid--2">
          <div class="form-group">
            <label class="form-label">Comprador *</label>
            <input class="form-input" name="comprador" required placeholder="Nome do comprador">
          </div>
          <div class="form-group">
            <label class="form-label">Data da venda *</label>
            <input class="form-input" name="data" type="date" required value="${hoje()}">
          </div>
          <div class="form-group">
            <label class="form-label">GTA</label>
            <input class="form-input" name="numero_gta" placeholder="Numero da GTA">
          </div>
          <div class="form-group">
            <label class="form-label">Forma de pagamento *</label>
            <select class="form-select" name="forma_pagamento" required>
              <option value="avista">A vista</option>
              <option value="pix">PIX</option>
              <option value="transferencia">Transferencia</option>
              <option value="prazo">A prazo</option>
              <option value="parcelas">Parcelado</option>
            </select>
          </div>
        </div>

        <!-- Lote + tipo de preco lado a lado -->
        <div class="form-grid form-grid--2">
          <div class="form-group">
            <label class="form-label">Lote de origem *</label>
            <select class="form-select" name="lote_id" id="sel-lote-venda-direta" required>
              <option value="">Selecione o lote</option>
              ${lotesOpts}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de Precificacao *</label>
            <select class="form-select" id="sel-tipo-preco-direta">
              <option value="por_cabeca">Por cabeca (valor fixo por animal)</option>
              <option value="por_peso">Por peso vivo (@)</option>
            </select>
          </div>
        </div>

        <!-- Campo R$/@ (aparece quando por_peso) -->
        <div id="campo-arroba-global" style="display:none" class="form-grid form-grid--2">
          <div class="form-group">
            <label class="form-label">R$/@ negociado *</label>
            <input class="form-input" id="valor-arroba-global" type="number" step="0.01" placeholder="Ex: 320.00">
            <p class="text-sm text-muted" style="margin-top:4px">O valor de cada animal sera calculado automaticamente pelo peso.</p>
          </div>
        </div>

        <!-- Campo valor por cabeca global (aparece quando por_cabeca) -->
        <div id="campo-cabeca-global" class="form-grid form-grid--2">
          <div class="form-group">
            <label class="form-label">Valor por cabeca (R$)</label>
            <input class="form-input" id="valor-cabeca-global" type="number" step="0.01" placeholder="Preenche todos os animais">
            <p class="text-sm text-muted" style="margin-top:4px">Preencha para popular todos os animais. Altere individualmente se necessario.</p>
          </div>
        </div>

        <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-3)">
          <button type="button" class="btn btn--fantasma" id="btn-carregar-direta">Carregar animais do lote</button>
        </div>

        <!-- Tabela de animais -->
        <div id="tabela-animais-direta" style="display:none;margin-bottom:var(--sp-4)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-3)">
            <span class="text-sm text-muted" id="info-animais-direta"></span>
            <div style="display:flex;gap:var(--sp-2)">
              <span class="text-sm text-muted">Total:</span>
              <strong id="total-venda-direta" style="color:var(--verde-medio);font-size:1rem">R$ 0,00</strong>
            </div>
          </div>
          <div class="table-wrap">
            <table id="tb-animais-direta">
              <thead>
                <tr>
                  <th style="width:36px"></th>
                  <th>Brinco</th>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th class="text-right">Peso atual (@)</th>
                  <th class="text-right">Valor (R$)</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody id="tbody-animais-direta"></tbody>
            </table>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Observacao</label>
          <textarea class="form-textarea" name="observacao" rows="2"></textarea>
        </div>
        <button type="submit" class="btn btn--primario w-full" id="btn-confirmar-venda-direta" disabled>
          Confirmar Venda Direta
        </button>
      </form>
    </div>
  `;
}

interface AnimalDireta {
  id: string;
  brinco: string;
  nome: string | null;
  categoria: string;
  ultimo_peso_arroba: string | null;
  peso: number;
  valor: number;
  incluido: boolean;
}

function bindVendaDireta(animaisParam: Animal[]) {
  let animaisDireta: AnimalDireta[] = [];

  document.querySelector(".aba-venda-voltar")?.addEventListener("click", () => {
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = modalTipoVenda();
      bindModalTipoVenda(animaisParam, "");
    }
  });

  const getTipoPreco = () =>
    (document.getElementById("sel-tipo-preco-direta") as HTMLSelectElement)
      .value;

  // Renderiza a tabela completa — chamado apenas ao carregar ou trocar tipo
  const renderTabela = () => {
    const tbody = document.getElementById("tbody-animais-direta")!;
    const tipo = getTipoPreco();
    const arroba =
      parseFloat(
        (document.getElementById("valor-arroba-global") as HTMLInputElement)
          ?.value,
      ) || 0;

    if (tipo === "por_peso" && arroba > 0) {
      animaisDireta.forEach((a) => {
        if (a.incluido) a.valor = +(a.peso * arroba).toFixed(2);
      });
    }

    tbody.innerHTML = animaisDireta
      .map(
        (a, idx) => `
      <tr id="row-direta-${idx}" style="opacity:${a.incluido ? 1 : 0.4}">
        <td>
          <input type="checkbox" class="check-direta-row" data-idx="${idx}"
            ${a.incluido ? "checked" : ""}
            style="width:15px;height:15px;accent-color:var(--verde-medio)">
        </td>
        <td><strong>${a.brinco}</strong></td>
        <td>${a.nome ?? "-"}</td>
        <td><span class="badge badge--verde">${a.categoria}</span></td>
        <td class="text-right">
          <input type="number" step="0.001" class="form-input peso-direta-input" data-idx="${idx}"
            value="${a.peso > 0 ? a.peso : ""}" placeholder="Informe (@)"
            style="width:110px;padding:4px 8px;text-align:right">
        </td>
        <td class="text-right">
          <input type="number" step="0.01" class="form-input valor-direta-input" data-idx="${idx}"
            value="${a.incluido && a.valor > 0 ? a.valor : ""}" placeholder="-"
            style="width:110px;padding:4px 8px;text-align:right"
            ${!a.incluido ? "disabled" : ""}>
        </td>
        <td class="text-right subtotal-direta-${idx}" style="font-weight:700;color:var(--verde-medio)">
          ${a.incluido && a.valor > 0 ? formatBRL(a.valor) : "-"}
        </td>
      </tr>`,
      )
      .join("");

    atualizarTotais();
    bindLinhasTabela();
  };

  // Atualiza apenas totais e subtotais — sem re-renderizar HTML
  const atualizarTotais = () => {
    let totalGeral = 0;
    animaisDireta.forEach((a, idx) => {
      const subtotal = a.incluido ? a.valor : 0;
      totalGeral += subtotal;
      const cel = document.querySelector(`.subtotal-direta-${idx}`);
      if (cel)
        cel.textContent = a.incluido && a.valor > 0 ? formatBRL(a.valor) : "-";
    });
    document.getElementById("total-venda-direta")!.textContent =
      formatBRL(totalGeral);
    document.getElementById("info-animais-direta")!.textContent =
      `${animaisDireta.filter((a) => a.incluido).length} de ${animaisDireta.length} animal(is) incluido(s)`;
    const btnConf = document.getElementById(
      "btn-confirmar-venda-direta",
    ) as HTMLButtonElement;
    btnConf.disabled = !animaisDireta.some((a) => a.incluido && a.valor > 0);
  };

  // Bind dos eventos das linhas — chamado após renderTabela
  const bindLinhasTabela = () => {
    document
      .querySelectorAll<HTMLInputElement>(".check-direta-row")
      .forEach((cb) => {
        cb.addEventListener("change", () => {
          const idx = parseInt(cb.dataset.idx!);
          animaisDireta[idx].incluido = cb.checked;
          const row = document.getElementById(`row-direta-${idx}`);
          if (row) row.style.opacity = cb.checked ? "1" : ".4";
          const valInput = document.querySelector<HTMLInputElement>(
            `.valor-direta-input[data-idx="${idx}"]`,
          );
          if (valInput) valInput.disabled = !cb.checked;
          atualizarTotais();
        });
      });

    document
      .querySelectorAll<HTMLInputElement>(".peso-direta-input")
      .forEach((inp) => {
        inp.addEventListener("input", () => {
          const idx = parseInt(inp.dataset.idx!);
          const peso = parseFloat(inp.value) || 0;
          animaisDireta[idx].peso = peso;
          if (getTipoPreco() === "por_peso") {
            const arr =
              parseFloat(
                (
                  document.getElementById(
                    "valor-arroba-global",
                  ) as HTMLInputElement
                )?.value,
              ) || 0;
            animaisDireta[idx].valor = +(peso * arr).toFixed(2);
            const valInput = document.querySelector<HTMLInputElement>(
              `.valor-direta-input[data-idx="${idx}"]`,
            );
            if (valInput)
              valInput.value =
                animaisDireta[idx].valor > 0
                  ? String(animaisDireta[idx].valor)
                  : "";
          }
          atualizarTotais();
        });
      });

    document
      .querySelectorAll<HTMLInputElement>(".valor-direta-input")
      .forEach((inp) => {
        inp.addEventListener("input", () => {
          animaisDireta[parseInt(inp.dataset.idx!)].valor =
            parseFloat(inp.value) || 0;
          atualizarTotais();
        });
      });
  };

  // Alias para compatibilidade com chamadas existentes
  const atualizarTabela = renderTabela;

  // Toggle tipo preco
  document
    .getElementById("sel-tipo-preco-direta")
    ?.addEventListener("change", () => {
      const isPeso = getTipoPreco() === "por_peso";
      (
        document.getElementById("campo-arroba-global") as HTMLElement
      ).style.display = isPeso ? "grid" : "none";
      (
        document.getElementById("campo-cabeca-global") as HTMLElement
      ).style.display = isPeso ? "none" : "grid";
      atualizarTabela();
    });

  // R/@ global recalcula tudo
  document
    .getElementById("valor-arroba-global")
    ?.addEventListener("input", atualizarTabela);

  // Valor por cabeca global popula todos
  document
    .getElementById("valor-cabeca-global")
    ?.addEventListener("input", () => {
      const vlr =
        parseFloat(
          (document.getElementById("valor-cabeca-global") as HTMLInputElement)
            .value,
        ) || 0;
      animaisDireta.forEach((a) => {
        if (a.incluido) a.valor = vlr;
      });
      atualizarTabela();
    });

  // Carregar animais
  document
    .getElementById("btn-carregar-direta")
    ?.addEventListener("click", async () => {
      const loteId = (
        document.getElementById("sel-lote-venda-direta") as HTMLSelectElement
      ).value;
      if (!loteId) {
        toast.warning("Selecione o lote primeiro");
        return;
      }
      try {
        const res = await api.get<{
          data: Array<{
            id: string;
            brinco: string;
            nome: string | null;
            categoria: string;
            ultimo_peso_arroba: string | null;
          }>;
        }>(`/lotes/${loteId}/animais`);
        if (res.data.length === 0) {
          toast.warning("Nenhum animal neste lote");
          return;
        }

        animaisDireta = res.data.map((a) => ({
          id: a.id,
          brinco: a.brinco,
          nome: a.nome,
          categoria: a.categoria,
          ultimo_peso_arroba: a.ultimo_peso_arroba,
          peso: a.ultimo_peso_arroba ? parseFloat(a.ultimo_peso_arroba) : 0,
          valor: 0,
          incluido: true,
        }));
        (
          document.getElementById("tabela-animais-direta") as HTMLElement
        ).style.display = "block";
        atualizarTabela();
      } catch {
        toast.error("Erro ao carregar animais");
      }
    });

  // Submit
  document
    .getElementById("form-venda-direta")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const incluidos = animaisDireta.filter((a) => a.incluido && a.valor > 0);
      if (incluidos.length === 0) {
        toast.warning("Nenhum animal com valor informado");
        return;
      }

      const data = Object.fromEntries(
        new FormData(e.target as HTMLFormElement),
      );
      const tipoPreco = getTipoPreco();
      const loteId = (
        document.getElementById("sel-lote-venda-direta") as HTMLSelectElement
      ).value;
      const valorTotal = incluidos.reduce((s, a) => s + a.valor, 0);
      const arrobaGlobal =
        parseFloat(
          (document.getElementById("valor-arroba-global") as HTMLInputElement)
            ?.value,
        ) || 0;

      try {
        await api.post("/movimentacoes/venda/direta", {
          data: data.data,
          comprador: data.comprador,
          lote_id: loteId,
          animal_ids: incluidos.map((a) => a.id),
          tipo_preco: tipoPreco,
          valor_total: valorTotal,
          valor_por_arroba: tipoPreco === "por_peso" ? arrobaGlobal : undefined,
          animais_valores: incluidos.map((a) => ({
            animal_id: a.id,
            peso: a.peso,
            valor: a.valor,
          })),
          forma_pagamento: data.forma_pagamento,
          numero_gta: data.numero_gta || undefined,
          observacao: data.observacao || undefined,
        });
        toast.success(
          `Venda direta de ${incluidos.length} animal(is) registrada! Total: ${formatBRL(valorTotal)}`,
        );
        movimentacoesPage("historico");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erro ao registrar venda",
        );
      }
    });
}

function formObito(animaisOpts: string) {
  return `
    <div class="card">
      <div class="card__title">✝ Registrar Obito</div>
      <form id="form-obito">
        <div class="form-group">
          <label class="form-label">Animal *</label>
          <select class="form-select" name="animal_id" required>
            <option value="">Selecione o animal</option>
            ${animaisOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Data do óbito *</label>
          <input class="form-input" name="data" type="date" required value="${hoje()}">
        </div>
        <div class="form-group">
          <label class="form-label">Causa do óbito *</label>
          <select class="form-select" name="causa_obito" required>
            <option value="">Selecione</option>
            <option value="Doença">Doença</option>
            <option value="Acidente">Acidente</option>
            <option value="Parto">Parto</option>
            <option value="Predador">Predador</option>
            <option value="Envenenamento">Envenenamento</option>
            <option value="Causa desconhecida">Causa desconhecida</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Detalhes / Observação</label>
          <textarea class="form-textarea" name="observacao" rows="3" placeholder="Descreva os detalhes do ocorrido..."></textarea>
        </div>
        <button type="submit" class="btn btn--perigo w-full">Registrar Óbito</button>
      </form>
    </div>
  `;
}

function bindObito() {
  document
    .getElementById("form-obito")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(
        new FormData(e.target as HTMLFormElement),
      );
      const okObito = await confirmar(
        "O animal sera marcado como obito e removido do rebanho. Esta acao nao pode ser desfeita.",
        {
          titulo: "Registrar Obito",
          textoBotaoOk: "Confirmar Obito",
          tipo: "perigo",
        },
      );
      if (!okObito) return;
      try {
        await api.post("/movimentacoes/obito", {
          animal_id: data.animal_id,
          data: data.data,
          causa_obito: data.causa_obito,
          observacao: data.observacao || undefined,
        });
        toast.success("Óbito registrado. Animal removido do rebanho.");
        movimentacoesPage("historico");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
}

// ── NASCIMENTO ───────────────────────────────────────────────────────────────

function formNascimento(lotesOpts: string, animaisOpts: string) {
  void animaisOpts;
  return `
    <div class="card">
      <div class="card__title">Registrar Nascimento</div>
      <form id="form-nascimento">
        <div class="form-grid form-grid--2">
          <div class="form-group">
            <label class="form-label">Data de nascimento *</label>
            <input class="form-input" name="data" type="date" required value="${hoje()}">
          </div>
          <div class="form-group">
            <label class="form-label">Brinco *</label>
            <input class="form-input" name="brinco" required placeholder="Ex: 201">
          </div>
          <div class="form-group">
            <label class="form-label">Nome</label>
            <input class="form-input" name="nome" placeholder="Opcional">
          </div>
          <div class="form-group">
            <label class="form-label">Sexo *</label>
            <select class="form-select" name="sexo" required>
              <option value="M">Macho (Bezerro)</option>
              <option value="F">Femea (Bezerra)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Raca *</label>
            <select class="form-select" name="raca" id="sel-raca-nasc" required>
              <option value="">Carregando...</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Peso de nascimento (@)</label>
            <input class="form-input" name="peso_entrada_arroba" type="number" step="0.001" placeholder="Ex: 2.500">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Lote de destino *</label>
          <select class="form-select" name="lote_destino_id" required>
            <option value="">Selecione</option>
            ${lotesOpts}
          </select>
        </div>
        <div class="form-grid form-grid--2">
          <div class="form-group">
            <label class="form-label">Mae (matriz)</label>
            <select class="form-select" id="sel-mae" name="mae_id">
              <option value="">Nao identificada</option>
            </select>
            <p class="text-muted text-sm" style="margin-top:4px">Apenas vacas</p>
          </div>
          <div class="form-group">
            <label class="form-label">Pai (reprodutor)</label>
            <select class="form-select" id="sel-pai" name="pai_id">
              <option value="">Nao identificado</option>
            </select>
            <p class="text-muted text-sm" style="margin-top:4px">Apenas touros</p>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Observacao</label>
          <textarea class="form-textarea" name="observacao" rows="2"></textarea>
        </div>
        <button type="submit" class="btn btn--primario w-full">Registrar Nascimento</button>
      </form>
    </div>
  `;
}

function bindNascimento() {
  // Carrega racas
  api
    .get<{ data: { id: string; nome: string }[] }>("/racas")
    .then((res) => {
      const sel = document.getElementById("sel-raca-nasc");
      if (!sel) return;
      sel.innerHTML =
        '<option value="">Selecione</option>' +
        res.data
          .map((r) => `<option value="${r.nome}">${r.nome}</option>`)
          .join("");
    })
    .catch(() => {});

  // Carrega vacas para campo mae
  api
    .get<{ data: Animal[] }>("/animais?categoria=vaca&pageSize=500")
    .then((res) => {
      const sel = document.getElementById("sel-mae");
      if (!sel) return;
      res.data.forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = `${a.brinco}${a.nome ? " - " + a.nome : ""}`;
        sel.appendChild(opt);
      });
    })
    .catch(() => {});

  // Carrega touros para campo pai
  api
    .get<{ data: Animal[] }>("/animais?categoria=touro&pageSize=500")
    .then((res) => {
      const sel = document.getElementById("sel-pai");
      if (!sel) return;
      res.data.forEach((a) => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = `${a.brinco}${a.nome ? " — " + a.nome : ""}`;
        sel.appendChild(opt);
      });
    })
    .catch(() => {});

  document
    .getElementById("form-nascimento")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(
        new FormData(e.target as HTMLFormElement),
      );
      try {
        await api.post("/movimentacoes/nascimento", {
          data: data.data,
          brinco: data.brinco,
          sexo: data.sexo,
          lote_destino_id: data.lote_destino_id,
          mae_id: data.mae_id || undefined,
          pai_id: data.pai_id || undefined,
          peso_entrada_arroba: data.peso_entrada_arroba
            ? parseFloat(data.peso_entrada_arroba as string)
            : undefined,
          observacao: data.observacao || undefined,
        });
        toast.success("Nascimento registrado com sucesso!");
        movimentacoesPage("historico");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro");
      }
    });
}

// ── HISTÓRICO ────────────────────────────────────────────────────────────────

async function carregarHistoricoMov() {
  const el = document.getElementById("historico-mov");
  if (!el) return;

  try {
    const res = await api.get<{ data: MovRow[]; total: number }>(
      "/movimentacoes?pageSize=30",
    );
    const movs = res.data;

    if (movs.length === 0) {
      el.innerHTML = `
        <div class="card__title">Histórico de Movimentações</div>
        <div class="empty-state" style="padding:var(--sp-8)">
          <div class="empty-state__icon">↔</div>
          <h3>Nenhuma movimentação registrada ainda</h3>
        </div>
      `;
      return;
    }

    const linhas = movs
      .map(
        (m) => `
      <tr>
        <td>${formatDate(m.data)}</td>
        <td>${tipoBadge(m.tipo, m.direcao)}</td>
        <td><strong>${m.animal_brinco}</strong></td>
        <td><span class="badge badge--cinza">${m.animal_categoria}</span></td>
        <td>${m.origem_destino ?? '<span class="text-muted">—</span>'}</td>
        <td>${m.lote_destino_nome ?? '<span class="text-muted">—</span>'}</td>
      </tr>
    `,
      )
      .join("");

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-4)">
        <div class="card__title" style="margin-bottom:0">Histórico de Movimentações</div>
        <span class="text-muted text-sm">${res.total} registro(s)</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Tipo</th><th>Animal</th><th>Categoria</th><th>Origem/Destino</th><th>Lote</th></tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  } catch {
    el.innerHTML = `<div class="card__title">Histórico</div><p class="text-muted">Erro ao carregar.</p>`;
  }
}
