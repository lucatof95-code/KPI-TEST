import { parseId } from '../lib/parseId'
import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()

// ── User: processi di cui fa parte ───────────────────────────────────────────
// Registrato PRIMA di requireMaster perché è accessibile da tutti gli utenti.

router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId

  // Trova tutti i ProcessStepUser dell'utente con tutto il contesto necessario
  const psus = await prisma.processStepUser.findMany({
    where: { userId },
    include: {
      assignment: {
        include: { activity: { include: { areas: { include: { competencyArea: true } } } } },
      },
      processStep: {
        include: {
          activity: { include: { areas: { include: { competencyArea: true } } } },
          process: {
            include: {
              steps: { orderBy: { ordine: 'asc' } },
            },
          },
        },
      },
    },
    orderBy: { processStep: { ordine: 'asc' } },
  })

  // Raggruppa per processo
  const processMap = new Map<number, {
    process: { id: number; nome: string; descrizione: string; stato: string }
    mySteps: {
      stepId: number
      ordine: number
      statoStep: string
      dataScadenza: string | null
      activity: object
      assignmentId: number | null
      assignmentStato: string | null
      isLate: boolean
    }[]
  }>()

  const { todayUTC, dateOnly } = await import('../lib/dateUtils')
  const today = todayUTC()

  for (const psu of psus) {
    const proc = psu.processStep.process
    if (!processMap.has(proc.id)) {
      processMap.set(proc.id, {
        process: { id: proc.id, nome: proc.nome, descrizione: proc.descrizione, stato: proc.stato },
        mySteps: [],
      })
    }
    const asgn = psu.assignment
    processMap.get(proc.id)!.mySteps.push({
      stepId: psu.processStep.id,
      ordine: psu.processStep.ordine,
      statoStep: psu.processStep.stato,
      dataScadenza: psu.processStep.dataScadenza?.toISOString() ?? null,
      activity: psu.processStep.activity,
      assignmentId: asgn?.id ?? null,
      assignmentStato: asgn?.stato ?? null,
      isLate: asgn
        ? asgn.stato === 'DA_SVOLGERE' && dateOnly(asgn.dataScadenza) < today
        : false,
    })
  }

  res.json([...processMap.values()])
})

router.use(authenticate, requireMaster)

const stepInclude = {
  activity: { include: { areas: { include: { competencyArea: true } } } },
  users: { include: { user: { select: { id: true, nome: true, cognome: true } }, assignment: true } },
}
const processInclude = {
  steps: { include: stepInclude, orderBy: { ordine: 'asc' as const } },
}

// ── CRUD Process ─────────────────────────────────────────────────────────────

