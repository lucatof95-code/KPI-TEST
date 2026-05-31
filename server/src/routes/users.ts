import { Router, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate, requireMaster)

const createSchema = z.object({
  nome: z.string().min(1),
  cognome: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6, 'Password minimo 6 caratteri'),
  ruolo: z.enum(['MASTER', 'USER']).default('USER'),
})

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  cognome: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  ruolo: z.enum(['MASTER', 'USER']).optional(),
})

router.get('/', async (_req, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, nome: true, cognome: true, email: true, ruolo: true, createdAt: true },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
  })
  res.json(users)
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { password, ...rest } = parsed.data
  const passwordHash = await bcrypt.hash(password, 12)
  try {
    const user = await prisma.user.create({
      data: { ...rest, passwordHash },
      select: { id: true, nome: true, cognome: true, email: true, ruolo: true, createdAt: true },
    })
    res.status(201).json(user)
  } catch { res.status(409).json({ error: 'Email già in uso' }) }
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { password, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (password) data.passwordHash = await bcrypt.hash(password, 12)
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, nome: true, cognome: true, email: true, ruolo: true, createdAt: true },
    })
    res.json(user)
  } catch { res.status(404).json({ error: 'Utente non trovato' }) }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  if (req.user?.userId === id) { res.status(400).json({ error: 'Non puoi eliminare te stesso' }); return }
  try {
    await prisma.user.delete({ where: { id } })
    res.status(204).send()
  } catch { res.status(404).json({ error: 'Utente non trovato' }) }
})

export default router
