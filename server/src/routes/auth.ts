import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Email o password non validi', details: parsed.error.flatten() })
    return
  }
  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: 'Credenziali errate' })
    return
  }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Credenziali errate' })
    return
  }
  const token = signToken({ userId: user.id, email: user.email, ruolo: user.ruolo })
  res.json({
    token,
    user: { id: user.id, nome: user.nome, cognome: user.cognome, email: user.email, ruolo: user.ruolo },
  })
})

router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user })
})

export default router
