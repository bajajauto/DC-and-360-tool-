import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { api } from '../../lib/api'

const transitionFields = [['role', 'Role'], ['roleDescription', 'Role Description'], ['bu', 'BU'], ['duration', 'Duration']]
const transitions = [1, 2, 3].map((n) => ({ n, fields: transitionFields }))
const transitionKeys = transitionFields.map(([key]) => `transition1_${key}`)
const shortRequiredKeys = ['currentRole', ...transitionKeys]
const reflectionKeys = ['responsibilities', 'highlight1', 'highlight2', 'challenge1', 'challenge2']
const allRequiredKeys = [...shortRequiredKeys, ...reflectionKeys]
const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
const yearOptions = Array.from({ length: new Date().getFullYear() - 1959 }, (_, index) => String(new Date().getFullYear() - index))
const validMonthYear = (value) => /^(0[1-9]|1[0-2])\/(19[6-9]\d|20\d{2})$/.test(String(value || ''))
const placeholderPattern = /^(?:n\/?a|none|nil|[^\p{L}\p{N}]+)$/iu
const validShort = (value) => {
  const text = String(value || '').trim()
  return text.length > 0 && !placeholderPattern.test(text)
}
const validReflection = (value) => {
  const text = String(value || '').trim()
  return text.length >= 15 && !placeholderPattern.test(text)
}

