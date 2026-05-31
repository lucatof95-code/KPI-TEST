import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate, requireMaster)

router.get('/', async (_req: AuthRequest, res: Response) => {
  const problemReports = await prisma.report.findMany({
    where: { haProblemi: true },
    include: {
      user: { select: { id: true, nome: true, cognome: true } },
      activity: { include: { areas: { include: { competencyArea: true } } } },
      assignment: { include: { session: true } },
    },
    orderBy: { dataInvio: 'desc' },
  })

  // Fetch all areas sorted by importanza desc
  const allAreas = await prisma.competencyArea.findMany({ orderBy: { importanza: 'desc' } })

  // Group problems by area: each problem appears in all of its activity's areas
  const grouped = allAreas.map((area) => {
    const problems = problemReports.filter((r) =>
      r.activity.areas.some((a) => a.competencyAreaId === area.id),
    )
    return { area, problems }
  }).filter((g) => g.problems.length > 0)

  res.json(grouped)
})

const statoSchema = z.object({
  statoRisoluzione: z.enum(['APERTO', 'IN_LAVORAZIONE', 'RISOLTO']),
})

router.patch('/:id/stato', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const parsed = statoSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  try {
    const report = await prisma.report.update({
      where: { id },
      data: { statoRisoluzione: parsed.data.statoRisoluzione },
    })
    res.json(report)
  } catch { res.status(404).json({ error: 'Report non trovato' }) }
})

export default router
