import { useState } from 'react'
import {
  Bell,
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  History,
  Link as LinkIcon,
  Mail,
  Search,
  Send,
  Shield,
  Users,
} from 'lucide-react'
import { cohorts, competencyScores, participants } from '../../data/adminData'
import { exportCohortNomineeStatus, exportCohortProcessStatus } from '../../lib/trackingExport'

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

const outbox = [
  {
    id: 'e1',
    sent: '18 Jun 2025, 10:12',
    toName: 'Priya Menon',
    to: 'priya.menon@bajaj.com',
    role: '360 Respondent',
    subject: '360 feedback request for Rahul Kumar',
    body: 'You have been nominated to provide confidential 360 feedback for Rahul Kumar. Please complete the feedback form before the cutoff date.',
    magicLink: 'http://localhost:5173/?role=respondent&name=Priya+Menon&email=priya.menon%40bajaj.com&taskId=r1',
    status: 'Responded',
  },
  {
    id: 'e2',
    sent: '18 Jun 2025, 10:13',
    toName: 'Sameer Kulkarni',
    to: 'sameer.kulkarni@bajaj.com',
    role: '360 Respondent',
    subject: 'Reminder: 360 feedback pending',
    body: 'Your feedback is pending. Individual responses are confidential and only group aggregates appear in the report.',
    magicLink: 'http://localhost:5173/?role=respondent&name=Sameer+Kulkarni&email=sameer.kulkarni%40bajaj.com&taskId=r5',
    status: 'Invited',
  },
  {
    id: 'e3',
    sent: '19 Jun 2025, 14:42',
    toName: 'Neha Sharma',
    to: 'neha.sharma@bajaj.com',
    role: 'Participant',
    subject: 'Your 360 report is available',
    body: 'TD has released your 360 Feedback Report. You can view it from My Reports in the participant portal.',
    magicLink: '',
    status: 'Delivered',
  },
]

