import { Response } from 'express'

/**
 * Parses a route param as a positive integer.
 * Returns null and sends a 400 if invalid, so the caller can return early.
 */
export function parseId(param: string | string[], res: Response): number | null {
  const str = Array.isArray(param) ? param[0] : param
  const id = parseInt(str, 10)
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: 'ID non valido' })
    return null
  }
  return id
}
