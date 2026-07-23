import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { api } from '../../lib/api'

const transitionFields = [['role', 'Role'], ['roleDescription', 'Role Description'], ['bu', 'BU'], ['duration', 'Duration']]
const transitions = [1, 2, 3].map((n) => ({ n, fields: transitionFields }))
const requiredKeys = ['currentRole', 'responsibilities', 'highlight1', 'highlight2', 'challenge1', 'challenge2']

export default function RoleInterview() {
  const { user, participantData } = useUser()
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
    api.getParticipantWork(user.participantId, 'role-interview')
      .then(({ data }) => {
        setAnswers(data.answers || {})
        submittedSnapshot.current = data.answers || {}
        setStatus(data.status || 'draft')
        setCanEdit(data.canEdit !== false)
        setCutoff(data.cutoff || null)
      })
      .catch((error) => setMessage(error.message))
  }, [user?.participantId])

  const set = (key, value) => setAnswers((current) => ({ ...current, [key]: value }))
  const complete = requiredKeys.every((key) => String(answers[key] || '').trim())

  async function save(submit) {
    setSaving(true)
    setMessage('')
    try {
      const { data } = await api.saveParticipantWork(user.participantId, 'role-interview', answers, submit)
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
        </div>
        <p className="mt-1 text-sm text-gray-500">Career history, current role, highlights and challenges</p>
      </div>
      {message && status !== 'submitted' && <div className="mb-4 rounded-lg border bg-white px-4 py-3 text-sm">{message}</div>}
      {status === 'submitted' && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"><div><p className="text-sm font-semibold text-emerald-800">Role Interview submitted</p><p className="mt-0.5 text-xs text-emerald-700">{canEdit ? `Editable until ${cutoff ? new Date(cutoff).toLocaleDateString('en-GB') : 'the cohort cutoff'}.` : 'The cutoff has passed and this submission is now locked.'}</p></div>{canEdit && !editing && <button onClick={() => setEditing(true)} className="rounded-md bg-[#1e5fba] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#0e3f87]">Edit Submission</button>}</div>}
      <section className="mb-5 rounded-xl border bg-slate-50 p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Participant details</h2>
        <div className="grid gap-3 sm:grid-cols-2">{profile.map(([label, value]) => <div key={label}><span className="text-xs text-slate-400">{label}</span><p className="text-sm font-semibold">{value || '—'}</p></div>)}</div>
      </section>
      <fieldset disabled={status === 'submitted' && !editing} className="space-y-5">
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-1 font-semibold">Last 3 years’ Career Transitions</h2>
          <p className="mb-4 text-xs text-slate-500">Add up to three recent roles.</p>
          {transitions.map(({ n, fields }) => <div key={n} className="mb-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-4">{fields.map(([key, label]) => <input key={key} value={answers[`transition${n}_${key}`] || ''} onChange={(event) => set(`transition${n}_${key}`, event.target.value)} placeholder={label} className="rounded-lg border px-3 py-2 text-sm" />)}</div>)}
        </section>
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-4 font-semibold">Summary of current role and responsibilities</h2>
          <input value={answers.currentRole || ''} onChange={(event) => set('currentRole', event.target.value)} placeholder="Current role / designation" className="mb-3 w-full rounded-lg border px-3 py-2 text-sm" />
          <textarea rows={6} value={answers.responsibilities || ''} onChange={(event) => set('responsibilities', event.target.value)} placeholder="Responsibilities" className="w-full rounded-lg border px-4 py-3 text-sm" />
        </section>
        {[['Highlights', 'Share two or three accomplishments from the last two years.'], ['Challenges', 'Share two or three challenging situations, obstacles and what you learned.']].map(([title, hint]) => <section key={title} className="rounded-xl border bg-white p-5"><h2 className="font-semibold">{title}</h2><p className="mb-4 text-xs text-slate-500">{hint}</p>{[1, 2, 3].map((n) => <textarea key={n} rows={4} value={answers[`${title.toLowerCase().slice(0, -1)}${n}`] || ''} onChange={(event) => set(`${title.toLowerCase().slice(0, -1)}${n}`, event.target.value)} placeholder={`${n}.`} className="mb-3 w-full rounded-lg border px-4 py-3 text-sm" />)}</section>)}
      </fieldset>
      <div className="sticky bottom-0 mt-5 flex justify-end gap-3 border-t bg-[#f4f7fb]/95 py-4">{status !== 'submitted' && <button disabled={saving} onClick={() => save(false)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Save Draft</button>}{status === 'submitted' && !editing && <button disabled className="rounded-lg border border-emerald-200 bg-emerald-100 px-5 py-2 text-sm font-semibold text-emerald-700">Submitted</button>}{editing && <button disabled={saving} onClick={() => { setAnswers(submittedSnapshot.current); setEditing(false) }} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Cancel</button>}{(status !== 'submitted' || editing) && <button disabled={saving || !complete} onClick={() => save(true)} className="rounded-lg bg-[#1e4d8c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">{editing ? 'Save Changes' : 'Submit'}</button>}</div>
    </div>
  )
}
