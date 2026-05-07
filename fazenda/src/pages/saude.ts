import { api } from '../lib/api.js'
import { renderLayout } from '../components/layout.js'
import { toast } from '../lib/toast.js'
import { formatDate, hoje } from '../utils/date.js'
import { formatBRL } from '../utils/currency.js'

interface Lote { id: string; nome: string; quantidade_atual: number }
interface Animal { id: string; brinco: string; nome: string | null; categoria: string }
interface SaudeEvento {
  id: string; escopo: string; tipo: string; produto: string
  data_aplicacao: string; data_proxima: string | null
  quantidade_animais: number; custo_total: string | null
  lote_nome: string | null; responsavel: string | null
}

type Aba = 'registrar' | 'historico' | 'alertas'

function tipoBadge(tipo: string) {
  const cores: Record<string, string> = {
    vacina: 'verde', vermifugo: 'azul', medicamento: 'amarelo',
    exame: 'cinza', cirurgia: 'vermelho', outro: 'cinza',
  }
  const icones: Record<string, string> = {
    vacina: '💉', vermifugo: '🔬', medicamento: '💊',
    exame: '🩺', cirurgia: '⚕', outro: '📋',
  }
  return `<span class="badge badge--${cores[tipo] ?? 'cinza'}">${icones[tipo] ?? '📋'} ${tipo}</span>`
}

function escopoBadge(escopo: string) {
  const map: Record<string, string> = { individual: 'azul', lote: 'verde', todos: 'amarelo' }
  return `<span class="badge badge--${map[escopo] ?? 'cinza'}">${escopo}</span>`
}

function abaBtn(id: Aba, label: string, icon: string, ativa: Aba) {
  return `<button class="btn ${id === ativa ? 'btn--primario' : 'btn--fantasma'} aba-saude" data-aba="${id}">${icon} ${label}</button>`
}

export async function saudePage(abaInicial: Aba = 'historico') {
  renderLayout('Saúde & Vacinas', '<div class="loading"><div class="spinner"></div>Carregando...</div>')

  try {
    const [lotesRes, animaisRes] = await Promise.all([
      api.get<{ data: Lote[] }>('/lotes'),
      api.get<{ data: Animal[] }>('/animais?pageSize=500'),
    ])

    const lotes   = lotesRes.data
    const animais = animaisRes.data

    renderSaudeTela(abaInicial, lotes, animais)

  } catch (err) {
    document.getElementById('app')!.innerHTML = `<div class="empty-state"><h3>Erro ao carregar</h3></div>`
  }
}

