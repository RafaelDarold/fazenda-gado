import { api } from "../lib/api.js";
import { ativarToggleSenha } from "../lib/toast.js";
import { auth } from "../lib/auth.js";
import { toast } from "../lib/toast.js";

export function trocarSenhaPage() {
  const usuario = auth.usuario();

  document.getElementById("root")!.innerHTML = `
    <div style="min-height:100vh;background:var(--verde-escuro);display:flex;align-items:center;justify-content:center;padding:var(--sp-6)">
      <div style="background:var(--cor-surface);border-radius:var(--raio-lg);padding:var(--sp-10);width:100%;max-width:440px;box-shadow:var(--sombra-lg)">
        <div style="text-align:center;margin-bottom:var(--sp-6)">
          <div style="width:64px;height:64px;background:var(--dourado);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto var(--sp-4)">
            <span style="font-size:1.8rem">🔑</span>
          </div>
          <h1 style="font-family:var(--fonte-display);font-size:1.6rem;font-weight:700;color:var(--verde-escuro);margin-bottom:var(--sp-2)">Troque sua senha</h1>
          <p style="color:var(--cor-texto-3);font-size:.9rem">
            Ola, <strong>${usuario?.nome ?? ""}</strong>! Por seguranca, defina uma nova senha antes de continuar.
          </p>
        </div>
        <form id="form-trocar-senha">
          <div class="form-group">
            <label class="form-label">Nova senha *</label>
            <div class="senha-wrapper"><input class="form-input" name="nova_senha" type="password" required placeholder="Minimo 6 caracteres" minlength="6"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar nova senha *</label>
            <div class="senha-wrapper"><input class="form-input" name="confirmar" type="password" required placeholder="Repita a senha"></div>
          </div>
          <div id="trocar-erro" style="display:none;background:#fde8e8;color:var(--cor-perigo);padding:var(--sp-3) var(--sp-4);border-radius:var(--raio-sm);font-size:.875rem;margin-bottom:var(--sp-4)"></div>
          <button type="submit" class="btn btn--primario w-full" id="btn-trocar" style="padding:var(--sp-3);font-size:1rem;justify-content:center">
            Definir nova senha e entrar
          </button>
        </form>
        <p style="text-align:center;margin-top:var(--sp-5);font-size:.75rem;color:var(--cor-texto-3)">
          <a href="#" onclick="localStorage.clear();window.location.hash='/login'" style="color:var(--cor-texto-3)">Sair e usar outra conta</a>
        </p>
      </div>
    </div>
  `;

  ativarToggleSenha();

  document
    .getElementById("form-trocar-senha")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(
        new FormData(e.target as HTMLFormElement),
      );
      const btn = document.getElementById("btn-trocar") as HTMLButtonElement;
      const erro = document.getElementById("trocar-erro")!;
      erro.style.display = "none";

      if (data.nova_senha !== data.confirmar) {
        erro.style.display = "block";
        erro.textContent = "As senhas nao coincidem.";
        return;
      }
      btn.disabled = true;
      btn.textContent = "Salvando...";
      try {
        await api.patch("/auth/trocar-senha", { nova_senha: data.nova_senha });
        auth.marcarSenhaTrocada();
        toast.success("Senha definida! Bem-vindo ao sistema.");
        window.location.hash = "/";
      } catch (err) {
        erro.style.display = "block";
        erro.textContent =
          err instanceof Error ? err.message : "Erro ao trocar senha";
        btn.disabled = false;
        btn.textContent = "Definir nova senha e entrar";
      }
    });
}
