import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import competencyAreasRouter from './routes/competencyAreas'
import sessionsRouter from './routes/sessions'
import activitiesRouter from './routes/activities'
import usersRouter from './routes/users'
import assignmentsRouter from './routes/assignments'
import reportsRouter from './routes/reports'
import kpiRouter from './routes/kpi'
import problemsRouter from './routes/problems'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }))
app.use(express.json())

app.use('/auth', authRouter)
app.use('/api/competency-areas', competencyAreasRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/users', usersRouter)
app.use('/api/assignments', assignmentsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/kpi', kpiRouter)
app.use('/api/problems', problemsRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