function renderSaudeTela(aba: Aba, lotes: Lote[], animais: Animal[]) {
  const abas = `
    <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-6)">
      ${abaBtn('registrar', 'Registrar Evento',   '💉', aba)}
      ${abaBtn('historico', 'Histórico',           '📋', aba)}
      ${abaBtn('alertas',   'Próximos Reforços',   '🔔', aba)}
    </div>
  `

  let conteudo = ''
  if (aba === 'registrar') conteudo = formRegistrar(lotes, animais)
  else if (aba === 'historico') conteudo = `<div id="historico-saude" class="card"><div class="loading"><div class="spinner"></div></div></div>`
  else conteudo = `<div id="alertas-saude" class="card"><div class="loading"><div class="spinner"></div></div></div>`

  document.getElementById('app')!.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-header__title">Saúde & Vacinas</h2>
        <p class="page-header__sub">Controle sanitário do rebanho</p>
      </div>
    </div>
    ${abas}
    ${conteudo}
  `

  document.querySelectorAll('.aba-saude').forEach(btn => {
    btn.addEventListener('click', () => {
      renderSaudeTela((btn as HTMLElement).dataset.aba as Aba, lotes, animais)
      const novaAba = (btn as HTMLElement).dataset.aba as Aba
      if (novaAba === 'historico') carregarHistoricoSaude()
      if (novaAba === 'alertas')   carregarAlertas()
    })
  })

  if (aba === 'registrar') bindRegistrar(lotes, animais)
  if (aba === 'historico') carregarHistoricoSaude()
  if (aba === 'alertas')   carregarAlertas()
}

// ── FORMULÁRIO DE REGISTRO ───────────────────────────────────────────────────

function formRegistrar(lotes: Lote[], animais: Animal[]) {
  const lotesOpts   = lotes.map(l => `<option value="${l.id}">${l.nome} (${l.quantidade_atual} animais)</option>`).join('')
  const animaisOpts = animais.map(a => `<option value="${a.id}">${a.brinco}${a.nome ? ' — ' + a.nome : ''} (${a.categoria})</option>`).join('')
  void animaisOpts

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5)">

      <!-- Formulário -->
      <div class="card">
        <div class="card__title">💉 Novo Evento Sanitário</div>
        <form id="form-saude">

          <div class="form-group">
            <label class="form-label">Escopo *</label>
            <select class="form-select" name="escopo" id="sel-escopo" required>
              <option value="individual">Individual — animais específicos</option>
              <option value="lote">Lote — todos os animais do lote</option>
              <option value="todos">Todo o rebanho ativo</option>
            </select>
          </div>

          <!-- Seleção de lote (aparece quando escopo=lote) -->
          <div class="form-group" id="grupo-lote" style="display:none">
            <label class="form-label">Lote *</label>
            <select class="form-select" name="lote_id">
              <option value="">Selecione o lote</option>
              ${lotesOpts}
            </select>
            <label style="display:flex;align-items:center;gap:var(--sp-2);margin-top:var(--sp-2);cursor:pointer">
              <input type="checkbox" name="expandir_para_animais" value="true" checked
                style="width:16px;height:16px;accent-color:var(--verde-medio)">
              <span class="text-sm text-muted">Vincular individualmente a cada animal do lote</span>
            </label>
          </div>

          <!-- Seleção de animais individuais -->
          <div class="form-group" id="grupo-individual" style="display:none">
            <label class="form-label">Animais *</label>
            <div id="animais-individual-lista" style="max-height:200px;overflow-y:auto;border:1px solid var(--cor-borda);border-radius:var(--raio-sm);padding:var(--sp-3)">
              ${animais.map(a => `
                <label style="display:flex;align-items:center;gap:var(--sp-2);padding:var(--sp-1) 0;cursor:pointer">
                  <input type="checkbox" class="animal-check" value="${a.id}"
                    style="width:15px;height:15px;accent-color:var(--verde-medio)">
                  <span class="text-sm"><strong>${a.brinco}</strong>${a.nome ? ' — ' + a.nome : ''} <span class="badge badge--cinza" style="font-size:.65rem">${a.categoria}</span></span>
                </label>
              `).join('')}
            </div>
            <button type="button" id="btn-selecionar-todos" class="btn btn--fantasma" style="font-size:.75rem;margin-top:var(--sp-2)">Selecionar todos</button>
          </div>

          <div class="form-grid form-grid--2">
            <div class="form-group">
              <label class="form-label">Tipo *</label>
              <select class="form-select" name="tipo" required>
                <option value="vacina">💉 Vacina</option>
                <option value="vermifugo">🔬 Vermífugo</option>
                <option value="medicamento">💊 Medicamento</option>
                <option value="exame">🩺 Exame</option>
                <option value="cirurgia">⚕ Cirurgia</option>
                <option value="outro">📋 Outro</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Data de aplicação *</label>
              <input class="form-input" name="data_aplicacao" type="date" required value="${hoje()}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Produto *</label>
            <input class="form-input" name="produto" required placeholder="Ex: Aftosa Vallée, Ivomec, Botucox...">
          </div>

          <div class="form-grid form-grid--2">
            <div class="form-group">
              <label class="form-label">Fabricante</label>
              <input class="form-input" name="fabricante" placeholder="Ex: Vallée, Zoetis...">
            </div>
            <div class="form-group">
              <label class="form-label">Lote do produto</label>
              <input class="form-input" name="lote_produto" placeholder="Nº do lote">
            </div>
            <div class="form-group">
              <label class="form-label">Dose por animal (ml)</label>
              <input class="form-input" name="dose_ml_por_animal" type="number" step="0.1" placeholder="Ex: 5.0">
            </div>
            <div class="form-group">
              <label class="form-label">Próximo reforço</label>
              <input class="form-input" name="data_proxima" type="date">
            </div>
          </div>

          <div class="form-grid form-grid--2">
            <div class="form-group">
              <label class="form-label">Custo total (R$)</label>
              <input class="form-input" name="custo_total" type="number" step="0.01" placeholder="0,00">
            </div>
            <div class="form-group">
              <label class="form-label">Responsável</label>
              <input class="form-input" name="responsavel" placeholder="Veterinário ou responsável">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Observação</label>
            <textarea class="form-textarea" name="observacao" rows="2"></textarea>
          </div>

          <button type="submit" class="btn btn--primario w-full">Registrar Evento</button>
        </form>
      </div>

      <!-- Painel de referência rápida -->
      <div style="display:flex;flex-direction:column;gap:var(--sp-4)">

        <div class="card">
          <div class="card__title">📅 Calendário Vacinal Sugerido</div>
          <div style="display:flex;flex-direction:column;gap:var(--sp-2)">
            ${[
              { vacina: 'Febre Aftosa', periodo: 'Maio e Novembro', obrigatoria: true },
              { vacina: 'Brucelose (fêmeas 3–8 meses)', periodo: 'Aplicação única', obrigatoria: true },
              { vacina: 'Raiva', periodo: 'Anual', obrigatoria: true },
              { vacina: 'Clostridioses', periodo: 'Anual + reforço 30 dias', obrigatoria: false },
              { vacina: 'Botulismo', periodo: 'Anual', obrigatoria: false },
              { vacina: 'Vermifugação', periodo: 'A cada 90 dias', obrigatoria: false },
            ].map(v => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-2) var(--sp-3);background:var(--cor-surface-2);border-radius:var(--raio-sm)">
                <div>
                  <div style="font-size:.85rem;font-weight:700">${v.vacina}</div>
                  <div class="text-muted text-sm">${v.periodo}</div>
                </div>
                ${v.obrigatoria
                  ? '<span class="badge badge--vermelho" style="font-size:.65rem">Obrigatória</span>'
                  : '<span class="badge badge--cinza" style="font-size:.65rem">Recomendada</span>'}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card__title">⚡ Ações Rápidas</div>
          <div style="display:flex;flex-direction:column;gap:var(--sp-2)">
            <button class="btn btn--fantasma w-full" id="btn-aftosa-lote" style="justify-content:flex-start">
              💉 Vacinar lote — Febre Aftosa
            </button>
            <button class="btn btn--fantasma w-full" id="btn-vermifugo-todos" style="justify-content:flex-start">
              🔬 Vermifugar todo o rebanho
            </button>
            <button class="btn btn--fantasma w-full" id="btn-historico-animal" style="justify-content:flex-start">
              📋 Ver histórico de um animal
            </button>
          </div>
        </div>
      </div>
    </div>
  `
}

