import { api } from "../lib/api.js";
import { auth } from "../lib/auth.js";
import { renderLayout } from "../components/layout.js";
import { formatBRL } from "../utils/currency.js";
import { formatArroba } from "../utils/arroba.js";

interface Totais {
  data: {
    total: number;
    porCategoria: Array<{ categoria: string; total: number }>;
  };
}
interface Resumo {
  data: {
    totalReceitas: number;
    totalDespesas: number;
    saldo: number;
    qtdPendentes: number;
  };
}
interface Pendentes {
  data: Array<{
    id: string;
    descricao: string;
    valor_estimado: string | null;
    data: string;
  }>;
}
interface Lotes {
  data: Array<{
    id: string;
    nome: string;
    quantidade_atual: number;
    peso_medio_arroba: string | null;
    categoria_principal: string;
    pasto_nome: string | null;
  }>;
}

function mesAtual() {
  const now = new Date();
  const ini = new Date(now.getFullYear(), now.getMonth(), 1);
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    data_inicio: ini.toISOString().slice(0, 10),
    data_fim: fim.toISOString().slice(0, 10),
  };
}

export async function dashboardPage() {
  renderLayout(
    "Dashboard",
    '<div class="loading"><div class="spinner"></div>Carregando dados...</div>',
  );

  const { data_inicio, data_fim } = mesAtual();

  try {
    const isAdmin = auth.isAdmin();

    const [totais, lotes, resumoRes, pendentesRes, recatRes] =
      await Promise.all([
        api
          .get<Totais>("/animais/totais")
          .catch(() => ({ data: { total: 0, porCategoria: [] } })),
        api.get<Lotes>("/lotes").catch(() => ({ data: [] })),
        isAdmin
          ? api.get<Resumo>(
              `/financeiro/resumo?data_inicio=${data_inicio}&data_fim=${data_fim}`,
            )
          : Promise.resolve({
              data: {
                totalReceitas: 0,
                totalDespesas: 0,
                saldo: 0,
                qtdPendentes: 0,
              },
            }),
        isAdmin
          ? api.get<Pendentes>("/financeiro/lancamentos/pendentes")
          : Promise.resolve({ data: [] }),
        isAdmin
          ? api
              .get<{
                data: { total: number };
              }>("/recategorizacao/pendentes/count")
              .catch(() => ({ data: { total: 0 } }))
          : Promise.resolve({ data: { total: 0 } }),
      ]);

    const resumo = resumoRes;
    const pendentes = pendentesRes;
    const recatPendentes = recatRes.data.total;

    const cats = totais.data.porCategoria;
    const totalLotes = lotes.data.length;

    const categoriaHtml =
      cats
        .map(
          (c) =>
            `<tr>
        <td><span class="badge badge--verde">${c.categoria}</span></td>
        <td class="text-right font-display" style="font-size:1.1rem">${c.total}</td>
      </tr>`,
        )
        .join("") ||
      `<tr><td colspan="2"><div class="empty-state"><p>Nenhum animal cadastrado</p></div></td></tr>`;

    const pendentesHtml =
      pendentes.data
        .slice(0, 5)
        .map(
          (l) =>
            `<tr>
        <td>${l.descricao}</td>
        <td class="text-muted text-sm">${new Date(l.data + "T00:00:00").toLocaleDateString("pt-BR")}</td>
        <td class="text-right">
          <span class="badge badge--amarelo">${l.valor_estimado ? formatBRL(parseFloat(l.valor_estimado)) : "Aguardando"}</span>
        </td>
      </tr>`,
        )
        .join("") ||
      `<tr><td colspan="3"><div class="empty-state" style="padding:var(--sp-5)"><p>Nenhum lançamento pendente</p></div></td></tr>`;

    const lotesHtml =
      lotes.data
        .slice(0, 6)
        .map(
          (l) =>
            `<div class="kpi kpi--verde" style="padding:var(--sp-4)">
        <div class="kpi__label">${l.nome}</div>
        <div class="kpi__value" style="font-size:1.4rem">${l.quantidade_atual}</div>
        <div class="kpi__sub">
          ${l.peso_medio_arroba ? formatArroba(parseFloat(l.peso_medio_arroba)) + " méd." : "Sem pesagem"}
          ${l.pasto_nome ? `· ${l.pasto_nome}` : ""}
        </div>
      </div>`,
        )
        .join("") || `<p class="text-muted">Nenhum lote cadastrado</p>`;

    const saldoClass = resumo.data.saldo >= 0 ? "kpi--verde" : "kpi--terra";

    const kpisAdmin = isAdmin
      ? `
        <div class="kpi kpi--dourado">
          <div class="kpi__label">Receitas do Mes</div>
          <div class="kpi__value" style="font-size:1.4rem">${formatBRL(resumo.data.totalReceitas)}</div>
          <div class="kpi__sub">mes atual</div>
          <div class="kpi__icon">+</div>
        </div>
        <div class="kpi kpi--terra">
          <div class="kpi__label">Despesas do Mes</div>
          <div class="kpi__value" style="font-size:1.4rem">${formatBRL(resumo.data.totalDespesas)}</div>
          <div class="kpi__sub">mes atual</div>
          <div class="kpi__icon">-</div>
        </div>
        <div class="kpi ${saldoClass}">
          <div class="kpi__label">Saldo do Mes</div>
          <div class="kpi__value" style="font-size:1.4rem">${formatBRL(resumo.data.saldo)}</div>
          <div class="kpi__sub">receitas - despesas</div>
        </div>
        <div class="kpi ${pendentes.data.length > 0 ? "kpi--terra" : "kpi--verde"}">
          <div class="kpi__label">Pendentes</div>
          <div class="kpi__value">${pendentes.data.length}</div>
          <div class="kpi__sub">lancamentos aguardando</div>
        </div>
        <div class="kpi ${recatPendentes > 0 ? "kpi--terra" : "kpi--verde"}" style="cursor:pointer" onclick="window.location.hash='/recategorizacao'">
          <div class="kpi__label">Recategorizacao</div>
          <div class="kpi__value">${recatPendentes}</div>
          <div class="kpi__sub">${recatPendentes > 0 ? "animais para promover" : "tudo em dia"}</div>
        </div>`
      : "";

    const html = `
      <!-- KPIs principais -->
      <div class="kpi-grid">
        <div class="kpi kpi--verde">
          <div class="kpi__label">Total do Rebanho</div>
          <div class="kpi__value">${totais.data.total}</div>
          <div class="kpi__sub">animais ativos</div>
          <div class="kpi__icon">animal</div>
        </div>
        <div class="kpi kpi--azul">
          <div class="kpi__label">Lotes Ativos</div>
          <div class="kpi__value">${totalLotes}</div>
          <div class="kpi__sub">grupos de animais</div>
          <div class="kpi__icon">lote</div>
        </div>
        ${kpisAdmin}
        </div>
      </div>

      <!-- Cards condicionais por perfil -->
      ${
        isAdmin
          ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);margin-bottom:var(--sp-5)">
        <div class="card">
          <div class="card__title">Rebanho por Categoria</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Categoria</th><th class="text-right">Quantidade</th></tr></thead>
              <tbody>${categoriaHtml}</tbody>
            </table>
          </div>
          <div class="mt-4">
            <a href="#/animais" class="btn btn--fantasma" style="font-size:.8rem">Ver todos os animais</a>
          </div>
        </div>
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-4)">
            <div class="card__title" style="margin-bottom:0">Aguardando Confirmacao</div>
            ${pendentes.data.length > 0 ? '<span class="badge badge--amarelo">' + pendentes.data.length + " pendente(s)</span>" : ""}
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Descricao</th><th>Data</th><th class="text-right">Valor</th></tr></thead>
              <tbody>${pendentesHtml}</tbody>
            </table>
          </div>
          <div class="mt-4">
            <a href="#/financeiro" class="btn btn--fantasma" style="font-size:.8rem">Ver financeiro</a>
          </div>
        </div>
      </div>`
          : ""
      }

      <!-- Lotes -->
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-5)">
          <div class="card__title" style="margin-bottom:0">Lotes do Rebanho</div>
          <a href="#/lotes" class="btn btn--fantasma" style="font-size:.8rem">Gerenciar lotes →</a>
        </div>
        <div class="kpi-grid" style="margin-bottom:0">${lotesHtml}</div>
      </div>
    `;

    document.getElementById("app")!.innerHTML = html;
  } catch (err) {
    document.getElementById("app")!.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠</div>
        <h3>Erro ao carregar dashboard</h3>
        <p class="text-muted mt-4">${err instanceof Error ? err.message : "Verifique a conexão com a API"}</p>
      </div>
    `;
  }
}
