import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

// ── Rate Limiting ──────────────────────────────────────────────────────────

/** Limite geral: 200 requests por IP por minuto */
export const rateLimitGeral = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas requisicoes. Tente novamente em 1 minuto.",
  },
});

/** Limite de login: 10 tentativas por IP por 15 minutos */
export const rateLimitLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  },
});

// ── Sanitização de inputs ──────────────────────────────────────────────────

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .trim();
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return sanitizeObject(value as Record<string, unknown>);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = sanitizeValue(val);
  }
  return result;
}

export function sanitizarInputs(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
}

// ── Headers de segurança ──────────────────────────────────────────────────

export function headersSeguranca(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.removeHeader("X-Powered-By");
  next();
}

// ── Validação de UUID ─────────────────────────────────────────────────────

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validarUUID(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const ids = Object.values(req.params).filter(
    (v): v is string => typeof v === "string" && v.length === 36,
  );
  for (const id of ids) {
    if (!UUID_REGEX.test(id)) {
      res.status(400).json({ success: false, message: "ID invalido" });
      return;
    }
  }
  next();
}

// ── Prevenção de SQL Injection nos query params ───────────────────────────

const SQL_PATTERNS =
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|--|;)\b)/gi;

export function sanitizarQueryParams(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === "string" && SQL_PATTERNS.test(value)) {
      res
        .status(400)
        .json({ success: false, message: `Parametro invalido: ${key}` });
      return;
    }
  }
  next();
}
