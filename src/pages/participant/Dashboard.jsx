import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useUser } from '../../context/UserContext'

// `status` here is only the placeholder shown before participantData has
// loaded — real status is derived live from taskStatus (or nomineeStatus /
// selfSurveyStatus) below, never left on these fallback values. `deadlineKey`
// names the cohort field the real deadline is read from (see formatDeadline).
const baseJourneySteps = [
  { id: 1, label: 'Photograph', to: '/participant/photograph', status: 'pending', deadlineKey: 'photoDeadline' },
  { id: 2, label: 'Pre-Work', to: '/participant/pre-work', status: 'pending', deadlineKey: 'preWorkDeadline' },
  { id: 3, label: 'Role Interview', to: '/participant/role-interview', status: 'pending', deadlineKey: 'roleInterviewDeadline' },
  { id: 4, label: '360 Nominees', to: '/participant/360-nominees', status: 'pending', deadlineKey: 'nominationDeadline' },
  { id: 5, label: 'Self 360 Survey', to: '/participant/self-360', status: 'locked', deadlineKey: 'threeSixtyCutoff' },
  { id: 6, label: '360 Feedback', to: '/participant/360-status', status: 'locked', deadlineKey: 'threeSixtyCutoff' },
  { id: 7, label: 'DC Report', to: '/participant/reports', status: 'locked', deadlineKey: null },
]

function formatDeadline(cohort, key) {
  const value = key && cohort?.[key]
  return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD'
}

const TASK_STATUS_KEY_BY_LABEL = {
  'Role Interview': 'role',
  Photograph: 'photo',
  'Pre-Work': 'prework',
  '360 Feedback': 'feedback',
  'DC Report': 'report',
}

function nomineeCompletionPercent(nominees, submitted) {
  if (submitted) return 100
  const filledRequiredSlots =
    Math.min(1, nominees.filter((nominee) => nominee.relationship === 'reporting-manager').length)
    + Math.min(1, nominees.filter((nominee) => nominee.relationship === 'skip-manager').length)
    + Math.min(4, nominees.filter((nominee) => nominee.relationship === 'peer').length)
  return Math.round((filledRequiredSlots / 6) * 100)
}

