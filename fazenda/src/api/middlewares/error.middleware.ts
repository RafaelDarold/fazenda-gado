import type { Request, Response, NextFunction } from 'express'

export interface ApiError extends Error {
  statusCode?: number
}

export function errorMiddleware(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status  = err.statusCode ?? 500
  const message = err.message    ?? 'Erro interno do servidor'
  if (status === 500) console.error('[ERRO]', err)
  res.status(status).json({ success: false, message })
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

export function createError(statusCode: number, message: string): ApiError {
  const err: ApiError = new Error(message)
  err.statusCode = statusCode
  return err
}
