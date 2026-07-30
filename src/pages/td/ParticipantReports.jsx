import { ArrowLeft, Download, Eye, FileText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { download360Pptx } from '../../lib/reportDownload'

const reportDefinitions = [
  { type: '360', title: '360° Feedback Report', description: 'Feedback collected from the participant’s nominated respondents.', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  { type: 'dc', title: 'Development Centre Report', description: 'Final Development Centre observations and development recommendations.', tone: 'border-violet-200 bg-violet-50 text-violet-700' },
]

export default function ParticipantReports() {
  const { participantId } = useParams()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getReportRepository()
      .then((result) => setReports((result.data || []).filter((report) => report.id === participantId)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [participantId])

  const participant = reports[0]
  const reportsByType = useMemo(() => new Map(reports.map((report) => [report.reportType, report])), [reports])

  return (
    <div className="p-8">
      <div className="mx-auto max-w-[1180px]">
        <Link to="/td/reports" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1e5fba] hover:text-[#173f72]"><ArrowLeft size={16} />Back to Report Repository</Link>
        {loading && <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">Loading reports...</div>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {!loading && !error && !participant && <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">No reports were found for this participant.</div>}
        {participant && <>
          <header className="mb-6 rounded-2xl border border-[#dce3ed] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Participant reports</p>
            <h1 className="mt-2 text-3xl font-bold text-[#1e4d8c]">{participant.name}</h1>
            <p className="mt-2 text-sm text-slate-500">{participant.employeeId} · {participant.designation} · {participant.cohortName}</p>
          </header>
          <div className="grid gap-5 md:grid-cols-2">
            {reportDefinitions.map((definition) => {
              const report = reportsByType.get(definition.type)
              return <section key={definition.type} className="flex min-h-64 flex-col rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${definition.tone}`}><FileText size={20} /></span>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${report ? report.reportStatus === 'released' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{report ? report.reportStatus : 'Not available'}</span>
                </div>
                <h2 className="mt-5 text-xl font-bold text-[#172033]">{definition.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{definition.description}</p>
                <p className="mt-3 text-xs text-slate-400">{report?.lastActivity ? `Updated ${new Date(report.lastActivity).toLocaleDateString('en-GB')}` : 'This report has not been generated yet.'}</p>
                <div className="mt-auto flex gap-2 pt-6">
                  {definition.type === '360' && report && <>
                    <Link to={`/td/reports/${participant.id}`} className="inline-flex items-center gap-2 rounded-lg bg-[#1e4d8c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173f72]"><Eye size={14} />Preview</Link>
                    <button onClick={() => download360Pptx(participant.id, participant.name)} className="inline-flex items-center gap-2 rounded-lg border border-[#dce3ed] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Download size={14} />Download</button>
                  </>}
                  {!report && <span className="text-xs font-medium text-amber-700">Awaiting report generation</span>}
                </div>
              </section>
            })}
          </div>
        </>}
      </div>
    </div>
  )
}
