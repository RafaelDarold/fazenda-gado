import { api } from "../lib/api.js";
import { renderLayout } from "../components/layout.js";
import { formatBRL } from "../utils/currency.js";
import { formatDate, formatArroba } from "../utils/index.js";

type Aba =
  | "rebanho"
  | "financeiro"
  | "pesagens"
  | "sanitario"
  | "movimentacoes";
type TipoRelatorio = "resumido" | "completo";

function abaBtn(id: Aba, label: string, ativa: Aba) {
  return `<button class="btn ${id === ativa ? "btn--primario" : "btn--fantasma"} aba-rel" data-aba="${id}">${label}</button>`;
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}
function mesIni() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10);
}

// ── Utilitários de impressão ────────────────────────────────────────────────

function cabecalhoPDF(
  fazenda: any,
  titulo: string,
  dataIni: string,
  dataFim: string,
): string {
  return `
    <div class="pdf-cabecalho" style="
      display:flex;justify-content:space-between;align-items:flex-start;
      padding-bottom:16px;margin-bottom:20px;
      border-bottom:2px solid #1a3a2a;
    ">
      <div style="display:flex;align-items:center;gap:16px">
        ${
          fazenda?.logo_url
            ? `<img src="${fazenda.logo_url}" style="height:64px;width:64px;object-fit:contain;border-radius:8px">`
            : `<div style="width:64px;height:64px;background:#1a3a2a;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.8rem">🐄</div>`
        }
        <div>
          <div style="font-family:Georgia,serif;font-size:1.4rem;font-weight:700;color:#1a3a2a">${fazenda?.nome ?? "Gestao do Sitio"}</div>
          ${fazenda?.razao_social ? `<div style="font-size:.8rem;color:#555">${fazenda.razao_social}${fazenda.cnpj ? ` — CNPJ: ${fazenda.cnpj}` : ""}</div>` : ""}
          ${fazenda?.endereco ? `<div style="font-size:.8rem;color:#555">${fazenda.endereco}</div>` : ""}
          ${fazenda?.telefone || fazenda?.email ? `<div style="font-size:.8rem;color:#555">${[fazenda.telefone, fazenda.email].filter(Boolean).join(" — ")}</div>` : ""}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:1rem;font-weight:700;color:#1a3a2a;margin-bottom:4px">${titulo}</div>
        <div style="font-size:.8rem;color:#555">Periodo: ${formatDate(dataIni)} a ${formatDate(dataFim)}</div>
        <div style="font-size:.75rem;color:#888;margin-top:4px">Gerado em: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    </div>
  `;
}

function secaoTitulo(titulo: string): string {
  return `<div style="background:#1a3a2a;color:#fff;padding:8px 14px;font-weight:700;font-size:.85rem;letter-spacing:.05em;text-transform:uppercase;margin:20px 0 10px;border-radius:4px">${titulo}</div>`;
}

function tabelaEstilo(): string {
  return `<style>
    .pdf-tabela { width:100%;border-collapse:collapse;font-size:.82rem;margin-bottom:12px }
    .pdf-tabela th { background:#f0ead6;color:#1a3a2a;padding:7px 10px;text-align:left;font-weight:700;font-size:.72rem;letter-spacing:.05em;text-transform:uppercase;border-bottom:2px solid #1a3a2a }
    .pdf-tabela td { padding:6px 10px;border-bottom:1px solid #e2d9c5;color:#1e1a14 }
    .pdf-tabela tr:last-child td { border-bottom:none }
    .pdf-tabela .total-row td { background:#f0ead6;font-weight:700;border-top:2px solid #1a3a2a }
    .pdf-bloco { border:1px solid #e2d9c5;border-radius:8px;padding:14px;margin-bottom:14px;break-inside:avoid }
    .pdf-bloco-header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2d9c5 }
    .pdf-label { font-size:.7rem;color:#9a8f7a;text-transform:uppercase;letter-spacing:.04em }
    .pdf-value { font-weight:600;color:#1e1a14 }
    .pdf-grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px }
    .pdf-grid-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px }
    .pdf-kpi { background:#f5f2eb;border-radius:6px;padding:10px 14px }
    .pdf-kpi-valor { font-family:Georgia,serif;font-size:1.3rem;font-weight:700;color:#1a3a2a }
    @media print {
      .sidebar,.topbar,.btn,.aba-rel,.filters,.page-header button,#modal-pdf { display:none!important }
      .main { margin-left:0!important;grid-column:1!important }
      .page { padding:0!important }
      body { background:white!important }
    }
  </style>`;
}

