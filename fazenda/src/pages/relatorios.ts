import { api } from "../lib/api.js";
import { renderLayout } from "../components/layout.js";
import { formatBRL } from "../utils/currency.js";
import { formatDate, formatArroba } from "../utils/index.js";

type Aba = "rebanho" | "financeiro" | "pesagens" | "sanitario" | "pastagens";

function abaBtn(id: Aba, label: string, ativa: Aba) {
  return `<button class="btn ${id === ativa ? "btn--primario" : "btn--fantasma"} aba-rel" data-aba="${id}">${label}</button>`;
}

function mesAtual() {
  const now = new Date();
  return {
    ini: new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    fim: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10),
  };
}

function anoAtual() {
  const now = new Date();
  return {
    ini: `${now.getFullYear()}-01-01`,
    fim: `${now.getFullYear()}-12-31`,
  };
}

export async function relatoriosPage(abaInicial: Aba = "rebanho") {
  renderLayout(
    "Relatorios",
    '<div class="loading"><div class="spinner"></div>Carregando...</div>',
  );

  document.getElementById("app")!.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-header__title">Relatorios</h2>
        <p class="page-header__sub">Metricas e analises do sitio</p>
      </div>
      <button class="btn btn--acento" id="btn-gerar-pdf">Gerar Relatorio PDF</button>
    </div>

    <!-- Modal PDF -->
    <div class="modal-overlay" id="modal-pdf" style="display:none">
      <div class="modal">
        <h2 class="modal__title">Gerar Relatorio em PDF</h2>
        <p class="text-muted text-sm" style="margin-bottom:var(--sp-5)">
          Informe o periodo desejado. O relatorio atual sera impresso com os dados filtrados.
        </p>
        <div class="form-grid form-grid--2">
          <div class="form-group">
            <label class="form-label">Data inicial</label>
            <input class="form-input" id="pdf-data-inicio" type="date">
          </div>
          <div class="form-group">
            <label class="form-label">Data final</label>
            <input class="form-input" id="pdf-data-fim" type="date">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de relatorio</label>
          <select class="form-select" id="pdf-tipo">
            <option value="atual">Relatorio atual (aba selecionada)</option>
            <option value="completo">Relatorio completo (todas as abas)</option>
          </select>
        </div>
        <div style="background:var(--cor-surface-2);border-radius:var(--raio-sm);padding:var(--sp-3);margin-bottom:var(--sp-4)">
          <p class="text-sm text-muted">
            O sistema ira abrir a janela de impressao do navegador. 
            Selecione "Salvar como PDF" para gerar o arquivo.
          </p>
        </div>
        <div class="modal__footer">
          <button class="btn btn--fantasma" id="btn-fechar-pdf">Cancelar</button>
          <button class="btn btn--acento" id="btn-confirmar-pdf">Gerar PDF</button>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-6)">
      ${abaBtn("rebanho", "Rebanho", abaInicial)}
      ${abaBtn("financeiro", "Financeiro", abaInicial)}
      ${abaBtn("pesagens", "Pesagens", abaInicial)}
      ${abaBtn("sanitario", "Sanitario", abaInicial)}
      ${abaBtn("pastagens", "Pastagens", abaInicial)}
    </div>
    <div id="rel-conteudo"><div class="loading"><div class="spinner"></div>Carregando relatorio...</div></div>
  `;

  document.querySelectorAll(".aba-rel").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".aba-rel")
        .forEach((b) => b.classList.replace("btn--primario", "btn--fantasma"));
      btn.classList.replace("btn--fantasma", "btn--primario");
      carregarAba((btn as HTMLElement).dataset.aba as Aba);
    });
  });

  carregarAba(abaInicial);

  // Handler do botao PDF
  document.getElementById("btn-gerar-pdf")?.addEventListener("click", () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const inicioMes = hoje.slice(0, 8) + "01";
    (document.getElementById("pdf-data-inicio") as HTMLInputElement).value =
      inicioMes;
    (document.getElementById("pdf-data-fim") as HTMLInputElement).value = hoje;
    (document.getElementById("modal-pdf") as HTMLElement).style.display =
      "flex";
  });

  document.getElementById("btn-fechar-pdf")?.addEventListener("click", () => {
    (document.getElementById("modal-pdf") as HTMLElement).style.display =
      "none";
  });

  document
    .getElementById("btn-confirmar-pdf")
    ?.addEventListener("click", async () => {
      const dataInicio = (
        document.getElementById("pdf-data-inicio") as HTMLInputElement
      ).value;
      const dataFim = (
        document.getElementById("pdf-data-fim") as HTMLInputElement
      ).value;
      const tipo = (document.getElementById("pdf-tipo") as HTMLSelectElement)
        .value;

      (document.getElementById("modal-pdf") as HTMLElement).style.display =
        "none";

      if (tipo === "completo") {
        // Carrega todas as abas em sequencia
        const el = document.getElementById("rel-conteudo")!;
        const abas: Aba[] = [
          "rebanho",
          "financeiro",
          "pesagens",
          "sanitario",
          "pastagens",
        ];
        let htmlCompleto = "";
        for (const aba of abas) {
          await carregarAba(aba);
          htmlCompleto += `<div class="secao-pdf" style="page-break-after:always"><h2 style="font-family:var(--fonte-display);color:var(--verde-escuro);margin-bottom:16px;text-transform:capitalize">${aba}</h2>${el.innerHTML}</div>`;
        }
        el.innerHTML = htmlCompleto;
      }

      // Adiciona cabecalho de impressao
      const cabecalho = document.createElement("div");
      cabecalho.id = "pdf-cabecalho";
      cabecalho.style.cssText =
        "margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1a3a2a";
      cabecalho.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h1 style="font-family:Georgia,serif;font-size:1.4rem;color:#1a3a2a;margin-bottom:4px">Gestao do Sitio</h1>
          <p style="font-size:.8rem;color:#666">Sistema de Gerenciamento de Gado</p>
        </div>
        <div style="text-align:right;font-size:.8rem;color:#666">
          <p>Periodo: ${dataInicio ? dataInicio + " a " + dataFim : "Todos os registros"}</p>
          <p>Gerado em: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>
    `;
      document.querySelector(".page")?.prepend(cabecalho);

      setTimeout(() => {
        window.print();
        setTimeout(() => {
          document.getElementById("pdf-cabecalho")?.remove();
        }, 1000);
      }, 300);
    });
}

