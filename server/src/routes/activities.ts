import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const schema = z.object({
  nome: z.string().min(1),
  descrizione: z.string().min(1),
  tipo: z.enum(['FORMAZIONE', 'TEST']),
  areaIds: z.array(z.number().int()).min(1, 'Seleziona almeno un\'area'),
})

router.get('/', async (_req, res: Response) => {
  const activities = await prisma.activity.findMany({
    include: { areas: { include: { competencyArea: true } } },
    orderBy: { nome: 'asc' },
  })
  res.json(activities)
})

router.post('/', requireMaster, async (req: AuthRequest, res: Response) => {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { areaIds, ...rest } = parsed.data
  const activity = await prisma.activity.create({
    data: {
      ...rest,
      areas: { create: areaIds.map((id) => ({ competencyAreaId: id })) },
    },
    include: { areas: { include: { competencyArea: true } } },
  })
  res.status(201).json(activity)
})

router.put('/:id', requireMaster, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { areaIds, ...rest } = parsed.data
  try {
    await prisma.activityCompetencyArea.deleteMany({ where: { activityId: id } })
    const activity = await prisma.activity.update({
      where: { id },
      data: {
        ...rest,
        areas: { create: areaIds.map((aId) => ({ competencyAreaId: aId })) },
      },
      include: { areas: { include: { competencyArea: true } } },
    })
    res.json(activity)
  } catch { res.status(404).json({ error: 'Attività non trovata' }) }
})

router.delete('/:id', requireMaster, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id)
  try {
    await prisma.activity.delete({ where: { id } })
    res.status(204).send()
  } catch { res.status(404).json({ error: 'Attività non trovata' }) }
})

export default router
