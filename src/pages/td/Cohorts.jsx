import { AlertCircle, Check, ChevronRight, Download, FileText, Plus, Search, Send, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { exportCohortNomineeStatus, exportCohortProcessStatus } from '../../lib/trackingExport'

const tabs = [
  { id: 'participants', label: 'Participants' },
  { id: 'employees', label: 'Employee Upload' },
  { id: 'threesixty', label: '360 Progress' },
  { id: 'assessors', label: 'Assessor Excels' },
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
        <h3 className="text-[15px] font-semibold text-[#0f172a]">{title}</h3>
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
    'Create a cohort, download the Employee Details template, fill and upload it. The tool validates every row before creating anything.',
    'Every notification lands in the Email Outbox with the generated magic link for testing and follow-up.',
    'Generate reports only after response data is ready, then release 360 and DC reports separately.',
  ]

  return (
    <div className="mb-5 rounded-xl border border-[#7ba6e0] border-l-4 border-l-[#1e5fba] bg-white px-5 py-4 shadow-[0_2px_16px_rgba(31,41,55,.06)]">
      <div className="flex items-start gap-4">
        <AlertCircle size={18} className="mt-0.5 text-[#1e5fba]" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1e5fba]">Running the 360 end to end</p>
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

function PageHead({ cohort, onExportProcess, onExportNominees }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="mb-2 text-xs text-slate-500">Talent Development / Dashboard</p>
        <h1 className="font-serif text-[30px] font-medium leading-tight text-[#0f172a]">TD Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Run the 360 and DC end to end: create a cohort, track progress, follow up, and release reports.</p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button className="inline-flex items-center gap-2 rounded-lg border border-[#c2ccda] bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:border-[#1e5fba] hover:bg-[#ebf2fa] hover:text-[#1e5fba]">
          <Plus size={14} />
          Create Cohort
        </button>
        <button onClick={onExportProcess} className="inline-flex items-center gap-2 rounded-lg border border-[#c2ccda] bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:border-[#1e5fba] hover:bg-[#ebf2fa] hover:text-[#1e5fba]">
          <Download size={14} />
          Master Tracker
        </button>
        <button onClick={onExportNominees} className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fba] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0e3f87]">
          <Download size={14} />
          Nomination Tracker
        </button>
      </div>
    </div>
  )
}