async function carregarAba(aba: Aba) {
  const el = document.getElementById("rel-conteudo")!;
  el.innerHTML =
    '<div class="loading"><div class="spinner"></div>Carregando...</div>';
  try {
    if (aba === "rebanho") await relRebanho(el);
    if (aba === "financeiro") await relFinanceiro(el);
    if (aba === "pesagens") await relPesagens(el);
    if (aba === "sanitario") await relSanitario(el);
    if (aba === "pastagens") await relPastagens(el);
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state__icon">!</div><h3>Erro ao carregar relatorio</h3><p class="text-muted mt-4">${err instanceof Error ? err.message : "Erro desconhecido"}</p></div>`;
  }
}

// RELATORIO DE REBANHO

async function relRebanho(el: HTMLElement) {
  const [totaisRes, lotesRes] = await Promise.all([
    api.get<{
      data: {
        total: number;
        porCategoria: Array<{ categoria: string; total: number }>;
      };
    }>("/animais/totais"),
    api.get<{
      data: Array<{
        id: string;
        nome: string;
        quantidade_atual: number;
        peso_medio_arroba: string | null;
        peso_total_arroba: string | null;
        pasto_nome: string | null;
        categoria_principal: string;
      }>;
    }>("/lotes"),
  ]);

  const cats = totaisRes.data.porCategoria;
  const lotes = lotesRes.data;
  const total = totaisRes.data.total;
  const pesoTotal = lotes.reduce(
    (s, l) => s + (l.peso_total_arroba ? parseFloat(l.peso_total_arroba) : 0),
    0,
  );
  const maxCat = Math.max(...cats.map((c) => c.total), 1);

  const barsHtml = cats
    .map(
      (c) => `
    <div style="margin-bottom:var(--sp-3)">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:.85rem;font-weight:700;text-transform:capitalize">${c.categoria}</span>
        <span style="font-size:.85rem;color:var(--cor-texto-3)">${c.total} (${total > 0 ? ((c.total / total) * 100).toFixed(1) : 0}%)</span>
      </div>
      <div style="height:10px;background:var(--cor-borda);border-radius:5px;overflow:hidden">
        <div style="width:${(c.total / maxCat) * 100}%;height:100%;background:var(--verde-claro);border-radius:5px"></div>
      </div>
    </div>
  `,
    )
    .join("");

  const lotesHtml = lotes
    .map(
      (l) => `
    <tr>
      <td><strong>${l.nome}</strong></td>
      <td><span class="badge badge--verde">${l.categoria_principal}</span></td>
      <td class="text-right">${l.quantidade_atual}</td>
      <td class="text-right">${l.peso_medio_arroba ? formatArroba(parseFloat(l.peso_medio_arroba)) : "-"}</td>
      <td class="text-right">${l.peso_total_arroba ? formatArroba(parseFloat(l.peso_total_arroba)) : "-"}</td>
      <td>${l.pasto_nome ?? '<span class="text-muted">-</span>'}</td>
    </tr>
  `,
    )
    .join("");

  el.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:var(--sp-6)">
      <div class="kpi kpi--verde">
        <div class="kpi__label">Total do rebanho</div>
        <div class="kpi__value">${total}</div>
        <div class="kpi__sub">animais ativos</div>
      </div>
      <div class="kpi kpi--dourado">
        <div class="kpi__label">Peso total estimado</div>
        <div class="kpi__value" style="font-size:1.4rem">${formatArroba(pesoTotal)}</div>
        <div class="kpi__sub">${(pesoTotal * 15).toFixed(0)} kg</div>
      </div>
      <div class="kpi kpi--azul">
        <div class="kpi__label">Lotes ativos</div>
        <div class="kpi__value">${lotes.length}</div>
        <div class="kpi__sub">grupos cadastrados</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5)">
      <div class="card">
        <div class="card__title">Distribuicao por Categoria</div>
        ${cats.length > 0 ? barsHtml : '<p class="text-muted">Nenhum animal cadastrado.</p>'}
      </div>
      <div class="card">
        <div class="card__title">Resumo por Lote</div>
        ${
          lotes.length > 0
            ? `
          <div class="table-wrap"><table>
            <thead><tr><th>Lote</th><th>Categoria</th><th class="text-right">Qtd</th><th class="text-right">Peso medio</th><th class="text-right">Peso total</th><th>Pasto</th></tr></thead>
            <tbody>${lotesHtml}</tbody>
          </table></div>`
            : '<p class="text-muted">Nenhum lote cadastrado.</p>'
        }
      </div>
    </div>
  `;
}

// RELATORIO FINANCEIRO

async function relFinanceiro(el: HTMLElement) {
  const { ini, fim } = anoAtual();
  const mes = mesAtual();

  const [resumoAno, resumoMes, lancamentosRes] = await Promise.all([
    api.get<{
      data: {
        totalReceitas: number;
        totalDespesas: number;
        saldo: number;
        qtdPendentes: number;
      };
    }>(`/financeiro/resumo?data_inicio=${ini}&data_fim=${fim}`),
    api.get<{
      data: { totalReceitas: number; totalDespesas: number; saldo: number };
    }>(`/financeiro/resumo?data_inicio=${mes.ini}&data_fim=${mes.fim}`),
    api.get<{
      data: Array<{
        data: string;
        tipo: string;
        categoria_nome: string;
        descricao: string;
        valor_efetivo: string | null;
        status: string;
        pago: boolean;
      }>;
    }>(
      `/financeiro/lancamentos?data_inicio=${ini}&data_fim=${fim}&pageSize=100`,
    ),
  ]);

  const ano = resumoAno.data;
  const mesData = resumoMes.data;
  const lancamentos = lancamentosRes.data;

  const porCategoria = lancamentos.reduce(
    (acc, l) => {
      const key = `${l.tipo}::${l.categoria_nome}`;
      if (!acc[key])
        acc[key] = { tipo: l.tipo, nome: l.categoria_nome, total: 0 };
      acc[key].total += parseFloat(l.valor_efetivo ?? "0");
      return acc;
    },
    {} as Record<string, { tipo: string; nome: string; total: number }>,
  );

  const receitasCat = Object.values(porCategoria)
    .filter((c) => c.tipo === "receita")
    .sort((a, b) => b.total - a.total);
  const despesasCat = Object.values(porCategoria)
    .filter((c) => c.tipo === "despesa")
    .sort((a, b) => b.total - a.total);
  const maxReceita = Math.max(...receitasCat.map((c) => c.total), 1);
  const maxDespesa = Math.max(...despesasCat.map((c) => c.total), 1);

  const barCat = (items: typeof receitasCat, max: number, cor: string) =>
    items
      .map(
        (c) => `
      <div style="margin-bottom:var(--sp-3)">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:.82rem;font-weight:700">${c.nome}</span>
          <span style="font-size:.82rem;color:var(--cor-texto-3)">${formatBRL(c.total)}</span>
        </div>
        <div style="height:8px;background:var(--cor-borda);border-radius:4px;overflow:hidden">
          <div style="width:${(c.total / max) * 100}%;height:100%;background:${cor};border-radius:4px"></div>
        </div>
      </div>
    `,
      )
      .join("");

  const ultimosHtml = lancamentos
    .slice(0, 10)
    .map(
      (l) => `
    <tr>
      <td>${formatDate(l.data)}</td>
      <td>${l.categoria_nome}</td>
      <td>${l.descricao}</td>
      <td class="text-right" style="font-weight:700;color:${l.tipo === "receita" ? "var(--verde-medio)" : "var(--cor-perigo)"}">
        ${l.tipo === "receita" ? "+" : "-"}${l.valor_efetivo ? formatBRL(parseFloat(l.valor_efetivo)) : "-"}
      </td>
      <td>${l.pago ? '<span class="badge badge--verde">Pago</span>' : l.status === "pendente" ? '<span class="badge badge--amarelo">Pendente</span>' : '<span class="badge badge--azul">Confirmado</span>'}</td>
    </tr>
  `,
    )
    .join("");

  el.innerHTML = `
    <p class="text-muted text-sm" style="margin-bottom:var(--sp-2)">Mes atual</p>
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:var(--sp-6)">
      <div class="kpi kpi--dourado"><div class="kpi__label">Receitas</div><div class="kpi__value" style="font-size:1.5rem">${formatBRL(mesData.totalReceitas)}</div></div>
      <div class="kpi kpi--terra"><div class="kpi__label">Despesas</div><div class="kpi__value" style="font-size:1.5rem">${formatBRL(mesData.totalDespesas)}</div></div>
      <div class="kpi ${mesData.saldo >= 0 ? "kpi--verde" : "kpi--terra"}"><div class="kpi__label">Saldo</div><div class="kpi__value" style="font-size:1.5rem">${formatBRL(mesData.saldo)}</div></div>
    </div>
    <p class="text-muted text-sm" style="margin-bottom:var(--sp-2)">Ano ${new Date().getFullYear()}</p>
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:var(--sp-6)">
      <div class="kpi kpi--dourado"><div class="kpi__label">Receitas</div><div class="kpi__value" style="font-size:1.3rem">${formatBRL(ano.totalReceitas)}</div></div>
      <div class="kpi kpi--terra"><div class="kpi__label">Despesas</div><div class="kpi__value" style="font-size:1.3rem">${formatBRL(ano.totalDespesas)}</div></div>
      <div class="kpi ${ano.saldo >= 0 ? "kpi--verde" : "kpi--terra"}"><div class="kpi__label">Saldo anual</div><div class="kpi__value" style="font-size:1.3rem">${formatBRL(ano.saldo)}</div></div>
      <div class="kpi kpi--azul"><div class="kpi__label">Pendentes</div><div class="kpi__value">${ano.qtdPendentes}</div><div class="kpi__sub">lancamentos</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-bottom:var(--sp-5)">
      <div class="card">
        <div class="card__title">Receitas por Categoria (ano)</div>
        ${receitasCat.length > 0 ? barCat(receitasCat, maxReceita, "var(--verde-claro)") : '<p class="text-muted">Sem receitas no periodo.</p>'}
      </div>
      <div class="card">
        <div class="card__title">Despesas por Categoria (ano)</div>
        ${despesasCat.length > 0 ? barCat(despesasCat, maxDespesa, "var(--terra-claro)") : '<p class="text-muted">Sem despesas no periodo.</p>'}
      </div>
    </div>
    <div class="card">
      <div class="card__title">Ultimos Lancamentos</div>
      ${
        lancamentos.length > 0
          ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Data</th><th>Categoria</th><th>Descricao</th><th class="text-right">Valor</th><th>Status</th></tr></thead>
          <tbody>${ultimosHtml}</tbody>
        </table></div>`
          : '<p class="text-muted">Nenhum lancamento no periodo.</p>'
      }
    </div>
  `;
}

