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
  PRE_WORK: 'Self Reflection',
  NOMINEES_360: '360 nominees',
  FEEDBACK_360: '360 feedback',
  DC_ASSESSMENTS: 'DC assessments',
  COMPLETED: 'Completed',
}

export function toParticipantSummary(participant) {
  const nominees = participant.nominees || []
  const feedbackTasks = participant.feedbackTasks || []
  const responses = feedbackTasks.filter((task) => task.status === 'SUBMITTED' && task.relationship !== 'SELF').length
  const taskByNomineeId = new Map(feedbackTasks.filter((task) => task.nomineeId).map((task) => [task.nomineeId, task]))
  const selfTask = feedbackTasks.find((task) => task.relationship === 'SELF')

  return {
    id: participant.id,
    name: participant.user.name,
    initials: participant.user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    email: participant.user.email,
    employeeId: participant.user.employeeId,
    designation: participant.user.designation,
    bu: participant.user.businessUnit,
    photoSubmitted: Boolean(participant.photoUrl),
    preWorkSubmitted: participant.preWork?.status === 'submitted',
    cohortId: participant.cohortId,
    progress: participant.progress,
    stage: stageLabels[participant.stage] || participant.stage,
    responses,
    totalResponses: nominees.length,
    reportStatus: participant.reportStatus.toLowerCase(),
    lastActivity: participant.lastActivityAt?.toISOString() || null,
    nominees: nominees.map((nominee) => {
      const task = taskByNomineeId.get(nominee.id)
      return {
        ...toNomineeDto(nominee),
        feedbackStatus: task?.status?.toLowerCase() || 'pending',
        respondedOn: task?.submittedAt?.toISOString() || null,
      }
    }),
    selfFeedback: {
      status: selfTask?.status?.toLowerCase() || 'pending',
      respondedOn: selfTask?.submittedAt?.toISOString() || null,
    },
  }
}

// Real, per-task completion derived from each task's own saved data, shared
// by every TD/BUHR view (and their Excel exports) so they never disagree
// with each other or with the coarse, manually-jumped `progress` counter.
export function deriveTaskStatus(participant, { allResponsesComplete, nomineesSubmitted, latestReport, latestAssessorReview }) {
  const roleInterviewStatus = participant.roleInterview?.status
  const preWorkStatus = participant.preWork?.status

  return {
    application: 'completed',
    role: roleInterviewStatus === 'submitted' ? 'completed' : roleInterviewStatus ? 'in-progress' : 'pending',
    photo: participant.photoUrl ? 'completed' : 'pending',
    prework: preWorkStatus === 'submitted' ? 'completed' : preWorkStatus ? 'in-progress' : 'pending',
    nominees: nomineesSubmitted ? 'completed' : (participant.nominees?.length > 0) ? 'in-progress' : 'pending',
    feedback: !nomineesSubmitted ? 'locked' : allResponsesComplete ? 'completed' : 'in-progress',
    assessment: latestAssessorReview?.status === 'uploaded' ? 'completed' : 'pending',
    report: latestReport && ['GENERATED', 'RELEASED'].includes(latestReport.status) ? 'completed' : 'locked',
  }
}

export function taskCompletionPercent(taskStatus) {
  return Math.round((Object.values(taskStatus).filter((status) => status === 'completed').length / Object.keys(taskStatus).length) * 100)
}

export function toNomineeDto(nominee) {
  return {
    id: nominee.id,
    name: nominee.name,
    email: nominee.email,
    employeeId: nominee.employeeId,
    isExternal: nominee.isExternal,
    designation: nominee.designation,
    relationship: nominee.relationship.toLowerCase().replaceAll('_', '-'),
    relationshipLabel: relationshipLabels[nominee.relationship] || nominee.relationship,
    source: nominee.source,
    locked: nominee.locked,
    status: nominee.status.toLowerCase(),
    submittedAt: nominee.submittedAt?.toISOString() || null,
  }
}
