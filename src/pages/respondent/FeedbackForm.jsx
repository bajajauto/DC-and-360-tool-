import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import {
  getBehaviourIds,
  getRequiredQuestionTotal,
  getSurveySections,
  getSurveyVariant,
  MIN_COMMENT_LENGTH,
  RATING_LABELS,
  SURVEY_VARIANTS,
} from '../../data/surveyConfig'

function hasMinimumComment(value = '') {
  return value.trim().length >= MIN_COMMENT_LENGTH
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

function CompetencyBlock({ competency, ratings, onRate }) {
  const answered = competency.behaviours.filter((b) => ratings[b.id] !== undefined).length

  return (
    <div className="rounded-lg border border-[#e2e8f0] bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-[#e2e8f0] bg-[#fbfcfe] flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[#1a1f2e]">
          {competency.title} <span className="text-gray-400 font-normal">({competency.shortCode})</span>
        </h4>
        <span className="text-[10px] text-gray-400 shrink-0">
          {answered} of {competency.behaviours.length}
        </span>
      </div>
      <div className="px-4">
        {competency.behaviours.map((b, i) => (
          <BehaviourRow
            key={b.id}
            behaviour={b}
            rating={ratings[b.id]}
            onRate={(val) => onRate(b.id, val)}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}

function SectionCommentBox({ label, value, onChange, participantName, colour }) {
  const chars = value.trim().length
  const complete = chars >= MIN_COMMENT_LENGTH

  return (
    <div>
      <label className="block text-xs mb-1.5">
        <span className={`font-semibold ${colour}`}>{label}:</span>
        <span className="text-gray-500 ml-1.5">What should {participantName} {label.toLowerCase()} doing?</span>
        <span className="text-red-500 ml-1">*</span>
      </label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Use a specific example where possible..."
        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-[#1a1f2e] placeholder-gray-300 focus:outline-none focus:ring-2 resize-none bg-white ${
          complete
            ? 'border-[#bbf7d0] focus:ring-emerald-100 focus:border-emerald-400'
            : 'border-[#e2e8f0] focus:ring-[#dbeafe] focus:border-[#1e4d8c]'
        }`}
      />
      <p className={`text-[10px] mt-1 ${complete ? 'text-emerald-600' : 'text-gray-400'}`}>
        {chars}/{MIN_COMMENT_LENGTH} characters minimum
      </p>
    </div>
  )
}

function SurveySection({ section, ratings, comments, participantName, onRate, onCommentChange }) {
  const behaviours = section.competencies.flatMap((competency) => competency.behaviours)
  const answered = behaviours.filter((b) => ratings[b.id] !== undefined).length
  const commentKeys = ['start', 'stop', 'continue']
  const completedComments = commentKeys.filter((key) => hasMinimumComment(comments?.[key])).length
  const allDone = answered === behaviours.length && completedComments === commentKeys.length

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1a1f2e]">{section.title}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {answered} of {behaviours.length} ratings, {completedComments} of 3 comments complete
          </p>
        </div>
        {allDone && (
          <div className="flex items-center gap-1 text-green-600 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-medium">Complete</span>
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-4">
        {section.competencies.map((competency) => (
          <CompetencyBlock key={competency.id} competency={competency} ratings={ratings} onRate={onRate} />
        ))}
      </div>

      <div className="px-5 py-5 border-t border-[#e2e8f0] bg-[#f8f9fc]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-semibold text-[#1a1f2e]">Start, Stop and Continue</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{section.prompt}</p>
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">{completedComments}/3 complete</span>
        </div>
        <div className="space-y-4">
          <SectionCommentBox
            label="Start"
            value={comments?.start ?? ''}
            onChange={(value) => onCommentChange('start', value)}
            participantName={participantName}
            colour="text-emerald-600"
          />
          <SectionCommentBox
            label="Stop"
            value={comments?.stop ?? ''}
            onChange={(value) => onCommentChange('stop', value)}
            participantName={participantName}
            colour="text-rose-600"
          />
          <SectionCommentBox
            label="Continue"
            value={comments?.continue ?? ''}
            onChange={(value) => onCommentChange('continue', value)}
            participantName={participantName}
            colour="text-blue-600"
          />
        </div>
      </div>
    </div>
  )
}

function getValidRatingCount(ratings, behaviourIds) {
  return behaviourIds.filter((id) => ratings[id] !== undefined).length
}

function getCompletedCommentCount(sectionSsc, sections) {
  return sections.reduce(
    (total, section) =>
      total + ['start', 'stop', 'continue'].filter((key) => hasMinimumComment(sectionSsc[section.id]?.[key])).length,
    0,
  )
}

export default function FeedbackForm() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()

  const task = user?.respondentTasks.find((t) => t.id === taskId)
  const surveySections = useMemo(() => getSurveySections(task?.relationship), [task?.relationship])
  const surveyVariant = getSurveyVariant(task?.relationship)
  const behaviourIds = useMemo(() => getBehaviourIds(surveySections), [surveySections])
  const totalRatings = behaviourIds.length
  const totalCommentFields = surveySections.length * 3
  const requiredTotal = getRequiredQuestionTotal(task?.relationship)

  const [ratings, setRatings] = useState({})
  const [sectionSsc, setSectionSsc] = useState({})
  const [ssc, setSsc] = useState({ start: '', continue: '', stop: '' })
  const [saveStatus, setSaveStatus] = useState('idle')
  const [submitted, setSubmitted] = useState(task?.status === 'submitted')
  const [draftLoaded, setDraftLoaded] = useState(false)

  // Load existing draft/response from API on mount
  useEffect(() => {
    if (!taskId) return
    import('../../lib/api').then(({ api }) => {
      api.getFeedbackTask(taskId)
        .then((result) => {
          const taskData = result.data
          if (taskData.status === 'submitted') {
            setSubmitted(true)
          }
          const response = taskData.response
          if (response) {
            if (response.ratings) setRatings(response.ratings)
            if (response.sectionSsc) setSectionSsc(response.sectionSsc)
            if (response.overallSsc) setSsc(response.overallSsc)
          }
        })
        .catch(() => {})
        .finally(() => setDraftLoaded(true))
    })
  }, [taskId])

  const answeredCount = getValidRatingCount(ratings, behaviourIds)
  const sectionReflectionAnsweredCount = getCompletedCommentCount(sectionSsc, surveySections)
  const requiredAnsweredCount = answeredCount + sectionReflectionAnsweredCount
  const progressPct = Math.round((requiredAnsweredCount / requiredTotal) * 100)
  const allRated = answeredCount === totalRatings
  const reflectionsComplete = sectionReflectionAnsweredCount === totalCommentFields
  const canSubmit = allRated && reflectionsComplete
  const draftPayload = useMemo(() => ({ ratings, sectionSsc, ssc }), [ratings, sectionSsc, ssc])

  useEffect(() => {
    if (!taskId || submitted || !draftLoaded) return

    setSaveStatus('saving')
    const timeoutId = window.setTimeout(() => {
      import('../../lib/api').then(({ api }) => {
        api.saveFeedbackDraft(taskId, draftPayload)
          .then(() => setSaveStatus('saved'))
          .catch(() => setSaveStatus('idle'))
      })
    }, 800)

    return () => window.clearTimeout(timeoutId)
  }, [draftPayload, submitted, taskId, draftLoaded])

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
    import('../../lib/api').then(({ api }) => {
      api.saveFeedbackDraft(taskId, draftPayload)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('idle'))
    })
  }

  function handleSubmit() {
    if (!canSubmit) return
    import('../../lib/api').then(({ api }) => {
      api.submitFeedback(taskId, draftPayload)
        .then(() => setSubmitted(true))
        .catch(() => {})
    })
  }

  if (!task) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Feedback task not found.</p>
        <button onClick={() => navigate('/respondent/dashboard')} className="mt-4 text-sm text-[#1e4d8c] hover:underline">
          Back to dashboard
        </button>
      </div>
    )
  }

  if (submitted) {
    return <SubmissionConfirmation task={task} onBack={() => navigate('/respondent/dashboard')} />
  }

  return (
    <div className="pb-32">
      <div className="sticky top-0 z-10 bg-white border-b border-[#e2e8f0] px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/respondent/dashboard')}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-[#1a1f2e] truncate">
                Feedback for <span className="text-[#1e4d8c]">{task.participantName}</span>
                <span className="text-gray-400 ml-1.5 font-normal">- {task.relationship}</span>
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
          {saveStatus === 'saving' && <span className="text-[10px] text-gray-400 shrink-0">Saving...</span>}
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
        <div className="bg-[#f0f6ff] border border-[#bfdbfe] rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1e4d8c] flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {task.participantInitials}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a1f2e]">Feedback for {task.participantName}</p>
              <p className="text-xs text-gray-500">{task.designation} - {task.bu}</p>
              <p className="text-xs text-[#1e4d8c] mt-2 leading-relaxed">
                You have been nominated to provide 360 feedback as a <span className="font-medium">{task.relationship}</span>. Your responses are confidential and will be aggregated with feedback from others before being shared.
              </p>
              {surveyVariant === SURVEY_VARIANTS.SENIOR_LEADER && (
                <p className="text-[10px] text-[#1e4d8c] mt-2 leading-relaxed">
                  This version includes the shorter BU Head / Skip Manager behaviour subset selected for senior-leader visibility.
                </p>
              )}
            </div>
          </div>
        </div>

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

        {surveySections.map((section) => (
          <SurveySection
            key={section.id}
            section={section}
            ratings={ratings}
            comments={sectionSsc[section.id]}
            participantName={task.participantName}
            onRate={handleRate}
            onCommentChange={(key, value) => handleSectionSsc(section.id, key, value)}
          />
        ))}

        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e2e8f0]">
            <h3 className="text-sm font-semibold text-[#1a1f2e]">
              Overall Feedback <span className="font-normal text-gray-400">(optional)</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Add a final summary across all sections if helpful.</p>
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
                  placeholder="Type your response here..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#e2e8f0] text-sm text-[#1a1f2e] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-[#e2e8f0] px-6 py-3 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            {allRated
              ? reflectionsComplete
                ? 'All required fields complete - ready to submit.'
                : `${totalCommentFields - sectionReflectionAnsweredCount} section comment${totalCommentFields - sectionReflectionAnsweredCount > 1 ? 's' : ''} remaining before you can submit.`
              : `${totalRatings - answeredCount} rating${totalRatings - answeredCount > 1 ? 's' : ''} remaining before you can submit.`}
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
