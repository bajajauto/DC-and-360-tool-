import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'

// Mock question bank – Peer variant (EX-to-LX DC)
const COMPETENCY_SECTIONS = [
  {
    id: 'gi',
    title: 'Generates Ideas',
    shortCode: 'GI',
    behaviours: [
      { id: 'gi-1', text: 'Uses a method to evaluate ideas for their effectiveness' },
      { id: 'gi-2', text: 'Synthesizes ideas from others' },
      { id: 'gi-3', text: 'Appreciates the merits in ideas shared by others' },
      { id: 'gi-4', text: 'Encourages others to share ideas' },
      { id: 'gi-5', text: 'When faced with a problem, is able to come up with new ideas' },
    ],
  },
  {
    id: 'spc',
    title: 'Solves Problems Creatively',
    shortCode: 'SPC',
    behaviours: [
      { id: 'spc-1', text: 'When faced with a problem, arrives at a clear problem statement' },
      { id: 'spc-2', text: 'Arrives at the root causes of a problem through analysis' },
      { id: 'spc-3', text: 'Identifies risks and organisation constraints' },
      { id: 'spc-4', text: 'When confronted with a problem, breaks it down into smaller components' },
      { id: 'spc-5', text: 'In the process of solving a problem, gets the required buy-in from the concerned stakeholders, including the team' },
      { id: 'spc-6', text: 'Adapts pre-existing solutions to resolve problems' },
      { id: 'spc-7', text: 'Reviews impact of newly tried out ideas' },
      { id: 'spc-8', text: "Evaluates solutions to see if they meet the customers' (internal/external) needs" },
      { id: 'spc-9', text: 'Continuously reviews progress towards goal achievement' },
      { id: 'spc-10', text: 'Implements corrective action to improve effectiveness' },
    ],
  },
  {
    id: 'cipc',
    title: 'Champions Improvement and Positive Change',
    shortCode: 'CIPC',
    behaviours: [
      { id: 'cipc-1', text: 'Looks for opportunities & Identifies the need for improvement/change' },
      { id: 'cipc-2', text: 'Visualizes the end state and makes a case for improvement/change' },
      { id: 'cipc-3', text: 'Identifies sponsor/s for change and gains buy in' },
      { id: 'cipc-4', text: 'Works to gain buy in from all stakeholders' },
      { id: 'cipc-5', text: 'Works to resolve resistance from all stakeholders (direct & indirect)' },
      { id: 'cipc-6', text: 'Defines clear milestones to mark and guide improvement/change' },
      { id: 'cipc-7', text: 'Resolves bottlenecks/blocks that emerge while executing improvement/change' },
      { id: 'cipc-8', text: 'Provides support/negotiates for infrastructure, tools, resources etc.' },
      { id: 'cipc-9', text: 'Tracks progress and implements course correction' },
      { id: 'cipc-10', text: 'Evaluates the outcome achieved and takes corrective actions for gap closure' },
      { id: 'cipc-11', text: 'Recognises/acknowledges/appreciates when milestones are reached' },
    ],
  },
  {
    id: 'dep',
    title: 'Develops and Engages People',
    shortCode: 'DEP',
    behaviours: [
      { id: 'dep-1', text: 'Builds and sustains a positive and engaging work relations with team, peers and external network to achieve goals' },
      { id: 'dep-2', text: 'Clearly articulates goals, roles, responsibilities & checks that the team (& others) understands the goals' },
      { id: 'dep-3', text: "Seeks the team's opinion about goals and key decisions" },
      { id: 'dep-4', text: 'Monitors and tracks people engagement' },
      { id: 'dep-5', text: 'Gives timely feedback' },
      { id: 'dep-6', text: 'Is open to receiving feedback' },
      { id: 'dep-7', text: 'Addresses and seeks to resolve conflicts while working towards solutions that benefit the organization' },
      { id: 'dep-8', text: 'Provides a safe environment for team members to take risks' },
      { id: 'dep-9', text: 'Assigns stretch goals to High Potentials in the team' },
      { id: 'dep-10', text: 'Provides training & development support to ensure individuals performance' },
      { id: 'dep-11', text: 'Encourages collaboration and team work among employees from diverse perspectives & backgrounds' },
      { id: 'dep-12', text: 'Engages in efforts to create a more inclusive work environment' },
      { id: 'dep-13', text: 'Challenges bias and stereotypes in workplace' },
    ],
  },
  {
    id: 'amt',
    title: 'Aligns and Motivates Team',
    shortCode: 'AMT',
    behaviours: [
      { id: 'amt-1', text: 'Appreciates and recognises individual and team efforts' },
      { id: 'amt-2', text: 'Removes any blocks/obstacles to performance faced by the team' },
      { id: 'amt-3', text: 'Takes on stretch goals for oneself' },
      { id: 'amt-4', text: 'Ensures that individuals meet their committed goal(s)' },
      { id: 'amt-5', text: 'Updates team of their progress towards achievement of goals' },
      { id: 'amt-6', text: 'Aligns own and team goals to organisation goals' },
      { id: 'amt-7', text: 'Conducts periodic reviews to check progress against milestones' },
    ],
  },
]

