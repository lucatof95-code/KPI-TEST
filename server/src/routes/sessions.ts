import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const schema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  ordine: z.number().int().min(1),
})

router.get('/', async (_req, res: Response) => {
  const sessions = await prisma.session.findMany({ orderBy: { ordine: 'asc' } })
  res.json(sessions)
})

router.post('/', requireMaster, async (req: AuthRequest, res: Response) => {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const session = await prisma.session.create({ data: parsed.data })
  res.status(201).json(session)
})

router.put('/:id', requireMaster, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const parsed = schema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  try {
    const session = await prisma.session.update({ where: { id }, data: parsed.data })
    res.json(session)
  } catch { res.status(404).json({ error: 'Sessione non trovata' }) }
})

router.delete('/:id', requireMaster, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  try {
    const assignmentCount = await prisma.assignment.count({ where: { sessionId: id } })
    if (assignmentCount > 0) {
      res.status(409).json({
        error: `Impossibile eliminare: questa sessione ha ${assignmentCount} assegnazion${assignmentCount === 1 ? 'e' : 'i'} collegate. Rimuovile prima dalla pagina Assegnazioni.`,
      })
      return
    }
    await prisma.session.delete({ where: { id } })
    res.status(204).send()
  } catch (e) {
    const err = e as { code?: string }
    res.status(err.code === 'P2025' ? 404 : 500).json({
      error: err.code === 'P2025' ? 'Sessione non trovata' : 'Errore durante l\'eliminazione',
    })
  }
})

export default router
