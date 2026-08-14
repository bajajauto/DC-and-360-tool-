import { ArrowLeft, Download, Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { download360Pdf, get360ReportPreviewUrl } from '../../lib/reportDownload'

export default function Report360() {
  const { user } = useUser()
  const [previewUrl, setPreviewUrl] = useState('')
  const [state, setState] = useState({ status: 'loading', message: '' })

  useEffect(() => {
    if (!user?.participantId) return
    let active = true
    let url = ''
    get360ReportPreviewUrl(user.participantId)
      .then((objectUrl) => {
        if (!active) return
        url = objectUrl
        setPreviewUrl(url)
        setState({ status: 'ready', message: '' })
      })
      .catch((error) => setState({ status: 'error', message: error.message }))
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [user?.participantId])

  async function download() {
    setState({ status: 'downloading', message: '' })
    try {
      await download360Pdf(user.participantId, user.name)
      setState({ status: 'ready', message: '' })
    } catch (error) {
      setState({ status: 'error', message: error.message })
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex h-20 items-center justify-between border-b border-[#e4e9f1] bg-white px-8">
        <div className="flex items-center gap-4">
          <Link to="/participant/reports" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] text-gray-500 hover:text-[#1e4d8c]">
            <ArrowLeft size={17} />
          </Link>
          <div>
            <p className="text-xs text-gray-400">My Reports / 360 Feedback</p>
            <h1 className="text-xl font-bold text-[#172033]">360° Feedback Report</h1>
          </div>
        </div>
        <button onClick={download} disabled={state.status === 'downloading'} className="flex items-center gap-2 rounded-lg bg-[#1e4d8c] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#173f72] disabled:opacity-50">
          <Download size={15} />
          {state.status === 'downloading' ? 'Preparing…' : 'Download PDF'}
        </button>
      </header>

      <div className="mx-auto max-w-[1080px] px-8 py-4">
        {state.status === 'ready' && <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5"><Eye size={17} className="shrink-0 text-[#1e4d8c]" /><p className="text-xs text-blue-800">Preview the released report below or download it directly as a PDF.</p></div>}
        {state.status === 'error' && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{state.message}</div>}
      </div>
      {previewUrl
        ? <iframe title="360° Feedback Report" src={previewUrl} className="block min-h-[calc(100vh-80px)] w-full border-0 bg-slate-200" />
        : state.status !== 'error' && <div className="p-12 text-center text-sm text-gray-500">Preparing report preview…</div>}
    </div>
  )
}
