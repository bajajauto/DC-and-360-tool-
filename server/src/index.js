import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
import { assessorRouter } from './routes/assessor.js'
import { assessorAnalysisRouter } from './routes/assessorAnalysis.js'
import { startNotificationScheduler } from './notifications/scheduler.js'
import { verifyEmailTransport } from './notifications/service.js'
import { disconnectPrisma } from './db.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { requireAuth, requireRole } from './middleware/auth.js'

const app = express()
const port = Number(process.env.PORT || 4000)
const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim())

// Behind the App Service load balancer, so req.protocol/req.ip come from headers.
app.set('trust proxy', 1)

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
app.use(express.json({ limit: '10mb' }))

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
app.use('/api/assessor', requireAuth, requireRole('assessor'), assessorRouter)
app.use('/api/assessor-analysis', requireAuth, requireRole('assessor', 'td'), assessorAnalysisRouter)

// In production the same process serves the built SPA, so there is one origin and
// no CORS to configure. Skipped when dist/ is absent (dev runs Vite separately).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const clientDist = process.env.CLIENT_DIST || path.join(repoRoot, 'dist')

if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  // Vite fingerprints filenames under assets/, so those are safe to cache forever.
  app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }))
  app.use(express.static(clientDist, { index: false }))

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next()
      return
    }

    res.sendFile(path.join(clientDist, 'index.html'))
  })
} else {
  console.warn(`No client build found at ${clientDist}; serving API only.`)
}

app.use(notFoundHandler)
app.use(errorHandler)

const server = app.listen(port, () => {
  console.log(`DC Tool API listening on http://localhost:${port}`)
  verifyEmailTransport()
  startNotificationScheduler()
})

async function shutdown() {
  server.close(async () => {
    await disconnectPrisma()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
