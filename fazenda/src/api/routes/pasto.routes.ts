import { Router } from "express";
import { pastoService } from "../../services/pasto.service.js";
import { asyncHandler } from "../middlewares/error.middleware.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const fid = req.usuario?.fazenda_id ?? undefined;
    res.json({ success: true, data: await pastoService.listar(fid) });
  }),
);
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await pastoService.buscarPorId(req.params["id"] as string),
    });
  }),
);

router.get(
  "/:id/historico",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await pastoService.historicoOcupacao(req.params["id"] as string),
    });
  }),
);

router.get(
  "/:id/cocho",
  asyncHandler(async (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data_inicio, data_fim } = req.query as any;
    res.json({
      success: true,
      data: await pastoService.historicoCocho(
        req.params["id"] as string,
        data_inicio,
        data_fim,
      ),
    });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({ success: true, data: await pastoService.cadastrar(req.body) });
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await pastoService.atualizar(req.params["id"] as string, req.body),
    });
  }),
);

router.post(
  "/mover-lote",
  asyncHandler(async (req, res) => {
    const { lote_id, pasto_id, data, observacao } = req.body;
    if (!lote_id || !pasto_id || !data) {
      res
        .status(400)
        .json({
          success: false,
          message: "lote_id, pasto_id e data são obrigatórios",
        });
      return;
    }
    await pastoService.moverLote(lote_id, pasto_id, data, observacao);
    res.json({ success: true, message: "Lote movido com sucesso" });
  }),
);

router.post(
  "/:id/cocho",
  asyncHandler(async (req, res) => {
    const fid = req.usuario?.fazenda_id ?? "";
    res
      .status(201)
      .json({
        success: true,
        data: await pastoService.registrarAbastecimento({
          ...req.body,
          pasto_id: req.params["id"] as string,
          fazenda_id: fid,
        }),
      });
  }),
);

export default router;
