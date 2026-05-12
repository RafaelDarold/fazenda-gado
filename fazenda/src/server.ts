import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { testConnection } from "./db/index.js";
import { env } from "./config/env.js";
import apiRouter from "./api/index.js";
import { errorMiddleware } from "./api/middlewares/error.middleware.js";
import {
  rateLimitGeral,
  sanitizarInputs,
  headersSeguranca,
  sanitizarQueryParams,
} from "./api/middlewares/security.middleware.js";
import { authService } from "./services/auth.service.js";
import { recalcularContadoresLotes } from "./repositories/lote.repository.js";

async function main() {
  console.log(`\n Sistema de Gerenciamento de Gado iniciando...`);
  console.log(`   Ambiente : ${env.app.env}`);
  console.log(`   Banco    : ${env.db.database}@${env.db.host}:${env.db.port}`);

  try {
    await testConnection();
    console.log(`   Banco    : conectado com sucesso`);
  } catch (err) {
    console.error(`\n Falha ao conectar no banco de dados:`);
    console.error(err);
    process.exit(1);
  }

  // Garante que existe pelo menos um admin
  await authService.garantirAdminPadrao();
  await recalcularContadoresLotes();
  console.log("   Contadores: sincronizados");

  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(headersSeguranca);
  app.use(rateLimitGeral);
  app.use(
    cors({
      origin: ["http://localhost:5173", "http://localhost:3000"],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "5mb" }));
  app.use(sanitizarInputs);
  app.use(sanitizarQueryParams);
  app.use("/api", apiRouter);
  app.use(errorMiddleware);

  app.listen(env.app.port, () => {
    console.log(`\n Servidor pronto na porta ${env.app.port}`);
    console.log(`   Frontend : http://localhost:5173`);
    console.log(`   API      : http://localhost:${env.app.port}/api`);
    console.log(`   Health   : http://localhost:${env.app.port}/api/health\n`);
  });
}

main();
