import { ArrowLeft, Download, FileText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { api } from '../../lib/api'
import { downloadBuhrReport } from '../../lib/reportDownload'

const reportDefinitions = [
  { type: '360', title: '360 Feedback Report', description: 'The participant’s released multi-rater feedback report.', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  { type: 'dc', title: 'Development Centre Report', description: 'The participant’s released Development Centre report.', tone: 'border-violet-200 bg-violet-50 text-violet-700' },
]

export default function BUHRParticipantReports() {
  const { participantId } = useParams()
  const { user } = useUser()
  const [participant, setParticipant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    api.getBuhrParticipants(user.id)
      .then((result) => setParticipant((result.data?.participants || []).find((item) => item.id === participantId) || null))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [participantId, user?.id])

  const reportsByType = useMemo(() => new Map((participant?.reports || []).map((report) => [report.type, report])), [participant])

  async function download(type) {
    setError('')
    try {
      await downloadBuhrReport(user.id, participant.id, type, participant.name)
    } catch (err) {
      setError(err.message)
    }
  }

  return <div className="p-8"><div className="mx-auto max-w-[1180px]">
    <Link to="/buhr/reports" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1e5fba] hover:text-[#173f72]"><ArrowLeft size={16}/>Back to Report Repository</Link>
    {loading && <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">Loading reports...</div>}
    {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {!loading && !participant && <div className="rounded-2xl border bg-white p-8 text-sm text-slate-500">This participant is not available in your business-unit scope.</div>}
    {participant && <>
      <header className="mb-6 rounded-2xl border border-[#dce3ed] bg-white p-6"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee reports</p><h1 className="mt-2 text-3xl font-bold text-[#1e4d8c]">{participant.name}</h1><p className="mt-2 text-sm text-slate-500">{participant.employeeId} · {participant.designation} · {participant.cohort.name}</p></header>
      <div className="grid gap-5 md:grid-cols-2">{reportDefinitions.map((definition) => {
        const report = reportsByType.get(definition.type)
        return <section key={definition.type} className="flex min-h-64 flex-col rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4"><span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${definition.tone}`}><FileText size={20}/></span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${report ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{report ? 'Available' : 'Not available'}</span></div>
          <h2 className="mt-5 text-xl font-bold text-[#172033]">{definition.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{definition.description}</p><p className="mt-3 text-xs text-slate-400">{report?.releasedAt ? `Made available ${new Date(report.releasedAt).toLocaleDateString('en-GB')}` : 'This report has not been made available by TD.'}</p>
          <div className="mt-auto pt-6">{report ? <button onClick={() => download(definition.type)} className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fba] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0e3f87]"><Download size={14}/>Download Report</button> : <span className="text-xs font-medium text-amber-700">Awaiting report availability</span>}</div>
        </section>
      })}</div>
    </>}
  </div></div>
}
