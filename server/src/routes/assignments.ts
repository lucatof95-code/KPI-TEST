import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const include = {
  activity: { include: { areas: { include: { competencyArea: true } } } },
  user: { select: { id: true, nome: true, cognome: true, email: true } },
  session: true,
  report: true,
}

router.get('/', requireMaster, async (req: AuthRequest, res: Response) => {
  const { userId, sessionId, areaId, stato } = req.query

  const where: Record<string, unknown> = {}
  if (userId) where.userId = parseInt(userId as string)
  if (sessionId) where.sessionId = parseInt(sessionId as string)
  if (stato) where.stato = stato as string
  if (areaId) {
    where.activity = { areas: { some: { competencyAreaId: parseInt(areaId as string) } } }
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include,
    orderBy: [{ dataScadenza: 'asc' }, { id: 'asc' }],
  })
  res.json(assignments)
})

const createSchema = z.object({
  activityId: z.number().int(),
  userId: z.number().int(),
  sessionId: z.number().int(),
  dataScadenza: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
})

router.post('/', requireMaster, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  try {
    const assignment = await prisma.assignment.create({
      data: { ...parsed.data, dataScadenza: new Date(parsed.data.dataScadenza) },
      include,
    })
    res.status(201).json(assignment)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Unique constraint')) {
      res.status(409).json({ error: 'Questa attività è già assegnata a questo utente in questa sessione' })
    } else {
      res.status(500).json({ error: 'Errore durante la creazione' })
    }
  }
})

router.delete('/:id', requireMaster, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  try {
    await prisma.assignment.delete({ where: { id } })
    res.status(204).send()
  } catch { res.status(404).json({ error: 'Assegnazione non trovata' }) }
})

// User: get own assignments
router.get('/my', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId

  const assignments = await prisma.assignment.findMany({
    where: { userId },
    include,
    orderBy: [{ session: { ordine: 'asc' } }, { dataScadenza: 'asc' }],
  })

  // Determine locked sessions
  const sessionIds = [...new Set(assignments.map((a) => a.sessionId))]
  const sessions = await prisma.session.findMany({
    where: { id: { in: sessionIds } },
    orderBy: { ordine: 'asc' },
  })

  const sessionLocked: Record<number, boolean> = {}
  for (const sess of sessions) {
    const prevSessions = sessions.filter((s) => s.ordine < sess.ordine)
    if (prevSessions.length === 0) {
      sessionLocked[sess.id] = false
    } else {
      const prevAssignments = assignments.filter((a) => prevSessions.some((s) => s.id === a.sessionId))
      sessionLocked[sess.id] = !prevAssignments.every((a) => a.stato === 'SVOLTA')
    }
  }

  res.json({ assignments, sessionLocked, sessions })
})

export default router
