import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../lib/jwt'

export interface AuthRequest extends Request {
  user?: JwtPayload
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token mancante' })
    return
  }
  const token = authHeader.slice(7)
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Token non valido o scaduto' })
  }
}

export function requireMaster(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.ruolo !== 'MASTER') {
    res.status(403).json({ error: 'Accesso riservato al Master' })
    return
  }
  next()
}
