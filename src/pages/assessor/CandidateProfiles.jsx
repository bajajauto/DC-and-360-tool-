import { ArrowRight, BriefcaseBusiness, Camera, CheckCircle2, FileSpreadsheet, FileText, MessageSquareText, Search, Upload, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { assessorProfiles } from '../../data/adminData'

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

function PersonPlaceholder({ size = 'sm' }) {
  const classes = size === 'lg' ? 'w-36 h-36 rounded-xl' : 'w-11 h-11 rounded-lg'

  return (
    <div className={`${classes} bg-[#e4eef9] text-[#1e4d8c] flex items-center justify-center shrink-0`}>
      <User size={size === 'lg' ? 42 : 19} strokeWidth={1.8} />
    </div>
  )
}

export default function CandidateProfiles() {
  const [selectedId, setSelectedId] = useState(assessorProfiles[0]?.id)
  const [query, setQuery] = useState('')
  const [analysisUploads, setAnalysisUploads] = useState({})

  const filteredProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return assessorProfiles
    return assessorProfiles.filter((profile) => `${profile.name} ${profile.employeeId} ${profile.designation} ${profile.bu}`.toLowerCase().includes(needle))
  }, [query])

  const selected = assessorProfiles.find((profile) => profile.id === selectedId) ?? filteredProfiles[0] ?? assessorProfiles[0]
  const uploadedAnalysis = selected ? analysisUploads[selected.id] : null
  const analysisConfirmed = uploadedAnalysis?.status === 'uploaded'
  const analysisLocked = false

  return (
    <div>
      <header className="h-20 bg-white border-b border-[#e4e9f1] px-8 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">Assessor / Candidate Profiles</p>
          <h1 className="text-xl font-bold text-[#172033]">Candidate evidence review</h1>
        </div>
        <StatusPill tone="red">Assessor review blocked</StatusPill>
      </header>

      <div className="p-8 max-w-[1500px] mx-auto grid xl:grid-cols-[340px_1fr] gap-6">
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
            {filteredProfiles.map((profile) => {
              const active = profile.id === selected.id
              return (
                <button
                  type="button"
                  key={profile.id}
                  onClick={() => setSelectedId(profile.id)}
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
                    <StatusPill tone={profile.preWork.status === 'Submitted' ? 'green' : 'amber'}>{profile.preWork.status}</StatusPill>
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
                <PersonPlaceholder size="lg" />
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
                    <StatusPill tone="red">Review under development</StatusPill>
                  </div>
                  <div className="mt-5 grid sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4">
                      <p className="text-[11px] text-gray-500">Current stage</p>
                      <p className="text-sm font-semibold text-[#172033] mt-1">{selected.stage}</p>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4">
                      <p className="text-[11px] text-gray-500">360 responses</p>
                      <p className="text-sm font-semibold text-[#172033] mt-1">{selected.report360.completion}</p>
                    </div>
                    <div className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4">
                      <p className="text-[11px] text-gray-500">Overall completion</p>
                      <p className="text-sm font-semibold text-[#172033] mt-1">{selected.progress}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid lg:grid-cols-2 gap-5">
              <EvidenceCard icon={Camera} title="Participant Photograph" meta="Identity evidence" to={`/assessor/candidates/${selected.id}/photograph`} />
              <EvidenceCard icon={MessageSquareText} title="Role Interview" meta="Interview submission" to={`/assessor/candidates/${selected.id}/role-interview`} />
              <EvidenceCard icon={FileText} title="360 Report" meta={selected.report360.status} to={`/assessor/candidates/${selected.id}/360-report`} />
              <EvidenceCard icon={BriefcaseBusiness} title="Pre-work" meta={selected.preWork.status} to={`/assessor/candidates/${selected.id}/pre-work`} />
            </div>

            <section className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-[#e8edf4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-[#172033]">Assessor analysis</h3>
                  <p className="text-xs text-gray-400 mt-1">Upload the offline assessor analysis workbook maintained for this candidate.</p>
                </div>
                <StatusPill tone={analysisConfirmed ? 'green' : 'amber'}>{analysisConfirmed ? 'Uploaded' : uploadedAnalysis ? 'Pending confirmation' : 'Awaiting upload'}</StatusPill>
              </div>
              <div className="p-5">
                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#bfd3ea] bg-[#f8fbff] px-5 py-8 text-center hover:border-[#1e4d8c] hover:bg-blue-50/60 transition-colors">
                  <input
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file || !selected) return
                      setAnalysisUploads((current) => ({
                        ...current,
                        [selected.id]: {
                          name: file.name,
                          size: file.size,
                          status: 'selected',
                          selectedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                        },
                      }))
                      event.target.value = ''
                    }}
                  />
                  <span className="w-12 h-12 rounded-xl bg-white text-[#1e4d8c] border border-blue-100 flex items-center justify-center">
                    <Upload size={20} />
                  </span>
                  <span className="mt-4 text-sm font-semibold text-[#172033]">Upload assessor analysis Excel</span>
                  <span className="mt-1 text-xs text-gray-500">Supports .xls, .xlsx, or .csv files</span>
                </label>
                {uploadedAnalysis && (
                  <div className={`mt-4 rounded-xl border px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center ${analysisConfirmed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <span className={`w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 ${analysisConfirmed ? 'text-emerald-700' : 'text-amber-700'}`}>
                      <FileSpreadsheet size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#172033] truncate">{uploadedAnalysis.name}</p>
                      <p className={`text-[11px] mt-0.5 ${analysisConfirmed ? 'text-emerald-700/70' : 'text-amber-700/70'}`}>
                        {analysisConfirmed ? `Uploaded ${uploadedAnalysis.uploadedAt}` : `Selected ${uploadedAnalysis.selectedAt}. Confirm to upload.`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!analysisConfirmed && (
                        <button
                          type="button"
                          onClick={() => setAnalysisUploads((current) => ({
                            ...current,
                            [selected.id]: {
                              ...current[selected.id],
                              status: 'uploaded',
                              uploadedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                            },
                          }))}
                          className="rounded-lg bg-[#1e4d8c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#173f72]"
                        >
                          Confirm upload
                        </button>
                      )}
                      {!analysisLocked && (
                        <button
                          type="button"
                          onClick={() => setAnalysisUploads((current) => ({ ...current, [selected.id]: null }))}
                          className={`rounded-lg border bg-white px-3 py-2 text-xs font-semibold ${analysisConfirmed ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}`}
                        >
                          Edit input
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <CheckCircle2 size={17} className="text-[#1e4d8c] shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-5">
                This page now keeps the submitted evidence visible while assessor scoring and analysis remain captured through the uploaded offline workbook.
              </p>
            </section>
          </main>
        )}
      </div>
    </div>
  )
}
