import { Router } from "express";
import { pesagemService } from "../../services/pesagem.service.js";
import { asyncHandler } from "../middlewares/error.middleware.js";

const router = Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const fid = req.usuario?.fazenda_id ?? "";
    res
      .status(201)
      .json({
        success: true,
        data: await pesagemService.registrar({ ...req.body, fazenda_id: fid }),
      });
  }),
);

router.post(
  "/lote",
  asyncHandler(async (req, res) => {
    const fid2 = req.usuario?.fazenda_id ?? "";
    res
      .status(201)
      .json({
        success: true,
        data: await pesagemService.registrarEmLote({
          ...req.body,
          fazenda_id: fid2,
        }),
      });
  }),
);

router.get(
  "/animal/:animalId",
  asyncHandler(async (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { limite } = req.query as any;
    res.json({
      success: true,
      data: await pesagemService.historicoPorAnimal(
        req.params["animalId"] as string,
        limite ? parseInt(limite) : 20,
      ),
    });
  }),
);

router.get(
  "/lote/:loteId",
  asyncHandler(async (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = req.query as any;
    res.json({
      success: true,
      data: await pesagemService.pesagensPorLote(
        req.params["loteId"] as string,
        data,
      ),
    });
  }),
);

router.get(
  "/relatorio",
  asyncHandler(async (req, res) => {
    const { data_inicio, data_fim } = req.query as any;
    const sql = `
    SELECT p.*,
      a.brinco AS animal_brinco, a.nome AS animal_nome,
      l.nome   AS lote_nome
    FROM pesagem p
    LEFT JOIN animal a ON a.id = p.animal_id
    LEFT JOIN lote   l ON l.id = a.lote_id
    WHERE 1=1
      ${data_inicio ? "AND p.data >= '" + data_inicio + "'" : ""}
      ${data_fim ? "AND p.data <= '" + data_fim + "'" : ""}
    ORDER BY p.data DESC
    LIMIT 500
  `;
    const { query: dbQuery } = await import("../../db/index.js");
    const rows = await dbQuery(sql);
    res.json({ success: true, data: rows });
  }),
);

export default router;
