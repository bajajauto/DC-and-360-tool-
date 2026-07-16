import { useEffect, useState } from 'react'
import {
  Bell,
  Clock,
  Download,
  Eye,
  FileText,
  Mail,
  Search,
  Send,
  Shield,
  Users,
} from 'lucide-react'
import { cohorts, competencyScores, participants } from '../../data/adminData'
import { exportCohortNomineeStatus, exportCohortProcessStatus } from '../../lib/trackingExport'
import { api } from '../../lib/api'

function Page({ eyebrow, title, subtitle, action, children }) {
  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs text-slate-500">{eyebrow}</p>
            <h1 className="font-serif text-[30px] font-medium leading-tight text-[#0f172a]">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">{subtitle}</p>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
  )
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

function Badge({ children, tone = 'neutral' }) {
  const styles = {
    success: 'bg-[#e8f5ee] text-[#15803d]',
    info: 'bg-[#ebf2fa] text-[#1e5fba]',
    warning: 'bg-[#fff4df] text-[#a66a10]',
    danger: 'bg-[#fee9e9] text-[#b91c1c]',
    neutral: 'bg-[#f1f5fa] text-slate-600',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles[tone]}`}>{children}</span>
}

function ActionButton({ children, onClick, primary = false }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold ${
        primary
          ? 'bg-[#1e5fba] text-white hover:bg-[#0e3f87]'
          : 'border border-[#c2ccda] bg-white text-slate-700 hover:border-[#1e5fba] hover:bg-[#ebf2fa] hover:text-[#1e5fba]'
      }`}
    >
      {children}
    </button>
  )
}

const cohort = cohorts[0]
const activeParticipants = participants.filter((participant) => participant.cohortId === cohort.id)

const exportCards = [
  {
    id: 'pending',
    icon: Clock,
    title: 'Pending Actions Follow-up',
    desc: 'One row per pending item per participant, with contact details, so TD can chase directly.',
    cols: 'Ticket ID, Name, Email, BU, Manager, Pending Item, Deadline',
    best: 'Weekly follow-up nudges before deadlines',
  },
  {
    id: 'master',
    icon: FileText,
    title: 'Cohort Master Tracker',
    desc: 'One row per participant with status across every stage.',
    cols: 'Ticket ID, Name, BU, Details, Nominations, Pre-Work, Photo, 360 %, OB Sheet, Reports',
    best: 'Weekly cohort health checks',
  },
  {
    id: 'threesixty',
    icon: Users,
    title: '360 Response Tracker',
    desc: 'Response counts by respondent group per participant. No content, only counts.',
    cols: 'Ticket ID, Participant, Respondent Group, Nominated, Responded, Pending',
    best: 'Deciding where reminders are needed',
  },
  {
    id: 'nominees',
    icon: Mail,
    title: 'Nomination Submission Tracker',
    desc: 'Who has and has not submitted their nominee list.',
    cols: 'Ticket ID, Name, BU, Status, Submitted On',
    best: 'Chasing the last few submissions',
  },
  {
    id: 'assessor',
    icon: Shield,
    title: 'Assessor Excel Tracker',
    desc: 'Per participant: Excel generated, shared, uploaded back, validation status.',
    cols: 'Ticket ID, Name, Generated On, Uploaded Back, Validation',
    best: 'Post-DC chase with the assessor team',
  },
]

