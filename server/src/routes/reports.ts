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

// Master: reports grouped by process
router.get('/processes', requireMaster, async (req: AuthRequest, res: Response) => {
  const invertiComplessita = req.query.invertiComplessita === 'true'

  const processes = await prisma.process.findMany({
    include: {
      steps: {
        orderBy: { ordine: 'asc' },
        include: {
          activity: { include: { areas: { include: { competencyArea: true } } } },
          users: {
            include: {
              user: { select: { id: true, nome: true, cognome: true } },
              assignment: {
                include: {
                  report: { include: { user: { select: { id: true, nome: true, cognome: true } } } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  function calcQ(r: { obiettivo: number; complessita: number; confrontoVecchioERP: number; miglioramentoEfficienza: number }) {
    const comp = invertiComplessita ? 11 - r.complessita : r.complessita
    return ((r.obiettivo + comp + r.confrontoVecchioERP + r.miglioramentoEfficienza) / 40) * 100
  }

  const result = processes.map((p) => {
    let totalQ = 0; let reportCount = 0

    const steps = p.steps.map((step) => {
      const stepReports = step.users
        .filter((psu) => psu.assignment?.report)
        .map((psu) => {
          const r = psu.assignment!.report!
          const quality = calcQ(r)
          totalQ += quality; reportCount++
          return {
            id: r.id,
            user: psu.user,
            obiettivo: r.obiettivo,
            complessita: r.complessita,
            confrontoVecchioERP: r.confrontoVecchioERP,
            miglioramentoEfficienza: r.miglioramentoEfficienza,
            haProblemi: r.haProblemi,
            richiedeNuovaFormazione: r.richiedeNuovaFormazione,
            giudizioApprendimento: r.giudizioApprendimento,
            statoRisoluzione: r.statoRisoluzione,
            dataInvio: r.dataInvio,
            quality: parseFloat(quality.toFixed(1)),
          }
        })

      const stepQ = stepReports.length > 0
        ? stepReports.reduce((s, r) => s + r.quality, 0) / stepReports.length
        : null

      return {
        step: { id: step.id, ordine: step.ordine, stato: step.stato, activity: step.activity },
        reports: stepReports,
        qualitaMedia: stepQ !== null ? parseFloat(stepQ.toFixed(1)) : null,
      }
    })

    return {
      process: { id: p.id, nome: p.nome, stato: p.stato, descrizione: p.descrizione },
      steps,
      qualitaMediaProcesso: reportCount > 0 ? parseFloat((totalQ / reportCount).toFixed(1)) : null,
      completamento: p.steps.length > 0
        ? parseFloat(((p.steps.filter((s) => s.stato === 'COMPLETATO').length / p.steps.length) * 100).toFixed(1))
        : null,
      totalSteps: p.steps.length,
      completedSteps: p.steps.filter((s) => s.stato === 'COMPLETATO').length,
    }
  })

  res.json(result)
})

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

  // Check session-based lock (only for assignments with a session)
  if (assignment.sessionId) {
    const userAssignments = await prisma.assignment.findMany({
      where: { userId: req.user!.userId, sessionId: { not: null } },
      include: { session: true },
    })
    const sessionIds = [...new Set(userAssignments.map((a) => a.sessionId!))]
    const sessions = await prisma.session.findMany({
      where: { id: { in: sessionIds } },
      orderBy: { ordine: 'asc' },
    })
    const currentOrdine = assignment.session!.ordine
    const prevSessions = sessions.filter((s) => s.ordine < currentOrdine)
    if (prevSessions.length > 0) {
      const prevAssignments = userAssignments.filter((a) => prevSessions.some((s) => s.id === a.sessionId))
      if (!prevAssignments.every((a) => a.stato === 'SVOLTA')) {
        res.status(403).json({ error: 'Devi completare le sessioni precedenti prima di questa' })
        return
      }
    }
  }

  const report = await prisma.report.create({
    data: { ...reportData, assignmentId, userId: req.user!.userId, activityId: assignment.activityId },
    include: reportInclude,
  })

  await prisma.assignment.update({ where: { id: assignmentId }, data: { stato: 'SVOLTA' } })

  // Auto-advance process if this assignment belongs to a process step
  await advanceProcess(assignmentId)

  res.status(201).json(report)
})

async function advanceProcess(assignmentId: number) {
  const psu = await prisma.processStepUser.findUnique({
    where: { assignmentId },
    include: {
      processStep: {
        include: {
          users: { include: { assignment: true } },
          process: { include: { steps: { orderBy: { ordine: 'asc' } } } },
        },
      },
    },
  })
  if (!psu) return

  const step = psu.processStep
  const allDone = step.users.every((u) => u.assignment?.stato === 'SVOLTA')
  if (!allDone) return

  // Mark current step as COMPLETATO
  await prisma.processStep.update({ where: { id: step.id }, data: { stato: 'COMPLETATO' } })

  // Find next step
  const nextStep = step.process.steps.find((s) => s.ordine > step.ordine)
  if (!nextStep) {
    // All steps done — complete the process
    await prisma.process.update({ where: { id: step.processId }, data: { stato: 'COMPLETATO' } })
    return
  }

  // Load next step users and create assignments
  const nextStepFull = await prisma.processStep.findUnique({
    where: { id: nextStep.id },
    include: { users: true },
  })
  if (!nextStepFull || nextStepFull.users.length === 0) return

  for (const nextPsu of nextStepFull.users) {
    const newAssignment = await prisma.assignment.create({
      data: {
        activityId: nextStep.activityId,
        userId: nextPsu.userId,
        dataScadenza: nextStep.dataScadenza || new Date(Date.now() + 7 * 86400000),
        stato: 'DA_SVOLGERE',
      },
    })
    await prisma.processStepUser.update({
      where: { id: nextPsu.id },
      data: { assignmentId: newAssignment.id },
    })
  }

  await prisma.processStep.update({ where: { id: nextStep.id }, data: { stato: 'IN_CORSO' } })
}

export default router