// RELATORIO DE PESAGENS

async function relPesagens(el: HTMLElement) {
  const lotesRes = await api.get<{
    data: Array<{
      id: string;
      nome: string;
      quantidade_atual: number;
      peso_medio_arroba: string | null;
      peso_total_arroba: string | null;
      data_ultima_pesagem: string | null;
      categoria_principal: string;
    }>;
  }>("/lotes");
  const lotes = lotesRes.data;

  const pesoTotal = lotes.reduce(
    (s, l) => s + (l.peso_total_arroba ? parseFloat(l.peso_total_arroba) : 0),
    0,
  );
  const lotesComPeso = lotes.filter((l) => l.peso_medio_arroba);
  const mediaPeso =
    lotesComPeso.length > 0
      ? lotesComPeso.reduce((s, l) => s + parseFloat(l.peso_medio_arroba!), 0) /
        lotesComPeso.length
      : 0;
  const semPesagem = lotes.filter(
    (l) =>
      !l.data_ultima_pesagem ||
      Math.round(
        (Date.now() - new Date(l.data_ultima_pesagem).getTime()) / 86400000,
      ) > 30,
  ).length;

  const lotesHtml = lotes
    .map((l) => {
      const dias = l.data_ultima_pesagem
        ? Math.round(
            (Date.now() - new Date(l.data_ultima_pesagem).getTime()) / 86400000,
          )
        : null;
      const alerta = dias !== null && dias > 30;
      return `
      <tr>
        <td><strong>${l.nome}</strong></td>
        <td><span class="badge badge--verde">${l.categoria_principal}</span></td>
        <td class="text-right">${l.quantidade_atual}</td>
        <td class="text-right">${l.peso_medio_arroba ? formatArroba(parseFloat(l.peso_medio_arroba)) : '<span class="text-muted">-</span>'}</td>
        <td class="text-right">${l.peso_total_arroba ? formatArroba(parseFloat(l.peso_total_arroba)) : '<span class="text-muted">-</span>'}</td>
        <td>${
          l.data_ultima_pesagem
            ? `<span class="${alerta ? "badge badge--amarelo" : "badge badge--verde"}">${formatDate(l.data_ultima_pesagem)}${alerta ? ` (${dias}d)` : ""}</span>`
            : '<span class="badge badge--vermelho">Nunca pesado</span>'
        }</td>
      </tr>
    `;
    })
    .join("");

  el.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:var(--sp-6)">
      <div class="kpi kpi--verde">
        <div class="kpi__label">Peso total do rebanho</div>
        <div class="kpi__value" style="font-size:1.4rem">${formatArroba(pesoTotal)}</div>
        <div class="kpi__sub">${(pesoTotal * 15).toFixed(0)} kg estimado</div>
      </div>
      <div class="kpi kpi--dourado">
        <div class="kpi__label">Peso medio por lote</div>
        <div class="kpi__value" style="font-size:1.4rem">${mediaPeso > 0 ? formatArroba(mediaPeso) : "-"}</div>
        <div class="kpi__sub">media entre lotes pesados</div>
      </div>
      <div class="kpi kpi--azul">
        <div class="kpi__label">Lotes pendentes</div>
        <div class="kpi__value">${semPesagem}</div>
        <div class="kpi__sub">sem pesagem ha +30 dias</div>
      </div>
    </div>
    <div class="card">
      <div class="card__title">Status de Pesagem por Lote</div>
      ${
        lotes.length > 0
          ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Lote</th><th>Categoria</th><th class="text-right">Animais</th><th class="text-right">Peso medio</th><th class="text-right">Peso total</th><th>Ultima pesagem</th></tr></thead>
          <tbody>${lotesHtml}</tbody>
        </table></div>`
          : '<p class="text-muted">Nenhum lote cadastrado.</p>'
      }
    </div>
  `;
}

// RELATORIO SANITARIO

async function relSanitario(el: HTMLElement) {
  const [eventosRes, alertasRes] = await Promise.all([
    api.get<{
      data: Array<{
        tipo: string;
        produto: string;
        data_aplicacao: string;
        quantidade_animais: number;
        custo_total: string | null;
        escopo: string;
        lote_nome: string | null;
      }>;
    }>("/saude?pageSize=100"),
    api.get<{
      data: Array<{
        produto: string;
        tipo: string;
        data_proxima: string | null;
        quantidade_animais: number;
      }>;
    }>("/saude/proximos-reforcos?dias=60"),
  ]);

  const eventos = eventosRes.data;
  const alertas = alertasRes.data;
  const custoTotal = eventos.reduce(
    (s, e) => s + (e.custo_total ? parseFloat(e.custo_total) : 0),
    0,
  );

  const porTipo = eventos.reduce(
    (acc, e) => {
      if (!acc[e.tipo]) acc[e.tipo] = { tipo: e.tipo, total: 0, custo: 0 };
      acc[e.tipo].total += e.quantidade_animais;
      acc[e.tipo].custo += e.custo_total ? parseFloat(e.custo_total) : 0;
      return acc;
    },
    {} as Record<string, { tipo: string; total: number; custo: number }>,
  );

  const porTipoHtml = Object.values(porTipo)
    .map(
      (t) => `
    <tr>
      <td><span class="badge badge--verde">${t.tipo}</span></td>
      <td class="text-right">${eventos.filter((e) => e.tipo === t.tipo).length}</td>
      <td class="text-right">${t.total}</td>
      <td class="text-right">${formatBRL(t.custo)}</td>
    </tr>
  `,
    )
    .join("");

  const ultimosHtml = eventos
    .slice(0, 8)
    .map(
      (e) => `
    <tr>
      <td>${formatDate(e.data_aplicacao)}</td>
      <td><span class="badge badge--verde">${e.tipo}</span></td>
      <td><strong>${e.produto}</strong></td>
      <td>${e.escopo === "todos" ? '<span class="badge badge--amarelo">Todo rebanho</span>' : (e.lote_nome ?? e.escopo)}</td>
      <td class="text-right">${e.quantidade_animais}</td>
      <td class="text-right">${e.custo_total ? formatBRL(parseFloat(e.custo_total)) : "-"}</td>
    </tr>
  `,
    )
    .join("");

  const alertasHtml = alertas
    .slice(0, 5)
    .map(
      (a) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-3);background:var(--cor-surface-2);border-radius:var(--raio-sm);margin-bottom:var(--sp-2)">
      <div>
        <div style="font-weight:700;font-size:.85rem">${a.produto}</div>
        <div class="text-muted text-sm">${a.tipo} - ${a.quantidade_animais} animais</div>
      </div>
      <span class="badge badge--amarelo">${a.data_proxima ? formatDate(a.data_proxima) : "-"}</span>
    </div>
  `,
    )
    .join("");

  el.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:var(--sp-6)">
      <div class="kpi kpi--verde">
        <div class="kpi__label">Total de eventos</div>
        <div class="kpi__value">${eventos.length}</div>
        <div class="kpi__sub">registros sanitarios</div>
      </div>
      <div class="kpi kpi--terra">
        <div class="kpi__label">Custo total sanidade</div>
        <div class="kpi__value" style="font-size:1.4rem">${formatBRL(custoTotal)}</div>
        <div class="kpi__sub">todos os eventos</div>
      </div>
      <div class="kpi ${alertas.length > 0 ? "kpi--terra" : "kpi--verde"}">
        <div class="kpi__label">Reforcos pendentes</div>
        <div class="kpi__value">${alertas.length}</div>
        <div class="kpi__sub">proximos 60 dias</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-bottom:var(--sp-5)">
      <div class="card">
        <div class="card__title">Eventos por Tipo</div>
        ${
          Object.keys(porTipo).length > 0
            ? `
          <div class="table-wrap"><table>
            <thead><tr><th>Tipo</th><th class="text-right">Eventos</th><th class="text-right">Animais</th><th class="text-right">Custo</th></tr></thead>
            <tbody>${porTipoHtml}</tbody>
          </table></div>`
            : '<p class="text-muted">Nenhum evento registrado.</p>'
        }
      </div>
      <div class="card">
        <div class="card__title">Proximos Reforcos (60 dias)</div>
        ${alertas.length > 0 ? alertasHtml : '<p class="text-muted" style="padding:var(--sp-4)">Nenhum reforco pendente.</p>'}
      </div>
    </div>
    <div class="card">
      <div class="card__title">Historico de Eventos</div>
      ${
        eventos.length > 0
          ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Data</th><th>Tipo</th><th>Produto</th><th>Lote</th><th class="text-right">Animais</th><th class="text-right">Custo</th></tr></thead>
          <tbody>${ultimosHtml}</tbody>
        </table></div>`
          : '<p class="text-muted">Nenhum evento registrado.</p>'
      }
    </div>
  `;
}

// RELATORIO DE PASTAGENS

async function relPastagens(el: HTMLElement) {
  const pastosRes = await api.get<{
    data: Array<{
      id: string;
      nome: string;
      area_hectares: string;
      tipo_capim: string | null;
      capacidade_ua: string | null;
      lote_atual_nome: string | null;
      quantidade_animais_atual: number | null;
      percentual_lotacao: number | null;
    }>;
  }>("/pastos");
  const pastos = pastosRes.data;

  const areaTotal = pastos.reduce((s, p) => s + parseFloat(p.area_hectares), 0);
  const animaisTotal = pastos.reduce(
    (s, p) => s + (p.quantidade_animais_atual ?? 0),
    0,
  );
  const uaPorHa = areaTotal > 0 ? (animaisTotal / areaTotal).toFixed(2) : "0";

  const pastosHtml = pastos
    .map((p) => {
      const pct = p.percentual_lotacao;
      const cor =
        pct !== null
          ? pct > 90
            ? "var(--cor-perigo)"
            : pct > 70
              ? "var(--cor-aviso)"
              : "var(--verde-claro)"
          : "var(--cor-borda)";
      return `
      <tr>
        <td><strong>${p.nome}</strong></td>
        <td>${parseFloat(p.area_hectares).toFixed(1)} ha</td>
        <td>${p.tipo_capim ?? "-"}</td>
        <td class="text-right">${p.capacidade_ua ?? "-"}</td>
        <td class="text-right">${p.quantidade_animais_atual ?? 0}</td>
        <td>${p.lote_atual_nome ?? '<span class="text-muted">-</span>'}</td>
        <td>${
          pct !== null
            ? `
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:6px;background:var(--cor-borda);border-radius:3px;overflow:hidden">
              <div style="width:${Math.min(pct, 100)}%;height:100%;background:${cor}"></div>
            </div>
            <span style="font-size:.8rem;font-weight:700;color:${cor};min-width:36px">${pct.toFixed(0)}%</span>
          </div>`
            : '<span class="text-muted text-sm">-</span>'
        }
        </td>
      </tr>
    `;
    })
    .join("");

  el.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:var(--sp-6)">
      <div class="kpi kpi--verde">
        <div class="kpi__label">Area total</div>
        <div class="kpi__value" style="font-size:1.4rem">${areaTotal.toFixed(1)}</div>
        <div class="kpi__sub">hectares cadastrados</div>
      </div>
      <div class="kpi kpi--dourado">
        <div class="kpi__label">Lotacao media</div>
        <div class="kpi__value" style="font-size:1.4rem">${uaPorHa}</div>
        <div class="kpi__sub">animais/hectare</div>
      </div>
      <div class="kpi kpi--azul">
        <div class="kpi__label">Pastos cadastrados</div>
        <div class="kpi__value">${pastos.length}</div>
        <div class="kpi__sub">areas de pastagem</div>
      </div>
    </div>
    <div class="card">
      <div class="card__title">Situacao das Pastagens</div>
      ${
        pastos.length > 0
          ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Pasto</th><th>Area</th><th>Capim</th><th class="text-right">Cap. UA</th><th class="text-right">Animais</th><th>Lote atual</th><th>Lotacao</th></tr></thead>
          <tbody>${pastosHtml}</tbody>
        </table></div>`
          : '<p class="text-muted">Nenhum pasto cadastrado.</p>'
      }
    </div>
  `;
}
