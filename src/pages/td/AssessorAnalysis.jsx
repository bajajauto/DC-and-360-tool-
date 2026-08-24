import { Download, FileSpreadsheet, Search, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api, getToken } from '../../lib/api'

const API_BASE = import.meta.env.VITE_API_URL || ''
const formatSize = (size) => size ? `${(size / 1024 / 1024).toFixed(2)} MB` : '—'

export default function AssessorAnalysis() {
  const [rows, setRows] = useState([]), [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState(''), [cohortFilter, setCohortFilter] = useState('all')
  const [file, setFile] = useState(null), [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false), [message, setMessage] = useState('')

  useEffect(() => { api.getAssessorAnalysis().then(({ data }) => { setRows(data || []); setSelectedId(data?.[0]?.participantId || null) }).catch((error) => setMessage(error.message)).finally(() => setLoading(false)) }, [])
  const cohorts = useMemo(() => [...new Set(rows.map((row) => row.cohort).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [rows])
  const filtered = useMemo(() => rows.filter((row) => (cohortFilter === 'all' || row.cohort === cohortFilter) && `${row.name} ${row.employeeId} ${row.businessUnit} ${row.cohort}`.toLowerCase().includes(query.toLowerCase())), [cohortFilter, query, rows])
  const selected = filtered.find((row) => row.participantId === selectedId) || filtered[0]

  async function upload() {
    if (!file || !selected) return
    setUploading(true); setMessage('')
    try {
      const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(new Error('Could not read the workbook.')); reader.readAsDataURL(file) })
      const { data } = await api.uploadAssessorAnalysis(selected.participantId, { fileName: file.name, mimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: file.size, dataUrl })
      await api.generateDcReport(selected.participantId)
      setRows((current) => current.map((row) => row.participantId === selected.participantId ? { ...row, workbook: data.workbook } : row)); setFile(null)
      setMessage('Workbook uploaded and the DC report generated successfully.')
    } catch (error) { setMessage(error.message) } finally { setUploading(false) }
  }

  async function download() {
    if (!selected?.workbook) return
    const response = await fetch(`${API_BASE}/api/assessor-analysis/${selected.participantId}/download`, { headers: { Authorization: `Bearer ${getToken()}` } })
    if (!response.ok) return setMessage('Unable to download the workbook.')
    const url = URL.createObjectURL(await response.blob()), anchor = document.createElement('a')
    anchor.href = url; anchor.download = selected.workbook.fileName; anchor.click(); URL.revokeObjectURL(url)
  }

  return <div className="px-9 py-8"><div className="mx-auto max-w-[1400px]">
    <p className="mb-2 text-xs text-slate-500">Talent Development / Assessor Operations</p><h1 className="font-serif text-[30px] font-medium text-[#0f172a]">Assessor Analysis Excel</h1><p className="mt-1 text-sm text-slate-600">View, upload, or replace the participant workbook used for DC report generation.</p>
    {message && <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}
    <div className="mt-5 grid gap-6 xl:grid-cols-[350px_1fr]"><aside className="self-start overflow-hidden rounded-2xl border border-[#d5dce5] bg-white">
      <div className="border-b p-5"><h2 className="font-semibold">Participants</h2>
        <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cohort</span><select value={cohortFilter} onChange={(event) => { setCohortFilter(event.target.value); setSelectedId(null); setFile(null); setMessage('') }} className="w-full rounded-lg border border-[#dce3ed] bg-white px-3 py-2 text-xs"><option value="all">All cohorts</option>{cohorts.map((cohort) => <option key={cohort} value={cohort}>{cohort}</option>)}</select></label>
        <div className="relative mt-3"><Search size={15} className="absolute left-3 top-2.5 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search participants" className="w-full rounded-lg border py-2 pl-9 pr-3 text-xs"/></div>
      </div><div className="max-h-[65vh] overflow-y-auto">{loading && <p className="p-5 text-sm text-slate-500">Loading…</p>}{!loading && !filtered.length && <p className="p-5 text-sm text-slate-500">No participants match this filter.</p>}{filtered.map((row) => <button key={row.participantId} onClick={() => { setSelectedId(row.participantId); setFile(null); setMessage('') }} className={`w-full border-b px-5 py-4 text-left ${row.participantId === selected?.participantId ? 'bg-blue-50' : 'hover:bg-slate-50'}`}><p className="text-sm font-semibold">{row.name}</p><p className="mt-1 text-[11px] text-slate-500">{row.employeeId} · {row.businessUnit}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${row.workbook ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.workbook ? 'Uploaded' : 'Awaiting upload'}</span></button>)}</div>
    </aside>{selected && <main className="rounded-2xl border border-[#d5dce5] bg-white p-6"><div className="border-b pb-4"><h2 className="text-xl font-bold">{selected.name}</h2><p className="mt-1 text-sm text-slate-500">{selected.employeeId} · {selected.designation} · {selected.cohort}</p></div>
      {selected.workbook && <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><FileSpreadsheet className="text-emerald-700"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{selected.workbook.fileName}</p><p className="mt-1 text-xs text-emerald-700">{formatSize(selected.workbook.size)} · Uploaded by {selected.workbook.uploadedBy} on {new Date(selected.workbook.uploadedAt).toLocaleString('en-GB')}</p></div><button onClick={download} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700"><Download size={14}/>Download</button></div>}
      <label className="mt-5 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#bfd3ea] bg-[#f8fbff] p-8 text-center"><input type="file" accept=".xls,.xlsx,.csv" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)}/><Upload size={24} className="text-[#1e5fba]"/><p className="mt-3 text-sm font-semibold">{file ? file.name : selected.workbook ? 'Choose a replacement workbook' : 'Choose assessor analysis workbook'}</p><p className="mt-1 text-xs text-slate-500">Excel or CSV, maximum 7 MB</p></label><div className="mt-4 flex justify-end"><button onClick={upload} disabled={!file || uploading} className="rounded-lg bg-[#1e5fba] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{uploading ? 'Uploading…' : selected.workbook ? 'Replace workbook' : 'Upload workbook'}</button></div>
    </main>}</div>
  </div></div>
}
