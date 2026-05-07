import { api } from '../lib/api.js'
import { renderLayout } from '../components/layout.js'
import { toast } from '../lib/toast.js'
import { formatBRL } from '../utils/currency.js'
import { formatDate, hoje } from '../utils/date.js'

interface Lancamento {
  id: string; data: string; tipo: string; categoria_nome: string
  descricao: string; valor_final: string | null; valor_estimado: string | null
  valor_efetivo: string | null; status: string; pago: boolean
  forma_pagamento: string | null; data_vencimento: string | null
}
interface Categoria { id: string; nome: string; tipo: string }

function statusBadge(status: string, pago: boolean) {
  if (status === 'pendente') return `<span class="badge badge--amarelo">Pendente</span>`
  if (status === 'cancelado') return `<span class="badge badge--cinza">Cancelado</span>`
  if (pago) return `<span class="badge badge--verde">Pago</span>`
  return `<span class="badge badge--azul">Confirmado</span>`
}

export async function financeiroPage() {
  renderLayout('Financeiro', '<div class="loading"><div class="spinner"></div>Carregando...</div>')

  const mesAtual = new Date()
  const iniMes   = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).toISOString().slice(0, 10)
  const fimMes   = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).toISOString().slice(0, 10)

  try {
    const [lancRes, catRes, resumoRes] = await Promise.all([
      api.get<{ data: Lancamento[]; total: number }>(`/financeiro/lancamentos?data_inicio=${iniMes}&data_fim=${fimMes}&pageSize=100`),
      api.get<{ data: Categoria[] }>('/financeiro/categorias'),
      api.get<{ data: { totalReceitas: number; totalDespesas: number; saldo: number } }>(`/financeiro/resumo?data_inicio=${iniMes}&data_fim=${fimMes}`),
    ])

    const lancamentos = lancRes.data
    const categorias  = catRes.data
    const resumo      = resumoRes.data

    const catReceitas = categorias.filter(c => c.tipo === 'receita')
    const catDespesas = categorias.filter(c => c.tipo === 'despesa')

    const linhas = lancamentos.map(l => {
      const valor = l.valor_efetivo ? parseFloat(l.valor_efetivo) : null
      return `
        <tr>
          <td>${formatDate(l.data)}</td>
          <td>
            <span class="badge ${l.tipo === 'receita' ? 'badge--verde' : 'badge--vermelho'}">
              ${l.tipo === 'receita' ? '↑' : '↓'} ${l.tipo}
            </span>
          </td>
          <td>${l.categoria_nome}</td>
          <td>${l.descricao}</td>
          <td class="text-right" style="font-weight:700;color:${l.tipo === 'receita' ? 'var(--verde-medio)' : 'var(--cor-perigo)'}">
            ${valor !== null ? formatBRL(valor) : '<span class="text-muted">Aguardando</span>'}
          </td>
          <td>${statusBadge(l.status, l.pago)}</td>
          <td>
            ${!l.pago && l.status === 'confirmado'
              ? `<button class="btn btn--fantasma btn-pagar" data-id="${l.id}" style="font-size:.75rem;padding:2px 10px">Marcar pago</button>`
              : ''}
          </td>
        </tr>
      `
    }).join('') || `<tr><td colspan="7"><div class="empty-state" style="padding:var(--sp-8)"><div class="empty-state__icon">💰</div><h3>Nenhum lançamento neste período</h3></div></td></tr>`

    document.getElementById('app')!.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-header__title">Financeiro</h2>
          <p class="page-header__sub">${lancamentos.length} lançamento(s) no mês atual</p>
        </div>
        <button class="btn btn--primario" id="btn-novo-lanc">+ Novo Lançamento</button>
      </div>

      <!-- Resumo -->
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:var(--sp-6)">
        <div class="kpi kpi--dourado">
          <div class="kpi__label">Receitas do mês</div>
          <div class="kpi__value" style="font-size:1.5rem">${formatBRL(resumo.totalReceitas)}</div>
          <div class="kpi__icon">↑</div>
        </div>
        <div class="kpi kpi--terra">
          <div class="kpi__label">Despesas do mês</div>
          <div class="kpi__value" style="font-size:1.5rem">${formatBRL(resumo.totalDespesas)}</div>
          <div class="kpi__icon">↓</div>
        </div>
        <div class="kpi ${resumo.saldo >= 0 ? 'kpi--verde' : 'kpi--terra'}">
          <div class="kpi__label">Saldo</div>
          <div class="kpi__value" style="font-size:1.5rem">${formatBRL(resumo.saldo)}</div>
          <div class="kpi__icon">⚖</div>
        </div>
      </div>

      <!-- Tabela -->
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th>
                <th class="text-right">Valor</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
      </div>

      <!-- Modal novo lançamento -->
      <div class="modal-overlay" id="modal-lanc" style="display:none">
        <div class="modal">
          <h2 class="modal__title">Novo Lançamento</h2>
          <form id="form-lanc">
            <div class="form-grid form-grid--2">
              <div class="form-group">
                <label class="form-label">Tipo *</label>
                <select class="form-select" name="tipo" id="sel-tipo" required>
                  <option value="">Selecione</option>
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Categoria *</label>
                <select class="form-select" name="categoria_id" id="sel-cat" required>
                  <option value="">Selecione o tipo primeiro</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Data *</label>
                <input class="form-input" name="data" type="date" required value="${hoje()}">
              </div>
              <div class="form-group">
                <label class="form-label">Valor (R$) *</label>
                <input class="form-input" name="valor_final" type="number" step="0.01" required placeholder="0,00">
              </div>
              <div class="form-group">
                <label class="form-label">Forma de pagamento</label>
                <select class="form-select" name="forma_pagamento">
                  <option value="">—</option>
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
            </div>
            <div class="form-group">
              <label class="form-label">Descrição *</label>
              <input class="form-input" name="descricao" required placeholder="Descreva o lançamento">
            </div>
            <div class="modal__footer">
              <button type="button" class="btn btn--fantasma" id="btn-fechar-lanc">Cancelar</button>
              <button type="submit" class="btn btn--primario">Salvar Lançamento</button>
            </div>
          </form>
        </div>
      </div>
    `

    // Filtro de categorias por tipo
    const selTipo = document.getElementById('sel-tipo') as HTMLSelectElement
    const selCat  = document.getElementById('sel-cat') as HTMLSelectElement
    selTipo?.addEventListener('change', () => {
      const tipo = selTipo.value
      const cats = tipo === 'receita' ? catReceitas : catDespesas
      selCat.innerHTML = cats.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')
    })

    const modal = document.getElementById('modal-lanc') as HTMLElement
    document.getElementById('btn-novo-lanc')?.addEventListener('click', () => modal.style.display = 'flex')
    document.getElementById('btn-fechar-lanc')?.addEventListener('click', () => modal.style.display = 'none')

    document.getElementById('form-lanc')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const form = e.target as HTMLFormElement
      const data = Object.fromEntries(new FormData(form))
      try {
        await api.post('/financeiro/lancamentos', {
          data:            data.data,
          tipo:            data.tipo,
          categoria_id:    data.categoria_id,
          valor_final:     parseFloat(data.valor_final as string),
          descricao:       data.descricao,
          forma_pagamento: data.forma_pagamento || undefined,
          data_vencimento: data.data_vencimento || undefined,
          pago:            false,
        })
        toast.success('Lançamento registrado com sucesso!')
        modal.style.display = 'none'
        financeiroPage()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    })

    // Marcar como pago
    document.querySelectorAll('.btn-pagar').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id!
        try {
          await api.patch(`/financeiro/lancamentos/${id}/pagar`, { data_pagamento: hoje() })
          toast.success('Lançamento marcado como pago!')
          financeiroPage()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erro')
        }
      })
    })

  } catch (err) {
    document.getElementById('app')!.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠</div>
        <h3>Erro ao carregar financeiro</h3>
        <p class="text-muted mt-4">${err instanceof Error ? err.message : 'Erro desconhecido'}</p>
      </div>
    `
  }
}
