import { useState } from 'react'
import { Link } from 'react-router-dom'

const questions = [
  { id: 1, question: 'How do you describe your leadership style, and how has it evolved in the last 2–3 years?', hint: 'Think about moments that shaped your style. What feedback have you received from your team?' },
  { id: 2, question: 'What are your top 2–3 strengths as a leader? Provide specific examples that demonstrate each.', hint: 'Use examples from your current or recent roles. Be specific — avoid generic statements.' },
  { id: 3, question: 'What are 2–3 areas where you know you need to grow to be effective at the next level?', hint: 'Reflect honestly. What have your managers, peers, or 360 feedback told you in the past?' },
  { id: 4, question: 'Describe a situation where you had to lead through significant ambiguity or change. What did you do and what was the outcome?', hint: 'Focus on your role in navigating the situation, not just the outcome.' },
  { id: 5, question: 'How do you build and sustain high-performing teams? What is your approach to developing talent in your team?', hint: 'Include examples of how you have coached, challenged, or supported team members.' },
  { id: 6, question: 'Describe a time you had to influence key stakeholders — internal or external — without direct authority. How did you approach it?', hint: 'What was the context? What tactics worked? What would you do differently?' },
  { id: 7, question: 'What has been your most complex cross-functional challenge in the last 2 years, and how did you navigate it?', hint: 'Focus on complexity — competing priorities, multiple stakeholders, resource constraints.' },
  { id: 8, question: 'How do you stay current with industry, market, and functional developments? How does this inform your decisions?', hint: 'Be specific about sources, habits, and 1–2 examples where external insight influenced a call.' },
  { id: 9, question: 'Describe a decision where you had to make a tough trade-off — between short-term and long-term, or between two competing goods. What guided your choice?', hint: 'What was at stake? Who was affected? How did it turn out?' },
  { id: 10, question: 'What do you want to get out of this DC? What kind of leader do you aspire to be 3 years from now?', hint: 'Be honest and forward-looking. This helps your assessors understand your aspirations.' },
]

export default function PreWork() {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [activeHint, setActiveHint] = useState<number | null>(null)

  const answeredCount = Object.values(answers).filter((v) => v.trim().length > 0).length
  const canSubmit = answeredCount === questions.length

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1a1f2e]">Pre-Work</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1f2e]">Pre-Work Questionnaire</h1>
          <p className="text-sm text-gray-500 mt-0.5">10 self-reflection questions · Due 20 Jun 2025</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#1e4d8c]">{answeredCount}<span className="text-sm text-gray-400 font-normal"> / 10</span></p>
          <p className="text-xs text-gray-400">Answered</p>
        </div>
      </div>

      <div className="mb-8">
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-[#1e4d8c] rounded-full h-1.5 transition-all duration-300" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          {canSubmit ? 'All questions answered — you can submit when ready.' : `${questions.length - answeredCount} question${questions.length - answeredCount !== 1 ? 's' : ''} remaining`}
        </p>
      </div>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-green-800 mb-1">Pre-Work submitted</h3>
          <p className="text-xs text-green-600">Your self-reflection responses are locked and ready for assessors.</p>
          <Link to="/participant/dashboard" className="mt-4 inline-block text-xs text-[#1e4d8c] font-medium hover:underline">← Back to Dashboard</Link>
        </div>
      ) : (
        <div className="space-y-5">
          {questions.map((q) => {
            const answered = (answers[q.id] ?? '').trim().length > 0
            return (
              <div key={q.id} className={`bg-white rounded-xl border p-6 transition-colors ${answered ? 'border-[#1e4d8c]/20' : 'border-[#e2e8f0]'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${answered ? 'bg-[#1e4d8c] text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {answered ? '✓' : q.id}
                  </span>
                  <p className="text-sm font-medium text-[#1a1f2e] leading-snug">{q.question}</p>
                </div>
                <button onClick={() => setActiveHint(activeHint === q.id ? null : q.id)} className="text-xs text-[#1e4d8c] ml-9 mb-3 hover:underline flex items-center gap-1">
                  ⓘ {activeHint === q.id ? 'Hide hint' : 'Show hint'}
                </button>
                {activeHint === q.id && (
                  <div className="ml-9 mb-3 bg-[#f1f4f9] rounded-lg px-4 py-2.5">
                    <p className="text-xs text-gray-500 italic">{q.hint}</p>
                  </div>
                )}
                <textarea
                  rows={4}
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Write your response here..."
                  style={{ marginLeft: '2.25rem', width: 'calc(100% - 2.25rem)' }}
                  className="px-4 py-3 rounded-lg border border-[#e2e8f0] text-sm text-[#1a1f2e] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent resize-none"
                />
              </div>
            )
          })}

          <div className="flex items-center justify-between py-4 border-t border-[#e2e8f0]">
            <div className="flex items-center gap-2">
              {saved && <p className="text-xs text-green-600 font-medium">✓ Draft saved</p>}
              <p className="text-xs text-gray-400">Auto-saved every 60 seconds</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Save Draft</button>
              <button disabled={!canSubmit} onClick={() => setSubmitted(true)} className="px-5 py-2 rounded-lg bg-[#1e4d8c] text-white text-sm font-medium hover:bg-[#183f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Submit & Lock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
