import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
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

  // KPI 2: % svolte entro oggi
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const dueToday = assignments.filter((a) => new Date(a.dataScadenza) <= today)
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

export default router
