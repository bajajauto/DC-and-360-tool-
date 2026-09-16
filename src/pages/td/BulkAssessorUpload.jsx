import { useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, FolderUp } from 'lucide-react'
import { api } from '../../lib/api'
import { matchAssessorFiles, processAssessorEntry } from '../../lib/assessorBulkUpload'

const actionable = new Set(['ready', 'upload-error', 'report-error'])
const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(new Error('Could not read the workbook.'))
  reader.readAsDataURL(file)
})

export default function BulkAssessorUpload({ rows, loading, busy, onBusyChange, onUploaded }) {
  const [cohort, setCohort] = useState('')
  const [entries, setEntries] = useState([])
  const [running, setRunning] = useState(false)
  const [replaceExisting, setReplaceExisting] = useState(false)
  const folderInput = useRef(null)
  const filesInput = useRef(null)
  const cohorts = useMemo(() => [...new Set(rows.map((row) => row.cohort).filter(Boolean))].sort(), [rows])
  const hasCohort = cohorts.includes(cohort)
  const eligible = entries.filter((entry) => actionable.has(entry.status) && (entry.status === 'report-error' || !entry.participant.workbook || replaceExisting))
  const completed = entries.filter((entry) => entry.status === 'done').length

  function selectFiles(event) {
    if (!hasCohort || busy || running || loading) {
      event.target.value = ''
      return
    }
    setEntries(matchAssessorFiles(event.target.files, rows.filter((row) => row.cohort === cohort)))
    event.target.value = ''
  }

  async function run() {
    if (!hasCohort || loading || busy || running || !eligible.length) return
    setRunning(true)
    onBusyChange(true)
    try {
      for (const entry of eligible) {
        await processAssessorEntry(entry, {
          readFile,
          upload: api.uploadAssessorAnalysis,
          generate: api.generateDcReport,
          onUploaded,
          onStatus: (status, detail) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, status, detail } : item)),
        })
      }
    } finally {
      setRunning(false)
      onBusyChange(false)
    }
  }

  return <section className="mt-5 rounded-2xl border-2 border-blue-200 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-semibold text-[#0f172a]">Bulk assessor upload</h2>
    <p className="mt-1 text-sm text-slate-600">Upload all employees’ assessor workbooks from one folder.</p>
    <fieldset disabled={busy || running || loading} className="mt-5 space-y-4 disabled:opacity-50">
      <div className={`rounded-xl border-2 p-4 ${hasCohort ? 'border-emerald-200 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
        <label className="block text-sm font-bold text-slate-800">1. Select cohort <span className="ml-2 rounded-full bg-amber-200 px-2 py-1 text-xs text-amber-950">Required</span><select required aria-describedby="bulk-cohort-help" value={cohort} onChange={(event) => { setCohort(event.target.value); setEntries([]) }} className="mt-3 block min-h-12 w-full rounded-lg border-2 border-[#1e5fba] bg-white px-3 py-2.5 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-80"><option value="" disabled>Choose a cohort to continue</option>{cohorts.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <p id="bulk-cohort-help" className="mt-2 text-sm text-slate-700">{hasCohort ? `Files will be matched only to employees in ${cohort}.` : 'Select a cohort first to enable folder and file upload.'}</p>
      </div>
      <div className="flex flex-col items-center gap-5 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-6 sm:flex-row">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1e5fba] shadow-sm"><FolderUp size={32} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h3 className="text-base font-semibold text-[#0f172a]">2. Choose your assessor Excel folder</h3>
          <p className="mt-1 text-sm text-slate-600">We’ll match each file to its employee and show a preview before uploading.</p>
          <p className="mt-2 text-xs text-slate-500">Use Aug26_BAL48853.xlsx or DC_BAL48853.xlsx · Maximum 7 MB per file</p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
          <input ref={folderInput} disabled={!hasCohort} aria-label="Choose assessor workbook folder" type="file" webkitdirectory="" multiple onChange={selectFiles} className="hidden" />
          <button type="button" disabled={!hasCohort} onClick={() => folderInput.current?.click()} className="inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-blue-800 bg-blue-700 px-8 py-4 text-base font-bold text-white shadow-md enabled:hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"><FolderUp size={22} aria-hidden="true" />Choose folder</button>
          <input ref={filesInput} disabled={!hasCohort} aria-label="Choose assessor workbooks" type="file" accept=".xlsx,.xls" multiple onChange={selectFiles} className="hidden" />
          <button type="button" disabled={!hasCohort} onClick={() => filesInput.current?.click()} className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800 enabled:hover:bg-blue-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"><FileSpreadsheet size={17} aria-hidden="true" />Select individual files</button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={replaceExisting} onChange={(event) => setReplaceExisting(event.target.checked)} className="h-4 w-4 accent-blue-700" />Replace existing workbooks</label>
    </fieldset>
    {entries.length > 0 && <>
      <p className="mt-4 text-sm" role="status">{entries.length} files selected · {eligible.length} eligible · {completed} completed{running ? ' · Processing; keep this page open.' : ''}</p>
      <div className="mt-3 max-h-80 overflow-auto"><table className="w-full text-left text-xs">
        <thead><tr className="border-b"><th className="p-2">File</th><th className="p-2">Employee</th><th className="p-2">Participant / cohort</th><th className="p-2">Result</th></tr></thead>
        <tbody>{entries.map((entry) => <tr key={entry.id} className="border-b">
          <td className="p-2 break-all">{entry.file.webkitRelativePath || entry.file.name}</td><td className="p-2">{entry.employeeId || '—'}</td>
          <td className="p-2">{entry.participant ? `${entry.participant.name} / ${entry.participant.cohort}` : '—'}</td>
          <td className={`p-2 ${entry.status === 'done' ? 'text-emerald-700' : entry.status === 'blocked' || entry.status.endsWith('-error') ? 'text-red-700' : 'text-slate-600'}`}>{entry.detail || (entry.participant?.workbook ? replaceExisting ? 'Ready to replace existing workbook' : 'Skipped: workbook exists' : 'Ready to upload')}</td>
        </tr>)}</tbody>
      </table></div>
      <button type="button" disabled={busy || running || !eligible.length} onClick={run} className="mt-4 rounded-lg bg-[#1e5fba] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{running ? 'Processing…' : 'Upload / retry eligible files'}</button>
      <p className="mt-2 text-xs text-slate-500">Unmatched, duplicate, empty, and oversized files are blocked. Maximum 7 MB per file. Report retries reuse the saved workbook.</p>
    </>}
  </section>
}
