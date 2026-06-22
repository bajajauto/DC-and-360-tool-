import { Link } from 'react-router-dom'

const journeySteps = [
  { id: 1, label: 'Role Interview', to: '/participant/role-interview', status: 'completed', deadline: '15 Jun' },
  { id: 2, label: 'Photograph', to: '/participant/photograph', status: 'completed', deadline: '15 Jun' },
  { id: 3, label: 'Pre-Work', to: '/participant/pre-work', status: 'in-progress', deadline: '20 Jun' },
  { id: 4, label: '360 Nominees', to: '/participant/360-nominees', status: 'pending', deadline: '20 Jun' },
  { id: 5, label: '360 Feedback', to: '/participant/360-status', status: 'locked', deadline: '30 Jun' },
  { id: 6, label: 'DC Report', to: '/participant/reports', status: 'locked', deadline: 'TBD' },
]

const pendingTasks = [
  {
    title: 'Complete Pre-Work form',
    description: '8 of 10 self-reflection questions answered',
    to: '/participant/pre-work',
    deadline: '20 Jun 2025',
    urgency: 'medium',
    progress: 80,
  },
  {
    title: 'Submit 360 Nominees',
    description: 'Select your feedback respondents from the directory',
    to: '/participant/360-nominees',
    deadline: '20 Jun 2025',
    urgency: 'high',
    progress: 0,
  },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    completed: { label: 'Submitted', className: 'bg-green-100 text-green-700' },
    'in-progress': { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
    pending: { label: 'Pending', className: 'bg-gray-100 text-gray-500' },
    locked: { label: 'Locked', className: 'bg-gray-100 text-gray-400' },
  }
  const { label, className } = map[status] ?? map.pending
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${className}`}>{label}</span>
}

function StepIcon({ status, step }: { status: string; step: number }) {
  if (status === 'completed') {
    return (
      <div className="w-8 h-8 rounded-full bg-[#1e4d8c] flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }
  if (status === 'in-progress') {
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
  const completedSteps = journeySteps.filter((s) => s.status === 'completed').length
  const totalSteps = journeySteps.length
  const progressPct = Math.round((completedSteps / totalSteps) * 100)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-sm text-gray-500 mb-1">EX-to-LX Development Centre · Cohort 2025</p>
        <h1 className="text-2xl font-bold text-[#1a1f2e]">Welcome back, Rahul</h1>
      </div>

      {/* Progress banner */}
      <div className="bg-[#1e4d8c] rounded-xl p-6 mb-8 text-white">
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
        <p className="text-blue-200 text-xs mt-2">DC date: <span className="text-white font-medium">25–26 July 2025</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Journey strip */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-[#1a1f2e] mb-3 uppercase tracking-wide">Journey Steps</h2>
          <div className="bg-white rounded-xl border border-[#e2e8f0] divide-y divide-[#f1f4f9]">
            {journeySteps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex flex-col items-center self-stretch">
                  <StepIcon status={step.status} step={idx + 1} />
                  {idx < journeySteps.length - 1 && (
                    <div className={`w-0.5 flex-1 mt-1 ${step.status === 'completed' ? 'bg-[#1e4d8c]' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${step.status === 'locked' ? 'text-gray-400' : 'text-[#1a1f2e]'}`}>
                      {step.label}
                    </p>
                    <StatusBadge status={step.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Due: {step.deadline}</p>
                </div>
                {(step.status === 'in-progress' || step.status === 'pending') && (
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
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-[#1a1f2e] mb-3 uppercase tracking-wide">Pending Tasks</h2>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div key={task.title} className="bg-white rounded-xl border border-[#e2e8f0] p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
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
            <h2 className="text-sm font-semibold text-[#1a1f2e] mb-3 uppercase tracking-wide">My Profile</h2>
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-2">
              {[
                ['Name', 'Rahul Kumar'],
                ['Employee ID', 'EX-78432'],
                ['Designation', 'Senior Manager'],
                ['Business Unit', 'Two-Wheeler'],
                ['Level', 'EX'],
                ['DC Type', 'EX to LX'],
                ['Reporting Manager', 'Priya Menon'],
              ].map(([label, value]) => (
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