function bindRegistrar(lotes: Lote[], animais: Animal[]) {
  const selEscopo      = document.getElementById('sel-escopo') as HTMLSelectElement
  const grupoLote      = document.getElementById('grupo-lote')      as HTMLElement
  const grupoIndividual = document.getElementById('grupo-individual') as HTMLElement

  // Troca escopo
  selEscopo?.addEventListener('change', () => {
    grupoLote.style.display      = selEscopo.value === 'lote'       ? 'block' : 'none'
    grupoIndividual.style.display = selEscopo.value === 'individual' ? 'block' : 'none'
  })

  // Selecionar todos
  document.getElementById('btn-selecionar-todos')?.addEventListener('click', () => {
    document.querySelectorAll<HTMLInputElement>('.animal-check').forEach(c => c.checked = true)
  })

  // Ações rápidas — preenche o formulário
  document.getElementById('btn-aftosa-lote')?.addEventListener('click', () => {
    selEscopo.value = 'lote'
    grupoLote.style.display = 'block'
    grupoIndividual.style.display = 'none'
    ;(document.querySelector('[name="tipo"]') as HTMLSelectElement).value = 'vacina'
    ;(document.querySelector('[name="produto"]') as HTMLInputElement).value = 'Febre Aftosa'
    document.querySelector('[name="produto"]')?.scrollIntoView({ behavior: 'smooth' })
  })

  document.getElementById('btn-vermifugo-todos')?.addEventListener('click', () => {
    selEscopo.value = 'todos'
    grupoLote.style.display = 'none'
    grupoIndividual.style.display = 'none'
    ;(document.querySelector('[name="tipo"]') as HTMLSelectElement).value = 'vermifugo'
    document.querySelector('[name="produto"]')?.scrollIntoView({ behavior: 'smooth' })
  })

  document.getElementById('btn-historico-animal')?.addEventListener('click', () => {
    renderSaudeTela('historico', lotes, animais)
    carregarHistoricoSaude()
  })

  // Submit principal
  document.getElementById('form-saude')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const data = Object.fromEntries(new FormData(form))
    const escopo = data.escopo as string

    // Monta payload base
    const payload: Record<string, unknown> = {
      escopo,
      tipo:               data.tipo,
      produto:            data.produto,
      fabricante:         data.fabricante         || undefined,
      lote_produto:       data.lote_produto        || undefined,
      data_aplicacao:     data.data_aplicacao,
      data_proxima:       data.data_proxima        || undefined,
      dose_ml_por_animal: data.dose_ml_por_animal  ? parseFloat(data.dose_ml_por_animal as string) : undefined,
      custo_total:        data.custo_total         ? parseFloat(data.custo_total as string) : undefined,
      responsavel:        data.responsavel         || undefined,
      observacao:         data.observacao          || undefined,
    }

    if (escopo === 'lote') {
      payload.lote_id              = data.lote_id
      payload.expandir_para_animais = data.expandir_para_animais === 'true'
    }

    if (escopo === 'individual') {
      const selecionados = Array.from(
        document.querySelectorAll<HTMLInputElement>('.animal-check:checked')
      ).map(c => ({ animal_id: c.value }))

      if (selecionados.length === 0) { toast.warning('Selecione pelo menos um animal'); return }
      payload.animais = selecionados
    }

    if (escopo === 'todos') {
      payload.expandir_para_animais = true
    }

    try {
      const res = await api.post<{ data: { animaisVinculados: number } }>('/saude', payload)
      const qtd = res.data.animaisVinculados
      toast.success(`Evento registrado! ${qtd > 0 ? `${qtd} animal(is) vinculado(s).` : ''}`)
      form.reset()
      ;(form.querySelector('[name="data_aplicacao"]') as HTMLInputElement).value = hoje()
      renderSaudeTela('historico', lotes, animais)
      carregarHistoricoSaude()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar')
    }
  })
}

