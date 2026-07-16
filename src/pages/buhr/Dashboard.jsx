import { Download, FileText, Search, TrendingUp, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { downloadBuhr360Pptx } from '../../lib/reportDownload'
import { useUser } from '../../context/UserContext'

const statusTone = {
  waiting: 'border-slate-200 bg-slate-50 text-slate-600',
  ready: 'border-amber-200 bg-amber-50 text-amber-700',
  generated: 'border-blue-200 bg-blue-50 text-blue-700',
  released: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

function Metric({ label, value, icon: Icon, sub }) {
  return (
    <section className="rounded-xl border border-[#d5dce5] bg-white p-5 shadow-[0_2px_16px_rgba(31,41,55,.06)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <Icon size={17} className="text-[#1e5fba]" />
      </div>
      <p className="mt-2 text-3xl font-semibold text-[#0f172a]">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </section>
  )
}

function percent(participant) {
  if (!participant.totalResponses) return 0
  return Math.round((participant.responses / participant.totalResponses) * 100)
}

const viewCopy = {
  dashboard: { title: 'BU Dashboard', subtitle: 'Portfolio overview and current Development Centre status', table: 'Current status' },
  people: { title: 'People Status', subtitle: 'Track every participant mapped to your business unit', table: 'People in Development Centre' },
  reports: { title: 'Published Reports', subtitle: 'Download reports released by Talent Development', table: 'Reports available to BUHR' },
}

export default function BUHRDashboard({ view = 'dashboard' }) {
  const { user } = useUser()
  const [payload, setPayload] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    setLoading(true)
    setError('')
    api.getBuhrParticipants(user.id)
      .then((result) => {
        if (!cancelled) setPayload(result.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const participants = payload?.participants || []
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const scoped = view === 'reports' ? participants.filter((participant) => participant.reportStatus === 'released') : participants
    if (!normalized) return scoped
    return scoped.filter((participant) =>
      `${participant.name} ${participant.employeeId} ${participant.designation} ${participant.stage} ${participant.reportStatus}`.toLowerCase().includes(normalized),
    )
  }, [participants, query, view])

  async function handleDownload(participant) {
    setDownloadError('')
    try {
      await downloadBuhr360Pptx(user.id, participant.id, participant.name)
    } catch (err) {
      setDownloadError(err.message || 'Unable to download the published report.')
    }
  }

  const summary = payload?.summary || { total: 0, inProgress: 0, completed: 0, releasedReports: 0 }
  const copy = viewCopy[view] || viewCopy.dashboard

  return (
    <div>
      <header className="h-20 bg-white border-b border-[#e4e9f1] px-8 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">BUHR / {payload?.businessUnit || user?.bu || 'Business Unit'}</p>
          <h1 className="text-xl font-bold text-[#172033]">{copy.title}</h1>
          <p className="mt-1 text-xs text-slate-500">{copy.subtitle}</p>
        </div>
      </header>

      <div className="p-8 max-w-[1360px] mx-auto">
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {downloadError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{downloadError}</div>}

        {view === 'dashboard' && <section className="grid gap-4 md:grid-cols-4">
          <Metric label="People Mapped" value={summary.total} icon={Users} sub="participants in your business unit" />
          <Metric label="In Progress" value={summary.inProgress} icon={TrendingUp} sub="currently moving through DC" />
          <Metric label="Completed" value={summary.completed} icon={FileText} sub="DC flow marked completed" />
          <Metric label="Published Reports" value={summary.releasedReports} icon={Download} sub="available to BUHR now" />
        </section>}

        {view === 'people' && <section className="grid gap-4 md:grid-cols-3">
          <Metric label="People Mapped" value={summary.total} icon={Users} sub="participants in your business unit" />
          <Metric label="In Progress" value={summary.inProgress} icon={TrendingUp} sub="currently moving through DC" />
          <Metric label="Completed" value={summary.completed} icon={FileText} sub="DC flow marked completed" />
        </section>}

        {view === 'reports' && <section className="grid gap-4 md:grid-cols-2">
          <Metric label="Published Reports" value={summary.releasedReports} icon={Download} sub="available for download now" />
          <Metric label="Awaiting Publication" value={Math.max(0, summary.total - summary.releasedReports)} icon={FileText} sub="visible after TD releases them" />
        </section>}

        <section className="mt-6 overflow-hidden rounded-xl border border-[#d5dce5] bg-white shadow-[0_2px_16px_rgba(31,41,55,.06)]">
          <div className="flex flex-col gap-3 border-b border-[#d5dce5] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0f172a]">{copy.table}</h2>
              <p className="mt-1 text-xs text-slate-500">{view === 'reports' ? 'Only reports published by TD appear here.' : 'Progress is visible throughout the process. Reports unlock only after TD publishes them.'}</p>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === 'reports' ? 'Search published reports' : 'Search people'} className="w-full rounded-lg border border-[#c2ccda] bg-white py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#d6e4f7] md:w-64" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white text-left text-[13px]">
              <thead className="bg-[#ebf2fa]">
                <tr>
                  {['Employee', 'Cohort', 'Current State', '360 Progress', 'Report', 'Actions'].map((label) => (
                    <th key={label} className="border-b border-[#d5dce5] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((participant) => (
                  <tr key={participant.id} className="hover:bg-[#f4f7fb]">
                    <td className="border-b border-[#e8edf4] px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e4eef9] text-xs font-bold text-[#1e4d8c]">{participant.initials}</span>
                        <span>
                          <span className="block font-semibold text-[#172033]">{participant.name}</span>
                          <span className="block text-[11px] text-slate-500">{participant.employeeId} - {participant.designation}</span>
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-[#e8edf4] px-5 py-4">
                      <p className="font-medium text-slate-700">{participant.cohort?.name || 'Unassigned'}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{participant.cohort?.programme || 'Development Centre'}</p>
                    </td>
                    <td className="border-b border-[#e8edf4] px-5 py-4">
                      <p className="font-semibold text-slate-800">{participant.stage}</p>
                      <div className="mt-2 h-1.5 w-28 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-[#1e5fba]" style={{ width: `${participant.progress}%` }} />
                      </div>
                    </td>
                    <td className="border-b border-[#e8edf4] px-5 py-4">
                      <p className="font-semibold text-slate-800">{participant.responses}/{participant.totalResponses}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{percent(participant)}% respondent completion</p>
                    </td>
                    <td className="border-b border-[#e8edf4] px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone[participant.reportStatus] || statusTone.waiting}`}>
                        {participant.reportStatus}
                      </span>
                      {participant.report?.releasedAt && <p className="mt-1 text-[11px] text-slate-500">Published {new Date(participant.report.releasedAt).toLocaleDateString('en-GB')}</p>}
                    </td>
                    <td className="border-b border-[#e8edf4] px-5 py-4">
                      <button
                        type="button"
                        onClick={() => handleDownload(participant)}
                        disabled={participant.reportStatus !== 'released'}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fba] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0e3f87] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        <Download size={14} />
                        Download report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(loading || !filtered.length) && (
            <div className="py-14 text-center">
              <Users className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">{loading ? 'Loading BUHR view...' : view === 'reports' ? 'No published reports are available yet.' : 'No people match this search.'}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
