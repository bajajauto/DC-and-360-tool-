import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'

export const auditLogRouter = Router()

auditLogRouter.get('/', asyncHandler(async (req, res) => {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const actorIds = [...new Set(entries.map((entry) => entry.actorId).filter(Boolean))]
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
    : []
  const actorNames = new Map(actors.map((actor) => [actor.id, actor.name]))

  res.json({
    data: entries.map((entry) => ({
      id: entry.id,
      timestamp: entry.createdAt.toISOString(),
      actor: actorNames.get(entry.actorId) || 'System',
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      metadata: entry.metadata,
    })),
  })
}))
