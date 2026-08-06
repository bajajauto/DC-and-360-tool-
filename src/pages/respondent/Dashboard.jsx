import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'

const statusConfig = {
  pending: { label: 'Not Started', className: 'bg-gray-100 text-gray-500' },
  saved: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  submitted: { label: 'Submitted', className: 'bg-green-100 text-green-700' },
}

function StatusBadge({ status }) {
  const { label, className } = statusConfig[status] ?? statusConfig.pending
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${className}`}>{label}</span>
}

function RelationshipBadge({ relationship }) {
  const colourMap = {
    'Peer / Internal Customer': 'bg-blue-50 text-blue-700',
    'Reporting Manager': 'bg-purple-50 text-purple-700',
    'Skip Manager': 'bg-indigo-50 text-indigo-700',
    'Direct Report': 'bg-teal-50 text-teal-700',
    'Self': 'bg-orange-50 text-orange-700',
  }
  const cls = colourMap[relationship] ?? 'bg-gray-100 text-gray-500'
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{relationship}</span>
}

function TaskCard({ task, onOpen }) {
  const isSubmitted = task.status === 'submitted'
  const isSaved = task.status === 'saved'
  const isPending = task.status === 'pending'

  return (
    <div className={`bg-white rounded-xl border ${isSubmitted ? 'border-[#e2e8f0]' : 'border-[#e2e8f0] hover:border-[#bfdbfe] hover:shadow-sm'} transition-all p-5`}>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
          isSubmitted ? 'bg-green-100 text-green-700' : 'bg-[#1e4d8c] text-white'
        }`}>
          {task.participantInitials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-semibold text-[#1a1f2e]">{task.participantName}</p>
            <StatusBadge status={task.status} />
          </div>
          <p className="text-xs text-gray-500 mb-2">{task.designation} · {task.bu}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <RelationshipBadge relationship={task.relationship} />
            <span className="text-[10px] text-gray-400">{task.dcType} DC</span>
          </div>

          {/* Progress bar – only when started */}
          {(isSaved || isSubmitted) && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>{task.answered} of {task.totalQuestions} questions</span>
              </div>
            </div>
          )}
        </div>

        {/* Deadline + CTA */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className="text-[10px] text-gray-400">Due: {task.deadline}</p>
          {!isSubmitted && (
            <button
              onClick={() => onOpen(task.id)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1e4d8c] text-white hover:bg-[#183f73] transition-colors"
            >
              {isPending ? 'Start →' : 'Continue →'}
            </button>
          )}
          {isSubmitted && (
            <div className="flex items-center gap-1 text-green-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-medium">Done</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RespondentDashboard() {
  const { user } = useUser()
  const navigate = useNavigate()

  const pending = user.respondentTasks.filter((t) => t.status === 'pending')
  const inProgress = user.respondentTasks.filter((t) => t.status === 'saved')
  const submitted = user.respondentTasks.filter((t) => t.status === 'submitted')
  const incomplete = pending.length + inProgress.length
  const cutoff = (pending[0] || inProgress[0] || submitted[0])?.deadline || 'the deadline configured for your cohort'

  function handleOpen(taskId) {
    navigate(`/respondent/feedback/${taskId}`)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5">
        <p className="text-sm text-gray-500 mb-0.5">360 Feedback · Respondent Portal</p>
        <h1 className="text-2xl font-bold text-[#1a1f2e]">Your Feedback Tasks</h1>
      </div>

      {/* Summary banner */}
      <div className={`rounded-xl p-5 mb-6 ${incomplete > 0 ? 'bg-[#1e4d8c]' : 'bg-green-600'} text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80 mb-0.5">
              {incomplete > 0 ? 'Feedback pending your response' : 'All feedback submitted'}
            </p>
            <p className="text-xl font-bold">
              {incomplete > 0
                ? `${incomplete} form${incomplete > 1 ? 's' : ''} remaining`
                : `${submitted.length} form${submitted.length > 1 ? 's' : ''} completed`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{user.respondentTasks.length}</p>
            <p className="text-xs opacity-70 mt-0.5">Total assigned</p>
          </div>
        </div>
        <p className="text-xs opacity-70 mt-3">
          Feedback cutoff: <span className="text-white font-medium opacity-100">{cutoff}</span>
          {incomplete > 0 && <span className="ml-2">· Responses are confidential and aggregated before sharing.</span>}
        </p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        {/* Task sections */}
        <div className="space-y-6">
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                In Progress ({inProgress.length})
              </h2>
              <div className="space-y-3">
                {inProgress.map((t) => <TaskCard key={t.id} task={t} onOpen={handleOpen} />)}
              </div>
            </section>
          )}

          {pending.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                Not Started ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((t) => <TaskCard key={t.id} task={t} onOpen={handleOpen} />)}
              </div>
            </section>
          )}

          {submitted.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Submitted ({submitted.length})
              </h2>
              <div className="space-y-3">
                {submitted.map((t) => <TaskCard key={t.id} task={t} onOpen={handleOpen} />)}
              </div>
            </section>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Progress overview */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Overview</p>
            <div className="space-y-2.5">
              {[
                { label: 'In Progress', count: inProgress.length, color: 'bg-amber-400' },
                { label: 'Not Started', count: pending.length, color: 'bg-gray-300' },
                { label: 'Submitted', count: submitted.length, color: 'bg-green-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <p className="text-xs text-gray-600">{item.label}</p>
                  </div>
                  <p className="text-xs font-semibold text-[#1a1f2e]">{item.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cutoff */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cutoff Date</p>
            <p className="text-sm font-semibold text-[#1a1f2e]">{cutoff}</p>
            <p className="text-xs text-gray-400 mt-0.5">You cannot submit after this date</p>
          </div>

          {/* Confidentiality */}
          <div className="bg-[#f1f4f9] rounded-xl border border-[#e2e8f0] p-4">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Confidentiality</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Your individual responses are never shared. Scores are aggregated across respondent groups before appearing in the 360° Feedback Report.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
