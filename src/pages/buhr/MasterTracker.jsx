import { Download, Search, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../../context/UserContext'
import { api } from '../../lib/api'
import { exportBuhrProcessStatus } from '../../lib/trackingExport'

function StatusPill({ children, tone = 'neutral' }) {
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    info: 'border-blue-200 bg-blue-50 text-[#1e5fba]',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  }

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  )
}

export default function BUHRMasterTracker() {
  const { user } = useUser()
  const [payload, setPayload] = useState(null)
  const [selectedCohortId, setSelectedCohortId] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
  const cohorts = useMemo(() => {
    const byId = new Map()
    participants.forEach((participant) => {
      if (participant.cohort?.id) byId.set(participant.cohort.id, participant.cohort)
    })
    return [...byId.values()].sort((a, b) => String(b.eventStart || '').localeCompare(String(a.eventStart || '')))
  }, [participants])

  const scopedParticipants = useMemo(
    () => participants.filter((participant) => selectedCohortId === 'all' || participant.cohort?.id === selectedCohortId),
    [participants, selectedCohortId],
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return scopedParticipants.filter((participant) => {
      if (!normalized) return true
      return `${participant.name} ${participant.employeeId} ${participant.designation} ${participant.stage} ${participant.cohort?.name || ''}`
        .toLowerCase()
        .includes(normalized)
    })
  }, [query, scopedParticipants])

  const selectedCohort = cohorts.find((cohort) => cohort.id === selectedCohortId)

  function downloadTracker() {
    const scope = selectedCohort ? `${payload?.businessUnit} - ${selectedCohort.name}` : payload?.businessUnit
    exportBuhrProcessStatus(scope, scopedParticipants)
  }

  return (
    <div>
      <header className="flex min-h-20 items-center justify-between border-b border-[#e4e9f1] bg-white px-8 py-4">
        <div>
          <p className="mb-1 text-xs text-gray-400">BUHR / {payload?.businessUnit || user?.bu || 'Business Unit'}</p>
          <h1 className="text-xl font-bold text-[#172033]">Trackers and Exports</h1>
          <p className="mt-1 text-xs text-slate-500">Download the live master tracker for employees mapped to your business unit.</p>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] p-8">
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <strong>Status only.</strong> The tracker includes completion and response counts, never individual 360 ratings, feedback, or assessor scores.
        </div>

        <section className="mb-5 rounded-xl border border-[#d5dce5] bg-white p-5 shadow-[0_2px_16px_rgba(31,41,55,.06)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ebf2fa] text-[#1e5fba]">
                <Download size={18} />
              </div>
              <h2 className="text-base font-semibold text-[#0f172a]">BUHR Master Tracker</h2>
              <p className="mt-1 text-sm text-slate-600">One Excel row per mapped employee with task completion, 360 response counts, and report status.</p>
              <p className="mt-2 text-xs text-slate-500"><strong>Includes:</strong> Ticket ID, employee, cohort, stage, nominations, pre-work, photograph, 360 responses, and report status.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Cohort to export</span>
                <select
                  value={selectedCohortId}
                  onChange={(event) => setSelectedCohortId(event.target.value)}
                  className="w-full min-w-72 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-[#1e4d8c] focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">All cohorts</option>
                  {cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={downloadTracker}
                disabled={loading || !scopedParticipants.length}
                className="inline-flex min-h-[38px] items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#1e5fba] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0e3f87] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={15} />
                Download Master Tracker Excel
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#d5dce5] bg-white shadow-[0_2px_16px_rgba(31,41,55,.06)]">
          <div className="flex flex-col gap-4 border-b border-[#d5dce5] px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-[#0f172a]">Mapped employees ({filtered.length})</h2>
              <p className="mt-1 text-xs text-slate-500">{loading ? 'Loading employees…' : `${filtered.length} of ${participants.length} mapped employee${participants.length === 1 ? '' : 's'} shown`}</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Search employees</span>
                <span className="relative block">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Name or ticket ID"
                    className="w-full rounded-lg border border-[#c2ccda] bg-white py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#d6e4f7] sm:w-60"
                  />
                </span>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] border-collapse bg-white text-left text-[13px]">
              <thead className="bg-[#ebf2fa]">
                <tr>
                  {['Ticket ID', 'Employee', 'Cohort', 'Current stage', 'Nominations', 'Pre-Work', 'Photo', '360 Responses', '360 Report Status', 'DC Report Status'].map((label) => (
                    <th key={label} className="border-b border-[#d5dce5] px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((participant) => {
                  const responsesComplete = participant.totalResponses > 0 && participant.responses >= participant.totalResponses
                  const nominationsSubmitted = participant.nominees?.length > 0
                  const preWorkSubmitted = participant.progress >= 63
                  const photoUploaded = participant.progress >= 75
                  const report360Released = participant.reportStatus === 'released'
                  const report360Ready = participant.reportStatus === 'ready'
                  const report360Generated = participant.reportStatus === 'generated'
                  const report360Label = report360Released ? 'Released' : report360Generated ? 'Generated' : report360Ready ? 'Ready' : 'Waiting'
                  const report360Tone = report360Released || report360Generated ? 'success' : report360Ready ? 'info' : 'warning'
                  const dcReportReleased = participant.reports?.some((report) => report.type === 'dc')
                  return (
                    <tr key={participant.id} className="hover:bg-[#f4f7fb]">
                      <td className="border-b border-[#e8edf4] px-4 py-4 font-medium text-[#1e5fba]">{participant.employeeId}</td>
                      <td className="border-b border-[#e8edf4] px-4 py-4">
                        <p className="font-semibold text-[#172033]">{participant.name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{participant.designation}</p>
                      </td>
                      <td className="border-b border-[#e8edf4] px-4 py-4">
                        <p className="font-medium text-slate-700">{participant.cohort?.name || 'Unassigned'}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{participant.cohort?.programme || 'Development Centre'}</p>
                      </td>
                      <td className="border-b border-[#e8edf4] px-4 py-4"><StatusPill tone="info">{participant.stage}</StatusPill></td>
                      <td className="border-b border-[#e8edf4] px-4 py-4"><StatusPill tone={nominationsSubmitted ? 'success' : 'warning'}>{nominationsSubmitted ? 'Submitted' : 'Not submitted'}</StatusPill></td>
                      <td className="border-b border-[#e8edf4] px-4 py-4"><StatusPill tone={preWorkSubmitted ? 'success' : 'warning'}>{preWorkSubmitted ? 'Submitted' : 'Pending'}</StatusPill></td>
                      <td className="border-b border-[#e8edf4] px-4 py-4"><StatusPill tone={photoUploaded ? 'success' : 'warning'}>{photoUploaded ? 'Uploaded' : 'Pending'}</StatusPill></td>
                      <td className="border-b border-[#e8edf4] px-4 py-4"><StatusPill tone={responsesComplete ? 'success' : participant.responses ? 'info' : 'neutral'}>{participant.responses}/{participant.totalResponses}</StatusPill></td>
                      <td className="border-b border-[#e8edf4] px-4 py-4"><StatusPill tone={report360Tone}>{report360Label}</StatusPill></td>
                      <td className="border-b border-[#e8edf4] px-4 py-4"><StatusPill tone={dcReportReleased ? 'success' : 'warning'}>{dcReportReleased ? 'Released' : 'Not released'}</StatusPill></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {(loading || !filtered.length) && (
            <div className="py-14 text-center">
              <Users className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">{loading ? 'Loading tracker…' : 'No mapped employees match these filters.'}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
