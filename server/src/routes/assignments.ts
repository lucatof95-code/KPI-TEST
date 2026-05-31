import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { sendMail, buildAssignmentEmail } from '../lib/mailer'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const include = {
  activity: { include: { areas: { include: { competencyArea: true } } } },
  user: { select: { id: true, nome: true, cognome: true, email: true } },
  session: true,
  report: true,
}

// Master: list with filters
router.get('/', requireMaster, async (req: AuthRequest, res: Response) => {
  const { userId, sessionId, areaId, stato } = req.query
  const where: Record<string, unknown> = {}
  if (userId) where.userId = parseInt(userId as string)
  if (sessionId) where.sessionId = parseInt(sessionId as string)
  if (stato) where.stato = stato as string
  if (areaId) where.activity = { areas: { some: { competencyAreaId: parseInt(areaId as string) } } }

  const assignments = await prisma.assignment.findMany({
    where,
    include,
    orderBy: [{ dataScadenza: 'asc' }, { id: 'asc' }],
  })
  res.json(assignments)
})

// User: pending count (badge)
router.get('/my/count', async (req: AuthRequest, res: Response) => {
  const count = await prisma.assignment.count({
    where: { userId: req.user!.userId, stato: 'DA_SVOLGERE' },
  })
  res.json({ pending: count })
})

// User: get own assignments with session lock status
router.get('/my', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId

  const assignments = await prisma.assignment.findMany({
    where: { userId },
    include,
    orderBy: [{ session: { ordine: 'asc' } }, { dataScadenza: 'asc' }],
  })

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

// Master: send notification emails for selected assignments (one email per user)
const notifySchema = z.object({
  assignmentIds: z.array(z.number().int()).min(1, 'Seleziona almeno un\'assegnazione'),
})

router.post('/notify', requireMaster, async (req: AuthRequest, res: Response) => {
  const parsed = notifySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const assignments = await prisma.assignment.findMany({
    where: { id: { in: parsed.data.assignmentIds } },
    include: {
      user: true,
      activity: true,
      session: true,
    },
  })

  if (assignments.length === 0) {
    res.status(404).json({ error: 'Assegnazioni non trovate' })
    return
  }

  // Group by user
  const byUser = new Map<number, typeof assignments>()
  for (const a of assignments) {
    const group = byUser.get(a.userId) || []
    group.push(a)
    byUser.set(a.userId, group)
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const results: { userId: number; email: string; ok: boolean; error?: string }[] = []

  for (const [, userAssignments] of byUser) {
    const user = userAssignments[0].user
    const emailData = buildAssignmentEmail(
      user.nome,
      user.cognome,
      userAssignments.map((a) => ({
        nome: a.activity.nome,
        tipo: a.activity.tipo,
        sessione: a.session.nome,
        scadenza: new Date(a.dataScadenza).toLocaleDateString('it-IT'),
        descrizione: a.activity.descrizione,
      })),
      appUrl,
    )

    try {
      await sendMail({ to: user.email, ...emailData })
      results.push({ userId: user.id, email: user.email, ok: true })
    } catch (e) {
      results.push({ userId: user.id, email: user.email, ok: false, error: String(e) })
    }
  }

  const sent = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length

  res.json({
    sent,
    failed,
    total: results.length,
    results,
    message: failed === 0
      ? `Notifica inviata a ${sent} utent${sent === 1 ? 'e' : 'i'}`
      : `${sent} email inviate, ${failed} fallite`,
  })
})

router.delete('/:id', requireMaster, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  try {
    await prisma.assignment.delete({ where: { id } })
    res.status(204).send()
  } catch { res.status(404).json({ error: 'Assegnazione non trovata' }) }
})

export default router
