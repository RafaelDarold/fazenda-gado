import { Router } from "express";
import { movimentacaoService } from "../../services/movimentacao.service.js";
import { asyncHandler } from "../middlewares/error.middleware.js";

const router = Router();
const fid = (req: any) => req.usuario?.fazenda_id ?? "";

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const {
      page,
      pageSize,
      tipo,
      direcao,
      animal_id,
      lote_id,
      data_inicio,
      data_fim,
    } = req.query as any;
    const resultado = await movimentacaoService.listar(
      { tipo, direcao, animal_id, lote_id, data_inicio, data_fim },
      {
        page: page ? parseInt(page) : 1,
        pageSize: pageSize ? parseInt(pageSize) : 20,
      },
    );
    res.json({ success: true, ...resultado });
  }),
);

router.get(
  "/animal/:animalId",
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: await movimentacaoService.historicoPorAnimal(
        req.params["animalId"] as string,
      ),
    });
  }),
);

router.post(
  "/compra",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await movimentacaoService.confirmarCompra({
          ...req.body,
          fazenda_id: fid(req),
        }),
      });
  }),
);

router.post(
  "/venda/frigorifico/etapa1",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await movimentacaoService.confirmarVendaFrigorificoEtapa1({
          ...req.body,
          fazenda_id: fid(req),
        }),
      });
  }),
);

router.post(
  "/venda/frigorifico/etapa2",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await movimentacaoService.confirmarBoletimAbate({
          ...req.body,
          fazenda_id: fid(req),
        }),
      });
  }),
);

router.post(
  "/venda/direta",
  asyncHandler(async (req, res) => {
    const resultado = await movimentacaoService.confirmarVendaDireta({
      ...req.body,
      fazenda_id: fid(req),
    });
    res.status(201).json({ success: true, data: resultado });
  }),
);

router.post(
  "/obito",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await movimentacaoService.registrarObito({
          ...req.body,
          fazenda_id: fid(req),
        }),
      });
  }),
);

router.post(
  "/nascimento",
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({
        success: true,
        data: await movimentacaoService.registrarNascimento({
          ...req.body,
          fazenda_id: fid(req),
        }),
      });
  }),
);

export default router;