// ── Geração de relatórios ───────────────────────────────────────────────────

async function gerarRelatorio(
  tipo: TipoRelatorio,
  aba: Aba | "todas",
  dataIni: string,
  dataFim: string,
): Promise<string> {
  // Busca dados da fazenda selecionada
  const fazendaId = localStorage.getItem("fazenda_selecionada_id");
  const fazenda = fazendaId
    ? await api
        .get<{ data: any }>(`/fazendas/${fazendaId}`)
        .then((r) => r.data)
        .catch(() => null)
    : null;

  const secoes: string[] = [];
  const abas: Aba[] =
    aba === "todas"
      ? ["rebanho", "financeiro", "pesagens", "sanitario", "movimentacoes"]
      : [aba];

  for (const a of abas) {
    try {
      if (a === "rebanho")
        secoes.push(await secaoRebanho(tipo, dataIni, dataFim));
      if (a === "financeiro")
        secoes.push(await secaoFinanceiro(tipo, dataIni, dataFim));
      if (a === "pesagens")
        secoes.push(await secaoPesagens(tipo, dataIni, dataFim));
      if (a === "sanitario")
        secoes.push(await secaoSanitario(tipo, dataIni, dataFim));
      if (a === "movimentacoes")
        secoes.push(await secaoMovimentacoes(tipo, dataIni, dataFim));
    } catch {
      /* ignora seção com erro */
    }
  }

  const tituloRelatorio = `Relatorio ${tipo === "resumido" ? "Resumido" : "Completo"}${aba !== "todas" ? " — " + aba.charAt(0).toUpperCase() + aba.slice(1) : ""}`;

  return `
    ${tabelaEstilo()}
    ${cabecalhoPDF(fazenda, tituloRelatorio, dataIni, dataFim)}
    ${secoes.join("")}
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2d9c5;display:flex;justify-content:space-between;font-size:.72rem;color:#9a8f7a">
      <span>Data/Hora: ${new Date().toLocaleString("pt-BR")}</span>
      <span>${fazenda?.nome ?? "Gestao do Sitio"} — Sistema de Gerenciamento de Gado</span>
    </div>
  `;
}

// ── Seção Rebanho ──────────────────────────────────────────────────────────

async function secaoRebanho(
  tipo: TipoRelatorio,
  _ini: string,
  _fim: string,
): Promise<string> {
  const [animaisRes, totaisRes] = await Promise.all([
    api.get<{ data: any[] }>("/animais?pageSize=500"),
    api.get<{ data: { total: number; porCategoria: any[] } }>(
      "/animais/totais",
    ),
  ]);
  const animais = animaisRes.data;
  const totais = totaisRes.data;

  const kpis = `
    <div class="pdf-grid-3">
      <div class="pdf-kpi"><div class="pdf-label">Total do Rebanho</div><div class="pdf-kpi-valor">${totais.total}</div><div style="font-size:.75rem;color:#9a8f7a">animais ativos</div></div>
      ${totais.porCategoria
        .map(
          (c: any) =>
            `<div class="pdf-kpi"><div class="pdf-label">${c.categoria}</div><div class="pdf-kpi-valor">${c.total}</div></div>`,
        )
        .join("")}
    </div>`;

  if (tipo === "resumido") {
    const linhas = animais
      .map(
        (a: any) => `
      <tr>
        <td><strong>${a.brinco}</strong></td>
        <td>${a.nome ?? "-"}</td>
        <td>${a.categoria}</td>
        <td>${a.raca}</td>
        <td>${a.sexo === "M" ? "Macho" : "Femea"}</td>
        <td>${a.lote_nome ?? "-"}</td>
        <td style="text-align:right">${a.ultimo_peso_arroba ? formatArroba(parseFloat(a.ultimo_peso_arroba)) : "-"}</td>
      </tr>`,
      )
      .join("");
    return `
      ${secaoTitulo("Rebanho")}
      ${kpis}
      <table class="pdf-tabela">
        <thead><tr><th>Brinco</th><th>Nome</th><th>Categoria</th><th>Raca</th><th>Sexo</th><th>Lote</th><th>Ultimo Peso</th></tr></thead>
        <tbody>${linhas}</tbody>
        <tr class="total-row"><td colspan="6"><strong>Total</strong></td><td style="text-align:right"><strong>${totais.total} animais</strong></td></tr>
      </table>`;
  }

  // Completo — bloco por animal
  const blocos = animais
    .map(
      (a: any) => `
    <div class="pdf-bloco">
      <div class="pdf-bloco-header">
        <div>
          <strong style="font-size:.95rem">Brinco ${a.brinco}${a.nome ? " — " + a.nome : ""}</strong>
          <span style="margin-left:8px;background:#d8f3dc;color:#1b7a3b;font-size:.7rem;padding:2px 8px;border-radius:20px">${a.categoria}</span>
        </div>
        <div style="text-align:right;font-size:.8rem;color:#555">${a.lote_nome ?? "Sem lote"}</div>
      </div>
      <div class="pdf-grid-3">
        <div><div class="pdf-label">Raca</div><div class="pdf-value">${a.raca}</div></div>
        <div><div class="pdf-label">Sexo</div><div class="pdf-value">${a.sexo === "M" ? "Macho" : "Femea"}</div></div>
        <div><div class="pdf-label">Nascimento</div><div class="pdf-value">${a.data_nascimento ? formatDate(a.data_nascimento) : "-"}</div></div>
        <div><div class="pdf-label">Peso entrada</div><div class="pdf-value">${a.peso_entrada_arroba ? formatArroba(parseFloat(a.peso_entrada_arroba)) : "-"}</div></div>
        <div><div class="pdf-label">Ultimo peso</div><div class="pdf-value">${a.ultimo_peso_arroba ? formatArroba(parseFloat(a.ultimo_peso_arroba)) : "-"}</div></div>
        <div><div class="pdf-label">GMD</div><div class="pdf-value">${a.gmd_arroba ? parseFloat(a.gmd_arroba).toFixed(4) + " @/dia" : "-"}</div></div>
      </div>
      ${a.observacao ? `<div style="font-size:.78rem;color:#555;margin-top:6px">Obs: ${a.observacao}</div>` : ""}
    </div>`,
    )
    .join("");
  return `${secaoTitulo("Rebanho")}${kpis}${blocos}`;
}

