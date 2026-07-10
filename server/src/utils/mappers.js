const relationshipLabels = {
  REPORTING_MANAGER: 'Reporting manager',
  SKIP_MANAGER: 'Skip manager',
  PEER: 'Peer',
  DIRECT_REPORT: 'Direct report',
}

const stageLabels = {
  APPLICATION_PROFILE: 'Application profile',
  ROLE_INTERVIEW: 'Role interview',
  PHOTOGRAPH: 'Photograph',
  PRE_WORK: 'Pre-work',
  NOMINEES_360: '360 nominees',
  FEEDBACK_360: '360 feedback',
  DC_ASSESSMENTS: 'DC assessments',
  COMPLETED: 'Completed',
}

export function toParticipantSummary(participant) {
  const nominees = participant.nominees || []
  const responses = participant.feedbackTasks?.filter((task) => task.status === 'SUBMITTED').length || 0

  return {
    id: participant.id,
    name: participant.user.name,
    initials: participant.user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    email: participant.user.email,
    employeeId: participant.user.employeeId,
    designation: participant.user.designation,
    bu: participant.user.businessUnit,
    cohortId: participant.cohortId,
    progress: participant.progress,
    stage: stageLabels[participant.stage] || participant.stage,
    responses,
    totalResponses: nominees.length,
    reportStatus: participant.reportStatus.toLowerCase(),
    lastActivity: participant.lastActivityAt?.toISOString() || null,
    nominees: nominees.map(toNomineeDto),
  }
}

export function toNomineeDto(nominee) {
  return {
    id: nominee.id,
    name: nominee.name,
    email: nominee.email,
    designation: nominee.designation,
    relationship: nominee.relationship.toLowerCase().replaceAll('_', '-'),
    relationshipLabel: relationshipLabels[nominee.relationship] || nominee.relationship,
    source: nominee.source,
    locked: nominee.locked,
    status: nominee.status.toLowerCase(),
    submittedAt: nominee.submittedAt?.toISOString() || null,
  }
}
