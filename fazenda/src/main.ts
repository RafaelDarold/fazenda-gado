import "./styles/base.css";
import { router } from "./lib/router.js";
import { auth, podeAcessar } from "./lib/auth.js";
import { loginPage } from "./pages/login.js";
import { trocarSenhaPage } from "./pages/trocar-senha.js";
import { dashboardPage } from "./pages/dashboard.js";
import { animaisPage } from "./pages/animais.js";
import { animalDetalhePage } from "./pages/animal-detalhe.js";
import { lotesPage } from "./pages/lotes.js";
import { financeiroPage } from "./pages/financeiro.js";
import { pastosPage } from "./pages/pastos.js";
import { pesagensPage } from "./pages/pesagens.js";
import { movimentacoesPage } from "./pages/movimentacoes.js";
import { saudePage } from "./pages/saude.js";
import { relatoriosPage } from "./pages/relatorios.js";
import { recategorizacaoPage } from "./pages/recategorizacao.js";
import { configuracoesPage } from "./pages/configuracoes.js";

function paginaAcesso() {
  document.getElementById("root")!.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--cor-fundo)">
      <div style="text-align:center;padding:var(--sp-8)">
        <div style="font-size:4rem;margin-bottom:var(--sp-4)">🔒</div>
        <h2 style="font-family:var(--fonte-display);color:var(--verde-escuro);margin-bottom:var(--sp-3)">Acesso Negado</h2>
        <p style="color:var(--cor-texto-3);margin-bottom:var(--sp-6)">Voce nao tem permissao para acessar esta pagina.</p>
        <a href="#/" class="btn btn--primario">Voltar ao inicio</a>
      </div>
    </div>
  `;
}

function proteger<T extends unknown[]>(fn: (...args: T) => void) {
  return (...args: T) => {
    if (!auth.logado()) {
      router.navigate("/login");
      return;
    }
    // Forca troca de senha se for primeiro acesso
    if (auth.precisaTrocarSenha()) {
      router.navigate("/trocar-senha");
      return;
    }
    const rota = window.location.hash.slice(1) || "/";
    if (!podeAcessar(rota)) {
      paginaAcesso();
      return;
    }
    fn(...args);
  };
}

router
  .on("/login", loginPage)
  .on("/trocar-senha", trocarSenhaPage)
  .on("/", proteger(dashboardPage))
  .on("/animais", proteger(animaisPage))
  .on("/animais/:id", proteger(animalDetalhePage))
  .on("/lotes", proteger(lotesPage))
  .on("/financeiro", proteger(financeiroPage))
  .on("/pastos", proteger(pastosPage))
  .on("/pesagens", proteger(pesagensPage))
  .on(
    "/movimentacoes",
    proteger(() => movimentacoesPage("historico")),
  )
  .on(
    "/saude",
    proteger(() => saudePage("historico")),
  )
  .on(
    "/relatorios",
    proteger(() => relatoriosPage("rebanho")),
  )
  .on(
    "/recategorizacao",
    proteger(() => recategorizacaoPage("pendentes")),
  )
  .on(
    "/configuracoes",
    proteger(() => configuracoesPage("minha-conta")),
  )
  .notFound(() => {
    if (!auth.logado()) {
      router.navigate("/login");
      return;
    }
    router.navigate("/");
  })
  .start();