const TOTAL_BEHAVIOURS = COMPETENCY_SECTIONS.reduce((acc, s) => acc + s.behaviours.length, 0)

const RATING_LABELS = {
  1: 'Rarely',
  2: 'Occasionally',
  3: 'Often',
  4: 'Almost Always',
}

function RatingButton({ value, selected, onChange }) {
  const label = RATING_LABELS[value]

  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      aria-label={`${value}: ${label}`}
      className={`group relative w-10 h-8 rounded-md text-xs font-semibold transition-all border ${
        selected
          ? 'bg-[#1e4d8c] text-white border-[#1e4d8c]'
          : 'bg-white text-gray-500 border-[#e2e8f0] hover:border-[#1e4d8c] hover:text-[#1e4d8c]'
      }`}
    >
      {value}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max -translate-x-1/2 rounded-md bg-[#1a1f2e] px-2.5 py-1.5 text-[11px] font-medium leading-none text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </button>
  )
}

function BehaviourRow({ behaviour, rating, onRate, index }) {
  return (
    <div className={`flex items-center gap-4 py-3 ${index > 0 ? 'border-t border-[#f1f4f9]' : ''}`}>
      <p className="flex-1 text-sm text-[#1a1f2e] leading-snug pr-2">{behaviour.text}</p>
      <div className="flex items-center gap-1.5 shrink-0">
        {[1, 2, 3, 4].map((v) => (
          <RatingButton key={v} value={v} selected={rating === v} onChange={onRate} />
        ))}
      </div>
    </div>
  )
}

