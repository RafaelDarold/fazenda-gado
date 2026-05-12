import { Router } from "express";
import { recategorizacaoService } from "../../services/recategorizacao.service.js";
import { asyncHandler } from "../middlewares/error.middleware.js";

const router = Router();

// GET /api/recategorizacao/parametros
router.get(
  "/parametros",
  asyncHandler(async (_req, res) => {
    const parametros = await recategorizacaoService.listarParametros();
    res.json({ success: true, data: parametros });
  }),
);

// PATCH /api/recategorizacao/parametros/:id
router.patch(
  "/parametros/:id",
  asyncHandler(async (req, res) => {
    const { meses_minimos, ativo } = req.body;
    await recategorizacaoService.atualizarParametro(
      req.params["id"] as string,
      parseInt(meses_minimos),
      ativo !== false,
    );
    res.json({ success: true, message: "Parametro atualizado" });
  }),
);

// GET /api/recategorizacao/pendentes
router.get(
  "/pendentes",
  asyncHandler(async (_req, res) => {
    const animais =
      await recategorizacaoService.buscarAnimaisParaRecategorizar();
    res.json({ success: true, data: animais });
  }),
);

// GET /api/recategorizacao/pendentes/count
router.get(
  "/pendentes/count",
  asyncHandler(async (_req, res) => {
    const total = await recategorizacaoService.contarPendentes();
    res.json({ success: true, data: { total } });
  }),
);

// POST /api/recategorizacao/executar
router.post(
  "/executar",
  asyncHandler(async (req, res) => {
    const { animais, responsavel, observacao } = req.body;
    if (!animais || !Array.isArray(animais) || animais.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "Nenhum animal selecionado" });
      return;
    }
    const resultado = await recategorizacaoService.recategorizarEmLote(
      animais,
      responsavel,
      observacao,
    );
    res.json({ success: true, data: resultado });
  }),
);

// GET /api/recategorizacao/historico/:animalId
router.get(
  "/historico/:animalId",
  asyncHandler(async (req, res) => {
    const historico = await recategorizacaoService.historicoPorAnimal(
      req.params["animalId"] as string,
    );
    res.json({ success: true, data: historico });
  }),
);

export default router;