// ── Seção Financeiro ───────────────────────────────────────────────────────

async function secaoFinanceiro(
  tipo: TipoRelatorio,
  ini: string,
  fim: string,
): Promise<string> {
  const [resumoRes, lancamentosRes] = await Promise.all([
    api.get<{ data: any }>(
      `/financeiro/resumo?data_inicio=${ini}&data_fim=${fim}`,
    ),
    api.get<{ data: any[] }>(
      `/financeiro/lancamentos?data_inicio=${ini}&data_fim=${fim}&pageSize=500`,
    ),
  ]);
  const resumo = resumoRes.data;
  const lancamentos = lancamentosRes.data;

  const kpis = `
    <div class="pdf-grid-3">
      <div class="pdf-kpi"><div class="pdf-label">Receitas</div><div class="pdf-kpi-valor" style="color:#2d6a4f">${formatBRL(resumo.totalReceitas)}</div></div>
      <div class="pdf-kpi"><div class="pdf-label">Despesas</div><div class="pdf-kpi-valor" style="color:#c0392b">${formatBRL(resumo.totalDespesas)}</div></div>
      <div class="pdf-kpi"><div class="pdf-label">Saldo</div><div class="pdf-kpi-valor" style="color:${resumo.saldo >= 0 ? "#2d6a4f" : "#c0392b"}">${formatBRL(resumo.saldo)}</div></div>
    </div>`;

  if (tipo === "resumido") {
    const linhas = lancamentos
      .map(
        (l: any) => `
      <tr>
        <td>${formatDate(l.data)}</td>
        <td>${l.descricao}</td>
        <td>${l.categoria_nome ?? "-"}</td>
        <td><span style="color:${l.tipo === "receita" ? "#2d6a4f" : "#c0392b"};font-weight:700">${l.tipo === "receita" ? "Receita" : "Despesa"}</span></td>
        <td>${l.forma_pagamento ?? "-"}</td>
        <td style="text-align:right;font-weight:700;color:${l.tipo === "receita" ? "#2d6a4f" : "#c0392b"}">${formatBRL(l.valor_final ?? l.valor_estimado ?? 0)}</td>
      </tr>`,
      )
      .join("");
    const totalReceitas = lancamentos
      .filter((l: any) => l.tipo === "receita")
      .reduce((s: number, l: any) => s + parseFloat(l.valor_final ?? 0), 0);
    const totalDespesas = lancamentos
      .filter((l: any) => l.tipo === "despesa")
      .reduce((s: number, l: any) => s + parseFloat(l.valor_final ?? 0), 0);
    return `
      ${secaoTitulo("Financeiro")}
      ${kpis}
      <table class="pdf-tabela">
        <thead><tr><th>Data</th><th>Descricao</th><th>Categoria</th><th>Tipo</th><th>Pagamento</th><th>Valor</th></tr></thead>
        <tbody>${linhas}</tbody>
        <tr class="total-row">
          <td colspan="5"><strong>Total Receitas: ${formatBRL(totalReceitas)} | Total Despesas: ${formatBRL(totalDespesas)}</strong></td>
          <td style="text-align:right"><strong>${formatBRL(resumo.saldo)}</strong></td>
        </tr>
      </table>`;
  }

  // Completo
  const blocos = lancamentos
    .map(
      (l: any) => `
    <div class="pdf-bloco">
      <div class="pdf-bloco-header">
        <div>
          <span style="color:${l.tipo === "receita" ? "#2d6a4f" : "#c0392b"};font-weight:700;font-size:.8rem">${l.tipo === "receita" ? "▲ RECEITA" : "▼ DESPESA"}</span>
          <strong style="margin-left:8px">${l.descricao}</strong>
        </div>
        <strong style="font-size:1rem;color:${l.tipo === "receita" ? "#2d6a4f" : "#c0392b"}">${formatBRL(l.valor_final ?? l.valor_estimado ?? 0)}</strong>
      </div>
      <div class="pdf-grid-3">
        <div><div class="pdf-label">Data</div><div class="pdf-value">${formatDate(l.data)}</div></div>
        <div><div class="pdf-label">Categoria</div><div class="pdf-value">${l.categoria_nome ?? "-"}</div></div>
        <div><div class="pdf-label">Forma de pagamento</div><div class="pdf-value">${l.forma_pagamento ?? "-"}</div></div>
        <div><div class="pdf-label">Status</div><div class="pdf-value">${l.status ?? "-"}</div></div>
        <div><div class="pdf-label">Vencimento</div><div class="pdf-value">${l.data_vencimento ? formatDate(l.data_vencimento) : "-"}</div></div>
      </div>
      ${l.observacao ? `<div style="font-size:.78rem;color:#555;margin-top:6px">Obs: ${l.observacao}</div>` : ""}
    </div>`,
    )
    .join("");
  return `${secaoTitulo("Financeiro")}${kpis}${blocos}`;
}