function CompetencySection({ section, ratings, sectionSsc, participantName, onRate, onSectionSscChange }) {
  const answered = section.behaviours.filter((b) => ratings[b.id] !== undefined).length
  const reflectionAnswered = ['start', 'continue', 'stop'].filter((key) => sectionSsc?.[key]?.trim()).length
  const allDone = answered === section.behaviours.length && reflectionAnswered === 3

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#1a1f2e]">{section.title} <span className="text-gray-400 font-normal">({section.shortCode})</span></h3>
          <p className="text-[10px] text-gray-400 mt-0.5">{answered} of {section.behaviours.length} answered</p>
        </div>
        {allDone && (
          <div className="flex items-center gap-1 text-green-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-medium">Complete</span>
          </div>
        )}
      </div>
      <div className="px-5 divide-y divide-[#f1f4f9]">
        {section.behaviours.map((b, i) => (
          <BehaviourRow
            key={b.id}
            behaviour={b}
            rating={ratings[b.id]}
            onRate={(val) => onRate(b.id, val)}
            index={i}
          />
        ))}
      </div>
      <div className="px-5 py-5 border-t border-[#e2e8f0] bg-[#f8f9fc]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold text-[#1a1f2e]">Start · Continue · Stop</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Reflect specifically on {section.title.toLowerCase()}.</p>
          </div>
          <span className="text-[10px] text-gray-400">{reflectionAnswered}/3 complete</span>
        </div>
        <div className="space-y-4">
          {[
            { key: 'start', label: 'Start', prompt: `What should ${participantName} start doing?`, colour: 'text-emerald-600', ring: 'focus:ring-emerald-200 focus:border-emerald-400' },
            { key: 'continue', label: 'Continue', prompt: `What should ${participantName} continue doing?`, colour: 'text-blue-600', ring: 'focus:ring-blue-200 focus:border-blue-400' },
            { key: 'stop', label: 'Stop', prompt: `What should ${participantName} stop doing?`, colour: 'text-rose-600', ring: 'focus:ring-rose-200 focus:border-rose-400' },
          ].map(({ key, label, prompt, colour, ring }) => (
            <div key={key}>
              <label className="block text-xs mb-1.5">
                <span className={`font-semibold ${colour}`}>{label}:</span>
                <span className="text-gray-500 ml-1.5">{prompt}</span>
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                rows={2}
                value={sectionSsc?.[key] ?? ''}
                onChange={(e) => onSectionSscChange(key, e.target.value)}
                placeholder={`Share an observation about ${section.title.toLowerCase()}...`}
                className={`w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm text-[#1a1f2e] placeholder-gray-300 focus:outline-none focus:ring-2 resize-none bg-white ${ring}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FeedbackForm() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { user, feedbackDrafts, saveFeedbackDraft, submitFeedbackTask } = useUser()

  const task = user?.respondentTasks.find((t) => t.id === taskId)
  const savedDraft = feedbackDrafts[taskId]

  const [ratings, setRatings] = useState(() => savedDraft?.ratings ?? {})
  const [sectionSsc, setSectionSsc] = useState(() => savedDraft?.sectionSsc ?? {})
  const [ssc, setSsc] = useState(() => savedDraft?.ssc ?? { start: '', continue: '', stop: '' })
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | saved
  const [submitted, setSubmitted] = useState(savedDraft?.submitted || task?.status === 'submitted')

  const answeredCount = Object.keys(ratings).length
  const sectionReflectionAnsweredCount = COMPETENCY_SECTIONS.reduce(
    (total, section) => total + ['start', 'continue', 'stop'].filter((key) => sectionSsc[section.id]?.[key]?.trim()).length,
    0,
  )
  const totalReflectionFields = COMPETENCY_SECTIONS.length * 3
  const requiredAnsweredCount = answeredCount + sectionReflectionAnsweredCount
  const requiredTotal = TOTAL_BEHAVIOURS + totalReflectionFields
  const progressPct = Math.round((requiredAnsweredCount / requiredTotal) * 100)
  const allRated = answeredCount === TOTAL_BEHAVIOURS
  const reflectionsComplete = sectionReflectionAnsweredCount === totalReflectionFields
  const canSubmit = allRated && reflectionsComplete
  const draftPayload = useMemo(() => ({ ratings, sectionSsc, ssc }), [ratings, sectionSsc, ssc])

  useEffect(() => {
    if (!taskId || submitted) return

    setSaveStatus('saving')
    const timeoutId = window.setTimeout(() => {
      saveFeedbackDraft(taskId, draftPayload)
      setSaveStatus('saved')
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [draftPayload, saveFeedbackDraft, submitted, taskId])

  const handleRate = useCallback((behaviourId, value) => {
    setRatings((prev) => ({ ...prev, [behaviourId]: value }))
  }, [])

  const handleSectionSsc = useCallback((sectionId, key, value) => {
    setSectionSsc((prev) => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [key]: value },
    }))
  }, [])

  function handleSaveDraft() {
    setSaveStatus('saving')
    saveFeedbackDraft(taskId, draftPayload)
    setSaveStatus('saved')
  }

  function handleSubmit() {
    if (!canSubmit) return
    submitFeedbackTask(taskId, draftPayload)
    setSubmitted(true)
  }

  if (!task) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Feedback task not found.</p>
        <button onClick={() => navigate('/respondent/dashboard')} className="mt-4 text-sm text-[#1e4d8c] hover:underline">
          ← Back to dashboard
        </button>
      </div>
    )
  }

  if (submitted) {
    return <SubmissionConfirmation task={task} onBack={() => navigate('/respondent/dashboard')} />
  }

  return (
    <div className="pb-32">
      {/* Sticky header with progress */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#e2e8f0] px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/respondent/dashboard')}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-[#1a1f2e] truncate">
                Feedback for <span className="text-[#1e4d8c]">{task.participantName}</span>
                <span className="text-gray-400 ml-1.5 font-normal">· {task.relationship}</span>
              </p>
              <span className="text-xs text-gray-400 shrink-0 ml-2">{requiredAnsweredCount}/{requiredTotal}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-[#1e4d8c] rounded-full h-1.5 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          {saveStatus === 'saving' && <span className="text-[10px] text-gray-400 shrink-0">Saving…</span>}
          {saveStatus === 'saved' && (
            <span className="text-[10px] text-green-600 shrink-0 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-6 space-y-6">
        {/* Welcome card */}
        <div className="bg-[#f0f6ff] border border-[#bfdbfe] rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1e4d8c] flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {task.participantInitials}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a1f2e]">Feedback for {task.participantName}</p>
              <p className="text-xs text-gray-500">{task.designation} · {task.bu}</p>
              <p className="text-xs text-[#1e4d8c] mt-2 leading-relaxed">
                You have been nominated to provide 360 feedback as a <span className="font-medium">{task.relationship}</span>. Your responses are confidential and will be aggregated with feedback from others before being shared. Please answer honestly based on what you have directly observed.
              </p>
            </div>
          </div>
        </div>

        {/* Rating scale legend */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] px-5 py-4">
          <p className="text-xs font-semibold text-[#1a1f2e] mb-3">Rating Scale</p>
          <div className="flex items-center gap-4 flex-wrap">
            {Object.entries(RATING_LABELS).map(([val, label]) => (
              <div key={val} className="flex items-center gap-1.5">
                <div className="w-7 h-6 rounded-md bg-[#1e4d8c] text-white text-[10px] font-semibold flex items-center justify-center">
                  {val}
                </div>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Competency sections */}
        {COMPETENCY_SECTIONS.map((section) => (
          <CompetencySection
            key={section.id}
            section={section}
            ratings={ratings}
            sectionSsc={sectionSsc[section.id]}
            participantName={task.participantName}
            onRate={handleRate}
            onSectionSscChange={(key, value) => handleSectionSsc(section.id, key, value)}
          />
        ))}

        {/* Start / Stop / Continue */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e2e8f0]">
            <h3 className="text-sm font-semibold text-[#1a1f2e]">Overall Feedback <span className="font-normal text-gray-400">(optional)</span></h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Add a final summary across all competencies if helpful.</p>
          </div>
          <div className="px-5 py-5 space-y-5">
            {[
              { key: 'start', label: 'Start', prompt: `What should ${task.participantName} start doing?`, colour: 'text-green-600' },
              { key: 'stop', label: 'Stop', prompt: `What should ${task.participantName} stop doing?`, colour: 'text-red-500' },
              { key: 'continue', label: 'Continue', prompt: `What should ${task.participantName} continue doing?`, colour: 'text-blue-600' },
            ].map(({ key, label, prompt, colour }) => (
              <div key={key}>
                <label className="block text-xs font-semibold mb-1.5">
                  <span className={colour}>{label}:</span>
                  <span className="text-gray-500 font-normal ml-1.5">{prompt}</span>
                </label>
                <textarea
                  rows={3}
                  value={ssc[key]}
                  onChange={(e) => setSsc((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="Type your response here…"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm text-[#1a1f2e] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-[#e2e8f0] px-6 py-3 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            {allRated
              ? reflectionsComplete
                ? 'All required fields complete - ready to submit.'
                : `${totalReflectionFields - sectionReflectionAnsweredCount} section reflection field${totalReflectionFields - sectionReflectionAnsweredCount > 1 ? 's' : ''} remaining before you can submit.`
              : `${TOTAL_BEHAVIOURS - answeredCount} rating${TOTAL_BEHAVIOURS - answeredCount > 1 ? 's' : ''} remaining before you can submit.`}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 text-sm font-medium text-[#1a1f2e] border border-[#e2e8f0] rounded-lg hover:bg-gray-50 transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
                canSubmit
                  ? 'bg-[#1e4d8c] text-white hover:bg-[#183f73]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Submit Final
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubmissionConfirmation({ task, onBack }) {
  return (
    <div className="p-8 max-w-lg mx-auto text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-[#1a1f2e] mb-2">Feedback Submitted</h2>
      <p className="text-sm text-gray-500 mb-1">
        Your feedback for <span className="font-medium text-[#1a1f2e]">{task.participantName}</span> has been recorded.
      </p>
      <p className="text-xs text-gray-400 mb-8">
        Responses are confidential and will be aggregated before appearing in the 360 report.
      </p>
      <button
        onClick={onBack}
        className="px-5 py-2.5 bg-[#1e4d8c] text-white text-sm font-medium rounded-lg hover:bg-[#183f73] transition-colors"
      >
        Back to My Tasks
      </button>
    </div>
  )
}
