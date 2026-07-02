import { ArrowLeft, BriefcaseBusiness, Camera, FileText, MessageSquareText, User } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getAssessorProfile } from '../../data/adminData'

const evidenceConfig = {
  photograph: {
    title: 'Participant Photograph',
    label: 'Identity evidence',
    icon: Camera,
  },
  'role-interview': {
    title: 'Role Interview',
    label: 'Interview submission',
    icon: MessageSquareText,
  },
  '360-report': {
    title: '360 Report',
    label: 'Aggregated feedback',
    icon: FileText,
  },
  'pre-work': {
    title: 'Pre-work',
    label: 'Participant submission',
    icon: BriefcaseBusiness,
  },
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-[#edf1f5] last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-semibold text-[#374151] text-right">{value}</span>
    </div>
  )
}

function PersonPlaceholder({ size = 'sm' }) {
  const classes = size === 'xl' ? 'w-full aspect-square rounded-xl' : 'w-14 h-14 rounded-lg'

  return (
    <div className={`${classes} bg-[#e4eef9] text-[#1e4d8c] flex flex-col items-center justify-center shrink-0`}>
      <User size={size === 'xl' ? 72 : 23} strokeWidth={1.7} />
      {size === 'xl' && <p className="mt-4 text-sm font-semibold text-[#1e4d8c]">No photograph uploaded</p>}
    </div>
  )
}

function DetailBody({ type, profile }) {
  if (type === 'photograph') {
    return (
      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6">
          <PersonPlaceholder size="xl" />
        </section>
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6">
          <h2 className="font-semibold text-[#172033]">Identity details</h2>
          <div className="mt-4">
            <InfoRow label="Participant" value={profile.name} />
            <InfoRow label="Employee ID" value={profile.employeeId} />
            <InfoRow label="Designation" value={profile.designation} />
            <InfoRow label="Business unit" value={profile.bu} />
          </div>
        </section>
      </div>
    )
  }

  if (type === 'role-interview') {
    return (
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4">
            <p className="text-[11px] text-gray-500">Interview date</p>
            <p className="text-sm font-semibold text-[#172033] mt-1">{profile.interview.date}</p>
          </div>
          <div className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4">
            <p className="text-[11px] text-gray-500">Interviewer</p>
            <p className="text-sm font-semibold text-[#172033] mt-1">{profile.interview.interviewer}</p>
          </div>
          <div className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4">
            <p className="text-[11px] text-gray-500">Theme</p>
            <p className="text-sm font-semibold text-[#172033] mt-1">{profile.interview.theme}</p>
          </div>
        </div>
        <h2 className="font-semibold text-[#172033]">Interview notes</h2>
        <p className="mt-3 text-sm leading-6 text-gray-600">{profile.interview.summary}</p>
      </section>
    )
  }

  if (type === '360-report') {
    return (
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6">
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4">
            <p className="text-[11px] text-gray-500">Report status</p>
            <p className="text-sm font-semibold text-[#172033] mt-1">{profile.report360.status}</p>
          </div>
          <div className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4">
            <p className="text-[11px] text-gray-500">Responses</p>
            <p className="text-sm font-semibold text-[#172033] mt-1">{profile.report360.completion}</p>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border-l-4 border-emerald-500 bg-emerald-50 p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Strength signal</p>
            <p className="mt-3 text-sm leading-6 text-gray-700">{profile.report360.topStrength}</p>
          </div>
          <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Development watch</p>
            <p className="mt-3 text-sm leading-6 text-gray-700">{profile.report360.developmentWatch}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6">
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4">
          <p className="text-[11px] text-gray-500">Submission status</p>
          <p className="text-sm font-semibold text-[#172033] mt-1">{profile.preWork.status}</p>
        </div>
        <div className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4">
          <p className="text-[11px] text-gray-500">Submitted on</p>
          <p className="text-sm font-semibold text-[#172033] mt-1">{profile.preWork.submittedOn}</p>
        </div>
      </div>
      <h2 className="font-semibold text-[#172033]">Pre-work response</h2>
      <p className="mt-3 text-sm leading-6 text-gray-600">{profile.preWork.reflection}</p>
    </section>
  )
}

export default function EvidenceDetail() {
  const { participantId, evidenceType } = useParams()
  const profile = getAssessorProfile(participantId)
  const config = evidenceConfig[evidenceType]

  if (!profile || !config) return <Navigate to="/assessor/candidates" replace />

  const Icon = config.icon

  return (
    <div>
      <header className="h-20 bg-white border-b border-[#e4e9f1] px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/assessor/candidates" className="w-9 h-9 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-gray-500 hover:text-[#1e4d8c]">
            <ArrowLeft size={17} />
          </Link>
          <div>
            <p className="text-xs text-gray-400">{profile.name} / {config.label}</p>
            <h1 className="text-xl font-bold text-[#172033]">{config.title}</h1>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-blue-700">
          <Icon size={13} />
          Evidence view
        </span>
      </header>

      <main className="p-8 max-w-[1180px] mx-auto">
        <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5 mb-6 flex items-center gap-4">
          <PersonPlaceholder />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#172033]">{profile.name}</h2>
            <p className="text-xs text-gray-500 mt-1">{profile.employeeId} - {profile.designation} - {profile.bu}</p>
          </div>
        </section>

        <DetailBody type={evidenceType} profile={profile} />
      </main>
    </div>
  )
}