function ParticipantsTab({ rows, generated }) {
  return (
    <Card>
      <CardHeader
        title={`Participants (${rows.length})`}
        subtitle="Live status across documents, nominations, 360 response collection and report readiness."
        action={<Badge tone="info">Live cohort</Badge>}
      />
      <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
        <table className="w-full border-collapse bg-white text-left text-[13px]">
          <thead className="bg-[#ebf2fa]">
            <tr>
              {['Ticket ID', 'Name', 'BU', 'Details', 'Nominations', 'Pre-Work', 'Photo', '360', 'Report', ''].map((label) => (
                <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((participant) => {
              const complete360 = participant.responses === participant.totalResponses && participant.totalResponses > 0
              const reportTone = generated && participant.reportStatus === 'ready' ? 'success' : participant.reportStatus === 'generated' ? 'success' : participant.reportStatus === 'ready' ? 'warning' : 'neutral'
              return (
                <tr key={participant.id} className="hover:bg-[#f4f7fb]">
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-500">{participant.employeeId}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3">
                    <Link to={`/td/participants/${participant.id}`} className="font-semibold text-[#0f172a] hover:text-[#1e5fba]">{participant.name}</Link>
                    <p className="text-[11px] text-slate-500">{participant.designation}</p>
                  </td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-600">{participant.bu}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={participant.progress > 38 ? 'success' : 'neutral'}>{participant.progress > 38 ? 'Done' : 'Pending'}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={participant.nominees?.length ? 'success' : 'neutral'}>{participant.nominees?.length ? 'Submitted' : 'Not submitted'}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={participant.progress >= 63 ? 'success' : 'neutral'}>{participant.progress >= 63 ? 'Submitted' : 'Pending'}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={participant.progress >= 75 ? 'success' : 'neutral'}>{participant.progress >= 75 ? 'Uploaded' : 'Pending'}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={complete360 ? 'success' : participant.responses ? 'info' : 'neutral'}>{participant.responses}/{participant.totalResponses}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={reportTone}>{generated && participant.reportStatus === 'ready' ? 'Generated' : participant.reportStatus === 'waiting' ? 'Waiting' : participant.reportStatus}</Badge></td>
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
        <strong>This one upload powers everything.</strong> Participant logins are created from it, manager and skip names pre-fill nominations, and BUHR visibility is set up automatically.
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

function ThreeSixtyTab({ rows }) {
  const launched = rows.filter((participant) => participant.nominees?.length)

  return (
    <Card>
      <CardHeader
        title="360 Progress"
        subtitle="Response counts by respondent group. Scores and individual answers are never exposed here."
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
            <tr>{['Ticket ID', 'Participant', 'Status', 'Nominated', 'Responded', 'Pending', 'By group'].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr>
          </thead>
          <tbody>
            {launched.map((participant) => {
              const pending = Math.max(0, participant.totalResponses - participant.responses)
              const groups = ['Self', 'Reporting manager', 'Peer', 'Direct report'].map((group) => {
                const nominees = participant.nominees.filter((nominee) => nominee.relationship === group)
                if (!nominees.length) return null
                const responded = nominees.filter((nominee) => nominee.status === 'responded').length
                return `${group}: ${responded}/${nominees.length}`
              }).filter(Boolean).join(' · ')

              return (
                <tr key={participant.id} className="hover:bg-[#f4f7fb]">
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-500">{participant.employeeId}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 font-semibold">{participant.name}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={pending ? 'info' : 'success'}>{pending ? 'Live' : 'Complete'}</Badge></td>
                  <td className="border-b border-[#d5dce5] px-3 py-3">{participant.totalResponses}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3">{participant.responses}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3">{pending}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-xs text-slate-600">{groups || '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function AssessorTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#7ba6e0] bg-[#ebf2fa] p-4 text-sm text-[#123e77]">
        After 360s close, generate one pre-filled Excel per participant. The filled files come back into the tool for DC report generation.
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Step 1: Generate & Download" subtitle="Enabled once at least one participant's 360 is complete." />
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fba] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e3f87]">
            <Download size={15} />
            Generate Assessor Excels (zip)
          </button>
        </Card>
        <Card>
          <CardHeader title="Step 2: Upload Filled Excels" subtitle="Character limits and DC score ranges are validated on ingestion." />
          <button className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c2ccda] bg-[#f4f7fb] px-5 py-8 text-center hover:border-[#1e5fba] hover:bg-[#ebf2fa]">
            <Upload size={30} className="mb-2 text-slate-500" />
            <span className="font-medium text-[#0f172a]">Drop filled assessor Excels here</span>
          </button>
        </Card>
      </div>
    </div>
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

export default function Cohorts() {
  const [cohorts, setCohorts] = useState([])
  const [cohortId, setCohortId] = useState(null)
  const [allParticipants, setAllParticipants] = useState([])
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('participants')
  const [generated, setGenerated] = useState(false)
  const [loadingCohorts, setLoadingCohorts] = useState(true)
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    api.getCohorts()
      .then((result) => {
        const data = result.data || []
        setCohorts(data)
        if (data.length > 0) setCohortId(data[0].id)
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
        <PageHead
          cohort={cohort}
          onExportProcess={() => exportCohortProcessStatus(cohort, allInCohort)}
          onExportNominees={() => exportCohortNomineeStatus(cohort, allInCohort)}
        />
        <RoleGuide />
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

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active Cohorts" value={cohorts.length} sub={`${cohort.name} selected`} tone="text-[#1e5fba]" />
          <Metric label="Participants" value={allInCohort.length} sub="in current cohort" />
          <Metric label="Nominations In" value={nominationsIn} sub={`${Math.round((nominationsIn / Math.max(1, allInCohort.length)) * 100)}% submitted`} tone="text-[#15803d]" />
          <Metric label="360 Responses" value={`${responses}/${responseTotal}`} sub={`${Math.round((responses / Math.max(1, responseTotal)) * 100)}% received`} tone="text-[#6a4c93]" />
        </div>

        <Card className="mb-5">
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
                <tr>{['Cohort', 'Type', 'DC Dates', 'Participants', 'Status'].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr>
              </thead>
              <tbody>
                {cohorts.map((item) => (
                  <tr key={item.id} className={`cursor-pointer hover:bg-[#f4f7fb] ${item.id === cohortId ? 'bg-[#f8fbff]' : ''}`} onClick={() => setCohortId(item.id)}>
                    <td className="border-b border-[#d5dce5] px-3 py-3 font-semibold">{item.name}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><span className="rounded-full border border-[#d5dce5] bg-[#f1f5fa] px-3 py-1 text-xs text-slate-600">{item.programme}</span></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-600">{item.eventDate}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3">{item.participantCount ?? (item.id === cohortId ? allInCohort.length : 0)}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone="info">Live</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mb-5">
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
          {!loadingParticipants && activeTab === 'participants' && <ParticipantsTab rows={filteredRows} generated={generated} />}
          {activeTab === 'employees' && <EmployeeUploadTab />}
          {activeTab === 'threesixty' && <ThreeSixtyTab rows={allInCohort} />}
          {activeTab === 'assessors' && <AssessorTab />}
          {activeTab === 'reports' && <ReportsTab rows={allInCohort} generated={generated} onGenerate={() => setGenerated(true)} />}
        </div>
      </div>
    </div>
  )
}
