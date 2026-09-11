export async function getParticipantSession(db, userId) {
  const participant = await db.participant.findFirst({
    where: { userId, archivedAt: null },
    select: { id: true, cohort: { select: { name: true } } },
  })
  return {
    participantId: participant?.id || null,
    cohort: participant?.cohort?.name || null,
  }
}
