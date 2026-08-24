import { ArrowLeft, BriefcaseBusiness, Camera, Download, FileText, MessageSquareText, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { download360Pdf } from '../../lib/reportDownload'

const evidenceConfig = {
  photograph: { title: 'Participant Photograph', label: 'Identity evidence', icon: Camera },
  'role-interview': { title: 'Role Interview', label: 'Interview submission', icon: MessageSquareText },
  '360-report': { title: '360° Feedback Report', label: 'Aggregated feedback', icon: FileText },
  'pre-work': { title: 'Self Reflection', label: 'Participant submission', icon: BriefcaseBusiness },
}

const preWorkQuestions = [
  { key: 'q1', text: 'What is the most important thing you have learned about yourself as a result of your work experience?' },
  { key: 'q2', text: 'Using three short phrases, indicate how your close friends might describe you.' },
  { key: 'q3', text: 'Now describe yourself using three short phrases different from the above.' },
  { key: 'q4', text: 'What do you think are your strongest points?' },
  { key: 'q5', text: 'What three areas would you like to improve or change about yourself?' },
  { key: 'q6', text: 'If we were to speak with your peers, manager, and direct reports (if applicable), what do you think they would identify as your key areas for improvement?' },
  { key: 'q8', text: 'Sometimes people misinterpret our personality. How do others see you differently from how you really think you are?' },
  { key: 'q9', text: 'If you picked a character from mythology, films, politics, sports or history who is closest to you psychologically, who would it be?' },
  { key: 'q10', text: 'Reflecting deep down inside yourself, what pressures would you say are at work on you?' },
]

const roleLabels = {
  currentRole: 'Current role / designation', responsibilities: 'Summary of current role and responsibilities',
  highlight1: 'Highlight 1', highlight2: 'Highlight 2', highlight3: 'Highlight 3',
  challenge1: 'Challenge 1', challenge2: 'Challenge 2', challenge3: 'Challenge 3',
}

function InfoRow({ label, value }) {
  return <div className="flex justify-between gap-4 border-b border-[#edf1f5] py-3 last:border-0"><span className="text-xs text-gray-400">{label}</span><span className="text-right text-xs font-semibold text-[#374151]">{value || '—'}</span></div>
}

function PersonPlaceholder({ size = 'sm' }) {
  const classes = size === 'xl' ? 'w-full aspect-square rounded-xl' : 'w-14 h-14 rounded-lg'
  return <div className={`${classes} flex shrink-0 flex-col items-center justify-center bg-[#e4eef9] text-[#1e4d8c]`}><User size={size === 'xl' ? 72 : 23} strokeWidth={1.7} />{size === 'xl' && <p className="mt-4 text-sm font-semibold">No photograph submitted</p>}</div>
}

function SubmissionHeader({ submission }) {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#edf1f5] bg-[#f8fafc] p-4"><div><p className="text-[11px] text-gray-500">Submission status</p><p className="mt-1 text-sm font-semibold capitalize text-[#172033]">{submission.status}</p></div><div className="text-right"><p className="text-[11px] text-gray-500">Submitted on</p><p className="mt-1 text-sm font-semibold text-[#172033]">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString('en-GB') : 'Not submitted'}</p></div></div>
}

function AnswerCard({ label, value }) {
  return <article className="rounded-xl border border-[#e2e8f0] bg-white p-5"><p className="text-sm font-semibold leading-6 text-[#172033]">{label}</p><div className="mt-3 whitespace-pre-wrap rounded-lg bg-[#f8fafc] p-4 text-sm leading-6 text-gray-700">{String(value || '').trim() || 'No response provided.'}</div></article>
}

export async function downloadRoleInterviewPdf(profile, save = true) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const answers = profile.roleInterview.answers || {}
  const margin = 48
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - (margin * 2)
  let y = margin

  function ensureSpace(height) {
    if (y + height <= pageHeight - margin) return
    pdf.addPage()
    y = margin
  }

  function wrapText(value) {
    const normalized = String(value || '')
      .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
      .replace(/[^\S\r\n]+/g, ' ')
      .trim()
    const lines = []
    for (const paragraph of normalized.split(/\r?\n/)) {
      if (!paragraph.trim()) {
        lines.push('')
        continue
      }
      let line = ''
      for (const word of paragraph.trim().split(' ')) {
        const candidate = line ? `${line} ${word}` : word
        if (pdf.getTextWidth(candidate) <= contentWidth) {
          line = candidate
          continue
        }
        if (line) lines.push(line)
        if (pdf.getTextWidth(word) <= contentWidth) {
          line = word
          continue
        }
        let chunk = ''
        for (const character of word) {
          if (chunk && pdf.getTextWidth(chunk + character) > contentWidth) {
            lines.push(chunk)
            chunk = character
          } else {
            chunk += character
          }
        }
        line = chunk
      }
      if (line) lines.push(line)
    }
    return lines.length ? lines : ['']
  }

  function addText(text, { size = 10, bold = false, color = [55, 65, 81], gap = 8 } = {}) {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
    const lineHeight = size * 1.45
    for (const line of wrapText(text)) {
      ensureSpace(lineHeight)
      if (line) pdf.text(line, margin, y, { maxWidth: contentWidth })
      y += lineHeight
    }
    y += gap
  }

  pdf.setFillColor(30, 77, 140)
  pdf.rect(0, 0, pageWidth, 112, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(21)
  pdf.text('Role Interview', margin, 48)
  pdf.setFontSize(13)
  pdf.text(profile.nickname || 'Nickname not set', margin, 75)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text(`Ticket ID: ${profile.employeeId || '-'} | ${profile.designation || '-'} | ${profile.bu || '-'} | ${profile.cohort || '-'}`, margin, 96)
  y = 140

  const submittedOn = profile.roleInterview.submittedAt ? new Date(profile.roleInterview.submittedAt).toLocaleString('en-GB') : 'Not submitted'
  addText(`Submission status: ${profile.roleInterview.status || 'draft'} | Submitted on: ${submittedOn}`, { size: 9, color: [75, 85, 99], gap: 18 })

  const transitions = [1, 2, 3].map((number) => ({
    number,
    values: [answers[`transition${number}_role`], answers[`transition${number}_roleDescription`] || answers[`transition${number}_designation`], answers[`transition${number}_bu`], answers[`transition${number}_duration`]],
  })).filter((transition) => transition.values.some(Boolean))

  if (transitions.length) {
    addText('Last 3 career transitions', { size: 13, bold: true, color: [23, 32, 51], gap: 10 })
    transitions.forEach((transition) => addText(`${transition.number}. Role: ${transition.values[0] || '-'} | Role Description: ${transition.values[1] || '-'} | BU: ${transition.values[2] || '-'} | Duration: ${transition.values[3] || '-'}`, { size: 9, gap: 10 }))
    y += 6
  }

  Object.entries(roleLabels).forEach(([key, label], index) => {
    addText(`${index + 1}. ${label}`, { size: 11, bold: true, color: [23, 32, 51], gap: 5 })
    addText(String(answers[key] || '').trim() || 'No response provided.', { size: 10, gap: 16 })
  })

  const filePart = String(profile.nickname || profile.employeeId || 'participant').replace(/[^A-Za-z0-9_-]+/g, '-')
  const fileName = `${filePart}-role-interview.pdf`
  if (save) pdf.save(fileName)
  return { data: pdf.output('arraybuffer'), fileName }
}

function RoleInterview({ profile }) {
  const submission = profile.roleInterview
  const [downloadState, setDownloadState] = useState({ loading: false, error: '' })
  const answers = submission.answers || {}
  const transitions = [1, 2, 3].map((number) => ({
    number,
    values: [answers[`transition${number}_role`], answers[`transition${number}_roleDescription`] || answers[`transition${number}_designation`], answers[`transition${number}_bu`], answers[`transition${number}_duration`]],
  })).filter((transition) => transition.values.some(Boolean))
  async function download() {
    setDownloadState({ loading: true, error: '' })
    try {
      await downloadRoleInterviewPdf(profile)
      setDownloadState({ loading: false, error: '' })
    } catch (error) {
      setDownloadState({ loading: false, error: error.message || 'Unable to create the PDF.' })
    }
  }
  return <div><div className="mb-5 flex justify-end"><button type="button" onClick={download} disabled={downloadState.loading} className="inline-flex items-center gap-2 rounded-lg bg-[#1e4d8c] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"><Download size={15} />{downloadState.loading ? 'Preparing…' : 'Download PDF'}</button></div>{downloadState.error && <p className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{downloadState.error}</p>}<SubmissionHeader submission={submission} />{transitions.length > 0 && <section className="mb-5 rounded-2xl border border-[#e2e8f0] bg-white p-6"><h2 className="mb-4 font-semibold text-[#172033]">Last 3 career transitions</h2><div className="space-y-3">{transitions.map((transition) => <div key={transition.number} className="grid gap-3 rounded-xl bg-[#f8fafc] p-4 sm:grid-cols-4">{['Role', 'Role Description', 'BU', 'Duration'].map((label, index) => <div key={label}><p className="text-[11px] text-gray-400">{label}</p><p className="mt-1 text-sm font-semibold text-[#374151]">{transition.values[index] || '—'}</p></div>)}</div>)}</div></section>}<div className="space-y-4">{Object.entries(roleLabels).map(([key, label]) => <AnswerCard key={key} label={label} value={answers[key]} />)}</div></div>
}

function PreWork({ submission }) {
  const answers = submission.answers || {}
  const q6Answer = String(answers.q6 || '').trim()
  const q7Answer = String(answers.q7 || '').trim()
  const combinedCriticismAnswer = q7Answer && !q6Answer.includes(q7Answer) ? [q6Answer, q7Answer].filter(Boolean).join('\n\n') : q6Answer
  return <div><SubmissionHeader submission={submission} /><div className="space-y-4">{preWorkQuestions.map((question, index) => <AnswerCard key={question.key} label={`${index + 1}. ${question.text}`} value={question.key === 'q6' ? combinedCriticismAnswer : answers[question.key]} />)}</div></div>
}

function ReleasedReport({ profile }) {
  const [downloadError, setDownloadError] = useState('')
  return <section className="rounded-2xl border border-emerald-200 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold text-[#172033]">Published 360° Feedback Report</h2><p className="mt-1 text-sm text-slate-500">This aggregated report has been released by Talent Development.</p></div><button type="button" onClick={() => download360Pdf(profile.id, profile.employeeId).catch((error) => setDownloadError(error.message))} className="inline-flex items-center gap-2 rounded-lg bg-[#1e4d8c] px-4 py-2.5 text-xs font-semibold text-white"><Download size={15} />Download PDF</button></div>{downloadError && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{downloadError}</p>}</section>
}

function DetailBody({ type, profile }) {
  if (type === 'photograph') return <div className="grid gap-6 lg:grid-cols-[360px_1fr]"><section className="rounded-2xl border border-[#e2e8f0] bg-white p-6">{profile.photograph.url ? <img src={profile.photograph.url} alt="Participant photograph" className="aspect-square w-full rounded-xl object-cover" /> : <PersonPlaceholder size="xl" />}</section><section className="rounded-2xl border border-[#e2e8f0] bg-white p-6"><h2 className="font-semibold text-[#172033]">Candidate details</h2><div className="mt-4"><InfoRow label="Ticket ID" value={profile.employeeId} /><InfoRow label="Designation" value={profile.designation} /><InfoRow label="Business unit" value={profile.bu} /><InfoRow label="Photo status" value={profile.photograph.status} /></div></section></div>
  if (type === 'role-interview') return <RoleInterview profile={profile} />
  if (type === 'pre-work') return <PreWork submission={profile.preWork} />
  if (profile.report360.status === 'released') return <ReleasedReport profile={profile} />
  return <section className="rounded-2xl border border-[#e2e8f0] bg-white p-6"><div className="grid gap-4 md:grid-cols-3"><InfoRow label="Report status" value={profile.report360.status} /><InfoRow label="Responses submitted" value={`${profile.report360.submittedResponses}/${profile.report360.totalResponses}`} /><InfoRow label="Generated on" value={profile.report360.generatedAt ? new Date(profile.report360.generatedAt).toLocaleString('en-GB') : 'Not generated'} /></div><p className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">The aggregated 360° Feedback Report becomes available after all required responses are complete and TD generates the report.</p></section>
}

export default function EvidenceDetail() {
  const { participantId, evidenceType } = useParams()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const config = evidenceConfig[evidenceType]

  useEffect(() => {
    if (!participantId) return
    api.getAssessorCandidate(participantId).then(({ data }) => setProfile(data)).catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [participantId])

  if (!config) return <Navigate to="/assessor/candidates" replace />
  const Icon = config.icon
  const cohortId = searchParams.get('cohortId')
  const backParams = new URLSearchParams({ participantId })
  if (cohortId) backParams.set('cohortId', cohortId)
  return <div><header className="flex h-20 items-center justify-between border-b border-[#e4e9f1] bg-white px-8"><div className="flex items-center gap-4"><Link to={`/assessor/candidates?${backParams.toString()}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] text-gray-500 hover:text-[#1e4d8c]"><ArrowLeft size={17} /></Link><div><p className="text-xs text-gray-400">{profile?.nickname || 'Nickname not set'} / Ticket ID: {profile?.employeeId || '—'} / {config.label}</p><h1 className="text-xl font-bold text-[#172033]">{config.title}</h1></div></div><span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-blue-700"><Icon size={13} />Read-only evidence</span></header><main className="mx-auto max-w-[1180px] p-8">{loading && <p className="text-sm text-gray-500">Loading participant response…</p>}{error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}{profile && <><section className="mb-6 flex items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5"><PersonPlaceholder /><div><h2 className="text-lg font-bold text-[#172033]">{profile.nickname || 'Nickname not set'}</h2><p className="mt-1 text-xs text-gray-500">Ticket ID: {profile.employeeId} · {profile.designation} · {profile.bu} · {profile.cohort}</p></div></section><DetailBody type={evidenceType} profile={profile} /></>}</main></div>
}
