import { Check, Download, FileText, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../../context/UserContext'
import { api } from '../../lib/api'
import { downloadBuhrReport } from '../../lib/reportDownload'

export default function BUHRReportRepository() {
  const { user } = useUser()
  const [payload, setPayload] = useState(null)
  const [cohortId, setCohortId] = useState('all')
  const [reportType, setReportType] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    api.getBuhrParticipants(user.id)
      .then((result) => setPayload(result.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user?.id])

  const participants = payload?.participants || []
  const cohorts = useMemo(() => {
    const unique = new Map()
    participants.forEach((participant) => unique.set(participant.cohort.id, participant.cohort))
    return [...unique.values()]
  }, [participants])

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const scoped = participants.filter((participant) => cohortId === 'all' || participant.cohort.id === cohortId)
    const searched = scoped.filter((participant) => !normalized || `${participant.name} ${participant.employeeId} ${participant.designation} ${participant.cohort.name}`.toLowerCase().includes(normalized))
    if (reportType === 'all') return searched.filter((participant) => participant.reports.length)
    return searched.flatMap((participant) => participant.reports.filter((report) => report.type === reportType).map((report) => ({ ...participant, selectedReport: report })))
  }, [participants, cohortId, reportType, query])

  async function download(participant, type) {
    setError('')
    try {
      await downloadBuhrReport(user.id, participant.id, type, participant.name)
    } catch (err) {
      setError(err.message)
    }
  }

  return <div>
    <header className="h-20 border-b border-[#e4e9f1] bg-white px-8 flex items-center">
      <div><p className="mb-1 text-xs text-gray-400">BUHR / {payload?.businessUnit || user?.bu || 'Business Unit'}</p><h1 className="text-xl font-bold text-[#172033]">Report Repository</h1><p className="mt-1 text-xs text-slate-500">DC and 360 reports made available by TD for employees in your business unit.</p></div>
    </header>
    <div className="mx-auto max-w-[1360px] p-8">
      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {[['Employees represented', new Set(participants.filter((p) => p.reports.length).map((p) => p.id)).size], ['Cohorts represented', cohorts.length]].map(([label, value]) => <section key={label} className="rounded-xl border border-[#d5dce5] bg-white p-5"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-[#1e5fba]">{value}</p></section>)}
      </div>
      <section className="overflow-hidden rounded-2xl border border-[#d5dce5] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#d5dce5] p-5 lg:flex-row lg:items-end lg:justify-between">
          <div><h2 className="text-lg font-bold text-[#1e5fba]">All reports</h2><div className="mt-3 inline-flex rounded-lg border border-[#dce3ed] bg-slate-50 p-1">{[['all', 'All reports'], ['dc', 'DC reports'], ['360', '360 reports']].map(([value, label]) => <button key={value} onClick={() => setReportType(value)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${reportType === value ? 'bg-[#1e5fba] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>{label}</button>)}</div></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Filter by cohort</span><select value={cohortId} onChange={(event) => setCohortId(event.target.value)} className="min-w-64 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-[#1e4d8c]"><option value="all">All cohorts</option>{cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></label>
            <div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" className="rounded-lg border py-2 pl-9 pr-3 text-xs"/></div>
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-left text-[13px]"><thead className="bg-[#f8fafc]"><tr>{(reportType === 'all' ? ['Ticket ID', 'Employee', 'DC Report', '360 Report', 'Cohort', 'Actions'] : ['Ticket ID', 'Employee', 'Report Type', 'Cohort', 'Released', 'Actions']).map((label) => <th key={label} className={`border-b px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 ${['DC Report', '360 Report'].includes(label) ? 'text-center' : ''}`}>{label}</th>)}</tr></thead><tbody>{rows.map((participant) => {
          const available = new Set(participant.reports.map((report) => report.type))
          const selected = participant.selectedReport
          return <tr key={selected ? selected.id : participant.id} className="border-b hover:bg-blue-50/40"><td className="px-5 py-4 font-semibold text-slate-500">{participant.employeeId}</td><td className="px-5 py-4"><p className="font-semibold">{participant.name}</p><p className="text-[11px] text-slate-500">{participant.designation}</p></td>{reportType === 'all' ? <>{['dc', '360'].map((type) => <td key={type} className="px-5 py-4 text-center"><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${available.has(type) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600'}`}>{available.has(type) ? <Check size={15}/> : <X size={14}/>}</span></td>)}</> : <td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${selected.type === 'dc' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>{selected.type} report</span></td>}<td className="px-5 py-4"><p className="font-medium">{participant.cohort.name}</p><p className="text-[11px] text-slate-500">{participant.cohort.programme}</p></td>{reportType !== 'all' && <td className="px-5 py-4 text-xs text-slate-500">{new Date(selected.releasedAt).toLocaleDateString('en-GB')}</td>}<td className="px-5 py-4"><div className="flex gap-2">{(reportType === 'all' ? participant.reports : [selected]).map((report) => <button key={report.id} onClick={() => download(participant, report.type)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e5fba] px-3 py-2 text-xs font-semibold text-white"><Download size={14}/>{reportType === 'all' ? report.type.toUpperCase() : 'Download'}</button>)}</div></td></tr>
        })}</tbody></table></div>
        {(loading || !rows.length) && <div className="py-14 text-center"><FileText className="mx-auto text-slate-300"/><p className="mt-3 text-sm text-slate-500">{loading ? 'Loading reports...' : 'No reports match these filters.'}</p></div>}
      </section>
    </div>
  </div>
}