export function EmailOutbox() {
  const [selected, setSelected] = useState(outbox[0])

  return (
    <Page
      eyebrow="Talent Development / Operations"
      title="Email Outbox"
      subtitle="Every email the tool sends, in order. Invitation emails carry the generated magic link so the end-to-end cycle can be tested and audited."
      action={<ActionButton primary><Send size={14} />Send reminders</ActionButton>}
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader title="Sent notifications" subtitle="Welcome emails, 360 invitations, reminders, and report-release notifications." />
          <div className="overflow-hidden rounded-xl border border-[#d5dce5]">
            <table className="w-full border-collapse bg-white text-left text-[13px]">
              <thead className="bg-[#ebf2fa]">
                <tr>{['Sent', 'To', 'Recipient Role', 'Subject', 'Status', ''].map((label) => <th key={label} className="border-b border-[#d5dce5] px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">{label}</th>)}</tr>
              </thead>
              <tbody>
                {outbox.map((email) => (
                  <tr key={email.id} className="hover:bg-[#f4f7fb]">
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-xs text-slate-500">{email.sent}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><p className="font-semibold">{email.toName}</p><p className="text-xs text-slate-500">{email.to}</p></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><span className="rounded-full border border-[#d5dce5] bg-[#f1f5fa] px-3 py-1 text-xs text-slate-600">{email.role}</span></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-600">{email.subject}</td>
                    <td className="border-b border-[#d5dce5] px-3 py-3"><Badge tone={email.status === 'Responded' ? 'success' : email.status === 'Invited' ? 'info' : 'neutral'}>{email.status}</Badge></td>
                    <td className="border-b border-[#d5dce5] px-3 py-3 text-right"><button onClick={() => setSelected(email)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#1e5fba] hover:bg-[#ebf2fa]"><Eye size={13} />View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader title={selected.subject} subtitle={`To: ${selected.toName} <${selected.to}>`} action={<Badge tone="info">{selected.role}</Badge>} />
          <div className="rounded-xl border border-[#d5dce5] bg-[#f8fbff] p-4 text-sm leading-6 text-slate-700">{selected.body}</div>
          {selected.magicLink && (
            <div className="mt-4 rounded-xl border border-[#d5dce5] bg-[#f4f7fb] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#1e5fba]"><LinkIcon size={13} />Magic link</div>
              <p className="break-all text-xs leading-5 text-slate-600">{selected.magicLink}</p>
            </div>
          )}
        </Card>
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

const templates = [
  {
    id: 'welcome',
    phase: 'Setup',
    trigger: 'Employee upload imported, participant account created',
    to: 'Participant',
    subject: 'Welcome to {{Cohort}}: your 360 & DC journey begins',
    body: `Dear {{Participant Name}},

Congratulations on being nominated for the {{Cohort}} Development Centre. You have been recognised as a strong performer with the potential to grow further, and this journey is designed to support exactly that.

Your account on the 360 & DC Tool is ready. Use the link below to set your password and sign in.

Set your password: {{Password Link}}

Once signed in, please complete these steps:
1. Confirm your details
2. Submit your 360 nominations by {{Nomination Deadline}}. Submitting launches your confidential 360 feedback automatically.
3. Complete your Pre-Work and upload your photograph

Your DC dates will be shared by the TD team. For any questions, write to learn@bajajauto.co.in.

We wish you the very best for this development journey.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    id: 'nom-reminder',
    phase: '360 cycle',
    trigger: 'Nomination deadline approaching, list not yet submitted',
    to: 'Participant',
    subject: 'Reminder: submit your 360 nominations by {{Nomination Deadline}}',
    body: `Dear {{Participant Name}},

A quick reminder that your 360 nominations are still pending. Please sign in to the 360 & DC Tool and submit your nominee list by {{Nomination Deadline}}.

Submitting your list launches your confidential 360 feedback immediately, so the earlier you submit, the more time your respondents have.

Please ensure all nominations are complete before submitting; the list locks on submission.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    id: 'nominations-confirmed',
    phase: '360 cycle',
    trigger: 'Nominations submitted, 360 launched',
    to: 'Participant',
    subject: 'Your 360 is live: invitations sent to {{Respondent Count}} respondents',
    body: `Dear {{Participant Name}},

Thank you for submitting your nominations. Your confidential 360 degree feedback is now live.

Invitations have been emailed to all {{Respondent Count}} respondents on your list, including your self assessment link. Responses are due by {{360 Cutoff}}.

Your nominee list is now locked. You can track response progress from your dashboard, but individual responses are never visible to anyone; feedback is only ever shown as group aggregates in your report.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    id: 'resp-invite',
    phase: '360 cycle',
    trigger: '360 launched, invitation to each respondent',
    to: 'Respondent',
    subject: 'Confidential: 360 feedback for {{Participant Name}}',
    body: `Dear {{Respondent Name}},

You have been invited to share confidential 360 degree feedback for {{Participant Name}} as their {{Relationship}}.

Your perspective will help them gain a fuller understanding of how others experience their strengths and contributions, and the areas where they can grow further. The form takes about {{Estimated Time}}.

Open your feedback form: {{Magic Link}}

This is a secure link personal to you. No login or password is needed. If you have been asked to give feedback for more than one participant, the same link shows all of them in one place with their status.

Individual responses are never shown. Feedback is consolidated and presented as aggregates per respondent group in the report.

Please complete the form by {{360 Cutoff}}.

Thank you for your time and considered inputs.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    id: 'resp-reminder',
    phase: '360 cycle',
    trigger: 'Manual or scheduled reminder to pending respondents',
    to: 'Respondent',
    subject: 'Reminder: your 360 feedback for {{Participant Name}} is pending',
    body: `Dear {{Respondent Name}},

A gentle reminder that your 360 feedback for {{Participant Name}} is still pending.

Open your feedback form: {{Magic Link}}

The form takes about {{Estimated Time}} and closes on {{360 Cutoff}}. Your considered, honest inputs make a real difference to their development.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    id: 'threesixty-closed',
    phase: '360 cycle',
    trigger: '360 window closed for the cohort',
    to: 'TD Admin',
    subject: '360 window closed for {{Cohort}}: response summary',
    body: `The 360 feedback window for {{Cohort}} has closed.

Summary: {{Response Summary}}

You can now generate 360 reports from Generate & Release. Reports are generated directly from the tool's template; review each draft before switching on visibility.

360 & DC Tool`,
  },
  {
    id: 'report-360-released',
    phase: 'Reports',
    trigger: 'TD switches on 360 report visibility for a participant',
    to: 'Participant',
    subject: 'Your 360 Feedback Report is now available',
    body: `Dear {{Participant Name}},

Your 360 Feedback Report has been released and is available under My Reports in the 360 & DC Tool.

A few suggestions as you read it:
1. Read the How to Read pages first; they explain the rating scale and how group aggregates work.
2. Look for patterns across respondent groups rather than individual numbers.
3. Use the Reflection Workbook at the end, and consider discussing your takeaways with your manager or a coach.

Your report is a confidential document. Please use and share it with discretion.

Regards,
Talent Development, Bajaj Auto`,
  },
  {
    id: 'report-dc-released',
    phase: 'Reports',
    trigger: 'TD switches on DC report visibility for a participant',
    to: 'Participant + Manager',
    subject: 'Your Development Centre Report is now available',
    body: `Dear {{Participant Name}},

Your Development Centre Report has been released and is available under My Reports in the 360 & DC Tool.

The report brings together your assessor observations from the DC and your 360 feedback. Please go through the Guide pages first, then review each competency page and the Owning Your Development section.

Your Reporting Manager has also been notified so you can plan a development conversation together.

Regards,
Talent Development, Bajaj Auto`,
  },
]

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
  const phases = ['Setup', '360 cycle', 'Reports']
  const [selected, setSelected] = useState(templates.find((template) => template.id === 'resp-invite') || templates[0])

  return (
    <Page
      eyebrow="Talent Development / Configuration"
      title="Notification Templates"
      subtitle="Every automated email the tool sends, with placeholders filled by the tool at send time."
    >
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
                        <td className="border-b border-[#d5dce5] px-3 py-3"><span className="rounded-full border border-[#d5dce5] bg-[#f1f5fa] px-3 py-1 text-xs text-slate-600">{template.to}</span></td>
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
        <Card>
          <CardHeader title={`Template: ${selected.trigger}`} subtitle={`Recipient: ${selected.to} - Phase: ${selected.phase}`} action={<Bell size={16} className="text-[#1e5fba]" />} />
          <p className="mb-3 text-sm font-semibold text-[#0f172a]">Subject: <TemplateText text={selected.subject} /></p>
          <div className="whitespace-pre-wrap rounded-xl border border-[#d5dce5] bg-[#f8fbff] p-4 text-sm leading-6 text-slate-700">
            <TemplateText text={selected.body} />
          </div>
          <p className="mt-3 text-xs text-slate-500">Highlighted placeholders are filled by the tool at send time.</p>
        </Card>
      </div>
    </Page>
  )
}

const auditRows = [
  ['18 Jun 2025, 10:09', 'TD Admin', 'Cohort created', "EX to LX Cohort '25"],
  ['18 Jun 2025, 10:11', 'TD Admin', 'Employee master uploaded', '8 participants imported'],
  ['18 Jun 2025, 10:12', 'Rahul Kumar', 'Nominations submitted', '7 respondents invited'],
  ['18 Jun 2025, 10:13', 'System', 'Magic links generated', '7 respondent invite links'],
  ['19 Jun 2025, 14:42', 'TD Admin', '360 report released', 'Neha Sharma'],
]

export function AuditLog() {
  const [query, setQuery] = useState('')
  const filtered = auditRows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase()))

  return (
    <Page
      eyebrow="Talent Development / Governance"
      title="Audit Log"
      subtitle="Every action in the tool, timestamped and attributable. Nominee edits, report releases, uploads and generated links are all recorded."
      action={<ActionButton><Download size={14} />Export</ActionButton>}
    >
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
              {filtered.map(([ts, actor, action, detail]) => (
                <tr key={`${ts}-${action}`} className="hover:bg-[#f4f7fb]">
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-xs text-slate-500">{ts}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3">{actor}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 font-semibold">{action}</td>
                  <td className="border-b border-[#d5dce5] px-3 py-3 text-slate-600">{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  )
}
