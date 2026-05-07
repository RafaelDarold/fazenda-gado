import { Router } from "express";
import { authService } from '../../services/auth.service.js'
import { asyncHandler } from "../middlewares/error.middleware.js";
import { autenticar, exigirPerfil } from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) {
      res
        .status(400)
        .json({ success: false, message: "Email e senha obrigatorios" });
      return;
    }
    const resultado = await authService.login(email, senha);
    res.json({ success: true, data: resultado });
  }),
);

router.get(
  "/me",
  autenticar,
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: req.usuario });
  }),
);

router.get(
  "/usuarios",
  autenticar,
  exigirPerfil("admin"),
  asyncHandler(async (_req, res) => {
    const usuarios = await authService.listar();
    res.json({ success: true, data: usuarios });
  }),
);

router.post(
  "/usuarios",
  autenticar,
  exigirPerfil("admin"),
  asyncHandler(async (req, res) => {
    const { nome, email, senha, perfil } = req.body;
    if (!nome || !email || !senha || !perfil) {
      res
        .status(400)
        .json({ success: false, message: "Campos obrigatorios faltando" });
      return;
    }
    const usuario = await authService.criar(nome, email, senha, perfil);
    res.status(201).json({ success: true, data: usuario });
  }),
);

router.patch(
  "/usuarios/:id/toggle",
  autenticar,
  exigirPerfil("admin"),
  asyncHandler(async (req, res) => {
    await authService.toggleAtivo(req.params["id"] as string);
    res.json({ success: true, message: "Status atualizado" });
  }),
);

router.patch(
  "/usuarios/:id/dados",
  autenticar,
  asyncHandler(async (req, res) => {
    const id = req.params["id"] as string;
    if (req.usuario!.perfil !== "admin" && req.usuario!.id !== id) {
      res.status(403).json({ success: false, message: "Acesso negado" });
      return;
    }
    const { nome, email } = req.body;
    const usuario = await authService.atualizarDados(id, nome, email);
    res.json({ success: true, data: usuario });
  }),
);

router.patch(
  "/usuarios/:id/redefinir-senha",
  autenticar,
  exigirPerfil("admin"),
  asyncHandler(async (req, res) => {
    const { nova_senha } = req.body;
    if (!nova_senha) {
      res
        .status(400)
        .json({ success: false, message: "Nova senha obrigatoria" });
      return;
    }
    await authService.redefinirSenha(req.params["id"] as string, nova_senha);
    res.json({ success: true, message: "Senha redefinida" });
  }),
);

router.delete(
  "/usuarios/:id",
  autenticar,
  exigirPerfil("admin"),
  asyncHandler(async (req, res) => {
    await authService.excluir(req.params["id"] as string, req.usuario!.id);
    res.json({ success: true, message: "Usuario excluido" });
  }),
);

router.patch(
  "/alterar-senha",
  autenticar,
  asyncHandler(async (req, res) => {
    const { senha_atual, nova_senha } = req.body;
    if (!senha_atual || !nova_senha) {
      res.status(400).json({ success: false, message: "Campos obrigatorios" });
      return;
    }
    await authService.alterarSenha(req.usuario!.id, senha_atual, nova_senha);
    res.json({ success: true, message: "Senha alterada" });
  }),
);

router.patch(
  "/trocar-senha",
  autenticar,
  asyncHandler(async (req, res) => {
    const { nova_senha } = req.body;
    if (!nova_senha || nova_senha.length < 6) {
      res
        .status(400)
        .json({
          success: false,
          message: "Senha deve ter ao menos 6 caracteres",
        });
      return;
    }
    await authService.redefinirSenha(req.usuario!.id, nova_senha);
    res.json({ success: true, message: "Senha trocada com sucesso" });
  }),
);

export default router;
