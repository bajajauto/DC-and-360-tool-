import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { authRouter } from './routes/auth.js'
import { cohortsRouter } from './routes/cohorts.js'
import { feedbackTasksRouter } from './routes/feedbackTasks.js'
import { healthRouter } from './routes/health.js'
import { invitesRouter } from './routes/invites.js'
import { notificationsRouter } from './routes/notifications.js'
import { participantsRouter } from './routes/participants.js'
import { reportsRouter } from './routes/reports.js'
import { buhrRouter } from './routes/buhr.js'
import { disconnectPrisma } from './db.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { requireAuth, requireRole } from './middleware/auth.js'

const app = express()
const port = Number(process.env.PORT || 4000)
const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim())

app.use(cors({
  origin(origin, callback) {
    if (!origin || clientOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`CORS blocked origin: ${origin}`))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))

// Public routes (no token required)
app.use('/api/auth', authRouter)
app.use('/api/health', healthRouter)
app.use('/api/invites', invitesRouter)

// Authenticated routes. Router-wide role guards where the whole surface belongs
// to one role; finer ownership checks live inside the individual handlers.
app.use('/api/cohorts', requireAuth, requireRole('td'), cohortsRouter)
app.use('/api/notifications', requireAuth, requireRole('td'), notificationsRouter)
app.use('/api/participants', requireAuth, participantsRouter)
app.use('/api/feedback-tasks', requireAuth, feedbackTasksRouter)
app.use('/api/reports', requireAuth, reportsRouter)
app.use('/api/buhr', requireAuth, requireRole('buhr', 'td'), buhrRouter)

app.use(notFoundHandler)
app.use(errorHandler)

const server = app.listen(port, () => {
  console.log(`DC Tool API listening on http://localhost:${port}`)
})

async function shutdown() {
  server.close(async () => {
    await disconnectPrisma()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
