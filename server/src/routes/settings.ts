import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { sendMail } from '../lib/mailer'
import { authenticate, requireMaster, AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate, requireMaster)

const KEYS = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from_name', 'smtp_from_email', 'app_url'] as const

router.get('/', async (_req: AuthRequest, res: Response) => {
  const rows = await prisma.setting.findMany()
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  for (const k of KEYS) if (!(k in settings)) settings[k] = ''
  // Non esporre la password SMTP in chiaro — il client sa solo se è impostata
  if (settings.smtp_pass) settings.smtp_pass = '__SET__'
  res.json(settings)
})

const updateSchema = z.object({
  smtp_host: z.string(),
  smtp_port: z.string(),
  smtp_secure: z.string(),
  smtp_user: z.string(),
  smtp_pass: z.string(),
  smtp_from_name: z.string(),
  smtp_from_email: z.string(),
  app_url: z.string().url('URL non valido').or(z.literal('')),
}).partial()

router.put('/', async (req: AuthRequest, res: Response) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }
  for (const [key, value] of Object.entries(parsed.data)) {
    // Ignora il valore placeholder — significa "non modificare la password"
    if (key === 'smtp_pass' && value === '__SET__') continue
    await prisma.setting.upsert({ where: { key }, update: { value: value as string }, create: { key, value: value as string } })
  }
  const rows = await prisma.setting.findMany()
  const result = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  if (result.smtp_pass) result.smtp_pass = '__SET__'
  res.json(result)
})

// Test connection
router.post('/test', async (req: AuthRequest, res: Response) => {
  const { to } = req.body
  if (!to) { res.status(400).json({ error: 'Inserisci un indirizzo email di test' }); return }
  try {
    await sendMail({
      to,
      subject: 'Test connessione SMTP — KPI Formazione ERP',
      html: '<p>La connessione SMTP è configurata correttamente.</p>',
      text: 'La connessione SMTP è configurata correttamente.',
    })
    res.json({ ok: true, message: 'Email di test inviata correttamente' })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
})

export default router
