import { useEffect, useState } from 'react'
import {
  Bell,
  Download,
  Eye,
  FileText,
  Search,
  Send,
  Users,
} from 'lucide-react'
import { competencyScores } from '../../data/adminData'
import { exportCohortNomineeStatus, exportCohortProcessStatus } from '../../lib/trackingExport'
import { api } from '../../lib/api'

function Page({ eyebrow, title, subtitle, action, children }) {
  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs text-slate-500">{eyebrow}</p>
            <h1 className="font-serif text-[34px] font-semibold leading-tight text-[#1e4d8c]">{title}</h1>
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
        <h3 className="text-lg font-bold text-[#1e5fba]">{title}</h3>
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

const exportCards = [
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
]

export function TrackersExports() {
  const [cohortRows, setCohortRows] = useState([])
  const [selectedCohortId, setSelectedCohortId] = useState('')
  const [cohortParticipants, setCohortParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const selectedCohort = cohortRows.find((item) => item.id === selectedCohortId)

  useEffect(() => {
    api.getCohorts().then(({ data }) => {
      const rows = data || []
      setCohortRows(rows)
      setSelectedCohortId(rows.at(-1)?.id || '')
    }).catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCohortId) { setCohortParticipants([]); return }
    setLoading(true)
    api.getCohortParticipants(selectedCohortId).then(({ data }) => setCohortParticipants(data || [])).catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [selectedCohortId])

  function download(id) {
    if (!selectedCohort) return
    if (id === 'threesixty') exportCohortNomineeStatus(selectedCohort, cohortParticipants)
    else exportCohortProcessStatus(selectedCohort, cohortParticipants)
  }

  return (
    <Page
      eyebrow="Talent Development / Operations"
      title="Trackers and Exports"
      subtitle="Select any current or historic DC cohort, then download its live status trackers."
    >
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <Card className="mb-5">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">DC cohort</label>
        <select value={selectedCohortId} onChange={(event) => setSelectedCohortId(event.target.value)} className="w-full max-w-lg rounded-lg border border-[#c2ccda] bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
          {cohortRows.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.programme} · {item.eventDate}</option>)}
        </select>
        <p className="mt-2 text-xs text-slate-500">{loading ? 'Loading cohort…' : `${cohortParticipants.length} participant${cohortParticipants.length === 1 ? '' : 's'} in this cohort`}</p>
      </Card>
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
  if (status === 'failed') return 'danger'
  if (status === 'not_sent') return 'warning'
  return 'neutral'
}

export function EmailOutbox() {
  const [outbox, setOutbox] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <Page
      eyebrow="Talent Development / Operations"
      title="Email Delivery History"
      subtitle="Every notification is sent immediately. Review successful and failed delivery attempts here."
    >
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader title="Delivery history" subtitle="Welcome emails, 360 invitations, reminders, and report-release notifications." />
          <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
            <table className="w-full border-collapse bg-white text-left text-[13px]">
              <thead className="bg-[#ebf2fa]">
                <tr>{['Created', 'To', 'Recipient Role', 'Subject', 'Status', ''].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr>
              </thead>
              <tbody>
                {!loading && !outbox.length && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">No email delivery attempts yet.</td></tr>
                )}
                {outbox.map((email) => (
                  <tr key={email.id} className="hover:bg-[#f4f7fb]">
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-xs text-slate-500">{new Date(email.queuedAt).toLocaleString('en-GB')}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><p className="font-semibold">{email.toName || email.toEmail}</p><p className="text-xs text-slate-500">{email.toEmail}</p></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><span className="rounded-full border border-[#d5dce5] bg-[#f1f5fa] px-3 py-1 text-xs text-slate-600">{email.recipientRole}</span></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-600">{email.subject}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={outboxStatusTone(email.status)}>{email.status === 'not_sent' ? 'Not sent' : email.status}</Badge></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelected(email)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#1e5fba] hover:bg-[#ebf2fa]"><Eye size={13} />View</button>
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
  const [recipients, setRecipients] = useState([])
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([])
  const [recipientSearch, setRecipientSearch] = useState('')
  const [bulkEmails, setBulkEmails] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [recipientsLoading, setRecipientsLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getNotificationTemplates()
      .then((templateResult) => {
        const rows = templateResult.data || []
        setTemplates(rows)
        setSelected(rows.find((template) => template.templateId === 'resp-invite') || rows[0] || null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setSubject(selected.subject)
    setBody(selected.body)
    setNotice('')
    setSent(false)
    setError('')
    setSelectedRecipientIds([])
    setRecipientsLoading(true)
    api.getNotificationRecipients(selected.templateId)
      .then((result) => setRecipients(result.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setRecipientsLoading(false))
  }, [selected])

  const phases = [...new Set(templates.map((template) => template.phase))]
  const visibleRecipients = recipients.filter((recipient) => {
    const haystack = `${recipient.name} ${recipient.email} ${recipient.employeeId || ''} ${recipient.roles.join(' ')} ${recipient.businessUnit || ''}`.toLowerCase()
    return haystack.includes(recipientSearch.trim().toLowerCase())
  })
  const selectedDirectoryRecipients = recipients
    .filter((recipient) => selectedRecipientIds.includes(recipient.id))
    .map((recipient) => ({ email: recipient.email, name: recipient.name, sourceType: recipient.sourceType, sourceId: recipient.sourceId }))
  const pastedAddresses = bulkEmails
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
  const invalidAddresses = pastedAddresses.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  const selectedEmails = new Set(selectedDirectoryRecipients.map((recipient) => recipient.email.toLowerCase()))
  const pastedRecipients = [...new Set(pastedAddresses)]
    .filter((email) => !invalidAddresses.includes(email) && !selectedEmails.has(email))
    .map((email) => ({ email, name: null, sourceType: 'manual', sourceId: null }))
  const composedRecipients = [...selectedDirectoryRecipients, ...pastedRecipients]

  function toggleRecipient(id) {
    setSent(false)
    setSelectedRecipientIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  async function handleSend() {
    setError('')
    setNotice('')
    if (!composedRecipients.length) return setError('Select at least one recipient or paste an email address.')
    if (invalidAddresses.length) return setError(`Fix invalid email address${invalidAddresses.length === 1 ? '' : 'es'}: ${invalidAddresses.join(', ')}`)
    if (!subject.trim() || !body.trim()) return setError('Subject and email body are required.')
    if (!window.confirm(`Send this email to ${composedRecipients.length} recipient${composedRecipients.length === 1 ? '' : 's'} now?`)) return

    setSending(true)
    try {
      const result = await api.sendNotification({ templateId: selected.templateId, subject, body, recipients: composedRecipients })
      const summary = result.data
      setNotice(`${summary.sent} email${summary.sent === 1 ? '' : 's'} sent${summary.failed ? `; ${summary.failed} failed. Check Email History for details.` : '.'}`)
      setSent(summary.sent > 0 && summary.failed === 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Page
      eyebrow="Talent Development / Communications"
      title="Email Centre"
      subtitle="Choose an approved system email, select recipients, review the message, and send it immediately."
    >
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!loading && !templates.length && !error && <Card><p className="text-sm text-slate-500">No system emails configured yet.</p></Card>}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_500px]">
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
                        <td className="border-b border-[#d5dce5] px-3 py-3 text-right"><button onClick={() => setSelected(template)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#1e5fba] hover:bg-[#ebf2fa]"><Eye size={13} />Compose</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
        {selected && (
          <Card className="h-fit xl:sticky xl:top-5">
            <CardHeader title="Review & send email" subtitle={`${selected.trigger} · ${selected.recipient}`} action={<Bell size={16} className="text-[#1e5fba]" />} />
            {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{notice}</div>}

            <label className="mb-1 block text-xs font-semibold text-slate-700">Select recipients</label>
            <input value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Search name, email, role or BU" className="mb-2 w-full rounded-lg border border-[#c2ccda] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6e4f7]" />
            <div className="mb-3 max-h-48 overflow-y-auto rounded-lg border border-[#d5dce5]">
              {recipientsLoading && <p className="p-3 text-xs text-slate-500">Loading eligible recipients…</p>}
              {!visibleRecipients.length && <p className="p-3 text-xs text-slate-500">No matching accounts.</p>}
              {visibleRecipients.map((recipient) => (
                <label key={recipient.id} className="flex cursor-pointer items-start gap-3 border-b border-[#edf1f6] px-3 py-2 last:border-b-0 hover:bg-[#f8fbff]">
                  <input type="checkbox" checked={selectedRecipientIds.includes(recipient.id)} onChange={() => toggleRecipient(recipient.id)} className="mt-1" />
                  <span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-800">{recipient.name}</span><span className="block truncate text-[11px] text-slate-500">{recipient.email} · {recipient.detail || recipient.roles.join(', ')}</span></span>
                </label>
              ))}
            </div>

            <label className="mb-1 block text-xs font-semibold text-slate-700">Or paste email addresses in bulk</label>
            <textarea value={bulkEmails} onChange={(event) => { setBulkEmails(event.target.value); setSent(false) }} rows={3} placeholder="name@company.com, another@company.com" className="mb-3 w-full rounded-lg border border-[#c2ccda] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6e4f7]" />
            <p className="mb-4 text-[11px] text-slate-500">Separate addresses with commas, semicolons, spaces, or new lines. {composedRecipients.length} unique recipient{composedRecipients.length === 1 ? '' : 's'} selected.</p>

            <label className="mb-1 block text-xs font-semibold text-slate-700">Subject</label>
            <input value={subject} onChange={(event) => { setSubject(event.target.value); setSent(false) }} className="mb-3 w-full rounded-lg border border-[#c2ccda] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d6e4f7]" />
            <label className="mb-1 block text-xs font-semibold text-slate-700">Email body</label>
            <textarea value={body} onChange={(event) => { setBody(event.target.value); setSent(false) }} rows={14} className="w-full rounded-lg border border-[#c2ccda] px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-[#d6e4f7]" />
            <p className="mt-2 text-[11px] text-slate-500">Placeholders such as {'{{Participant Name}}'} are filled by the Tool using the selected recipient's data.</p>
            <button onClick={handleSend} disabled={sending || sent || !composedRecipients.length} className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed ${sent ? 'bg-emerald-600' : 'bg-[#1e5fba] hover:bg-[#0e3f87] disabled:opacity-50'}`}><Send size={15} />{sending ? 'Sending…' : sent ? 'Sent ✓' : `Send to ${composedRecipients.length || 0} recipient${composedRecipients.length === 1 ? '' : 's'}`}</button>
          </Card>
        )}
      </div>
    </Page>
  )
}

