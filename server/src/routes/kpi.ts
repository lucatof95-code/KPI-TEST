import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { todayUTC, dateOnly } from '../lib/dateUtils'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate, requireMaster)

router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined
  const areaId = req.query.areaId ? parseInt(req.query.areaId as string) : undefined
  const invertiComplessita = req.query.invertiComplessita === 'true'

  // Base where clause for assignments
  const assignmentWhere: Record<string, unknown> = {}
  if (userId) assignmentWhere.userId = userId
  if (areaId) assignmentWhere.activity = { areas: { some: { competencyAreaId: areaId } } }

  const assignments = await prisma.assignment.findMany({
    where: assignmentWhere,
    include: { report: true, session: true },
  })

  const total = assignments.length
  const svolte = assignments.filter((a) => a.stato === 'SVOLTA').length

  // KPI 1: % svolte su assegnate
  const perSvolte = total > 0 ? (svolte / total) * 100 : null

  // KPI 2: % svolte entro oggi — confronto date-only UTC, sorgente unica: server clock
  const today = todayUTC()
  const dueToday = assignments.filter((a) => dateOnly(a.dataScadenza) <= today)
  const doneDueToday = dueToday.filter((a) => a.stato === 'SVOLTA').length
  const perEntroOggi = dueToday.length > 0 ? (doneDueToday / dueToday.length) * 100 : null

  // KPI 3: % qualità media
  const reports = assignments.filter((a) => a.report).map((a) => a.report!)
  let qualita: number | null = null
  if (reports.length > 0) {
    const qualities = reports.map((r) => {
      const comp = invertiComplessita ? 11 - r.complessita : r.complessita
      return ((r.obiettivo + comp + r.confrontoVecchioERP + r.miglioramentoEfficienza) / 40) * 100
    })
    qualita = qualities.reduce((a, b) => a + b, 0) / qualities.length
  }

  // KPI 4: Valutazione apprendimento
  const learningReports = reports.filter((r) => !r.richiedeNuovaFormazione && r.giudizioApprendimento !== null)
  const apprendimento =
    learningReports.length > 0
      ? learningReports.reduce((sum, r) => sum + r.giudizioApprendimento!, 0) / learningReports.length
      : null

  // Per area breakdown
  const areas = await prisma.competencyArea.findMany({ orderBy: { importanza: 'desc' } })

  const perArea = await Promise.all(
    areas.map(async (area) => {
      const areaWhere: Record<string, unknown> = {
        activity: { areas: { some: { competencyAreaId: area.id } } },
      }
      if (userId) areaWhere.userId = userId

      const areaAssignments = await prisma.assignment.findMany({
        where: areaWhere,
        include: { report: true },
      })
      const areaTotal = areaAssignments.length
      const areaSvolte = areaAssignments.filter((a) => a.stato === 'SVOLTA').length
      const areaReports = areaAssignments.filter((a) => a.report).map((a) => a.report!)
      let areaQualita: number | null = null
      if (areaReports.length > 0) {
        const qs = areaReports.map((r) => {
          const comp = invertiComplessita ? 11 - r.complessita : r.complessita
          return ((r.obiettivo + comp + r.confrontoVecchioERP + r.miglioramentoEfficienza) / 40) * 100
        })
        areaQualita = qs.reduce((a, b) => a + b, 0) / qs.length
      }
      return {
        area,
        assegnate: areaTotal,
        svolte: areaSvolte,
        qualitaMedia: areaQualita,
        completamento: areaTotal > 0 ? (areaSvolte / areaTotal) * 100 : null,
      }
    }),
  )

  res.json({ perSvolte, perEntroOggi, qualita, apprendimento, perArea })
})

// ── KPI Processi ──────────────────────────────────────────────────────────────

router.get('/processes', async (req: AuthRequest, res: Response) => {
  const invertiComplessita = req.query.invertiComplessita === 'true'

  const processes = await prisma.process.findMany({
    include: {
      steps: {
        include: {
          users: { include: { assignment: { include: { report: true } } } },
        },
      },
    },
  })

  const totalProcesses = processes.length
  const completedProcesses = processes.filter((p) => p.stato === 'COMPLETATO').length
  const inCorsoProcesses  = processes.filter((p) => p.stato === 'IN_CORSO').length

  let totalSteps = 0
  let completedSteps = 0
  const allReports: { obiettivo: number; complessita: number; confrontoVecchioERP: number; miglioramentoEfficienza: number; richiedeNuovaFormazione: boolean; giudizioApprendimento: number | null }[] = []

  for (const p of processes) {
    for (const step of p.steps) {
      totalSteps++
      if (step.stato === 'COMPLETATO') completedSteps++
      for (const psu of step.users) {
        if (psu.assignment?.report) allReports.push(psu.assignment.report)
      }
    }
  }

  function calcQuality(r: typeof allReports[0]) {
    const comp = invertiComplessita ? 11 - r.complessita : r.complessita
    return ((r.obiettivo + comp + r.confrontoVecchioERP + r.miglioramentoEfficienza) / 40) * 100
  }

  const qualitaMedia = allReports.length > 0
    ? allReports.reduce((sum, r) => sum + calcQuality(r), 0) / allReports.length
    : null

  const learningReports = allReports.filter((r) => !r.richiedeNuovaFormazione && r.giudizioApprendimento !== null)
  const apprendimentoMedio = learningReports.length > 0
    ? learningReports.reduce((sum, r) => sum + r.giudizioApprendimento!, 0) / learningReports.length
    : null

  const perProcess = processes.map((p) => {
    const pReports: typeof allReports = []
    let pTotalSteps = 0; let pCompletedSteps = 0
    for (const step of p.steps) {
      pTotalSteps++
      if (step.stato === 'COMPLETATO') pCompletedSteps++
      for (const psu of step.users)
        if (psu.assignment?.report) pReports.push(psu.assignment.report)
    }
    return {
      process: { id: p.id, nome: p.nome, stato: p.stato },
      totalSteps: pTotalSteps,
      completedSteps: pCompletedSteps,
      completamento: pTotalSteps > 0 ? (pCompletedSteps / pTotalSteps) * 100 : null,
      qualitaMedia: pReports.length > 0
        ? pReports.reduce((sum, r) => sum + calcQuality(r), 0) / pReports.length
        : null,
    }
  })

  res.json({
    totalProcesses,
    completedProcesses,
    inCorsoProcesses,
    perCompletati: totalProcesses > 0 ? (completedProcesses / totalProcesses) * 100 : null,
    totalSteps,
    completedSteps,
    perStepsCompletati: totalSteps > 0 ? (completedSteps / totalSteps) * 100 : null,
    qualitaMedia,
    apprendimentoMedio,
    perProcess,
  })
})

export default router
