import { api } from '../lib/api.js'
import { renderLayout } from '../components/layout.js'
import { toast } from '../lib/toast.js'
import { formatArroba } from '../utils/arroba.js'

interface AnimalRow {
  id: string; brinco: string; nome: string | null; raca: string
  sexo: string; categoria: string; lote_nome: string | null
  ultimo_peso_arroba: string | null; ativo: boolean
}
interface Lote { id: string; nome: string; categoria_principal: string }

function categoriaBadge(cat: string) {
  const cores: Record<string, string> = {
    bezerro: 'azul', bezerra: 'azul', novilha: 'verde',
    vaca: 'verde', boi: 'amarelo', touro: 'vermelho',
  }
  return `<span class="badge badge--${cores[cat] ?? 'cinza'}">${cat}</span>`
}

async function carregarLotes(): Promise<Lote[]> {
  const res = await api.get<{ data: Lote[] }>('/lotes')
  return res.data
}

function modalCadastro(lotes: Lote[]): string {
  const lotesOpts = lotes.map(l => `<option value="${l.id}">${l.nome}</option>`).join('')
  return `
    <div class="modal-overlay" id="modal-animal">
      <div class="modal">
        <h2 class="modal__title">Cadastrar Animal</h2>
        <form id="form-animal">
          <div class="form-grid form-grid--2">
            <div class="form-group">
              <label class="form-label">Brinco *</label>
              <input class="form-input" name="brinco" required placeholder="Ex: 001">
            </div>
            <div class="form-group">
              <label class="form-label">Nome</label>
              <input class="form-input" name="nome" placeholder="Opcional">
            </div>
            <div class="form-group">
              <label class="form-label">Raça *</label>
              <input class="form-input" name="raca" required placeholder="Ex: Nelore">
            </div>
            <div class="form-group">
              <label class="form-label">Sexo *</label>
              <select class="form-select" name="sexo" required>
                <option value="">Selecione</option>
                <option value="M">Macho</option>
                <option value="F">Fêmea</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Categoria *</label>
              <select class="form-select" name="categoria" required>
                <option value="">Selecione</option>
                <option value="bezerro">Bezerro</option>
                <option value="bezerra">Bezerra</option>
                <option value="novilha">Novilha</option>
                <option value="vaca">Vaca</option>
                <option value="boi">Boi</option>
                <option value="touro">Touro</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Lote</label>
              <select class="form-select" name="lote_id">
                <option value="">Sem lote</option>
                ${lotesOpts}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Data de nascimento</label>
              <input class="form-input" name="data_nascimento" type="date">
            </div>
            <div class="form-group">
              <label class="form-label">Peso de entrada (@)</label>
              <input class="form-input" name="peso_entrada_arroba" type="number" step="0.001" placeholder="Ex: 18.500">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Observação</label>
            <textarea class="form-textarea" name="observacao" rows="2"></textarea>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--fantasma" id="btn-fechar-modal">Cancelar</button>
            <button type="submit" class="btn btn--primario">Cadastrar Animal</button>
          </div>
        </form>
      </div>
    </div>
  `
}

export async function animaisPage() {
  renderLayout('Animais', '<div class="loading"><div class="spinner"></div>Carregando...</div>')

  try {
    const [res, lotes] = await Promise.all([
      api.get<{ data: AnimalRow[]; total: number }>('/animais?pageSize=50'),
      carregarLotes(),
    ])

    const animais = res.data

    const linhas = animais.map(a => `
      <tr>
        <td><strong>${a.brinco}</strong></td>
        <td>${a.nome ?? '<span class="text-muted">—</span>'}</td>
        <td>${a.raca}</td>
        <td>${a.sexo === 'M' ? 'Macho' : 'Fêmea'}</td>
        <td>${categoriaBadge(a.categoria)}</td>
        <td>${a.lote_nome ?? '<span class="text-muted">—</span>'}</td>
        <td class="text-right">${a.ultimo_peso_arroba ? formatArroba(parseFloat(a.ultimo_peso_arroba)) : '<span class="text-muted">—</span>'}</td>
        <td>
          <a href="#/animais/${a.id}" class="btn btn--fantasma" style="padding:var(--sp-1) var(--sp-3);font-size:.8rem">Ver</a>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="8"><div class="empty-state"><div class="empty-state__icon">🐄</div><h3>Nenhum animal cadastrado</h3></div></td></tr>`

    document.getElementById('app')!.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-header__title">Animais</h2>
          <p class="page-header__sub">${res.total} animal(is) ativo(s)</p>
        </div>
        <button class="btn btn--primario" id="btn-novo-animal">+ Cadastrar Animal</button>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Brinco</th><th>Nome</th><th>Raça</th><th>Sexo</th>
                <th>Categoria</th><th>Lote</th><th class="text-right">Último Peso</th><th></th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
      </div>
    `

    document.getElementById('btn-novo-animal')?.addEventListener('click', () => {
      document.body.insertAdjacentHTML('beforeend', modalCadastro(lotes))

      document.getElementById('btn-fechar-modal')?.addEventListener('click', () => {
        document.getElementById('modal-animal')?.remove()
      })

      document.getElementById('form-animal')?.addEventListener('submit', async (e) => {
        e.preventDefault()
        const form   = e.target as HTMLFormElement
        const data   = Object.fromEntries(new FormData(form))
        const payload: Record<string, unknown> = {
          brinco:    data.brinco,
          raca:      data.raca,
          sexo:      data.sexo,
          categoria: data.categoria,
        }
        if (data.nome)               payload.nome               = data.nome
        if (data.lote_id)            payload.lote_id            = data.lote_id
        if (data.data_nascimento)    payload.data_nascimento    = data.data_nascimento
        if (data.peso_entrada_arroba) payload.peso_entrada_arroba = parseFloat(data.peso_entrada_arroba as string)
        if (data.observacao)         payload.observacao         = data.observacao

        try {
          await api.post('/animais', payload)
          toast.success('Animal cadastrado com sucesso!')
          document.getElementById('modal-animal')?.remove()
          animaisPage()
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar')
        }
      })
    })

  } catch (err) {
    document.getElementById('app')!.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠</div>
        <h3>Erro ao carregar animais</h3>
        <p class="text-muted mt-4">${err instanceof Error ? err.message : 'Erro desconhecido'}</p>
      </div>
    `
  }
}
