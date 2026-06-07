import { parseId } from '../lib/parseId'
import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const schema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  importanza: z.number().int().min(1).max(5).default(3),
})

router.get('/', async (_req, res: Response) => {
  const areas = await prisma.competencyArea.findMany({ orderBy: { importanza: 'desc' } })
  res.json(areas)
})

router.post('/', requireMaster, async (req: AuthRequest, res: Response) => {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const area = await prisma.competencyArea.create({ data: parsed.data })
  res.status(201).json(area)
})

router.put('/:id', requireMaster, async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id, res); if (id === null) return
  const parsed = schema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  try {
    const area = await prisma.competencyArea.update({ where: { id }, data: parsed.data })
    res.json(area)
  } catch { res.status(404).json({ error: 'Area non trovata' }) }
})

router.delete('/:id', requireMaster, async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id, res); if (id === null) return
  try {
    await prisma.competencyArea.delete({ where: { id } })
    res.status(204).send()
  } catch { res.status(404).json({ error: 'Area non trovata' }) }
})

export default router
