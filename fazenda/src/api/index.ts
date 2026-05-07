import { Router } from "express";
import animalRoutes from "./routes/animal.routes.js";
import pesagemRoutes from "./routes/pesagem.routes.js";
import movimentacaoRoutes from "./routes/movimentacao.routes.js";
import financeiroRoutes from "./routes/financeiro.routes.js";
import pastoRoutes from "./routes/pasto.routes.js";
import saudeRoutes from "./routes/saude.routes.js";
import loteRoutes from "./routes/lote.routes.js";
import recategorizacaoRoutes from "./routes/recategorizacao.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { autenticar, exigirPerfil } from "./middlewares/auth.middleware.js";

const router = Router();

// Auth — publica
router.use("/auth", authRoutes);

// Rotas acessiveis por todos os usuarios autenticados
router.use("/animais", autenticar, animalRoutes);
router.use("/pesagens", autenticar, pesagemRoutes);
router.use("/lotes", autenticar, loteRoutes);
router.use("/saude", autenticar, saudeRoutes);
router.use("/recategorizacao", autenticar, recategorizacaoRoutes);

// Pastos — autenticado, caseiro pode acessar
router.use("/pastos", autenticar, pastoRoutes);

// Rotas restritas ao admin
router.use(
  "/movimentacoes",
  autenticar,
  exigirPerfil("admin"),
  movimentacaoRoutes,
);
router.use("/financeiro", autenticar, exigirPerfil("admin"), financeiroRoutes);

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "API online",
    timestamp: new Date().toISOString(),
  });
});

export default router;