function MonthYearSelect({ value, onChange, required = false }) {
  const [month = '', year = ''] = String(value || '').split('/')
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <select required={required} aria-label="Duration month" value={monthOptions.includes(month) ? month : ''} onChange={(event) => onChange(`${event.target.value}/${year}`)} className="rounded-lg border bg-white px-2 py-2 text-sm">
          <option value="">Month</option>
          {monthOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select required={required} aria-label="Duration year" value={yearOptions.includes(year) ? year : ''} onChange={(event) => onChange(`${month}/${event.target.value}`)} className="rounded-lg border bg-white px-2 py-2 text-sm">
          <option value="">Year</option>
          {yearOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
      <p className={`mt-1 text-[10px] ${value && !validMonthYear(value) ? 'text-red-500' : 'text-slate-400'}`}>{value && !validMonthYear(value) ? 'Select both month and year.' : `MM/YYYY${required ? ' *' : ''}`}</p>
    </div>
  )
}

function RoleInterviewInstructions() {
  return (
    <section className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-slate-700">
      <p className="font-semibold text-[#172033]">Dear Participant,</p>
      <p className="mt-2 leading-6">The purpose of this document is to understand your career history, your role, the highlights of your career and the challenging situations you have faced. Please spend some time reflecting on your career and the situations you have navigated before you begin.</p>
      <p className="mt-2 font-semibold text-[#1e5fba]">This form is mandatory and forms part of your Development Centre journey.</p>
      <div className="mt-4 border-t border-blue-200 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#1e5fba]">Why this matters</h2>
        <p className="mt-2 leading-6">Your assessors read this form before the Development Centre. It gives them the context of your role, your career and the situations you have handled, so that they can understand you as an individual rather than assess you in isolation. The richer your inputs, the more relevant and useful your feedback and your final report will be.</p>
      </div>
      <div className="mt-4 border-t border-blue-200 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#1e5fba]">How to fill it</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-6">
          <li>Please answer every required field. Only the first Career Transition is mandatory; the second and third are optional. The third Highlight and third Challenge are also optional.</li>
          <li>Please write in as much detail as you need. There is no word limit, and a considered answer is far more useful than a brief one.</li>
          <li>Please do not enter placeholder text such as NA, N/A, None, hyphens, dots or any other special characters in place of an answer. If a question genuinely does not apply to you, write a line explaining why.</li>
          <li>For Highlights and Challenges, please mention the initiative or event, what prompted it, and what made it a significant accomplishment or a difficult situation to overcome.</li>
          <li>Your responses save as you go. You may return and edit at any time before the deadline.</li>
          <li>After the deadline, the submitted form cannot be edited.</li>
        </ol>
      </div>
    </section>
  )
}

function ReflectionMeta({ value }) {
  const text = String(value || '').trim()
  const placeholder = placeholderPattern.test(text)
  return (
    <div className="mt-1 flex justify-between text-[10px]">
      <span className={text && !validReflection(text) ? 'text-red-500' : 'text-slate-400'}>{placeholder ? 'Please write a response rather than a placeholder.' : 'Minimum 15 characters'}</span>
      <span className={validReflection(text) ? 'text-emerald-600' : 'text-slate-400'}>{text.length} characters</span>
    </div>
  )
}

export default function RoleInterview() {
  const { user, participantData, refreshParticipantData } = useUser()
  const [answers, setAnswers] = useState({})
  const [status, setStatus] = useState('draft')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [canEdit, setCanEdit] = useState(true)
  const [cutoff, setCutoff] = useState(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle')
  const submittedSnapshot = useRef({})
  const firstQuestionRef = useRef(null)

  useEffect(() => {
    if (!user?.participantId) return
    api.getParticipantWork(user.participantId, 'role-interview')
      .then(({ data }) => {
        setAnswers(data.answers || {})
        submittedSnapshot.current = data.answers || {}
        setStatus(data.status || 'draft')
        setCanEdit(data.canEdit !== false)
        setEditing(false)
        setCutoff(data.cutoff || null)
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setDraftLoaded(true))
  }, [user?.participantId])

  const set = (key, value) => setAnswers((current) => ({ ...current, [key]: value }))
  const completed = shortRequiredKeys.filter((key) => key.endsWith('_duration') ? validMonthYear(answers[key]) : validShort(answers[key])).length + reflectionKeys.filter((key) => validReflection(answers[key])).length
  const complete = completed === allRequiredKeys.length

  function startEditing() {
    setEditing(true)
    window.requestAnimationFrame(() => firstQuestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  useEffect(() => {
    if (!draftLoaded || !user?.participantId || !canEdit || (status === 'submitted' && !editing)) return
    setAutoSaveStatus('saving')
    const timeout = window.setTimeout(() => {
      api.saveParticipantWork(user.participantId, 'role-interview', answers, false)
        .then(() => setAutoSaveStatus('saved'))
        .catch(() => setAutoSaveStatus('idle'))
    }, 800)
    return () => window.clearTimeout(timeout)
  }, [answers, canEdit, draftLoaded, editing, status, user?.participantId])

  async function save(submit) {
    setSaving(true)
    setMessage('')
    try {
      const { data } = await api.saveParticipantWork(user.participantId, 'role-interview', answers, submit)
      setStatus(data.status)
      if (submit) {
        submittedSnapshot.current = data.answers || answers
        setEditing(canEdit)
        await refreshParticipantData(user.participantId)
      }
      setMessage(submit ? '' : 'Draft saved.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  const profile = [
    ['Name', user?.name],
    ['Ticket No', user?.employeeId],
    ['Designation', user?.designation],
    ['Current BU', user?.bu],
    ['Level', participantData?.masterData?.jobLevel],
    ['Chart Level', participantData?.masterData?.positionLevel],
    ['Date of Joining', participantData?.masterData?.['DOJ_4']],
    ['Email', user?.email],
  ]

  return (
    <div className="p-6">
      <div className="mb-5 flex gap-2 text-xs text-gray-400"><Link to="/participant/dashboard">Dashboard</Link><span>/</span><span>Role Interview</span></div>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">Role Interview</h1>
          {status === 'submitted' && <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Submitted</span>}
          {status === 'submitted' && canEdit && !editing && <button type="button" onClick={startEditing} className="rounded-md bg-[#1e5fba] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#0e3f87]">Edit Submission</button>}
        </div>
        <p className="mt-1 text-sm text-gray-500">Career history, current role, highlights and challenges · {completed}/{allRequiredKeys.length} required fields complete</p>
        {autoSaveStatus !== 'idle' && <p className={`mt-1 text-xs ${autoSaveStatus === 'saved' ? 'text-emerald-600' : 'text-slate-400'}`}>{autoSaveStatus === 'saved' ? 'Saved automatically' : 'Saving...'}</p>}
      </div>
      <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${canEdit ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        <strong>{canEdit ? 'You can edit your responses until the cutoff date' : 'The cutoff date has passed'}</strong>
        <span className="ml-1">{canEdit ? `— ${cutoff ? new Date(cutoff).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the deadline configured for your cohort'}. You may submit now and return to edit before this deadline.` : '— this form is now read-only.'}</span>
      </div>
      {message && status !== 'submitted' && <div className="mb-4 rounded-lg border bg-white px-4 py-3 text-sm">{message}</div>}
      {status === 'submitted' && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="text-sm font-semibold text-emerald-800">Role Interview submitted</p><p className="mt-0.5 text-xs text-emerald-700">{canEdit ? `Editable until ${cutoff ? new Date(cutoff).toLocaleDateString('en-GB') : 'the cohort cutoff'}.` : 'The cutoff has passed and this submission is now locked.'}</p></div>}
      <section className="mb-5 rounded-xl border bg-slate-50 p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Participant details</h2>
        <div className="grid gap-3 sm:grid-cols-2">{profile.map(([label, value]) => <div key={label}><span className="text-xs text-slate-400">{label}</span><p className="text-sm font-semibold">{value || '—'}</p></div>)}</div>
      </section>
      <RoleInterviewInstructions />
      <fieldset ref={firstQuestionRef} disabled={!canEdit || (status === 'submitted' && !editing)} className="scroll-mt-6 space-y-5">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-1 font-semibold">Last 3 Career Transitions</h2>
          <p className="mb-4 text-xs leading-5 text-slate-500">List the last 3 roles you have held over your career, with designation, BU and duration.</p>
          {transitions.map(({ n, fields }) => { const required = n === 1; return <div key={n} className="mb-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1e5fba]">Transition {n}{required ? <span className="text-red-500"> *</span> : <span className="ml-1 font-normal normal-case text-slate-400">(Optional)</span>}</p><div className="grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">{fields.map(([key, label]) => {
            const answerKey = `transition${n}_${key}`
            return key === 'duration'
              ? <MonthYearSelect key={key} required={required} value={answers[answerKey]} onChange={(value) => set(answerKey, value)} />
              : <input required={required} key={key} value={answers[answerKey] || ''} onChange={(event) => set(answerKey, event.target.value)} placeholder={`${label}${required ? ' *' : ''}`} className="rounded-lg border px-3 py-2 text-sm" />
          })}</div></div>})}
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-1 font-semibold">Summary of current role and responsibilities</h2>
          <p className="mb-4 text-xs leading-5 text-slate-500">Describe what you are accountable for today, the size and scope of your role, and who you work with most closely.</p>
          <input required value={answers.currentRole || ''} onChange={(event) => set('currentRole', event.target.value)} placeholder="Current role / designation *" className="mb-3 w-full rounded-lg border px-3 py-2 text-sm" />
          <textarea required rows={6} value={answers.responsibilities || ''} onChange={(event) => set('responsibilities', event.target.value)} placeholder="Describe your role and responsibilities *" className="w-full rounded-lg border px-4 py-3 text-sm" />
          <ReflectionMeta value={answers.responsibilities} />
        </section>
        {[
          ['Highlights', 'Share two or three accomplishments from the last two years. For each, mention the initiative, what prompted it, and what makes it significant to you.'],
          ['Challenges', 'Share events or initiatives from the last two years that you found challenging. For each, mention what prompted it and the obstacles you had to overcome.'],
        ].map(([title, hint]) => <section key={title} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{title}</h2><p className="mb-4 text-xs leading-5 text-slate-500">{hint}</p>{[1, 2, 3].map((n) => { const key = `${title.toLowerCase().slice(0, -1)}${n}`; const optional = n === 3; return <div key={n} className="mb-4"><label className="mb-1 block text-xs font-semibold text-slate-600">{title.slice(0, -1)} {n}{optional ? <span className="ml-1 font-normal text-slate-400">(Optional)</span> : <span className="text-red-500"> *</span>}</label><textarea required={!optional} rows={4} value={answers[key] || ''} onChange={(event) => set(key, event.target.value)} placeholder={`Describe ${title.toLowerCase().slice(0, -1)} ${n}...`} className="w-full rounded-lg border px-4 py-3 text-sm" />{(!optional || answers[key]) && <ReflectionMeta value={answers[key]} />}</div>})}</section>)}
      </fieldset>
      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><strong>Please review your responses before submitting.</strong> You may edit your submission until the cohort cutoff. Timelines are sacrosanct and will not be extended.</div>
      <div className="sticky bottom-0 mt-5 flex justify-end gap-3 border-t bg-[#f4f7fb]/95 py-4">{status !== 'submitted' && <button disabled={saving || !canEdit} onClick={() => save(false)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Save Draft</button>}{status === 'submitted' && !editing && canEdit && <button type="button" onClick={startEditing} className="rounded-lg bg-[#1e4d8c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#153d70]">Edit Submission</button>}{status === 'submitted' && !editing && !canEdit && <button disabled className="rounded-lg border border-emerald-200 bg-emerald-100 px-5 py-2 text-sm font-semibold text-emerald-700">Submitted</button>}{editing && <button disabled={saving} onClick={() => { setAnswers(submittedSnapshot.current); setEditing(false) }} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Cancel</button>}{(status !== 'submitted' || editing) && <button disabled={saving || !canEdit || !complete} onClick={() => save(true)} className="rounded-lg bg-[#1e4d8c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">{editing ? 'Save Changes' : 'Submit'}</button>}</div>
    </div>
  )
}
