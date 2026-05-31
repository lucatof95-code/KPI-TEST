import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const reportInclude = {
  user: { select: { id: true, nome: true, cognome: true } },
  activity: { include: { areas: { include: { competencyArea: true } } } },
  assignment: { include: { session: true } },
}

// Master: all reports with filters
router.get('/', requireMaster, async (req: AuthRequest, res: Response) => {
  const { userId, areaId, sessionId } = req.query
  const where: Record<string, unknown> = {}
  if (userId) where.userId = parseInt(userId as string)
  if (sessionId) where.assignment = { sessionId: parseInt(sessionId as string) }
  if (areaId) {
    where.activity = { areas: { some: { competencyAreaId: parseInt(areaId as string) } } }
  }
  const reports = await prisma.report.findMany({
    where,
    include: reportInclude,
    orderBy: { dataInvio: 'desc' },
  })
  res.json(reports)
})

const createSchema = z.object({
  assignmentId: z.number().int(),
  obiettivo: z.number().int().min(1).max(10),
  complessita: z.number().int().min(1).max(10),
  confrontoVecchioERP: z.number().int().min(1).max(10),
  miglioramentoEfficienza: z.number().int().min(1).max(10),
  haProblemi: z.boolean(),
  descrizioneProblema: z.string().optional(),
  richiedeNuovaFormazione: z.boolean(),
  giudizioApprendimento: z.number().int().min(0).max(100).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.haProblemi && !data.descrizioneProblema?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['descrizioneProblema'], message: 'Descrizione problema obbligatoria' })
  }
  if (!data.richiedeNuovaFormazione && (data.giudizioApprendimento === undefined || data.giudizioApprendimento === null)) {
    ctx.addIssue({ code: 'custom', path: ['giudizioApprendimento'], message: 'Giudizio apprendimento obbligatorio' })
  }
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  const { assignmentId, ...reportData } = parsed.data

  // Verify assignment belongs to the current user
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { session: true },
  })
  if (!assignment) { res.status(404).json({ error: 'Assegnazione non trovata' }); return }
  if (assignment.userId !== req.user!.userId) { res.status(403).json({ error: 'Non autorizzato' }); return }
  if (assignment.report) { res.status(409).json({ error: 'Report già inviato per questa attività' }); return }

  // Check session is not locked
  const userAssignments = await prisma.assignment.findMany({
    where: { userId: req.user!.userId },
    include: { session: true },
  })
  const sessionIds = [...new Set(userAssignments.map((a) => a.sessionId))]
  const sessions = await prisma.session.findMany({
    where: { id: { in: sessionIds } },
    orderBy: { ordine: 'asc' },
  })
  const prevSessions = sessions.filter((s) => s.ordine < assignment.session.ordine)
  if (prevSessions.length > 0) {
    const prevAssignments = userAssignments.filter((a) => prevSessions.some((s) => s.id === a.sessionId))
    if (!prevAssignments.every((a) => a.stato === 'SVOLTA')) {
      res.status(403).json({ error: 'Devi completare le sessioni precedenti prima di questa' })
      return
    }
  }

  const report = await prisma.report.create({
    data: {
      ...reportData,
      assignmentId,
      userId: req.user!.userId,
      activityId: assignment.activityId,
    },
    include: reportInclude,
  })

  await prisma.assignment.update({ where: { id: assignmentId }, data: { stato: 'SVOLTA' } })

  res.status(201).json(report)
})

export default router
