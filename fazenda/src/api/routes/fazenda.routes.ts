import { Router } from "express";
import { fazendaRepository } from "../../repositories/fazenda.repository.js";
import { authService } from "../../services/auth.service.js";
import { asyncHandler } from "../middlewares/error.middleware.js";
import { autenticar, exigirPerfil } from "../middlewares/auth.middleware.js";

const router = Router();

// Listar todas as fazendas — owner e super_admin
router.get(
  "/",
  autenticar,
  exigirPerfil("owner", "super_admin"),
  asyncHandler(async (_req, res) => {
    const fazendas = await fazendaRepository.findAll();
    res.json({ success: true, data: fazendas });
  }),
);

// Buscar uma fazenda
router.get(
  "/:id",
  autenticar,
  asyncHandler(async (req, res) => {
    const fazenda = await fazendaRepository.findById(
      req.params["id"] as string,
    );
    if (!fazenda) {
      res
        .status(404)
        .json({ success: false, message: "Fazenda nao encontrada" });
      return;
    }
    res.json({ success: true, data: fazenda });
  }),
);

// Criar fazenda — owner e super_admin
router.post(
  "/",
  autenticar,
  exigirPerfil("owner", "super_admin"),
  asyncHandler(async (req, res) => {
    const fazenda = await fazendaRepository.create(req.body);
    res.status(201).json({ success: true, data: fazenda });
  }),
);

// Atualizar fazenda — owner e super_admin, ou admin da propria fazenda
router.patch(
  "/:id",
  autenticar,
  asyncHandler(async (req, res) => {
    const u = req.usuario!;
    const id = req.params["id"] as string;
    if (
      u.perfil !== "owner" &&
      u.perfil !== "super_admin" &&
      u.fazenda_id !== id
    ) {
      res.status(403).json({ success: false, message: "Acesso negado" });
      return;
    }
    const fazenda = await fazendaRepository.update(id, req.body);
    res.json({ success: true, data: fazenda });
  }),
);

// Excluir fazenda — apenas owner
router.delete(
  "/:id",
  autenticar,
  exigirPerfil("owner"),
  asyncHandler(async (req, res) => {
    await fazendaRepository.delete(req.params["id"] as string);
    res.json({ success: true, message: "Fazenda excluida" });
  }),
);

// Listar usuarios de uma fazenda
router.get(
  "/:id/usuarios",
  autenticar,
  exigirPerfil("owner", "super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const usuarios = await authService.listar(req.params["id"] as string);
    res.json({ success: true, data: usuarios });
  }),
);

// Criar usuario para uma fazenda
router.post(
  "/:id/usuarios",
  autenticar,
  exigirPerfil("owner", "super_admin", "admin"),
  asyncHandler(async (req, res) => {
    const { nome, email, senha, perfil } = req.body;
    const fazendaId = req.params["id"] as string;
    // admin so pode criar caseiro
    if (req.usuario!.perfil === "admin" && perfil !== "caseiro") {
      res
        .status(403)
        .json({ success: false, message: "Admin so pode criar caseiros" });
      return;
    }
    const usuario = await authService.criar(
      nome,
      email,
      senha,
      perfil,
      fazendaId,
    );
    res.status(201).json({ success: true, data: usuario });
  }),
);

export default router;