// ── Seção Pesagens ────────────────────────────────────────────────────────

async function secaoPesagens(
  tipo: TipoRelatorio,
  ini: string,
  fim: string,
): Promise<string> {
  const res = await api.get<{ data: any[] }>(
    `/pesagens/relatorio?data_inicio=${ini}&data_fim=${fim}`,
  );
  const pesagens = res.data;
  const totalPeso = pesagens.reduce(
    (s: number, p: any) => s + parseFloat(p.peso_arroba ?? 0),
    0,
  );
  const mediaPeso = pesagens.length > 0 ? totalPeso / pesagens.length : 0;

  const kpis = `
    <div class="pdf-grid-3">
      <div class="pdf-kpi"><div class="pdf-label">Total de pesagens</div><div class="pdf-kpi-valor">${pesagens.length}</div></div>
      <div class="pdf-kpi"><div class="pdf-label">Peso medio</div><div class="pdf-kpi-valor">${formatArroba(mediaPeso)}</div></div>
      <div class="pdf-kpi"><div class="pdf-label">Peso total</div><div class="pdf-kpi-valor">${formatArroba(totalPeso)}</div></div>
    </div>`;

  if (tipo === "resumido") {
    const linhas = pesagens
      .map(
        (p: any) => `
      <tr>
        <td>${formatDate(p.data)}</td>
        <td><strong>${p.animal_brinco ?? "-"}</strong></td>
        <td>${p.animal_nome ?? "-"}</td>
        <td style="text-align:right">${formatArroba(parseFloat(p.peso_arroba))}</td>
        <td style="text-align:right">${parseFloat(p.peso_kg ?? 0).toFixed(2)} kg</td>
        <td style="text-align:right;color:${p.gmd_arroba && parseFloat(p.gmd_arroba) > 0 ? "#2d6a4f" : "#9a8f7a"}">${p.gmd_arroba ? parseFloat(p.gmd_arroba).toFixed(4) + " @/dia" : "-"}</td>
        <td>${p.responsavel ?? "-"}</td>
      </tr>`,
      )
      .join("");
    return `
      ${secaoTitulo("Pesagens")}
      ${kpis}
      <table class="pdf-tabela">
        <thead><tr><th>Data</th><th>Brinco</th><th>Nome</th><th>Peso (@)</th><th>Peso (kg)</th><th>GMD</th><th>Responsavel</th></tr></thead>
        <tbody>${linhas}</tbody>
        <tr class="total-row"><td colspan="3"><strong>Total: ${pesagens.length} pesagens</strong></td><td style="text-align:right"><strong>${formatArroba(totalPeso)}</strong></td><td colspan="3"><strong>Media: ${formatArroba(mediaPeso)}</strong></td></tr>
      </table>`;
  }

  const blocos = pesagens
    .map(
      (p: any) => `
    <div class="pdf-bloco">
      <div class="pdf-bloco-header">
        <strong>Brinco ${p.animal_brinco ?? "-"}${p.animal_nome ? " — " + p.animal_nome : ""}</strong>
        <strong style="color:#2d6a4f">${formatArroba(parseFloat(p.peso_arroba))}</strong>
      </div>
      <div class="pdf-grid-3">
        <div><div class="pdf-label">Data</div><div class="pdf-value">${formatDate(p.data)}</div></div>
        <div><div class="pdf-label">Peso (kg)</div><div class="pdf-value">${parseFloat(p.peso_kg ?? 0).toFixed(2)} kg</div></div>
        <div><div class="pdf-label">GMD</div><div class="pdf-value">${p.gmd_arroba ? parseFloat(p.gmd_arroba).toFixed(4) + " @/dia" : "-"}</div></div>
        <div><div class="pdf-label">Responsavel</div><div class="pdf-value">${p.responsavel ?? "-"}</div></div>
        <div><div class="pdf-label">Lote</div><div class="pdf-value">${p.lote_nome ?? "-"}</div></div>
      </div>
      ${p.observacao ? `<div style="font-size:.78rem;color:#555;margin-top:6px">Obs: ${p.observacao}</div>` : ""}
    </div>`,
    )
    .join("");
  return `${secaoTitulo("Pesagens")}${kpis}${blocos}`;
}

