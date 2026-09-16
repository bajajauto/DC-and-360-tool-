import { useMemo, useState } from 'react'
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
  const [cohort, setCohort] = useState('all')
  const [entries, setEntries] = useState([])
  const [running, setRunning] = useState(false)
  const [replaceExisting, setReplaceExisting] = useState(false)
  const cohorts = useMemo(() => [...new Set(rows.map((row) => row.cohort))].sort(), [rows])
  const eligible = entries.filter((entry) => actionable.has(entry.status) && (entry.status === 'report-error' || !entry.participant.workbook || replaceExisting))
  const completed = entries.filter((entry) => entry.status === 'done').length

  function selectFiles(event) {
    setEntries(matchAssessorFiles(event.target.files, rows.filter((row) => cohort === 'all' || row.cohort === cohort)))
    event.target.value = ''
  }

  async function run() {
    if (busy || running || !eligible.length) return
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

  return <section className="mt-5 rounded-2xl border border-[#d5dce5] bg-white p-6">
    <h2 className="text-lg font-semibold">Bulk assessor upload</h2>
    <p className="mt-1 text-sm text-slate-600">Choose a folder or multiple Excel files. Names such as Aug26_BAL48853.xlsx and DC_BAL48853.xlsx automatically match employee BAL48853. The prefix does not select a cohort.</p>
    <fieldset disabled={busy || running || loading} className="mt-4 flex flex-wrap items-end gap-4 disabled:opacity-50">
      <label className="text-sm">Match within cohort<select value={cohort} onChange={(event) => { setCohort(event.target.value); setEntries([]) }} className="mt-1 block rounded-lg border px-3 py-2"><option value="all">All cohorts</option>{cohorts.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      <label className="text-sm">Choose folder<input aria-label="Choose assessor workbook folder" type="file" webkitdirectory="" multiple onChange={selectFiles} className="mt-1 block max-w-xs text-xs" /></label>
      <label className="text-sm">Choose files<input aria-label="Choose assessor workbooks" type="file" accept=".xlsx,.xls" multiple onChange={selectFiles} className="mt-1 block max-w-xs text-xs" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={replaceExisting} onChange={(event) => setReplaceExisting(event.target.checked)} />Replace existing workbooks</label>
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
