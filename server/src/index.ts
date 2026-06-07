import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { prisma } from './lib/prisma'
import { serveStatic } from './static'
import authRouter from './routes/auth'
import competencyAreasRouter from './routes/competencyAreas'
import sessionsRouter from './routes/sessions'
import activitiesRouter from './routes/activities'
import usersRouter from './routes/users'
import assignmentsRouter from './routes/assignments'
import reportsRouter from './routes/reports'
import kpiRouter from './routes/kpi'
import problemsRouter from './routes/problems'
import settingsRouter from './routes/settings'
import badgesRouter from './routes/badges'
import processesRouter from './routes/processes'

// ── Startup checks ──────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET non impostato — viene usato un fallback debole. Imposta JWT_SECRET in .env prima di andare in produzione.')
}

const app = express()
const PORT = process.env.PORT || 3001

// ── SQLite WAL mode (migliore resistenza a corruzioni e letture concorrenti) ─
// journal_mode=WAL restituisce un risultato → $queryRawUnsafe
// synchronous e busy_timeout non restituiscono risultati → $executeRawUnsafe
prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL').catch(() => {})
prisma.$executeRawUnsafe('PRAGMA synchronous=NORMAL;').catch(() => {})
prisma.$executeRawUnsafe('PRAGMA busy_timeout=5000;').catch(() => {})

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))

// ── Rate limiting su login (max 10 tentativi/15 min per IP) ─────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi di accesso. Riprova tra 15 minuti.' },
  skipSuccessfulRequests: true,
})

app.use('/auth/login', loginLimiter)

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRouter)
app.use('/api/competency-areas', competencyAreasRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/users', usersRouter)
app.use('/api/assignments', assignmentsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/kpi', kpiRouter)
app.use('/api/problems', problemsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/badges', badgesRouter)
app.use('/api/processes', processesRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// In produzione serve il frontend compilato
if (process.env.NODE_ENV === 'production') {
  serveStatic(app)
}

const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost')
app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`)
  if (HOST === '0.0.0.0') {
    const { networkInterfaces } = require('os') as typeof import('os')
    const nets = networkInterfaces()
    for (const ifaces of Object.values(nets)) {
      for (const iface of ifaces ?? []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          console.log(`   → Rete locale: http://${iface.address}:${PORT}`)
        }
      }
    }
  }
})