// ── Seção Sanitário ────────────────────────────────────────────────────────

async function secaoSanitario(
  tipo: TipoRelatorio,
  ini: string,
  fim: string,
): Promise<string> {
  const res = await api.get<{ data: any[] }>(
    `/saude?data_inicio=${ini}&data_fim=${fim}`,
  );
  const eventos = res.data;

  const kpis = `
    <div class="pdf-grid-3">
      <div class="pdf-kpi"><div class="pdf-label">Total de eventos</div><div class="pdf-kpi-valor">${eventos.length}</div></div>
      <div class="pdf-kpi"><div class="pdf-label">Vacinas</div><div class="pdf-kpi-valor">${eventos.filter((e: any) => e.tipo === "vacina").length}</div></div>
      <div class="pdf-kpi"><div class="pdf-label">Tratamentos</div><div class="pdf-kpi-valor">${eventos.filter((e: any) => e.tipo !== "vacina").length}</div></div>
    </div>`;

  if (tipo === "resumido") {
    const linhas = eventos
      .map(
        (e: any) => `
      <tr>
        <td>${formatDate(e.data)}</td>
        <td>${e.tipo}</td>
        <td>${e.descricao}</td>
        <td>${e.escopo === "individual" ? (e.animal_brinco ?? "-") : e.escopo}</td>
        <td>${e.produto ?? "-"}</td>
        <td>${e.data_reforco ? formatDate(e.data_reforco) : "-"}</td>
        <td>${e.responsavel ?? "-"}</td>
      </tr>`,
      )
      .join("");
    return `
      ${secaoTitulo("Sanitario")}
      ${kpis}
      <table class="pdf-tabela">
        <thead><tr><th>Data</th><th>Tipo</th><th>Descricao</th><th>Animal/Escopo</th><th>Produto</th><th>Reforco</th><th>Responsavel</th></tr></thead>
        <tbody>${linhas}</tbody>
        <tr class="total-row"><td colspan="7"><strong>Total: ${eventos.length} eventos sanitarios</strong></td></tr>
      </table>`;
  }

  const blocos = eventos
    .map(
      (e: any) => `
    <div class="pdf-bloco">
      <div class="pdf-bloco-header">
        <div>
          <span style="background:#dbeafe;color:#1d4ed8;font-size:.7rem;padding:2px 8px;border-radius:20px;font-weight:700">${e.tipo}</span>
          <strong style="margin-left:8px">${e.descricao}</strong>
        </div>
        <div style="font-size:.8rem;color:#555">${formatDate(e.data)}</div>
      </div>
      <div class="pdf-grid-3">
        <div><div class="pdf-label">Escopo</div><div class="pdf-value">${e.escopo}</div></div>
        ${e.escopo === "individual" ? `<div><div class="pdf-label">Animal</div><div class="pdf-value">${e.animal_brinco ?? "-"}</div></div>` : ""}
        <div><div class="pdf-label">Produto</div><div class="pdf-value">${e.produto ?? "-"}</div></div>
        <div><div class="pdf-label">Dose</div><div class="pdf-value">${e.dose ?? "-"}</div></div>
        <div><div class="pdf-label">Reforco</div><div class="pdf-value">${e.data_reforco ? formatDate(e.data_reforco) : "Nao"}</div></div>
        <div><div class="pdf-label">Responsavel</div><div class="pdf-value">${e.responsavel ?? "-"}</div></div>
      </div>
      ${e.observacao ? `<div style="font-size:.78rem;color:#555;margin-top:6px">Obs: ${e.observacao}</div>` : ""}
    </div>`,
    )
    .join("");
  return `${secaoTitulo("Sanitario")}${kpis}${blocos}`;
}

