import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { todayUTC } from '../lib/dateUtils'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate, requireMaster)

router.get('/', async (_req: AuthRequest, res: Response) => {
  const todayStart = new Date(`${todayUTC()}T00:00:00.000Z`)

  const [openProblems, todayReports] = await Promise.all([
    prisma.report.count({ where: { haProblemi: true, statoRisoluzione: 'APERTO' } }),
    prisma.report.count({ where: { dataInvio: { gte: todayStart } } }),
  ])

  res.json({ openProblems, todayReports })
})

export default router