export function TrackersExports() {
  function download(id) {
    if (id === 'nominees' || id === 'threesixty') exportCohortNomineeStatus(cohort, activeParticipants)
    else exportCohortProcessStatus(cohort, activeParticipants)
  }

  return (
    <Page
      eyebrow="Talent Development / Operations"
      title="Trackers and Exports"
      subtitle="Ready-to-use Excel trackers for follow-ups, generated live from the current cohort. Every tracker downloads with full headers, and Ticket ID is always the first column."
    >
      <div className="mb-5 rounded-xl border border-[#7ba6e0] bg-[#ebf2fa] p-4 text-sm text-[#123e77]">
        <strong>Status only, never scores.</strong> Exports carry completion status for follow-ups. 360 ratings and individual responses are never included in any export.
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {exportCards.map(({ id, icon: Icon, title, desc, cols, best }) => (
          <Card key={id} className="flex min-h-[240px] flex-col">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ebf2fa] text-[#1e5fba]"><Icon size={18} /></div>
            <h3 className="font-semibold text-[#0f172a]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
            <div className="my-3 rounded-lg bg-[#f1f5fa] px-3 py-2 text-[11px] leading-5 text-slate-500"><strong>Columns:</strong> {cols}</div>
            <p className="mb-4 text-xs text-slate-500"><strong>Best for:</strong> {best}</p>
            <div className="mt-auto">
              <ActionButton onClick={() => download(id)} primary><Download size={14} />Download Excel</ActionButton>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  )
}

function outboxStatusTone(status) {
  if (status === 'sent') return 'success'
  if (status === 'queued') return 'info'
  if (status === 'failed') return 'danger'
  return 'neutral'
}

export function EmailOutbox() {
  const [outbox, setOutbox] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sendingId, setSendingId] = useState(null)

  function load() {
    setLoading(true)
    setError('')
    api.getOutbox()
      .then((result) => {
        const rows = result.data || []
        setOutbox(rows)
        setSelected((current) => current || rows[0] || null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleSend(email) {
    setSendingId(email.id)
    try {
      await api.sendOutboxEmail(email.id)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSendingId(null)
    }
  }

  return (
    <Page
      eyebrow="Talent Development / Operations"
      title="Email Outbox"
      subtitle="Every email the tool sends, in order. Review and send from here; nothing auto-dispatches."
    >
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader title="Sent notifications" subtitle="Welcome emails, 360 invitations, reminders, and report-release notifications." />
          <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
            <table className="w-full border-collapse bg-white text-left text-[13px]">
              <thead className="bg-[#ebf2fa]">
                <tr>{['Queued', 'To', 'Recipient Role', 'Subject', 'Status', ''].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr>
              </thead>
              <tbody>
                {!loading && !outbox.length && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">No emails queued yet.</td></tr>
                )}
                {outbox.map((email) => (
                  <tr key={email.id} className="hover:bg-[#f4f7fb]">
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-xs text-slate-500">{new Date(email.queuedAt).toLocaleString('en-GB')}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><p className="font-semibold">{email.toName || email.toEmail}</p><p className="text-xs text-slate-500">{email.toEmail}</p></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><span className="rounded-full border border-[#d5dce5] bg-[#f1f5fa] px-3 py-1 text-xs text-slate-600">{email.recipientRole}</span></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-600">{email.subject}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={outboxStatusTone(email.status)}>{email.status}</Badge></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelected(email)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#1e5fba] hover:bg-[#ebf2fa]"><Eye size={13} />View</button>
                        {email.status === 'queued' && (
                          <button onClick={() => handleSend(email)} disabled={sendingId === email.id} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#15803d] hover:bg-[#e8f5ee] disabled:opacity-50">
                            <Send size={13} />{sendingId === email.id ? 'Sending...' : 'Send'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {selected && (
          <Card>
            <CardHeader title={selected.subject} subtitle={`To: ${selected.toName || selected.toEmail} <${selected.toEmail}>`} action={<Badge tone="info">{selected.recipientRole}</Badge>} />
            <div className="whitespace-pre-wrap rounded-xl border border-[#d5dce5] bg-[#f8fbff] p-4 text-sm leading-6 text-slate-700">{selected.body}</div>
            {selected.error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{selected.error}</div>
            )}
          </Card>
        )}
      </div>
    </Page>
  )
}

const sections = [
  {
    name: 'Section 1: Thinking and Problem Solving',
    note: 'Covers generating ideas and solving problems creatively.',
    rows: [
      ['GI-1', 'Uses a method to evaluate ideas for their effectiveness', 'Included'],
      ['SPC-1', 'Arrives at a clear problem statement when faced with a problem', 'Included'],
      ['SPC-2', 'Arrives at root causes through analysis', 'Included'],
    ],
  },
  {
    name: 'Section 2: Change and Improvement',
    note: 'Covers championing improvement and positive change.',
    rows: [
      ['CIPC-1', 'Looks for opportunities and identifies the need for improvement/change', 'Included'],
      ['CIPC-2', 'Visualizes the end state and makes a case for improvement/change', 'Included'],
      ['CIPC-3', 'Works to gain buy-in from stakeholders', 'Included'],
    ],
  },
  {
    name: 'Section 3: People Leadership',
    note: 'Covers developing and engaging people, aligning and motivating teams.',
    rows: [
      ['DEP-1', 'Builds and sustains positive work relations', 'Included'],
      ['AMT-1', 'Appreciates and recognises individual and team efforts', 'Included'],
      ['AMT-2', 'Removes blocks or obstacles to performance', 'Included'],
    ],
  },
]

export function QuestionBank() {
  return (
    <Page
      eyebrow="Talent Development / Configuration"
      title="360 Question Bank"
      subtitle="The live statements used in the 360 form. The BU Head / Skip Manager variant can contain fewer statements while reports continue to show NA where not rated."
    >
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Card><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Statements</p><p className="mt-1 text-[26px] font-semibold text-[#1e5fba]">30</p><p className="text-xs text-slate-500">standard form</p></Card>
        <Card><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">BU Head / Skip</p><p className="mt-1 text-[26px] font-semibold text-[#6a4c93]">15</p><p className="text-xs text-slate-500">shorter form variant</p></Card>
        <Card><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Competencies</p><p className="mt-1 text-[26px] font-semibold text-[#15803d]">{competencyScores.length}</p><p className="text-xs text-slate-500">mapped to report sections</p></Card>
      </div>
      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.name}>
            <CardHeader title={section.name} subtitle={section.note} action={<Badge tone="info">360 form</Badge>} />
            <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
              <table className="w-full border-collapse bg-white text-left text-[13px]">
                <thead className="bg-[#ebf2fa]"><tr>{['Code', 'Statement', 'BU Head / Skip version'].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr></thead>
                <tbody>{section.rows.map(([code, statement, variant]) => <tr key={code}><td className="border-b border-[#d5dce5] px-3 py-3 font-semibold text-slate-500">{code}</td><td className="border-b border-[#d5dce5] px-3 py-3">{statement}</td><td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone="success">{variant}</Badge></td></tr>)}</tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  )
}

function TemplateText({ text }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g)

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null
        if (part.startsWith('{{') && part.endsWith('}}')) {
          return <span key={`${part}-${index}`} className="rounded bg-[#fff4df] px-1 font-semibold text-[#a66a10]">{part}</span>
        }
        return <span key={`${part}-${index}`}>{part}</span>
      })}
    </>
  )
}

export function NotificationTemplates() {
  const [templates, setTemplates] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getNotificationTemplates()
      .then((result) => {
        const rows = result.data || []
        setTemplates(rows)
        setSelected(rows.find((template) => template.templateId === 'resp-invite') || rows[0] || null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const phases = [...new Set(templates.map((template) => template.phase))]

  return (
    <Page
      eyebrow="Talent Development / Configuration"
      title="Notification Templates"
      subtitle="Every automated email the tool sends, with placeholders filled by the tool at send time."
    >
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!loading && !templates.length && !error && <Card><p className="text-sm text-slate-500">No templates configured yet.</p></Card>}
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          {phases.map((phase) => (
            <Card key={phase}>
              <CardHeader title={phase} />
              <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
                <table className="w-full border-collapse bg-white text-left text-[13px]">
                  <thead className="bg-[#ebf2fa]"><tr>{['Trigger', 'Recipient', 'Subject', ''].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr></thead>
                  <tbody>
                    {templates.filter((template) => template.phase === phase).map((template) => (
                      <tr key={template.id} className="hover:bg-[#f4f7fb]">
                        <td className="border-b border-[#d5dce5] px-3 py-3 font-semibold">{template.trigger}</td>
                        <td className="border-b border-[#d5dce5] px-3 py-3"><span className="rounded-full border border-[#d5dce5] bg-[#f1f5fa] px-3 py-1 text-xs text-slate-600">{template.recipient}</span></td>
                        <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-600">{template.subject}</td>
                        <td className="border-b border-[#d5dce5] px-3 py-3 text-right"><button onClick={() => setSelected(template)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#1e5fba] hover:bg-[#ebf2fa]"><Eye size={13} />Preview</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
        {selected && (
          <Card>
            <CardHeader title={`Template: ${selected.trigger}`} subtitle={`Recipient: ${selected.recipient} - Phase: ${selected.phase}`} action={<Bell size={16} className="text-[#1e5fba]" />} />
            <p className="mb-3 text-sm font-semibold text-[#0f172a]">Subject: <TemplateText text={selected.subject} /></p>
            <div className="whitespace-pre-wrap rounded-xl border border-[#d5dce5] bg-[#f8fbff] p-4 text-sm leading-6 text-slate-700">
              <TemplateText text={selected.body} />
            </div>
            <p className="mt-3 text-xs text-slate-500">Highlighted placeholders are filled by the tool at send time.</p>
          </Card>
        )}
      </div>
    </Page>
  )
}

function auditDetail(entry) {
  const meta = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {}
  const parts = Object.entries(meta).map(([key, value]) => `${key}: ${value}`)
  return parts.length ? parts.join(', ') : (entry.entityId ? `${entry.entity} ${entry.entityId}` : entry.entity)
}

export function AuditLog() {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAuditLog()
      .then((result) => setRows(result.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter((entry) => `${entry.actor} ${entry.action} ${auditDetail(entry)}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <Page
      eyebrow="Talent Development / Governance"
      title="Audit Log"
      subtitle="Every action in the tool, timestamped and attributable. Nominee edits, report releases, uploads and generated links are all recorded."
    >
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Card>
        <CardHeader
          title="Activity"
          subtitle="Search by actor, action or detail."
          action={<div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search audit" className="w-64 rounded-lg border border-[#c2ccda] bg-white py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#d6e4f7]" /></div>}
        />
        <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
          <table className="w-full border-collapse bg-white text-left text-[13px]">
            <thead className="bg-[#ebf2fa]"><tr>{['Timestamp', 'Actor', 'Action', 'Detail'].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr></thead>
            <tbody>
              {!loading && !filtered.length && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">No audit entries yet.</td></tr>
              )}
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-[#f4f7fb]">
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString('en-GB')}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3">{entry.actor}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 font-semibold">{entry.action}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-600">{auditDetail(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  )
}
