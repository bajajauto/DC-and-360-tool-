export async function logAudit(db, { actorId = null, action, entity, entityId = null, metadata = {} }) {
  return db.auditLog.create({
    data: { actorId, action, entity, entityId, metadata },
  })
}
