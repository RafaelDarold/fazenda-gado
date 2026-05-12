import { Router } from "express";
import { financeiroService } from "../../services/financeiro.service.js";
import { asyncHandler } from "../middlewares/error.middleware.js";

const router = Router();

router.get(
  "/categorias",
  asyncHandler(async (req, res) => {
    const { tipo } = req.query as any;
    res.json({
      success: true,
      data: await financeiroService.listarCategorias(tipo),
    });
  }),
);

router.get(
  "/lancamentos",
  asyncHandler(async (req, res) => {
    const fazendaId = req.usuario?.fazenda_id ?? undefined;
    const {
      page,
      pageSize,
      tipo,
      status,
      categoria_id,
      pago,
      data_inicio,
      data_fim,
      pasto_id,
    } = req.query as any;
    const resultado = await financeiroService.listar(
      {
        tipo,
        status,
        categoria_id,
        pago: pago !== undefined ? pago === "true" : undefined,
        data_inicio,
        data_fim,
        pasto_id,
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
  "/lancamentos/pendentes",
  asyncHandler(async (req, res) => {
    const fazendaId = req.usuario?.fazenda_id ?? undefined;
    res.json({
      success: true,
      data: await financeiroService.pendentes(fazendaId),
    });
  }),
);

router.get(
  "/lancamentos/a-vencer",
  asyncHandler(async (req, res) => {
    const { dias } = req.query as any;
    res.json({
      success: true,
      data: await financeiroService.aVencer(dias ? parseInt(dias) : 30),
    });
  }),
);

router.get(
  "/resumo",
  asyncHandler(async (req, res) => {
    const { data_inicio, data_fim } = req.query as any;
    const fazendaId = req.usuario?.fazenda_id ?? undefined;
    if (!data_inicio || !data_fim) {
      res
        .status(400)
        .json({
          success: false,
          message: "data_inicio e data_fim são obrigatórios",
        });
      return;
    }
    res.json({
      success: true,
      data: await financeiroService.resumoPeriodo(
        data_inicio,
        data_fim,
        fazendaId,
      ),
    });
  }),
);

router.post(
  "/lancamentos",
  asyncHandler(async (req, res) => {
    const fid = req.usuario?.fazenda_id ?? "";
    res
      .status(201)
      .json({
        success: true,
        data: await financeiroService.lancar({ ...req.body, fazenda_id: fid }),
      });
  }),
);

router.patch(
  "/lancamentos/:id/pagar",
  asyncHandler(async (req, res) => {
    const { data_pagamento } = req.body;
    if (!data_pagamento) {
      res
        .status(400)
        .json({ success: false, message: "data_pagamento é obrigatório" });
      return;
    }
    await financeiroService.marcarComoPago(
      req.params["id"] as string,
      data_pagamento,
    );
    res.json({ success: true, message: "Lançamento marcado como pago" });
  }),
);

router.patch(
  "/lancamentos/:id/cancelar",
  asyncHandler(async (req, res) => {
    await financeiroService.cancelar(req.params["id"] as string);
    res.json({ success: true, message: "Lançamento cancelado" });
  }),
);

export default router;
