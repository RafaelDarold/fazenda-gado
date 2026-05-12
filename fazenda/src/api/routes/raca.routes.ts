import { Router } from "express";
import { racaRepository } from "../../repositories/raca.repository.js";
import { asyncHandler } from "../middlewares/error.middleware.js";
import { autenticar, exigirPerfil } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/racas — qualquer usuario autenticado
router.get(
  "/",
  autenticar,
  asyncHandler(async (_req, res) => {
    const racas = await racaRepository.findAll();
    res.json({ success: true, data: racas });
  }),
);

// POST — apenas owner e super_admin
router.post(
  "/",
  autenticar,
  exigirPerfil("owner", "super_admin"),
  asyncHandler(async (req, res) => {
    const { nome, origem } = req.body;
    if (!nome) {
      res.status(400).json({ success: false, message: "Nome obrigatorio" });
      return;
    }
    const raca = await racaRepository.create(nome, origem);
    res.status(201).json({ success: true, data: raca });
  }),
);

// PATCH /:id
router.patch(
  "/:id",
  autenticar,
  exigirPerfil("owner", "super_admin"),
  asyncHandler(async (req, res) => {
    const { nome, origem } = req.body;
    const raca = await racaRepository.update(
      req.params["id"] as string,
      nome,
      origem,
    );
    res.json({ success: true, data: raca });
  }),
);

// PATCH /:id/toggle
router.patch(
  "/:id/toggle",
  autenticar,
  exigirPerfil("owner", "super_admin"),
  asyncHandler(async (req, res) => {
    await racaRepository.toggleAtivo(req.params["id"] as string);
    res.json({ success: true, message: "Status atualizado" });
  }),
);

// DELETE /:id
router.delete(
  "/:id",
  autenticar,
  exigirPerfil("owner", "super_admin"),
  asyncHandler(async (req, res) => {
    await racaRepository.delete(req.params["id"] as string);
    res.json({ success: true, message: "Raca excluida" });
  }),
);

export default router;
