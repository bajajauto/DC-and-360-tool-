import { useEffect, useState } from 'react'
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
  useEffect(() => { if (user?.participantId) api.getParticipantWork(user.participantId, 'pre-work').then(({ data }) => { setAnswers(data.answers || {}); setStatus(data.status || 'draft') }).catch((e) => setMessage(e.message)) }, [user?.participantId])
  const answered = questions.filter((_, index) => String(answers[`q${index + 1}`] || '').trim()).length
  async function save(submit) { setSaving(true); setMessage(''); try { const { data } = await api.saveParticipantWork(user.participantId, 'pre-work', answers, submit); setStatus(data.status); setMessage(submit ? 'Pre-Work submitted and locked.' : 'Draft saved.'); } catch (e) { setMessage(e.message) } finally { setSaving(false) } }
  return <div className="p-6"><div className="mb-5 flex gap-2 text-xs text-gray-400"><Link to="/participant/dashboard">Dashboard</Link><span>/</span><span>Pre-Work</span></div><div className="mb-5 flex items-start justify-between"><div><h1 className="text-xl font-bold">Participant Pre-Work</h1><p className="mt-1 text-sm text-gray-500">Self-Reflection Worksheet · {answered}/{questions.length} answered</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{status}</span></div>{message && <div className="mb-4 rounded-lg border bg-white px-4 py-3 text-sm">{message}</div>}<div className="space-y-4">{questions.map((question, index) => { const key=`q${index+1}`; return <section key={key} className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-3 flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e4d8c] text-xs font-bold text-white">{index+1}</span><label className="text-sm font-semibold leading-6">{question}</label></div><textarea disabled={status === 'submitted'} rows={5} value={answers[key] || ''} onChange={(e)=>setAnswers((value)=>({...value,[key]:e.target.value}))} placeholder="Write your reflection here..." className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50" /></section>})}</div>{status !== 'submitted' && <div className="sticky bottom-0 mt-5 flex justify-end gap-3 border-t bg-[#f4f7fb]/95 py-4"><button disabled={saving} onClick={()=>save(false)} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">Save Draft</button><button disabled={saving || answered !== questions.length} onClick={()=>save(true)} className="rounded-lg bg-[#1e4d8c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40">Submit & Lock</button></div>}</div>
}
