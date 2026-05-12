import type { Request, Response, NextFunction } from "express";
import {
  authService,
  type PerfilUsuario,
} from "../../services/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      usuario?: import("../../services/auth.service.js").TokenPayload;
    }
  }
}

export function autenticar(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Token nao fornecido" });
    return;
  }
  try {
    req.usuario = authService.verificarToken(header.slice(7));
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, message: "Token invalido ou expirado" });
  }
}

export function exigirPerfil(...perfis: PerfilUsuario[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ success: false, message: "Nao autenticado" });
      return;
    }
    // owner sempre tem acesso
    if (req.usuario.perfil === "owner") {
      next();
      return;
    }
    if (!perfis.includes(req.usuario.perfil)) {
      res
        .status(403)
        .json({ success: false, message: "Acesso negado para este perfil" });
      return;
    }
    next();
  };
}

/**
 * Middleware que injeta fazenda_id no request a partir do usuario autenticado.
 * Para owner e super_admin, aceita fazenda_id via header X-Fazenda-Id.
 */
export function injetarFazenda(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.usuario) {
    res.status(401).json({ success: false, message: "Nao autenticado" });
    return;
  }

  const u = req.usuario;
  if (u.perfil === "owner" || u.perfil === "super_admin") {
    // Podem operar em qualquer fazenda via header
    const fazendaHeader = req.headers["x-fazenda-id"] as string | undefined;
    if (fazendaHeader) {
      req.usuario = { ...u, fazenda_id: fazendaHeader };
    }
    // Se nao tiver header e for super_admin/owner sem fazenda, exige o header
    if (!req.usuario.fazenda_id && u.perfil !== "owner") {
      res
        .status(400)
        .json({
          success: false,
          message: "Header X-Fazenda-Id obrigatorio para super_admin",
        });
      return;
    }
  }
  next();
}
