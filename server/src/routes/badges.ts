import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { todayUTC } from '../lib/dateUtils'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate, requireMaster)

router.get('/', async (req: AuthRequest, res: Response) => {
  const todayStart = new Date(`${todayUTC()}T00:00:00.000Z`)

  // sinceReports: timestamp inviato dal client ("visto l'ultima volta")
  // Usa il più recente tra todayStart e sinceReports per non mostrare report vecchi
  let reportsAfter = todayStart
  if (req.query.sinceReports) {
    const since = new Date(req.query.sinceReports as string)
    if (!isNaN(since.getTime()) && since > todayStart) {
      reportsAfter = since
    }
  }

  const [openProblems, newReports] = await Promise.all([
    prisma.report.count({ where: { haProblemi: true, statoRisoluzione: 'APERTO' } }),
    prisma.report.count({ where: { dataInvio: { gte: reportsAfter } } }),
  ])

  res.json({ openProblems, todayReports: newReports })
})

export default router
