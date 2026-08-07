import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { api } from '../../lib/api'

const REL_LABELS = {
  'reporting-manager': 'Reporting Manager',
  'skip-manager': 'Skip / BU Head',
  peer: 'Peers / Internal Customers / External Stakeholders',
  'direct-report': 'Direct Reports',
}

const REL_REQUIREMENTS = {
  'reporting-manager': '1 or more',
  'skip-manager': '1 or more',
  peer: 'Minimum 4',
  'direct-report': 'Optional',
}

const addableRelationships = ['reporting-manager', 'skip-manager', 'peer', 'direct-report']
const RESTRICTED_POSITION_LEVELS = new Set(['MX', 'CX', 'DX', 'L0', 'L1'])
const RESTRICTED_RELATIONSHIPS = new Set(['peer', 'direct-report'])
const RESTRICTED_NOMINATION_MESSAGE = 'You cannot choose the selected user as your 360 respondent for this category. You may add them under the Reporting Manager, Skip Manager, or BU Head category (wherever applicable) instead.'
const MANAGER_IS_BU_HEAD_GUIDANCE = 'If your Reporting Manager is also the BU Head, please nominate another leader from the organization whose feedback you would like to receive under the Skip/BU Head category.'
const BLOCKED_SELF_SELECTION_MESSAGE = 'Selection of this user as a 360° respondent is restricted.'
const BLOCKED_SELF_SELECTION_EMPLOYEE_IDS = new Set(['26207', '36020', '10258', '54521'])
const BLOCKED_SELF_SELECTION_EMAILS = new Set(['pshrivastava@bajajauto.co.in', 'ajoseph@bajajauto.co.in', 'kpdsa@bajajauto.co.in', 'rsharma@bajajauto.co.in'])

const NOMINATION_CATEGORIES = [
  ['Self', 'Self-assessment completed by you.', '1', '1'],
  ['Reporting Manager', 'Your immediate reporting manager.', '1 or more', '1'],
  ['Skip / BU Head', 'Your skip-level manager or relevant BU Head.', '1 or more', '1'],
  ['Direct Reports', 'Team members (on-roll or off-roll) reporting directly to you, if applicable.', 'Optional', '0'],
  ['Peers / Internal Customers / External Stakeholders', 'Peers, internal customers, cross-functional partners, and external stakeholders who regularly interact with you.', '4 or more', '2'],
]