router.get('/', async (_req, res: Response) => {
  const processes = await prisma.process.findMany({
    include: { steps: { include: { users: true }, orderBy: { ordine: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(processes)
})

router.get('/:id', async (req, res: Response) => {
  const id = parseId(req.params.id, res); if (id === null) return
  const process = await prisma.process.findUnique({ where: { id }, include: processInclude })
  if (!process) { res.status(404).json({ error: 'Processo non trovato' }); return }
  res.json(process)
})

const processSchema = z.object({
  nome: z.string().min(1),
  descrizione: z.string().default(''),
})

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = processSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const process = await prisma.process.create({ data: parsed.data, include: processInclude })
  res.status(201).json(process)
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id, res); if (id === null) return
  const parsed = processSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  try {
    const process = await prisma.process.update({ where: { id }, data: parsed.data, include: processInclude })
    res.json(process)
  } catch { res.status(404).json({ error: 'Processo non trovato' }) }
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id, res); if (id === null) return
  try {
    await prisma.process.delete({ where: { id } })
    res.status(204).send()
  } catch { res.status(404).json({ error: 'Processo non trovato' }) }
})

// ── Steps ────────────────────────────────────────────────────────────────────

const stepSchema = z.object({
  activityId: z.number().int(),
  ordine: z.number().int().min(1),
  dataScadenza: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

router.post('/:id/steps', async (req: AuthRequest, res: Response) => {
  const processId = parseId(req.params.id, res); if (processId === null) return
  const parsed = stepSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { dataScadenza, ...rest } = parsed.data
  const step = await prisma.processStep.create({
    data: { ...rest, processId, dataScadenza: dataScadenza ? new Date(dataScadenza) : null },
    include: stepInclude,
  })
  res.status(201).json(step)
})

router.put('/:id/steps/:stepId', async (req: AuthRequest, res: Response) => {
  const stepId = parseId(req.params.stepId, res); if (stepId === null) return
  const parsed = stepSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  const { dataScadenza, ...rest } = parsed.data
  try {
    const step = await prisma.processStep.update({
      where: { id: stepId },
      data: { ...rest, ...(dataScadenza !== undefined ? { dataScadenza: dataScadenza ? new Date(dataScadenza) : null } : {}) },
      include: stepInclude,
    })
    res.json(step)
  } catch { res.status(404).json({ error: 'Step non trovato' }) }
})

router.delete('/:id/steps/:stepId', async (req: AuthRequest, res: Response) => {
  const stepId = parseId(req.params.stepId, res); if (stepId === null) return
  try {
    await prisma.processStep.delete({ where: { id: stepId } })
    res.status(204).send()
  } catch { res.status(404).json({ error: 'Step non trovato' }) }
})

// ── Users per step ───────────────────────────────────────────────────────────

router.post('/:id/steps/:stepId/users', async (req: AuthRequest, res: Response) => {
  const stepId = parseId(req.params.stepId, res); if (stepId === null) return
  const { userId } = req.body
  if (!userId) { res.status(400).json({ error: 'userId obbligatorio' }); return }
  try {
    const psu = await prisma.processStepUser.create({
      data: { processStepId: stepId, userId: parseInt(userId) },
      include: { user: { select: { id: true, nome: true, cognome: true } } },
    })
    res.status(201).json(psu)
  } catch { res.status(409).json({ error: 'Utente già presente in questo step' }) }
})

router.delete('/:id/steps/:stepId/users/:userId', async (req: AuthRequest, res: Response) => {
  const stepId = parseId(req.params.stepId, res); if (stepId === null) return
  const userId = parseId(req.params.userId, res); if (userId === null) return
  try {
    await prisma.processStepUser.deleteMany({ where: { processStepId: stepId, userId } })
    res.status(204).send()
  } catch { res.status(404).json({ error: 'Non trovato' }) }
})

// ── Start process ────────────────────────────────────────────────────────────

router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  const id = parseId(req.params.id, res); if (id === null) return
  const process = await prisma.process.findUnique({
    where: { id },
    include: { steps: { include: { users: true }, orderBy: { ordine: 'asc' } } },
  })
  if (!process) { res.status(404).json({ error: 'Processo non trovato' }); return }
  if (process.stato !== 'BOZZA') { res.status(409).json({ error: 'Il processo è già avviato' }); return }
  if (process.steps.length === 0) { res.status(400).json({ error: 'Aggiungi almeno uno step prima di avviare' }); return }

  const firstStep = process.steps[0]
  if (firstStep.users.length === 0) { res.status(400).json({ error: 'Il primo step non ha utenti assegnati' }); return }

  // Create assignments for step 1 users
  for (const psu of firstStep.users) {
    const assignment = await prisma.assignment.create({
      data: {
        activityId: firstStep.activityId,
        userId: psu.userId,
        dataScadenza: firstStep.dataScadenza || new Date(Date.now() + 7 * 86400000),
        stato: 'DA_SVOLGERE',
      },
    })
    await prisma.processStepUser.update({ where: { id: psu.id }, data: { assignmentId: assignment.id } })
  }

  await prisma.processStep.update({ where: { id: firstStep.id }, data: { stato: 'IN_CORSO' } })
  await prisma.process.update({ where: { id }, data: { stato: 'IN_CORSO' } })

  const updated = await prisma.process.findUnique({ where: { id }, include: processInclude })
  res.json(updated)
})

export default router
