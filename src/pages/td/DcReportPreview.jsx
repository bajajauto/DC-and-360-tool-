import { ArrowLeft, Download, Eye } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { downloadDcPreviewPdf, getDcReportPreviewUrl } from '../../lib/reportDownload'

export default function DcReportPreview() {
  const { participantId } = useParams()
  const [participant, setParticipant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState({ status: 'idle', message: '' })
  const [previewUrl, setPreviewUrl] = useState('')
  const frame = useRef(null)

  useEffect(() => {
    api.getParticipant(participantId).then(({ data }) => setParticipant(data)).catch(() => setParticipant(null)).finally(() => setLoading(false))
  }, [participantId])

  useEffect(() => {
    if (!participant) return undefined
    let active = true
    let url = ''
    getDcReportPreviewUrl(participantId).then((value) => {
      if (!active) return
      url = value
      setPreviewUrl(value)
    }).catch((error) => setState({ status: 'error', message: error.message }))
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [participant, participantId])

  async function download() {
    setState({ status: 'loading', message: '' })
    try {
      await downloadDcPreviewPdf(frame.current, participant.name)
      setState({ status: 'idle', message: '' })
    } catch (error) {
      setState({ status: 'error', message: error.message })
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading report...</div>
  if (!participant) return <Navigate to="/td/reports" replace />
  return <div className="min-h-screen bg-slate-100">
    <header className="flex h-20 items-center justify-between border-b border-[#e4e9f1] bg-white px-8">
      <div className="flex items-center gap-4"><Link to={`/td/reports/participant/${participant.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg border text-gray-500"><ArrowLeft size={17}/></Link><div><p className="text-xs text-gray-400">{participant.name} / Reports</p><h1 className="text-xl font-bold text-[#172033]">Development Centre Report</h1></div></div>
      <button onClick={download} disabled={state.status === 'loading'} className="flex items-center gap-2 rounded-lg bg-[#1e4d8c] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"><Download size={15}/>{state.status === 'loading' ? 'Preparing...' : 'Download PDF'}</button>
    </header>
    <div className="mx-auto max-w-[1120px] px-8 py-4">
      {previewUrl && <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5"><Eye size={17} className="text-[#1e4d8c]"/><p className="text-xs text-blue-800"><strong>TD preview.</strong> Content comes from Overall Summary, Competency Profile, participant details, and 360 scores.</p></div>}
      {state.status === 'error' && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{state.message}</div>}
    </div>
    {previewUrl ? <iframe ref={frame} title="Development Centre Report preview" src={previewUrl} className="block min-h-[calc(100vh-80px)] w-full border-0 bg-slate-200"/> : state.status !== 'error' && <div className="p-12 text-center text-sm text-gray-500">Preparing report preview...</div>}
  </div>
}