function RequirementsTable({ compact = false }) {
  const columnWidths = compact ? ['w-[25%]', 'w-[31%]', 'w-[20%]', 'w-[24%]'] : ['', '', '', '']
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-300">
      <table className={`w-full text-left ${compact ? 'table-fixed text-[10px]' : 'min-w-[760px] text-xs'}`}>
        <thead className="bg-[#a9c5f7] text-slate-900">
          <tr>{['Respondent Category', 'Description', 'Minimum Nominees Required', 'Minimum Responses Required for 360° Feedback Report Generation'].map((label, index) => <th key={label} className={`border-b border-r border-white font-bold last:border-r-0 ${columnWidths[index]} ${compact ? 'px-2.5 py-2.5 leading-[13px]' : 'px-3 py-2.5'}`}>{label}</th>)}</tr>
        </thead>
        <tbody className="bg-white">
          {NOMINATION_CATEGORIES.map((row) => <tr key={row[0]} className="border-b border-slate-200 last:border-0">{row.map((cell, index) => <td key={index} className={`border-r border-slate-200 align-top last:border-r-0 ${compact ? 'px-2.5 py-2 leading-[14px]' : 'px-3 py-2.5 leading-4'} ${index === 0 ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{cell}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}

const emptyDraft = () => ({ name: '', email: '', employeeId: '', isExternal: false, eligibilityError: '', directoryResults: [], directoryLoading: false, directorySelected: false, directoryOpen: false })
const createInitialDrafts = () => ({
  'reporting-manager': [emptyDraft()],
  'skip-manager': [emptyDraft()],
  peer: [emptyDraft(), emptyDraft(), emptyDraft(), emptyDraft()],
  'direct-report': [emptyDraft()],
})

function validate(nominees, participantEmail, participantEmployeeId) {
  const errors = []
  if (nominees.filter((n) => n.relationship === 'reporting-manager').length < 1) errors.push('At least 1 Reporting Manager required.')
  if (nominees.filter((n) => n.relationship === 'skip-manager').length < 1) errors.push('At least 1 Skip / BU Head required.')
  if (nominees.filter((n) => n.relationship === 'peer').length < 4) errors.push(`At least 4 Peers required (${nominees.filter((n) => n.relationship === 'peer').length} added).`)
  const emails = nominees.map((n) => n.email.trim().toLowerCase()).filter(Boolean)
  const employeeIds = nominees.map((n) => n.employeeId?.trim().toLowerCase()).filter(Boolean)
  if (new Set(emails).size !== emails.length || new Set(employeeIds).size !== employeeIds.length) errors.push('Each person can only be nominated once.')
  if (nominees.some((n) => !n.isExternal && !n.employeeId?.trim())) errors.push('Ticket ID is required for every internal respondent.')
  if (nominees.some((n) => n.email.trim().toLowerCase() === String(participantEmail || '').trim().toLowerCase()
    || (n.employeeId?.trim() && n.employeeId.trim().toLowerCase() === String(participantEmployeeId || '').trim().toLowerCase()))) {
    errors.push('You cannot nominate yourself. Your self survey is included automatically.')
  }
  return errors
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the date configured for your cohort'
}

function NominationInstructions({ nominationDeadline, feedbackCutoff, onAccept }) {
  const [accepted, setAccepted] = useState(false)
  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-5 flex items-center gap-2 text-xs text-gray-400"><Link to="/participant/dashboard">Dashboard</Link><span>/</span><span>360 Degree Nominations</span></div>
      <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white">
        <div className="bg-[#1e4d8c] px-6 py-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Before you begin</p>
          <h1 className="mt-1 text-2xl font-bold">360 Degree Nominations</h1>
          <p className="mt-3 text-sm font-semibold text-blue-50">Mandatory · Complete by {formatDate(nominationDeadline)} EOD</p>
        </div>
        <div className="space-y-7 p-6 text-sm leading-6 text-slate-700">
          <div><p className="font-semibold text-slate-900">Dear Participant,</p><p className="mt-2">As the next step in your development journey, please nominate the people who will provide your 360 Degree Feedback.</p><p className="mt-2">Your 360 feedback is one of the most valuable inputs in this entire process. It shapes your report, informs your assessors before the Development Centre, and forms the basis of your development conversations afterwards.</p></div>
          <div className="border-t pt-6"><h2 className="text-base font-bold text-[#1e4d8c]">Choosing the right respondents</h2><p className="mt-2">Nominate the people who see you work, not the people you get along with best. Choose stakeholders who observe your day-to-day behaviour, depend on your work, and can comment honestly on how you operate.</p><ul className="mt-3 space-y-2">
            <li><strong>Relevance over comfort.</strong> Include people who will give you a candid and balanced view, including those you find challenging to work with.</li>
            <li><strong>Range of perspectives.</strong> Cover different parts of your working world so your report reflects how you operate across the organisation.</li>
            <li><strong>Sufficient exposure.</strong> Nominate people who have worked with you closely enough, and recently enough, to comment meaningfully.</li>
            <li><strong>External stakeholders count.</strong> Vendors, dealers, partners and customers outside Bajaj Auto can be nominated.</li>
            <li><strong>Position-level restriction.</strong> Employees at MX, CX, DX, L0 or L1 cannot be nominated as Peers / Internal Customers / External Stakeholders or Direct Reports. They may be included only when they are your applicable Reporting Manager, Skip Manager or BU Head.</li>
          </ul></div>
          <div className="border-t pt-6"><h2 className="text-base font-bold text-[#1e4d8c]">Respondent categories and minimums</h2><p className="mt-2">The minimum response threshold protects individual respondent confidentiality.</p><div className="mt-4"><RequirementsTable /></div>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"><strong>Please read the last column carefully.</strong> It shows the minimum responses required from each category to generate the 360° Feedback Report. A value of 0 means responses from that category are not required for report generation.</div>
          </div>
          <div className="border-t pt-6"><h2 className="text-base font-bold text-[#1e4d8c]">Getting responses</h2><p className="mt-2">The onus of getting responses rests with you. Automated reminders may not be enough, so please tell your nominees why their input matters and follow up personally as the deadline approaches.</p><ul className="mt-3 list-disc space-y-1 pl-5"><li>You will receive a daily status email showing received and pending responses.</li><li>You can track the same progress on the Tool at any time.</li><li>Respondents receive an automated reminder every two days until they submit.</li></ul><p className="mt-3 font-semibold text-red-700">Feedback not completed by {formatDate(feedbackCutoff)} will not be included. Timelines are sacrosanct and will not be extended.</p></div>
          <div className="border-t pt-6"><h2 className="text-base font-bold text-[#1e4d8c]">Confidentiality</h2><p className="mt-2">Your respondents’ individual responses will remain confidential and will not be shared with you or any other individual. Feedback from Peers, Direct Reports and Stakeholders is combined and presented in aggregate form. Only feedback from the Reporting Manager and Skip-Level Manager / BU Head may be reported separately.</p><p className="mt-2">You will be able to see who has and has not responded so that you can follow up. You will not be able to see what any individual has said.</p></div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4"><input checked={accepted} onChange={(event) => setAccepted(event.target.checked)} type="checkbox" className="mt-1 h-4 w-4 accent-[#1e4d8c]" /><span><strong className="text-slate-900">I have read and understood these instructions.</strong><br /><span className="text-xs text-slate-600">I understand the category minimums, confidentiality thresholds, deadlines, and that final submission locks my nominee list.</span></span></label>
          <button disabled={!accepted} onClick={onAccept} className="w-full rounded-lg bg-[#1e4d8c] px-5 py-3 font-semibold text-white hover:bg-[#183f73] disabled:cursor-not-allowed disabled:opacity-40">Accept and continue to nominations</button>
        </div>
      </section>
    </div>
  )
}

function initials(name) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2)
}

export default function Nominees360() {
  const { user, refreshParticipantData } = useUser()
  const participantId = user?.participantId

  const [nominees, setNominees] = useState([])
  const [externalDrafts, setExternalDrafts] = useState(createInitialDrafts)
  const [mode, setMode] = useState('edit')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [validationAttempted, setValidationAttempted] = useState(false)
  const [checkingDraft, setCheckingDraft] = useState('')
  const directorySearchTimers = useRef({})
  const [cohort, setCohort] = useState({})
  const acceptanceKey = participantId ? `nomination-instructions-accepted:${participantId}` : ''
  const [instructionsAccepted, setInstructionsAccepted] = useState(() => participantId ? window.localStorage.getItem(`nomination-instructions-accepted:${participantId}`) === 'true' : false)

  useEffect(() => {
    function closeDirectoryDropdownsOnOutsideClick(event) {
      if (event.target.closest('[data-directory-dropdown]')) return
      setExternalDrafts((prev) => Object.fromEntries(
        Object.entries(prev).map(([relationship, drafts]) => [
          relationship,
          drafts.map((draft) => draft.directoryOpen || draft.directoryLoading || draft.directoryResults.length
            ? { ...draft, directoryOpen: false, directoryLoading: false, directoryResults: [] }
            : draft),
        ]),
      ))
    }

    document.addEventListener('mousedown', closeDirectoryDropdownsOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeDirectoryDropdownsOnOutsideClick)
  }, [])

  const isEditing = mode === 'edit'
  const isReviewing = mode === 'review'
  const submitted = mode === 'submitted'

  useEffect(() => {
    if (!participantId) return
    api.getParticipant(participantId)
      .then((result) => {
        const loaded = result.data.nominees || []
        setNominees(loaded)
        setCohort(result.data.cohort || {})
        if (loaded.some(n => n.status === 'submitted')) {
          setMode('submitted')
          setInstructionsAccepted(true)
        } else if (loaded.length > 0) {
          setMode('review')
        } else {
          setMode('edit')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [participantId])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      document.querySelectorAll('[data-route-scroll]').forEach((element) => {
        element.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [loading])

  function acceptInstructions() {
    if (acceptanceKey) window.localStorage.setItem(acceptanceKey, 'true')
    setInstructionsAccepted(true)
  }

  const errors = validate(nominees, user?.email, user?.employeeId)
  const grouped = {
    'reporting-manager': nominees.filter((n) => n.relationship === 'reporting-manager'),
    'skip-manager': nominees.filter((n) => n.relationship === 'skip-manager'),
    peer: nominees.filter((n) => n.relationship === 'peer'),
    'direct-report': nominees.filter((n) => n.relationship === 'direct-report'),
  }

  function updateExternalDraft(relationship, index, field, value) {
    setExternalDrafts((prev) => ({
      ...prev,
      [relationship]: prev[relationship].map((draft, draftIndex) => draftIndex === index ? { ...draft, [field]: value, eligibilityError: '' } : draft),
    }))
  }

  function updateDraftName(relationship, index, value) {
    const draftKey = `${relationship}:${index}`
    window.clearTimeout(directorySearchTimers.current[draftKey])
    const isExternal = externalDrafts[relationship][index]?.isExternal
    setExternalDrafts((prev) => ({
      ...prev,
      [relationship]: prev[relationship].map((draft, draftIndex) => draftIndex === index ? {
        ...draft,
        name: value,
        eligibilityError: '',
        directorySelected: false,
        directoryResults: [],
        directoryLoading: value.trim().length >= 2 && !draft.isExternal,
        directoryOpen: value.trim().length >= 2 && !draft.isExternal,
      } : draft),
    }))
    if (isExternal || value.trim().length < 2) return
    directorySearchTimers.current[draftKey] = window.setTimeout(async () => {
      try {
        const result = await api.searchEmployeeDirectory(participantId, value.trim())
        const directoryResults = result.data || []
        setExternalDrafts((prev) => ({
          ...prev,
          [relationship]: prev[relationship].map((draft, draftIndex) => draftIndex === index && draft.name === value ? {
            ...draft,
            directoryResults,
            directoryLoading: false,
            directoryOpen: directoryResults.length > 0,
          } : draft),
        }))
      } catch (err) {
        setExternalDrafts((prev) => ({
          ...prev,
          [relationship]: prev[relationship].map((draft, draftIndex) => draftIndex === index && draft.name === value ? { ...draft, directoryResults: [], directoryLoading: false, directoryOpen: false, eligibilityError: err.message } : draft),
        }))
      }
    }, 250)
  }

  function closeDirectoryDropdown(relationship, index) {
    const draftKey = `${relationship}:${index}`
    window.clearTimeout(directorySearchTimers.current[draftKey])
    setExternalDrafts((prev) => ({
      ...prev,
      [relationship]: prev[relationship].map((draft, draftIndex) => draftIndex === index ? {
        ...draft,
        directoryOpen: false,
        directoryResults: [],
        directoryLoading: false,
      } : draft),
    }))
  }

  function toggleExternalDraft(relationship, index, isExternal) {
    const draftKey = `${relationship}:${index}`
    window.clearTimeout(directorySearchTimers.current[draftKey])
    setExternalDrafts((prev) => ({
      ...prev,
      [relationship]: prev[relationship].map((draft, draftIndex) => draftIndex === index ? {
        ...draft,
        isExternal,
        employeeId: isExternal ? '' : draft.employeeId,
        positionLevel: isExternal ? undefined : draft.positionLevel,
        directoryResults: [],
        directoryLoading: false,
        directorySelected: false,
        directoryOpen: false,
        eligibilityError: '',
      } : draft),
    }))
  }

  function selectDirectoryEmployee(relationship, index, employee) {
    const employeeEmail = String(employee.email || '').trim().toLowerCase()
    const employeeId = String(employee.employeeId || '').trim().toLowerCase()
    const participantEmail = String(user?.email || '').trim().toLowerCase()
    const participantEmployeeId = String(user?.employeeId || '').trim().toLowerCase()
    const isSelfSelection = (employeeEmail && employeeEmail === participantEmail)
      || (employeeId && employeeId === participantEmployeeId)
    const otherDrafts = Object.entries(externalDrafts).flatMap(([draftRelationship, drafts]) => drafts.filter((_, draftIndex) => (
      draftRelationship !== relationship || draftIndex !== index
    )))
    const isDuplicateSelection = [...nominees, ...otherDrafts].some((nominee) => (
      (employeeEmail && String(nominee.email || '').trim().toLowerCase() === employeeEmail)
      || (employeeId && String(nominee.employeeId || '').trim().toLowerCase() === employeeId)
    ))

    if (isSelfSelection || isDuplicateSelection) {
      const message = isSelfSelection
        ? 'You cannot nominate yourself as a 360 respondent. Your self survey is included automatically.'
        : 'Each person can only be nominated once.'
      setExternalDrafts((prev) => ({
        ...prev,
        [relationship]: prev[relationship].map((draft, draftIndex) => draftIndex === index ? {
          ...draft,
          email: '',
          employeeId: '',
          positionLevel: undefined,
          directorySelected: false,
          directoryResults: [],
          directoryLoading: false,
          directoryOpen: false,
          eligibilityError: message,
        } : draft),
      }))
      window.alert(message)
      return
    }

    const isBlockedSelection = BLOCKED_SELF_SELECTION_EMPLOYEE_IDS.has(String(employee.employeeId || '').trim())
      || BLOCKED_SELF_SELECTION_EMAILS.has(String(employee.email || '').trim().toLowerCase())

    if (isBlockedSelection) {
      setExternalDrafts((prev) => ({
        ...prev,
        [relationship]: prev[relationship].map((draft, draftIndex) => draftIndex === index ? {
          ...draft,
          email: '',
          employeeId: '',
          positionLevel: undefined,
          directorySelected: false,
          directoryResults: [],
          directoryLoading: false,
          directoryOpen: false,
          eligibilityError: BLOCKED_SELF_SELECTION_MESSAGE,
        } : draft),
      }))
      window.alert(BLOCKED_SELF_SELECTION_MESSAGE)
      return
    }

    const isRestrictedSelection = RESTRICTED_RELATIONSHIPS.has(relationship)
      && RESTRICTED_POSITION_LEVELS.has(String(employee.positionLevel || '').trim().toUpperCase())

    if (isRestrictedSelection) {
      setExternalDrafts((prev) => ({
        ...prev,
        [relationship]: prev[relationship].map((draft, draftIndex) => draftIndex === index ? {
          ...draft,
          name: employee.name,
          email: '',
          employeeId: '',
          positionLevel: employee.positionLevel,
          directorySelected: false,
          directoryResults: [],
          directoryLoading: false,
          directoryOpen: false,
          eligibilityError: RESTRICTED_NOMINATION_MESSAGE,
        } : draft),
      }))
      return
    }

    setExternalDrafts((prev) => ({
      ...prev,
      [relationship]: prev[relationship].map((draft, draftIndex) => draftIndex === index ? {
        ...draft,
        name: employee.name,
        email: employee.email || '',
        employeeId: employee.employeeId,
        positionLevel: employee.positionLevel,
        directorySelected: true,
        directoryResults: [],
        directoryLoading: false,
        directoryOpen: false,
        eligibilityError: '',
      } : draft),
    }))
  }

  function sectionIssue(relationship) {
    if (relationship === 'reporting-manager' && grouped[relationship].length < 1) return 'Add at least one Reporting Manager.'
    if (relationship === 'skip-manager' && grouped[relationship].length < 1) return 'Add at least one Skip / BU Head.'
    if (relationship === 'peer' && grouped[relationship].length < 4) return `Add ${4 - grouped[relationship].length} more ${4 - grouped[relationship].length === 1 ? 'respondent' : 'respondents'} in this category.`
    const allEmails = nominees.map((nominee) => nominee.email.trim().toLowerCase())
    if (grouped[relationship].some((nominee) => allEmails.filter((email) => email === nominee.email.trim().toLowerCase()).length > 1)) return 'Remove the duplicate email address from this category.'
    if (grouped[relationship].some((nominee) => !nominee.isExternal && !nominee.employeeId?.trim())) return 'Add the missing Ticket ID for each internal respondent.'
    return ''
  }

  function promptInvalidSection() {
    setValidationAttempted(true)
    const firstInvalid = ['reporting-manager', 'skip-manager', 'peer', 'direct-report'].find((relationship) => sectionIssue(relationship))
    if (firstInvalid) {
      window.requestAnimationFrame(() => document.getElementById(`nominee-section-${firstInvalid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    }
  }

  async function addExternalNominee(relationship, index) {
    const draft = externalDrafts[relationship][index]
    const draftKey = `${relationship}:${index}`
    if (!draft.isExternal) {
      setCheckingDraft(draftKey)
      try {
        await api.checkNomineeEligibility(participantId, {
          email: draft.email.trim(),
          employeeId: draft.employeeId.trim(),
          isExternal: false,
          relationship,
        })
      } catch (err) {
        setExternalDrafts((prev) => ({
          ...prev,
          [relationship]: prev[relationship].map((item, draftIndex) => draftIndex === index ? { ...item, eligibilityError: err.message } : item),
        }))
        return
      } finally {
        setCheckingDraft('')
      }
    }
    setNominees((prev) => [
      ...prev,
      { id: `nominee-${relationship}-${Date.now()}`, name: draft.name.trim(), email: draft.email.trim(), employeeId: draft.isExternal ? '' : draft.employeeId.trim(), isExternal: draft.isExternal, relationship, source: draft.isExternal ? 'external' : 'manual' },
    ])
    setExternalDrafts((prev) => ({
      ...prev,
      [relationship]: prev[relationship].filter((_, draftIndex) => draftIndex !== index),
    }))
  }

  function renderNominee(n) {
    const isLocked = n.locked
    return (
      <div key={n.id ?? n.email} className={`flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5 mb-2 ${isLocked ? 'border-[#dbeafe]' : 'border-[#e2e8f0]'}`}>
        <div className="w-7 h-7 rounded-full bg-[#dbeafe] flex items-center justify-center text-[#1e4d8c] text-xs font-semibold shrink-0">{initials(n.name)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#1a1f2e] truncate">{n.name}</p>
          <p className="text-[10px] text-gray-400 truncate">{n.email}{n.employeeId ? ` · Ticket ID: ${n.employeeId}` : ''}{n.isExternal ? ' · External' : ''}</p>
        </div>
        {isEditing && !isLocked && (
          <button onClick={() => setNominees((prev) => prev.filter((x) => (x.id ?? x.email) !== (n.id ?? n.email)))} className="text-gray-300 hover:text-red-400 ml-1">x</button>
        )}
      </div>
    )
  }

  function renderAddControls(relationship) {
    if (!isEditing) return null
    if (!addableRelationships.includes(relationship)) return null
    const drafts = externalDrafts[relationship]

    return (
      <div className="mt-3 rounded-lg border border-[#e2e8f0] bg-[#f8f9fc] p-3">
          <div>
            <p className="text-xs font-semibold text-[#1a1f2e] mb-2">Add {REL_LABELS[relationship]}</p>
            <div className="space-y-3">
            {drafts.map((draft, index) => {
              const duplicateEmail = nominees.some((nominee) => nominee.email.toLowerCase() === draft.email.trim().toLowerCase())
                || Object.entries(externalDrafts).some(([otherRelationship, otherDrafts]) => otherDrafts.some((other, otherIndex) => (
                  (otherRelationship !== relationship || otherIndex !== index)
                  && other.email.trim()
                  && other.email.trim().toLowerCase() === draft.email.trim().toLowerCase()
                )))
              const duplicateEmployeeId = Boolean(draft.employeeId.trim()) && (
                nominees.some((nominee) => nominee.employeeId?.trim().toLowerCase() === draft.employeeId.trim().toLowerCase())
                || Object.entries(externalDrafts).some(([otherRelationship, otherDrafts]) => otherDrafts.some((other, otherIndex) => (
                  (otherRelationship !== relationship || otherIndex !== index)
                  && other.employeeId?.trim()
                  && other.employeeId.trim().toLowerCase() === draft.employeeId.trim().toLowerCase()
                )))
              )
              const draftKey = `${relationship}:${index}`
              const isChecking = checkingDraft === draftKey
              const canAdd = draft.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) && (draft.isExternal || draft.employeeId.trim()) && !duplicateEmail && !duplicateEmployeeId && !isChecking
              return <div key={index} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Nominee {grouped[relationship].length + index + 1}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="relative" data-directory-dropdown>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Start typing employee name"
                  value={draft.name}
                  onChange={(e) => updateDraftName(relationship, index, e.target.value)}
                  onBlur={() => closeDirectoryDropdown(relationship, index)}
                  className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c]"
                />
                {!draft.isExternal && draft.directoryOpen && draft.directoryLoading && <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">Searching employees…</div>}
                {!draft.isExternal && draft.directoryOpen && !draft.directoryLoading && draft.directoryResults?.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                    {draft.directoryResults.map((employee) => (
                      <button key={employee.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectDirectoryEmployee(relationship, index, employee)} className="block w-full border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-blue-50">
                        <span className="block text-xs font-semibold text-slate-900">{employee.name}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">{employee.email || 'Email not available — enter manually'} · Ticket ID: {employee.employeeId} · Level: {employee.positionLevel}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="email"
                placeholder="Email address"
                value={draft.email}
                onChange={(e) => updateExternalDraft(relationship, index, 'email', e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c]"
              />
              <input
                type="text"
                disabled={draft.isExternal}
                placeholder={draft.isExternal ? 'Ticket ID not required' : 'Ticket ID'}
                value={draft.employeeId}
                onChange={(e) => updateExternalDraft(relationship, index, 'employeeId', e.target.value)}
                className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] disabled:bg-slate-100"
              />
              <div className="flex items-center justify-between gap-3">
                {relationship === 'peer' ? <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={draft.isExternal} onChange={(event) => toggleExternalDraft(relationship, index, event.target.checked)} className="accent-[#1e4d8c]" />External stakeholder</label> : <span />}
              <button
                disabled={!canAdd}
                onClick={() => addExternalNominee(relationship, index)}
                className="px-4 py-2 rounded-lg border border-[#1e4d8c] text-[#1e4d8c] text-sm font-medium hover:bg-[#dbeafe] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isChecking ? 'Checking…' : 'Add'}
              </button>
              </div>
            </div>
            {duplicateEmail && <p className="mt-2 text-xs font-medium text-red-600">This email address is already in the nominee list.</p>}
            {duplicateEmployeeId && <p className="mt-2 text-xs font-medium text-red-600">This person is already in the nominee list under another category.</p>}
            {draft.directorySelected && <p className="mt-2 text-xs font-medium text-emerald-700">Employee selected from directory{draft.positionLevel ? ` · Position level ${draft.positionLevel}` : ''}.</p>}
            {draft.eligibilityError && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium leading-5 text-red-700">{draft.eligibilityError}</p>}
            </div>
            })}
            </div>
            <button type="button" onClick={() => setExternalDrafts((prev) => ({ ...prev, [relationship]: [...prev[relationship], emptyDraft()] }))} className="mt-3 rounded-lg border border-dashed border-[#1e4d8c] bg-blue-50 px-3 py-2 text-xs font-semibold text-[#1e4d8c] hover:bg-blue-100">+ Add More</button>
          </div>
      </div>
    )
  }

  function getVisibleRequirement(rel) {
    return REL_REQUIREMENTS[rel]
  }

  function minimumRequirementMet(rel) {
    if (rel === 'reporting-manager' || rel === 'skip-manager') return grouped[rel].length >= 1
    if (rel === 'peer') return grouped[rel].length >= 4
    return true
  }

  function requirementTone(rel) {
    if (minimumRequirementMet(rel)) return 'text-emerald-700'
    return validationAttempted ? 'text-red-600' : 'text-[#1e4d8c]'
  }

  async function handleSaveList() {
    if (errors.length > 0) {
      promptInvalidSection()
      return
    }
    if (!participantId) return
    setSaving(true)
    setError('')
    try {
      const result = await api.saveNominees(participantId, nominees.map(n => ({
        name: n.name,
        email: n.email,
        employeeId: n.employeeId || null,
        isExternal: Boolean(n.isExternal),
        designation: n.designation || null,
        relationship: n.relationship,
        source: n.source || 'manual',
        locked: n.locked || false,
      })))
      setNominees(result.data)
      await refreshParticipantData(participantId)
      setMode('review')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleFinalSubmit() {
    if (errors.length > 0) {
      promptInvalidSection()
      return
    }
    if (!participantId) return
    setSubmitting(true)
    setError('')
    try {
      const result = await api.submitNominees(participantId)
      setNominees(result.data)
      await refreshParticipantData(participantId)
      setMode('submitted')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-64" />
          <div className="h-48 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (!instructionsAccepted && !submitted) {
    return <NominationInstructions nominationDeadline={cohort.nominationDeadline} feedbackCutoff={cohort.threeSixtyCutoff} onAccept={acceptInstructions} />
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1a1f2e]">360 Nominees</span>
      </div>

      <div className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-bold text-[#1a1f2e]">360 Nominee Submission</h1>
        <p className="text-xs text-gray-400 mt-1">Add each respondent’s full name, email address and Ticket ID. Mark external stakeholders where applicable.</p></div>
        {!submitted && <button onClick={() => setInstructionsAccepted(false)} className="rounded-lg border border-[#163f73] bg-[#1e4d8c] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#163f73]">← Back to Instructions</button>}</div>
        {!isEditing && <p className="text-sm text-gray-500 mt-0.5">
          {isReviewing
            ? 'Review the saved nominee list before final submission. Links are sent only after final submit.'
            : 'Nominee list submitted. Emails have been sent to the selected respondents.'}
        </p>}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!submitted && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
          <p className="font-bold">How the nomination form works</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-5"><li>Add each respondent’s full name and email address. Tick External for anyone outside Bajaj Auto.</li><li>Check every email address carefully. An incorrect address means that person never receives the form.</li><li>Fill all required nominations before submitting. Submission launches your 360 and sends invitations immediately.</li><li>Once submitted, your nominee list is locked and cannot be changed later.</li></ol>
        </div>
      )}

      {!submitted && (
        <section className="mb-4 max-w-[760px] rounded-xl border border-[#e2e8f0] bg-white p-3">
          <div className="mb-2">
            <h2 className="text-[10px] font-bold uppercase tracking-wide text-[#1e4d8c]">Respondent categories and minimums</h2>
          </div>
          <RequirementsTable compact />
        </section>
      )}

      {submitted ? (
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden max-w-2xl">
          <div className="bg-green-50 border-b border-green-200 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-green-800">Nominees submitted ({nominees.length + 1} respondents including you)</h3>
                <p className="text-xs text-green-600 mt-0.5">Emails have been sent. Your BUHR can view this list.</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-b border-[#f1f4f9] flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted Nominees</p>
            <p className="text-xs text-gray-400">{nominees.length + 1} total</p>
          </div>
          <div className="divide-y divide-[#f1f4f9]">
            <div className="bg-amber-50 px-5 py-3.5">
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">ME</div>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-[#1a1f2e]">You (Self)</p><p className="text-xs text-gray-400">Automatically included for your self 360 survey</p></div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Self</span>
              </div>
            </div>
            {nominees.map((n) => (
                <div key={n.id} className="px-5 py-3.5">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#dbeafe] flex items-center justify-center text-[#1e4d8c] text-xs font-semibold shrink-0">
                      {initials(n.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1f2e] truncate">{n.name}</p>
                      <p className="text-xs text-gray-400 truncate">{n.email}</p>
                    </div>
                    <div className="hidden sm:block min-w-[150px] text-right">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {REL_LABELS[n.relationship] || n.relationship}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <div className="px-5 py-4 bg-[#f8f9fc]">
            <Link to="/participant/dashboard" className="text-xs text-[#1e4d8c] font-medium hover:underline">Back to Dashboard</Link>
          </div>
        </div>
      ) : (
        <div>
          <div>
            {isReviewing && (
              <div className="bg-blue-50 border border-[#bfdbfe] rounded-lg px-4 py-2.5 mb-4">
                <p className="text-xs text-[#1e4d8c]">This saved list will be used for final submission unless you edit it.</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Self</p><p className="mt-1 text-xs text-amber-700">Your self-assessment is automatically included.</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Included</span></div>
              </div>
              {Object.keys(grouped).map((rel) => (
                <div id={`nominee-section-${rel}`} key={rel} className={`rounded-xl border bg-white p-4 transition-colors ${validationAttempted && sectionIssue(rel) ? 'border-red-300 ring-2 ring-red-100' : 'border-[#e2e8f0]'}`}>
                  {(() => {
                    const visibleRequirement = getVisibleRequirement(rel)
                    return (
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{REL_LABELS[rel]}</p>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400">{grouped[rel].length} added</p>
                          {visibleRequirement && (
                            <p className={`text-xs font-semibold ${requirementTone(rel)}`}>{visibleRequirement}</p>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                  {rel === 'skip-manager' && (
                    <p className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs italic leading-5 text-[#1e4d8c]">
                      *{MANAGER_IS_BU_HEAD_GUIDANCE}
                    </p>
                  )}
                  {grouped[rel].length === 0
                    ? <p className="text-xs text-gray-300 italic pl-1">None added</p>
                    : grouped[rel].map(renderNominee)
                  }
                  {renderAddControls(rel)}
                  {validationAttempted && sectionIssue(rel) && <p className="mt-3 text-xs font-semibold text-red-600">{sectionIssue(rel)}</p>}
                </div>
              ))}
            </div>

            {grouped.peer.length === 4 && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><strong>Consider nominating a few more respondents.</strong> With exactly the minimum, a single non-response could prevent this group’s feedback from appearing in your report.</div>}

            <div className="mt-5 text-xs leading-5 text-slate-600">
              <p className="font-bold text-slate-800">On final submit</p>
              <p>Invitations are sent immediately to every respondent using their unique link. Your list is then locked and visible to your BUHR, and respondents cannot be changed afterwards.</p>
              <p className="mt-1 font-semibold text-red-700">Please review the nomination list before submitting.</p>
            </div>

            {isEditing ? (
              <div className="mt-5 flex justify-center">
              <button
                disabled={saving}
                onClick={handleSaveList}
                className="rounded-lg bg-[#1e4d8c] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#183f73] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save List'}
              </button>
              </div>
            ) : (
              <>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setMode('edit')}
                  className="flex-1 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#1a1f2e] text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Edit List
                </button>
                <button
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                  className="flex-1 py-2.5 rounded-lg bg-[#1e4d8c] text-white text-sm font-medium hover:bg-[#183f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Final Submit and Send Links'}
                </button>
              </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