function StatusBadge({ status }) {
  const map = {
    completed: { label: 'Submitted', className: 'bg-green-100 text-green-700' },
    'in-progress': { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
    saved: { label: 'Saved', className: 'bg-blue-100 text-blue-700' },
    pending: { label: 'Pending', className: 'bg-gray-100 text-gray-500' },
    locked: { label: 'Locked', className: 'bg-gray-100 text-gray-400' },
  }
  const { label, className } = map[status] ?? map.pending
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${className}`}>{label}</span>
}

function StepIcon({ status, step }) {
  if (status === 'completed') {
    return (
      <div className="w-8 h-8 rounded-full bg-[#1e4d8c] flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }
  if (status === 'in-progress' || status === 'saved') {
    return (
      <div className="w-8 h-8 rounded-full border-2 border-[#1e4d8c] bg-white flex items-center justify-center shrink-0">
        <span className="text-[#1e4d8c] text-xs font-bold">{step}</span>
      </div>
    )
  }
  if (status === 'locked') {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
      <span className="text-gray-500 text-xs font-medium">{step}</span>
    </div>
  )
}

export default function Dashboard() {
  const { user, participantData } = useUser()
  const [selfTask, setSelfTask] = useState(null)
  const nominees = participantData?.nominees ?? []
  const nomineeStatus = nominees.some(n => n.status === 'submitted')
    ? 'completed'
    : nominees.length > 0
      ? 'saved'
      : 'pending'
  const nomineeProgress = nomineeCompletionPercent(nominees, nomineeStatus === 'completed')

  useEffect(() => {
    if (nomineeStatus !== 'completed' || !user?.participantId) return
    api.ensureSelfFeedbackTask(user.participantId).then((result) => setSelfTask(result.data)).catch(() => {})
  }, [nomineeStatus, user?.participantId])

  const selfSurveyStatus = nomineeStatus !== 'completed' ? 'locked' : selfTask?.status === 'submitted' ? 'completed' : selfTask?.status === 'saved' ? 'saved' : 'pending'
  const taskStatus = participantData?.taskStatus
  const preWorkAnsweredCount = participantData?.preWorkAnsweredCount ?? 0
  const cohort = participantData?.cohort
  const journeySteps = baseJourneySteps.map((step) => {
    const withDeadline = { ...step, deadline: formatDeadline(cohort, step.deadlineKey) }
    if (step.label === '360 Nominees') return { ...withDeadline, status: nomineeStatus }
    if (step.label === 'Self 360 Survey') return { ...withDeadline, status: selfSurveyStatus }
    const taskKey = TASK_STATUS_KEY_BY_LABEL[step.label]
    return taskKey && taskStatus?.[taskKey] ? { ...withDeadline, status: taskStatus[taskKey] } : withDeadline
  })
  const visiblePendingTasks = []
  if (taskStatus?.prework && taskStatus.prework !== 'completed') {
    visiblePendingTasks.push({
      title: 'Complete Pre-Work form',
      description: `${preWorkAnsweredCount} of 9 self-reflection questions answered`,
      to: '/participant/pre-work',
      deadline: formatDeadline(cohort, 'preWorkDeadline'),
      urgency: 'medium',
      progress: preWorkAnsweredCount * 10,
    })
  }
  if (nomineeStatus !== 'completed') {
    visiblePendingTasks.push(nomineeStatus === 'saved' ? {
      title: 'Review saved 360 nominees',
      description: `${nominees.length} nominees saved. Final submit will send magic links.`,
      to: '/participant/360-nominees',
      deadline: formatDeadline(cohort, 'nominationDeadline'),
      urgency: 'medium',
      progress: nomineeProgress,
    } : {
      title: 'Submit 360 Nominees',
      description: 'Select your feedback respondents from the directory',
      to: '/participant/360-nominees',
      deadline: formatDeadline(cohort, 'nominationDeadline'),
      urgency: 'high',
      progress: 0,
    })
  }
  if (nomineeStatus === 'completed' && selfSurveyStatus !== 'completed') {
    visiblePendingTasks.push({
      title: 'Complete your Self 360 Survey',
      description: 'Your self-rating is a required part of the 360 feedback process.',
      to: '/participant/self-360',
      deadline: formatDeadline(cohort, 'threeSixtyCutoff'),
      urgency: 'high',
      progress: selfTask?.progress ?? 0,
    })
  }
  const completedSteps = journeySteps.filter((s) => s.status === 'completed').length
  const totalSteps = journeySteps.length
  const roleQuestionCount = participantData?.roleInterviewQuestionCount ?? 0
  const roleProgress = taskStatus?.role === 'completed'
    ? 100
    : roleQuestionCount
      ? Math.round(((participantData?.roleInterviewAnsweredCount ?? 0) / roleQuestionCount) * 100)
      : 0
  const stageProgress = {
    'Role Interview': roleProgress,
    Photograph: taskStatus?.photo === 'completed' ? 100 : 0,
    'Pre-Work': Math.min(100, preWorkAnsweredCount * 10),
    'Self 360 Survey': selfSurveyStatus === 'completed' ? 100 : (selfTask?.progress ?? 0),
    '360 Nominees': nomineeProgress,
    '360 Feedback': participantData?.totalResponses
      ? Math.round(((participantData?.responses ?? 0) / participantData.totalResponses) * 100)
      : 0,
    'DC Report': taskStatus?.report === 'completed' ? 100 : 0,
  }
  const progressPct = Math.round(journeySteps.reduce((sum, step) => sum + (stageProgress[step.label] ?? 0), 0) / totalSteps)

  return (
    <div className="p-6">
      <div className="mb-5">
        <p className="text-sm text-gray-500 mb-0.5">{cohort?.programme ? `${cohort.programme} Development Centre` : 'Development Centre'} · {cohort?.name || 'Your cohort'}</p>
        <h1 className="text-2xl font-bold text-[#1a1f2e]">Welcome back, {user.name.split(' ')[0]}</h1>
      </div>

      {/* Progress banner */}
      <div className="bg-[#1e4d8c] rounded-xl p-5 mb-6 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-blue-200 text-sm font-medium">Your DC Journey Progress</p>
            <p className="text-2xl font-bold mt-0.5">{completedSteps} of {totalSteps} stages complete</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{progressPct}%</p>
            <p className="text-blue-200 text-xs mt-0.5">Overall completion</p>
          </div>
        </div>
        <div className="w-full bg-blue-800 rounded-full h-2">
          <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-blue-200 text-xs mt-2">DC date: <span className="text-white font-medium">{cohort?.eventDate || 'TBD'}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Journey strip */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Journey Steps</h2>
          <div className="bg-white rounded-xl border border-[#e2e8f0] divide-y divide-[#f1f4f9]">
            {journeySteps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex flex-col items-center self-stretch">
                  <StepIcon status={step.status} step={idx + 1} />
                  {idx < journeySteps.length - 1 && (
                    <div className={`w-0.5 flex-1 mt-1 ${step.status === 'completed' ? 'bg-[#1e4d8c]' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${step.status === 'locked' ? 'text-gray-400' : 'text-[#1a1f2e]'}`}>
                      {step.label}
                    </p>
                    <StatusBadge status={step.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Due: {step.deadline}</p>
                </div>
                {(step.status === 'in-progress' || step.status === 'pending' || step.status === 'saved') && (
                  <Link to={step.to} className="shrink-0 text-xs text-[#1e4d8c] font-medium hover:underline">Open →</Link>
                )}
                {step.status === 'completed' && (
                  <Link to={step.to} className="shrink-0 text-xs text-gray-400 hover:text-gray-600">View</Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div>
            <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Pending Tasks</h2>
            <div className="space-y-3">
              {visiblePendingTasks.map((task) => (
                <div key={task.title} className="bg-white rounded-xl border border-[#e2e8f0] p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-[#1a1f2e] leading-snug">{task.title}</p>
                    {task.urgency === 'high' && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">Urgent</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{task.description}</p>
                  {task.progress > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>Progress</span><span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-[#1e4d8c] rounded-full h-1.5" style={{ width: `${task.progress}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400">Due: {task.deadline}</p>
                    <Link to={task.to} className="text-xs text-[#1e4d8c] font-medium hover:underline">Continue →</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">My Profile</h2>
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-2">
              {[
                ['Name', user.name],
                ['Employee ID', user.employeeId],
                ['Designation', user.designation],
                ['Business Unit', user.bu],
                user.cohort && ['Cohort', user.cohort],
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <p className="text-xs text-gray-400 shrink-0">{label}</p>
                  <p className="text-xs text-[#1a1f2e] font-medium text-right">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
