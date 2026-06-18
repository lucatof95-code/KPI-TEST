import { parseId } from '../lib/parseId'
import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { sendMail, buildNotificationEmail, generateICS, loadSettings } from '../lib/mailer'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'
import { todayUTC, dateOnly } from '../lib/dateUtils'

const router = Router()
router.use(authenticate)

const include = {
  activity: { include: { areas: { include: { competencyArea: true } } } },
  user: { select: { id: true, nome: true, cognome: true, email: true } },
  session: true,
  report: true,
  processStepUser: { include: { processStep: { select: { id: true, ordine: true, process: { select: { id: true, nome: true } } } } } },
}

function withIsLate<T extends { stato: string; dataScadenza: Date }>(assignments: T[]) {
  const today = todayUTC()
  return assignments.map((a) => ({
    ...a,
    isLate: a.stato === 'DA_SVOLGERE' && dateOnly(a.dataScadenza) < today,
  }))
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
  res.json(withIsLate(assignments))
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
    orderBy: [{ dataScadenza: 'asc' }],
  })

  // Session-based locking only applies to assignments WITH a session
  const withSession = assignments.filter((a) => a.sessionId !== null)
  const sessionIds = [...new Set(withSession.map((a) => a.sessionId!))]
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
      const prevAssignments = withSession.filter((a) => prevSessions.some((s) => s.id === a.sessionId))
      sessionLocked[sess.id] = !prevAssignments.every((a) => a.stato === 'SVOLTA')
    }
  }

  res.json({ assignments: withIsLate(assignments), sessionLocked, sessions })
})

// Master: create single assignment
const createSchema = z.object({
  activityId: z.number().int(),
  userId: z.number().int(),
  sessionId: z.number().int().optional().nullable(),
  dataScadenza: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
})

router.post('/', requireMaster, async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  try {
    const raw = await prisma.assignment.create({
      data: { ...parsed.data, dataScadenza: new Date(parsed.data.dataScadenza) },
      include,
    })
    res.status(201).json(withIsLate([raw])[0])
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('Unique constraint')) {
      res.status(409).json({ error: 'Questa attività è già assegnata a questo utente in questa sessione' })
    } else {
      res.status(500).json({ error: 'Errore durante la creazione' })
    }
  }
})

// Master: create assignments for multiple users at once
const bulkSchema = z.object({
  activityId: z.number().int(),
  userIds: z.array(z.number().int()).min(1),
  sessionId: z.number().int().optional().nullable(),
  dataScadenza: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
})

router.post('/bulk', requireMaster, async (req: AuthRequest, res: Response) => {
  const parsed = bulkSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { userIds, activityId, sessionId, dataScadenza } = parsed.data

  const results: { userId: number; ok: boolean; error?: string }[] = []
  for (const userId of userIds) {
    try {
      await prisma.assignment.create({
        data: { activityId, userId, sessionId: sessionId ?? null, dataScadenza: new Date(dataScadenza) },
      })
      results.push({ userId, ok: true })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      results.push({ userId, ok: false, error: msg.includes('Unique') ? 'già assegnata' : 'errore' })
    }
  }

  const created = results.filter((r) => r.ok).length
  res.status(201).json({ created, skipped: results.filter((r) => !r.ok).length, results })
})

// Master: notify selected assignments
const calendarEventSchema = z.object({
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().optional(),
}).optional()

const notifySchema = z.object({
  assignmentIds: z.array(z.number().int()).min(1),
  calendarEvent: calendarEventSchema,
})

router.post('/notify', requireMaster, async (req: AuthRequest, res: Response) => {
  const parsed = notifySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { assignmentIds, calendarEvent } = parsed.data
  const assignments = await prisma.assignment.findMany({
    where: { id: { in: assignmentIds } },
    include: { user: true, activity: true, session: true },
  })
  if (assignments.length === 0) { res.status(404).json({ error: 'Assegnazioni non trovate' }); return }

  const cfg = await loadSettings()

  const byUser = new Map<number, typeof assignments>()
  for (const a of assignments) {
    const group = byUser.get(a.userId) || []
    group.push(a)
    byUser.set(a.userId, group)
  }

  let icsContent: string | undefined
  if (calendarEvent) {
    const [sy, sm, sd] = calendarEvent.date.split('-').map(Number)
    const [sh, smin] = calendarEvent.startTime.split(':').map(Number)
    const [eh, emin] = calendarEvent.endTime.split(':').map(Number)
    icsContent = generateICS({
      title: calendarEvent.title,
      description: `Sessione formazione ERP — ${calendarEvent.title}`,
      location: calendarEvent.location,
      start: new Date(Date.UTC(sy, sm - 1, sd, sh, smin)),
      end: new Date(Date.UTC(sy, sm - 1, sd, eh, emin)),
      organizerName: cfg.fromName,
      organizerEmail: cfg.fromEmail || cfg.user,
    })
  }

  const results: { userId: number; email: string; ok: boolean; error?: string }[] = []
  for (const [, userAssignments] of byUser) {
    const user = userAssignments[0].user
    const counts = {
      formazione: userAssignments.filter((a) => a.activity.tipo === 'FORMAZIONE').length,
      test: userAssignments.filter((a) => a.activity.tipo === 'TEST').length,
    }
    const emailData = buildNotificationEmail(user.nome, user.cognome, counts, cfg)
    try {
      await sendMail({ to: user.email, ...emailData, icsAttachment: icsContent })
      results.push({ userId: user.id, email: user.email, ok: true })
    } catch (e) {
      results.push({ userId: user.id, email: user.email, ok: false, error: String(e) })
    }
  }

  const sent = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok).length
  res.json({
    sent, failed, total: results.length, results,
    message: failed === 0
      ? `Notifica inviata a ${sent} utent${sent === 1 ? 'e' : 'i'}${icsContent ? ' con appuntamento calendario' : ''}`
      : `${sent} email inviate, ${failed} fallite`,
  })
})

router.delete('/:id', requireMaster, async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id, res); if (id === null) return
  try {
    await prisma.assignment.delete({ where: { id } })
    res.status(204).send()
  } catch { res.status(404).json({ error: 'Assegnazione non trovata' }) }
})

export default router