// ── Seção Movimentações ────────────────────────────────────────────────────

async function secaoMovimentacoes(
  tipo: TipoRelatorio,
  ini: string,
  fim: string,
): Promise<string> {
  const res = await api.get<{ data: any[] }>(
    `/movimentacoes?data_inicio=${ini}&data_fim=${fim}&pageSize=500`,
  );
  const movs = res.data;

  const entradas = movs.filter((m: any) => m.direcao === "entrada");
  const saidas = movs.filter((m: any) => m.direcao === "saida");

  const kpis = `
    <div class="pdf-grid-3">
      <div class="pdf-kpi"><div class="pdf-label">Total movimentacoes</div><div class="pdf-kpi-valor">${movs.length}</div></div>
      <div class="pdf-kpi"><div class="pdf-label">Entradas</div><div class="pdf-kpi-valor" style="color:#2d6a4f">${entradas.length}</div></div>
      <div class="pdf-kpi"><div class="pdf-label">Saidas</div><div class="pdf-kpi-valor" style="color:#c0392b">${saidas.length}</div></div>
    </div>`;

  if (tipo === "resumido") {
    const linhas = movs
      .map(
        (m: any) => `
      <tr>
        <td>${formatDate(m.data)}</td>
        <td><strong>${m.animal_brinco ?? "-"}</strong></td>
        <td>${m.animal_nome ?? "-"}</td>
        <td>${m.tipo}</td>
        <td><span style="color:${m.direcao === "entrada" ? "#2d6a4f" : "#c0392b"};font-weight:700">${m.direcao === "entrada" ? "▲ Entrada" : "▼ Saida"}</span></td>
        <td>${m.origem_destino ?? "-"}</td>
        <td style="text-align:right">${m.valor_final ? formatBRL(parseFloat(m.valor_final)) : "-"}</td>
      </tr>`,
      )
      .join("");
    return `
      ${secaoTitulo("Movimentacoes")}
      ${kpis}
      <table class="pdf-tabela">
        <thead><tr><th>Data</th><th>Brinco</th><th>Nome</th><th>Tipo</th><th>Direcao</th><th>Origem/Destino</th><th>Valor</th></tr></thead>
        <tbody>${linhas}</tbody>
        <tr class="total-row"><td colspan="4"><strong>Total: ${movs.length}</strong></td><td><strong>${entradas.length} entradas / ${saidas.length} saidas</strong></td><td colspan="2"></td></tr>
      </table>`;
  }

  const blocos = movs
    .map(
      (m: any) => `
    <div class="pdf-bloco">
      <div class="pdf-bloco-header">
        <div>
          <span style="color:${m.direcao === "entrada" ? "#2d6a4f" : "#c0392b"};font-weight:700;font-size:.8rem">${m.direcao === "entrada" ? "▲ ENTRADA" : "▼ SAIDA"} — ${m.tipo.toUpperCase()}</span>
          <strong style="margin-left:8px">Brinco ${m.animal_brinco ?? "-"}${m.animal_nome ? " — " + m.animal_nome : ""}</strong>
        </div>
        <div style="font-size:.8rem;color:#555">${formatDate(m.data)}</div>
      </div>
      <div class="pdf-grid-3">
        <div><div class="pdf-label">Origem/Destino</div><div class="pdf-value">${m.origem_destino ?? "-"}</div></div>
        <div><div class="pdf-label">Lote destino</div><div class="pdf-value">${m.lote_destino_nome ?? "-"}</div></div>
        <div><div class="pdf-label">GTA</div><div class="pdf-value">${m.numero_gta ?? "-"}</div></div>
        ${m.valor_final ? `<div><div class="pdf-label">Valor</div><div class="pdf-value" style="color:${m.direcao === "entrada" ? "#c0392b" : "#2d6a4f"}">${formatBRL(parseFloat(m.valor_final))}</div></div>` : ""}
      </div>
      ${m.observacao ? `<div style="font-size:.78rem;color:#555;margin-top:6px">Obs: ${m.observacao}</div>` : ""}
    </div>`,
    )
    .join("");
  return `${secaoTitulo("Movimentacoes")}${kpis}${blocos}`;
}

// ── Página principal ────────────────────────────────────────────────────────

export async function relatoriosPage(abaInicial: Aba = "rebanho") {
  renderLayout(
    "Relatorios",
    '<div class="loading"><div class="spinner"></div>Carregando...</div>',
  );

  const abas: { id: Aba; label: string }[] = [
    { id: "rebanho", label: "Rebanho" },
    { id: "financeiro", label: "Financeiro" },
    { id: "pesagens", label: "Pesagens" },
    { id: "sanitario", label: "Sanitario" },
    { id: "movimentacoes", label: "Movimentacoes" },
  ];

  document.getElementById("app")!.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-header__title">Relatorios</h2>
        <p class="page-header__sub">Visualize e exporte relatorios do sistema</p>
      </div>
      <button class="btn btn--acento" id="btn-gerar-pdf">📄 Gerar Relatorio PDF</button>
    </div>
 
    <!-- Modal PDF -->
    <div class="modal-overlay" id="modal-pdf" style="display:none">
      <div class="modal" style="max-width:500px">
        <h2 class="modal__title">Gerar Relatorio em PDF</h2>
 
        <div class="form-group">
          <label class="form-label">Tipo de relatorio *</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-2)">
            <label style="border:2px solid var(--cor-borda);border-radius:var(--raio-sm);padding:var(--sp-3);cursor:pointer;display:flex;align-items:center;gap:var(--sp-2)" id="label-resumido">
              <input type="radio" name="tipo_relatorio" value="resumido" checked style="accent-color:var(--verde-medio)">
              <div>
                <div style="font-weight:700;font-size:.85rem">Resumido</div>
                <div style="font-size:.75rem;color:var(--cor-texto-3)">Tabela compacta por linha</div>
              </div>
            </label>
            <label style="border:2px solid var(--cor-borda);border-radius:var(--raio-sm);padding:var(--sp-3);cursor:pointer;display:flex;align-items:center;gap:var(--sp-2)" id="label-completo">
              <input type="radio" name="tipo_relatorio" value="completo" style="accent-color:var(--verde-medio)">
              <div>
                <div style="font-weight:700;font-size:.85rem">Completo</div>
                <div style="font-size:.75rem;color:var(--cor-texto-3)">Bloco detalhado por registro</div>
              </div>
            </label>
          </div>
        </div>
 
        <div class="form-group">
          <label class="form-label">Secoes *</label>
          <select class="form-select" id="pdf-secao">
            <option value="todas">Todas as secoes</option>
            <option value="rebanho">Apenas Rebanho</option>
            <option value="financeiro">Apenas Financeiro</option>
            <option value="pesagens">Apenas Pesagens</option>
            <option value="sanitario">Apenas Sanitario</option>
            <option value="movimentacoes">Apenas Movimentacoes</option>
          </select>
        </div>
 
        <div class="form-grid form-grid--2">
          <div class="form-group">
            <label class="form-label">Data inicial *</label>
            <input class="form-input" id="pdf-data-inicio" type="date" value="${mesIni()}">
          </div>
          <div class="form-group">
            <label class="form-label">Data final *</label>
            <input class="form-input" id="pdf-data-fim" type="date" value="${hoje()}">
          </div>
        </div>
 
        <div style="background:var(--cor-surface-2);border-radius:var(--raio-sm);padding:var(--sp-3);margin-bottom:var(--sp-4)">
          <p class="text-sm text-muted">O sistema ira preparar o relatorio e abrir a janela de impressao. Selecione <strong>Salvar como PDF</strong> para exportar.</p>
        </div>
 
        <div class="modal__footer">
          <button class="btn btn--fantasma" id="btn-fechar-pdf">Cancelar</button>
          <button class="btn btn--acento" id="btn-confirmar-pdf">Gerar PDF</button>
        </div>
      </div>
    </div>
 
    <!-- Abas -->
    <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-5);flex-wrap:wrap">
      ${abas.map((a) => abaBtn(a.id, a.label, abaInicial)).join("")}
    </div>
 
    <div id="rel-conteudo"><div class="loading"><div class="spinner"></div>Carregando...</div></div>
  `;

  const carregarAba = async (aba: Aba) => {
    const el = document.getElementById("rel-conteudo")!;
    el.innerHTML =
      '<div class="loading"><div class="spinner"></div>Carregando...</div>';
    try {
      const { ini, fim } = { ini: mesIni(), fim: hoje() };
      if (aba === "rebanho")
        el.innerHTML = await secaoRebanho("resumido", ini, fim);
      if (aba === "financeiro")
        el.innerHTML = await secaoFinanceiro("resumido", ini, fim);
      if (aba === "pesagens")
        el.innerHTML = await secaoPesagens("resumido", ini, fim);
      if (aba === "sanitario")
        el.innerHTML = await secaoSanitario("resumido", ini, fim);
      if (aba === "movimentacoes")
        el.innerHTML = await secaoMovimentacoes("resumido", ini, fim);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><h3>Erro ao carregar</h3><p class="text-muted mt-4">${err instanceof Error ? err.message : "Erro"}</p></div>`;
    }
  };

  document.querySelectorAll(".aba-rel").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".aba-rel")
        .forEach((b) => b.classList.replace("btn--primario", "btn--fantasma"));
      btn.classList.replace("btn--fantasma", "btn--primario");
      carregarAba((btn as HTMLElement).dataset.aba as Aba);
    });
  });

  // Modal PDF
  const modalPdf = document.getElementById("modal-pdf") as HTMLElement;
  document
    .getElementById("btn-gerar-pdf")
    ?.addEventListener("click", () => (modalPdf.style.display = "flex"));
  document
    .getElementById("btn-fechar-pdf")
    ?.addEventListener("click", () => (modalPdf.style.display = "none"));

  // Highlight do tipo selecionado
  document
    .querySelectorAll<HTMLInputElement>('[name="tipo_relatorio"]')
    .forEach((radio) => {
      radio.addEventListener("change", () => {
        (
          document.getElementById("label-resumido") as HTMLElement
        ).style.borderColor = "var(--cor-borda)";
        (
          document.getElementById("label-completo") as HTMLElement
        ).style.borderColor = "var(--cor-borda)";
        const label = document.getElementById(
          `label-${radio.value}`,
        ) as HTMLElement;
        if (label) label.style.borderColor = "var(--verde-claro)";
      });
    });
  (document.getElementById("label-resumido") as HTMLElement).style.borderColor =
    "var(--verde-claro)";

  document
    .getElementById("btn-confirmar-pdf")
    ?.addEventListener("click", async () => {
      const tipo =
        (document.querySelector<HTMLInputElement>(
          '[name="tipo_relatorio"]:checked',
        )?.value as TipoRelatorio) ?? "resumido";
      const secao = (document.getElementById("pdf-secao") as HTMLSelectElement)
        .value as Aba | "todas";
      const dataIni = (
        document.getElementById("pdf-data-inicio") as HTMLInputElement
      ).value;
      const dataFim = (
        document.getElementById("pdf-data-fim") as HTMLInputElement
      ).value;

      if (!dataIni || !dataFim) {
        alert("Informe o periodo");
        return;
      }

      const btn = document.getElementById(
        "btn-confirmar-pdf",
      ) as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = "Preparando...";
      modalPdf.style.display = "none";

      try {
        const html = await gerarRelatorio(tipo, secao, dataIni, dataFim);

        // Injeta numa div oculta e depois imprime
        let div = document.getElementById("pdf-print-area") as HTMLElement;
        if (!div) {
          div = document.createElement("div");
          div.id = "pdf-print-area";
          document.body.appendChild(div);
        }
        div.innerHTML = html;

        // CSS para mostrar só o conteúdo na impressão
        let style = document.getElementById(
          "pdf-print-style",
        ) as HTMLStyleElement;
        if (!style) {
          style = document.createElement("style");
          style.id = "pdf-print-style";
          document.head.appendChild(style);
        }
        style.textContent = `
        @media print {
          body > *:not(#pdf-print-area) { display: none !important; }
          #pdf-print-area { display: block !important; padding: 20px; font-family: Arial, sans-serif; }
        }
        #pdf-print-area { display: none; }
      `;

        setTimeout(() => {
          window.print();
          setTimeout(() => {
            div.innerHTML = "";
          }, 1500);
          btn.disabled = false;
          btn.textContent = "Gerar PDF";
        }, 400);
      } catch (err) {
        alert(
          "Erro ao gerar relatorio: " +
            (err instanceof Error ? err.message : "Erro"),
        );
        btn.disabled = false;
        btn.textContent = "Gerar PDF";
      }
    });

  carregarAba(abaInicial);
}
