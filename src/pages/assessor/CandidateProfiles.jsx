import { ArrowRight, BriefcaseBusiness, Camera, Download, FileText, MessageSquareText, Search, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { formatDateOfJoining } from '../../lib/dateFormatting'

function StatusPill({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tones[tone]}`}>{children}</span>
}

function EvidenceCard({ icon: Icon, title, meta, to }) {
  return (
    <Link to={to} className="group bg-white border border-[#e2e8f0] rounded-xl p-5 min-h-32 flex flex-col justify-between hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-lg bg-[#edf4fb] text-[#1e4d8c] flex items-center justify-center shrink-0 group-hover:bg-white">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#172033]">{title}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{meta}</p>
        </div>
      </div>
      <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#1e4d8c]">
        Open
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

function PersonPlaceholder({ size = 'sm', src = null, name = 'Participant' }) {
  const classes = size === 'lg' ? 'w-36 h-36 rounded-xl' : 'w-11 h-11 rounded-lg'

  if (src) {
    return <img src={src} alt={`${name} photograph`} className={`${classes} shrink-0 object-cover`} />
  }

  return (
    <div className={`${classes} bg-[#e4eef9] text-[#1e4d8c] flex items-center justify-center shrink-0`}>
      <User size={size === 'lg' ? 42 : 19} strokeWidth={1.8} />
    </div>
  )
}

function ParticipantDetails({ participant }) {
  const details = [
    ['Name', participant.name],
    ['Ticket No', participant.employeeId],
    ['Designation', participant.designation],
    ['Current BU', participant.bu],
    ['Level', participant.masterData?.jobLevel],
    ['Chart Level', participant.masterData?.positionLevel],
    ['Date of Joining', formatDateOfJoining(participant.masterData?.dateOfJoining || participant.masterData?.DOJ_3 || participant.masterData?.DOJ_4)],
    ['Email', participant.email],
  ]

  return (
    <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6">
      <h3 className="mb-5 text-xs font-bold uppercase tracking-wide text-slate-500">Participant details</h3>
      <div className="grid gap-x-12 gap-y-5 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-[#172033]">{value || '—'}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function CandidateProfiles() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [profiles, setProfiles] = useState([])
  const [selectedId, setSelectedId] = useState(() => searchParams.get('participantId'))
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAssessorCandidates()
      .then((candidateResult) => {
        const data = candidateResult.data || []
        setProfiles(data)
        setSelectedId((current) => data.some((profile) => profile.id === current) ? current : data[0]?.id || null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return profiles
    return profiles.filter((profile) => `${profile.name} ${profile.employeeId} ${profile.designation} ${profile.bu}`.toLowerCase().includes(needle))
  }, [profiles, query])

  const selected = profiles.find((profile) => profile.id === selectedId) ?? filteredProfiles[0] ?? profiles[0]

  return (
    <div>
      <header className="h-20 bg-white border-b border-[#e4e9f1] px-8 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">Assessor / Candidate Profiles</p>
          <h1 className="text-xl font-bold text-[#172033]">Candidate evidence review</h1>
        </div>
        <StatusPill tone="blue">Evidence available</StatusPill>
      </header>

      <div className="p-8 max-w-[1500px] mx-auto grid xl:grid-cols-[340px_1fr] gap-6">
        {error && <div className="xl:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <aside className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden self-start">
          <div className="p-5 border-b border-[#e8edf4]">
            <h2 className="font-semibold text-[#172033]">Participants</h2>
            <p className="text-xs text-gray-400 mt-1">Select a candidate to view submitted evidence.</p>
            <div className="relative mt-4">
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search candidates"
                className="w-full border border-[#dce3ed] rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
            {loading && <p className="p-5 text-sm text-gray-500">Loading participants…</p>}
            {!loading && !filteredProfiles.length && <p className="p-5 text-sm text-gray-500">No participants available.</p>}
            {filteredProfiles.map((profile) => {
              const active = profile.id === selected.id
              return (
                <button
                  type="button"
                  key={profile.id}
                  onClick={() => {
                    setSelectedId(profile.id)
                    setSearchParams({ participantId: profile.id }, { replace: true })
                  }}
                  className={`w-full text-left px-5 py-4 border-b border-[#eef2f6] transition-colors ${active ? 'bg-blue-50' : 'hover:bg-[#f8fafc]'}`}
                >
                  <div className="flex items-center gap-3">
                    <PersonPlaceholder />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${active ? 'text-[#1e4d8c]' : 'text-[#172033]'}`}>{profile.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{profile.employeeId} · {profile.designation}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 truncate">{profile.bu}</span>
                    <StatusPill tone={profile.preWork.status === 'submitted' ? 'green' : 'amber'}>{profile.preWork.status}</StatusPill>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {selected && (
          <main className="space-y-6">
            <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <PersonPlaceholder size="lg" src={selected.photograph.url} name={selected.name} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[#172033]">{selected.name}</h2>
                      <p className="text-sm mt-1.5">
                        <span className="font-semibold text-[#2563a5]">{selected.employeeId}</span>
                        <span className="mx-2 text-gray-300">·</span>
                        <span className="font-medium text-violet-700">{selected.designation}</span>
                        <span className="mx-2 text-gray-300">·</span>
                        <span className="font-medium text-cyan-700">{selected.bu}</span>
                      </p>
                    </div>
                    <StatusPill tone="blue">Ready for review</StatusPill>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex justify-end border-t border-[#e8edf4] pt-4">
                <button
                  type="button"
                  disabled
                  title={`Download assessor template for ${selected.name}`}
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-[#1e5fba] px-4 py-2 text-xs font-semibold text-white shadow-sm"
                >
                  <Download size={14} />
                  Download Assessor Template
                </button>
              </div>
            </section>

            <ParticipantDetails participant={selected} />

            <div className="grid lg:grid-cols-2 gap-5">
              <EvidenceCard icon={Camera} title="Participant Photograph" meta="Identity evidence" to={`/assessor/candidates/${selected.id}/photograph`} />
              <EvidenceCard icon={MessageSquareText} title="Role Interview" meta={selected.roleInterview.status} to={`/assessor/candidates/${selected.id}/role-interview`} />
              <EvidenceCard icon={FileText} title="360° Feedback Report" meta={selected.report360.status} to={`/assessor/candidates/${selected.id}/360-report`} />
              <EvidenceCard icon={BriefcaseBusiness} title="Self Reflection" meta={selected.preWork.status} to={`/assessor/candidates/${selected.id}/pre-work`} />
            </div>

          </main>
        )}
      </div>
    </div>
  )
}
