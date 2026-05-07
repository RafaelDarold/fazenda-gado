type ToastType = "success" | "error" | "warning" | "info";

function show(message: string, type: ToastType = "info", duration = 4000) {
  const container =
    document.getElementById("toast-container") ??
    (() => {
      const el = document.createElement("div");
      el.id = "toast-container";
      document.body.appendChild(el);
      return el;
    })();

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${{ success: "✓", error: "✕", warning: "⚠", info: "ℹ" }[type]}</span>
    <span class="toast__message">${message}</span>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export const toast = {
  success: (msg: string) => show(msg, "success"),
  error: (msg: string) => show(msg, "error"),
  warning: (msg: string) => show(msg, "warning"),
  info: (msg: string) => show(msg, "info"),
};

/**
 * Ativa o toggle de mostrar/ocultar senha em todos os campos
 * com class .senha-wrapper dentro do seletor informado.
 * Deve ser chamado após o HTML ser renderizado no DOM.
 */
export function ativarToggleSenha(seletor = "body") {
  const container = document.querySelector(seletor) ?? document.body;
  container
    .querySelectorAll<HTMLElement>(".senha-wrapper")
    .forEach((wrapper) => {
      const input = wrapper.querySelector<HTMLInputElement>(
        'input[type="password"], input.senha-input',
      );
      if (!input || wrapper.querySelector(".senha-toggle")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "senha-toggle";
      btn.title = "Mostrar/ocultar senha";
      btn.innerHTML = olhoFechado();

      btn.addEventListener("click", () => {
        const visivel = input.type === "text";
        input.type = visivel ? "password" : "text";
        btn.innerHTML = visivel ? olhoFechado() : olhoAberto();
      });

      wrapper.appendChild(btn);
    });
}

function olhoAberto() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

function olhoFechado() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

/**
 * Modal de confirmacao personalizado — substitui o confirm() nativo.
 * Retorna uma Promise<boolean> que resolve com true (confirmar) ou false (cancelar).
 */
export function confirmar(
  mensagem: string,
  opcoes?: {
    titulo?: string;
    textoBotaoOk?: string;
    textoBotaoCancelar?: string;
    tipo?: "perigo" | "aviso" | "info";
  },
): Promise<boolean> {
  return new Promise((resolve) => {
    const {
      titulo = "Confirmar acao",
      textoBotaoOk = "Confirmar",
      textoBotaoCancelar = "Cancelar",
      tipo = "info",
    } = opcoes ?? {};

    const corBotao: Record<string, string> = {
      perigo: "btn--perigo",
      aviso: "btn--acento",
      info: "btn--primario",
    };

    const icone: Record<string, string> = {
      perigo: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cor-perigo)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      aviso: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cor-aviso)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--verde-medio)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    };

    // Remove modal anterior se existir
    document.getElementById("confirmar-modal")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "confirmar-modal";
    overlay.style.cssText = `
      position:fixed;inset:0;
      background:rgba(0,0,0,.55);
      display:flex;align-items:center;justify-content:center;
      z-index:9999;
      animation:fadeIn .12s ease;
    `;

    overlay.innerHTML = `
      <div style="
        background:var(--cor-surface);
        border-radius:var(--raio-lg);
        padding:var(--sp-8);
        width:90%;max-width:400px;
        box-shadow:var(--sombra-lg);
        animation:slideUp .15s ease;
      ">
        <div style="display:flex;align-items:flex-start;gap:var(--sp-4);margin-bottom:var(--sp-5)">
          <div style="flex-shrink:0;margin-top:2px">${icone[tipo]}</div>
          <div>
            <div style="font-family:var(--fonte-display);font-size:1.1rem;font-weight:600;color:var(--verde-escuro);margin-bottom:var(--sp-2)">${titulo}</div>
            <div style="font-size:.9rem;color:var(--cor-texto-2);line-height:1.5">${mensagem}</div>
          </div>
        </div>
        <div style="display:flex;gap:var(--sp-3);justify-content:flex-end;padding-top:var(--sp-4);border-top:1px solid var(--cor-borda)">
          <button id="confirmar-cancelar" class="btn btn--fantasma">${textoBotaoCancelar}</button>
          <button id="confirmar-ok" class="btn ${corBotao[tipo]}">${textoBotaoOk}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const fechar = (resultado: boolean) => {
      overlay.remove();
      resolve(resultado);
    };

    document
      .getElementById("confirmar-ok")
      ?.addEventListener("click", () => fechar(true));
    document
      .getElementById("confirmar-cancelar")
      ?.addEventListener("click", () => fechar(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) fechar(false);
    });
  });
}