// ── HISTÓRICO ────────────────────────────────────────────────────────────────

async function carregarHistoricoSaude() {
  const el = document.getElementById('historico-saude')
  if (!el) return

  try {
    const res = await api.get<{ data: SaudeEvento[] }>('/saude?pageSize=50')
    const eventos = res.data

    if (eventos.length === 0) {
      el.innerHTML = `
        <div class="card__title">Histórico de Eventos Sanitários</div>
        <div class="empty-state" style="padding:var(--sp-8)">
          <div class="empty-state__icon">💉</div>
          <h3>Nenhum evento registrado ainda</h3>
          <p class="text-muted mt-4">Registre vacinas, vermifugações e tratamentos do rebanho.</p>
        </div>
      `
      return
    }

    const linhas = eventos.map(ev => `
      <tr>
        <td>${formatDate(ev.data_aplicacao)}</td>
        <td>${tipoBadge(ev.tipo)}</td>
        <td><strong>${ev.produto}</strong></td>
        <td>${escopoBadge(ev.escopo)}</td>
        <td>${ev.lote_nome ?? (ev.escopo === 'todos' ? '<span class="badge badge--amarelo">Todo rebanho</span>' : '—')}</td>
        <td class="text-right">${ev.quantidade_animais}</td>
        <td class="text-right">${ev.custo_total ? formatBRL(parseFloat(ev.custo_total)) : '—'}</td>
        <td>${ev.data_proxima
          ? `<span class="${new Date(ev.data_proxima) < new Date() ? 'badge badge--vermelho' : 'badge badge--verde'}">${formatDate(ev.data_proxima)}</span>`
          : '<span class="text-muted">—</span>'}</td>
        <td class="text-muted text-sm">${ev.responsavel ?? '—'}</td>
      </tr>
    `).join('')

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-5)">
        <div class="card__title" style="margin-bottom:0">Histórico de Eventos Sanitários</div>
        <span class="text-muted text-sm">${eventos.length} evento(s)</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Tipo</th><th>Produto</th><th>Escopo</th><th>Lote</th>
              <th class="text-right">Animais</th><th class="text-right">Custo</th>
              <th>Próximo reforço</th><th>Responsável</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `
  } catch {
    el.innerHTML = `<div class="card__title">Histórico</div><p class="text-muted">Erro ao carregar.</p>`
  }
}

// ── ALERTAS ──────────────────────────────────────────────────────────────────

async function carregarAlertas() {
  const el = document.getElementById('alertas-saude')
  if (!el) return

  try {
    const [proximos30, proximos60] = await Promise.all([
      api.get<{ data: SaudeEvento[] }>('/saude/proximos-reforcos?dias=30'),
      api.get<{ data: SaudeEvento[] }>('/saude/proximos-reforcos?dias=60'),
    ])

    const vencidos = proximos30.data.filter(e => e.data_proxima && new Date(e.data_proxima) < new Date())
    const em30dias = proximos30.data.filter(e => e.data_proxima && new Date(e.data_proxima) >= new Date())
    const em60dias = proximos60.data.filter(e => {
      if (!e.data_proxima) return false
      const d = new Date(e.data_proxima)
      const hoje30 = new Date(); hoje30.setDate(hoje30.getDate() + 30)
      return d >= hoje30
    })

    const renderBloco = (titulo: string, cor: string, eventos: SaudeEvento[], icone: string) => {
      if (eventos.length === 0) return ''
      return `
        <div style="margin-bottom:var(--sp-6)">
          <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-3)">
            <span>${icone}</span>
            <strong style="color:${cor}">${titulo}</strong>
            <span class="badge badge--${cor === 'var(--cor-perigo)' ? 'vermelho' : cor === 'var(--cor-aviso)' ? 'amarelo' : 'azul'}">${eventos.length}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--sp-2)">
            ${eventos.map(ev => `
              <div style="background:var(--cor-surface-2);border-left:3px solid ${cor};border-radius:var(--raio-sm);padding:var(--sp-3) var(--sp-4);display:flex;align-items:center;justify-content:space-between">
                <div>
                  <div style="font-weight:700">${ev.produto} — ${tipoBadge(ev.tipo)}</div>
                  <div class="text-muted text-sm">
                    ${ev.lote_nome ?? (ev.escopo === 'todos' ? 'Todo o rebanho' : 'Individual')}
                    · ${ev.quantidade_animais} animal(is)
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-weight:700;color:${cor}">${formatDate(ev.data_proxima!)}</div>
                  <div class="text-muted text-sm">próximo reforço</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
    }

    const temAlertas = vencidos.length + em30dias.length + em60dias.length > 0

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-5)">
        <div class="card__title" style="margin-bottom:0">🔔 Próximos Reforços e Alertas</div>
      </div>
      ${!temAlertas
        ? `<div class="empty-state" style="padding:var(--sp-8)"><div class="empty-state__icon">✅</div><h3>Tudo em dia!</h3><p class="text-muted mt-4">Nenhum reforço pendente nos próximos 60 dias.</p></div>`
        : `
          ${renderBloco('Vencidos — aplicar imediatamente', 'var(--cor-perigo)', vencidos, '🚨')}
          ${renderBloco('Próximos 30 dias', 'var(--cor-aviso)', em30dias, '⚠️')}
          ${renderBloco('Próximos 31–60 dias', '#2563eb', em60dias, '📅')}
        `
      }
    `
  } catch {
    el.innerHTML = `<div class="card__title">Alertas</div><p class="text-muted">Erro ao carregar alertas.</p>`
  }
}
