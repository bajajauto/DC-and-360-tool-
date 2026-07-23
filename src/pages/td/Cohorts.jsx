import { AlertCircle, Check, ChevronRight, Download, FileText, Pencil, Plus, Search, Send, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { exportCohortNomineeStatus, exportCohortProcessStatus } from '../../lib/trackingExport'

const tabs = [
  { id: 'participants', label: 'Participants' },
  { id: 'manage', label: 'Manage Participants' },
  { id: 'threesixty', label: '360 Progress' },
  { id: 'assessors', label: 'Assessor Status' },
  { id: 'reports', label: 'Reports' },
]

const badgeClass = {
  success: 'bg-[#e8f5ee] text-[#15803d]',
  info: 'bg-[#ebf2fa] text-[#1e5fba]',
  warning: 'bg-[#fff4df] text-[#a66a10]',
  neutral: 'bg-[#f1f5fa] text-slate-600',
  danger: 'bg-[#fee9e9] text-[#b91c1c]',
}

function Badge({ tone = 'neutral', children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeClass[tone]}`}>{children}</span>
}

function Card({ children, className = '' }) {
  return <section className={`rounded-[14px] border border-[#d5dce5] bg-white p-5 shadow-[0_2px_16px_rgba(31,41,55,.06)] ${className}`}>{children}</section>
}

function CardHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4 border-b border-[#d5dce5] pb-3">
      <div>
        <h3 className="text-lg font-bold text-[#1e5fba]">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

function Metric({ label, value, sub, tone = 'text-[#0f172a]' }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className={`mt-1 text-[26px] font-semibold ${tone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Card>
  )
}

function RoleGuide() {
  const steps = [
    'Create a cohort, download the Employee Details template, fill and upload it.',
    'Participants complete their Role Interview, Pre-Work, photograph and 360 nominations within the configured deadlines.',
    'Launch and track 360 feedback. Respondents receive task-specific magic links, with reminders and delivery status available in the Email Outbox.',
    'Assessors review participant evidence and upload the completed assessor-analysis workbook for each participant.',
    'Generate, review and release the 360 Feedback Report and final Development Centre Report when all required inputs are ready.',
  ]

  return (
    <div className="mb-5 rounded-xl border border-[#7ba6e0] border-l-4 border-l-[#1e5fba] bg-white px-5 py-4 shadow-[0_2px_16px_rgba(31,41,55,.06)]">
      <div className="flex items-start gap-4">
        <AlertCircle size={18} className="mt-0.5 text-[#1e5fba]" />
        <div className="flex-1">
          <p className="text-lg font-bold text-[#1e5fba]">Running the Development Centre process end to end</p>
          <div className="mt-2 space-y-1.5">
            {steps.map((step, index) => (
              <div key={step} className="flex items-start gap-2 text-[13px] leading-5 text-slate-600">
                <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#ebf2fa] text-[10px] font-bold text-[#1e5fba]">{index + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PageHead({ onCreateCohort }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="mb-2 text-xs text-slate-500">Talent Development / Dashboard</p>
        <h1 className="font-serif text-[34px] font-semibold leading-tight text-[#1e4d8c]">TD Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Run the 360 and DC end to end: create a cohort, track progress, follow up, and release reports.</p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button onClick={onCreateCohort} className="inline-flex items-center gap-2 rounded-lg border border-[#c2ccda] bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:border-[#1e5fba] hover:bg-[#ebf2fa] hover:text-[#1e5fba]">
          <Plus size={14} />
          Create Cohort
        </button>
      </div>
    </div>
  )
}

const dcTypeOptions = ['EX to LX', 'LX to MX']

const deadlineFieldDefs = [
  { key: 'roleInterviewDeadline', label: 'Role Interview Deadline' },
  { key: 'photoDeadline', label: 'Photograph Deadline' },
  { key: 'preWorkDeadline', label: 'Pre-Work Deadline' },
  { key: 'nominationDeadline', label: 'Nomination Deadline' },
  { key: 'threeSixtyCutoff', label: '360 Cutoff' },
]

function toDateInputValue(isoString) {
  return isoString ? isoString.slice(0, 10) : ''
}

function emptyCohortForm() {
  return {
    name: '',
    programme: dcTypeOptions[0],
    eventStart: '',
    eventEnd: '',
    roleInterviewDeadline: '',
    photoDeadline: '',
    preWorkDeadline: '',
    nominationDeadline: '',
    threeSixtyCutoff: '',
  }
}

function cohortToForm(cohort) {
  return {
    name: cohort.name || '',
    programme: cohort.programme || dcTypeOptions[0],
    eventStart: toDateInputValue(cohort.eventStart),
    eventEnd: toDateInputValue(cohort.eventEnd),
    roleInterviewDeadline: toDateInputValue(cohort.roleInterviewDeadline),
    photoDeadline: toDateInputValue(cohort.photoDeadline),
    preWorkDeadline: toDateInputValue(cohort.preWorkDeadline),
    nominationDeadline: toDateInputValue(cohort.nominationDeadline),
    threeSixtyCutoff: toDateInputValue(cohort.threeSixtyCutoff),
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function CohortFormModal({ mode, initialCohort, onClose, onSubmit }) {
  const [form, setForm] = useState(() => (initialCohort ? cohortToForm(initialCohort) : emptyCohortForm()))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [importRows, setImportRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [validation, setValidation] = useState(null)

  async function handleWorkbook(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setValidation(null)
    setImportRows([])
    setFileName('')

    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const values = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
      const headers = (values[0] || []).map((value, index) => String(value).trim() || `Column ${index + 1}`)
      if (headers.length < 28 || headers[1].toLowerCase() !== 'emp name' || !headers[2].toLowerCase().includes('ticket')) {
        throw new Error('This file does not match the 28-column master data template.')
      }

      const text = (value) => String(value ?? '').trim()
      const required = [1, 2, 4, 13, 15, 25, 26, 27]
      const emailColumns = [15, 18, 21, 24, 27]
      // Some approved templates include a Field Type row below the headers and
      // others begin employee data immediately. Detect the first real employee
      // row from Ticket ID + participant email instead of always skipping row 2.
      const firstCandidateIsEmployee = text(values[1]?.[2]) && EMAIL_RE.test(text(values[1]?.[15]))
      const dataRows = values.slice(firstCandidateIsEmployee ? 1 : 2).filter((row) => row.some((value) => text(value)))

      if (!dataRows.length) throw new Error('The workbook contains no participant rows. Add data below the Field Type row.')

      const rowErrors = []
      const candidateRows = []
      const seenIds = new Map()
      const seenEmails = new Map()

      dataRows.forEach((row, index) => {
        const rowNumber = index + (firstCandidateIsEmployee ? 2 : 3)
        const missing = required.filter((column) => !text(row[column]))
        missing.forEach((column) => rowErrors.push({ row: rowNumber, ticket: text(row[2]) || '-', field: headers[column], issue: 'Missing (mandatory)' }))

        emailColumns.forEach((column) => {
          const value = text(row[column])
          if (value && !EMAIL_RE.test(value)) rowErrors.push({ row: rowNumber, ticket: text(row[2]) || '-', field: headers[column], issue: `Not a valid email: ${value}` })
        })

        const employeeId = text(row[2]).toLowerCase()
        const email = text(row[15]).toLowerCase()
        if (employeeId) {
          if (seenIds.has(employeeId)) rowErrors.push({ row: rowNumber, ticket: text(row[2]), field: 'Ticket ID', issue: `Duplicate Ticket ID (also row ${seenIds.get(employeeId)})` })
          else seenIds.set(employeeId, rowNumber)
        }
        if (email) {
          if (seenEmails.has(email)) rowErrors.push({ row: rowNumber, ticket: text(row[2]), field: 'Email', issue: `Duplicate email (also row ${seenEmails.get(email)})` })
          else seenEmails.set(email, rowNumber)
        }

        const rowHasErrors = missing.length > 0 || rowErrors.some((err) => err.row === rowNumber && err.issue.startsWith('Not a valid email'))
        if (rowHasErrors) return

        const masterData = Object.fromEntries(headers.map((header, column) => [`${header}_${column + 1}`, text(row[column])]))
        Object.assign(masterData, {
          reportingManagerName: text(row[16]), reportingManagerEmail: text(row[18]),
          skipManagerName: text(row[19]), skipManagerEmail: text(row[21]),
          buHeadName: text(row[22]), buHeadEmail: text(row[24]),
          buhrName: text(row[25]), buhrEmail: text(row[27]),
          jobLevel: text(row[5]), positionLevel: text(row[6]), department: text(row[12]), location: text(row[14]),
        })
        candidateRows.push({
          rowNumber,
          name: text(row[1]), employeeId: text(row[2]), email: text(row[15]), designation: text(row[4]), businessUnit: text(row[13]),
          reportingManager: { name: text(row[16]), employeeId: text(row[17]), email: text(row[18]) },
          skipManager: { name: text(row[19]), employeeId: text(row[20]), email: text(row[21]) },
          buHead: { name: text(row[22]), employeeId: text(row[23]), email: text(row[24]) },
          buhr: { name: text(row[25]), employeeId: text(row[26]), email: text(row[27]) },
          masterData,
        })
      })

      const erroredRowNumbers = new Set(rowErrors.map((err) => err.row))
      const validRows = candidateRows.filter((row) => !erroredRowNumbers.has(row.rowNumber))

      setValidation({
        total: dataRows.length,
        validCount: validRows.length,
        errorRowCount: erroredRowNumbers.size,
        errors: rowErrors.sort((a, b) => a.row - b.row),
      })
      setImportRows(validRows)
      setFileName(file.name)
    } catch (err) {
      setImportRows([])
      setFileName('')
      setValidation(null)
      setError(err.message || 'Unable to read the workbook.')
    }
  }

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('Cohort name is required')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      for (const key of Object.keys(payload)) {
        if (payload[key] === '') payload[key] = null
      }
      if (mode === 'create' && importRows.length) payload.participants = importRows
      await onSubmit(payload)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold text-[#0f172a]">{mode === 'edit' ? 'Edit Cohort' : 'Create Cohort'}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cohort Name</label>
            <input
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="e.g. EX to LX Cohort '26"
              className="w-full rounded-lg border border-[#c2ccda] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6e4f7]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">DC Type</label>
            <select
              value={form.programme}
              onChange={(event) => update('programme', event.target.value)}
              className="w-full rounded-lg border border-[#c2ccda] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6e4f7]"
            >
              {dcTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">DC Event Start</label>
              <input type="date" value={form.eventStart} onChange={(event) => update('eventStart', event.target.value)} className="w-full rounded-lg border border-[#c2ccda] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6e4f7]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">DC Event End</label>
              <input type="date" value={form.eventEnd} onChange={(event) => update('eventEnd', event.target.value)} className="w-full rounded-lg border border-[#c2ccda] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6e4f7]" />
            </div>
          </div>

          <div className="border-t border-[#e2e8f0] pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Stage Deadlines</p>
            <div className="grid grid-cols-2 gap-3">
              {deadlineFieldDefs.map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs text-slate-500">{field.label}</label>
                  <input
                    type="date"
                    value={form[field.key]}
                    onChange={(event) => update(field.key, event.target.value)}
                    className="w-full rounded-lg border border-[#c2ccda] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6e4f7]"
                  />
                </div>
              ))}
            </div>
          </div>

          {mode === 'create' && (
            <div className="border-t border-[#e2e8f0] pt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Participant master sheet</label>
              <p className="mb-3 text-xs leading-5 text-slate-500">Upload the completed 28-column Excel template. Participant accounts and BUHR access will be created with the cohort. Participants will enter all 360 nominees themselves.</p>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#c2ccda] bg-[#f8fafc] px-4 py-5 text-sm font-medium text-slate-600 hover:border-[#1e5fba] hover:bg-[#ebf2fa]">
                <Upload size={18} />
                {fileName || 'Choose master data workbook'}
                <input type="file" accept=".xlsx,.xls" onChange={handleWorkbook} className="sr-only" />
              </label>
              {validation && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-[#f1f5fa] px-3 py-2 text-center">
                      <p className="text-lg font-semibold text-slate-700">{validation.total}</p>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">Rows in file</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center">
                      <p className="text-lg font-semibold text-emerald-700">{validation.validCount}</p>
                      <p className="text-[10px] uppercase tracking-wide text-emerald-700">Valid rows</p>
                    </div>
                    <div className={`rounded-lg px-3 py-2 text-center ${validation.errorRowCount ? 'bg-red-50' : 'bg-[#f1f5fa]'}`}>
                      <p className={`text-lg font-semibold ${validation.errorRowCount ? 'text-red-700' : 'text-slate-700'}`}>{validation.errorRowCount}</p>
                      <p className={`text-[10px] uppercase tracking-wide ${validation.errorRowCount ? 'text-red-700' : 'text-slate-500'}`}>Rows with errors</p>
                    </div>
                  </div>
                  {validation.errors.length > 0 && (
                    <div className="max-h-48 overflow-auto rounded-lg border border-[#e2e8f0]">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead className="sticky top-0 bg-[#f8fafc]">
                          <tr>
                            {['Row', 'Ticket ID', 'Field', 'Issue'].map((label) => <th key={label} className="border-b border-[#e2e8f0] px-2 py-1.5 font-semibold text-slate-500">{label}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {validation.errors.map((err, index) => (
                            <tr key={`${err.row}-${err.field}-${index}`}>
                              <td className="border-b border-[#f1f5f9] px-2 py-1.5">{err.row}</td>
                              <td className="border-b border-[#f1f5f9] px-2 py-1.5 text-slate-500">{err.ticket}</td>
                              <td className="border-b border-[#f1f5f9] px-2 py-1.5 font-medium">{err.field}</td>
                              <td className="border-b border-[#f1f5f9] px-2 py-1.5 text-slate-600">{err.issue}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    Nothing is created until you submit. {validation.errorRowCount > 0 ? `Fix the rows above and re-upload, or continue to import the ${validation.validCount} valid row${validation.validCount === 1 ? '' : 's'} only.` : 'All rows passed validation.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-[#c2ccda] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-[#1e5fba] px-4 py-2 text-sm font-medium text-white hover:bg-[#0e3f87] disabled:opacity-60">
              {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Cohort'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ParticipantsTab({ rows, generated, onManage }) {
  return (
    <Card>
      <CardHeader
        title={`Participants (${rows.length})`}
        subtitle="Live status across documents, nominations, 360 response collection and report readiness."
        action={<div className="flex items-center gap-2"><Badge tone="info">Live cohort</Badge><button onClick={onManage} className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fba] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0e3f87]"><Plus size={14}/>Manage Participants</button></div>}
      />
      <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
        <table className="w-full border-collapse bg-white text-left text-[13px]">
          <thead className="bg-[#ebf2fa]">
            <tr>
              {['Ticket ID', 'Name', 'BU', 'Nominations', 'Pre-Work', 'Photo', '360 Responses', '360 Report Status', 'DC Report Status', ''].map((label) => (
                <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((participant) => {
              const complete360 = participant.responses === participant.totalResponses && participant.totalResponses > 0
              const reportTone = ['generated', 'released'].includes(participant.reportStatus) ? 'success' : participant.reportStatus === 'ready' ? 'info' : 'warning'
              const reportLabel = participant.reportStatus === 'released' ? 'Released' : participant.reportStatus === 'generated' ? 'Generated' : participant.reportStatus === 'ready' ? 'Ready' : 'Waiting'
              const dcReportGenerated = generated && participant.reportStatus === 'ready'
              return (
                <tr key={participant.id} className="hover:bg-[#f4f7fb]">
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-500">{participant.employeeId}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3">
                    <Link to={`/td/participants/${participant.id}`} className="font-semibold text-[#0f172a] hover:text-[#1e5fba]">{participant.name}</Link>
                    <p className="text-[11px] text-slate-500">{participant.designation}</p>
                  </td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-600">{participant.bu}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={participant.nominees?.length ? 'success' : 'warning'}>{participant.nominees?.length ? 'Submitted' : 'Not submitted'}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={participant.progress >= 63 ? 'success' : 'warning'}>{participant.progress >= 63 ? 'Submitted' : 'Pending'}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={participant.progress >= 75 ? 'success' : 'warning'}>{participant.progress >= 75 ? 'Uploaded' : 'Pending'}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={complete360 ? 'success' : participant.responses ? 'info' : 'neutral'}>{participant.responses}/{participant.totalResponses}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={reportTone}>{reportLabel}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={dcReportGenerated ? 'success' : 'warning'}>{dcReportGenerated ? 'Generated' : 'Not generated'}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-right">
                    <Link to={`/td/participants/${participant.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-[#ebf2fa] hover:text-[#1e5fba]" aria-label={`Open ${participant.name}`}>
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function EmployeeUploadTab() {
  const rules = [
    'All columns mandatory except Phone. Ticket ID must be unique within the file and against existing participants.',
    'All employee, manager, skip and BUHR email columns must contain valid email addresses.',
    'Date of Birth must be DD-MM-YYYY and a real calendar date. Gender must be F or M.',
    'Nothing is created until TD confirms the validation summary.',
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#7ba6e0] bg-[#ebf2fa] p-4 text-sm text-[#123e77]">
        <strong>This one upload powers cohort setup.</strong> Participant logins and BUHR visibility are created from it. Participants enter the name and email address for every 360 nominee themselves.
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Step 1: Download Template" subtitle="One row per participant with the full employee master columns." />
          <p className="mb-4 text-sm leading-6 text-slate-600">Columns include Ticket ID, Name, Email, Sector, BU, Function, BUHR, Manager, Skip / BU Head, Date of Birth, Gender and Phone.</p>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fba] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e3f87]">
            <Download size={15} />
            Download Employee Details Template
          </button>
        </Card>
        <Card>
          <CardHeader title="Step 2: Upload Filled File" subtitle="Excel or CSV. Rows are validated before account creation." />
          <button className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c2ccda] bg-[#f4f7fb] px-5 py-8 text-center hover:border-[#1e5fba] hover:bg-[#ebf2fa]">
            <Upload size={30} className="mb-2 text-slate-500" />
            <span className="font-medium text-[#0f172a]">Drop the filled file here or click to upload</span>
            <span className="mt-1 text-xs text-slate-500">Excel (.xlsx) or CSV</span>
          </button>
        </Card>
      </div>
      <Card>
        <CardHeader title="Validation rules applied to every row" />
        <div className="grid gap-3 md:grid-cols-2">
          {rules.map((rule, index) => (
            <div key={rule} className="flex gap-3 rounded-xl bg-[#f4f7fb] p-3 text-sm text-slate-600">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ebf2fa] text-xs font-bold text-[#1e5fba]">{index + 1}</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ManageParticipantsTab({ cohort, rows, onAdded, onDeleted }) {
  const emptyRow = () => ({ name: '', employeeId: '', email: '', designation: '', businessUnit: '' })
  const [forms, setForms] = useState([emptyRow()])
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [message, setMessage] = useState('')
  const complete = forms.length > 0 && forms.every((form) => Object.values(form).every((value) => value.trim()))

  function update(index, field, value) {
    setForms((current) => current.map((form, formIndex) => formIndex === index ? { ...form, [field]: value } : form))
  }

  async function addParticipants() {
    if (!complete) return
    setSaving(true)
    setMessage('')
    try {
      const added = []
      for (const form of forms) {
        const { data } = await api.addCohortParticipant(cohort.id, form)
        added.push(data)
        onAdded(data)
      }
      setForms([emptyRow()])
      setMessage(`${added.length} participant${added.length === 1 ? '' : 's'} added to ${cohort.name}.`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function removeParticipant(participant) {
    const confirmed = window.confirm(`Permanently remove ${participant.name} from ${cohort.name}? Their submissions, nominations, feedback tasks and reports for this cohort will also be deleted.`)
    if (!confirmed) return
    setDeletingId(participant.id)
    setMessage('')
    try {
      await api.deleteCohortParticipant(cohort.id, participant.id)
      onDeleted(participant.id)
      setMessage(`${participant.name} was removed from ${cohort.name}.`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setDeletingId(null)
    }
  }

  return <div className="space-y-5">{message && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}<Card><CardHeader title="Add Participants" subtitle="Add one or several participant accounts directly to this cohort."/><div className="space-y-3">{forms.map((form, index) => <div key={index} className="rounded-xl border border-[#d5dce5] bg-[#f8fbff] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-[#1e5fba]">Participant {index + 1}</p>{forms.length > 1 && <button onClick={() => setForms((current) => current.filter((_, formIndex) => formIndex !== index))} className="text-xs font-semibold text-red-500">Remove row</button>}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><input value={form.name} onChange={(event) => update(index, 'name', event.target.value)} placeholder="Full name" className="rounded-lg border border-[#c2ccda] px-3 py-2.5 text-sm"/><input value={form.employeeId} onChange={(event) => update(index, 'employeeId', event.target.value)} placeholder="Ticket ID" className="rounded-lg border border-[#c2ccda] px-3 py-2.5 text-sm"/><input type="email" value={form.email} onChange={(event) => update(index, 'email', event.target.value)} placeholder="Email address" className="rounded-lg border border-[#c2ccda] px-3 py-2.5 text-sm"/><input value={form.designation} onChange={(event) => update(index, 'designation', event.target.value)} placeholder="Designation" className="rounded-lg border border-[#c2ccda] px-3 py-2.5 text-sm"/><input value={form.businessUnit} onChange={(event) => update(index, 'businessUnit', event.target.value)} placeholder="Business unit" className="rounded-lg border border-[#c2ccda] px-3 py-2.5 text-sm"/></div></div>)}</div><div className="mt-4 flex flex-wrap justify-between gap-3"><button onClick={() => setForms((current) => [...current, emptyRow()])} className="inline-flex items-center gap-2 rounded-lg border border-[#1e5fba] px-4 py-2.5 text-sm font-semibold text-[#1e5fba] hover:bg-blue-50"><Plus size={15}/>Add Another</button><button onClick={addParticipants} disabled={!complete || saving} className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fba] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Plus size={15}/>{saving ? 'Adding…' : `Add ${forms.length} Participant${forms.length === 1 ? '' : 's'}`}</button></div></Card><Card><CardHeader title={`Participants (${rows.length})`} subtitle="Removing a participant permanently deletes their cohort work and access."/><div className="overflow-hidden rounded-xl border border-[#d5dce5]"><table className="w-full text-left text-sm"><thead className="bg-[#ebf2fa]"><tr>{['Ticket ID', 'Participant', 'Email', 'Business Unit', ''].map((label) => <th key={label} className="border-b px-3 py-2.5 text-[11px] font-bold uppercase text-slate-600">{label}</th>)}</tr></thead><tbody>{rows.map((participant) => <tr key={participant.id}><td className="border-b px-3 py-3 text-slate-500">{participant.employeeId}</td><td className="border-b px-3 py-3"><p className="font-semibold">{participant.name}</p><p className="text-xs text-slate-500">{participant.designation}</p></td><td className="border-b px-3 py-3 text-slate-600">{participant.email}</td><td className="border-b px-3 py-3 text-slate-600">{participant.bu}</td><td className="border-b px-3 py-3 text-right"><button onClick={() => removeParticipant(participant)} disabled={deletingId === participant.id} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 size={13}/>{deletingId === participant.id ? 'Removing…' : 'Remove'}</button></td></tr>)}</tbody></table></div></Card></div>
}

function ThreeSixtyTab({ rows }) {
  const launched = rows.filter((participant) => participant.nominees?.length)

  return (
    <Card>
      <CardHeader
        title="360 Progress"
        subtitle="Overall response counts. Scores and individual answers are never exposed here."
        action={(
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-[#c2ccda] px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-[#ebf2fa]"><Download size={13} />Response Tracker</button>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e5fba] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0e3f87]"><Send size={13} />Send Reminders</button>
          </div>
        )}
      />
      <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
        <table className="w-full border-collapse bg-white text-left text-[13px]">
          <thead className="bg-[#ebf2fa]">
            <tr>{['Ticket ID', 'Participant', 'Status', 'Nominated', 'Responded', 'Pending'].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr>
          </thead>
          <tbody>
            {launched.map((participant) => {
              const pending = Math.max(0, participant.totalResponses - participant.responses)
              return (
                <tr key={participant.id} className="hover:bg-[#f4f7fb]">
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-500">{participant.employeeId}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 font-semibold">{participant.name}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={pending ? 'info' : 'success'}>{pending ? 'Live' : 'Complete'}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3">{participant.totalResponses}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3">{participant.responses}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3">{pending}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function AssessorTab({ rows }) {
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAssessorAnalysis()
      .then((result) => setStatuses(result.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const statusByParticipant = new Map(statuses.map((status) => [status.participantId, status]))

  return (
    <Card>
      <CardHeader title="Assessor Status" subtitle="Track assessor analysis completion for each participant in this cohort." />
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
        <table className="w-full border-collapse bg-white text-left text-[13px]">
          <thead className="bg-[#ebf2fa]">
            <tr>{['Ticket ID', 'Participant', 'Business Unit', 'Status', 'Last Updated'].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading assessor statuses...</td></tr>}
            {!loading && rows.map((participant) => {
              const status = statusByParticipant.get(participant.id)
              const completed = Boolean(status?.workbook)
              return (
                <tr key={participant.id} className="hover:bg-[#f4f7fb]">
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-500">{participant.employeeId}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 font-semibold">{participant.name}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-600">{participant.bu}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={completed ? 'success' : 'warning'}>{completed ? 'Completed' : 'Pending'}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-500">{completed ? new Date(status.workbook.uploadedAt).toLocaleString('en-GB') : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ReportsTab({ rows, generated, onGenerate }) {
  return (
    <Card>
      <CardHeader title="Report Status" subtitle="Generate, review and release 360 and DC reports separately." action={<button onClick={onGenerate} className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fba] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0e3f87]"><FileText size={14} />Generate ready reports</button>} />
      <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
        <table className="w-full border-collapse bg-white text-left text-[13px]">
          <thead className="bg-[#ebf2fa]">
            <tr>{['Ticket ID', 'Participant', '360 Report', '360 Visible', 'DC Report', 'DC Visible'].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((participant) => {
              const isGenerated = participant.reportStatus === 'generated' || (generated && participant.reportStatus === 'ready')
              return (
                <tr key={participant.id} className="hover:bg-[#f4f7fb]">
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-500">{participant.employeeId}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 font-semibold">{participant.name}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3">{isGenerated ? <Badge tone="success">Generated</Badge> : <Badge>Not generated</Badge>}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><span className={`inline-flex h-5 w-10 items-center rounded-full p-0.5 ${isGenerated ? 'bg-[#15803d]' : 'bg-slate-300'}`}><span className={`h-4 w-4 rounded-full bg-white transition-transform ${isGenerated ? 'translate-x-5' : ''}`} /></span></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge>Not generated</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><span className="inline-flex h-5 w-10 items-center rounded-full bg-slate-300 p-0.5"><span className="h-4 w-4 rounded-full bg-white" /></span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default function Cohorts({ view = 'dashboard' }) {
  const isCurrentView = view === 'current'
  const [cohorts, setCohorts] = useState([])
  const [cohortId, setCohortId] = useState(null)
  const [allParticipants, setAllParticipants] = useState([])
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('participants')
  const [generated, setGenerated] = useState(false)
  const [loadingCohorts, setLoadingCohorts] = useState(true)
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [error, setError] = useState('')
  const [modalState, setModalState] = useState(null) // { mode: 'create' | 'edit', cohort? }

  function refreshCohorts() {
    return api.getCohorts().then((result) => {
      const data = result.data || []
      setCohorts(data)
      return data
    })
  }

  async function handleCohortSubmit(payload) {
    if (modalState.mode === 'edit') {
      await api.updateCohort(modalState.cohort.id, payload)
      await refreshCohorts()
    } else {
      const result = await api.createCohort(payload)
      await refreshCohorts()
      if (result?.data?.id) setCohortId(result.data.id)
    }
    setModalState(null)
  }

  useEffect(() => {
    setError('')
    api.getCohorts()
      .then((result) => {
        const data = result.data || []
        setCohorts(data)
        if (data.length > 0) setCohortId(data.at(-1).id)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingCohorts(false))
  }, [])

  useEffect(() => {
    if (!cohortId) return
    setLoadingParticipants(true)
    setError('')
    api.getCohortParticipants(cohortId)
      .then((result) => setAllParticipants(result.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingParticipants(false))
  }, [cohortId])

  const cohort = cohorts.find((item) => item.id === cohortId) || cohorts[0]
  const allInCohort = allParticipants
  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return allInCohort
    return allInCohort.filter((participant) => `${participant.name} ${participant.employeeId} ${participant.bu} ${participant.designation}`.toLowerCase().includes(normalized))
  }, [allInCohort, query])

  const nominationsIn = allInCohort.filter((participant) => participant.totalResponses > 0).length
  const released = allInCohort.filter((participant) => participant.reportStatus === 'generated').length
  const responses = allInCohort.reduce((sum, participant) => sum + participant.responses, 0)
  const responseTotal = allInCohort.reduce((sum, participant) => sum + participant.totalResponses, 0)
  const ready = allInCohort.filter((participant) => participant.reportStatus === 'ready').length

  if (loadingCohorts) {
    return (
      <div className="px-9 py-8">
        <div className="animate-pulse space-y-4 max-w-[1440px] mx-auto">
          <div className="h-10 bg-gray-100 rounded w-64" />
          <div className="h-48 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1440px]">
        {!isCurrentView && <PageHead
          onCreateCohort={() => setModalState({ mode: 'create' })}
        />}
        {isCurrentView && cohort && (
          <div className="mb-5 flex flex-col gap-4 border-b border-[#d5dce5] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-xs text-slate-500">Talent Development / Current Cohort</p>
              <div className="flex flex-wrap items-center gap-3"><h1 className="font-serif text-[34px] font-semibold leading-tight text-[#1e4d8c]">{cohort.name}</h1><Badge tone="info">Live cohort</Badge></div>
              <p className="mt-1 text-sm text-slate-600">{cohort.programme} · {cohort.eventDate} · {allInCohort.length} participant{allInCohort.length === 1 ? '' : 's'}</p>
            </div>
            <select value={cohortId} onChange={(event) => setCohortId(event.target.value)} className="min-w-80 rounded-lg border border-[#c2ccda] bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
              {cohorts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.eventDate}</option>)}
            </select>
          </div>
        )}
        {modalState && (
          <CohortFormModal
            mode={modalState.mode}
            initialCohort={modalState.cohort}
            onClose={() => setModalState(null)}
            onSubmit={handleCohortSubmit}
          />
        )}
        {!isCurrentView && <RoleGuide />}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {generated && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#bfdcc8] bg-[#e8f5ee] px-4 py-3 text-sm text-[#155e2e]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#15803d] text-white"><Check size={14} /></span>
            <span><strong>{ready} reports prepared.</strong> They are now available for TD review before release.</span>
          </div>
        )}

        {!isCurrentView && <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active Cohorts" value={cohorts.length} sub={`${cohort.name} selected`} tone="text-[#1e5fba]" />
          <Metric label="Participants" value={allInCohort.length} sub="in current cohort" />
          <Metric label="Nominations In" value={nominationsIn} sub={`${Math.round((nominationsIn / Math.max(1, allInCohort.length)) * 100)}% submitted`} tone="text-[#15803d]" />
          <Metric label="360 Responses" value={`${responses}/${responseTotal}`} sub={`${Math.round((responses / Math.max(1, responseTotal)) * 100)}% received`} tone="text-[#6a4c93]" />
        </div>}

        {!isCurrentView && cohort && (
          <Card className="mb-5">
            <CardHeader
              title="Current Cohort"
              subtitle={`${cohort.name} · ${cohort.programme} · ${cohort.eventDate}`}
              action={<Badge tone="info">Live cohort</Badge>}
            />
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">{allInCohort.length} participant{allInCohort.length === 1 ? '' : 's'}</p>
                <p className="mt-1 text-xs text-slate-500">Open the cohort workspace or download its two operational trackers.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => exportCohortProcessStatus(cohort, allInCohort)} className="inline-flex items-center gap-2 rounded-lg border border-[#c2ccda] bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:border-[#1e5fba] hover:bg-[#ebf2fa] hover:text-[#1e5fba]"><Download size={14} />Cohort Master Tracker</button>
                <button onClick={() => exportCohortNomineeStatus(cohort, allInCohort)} className="inline-flex items-center gap-2 rounded-lg border border-[#c2ccda] bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:border-[#1e5fba] hover:bg-[#ebf2fa] hover:text-[#1e5fba]"><Download size={14} />360 Response Tracker</button>
                <Link to="/td/cohorts" className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fba] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0e3f87]">Open Current Cohort <ChevronRight size={14} /></Link>
              </div>
            </div>
          </Card>
        )}

        {!isCurrentView && <Card className="mb-5">
          <CardHeader
            title="Your Cohorts"
            subtitle="Each cohort is one DC batch with its own participants, timeline and reports."
            action={(
              <div className="flex items-center gap-2">
                <select value={cohortId} onChange={(event) => setCohortId(event.target.value)} className="rounded-lg border border-[#c2ccda] bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#d6e4f7]">
                  {cohorts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
            )}
          />
          <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
            <table className="w-full border-collapse bg-white text-left text-[13px]">
              <thead className="bg-[#ebf2fa]">
                <tr>{['Cohort', 'Type', 'DC Dates', 'Participants', 'Status', ''].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr>
              </thead>
              <tbody>
                {cohorts.map((item) => (
                  <tr key={item.id} className={`cursor-pointer hover:bg-[#f4f7fb] ${item.id === cohortId ? 'bg-[#f8fbff]' : ''}`} onClick={() => setCohortId(item.id)}>
                    <td className="border-b border-[#d5dce5] px-3 py-3 font-semibold">{item.name}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><span className="rounded-full border border-[#d5dce5] bg-[#f1f5fa] px-3 py-1 text-xs text-slate-600">{item.programme}</span></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-600">{item.eventDate}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3">{item.participantCount ?? (item.id === cohortId ? allInCohort.length : 0)}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone="info">Live</Badge></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-right">
                      <button
                        onClick={(event) => { event.stopPropagation(); setModalState({ mode: 'edit', cohort: item }) }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-[#ebf2fa] hover:text-[#1e5fba]"
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>}

        {isCurrentView && <div className="mb-5">
          <div className="mb-4 flex flex-col gap-3 border-b border-[#d5dce5] md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-4 py-3 text-[13px] font-semibold transition-colors ${activeTab === tab.id ? 'border-[#1e5fba] text-[#1e5fba]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === 'participants' && (
              <div className="relative mb-3 md:mb-2">
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search participants" className="w-full rounded-lg border border-[#c2ccda] bg-white py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#d6e4f7] md:w-64" />
              </div>
            )}
          </div>

          {loadingParticipants && <Card><p className="text-sm text-slate-500">Loading participants...</p></Card>}
          {!loadingParticipants && activeTab === 'participants' && <ParticipantsTab rows={filteredRows} generated={generated} onManage={() => setActiveTab('manage')} />}
          {activeTab === 'manage' && <ManageParticipantsTab cohort={cohort} rows={allInCohort} onAdded={(participant) => { setAllParticipants((current) => [...current, participant].sort((a, b) => a.name.localeCompare(b.name))); setCohorts((current) => current.map((item) => item.id === cohort.id ? { ...item, participantCount: (item.participantCount || 0) + 1 } : item)) }} onDeleted={(participantId) => { setAllParticipants((current) => current.filter((participant) => participant.id !== participantId)); setCohorts((current) => current.map((item) => item.id === cohort.id ? { ...item, participantCount: Math.max(0, (item.participantCount || 0) - 1) } : item)) }} />}
          {activeTab === 'threesixty' && <ThreeSixtyTab rows={allInCohort} />}
          {activeTab === 'assessors' && <AssessorTab rows={allInCohort} />}
          {activeTab === 'reports' && <ReportsTab rows={allInCohort} generated={generated} onGenerate={() => setGenerated(true)} />}
        </div>}
      </div>
    </div>
  )
}
