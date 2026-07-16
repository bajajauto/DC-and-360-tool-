import { ArrowLeft, Download, Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { download360Pptx, get360ReportHtml } from '../../lib/reportDownload'

export default function ReportPreview() {
  const { participantId } = useParams()
  const [participant, setParticipant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloadState, setDownloadState] = useState({ status: 'idle', message: '' })
  const [reportUrl, setReportUrl] = useState('')

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
    get360ReportHtml(participantId).then((html) => {
      if (!active) return
      url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      setReportUrl(url)
    }).catch((error) => setDownloadState({ status: 'error', message: error.message }))
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [participantId, participant])

  async function handleDownload() {
    setDownloadState({ status: 'loading', message: '' })
    try {
      await download360Pptx(participant.id, participant.name)
      setDownloadState({ status: 'idle', message: '' })
    } catch (error) {
      setDownloadState({ status: 'error', message: error.message || 'Unable to download the report.' })
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Loading report preview...</div>
  }

  if (!participant) return <Navigate to="/td/cohorts" replace />
  if (participant.reportReady !== true) {
    return <Navigate to={`/td/participants/${participant.id}`} replace />
  }

  return (
    <div className="min-h-screen">
      <header className="h-20 bg-white border-b border-[#e4e9f1] px-8 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link to={`/td/participants/${participant.id}`} className="w-9 h-9 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-gray-500">
            <ArrowLeft size={17} />
          </Link>
          <div>
            <p className="text-xs text-gray-400">{participant.name} / Reports</p>
            <h1 className="text-xl font-bold text-[#172033]">360 report preview</h1>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloadState.status === 'loading'}
          className="flex items-center gap-2 bg-[#1e4d8c] text-white rounded-lg px-4 py-2.5 text-xs font-semibold hover:bg-[#173f72] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download size={15} />
          {downloadState.status === 'loading' ? 'Preparing...' : 'Download report'}
        </button>
      </header>

      <div className="px-8 py-4 max-w-[1080px] mx-auto print:hidden">
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 flex items-center gap-3">
          <Eye size={17} className="text-[#1e4d8c] shrink-0" />
          <p className="text-xs text-blue-800">
            <strong>TD preview.</strong> This is the final print-ready HTML report. Open the downloaded file and choose Print → Save as PDF when a PDF is required.
          </p>
        </div>
        {downloadState.status === 'error' && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {downloadState.message}
          </div>
        )}
      </div>

      {reportUrl ? <iframe title="360 report preview" src={reportUrl} className="block w-full min-h-[calc(100vh-80px)] border-0 bg-slate-200" /> : <div className="p-12 text-center text-sm text-gray-500">Preparing report preview...</div>}
    </div>
  )
}
