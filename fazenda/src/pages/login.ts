import { api } from "../lib/api.js";
import { ativarToggleSenha } from "../lib/toast.js";
import { auth } from "../lib/auth.js";

interface LoginResponse {
  data: {
    token: string;
    usuario: {
      id: string;
      nome: string;
      email: string;
      perfil: "admin" | "caseiro";
    };
    senhaTemporaria: boolean;
  };
}

export function loginPage() {
  document.getElementById("root")!.innerHTML = `
    <div style="
      min-height:100vh;
      background:var(--verde-escuro);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:var(--sp-6)
    ">
      <div style="
        background:var(--cor-surface);
        border-radius:var(--raio-lg);
        padding:var(--sp-10);
        width:100%;
        max-width:420px;
        box-shadow:var(--sombra-lg)
      ">
        <div style="text-align:center;margin-bottom:var(--sp-8)">
          <div style="font-size:3rem;margin-bottom:var(--sp-3)">🐄</div>
          <h1 style="font-family:var(--fonte-display);font-size:1.8rem;font-weight:700;color:var(--verde-escuro);margin-bottom:var(--sp-1)">
            Gestao do Sitio
          </h1>
          <p style="color:var(--cor-texto-3);font-size:.85rem">Sistema de Gerenciamento de Gado</p>
        </div>

        <form id="form-login">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input
              class="form-input"
              name="email"
              type="email"
              required
              placeholder="seu@email.com"
              autocomplete="email"
            >
          </div>
          <div class="form-group">
            <label class="form-label">Senha</label>
            <div class="senha-wrapper"><input
              class="form-input"
              name="senha"
              type="password"
              required
              placeholder="Sua senha"
              autocomplete="current-password"
            ></div>
          </div>
          <div id="login-erro" style="
            display:none;
            background:#fde8e8;
            color:var(--cor-perigo);
            padding:var(--sp-3) var(--sp-4);
            border-radius:var(--raio-sm);
            font-size:.875rem;
            margin-bottom:var(--sp-4)
          "></div>
          <button type="submit" class="btn btn--primario w-full" id="btn-login" style="
            padding:var(--sp-3);
            font-size:1rem;
            justify-content:center
          ">
            Entrar
          </button>
        </form>

        <p style="text-align:center;margin-top:var(--sp-6);color:var(--cor-texto-3);font-size:.75rem">
          Sistema interno — acesso restrito
        </p>
      </div>
    </div>
  `;

  ativarToggleSenha();

  document
    .getElementById("form-login")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const data = Object.fromEntries(new FormData(form));
      const btn = document.getElementById("btn-login") as HTMLButtonElement;
      const erro = document.getElementById("login-erro")!;

      btn.disabled = true;
      btn.textContent = "Entrando...";
      erro.style.display = "none";

      try {
        const res = await api.post<LoginResponse>("/auth/login", {
          email: data.email,
          senha: data.senha,
        });

        auth.salvar(res.data.token, {
          ...res.data.usuario,
          senha_temporaria: res.data.senhaTemporaria,
        });
        window.location.hash = "/";
      } catch (err) {
        erro.style.display = "block";
        erro.textContent =
          err instanceof Error ? err.message : "Erro ao fazer login";
        btn.disabled = false;
        btn.textContent = "Entrar";
      }
    });
}
