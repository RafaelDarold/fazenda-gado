import { Router } from "express";
import { animalService } from "../../services/animal.service.js";
import { asyncHandler } from "../middlewares/error.middleware.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { page, pageSize, ativo, sexo, categoria, lote_id, raca, brinco } =
      req.query as any;
    const fazendaId = req.usuario?.fazenda_id ?? "";
    const resultado = await animalService.listar(
      {
        ativo: ativo !== "false",
        sexo,
        categoria,
        lote_id,
        raca,
        brinco,
        fazenda_id: fazendaId,
      },
      {
        page: page ? parseInt(page) : 1,
        pageSize: pageSize ? parseInt(pageSize) : 20,
      },
    );
    res.json({ success: true, ...resultado });
  }),
);

router.get(
  "/totais",
  asyncHandler(async (_req, res) => {
    const [total, porCategoria] = await Promise.all([
      animalService.totalAtivo(),
      animalService.contarPorCategoria(),
    ]);
    res.json({ success: true, data: { total, porCategoria } });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await animalService.buscarPorId(req.params["id"] as string),
    });
  }),
);

router.get(
  "/:id/pesagens",
  asyncHandler(async (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { limite } = req.query as any;
    res.json({
      success: true,
      data: await animalService.historicoPesagem(
        req.params["id"] as string,
        limite ? parseInt(limite) : 20,
      ),
    });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const fazendaId = req.usuario?.fazenda_id ?? "";
    res.status(201).json({
      success: true,
      data: await animalService.cadastrar({
        ...req.body,
        fazenda_id: fazendaId,
      }),
    });
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await animalService.atualizar(req.params["id"] as string, req.body),
    });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await animalService.inativar(req.params["id"] as string);
    res.json({ success: true, message: "Animal inativado com sucesso" });
  }),
);

export default router;
