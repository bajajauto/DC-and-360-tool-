import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const healthRouter = Router()

healthRouter.get('/', asyncHandler(async (req, res) => {
  await prisma.$queryRaw`SELECT 1`
  res.json({
    status: 'ok',
    service: 'dc-tool-api',
    timestamp: new Date().toISOString(),
  })
}))
