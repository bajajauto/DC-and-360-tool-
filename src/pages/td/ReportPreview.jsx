import { ArrowLeft, Eye, Printer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { get360ReportPreviewUrl } from '../../lib/reportDownload'

export default function ReportPreview() {
  const { participantId } = useParams()
  const [participant, setParticipant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloadState, setDownloadState] = useState({ status: 'idle', message: '' })
  const [previewUrl, setPreviewUrl] = useState('')
  const previewFrame = useRef(null)

  useEffect(() => {
    if (!participantId) return
    setLoading(true)
    api.getParticipant(participantId)
      .then((result) => setParticipant(result.data))
      .catch(() => setParticipant(null))
      .finally(() => setLoading(false))
  }, [participantId])

  useEffect(() => {
    if (!participantId || !participant) return
    let active = true
    let url = ''
    get360ReportPreviewUrl(participantId)
      .then((objectUrl) => {
        if (!active) return
        url = objectUrl
        setPreviewUrl(url)
      })
      .catch((error) => setDownloadState({ status: 'error', message: error.message }))
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [participantId, participant])

  function handleDownload() {
    previewFrame.current?.contentWindow?.print()
  }

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading report...</div>
  if (!participant) return <Navigate to="/td/reports" replace />

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex h-20 items-center justify-between border-b border-[#e4e9f1] bg-white px-8">
        <div className="flex items-center gap-4">
          <Link to={`/td/reports/participant/${participant.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] text-gray-500">
            <ArrowLeft size={17} />
          </Link>
          <div>
            <p className="text-xs text-gray-400">{participant.name} / Reports</p>
            <h1 className="text-xl font-bold text-[#172033]">360 PowerPoint report</h1>
          </div>
        </div>
        <button onClick={handleDownload} disabled={!previewUrl} className="flex items-center gap-2 rounded-lg bg-[#1e4d8c] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60">
          <Printer size={15} />
          Save as PDF
        </button>
      </header>

      <div className="mx-auto max-w-[1080px] px-8 py-4">
        {previewUrl && <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5"><Eye size={17} className="shrink-0 text-[#1e4d8c]" /><p className="text-xs text-blue-800"><strong>TD preview.</strong> Choose <strong>Save as PDF</strong>, then select “Save as PDF” in the browser print dialog.</p></div>}
        {downloadState.status === 'error' && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{downloadState.message}</div>}
      </div>
      {previewUrl
        ? <iframe ref={previewFrame} title="360° Feedback Report preview" src={previewUrl} className="block min-h-[calc(100vh-80px)] w-full border-0 bg-slate-200" />
        : downloadState.status !== 'error' && <div className="p-12 text-center text-sm text-gray-500">Preparing report preview...</div>}
    </div>
  )
}
