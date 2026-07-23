import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useUser } from '../../context/UserContext'

const questions = [
  'What is the most important thing you have learned about yourself as a result of working in several positions as a leader?',
  'Using three short phrases, indicate how your close friends might describe you.',
  'Now describe yourself using three short phrases different from the above.',
  'What do you think are your strongest points?',
  'What three areas would you like to improve or change about yourself?',
  'If we were to talk with your direct reports, what would their criticisms be of you?',
  'If we were to talk with your peers or bosses, what would their criticisms be of you?',
  'Sometimes people misinterpret our personality. How do others see you differently from how you really think you are?',
  'If you picked a character from mythology, films, politics, sports or history who is closest to you psychologically, who would it be?',
  'Reflecting deep down inside yourself, what pressures would you say are at work on you?',
]

export default function PreWork() {
  const { user } = useUser()
  const [answers, setAnswers] = useState({})
  const [status, setStatus] = useState('draft')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [canEdit, setCanEdit] = useState(true)
  const [cutoff, setCutoff] = useState(null)
  const submittedSnapshot = useRef({})

  useEffect(() => {
    if (!user?.participantId) return
    api.getParticipantWork(user.participantId, 'pre-work')
      .then(({ data }) => {
        setAnswers(data.answers || {})
        submittedSnapshot.current = data.answers || {}
        setStatus(data.status || 'draft')
        setCanEdit(data.canEdit !== false)
        setCutoff(data.cutoff || null)
      })
      .catch((error) => setMessage(error.message))
  }, [user?.participantId])

  const answered = questions.filter((_, index) => String(answers[`q${index + 1}`] || '').trim()).length

  async function save(submit) {
    setSaving(true)
    setMessage('')
    try {
      const { data } = await api.saveParticipantWork(user.participantId, 'pre-work', answers, submit)
      setStatus(data.status)
      if (submit) {
        submittedSnapshot.current = data.answers || answers
        setEditing(false)
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
        <Link to="/participant/dashboard">Dashboard</Link><span>/</span><span>Pre-Work</span>
      </div>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">Participant Pre-Work</h1>
          {status === 'submitted' && <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Submitted</span>}
        </div>
        <p className="mt-1 text-sm text-gray-500">Self-Reflection Worksheet · All questions are mandatory · {answered}/{questions.length} answered</p>
      </div>
      {message && status !== 'submitted' && <div className="mb-4 rounded-lg border bg-white px-4 py-3 text-sm">{message}</div>}
      {status === 'submitted' && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"><div><p className="text-sm font-semibold text-emerald-800">Pre-Work submitted</p><p className="mt-0.5 text-xs text-emerald-700">{canEdit ? `Editable until ${cutoff ? new Date(cutoff).toLocaleDateString('en-GB') : 'the cohort cutoff'}.` : 'The cutoff has passed and this submission is now locked.'}</p></div>{canEdit && !editing && <button onClick={() => setEditing(true)} className="rounded-md bg-[#1e5fba] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#0e3f87]">Edit Submission</button>}</div>}
      <div className="space-y-4">
        {questions.map((question, index) => {
          const key = `q${index + 1}`
          return (
            <section key={key} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e4d8c] text-xs font-bold text-white">{index + 1}</span>
                <label className="flex-1 text-sm font-semibold leading-6">{question}<span className="ml-0.5 text-red-500">*</span></label>
                <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold uppercase text-red-600">Required</span>
              </div>
              <textarea
                required
                disabled={status === 'submitted' && !editing}
                rows={5}
                value={answers[key] || ''}
                onChange={(event) => setAnswers((value) => ({ ...value, [key]: event.target.value }))}
                placeholder="Write your reflection here..."
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50"
              />
            </section>
          )
        })}
      </div>
      <div className="sticky bottom-0 mt-5 flex justify-end gap-3 border-t bg-[#f4f7fb]/95 py-4">
        {status !== 'submitted' && <button disabled={saving} onClick={() => save(false)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Save Draft</button>}
        {status === 'submitted' && !editing && <button disabled className="rounded-lg border border-emerald-200 bg-emerald-100 px-5 py-2 text-sm font-semibold text-emerald-700">Submitted</button>}
        {editing && <button disabled={saving} onClick={() => { setAnswers(submittedSnapshot.current); setEditing(false) }} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Cancel</button>}
        {(status !== 'submitted' || editing) && <button disabled={saving || answered !== questions.length} onClick={() => save(true)} className="rounded-lg bg-[#1e4d8c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">{editing ? 'Save Changes' : 'Submit'}</button>}
      </div>
    </div>
  )
}
