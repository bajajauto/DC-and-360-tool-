import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useUser } from '../../context/UserContext'

const questions = [
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

const helperText = {
  q2: 'Think about how you are described outside work, by people who know you well.',
  q3: 'These should be different from the phrases above. Where they differ is often the interesting part.',
  q6: 'Consider feedback you have received from peers, managers, and direct reports, including any you found hard to hear.',
  q8: "Think of a time someone's reaction to you surprised you.",
  q9: 'Any character from mythology, film, politics, sport or history. Briefly explain why you chose them.',
  q10: 'This is for your own reflection. Consider what genuinely weighs on you, professionally or otherwise.',
}

const placeholderPattern = /^(?:n\/?a|none|nil|[^\p{L}\p{N}]+)$/iu
const validAnswer = (value) => {
  const text = String(value || '').trim()
  return text.length >= 15 && !placeholderPattern.test(text)
}

function PreWorkInstructions() {
  return (
    <section className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-slate-700">
      <p className="font-semibold text-[#172033]">Dear Participant,</p>
      <p className="mt-2 leading-6">This worksheet asks you to reflect on yourself: how you see yourself, how others experience you, and what drives you. There are no right or wrong answers here, and this is not an evaluation. It is a chance to think honestly about yourself before you begin the Development Centre.</p>
      <p className="mt-2 font-semibold text-[#1e5fba]">This form is mandatory and forms part of your Development Centre journey.</p>
      <div className="mt-4 border-t border-blue-200 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#1e5fba]">Why this matters</h2>
        <p className="mt-2 leading-6">Your assessors read your reflections before the Development Centre. Together with your Role Interview Form, this gives them a rounded understanding of you. It also prepares you: participants who reflect honestly beforehand consistently find their feedback conversations more meaningful. These inputs exist to support your development, not to evaluate you.</p>
      </div>
      <div className="mt-4 border-t border-blue-200 pt-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#1e5fba]">How to fill it</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-6">
          <li>Please answer all ten questions. Nothing should be left blank.</li>
          <li>Please write in as much detail as you need. A few honest sentences are worth more than a single word.</li>
          <li>Please do not enter placeholder text such as NA, N/A, None, hyphens, dots or any other special characters in place of an answer.</li>
          <li>Set aside a quiet 30 to 40 minutes. Your responses save as you go, so you may return and edit at any time before the deadline.</li>
          <li>After the deadline, the submitted form cannot be edited.</li>
        </ol>
      </div>
    </section>
  )
}

export default function PreWork() {
  const { user } = useUser()
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
    api.getParticipantWork(user.participantId, 'pre-work')
      .then(({ data }) => {
        const loadedAnswers = { ...(data.answers || {}) }
        if (String(loadedAnswers.q7 || '').trim() && !String(loadedAnswers.q6 || '').includes(String(loadedAnswers.q7).trim())) {
          loadedAnswers.q6 = [loadedAnswers.q6, loadedAnswers.q7].filter((value) => String(value || '').trim()).join('\n\n')
        }
        setAnswers(loadedAnswers)
        submittedSnapshot.current = loadedAnswers
        setStatus(data.status || 'draft')
        setCanEdit(data.canEdit !== false)
        setEditing(false)
        setCutoff(data.cutoff || null)
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setDraftLoaded(true))
  }, [user?.participantId])

  const answered = questions.filter(({ key }) => validAnswer(answers[key])).length

  function startEditing() {
    setEditing(true)
    window.requestAnimationFrame(() => firstQuestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  useEffect(() => {
    if (!draftLoaded || !user?.participantId || !canEdit || (status === 'submitted' && !editing)) return
    setAutoSaveStatus('saving')
    const timeout = window.setTimeout(() => {
      api.saveParticipantWork(user.participantId, 'pre-work', answers, false)
        .then(() => setAutoSaveStatus('saved'))
        .catch(() => setAutoSaveStatus('idle'))
    }, 800)
    return () => window.clearTimeout(timeout)
  }, [answers, canEdit, draftLoaded, editing, status, user?.participantId])

  async function save(submit) {
    setSaving(true)
    setMessage('')
    try {
      const { data } = await api.saveParticipantWork(user.participantId, 'pre-work', answers, submit)
      setStatus(data.status)
      if (submit) {
        submittedSnapshot.current = data.answers || answers
        setEditing(canEdit)
      }
      setMessage(submit ? '' : 'Draft saved.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex gap-2 text-xs text-gray-400">
        <Link to="/participant/dashboard">Dashboard</Link><span>/</span><span>Self Reflection</span>
      </div>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">Participant Self Reflection</h1>
          {status === 'submitted' && <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Submitted</span>}
          {status === 'submitted' && canEdit && !editing && <button type="button" onClick={startEditing} className="rounded-md bg-[#1e5fba] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#0e3f87]">Edit Submission</button>}
        </div>
        <p className="mt-1 text-sm text-gray-500">Self-Reflection Worksheet · All questions are mandatory · {answered}/{questions.length} answered</p>
        {autoSaveStatus !== 'idle' && <p className={`mt-1 text-xs ${autoSaveStatus === 'saved' ? 'text-emerald-600' : 'text-slate-400'}`}>{autoSaveStatus === 'saved' ? 'Saved automatically' : 'Saving...'}</p>}
      </div>
      <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${canEdit ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        <strong>{canEdit ? 'You can edit your responses until the cutoff date' : 'The cutoff date has passed'}</strong>
        <span className="ml-1">{canEdit ? `— ${cutoff ? new Date(cutoff).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the deadline configured for your cohort'}. You may submit now and return to edit before this deadline.` : '— this form is now read-only.'}</span>
      </div>
      {message && status !== 'submitted' && <div className="mb-4 rounded-lg border bg-white px-4 py-3 text-sm">{message}</div>}
      {status === 'submitted' && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="text-sm font-semibold text-emerald-800">Self Reflection submitted</p><p className="mt-0.5 text-xs text-emerald-700">{canEdit ? `Editable until ${cutoff ? new Date(cutoff).toLocaleDateString('en-GB') : 'the cohort cutoff'}.` : 'The cutoff has passed and this submission is now locked.'}</p></div>}
      <PreWorkInstructions />
      <div ref={firstQuestionRef} className="scroll-mt-6 space-y-4">
        {questions.map((question, index) => {
          const { key } = question
          return (
            <section key={key} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e4d8c] text-xs font-bold text-white">{index + 1}</span>
                <label className="flex-1 text-sm font-semibold leading-6">{question.text}<span className="ml-0.5 text-red-500">*</span></label>
                <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold uppercase text-red-600">Required</span>
              </div>
              {helperText[key] && <p className="mb-2 ml-9 text-xs leading-5 text-[#59708f]">{helperText[key]}</p>}
              <textarea
                required
                disabled={!canEdit || (status === 'submitted' && !editing)}
                rows={5}
                value={answers[key] || ''}
                onChange={(event) => setAnswers((value) => ({ ...value, [key]: event.target.value }))}
                placeholder="Write your reflection here..."
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50"
              />
              <div className="mt-1 flex justify-between text-[10px]">
                <span className={answers[key] && !validAnswer(answers[key]) ? 'text-red-500' : 'text-slate-400'}>{answers[key] && placeholderPattern.test(String(answers[key]).trim()) ? 'Please write a response rather than a placeholder.' : 'Minimum 15 characters'}</span>
                <span className={validAnswer(answers[key]) ? 'text-emerald-600' : 'text-slate-400'}>{String(answers[key] || '').trim().length} characters</span>
              </div>
            </section>
          )
        })}
      </div>
      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><strong>Please review your responses before submitting.</strong> You may edit your submission until the cohort cutoff. Timelines are sacrosanct and will not be extended.</div>
      <div className="sticky bottom-0 mt-5 flex justify-end gap-3 border-t bg-[#f4f7fb]/95 py-4">
        {status !== 'submitted' && <button disabled={saving || !canEdit} onClick={() => save(false)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Save Draft</button>}
        {status === 'submitted' && !editing && canEdit && <button type="button" onClick={startEditing} className="rounded-lg bg-[#1e4d8c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#153d70]">Edit Submission</button>}
        {status === 'submitted' && !editing && !canEdit && <button disabled className="rounded-lg border border-emerald-200 bg-emerald-100 px-5 py-2 text-sm font-semibold text-emerald-700">Submitted</button>}
        {editing && <button disabled={saving} onClick={() => { setAnswers(submittedSnapshot.current); setEditing(false) }} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Cancel</button>}
        {(status !== 'submitted' || editing) && <button disabled={saving || !canEdit || answered !== questions.length} onClick={() => save(true)} className="rounded-lg bg-[#1e4d8c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">{editing ? 'Save Changes' : 'Submit'}</button>}
      </div>
    </div>
  )
}
