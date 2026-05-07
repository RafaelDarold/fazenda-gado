import { renderLayout } from '../components/layout.js'

export function placeholderPage(title: string, icon = '🚧') {
  renderLayout(title, `
    <div class="empty-state" style="padding: var(--sp-12) 0">
      <div class="empty-state__icon">${icon}</div>
      <h3>${title}</h3>
      <p class="text-muted mt-4">Esta página será implementada na próxima etapa do desenvolvimento.</p>
    </div>
  `)
}
