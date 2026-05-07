import type { Request, Response, NextFunction } from "express";
import {
  authService,
  type PerfilUsuario,
} from "../../services/auth.service.js";

// Extende o tipo Request para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      usuario?: import("../../services/auth.service.js").TokenPayload;
    }
  }
}

/**
 * Middleware de autenticação — valida o JWT e injeta o usuário no request.
 */
export function autenticar(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ success: false, message: "Token de autenticacao nao fornecido" });
    return;
  }

  try {
    const token = header.slice(7);
    req.usuario = authService.verificarToken(token);
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, message: "Token invalido ou expirado" });
  }
}

/**
 * Middleware de autorização — verifica se o usuário tem o perfil necessário.
 * Uso: router.post('/rota', autenticar, exigirPerfil('admin'), handler)
 */
export function exigirPerfil(...perfis: PerfilUsuario[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ success: false, message: "Nao autenticado" });
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
