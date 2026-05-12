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
import fazendaRoutes from "./routes/fazenda.routes.js";
import racaRoutes from "./routes/raca.routes.js";
import {
  autenticar,
  exigirPerfil,
  injetarFazenda,
} from "./middlewares/auth.middleware.js";

const router = Router();

// Publica
router.use("/auth", authRoutes);

// Gestao de fazendas — owner e super_admin
router.use("/fazendas", fazendaRoutes);
router.use("/racas", racaRoutes);

// Middleware para todas as rotas de dados: autentica + injeta fazenda_id
const dadosMiddleware = [autenticar, injetarFazenda];
const apenasAdmin = [
  autenticar,
  injetarFazenda,
  exigirPerfil("owner", "super_admin", "admin"),
];

router.use("/animais", ...dadosMiddleware, animalRoutes);
router.use("/pesagens", ...dadosMiddleware, pesagemRoutes);
router.use("/lotes", ...dadosMiddleware, loteRoutes);
router.use("/saude", ...dadosMiddleware, saudeRoutes);
router.use("/recategorizacao", ...dadosMiddleware, recategorizacaoRoutes);
router.use("/pastos", ...dadosMiddleware, pastoRoutes);
router.use("/movimentacoes", ...apenasAdmin, movimentacaoRoutes);
router.use("/financeiro", ...apenasAdmin, financeiroRoutes);

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "API online",
    timestamp: new Date().toISOString(),
  });
});

export default router;
