import { api } from '../lib/api.js'
import { renderLayout } from '../components/layout.js'
import { toast } from '../lib/toast.js'

interface PastoRow {
  id: string; nome: string; area_hectares: string
  tipo_capim: string | null; capacidade_ua: string | null
  lote_atual_nome: string | null; quantidade_animais_atual: number | null
  percentual_lotacao: number | null; ativo: boolean
}

function lotacaoBar(pct: number | null) {
  if (pct === null) return '<span class="text-muted text-sm">Não calculado</span>'
  const cor = pct > 90 ? 'var(--cor-perigo)' : pct > 70 ? 'var(--cor-aviso)' : 'var(--verde-claro)'
  return `
    <div style="display:flex;align-items:center;gap:var(--sp-2)">
      <div style="flex:1;height:6px;background:var(--cor-borda);border-radius:3px;overflow:hidden">
        <div style="width:${Math.min(pct,100)}%;height:100%;background:${cor};transition:width .4s"></div>
      </div>
      <span class="text-sm" style="color:${cor};font-weight:700;min-width:38px">${pct.toFixed(0)}%</span>
    </div>
  `
}

export async function pastosPage() {
  renderLayout('Pastagens', '<div class="loading"><div class="spinner"></div>Carregando...</div>')

  try {
    const res = await api.get<{ data: PastoRow[] }>('/pastos')
    const pastos = res.data

    const cards = pastos.map(p => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--sp-4)">
          <div>
            <div class="card__title" style="margin-bottom:var(--sp-1)">${p.nome}</div>
            <span class="badge badge--verde">${parseFloat(p.area_hectares).toFixed(1)} ha</span>
            ${p.tipo_capim ? `<span class="badge badge--cinza" style="margin-left:4px">${p.tipo_capim}</span>` : ''}
          </div>
          <div style="text-align:right">
            <div style="font-family:var(--fonte-display);font-size:1.6rem;font-weight:700;color:var(--verde-escuro)">${p.quantidade_animais_atual ?? 0}</div>
            <div class="text-muted text-sm">animais</div>
          </div>
        </div>
        <div style="margin-bottom:var(--sp-3)">
          <div class="text-sm text-muted" style="margin-bottom:var(--sp-1)">Lotação</div>
          ${lotacaoBar(p.percentual_lotacao)}
          ${p.capacidade_ua ? `<div class="text-sm text-muted" style="margin-top:2px">Capacidade: ${p.capacidade_ua} UA</div>` : ''}
        </div>
        <div class="text-sm" style="color:var(--cor-texto-2)">
          🐄 ${p.lote_atual_nome ?? 'Sem lote atual'}
        </div>
        <div style="margin-top:var(--sp-4);display:flex;gap:var(--sp-2)">
          <button class="btn btn--fantasma btn-cocho" data-id="${p.id}" data-nome="${p.nome}" style="font-size:.8rem;flex:1;justify-content:center">+ Cocho</button>
          <a href="#/pastos/${p.id}" class="btn btn--fantasma" style="font-size:.8rem;flex:1;justify-content:center">Histórico</a>
        </div>
      </div>
    `).join('') || `<div class="empty-state"><div class="empty-state__icon">🌿</div><h3>Nenhum pasto cadastrado</h3></div>`

    document.getElementById('app')!.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-header__title">Pastagens</h2>
          <p class="page-header__sub">${pastos.length} pasto(s) cadastrado(s)</p>
        </div>
        <button class="btn btn--primario" id="btn-novo-pasto">+ Novo Pasto</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--sp-5)">${cards}</div>

      <!-- Modal novo pasto -->
      <div class="modal-overlay" id="modal-pasto" style="display:none">
        <div class="modal">
          <h2 class="modal__title">Novo Pasto</h2>
          <form id="form-pasto">
            <div class="form-group">
              <label class="form-label">Nome *</label>
              <input class="form-input" name="nome" required placeholder="Ex: Pasto 1 — Frente">
            </div>
            <div class="form-grid form-grid--2">
              <div class="form-group">
                <label class="form-label">Área (hectares) *</label>
                <input class="form-input" name="area_hectares" type="number" step="0.01" required placeholder="Ex: 12.50">
              </div>
              <div class="form-group">
                <label class="form-label">Capacidade (UA)</label>
                <input class="form-input" name="capacidade_ua" type="number" step="0.1" placeholder="Unidades Animal">
              </div>
              <div class="form-group">
                <label class="form-label">Tipo de capim</label>
                <input class="form-input" name="tipo_capim" placeholder="Ex: Brachiaria">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Observação</label>
              <textarea class="form-textarea" name="observacao" rows="2"></textarea>
            </div>
            <div class="modal__footer">
              <button type="button" class="btn btn--fantasma" id="btn-fechar-pasto">Cancelar</button>
              <button type="submit" class="btn btn--primario">Cadastrar Pasto</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal cocho -->
      <div class="modal-overlay" id="modal-cocho" style="display:none">
        <div class="modal">
          <h2 class="modal__title">Registrar Abastecimento de Cocho</h2>
          <p id="cocho-pasto-nome" class="text-muted" style="margin-bottom:var(--sp-5)"></p>
          <form id="form-cocho">
            <input type="hidden" name="pasto_id" id="cocho-pasto-id">
            <div class="form-grid form-grid--2">
              <div class="form-group">
                <label class="form-label">Data *</label>
                <input class="form-input" name="data" type="date" required value="${new Date().toISOString().slice(0,10)}">
              </div>
              <div class="form-group">
                <label class="form-label">Tipo *</label>
                <select class="form-select" name="tipo" required>
                  <option value="sal_mineral">Sal Mineral</option>
                  <option value="racao">Ração</option>
                  <option value="proteinado">Proteinado</option>
                  <option value="volumoso">Volumoso</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Quantidade (kg) *</label>
                <input class="form-input" name="quantidade_kg" type="number" step="0.1" required>
              </div>
              <div class="form-group">
                <label class="form-label">Custo total (R$)</label>
                <input class="form-input" name="custo_total" type="number" step="0.01" placeholder="Opcional">
              </div>
              <div class="form-group">
                <label class="form-label">Fornecedor</label>
                <input class="form-input" name="fornecedor" placeholder="Opcional">
              </div>
            </div>
            <div class="modal__footer">
              <button type="button" class="btn btn--fantasma" id="btn-fechar-cocho">Cancelar</button>
              <button type="submit" class="btn btn--primario">Registrar</button>
            </div>
          </form>
        </div>
      </div>
    `

    const modalPasto = document.getElementById('modal-pasto') as HTMLElement
    const modalCocho = document.getElementById('modal-cocho') as HTMLElement

    document.getElementById('btn-novo-pasto')?.addEventListener('click', () => modalPasto.style.display = 'flex')
    document.getElementById('btn-fechar-pasto')?.addEventListener('click', () => modalPasto.style.display = 'none')
    document.getElementById('btn-fechar-cocho')?.addEventListener('click', () => modalCocho.style.display = 'none')

    document.querySelectorAll('.btn-cocho').forEach(btn => {
      btn.addEventListener('click', () => {
        const id   = (btn as HTMLElement).dataset.id!
        const nome = (btn as HTMLElement).dataset.nome!
        ;(document.getElementById('cocho-pasto-id') as HTMLInputElement).value = id
        document.getElementById('cocho-pasto-nome')!.textContent = `Pasto: ${nome}`
        modalCocho.style.display = 'flex'
      })
    })

    document.getElementById('form-pasto')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const data = Object.fromEntries(new FormData(e.target as HTMLFormElement))
      try {
        await api.post('/pastos', {
          nome:          data.nome,
          area_hectares: parseFloat(data.area_hectares as string),
          capacidade_ua: data.capacidade_ua ? parseFloat(data.capacidade_ua as string) : undefined,
          tipo_capim:    data.tipo_capim     || undefined,
          observacao:    data.observacao     || undefined,
        })
        toast.success('Pasto cadastrado com sucesso!')
        modalPasto.style.display = 'none'
        pastosPage()
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro') }
    })

    document.getElementById('form-cocho')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const data  = Object.fromEntries(new FormData(e.target as HTMLFormElement))
      const pastoId = data.pasto_id as string
      try {
        await api.post(`/pastos/${pastoId}/cocho`, {
          data:          data.data,
          tipo:          data.tipo,
          quantidade_kg: parseFloat(data.quantidade_kg as string),
          custo_total:   data.custo_total ? parseFloat(data.custo_total as string) : undefined,
          fornecedor:    data.fornecedor   || undefined,
        })
        toast.success('Abastecimento registrado!')
        modalCocho.style.display = 'none'
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro') }
    })

  } catch (err) {
    document.getElementById('app')!.innerHTML = `<div class="empty-state"><h3>Erro ao carregar pastagens</h3></div>`
  }
}
