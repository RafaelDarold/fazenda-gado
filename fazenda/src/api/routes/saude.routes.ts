import { Router } from "express";
import { saudeService } from "../../services/saude.service.js";
import { asyncHandler } from "../middlewares/error.middleware.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { tipo, escopo, lote_id, data_inicio, data_fim, proximos_dias } =
      req.query as any;
    res.json({
      success: true,
      data: await saudeService.listar({
        tipo,
        escopo,
        lote_id,
        data_inicio,
        data_fim,
        proximos_dias: proximos_dias ? parseInt(proximos_dias) : undefined,
      }),
    });
  }),
);

router.get(
  "/proximos-reforcos",
  asyncHandler(async (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { dias } = req.query as any;
    res.json({
      success: true,
      data: await saudeService.proximosReforcos(dias ? parseInt(dias) : 30),
    });
  }),
);

router.get(
  "/animal/:animalId",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await saudeService.historicoPorAnimal(
        req.params["animalId"] as string,
      ),
    });
  }),
);

router.get(
  "/:id/animais",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await saudeService.animaisDoEvento(req.params["id"] as string),
    });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({ success: true, data: await saudeService.registrar(req.body) });
  }),
);

export default router;
