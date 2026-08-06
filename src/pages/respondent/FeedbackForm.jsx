import { useState, useCallback, useEffect, useMemo } from 'react'
import { useOutletContext, useParams, useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Info, Lock, MessageSquare, X } from 'lucide-react'
import { useUser } from '../../context/UserContext'
import {
  getBehaviourIds,
  getRelationshipLabel,
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
      className={`flex h-[72px] w-[72px] flex-col items-center justify-center rounded-[10px] border text-sm font-semibold transition-all sm:h-[72px] sm:w-[84px] ${
        selected
          ? 'border-[#1e5fba] bg-[#1e5fba] text-white shadow-sm'
          : 'border-[#cfd8e5] bg-white text-[#172033] hover:border-[#1e5fba] hover:bg-[#f3f7fc]'
      }`}
    >
      <span>{value}</span>
      <span className={`mt-1 text-center text-[9px] font-medium uppercase leading-3 ${selected ? 'text-blue-100' : 'text-slate-500'}`}>
        {label}
      </span>
    </button>
  )
}

function BehaviourRow({ behaviour, rating, onRate, index }) {
  return (
    <div className={`grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center ${index > 0 ? 'border-t border-[#dfe5ee]' : ''}`}>
      <div className="min-w-0 pr-3">
        <p className="text-sm font-semibold leading-snug text-[#111827]">{behaviour.text}</p>
        {!!behaviour.indicators?.length && (
          <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
            {behaviour.indicators.map((indicator) => (
              <li key={indicator} className="flex gap-2">
                <span className="text-[#9bb4d2]">•</span>
                <span>{indicator}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 shrink-0">
        {[1, 2, 3, 4].map((v) => (
          <RatingButton key={v} value={v} selected={rating === v} onChange={onRate} />
        ))}
      </div>
    </div>
  )
}

function CompetencyBlock({ competency, ratings, onRate }) {
  return (
    <div>
      <h4 className="border-b border-[#dfe5ee] pb-2 text-xs font-bold uppercase tracking-[0.08em] text-[#59708f]">
        {competency.title}
      </h4>
      <div>
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

function SurveySection({ section, sectionNumber, ratings, comments, participantName, onRate, onCommentChange }) {
  const behaviours = section.competencies.flatMap((competency) => competency.behaviours)
  const answered = behaviours.filter((b) => ratings[b.id] !== undefined).length
  const commentKeys = ['start', 'stop', 'continue']
  const completedComments = commentKeys.filter((key) => hasMinimumComment(comments?.[key])).length
  const allDone = answered === behaviours.length && completedComments === commentKeys.length

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#d5dce5] bg-white shadow-[0_2px_12px_rgba(31,41,55,.04)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#d5dce5] px-6 py-5">
        <div>
          <h3 className="text-base font-semibold text-[#111827]">Section {sectionNumber}: {section.title}</h3>
          <p className="mt-1 text-[10px] text-gray-400">
            {answered} of {behaviours.length} ratings, {completedComments} of 3 comments complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#d5dce5] bg-[#f4f7fb] px-3 py-1.5 text-xs font-medium text-[#415a77]">{section.fourA}</span>
          {allDone && (
          <div className="flex items-center gap-1 text-green-600 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-medium">Complete</span>
          </div>
          )}
        </div>
      </div>

      <div className="space-y-7 px-6 py-5">
        {section.competencies.map((competency) => (
          <CompetencyBlock key={competency.id} competency={competency} ratings={ratings} onRate={onRate} />
        ))}
      </div>

      <div className="border-t border-[#d5dce5] bg-[#f8fafc] px-6 py-6">
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

function WelcomeModal({ task, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-[#172033]">Before you begin</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          <div className="rounded-xl bg-[#f0f6ff] p-5 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#1e5fba] text-white"><MessageSquare size={20} /></div>
            <h3 className="mt-3 text-lg font-semibold text-[#172033]">Welcome</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Thank you for taking the time to share your feedback for <strong>{task.participantName}</strong> as their <strong>{task.relationship}</strong>. Your perspective will help the Participant understand how others experience their strengths, contributions, and areas for growth.
            </p>
          </div>
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Lock size={16} />Your confidentiality is protected</p>
            <div className="mt-3 space-y-2.5 text-xs leading-5 text-emerald-900">
              <p className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0" />Individual responses are never shown to anyone, including the Participant.</p>
              <p className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0" />Feedback appears in the report only as aggregates per respondent group.</p>
              <p className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0" />A group score is displayed only when at least two respondents are in that group. Self, Reporting Manager, and Skip Manager / BU Head are exceptions.</p>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 p-4">
          <button type="button" onClick={onClose} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e5fba] px-4 py-3 text-sm font-semibold text-white hover:bg-[#174a92]">
            Continue to Instructions <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

function SurveyInstructions({ surveyVariant, totalRatings, onShowWelcome }) {
  return (
    <div className="max-w-[900px] rounded-[14px] border border-[#d5dce5] bg-white p-7 shadow-[0_2px_12px_rgba(31,41,55,.04)]">
      <h2 className="text-xl font-semibold text-[#172033]">Instructions</h2>
      <p className="mt-1 text-sm text-slate-500">Please read these before you begin. The form takes approximately 20–30 minutes.</p>

      <div className="mt-6">
        <section className="border-t border-[#cfd8e5] py-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#0757bd]">The Rating Scale</h3>
          <p className="mt-3 text-sm leading-6 text-[#324a68]">Please rate each behaviour based on how often you observe the Participant demonstrating it. Behavioural indicators appear in grey below each statement to guide your thinking.</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {Object.entries(RATING_LABELS).map(([value, label]) => (
              <div key={value} className="rounded-[10px] border border-[#c8d5e6] bg-[#edf3fa] px-3 py-3 text-center">
                <p className="text-lg font-semibold text-[#0757bd]">{value}</p>
                <p className="mt-0.5 text-[11px] text-[#324a68]">{label}</p>
              </div>
            ))}
          </div>
          {surveyVariant === SURVEY_VARIANTS.SENIOR_LEADER && <p className="mt-3 text-xs text-[#1e5fba]">Your role uses the shorter senior-leader subset of {totalRatings} behaviours.</p>}
        </section>

        <section className="border-t border-[#cfd8e5] py-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#0757bd]">Start, Stop, Continue</h3>
          <p className="mt-3 text-sm leading-6 text-[#324a68]">At the end of each section, you will be asked to share Start, Stop, and Continue feedback:</p>
          <dl className="mt-2.5 grid gap-2 text-sm leading-6 text-[#324a68]">
            <div className="grid grid-cols-[100px_1fr] gap-4"><dt className="font-semibold text-[#111827]">Start</dt><dd>Suggest behaviours, actions, or practices the individual should begin adopting to enhance their effectiveness.</dd></div>
            <div className="grid grid-cols-[100px_1fr] gap-4"><dt className="font-semibold text-[#111827]">Stop</dt><dd>Highlight behaviours or actions that may be limiting their impact and should be reduced or discontinued.</dd></div>
            <div className="grid grid-cols-[100px_1fr] gap-4"><dt className="font-semibold text-[#111827]">Continue</dt><dd>Reinforce strengths and positive behaviours that are working well and should be sustained.</dd></div>
          </dl>
        </section>

        <section className="border-t border-[#cfd8e5] pt-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#0757bd]">Please Note</h3>
          <p className="mt-3 text-sm leading-6 text-[#324a68]">
            Each response must be a minimum of {MIN_COMMENT_LENGTH} characters. Wherever possible, please use specific examples or instances, as this significantly enhances the quality and usefulness of the feedback. <strong className="font-semibold text-[#172033]">All rating fields and comments sections are mandatory.</strong>
          </p>
        </section>
      </div>

      <button type="button" onClick={onShowWelcome} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#c2ccda] px-3.5 py-2 text-xs font-semibold text-[#1e5fba] hover:bg-[#ebf2fa]">
        <Info size={15} /> Welcome & confidentiality
      </button>
    </div>
  )
}

export default function FeedbackForm({ returnTo = '/respondent/dashboard', taskIdOverride = null }) {
  const { taskId: routeTaskId } = useParams()
  const taskId = taskIdOverride || routeTaskId
  const navigate = useNavigate()
  const outletContext = useOutletContext()
  const setSurveyNavigation = outletContext?.setSurveyNavigation
  const { user } = useUser()
  const [loadedTask, setLoadedTask] = useState(null)

  const task = loadedTask || user?.respondentTasks.find((t) => t.id === taskId)
  const feedbackSubject = task?.relationship === 'Self' ? 'you' : task?.participantName
  const useWideParticipantLayout = returnTo.startsWith('/participant')
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
  const [currentStep, setCurrentStep] = useState(0)
  const [instructionsVisited, setInstructionsVisited] = useState(false)
  const [showWelcome, setShowWelcome] = useState(!useWideParticipantLayout)

  // Load existing draft/response from API on mount
  useEffect(() => {
    if (!taskId) return
    import('../../lib/api').then(({ api }) => {
      api.getFeedbackTask(taskId)
        .then((result) => {
          const taskData = result.data
          setLoadedTask({
            id: taskData.id,
            participantName: taskData.participantName,
            relationship: getRelationshipLabel(taskData.relationship),
            status: taskData.status,
            deadline: taskData.dueAt,
          })
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

  const sidebarItems = useMemo(() => [
    { step: 0, label: 'Instructions', complete: instructionsVisited },
    ...surveySections.map((section, index) => {
      const behaviours = section.competencies.flatMap((competency) => competency.behaviours)
      const ratingsComplete = behaviours.every((behaviour) => ratings[behaviour.id] !== undefined)
      const commentsComplete = ['start', 'stop', 'continue'].every((key) => hasMinimumComment(sectionSsc[section.id]?.[key]))
      return {
        step: index + 1,
        label: `Section ${index + 1}: ${section.title}`,
        complete: ratingsComplete && commentsComplete,
      }
    }),
  ], [instructionsVisited, ratings, sectionSsc, surveySections])

  const goToStep = useCallback((step) => {
    if (step > 0) setInstructionsVisited(true)
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!setSurveyNavigation || useWideParticipantLayout) return
    setSurveyNavigation({ currentStep, items: sidebarItems, onSelect: goToStep })
  }, [currentStep, goToStep, setSurveyNavigation, sidebarItems, useWideParticipantLayout])

  useEffect(() => () => {
    if (setSurveyNavigation) setSurveyNavigation(null)
  }, [setSurveyNavigation])

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
        <button onClick={() => navigate(returnTo)} className="mt-4 text-sm text-[#1e4d8c] hover:underline">
          Back to dashboard
        </button>
      </div>
    )
  }

  if (submitted) {
    return <SubmissionConfirmation task={task} onBack={() => navigate(returnTo)} />
  }

  const currentSection = currentStep > 0 ? surveySections[currentStep - 1] : null
  const sectionLabels = ['I', 'II', 'III', 'IV']

  return (
    <div className="pb-28">
      {showWelcome && <WelcomeModal task={task} onClose={() => setShowWelcome(false)} />}

      <div className="sticky top-0 z-20 border-b border-[#d5dce5] bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[1180px] items-center gap-4">
          <button
            onClick={() => navigate(returnTo)}
            className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Back to dashboard"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between">
              <p className="truncate text-xs font-medium text-[#1a1f2e]">
                Feedback for <span className="text-[#1e4d8c]">{task.participantName}</span>
                <span className="text-gray-400 ml-1.5 font-normal">- {task.relationship}</span>
              </p>
              <span className="ml-2 shrink-0 text-xs text-gray-400">{requiredAnsweredCount}/{requiredTotal}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-[#1e4d8c] transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <span className="hidden rounded-full border border-[#d5dce5] bg-[#f4f7fb] px-3 py-1 text-[10px] font-semibold text-slate-600 sm:inline-flex">
            {surveyVariant === SURVEY_VARIANTS.SENIOR_LEADER ? `Senior leader · ${totalRatings} statements` : `Standard · ${totalRatings} statements`}
          </span>
          {saveStatus === 'saving' && <span className="shrink-0 text-[10px] text-gray-400">Saving...</span>}
          {saveStatus === 'saved' && (
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-green-600"><Check size={12} />Saved</span>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-[1180px] space-y-4 px-5 pt-6 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs text-slate-400">360 Degree Feedback</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#172033]">
              {currentStep === 0 ? 'Instructions' : `Section ${sectionLabels[currentStep - 1]}: ${currentSection.title}`}
            </h1>
            {task.relationship !== 'Self' && <p className="mt-1 text-sm text-slate-500">Rate {task.participantName} only on behaviour you have personally observed.</p>}
          </div>
          <p className="text-xs text-slate-400">{currentStep === 0 ? 'Read before beginning' : `Section ${currentStep} of ${surveySections.length}`}</p>
        </div>

        {currentStep > 0 && (
          <div className="rounded-xl border border-[#d5dce5] bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600">
              {Object.entries(RATING_LABELS).map(([value, label]) => <span key={value}><strong className="text-[#172033]">{value}</strong> {label}</span>)}
              <span className="ml-auto text-slate-500">All ratings and comments are mandatory</span>
            </div>
          </div>
        )}

        {currentStep === 0 ? (
          <SurveyInstructions surveyVariant={surveyVariant} totalRatings={totalRatings} onShowWelcome={() => setShowWelcome(true)} />
        ) : (
          <SurveySection
            key={currentSection.id}
            section={currentSection}
            sectionNumber={sectionLabels[currentStep - 1]}
            ratings={ratings}
            comments={sectionSsc[currentSection.id]}
            participantName={feedbackSubject}
            onRate={handleRate}
            onCommentChange={(key, value) => handleSectionSsc(currentSection.id, key, value)}
          />
        )}
      </main>

      <div className={`fixed bottom-0 right-0 z-20 border-t border-[#e2e8f0] bg-white px-6 py-3 ${useWideParticipantLayout ? 'left-60' : 'left-60'}`}>
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            {currentStep === 0
              ? 'Your responses save automatically as you work.'
              : allRated
              ? reflectionsComplete
                ? 'All required fields complete - ready to submit.'
                : `${totalCommentFields - sectionReflectionAnsweredCount} section comment${totalCommentFields - sectionReflectionAnsweredCount > 1 ? 's' : ''} remaining before you can submit.`
              : `${totalRatings - answeredCount} rating${totalRatings - answeredCount > 1 ? 's' : ''} remaining before you can submit.`}
          </p>
          <div className="flex items-center gap-3">
            {currentStep > 0 && <button onClick={() => goToStep(currentStep - 1)} className="inline-flex items-center gap-1 rounded-lg border border-[#c2ccda] px-4 py-2 text-sm font-medium text-[#1a1f2e] hover:bg-gray-50"><ChevronLeft size={15} />Back</button>}
            {currentStep < surveySections.length ? (
              <button onClick={() => goToStep(currentStep + 1)} className="inline-flex items-center gap-1 rounded-lg bg-[#1e5fba] px-5 py-2 text-sm font-medium text-white hover:bg-[#174a92]">
                {currentStep === 0 ? `Begin: ${surveySections[0].title}` : `Next: ${surveySections[currentStep].title}`} <ChevronRight size={15} />
              </button>
            ) : (
              <>
                <button onClick={handleSaveDraft} className="rounded-lg border border-[#c2ccda] px-4 py-2 text-sm font-medium text-[#1a1f2e] hover:bg-gray-50">Save Draft</button>
                <button onClick={handleSubmit} disabled={!canSubmit} className={`rounded-lg px-5 py-2 text-sm font-medium ${canSubmit ? 'bg-[#1e5fba] text-white hover:bg-[#174a92]' : 'cursor-not-allowed bg-gray-100 text-gray-400'}`}>Submit Feedback</button>
              </>
            )}
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
        {task.relationship === 'Self'
          ? 'Submitted for yourself.'
          : <>Your feedback for <span className="font-medium text-[#1a1f2e]">{task.participantName}</span> has been recorded.</>}
      </p>
      <p className="text-xs text-gray-400 mb-8">
        Responses are confidential and will be aggregated before appearing in the 360° Feedback Report.
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
