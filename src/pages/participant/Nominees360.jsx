import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../../context/UserContext'

const ecDirectory = [
  { id: 'e1', name: 'Priya Menon', email: 'priya.menon@bajaj.com', designation: 'GM - Sales Strategy' },
  { id: 'e2', name: 'Vikram Sood', email: 'vikram.sood@bajaj.com', designation: 'VP - Operations' },
  { id: 'e3', name: 'Anika Kapoor', email: 'anika.kapoor@bajaj.com', designation: 'Manager - Digital Marketing' },
  { id: 'e4', name: 'Deepak Rajan', email: 'deepak.rajan@bajaj.com', designation: 'Manager - Brand Strategy' },
  { id: 'e5', name: 'Shalini Nair', email: 'shalini.nair@bajaj.com', designation: 'Senior Manager - Fleet' },
  { id: 'e6', name: 'Arjun Mehta', email: 'arjun.mehta@bajaj.com', designation: 'Senior Manager - EV Sales' },
  { id: 'e7', name: 'Kavitha S', email: 'kavitha.s@bajaj.com', designation: 'DM - Sales Analytics' },
  { id: 'e8', name: 'Ravi Kumar', email: 'ravi.kumar@bajaj.com', designation: 'DM - Sales Strategy' },
]

const REL_LABELS = {
  'reporting-manager': 'Reporting Manager',
  'skip-manager': 'Skip Manager',
  peer: 'Peer / Internal Customer',
  'direct-report': 'Direct Reportee',
}

const REL_REQUIREMENTS = {
  'reporting-manager': '1 or more',
  'skip-manager': 'Required',
  peer: 'Minimum 4',
  'direct-report': 'Optional, no cap',
}

const addableRelationships = ['reporting-manager', 'peer', 'direct-report']
const externalRelationships = ['peer', 'direct-report']

const emptyExternalDrafts = {
  'reporting-manager': { name: '', email: '' },
  peer: { name: '', email: '' },
  'direct-report': { name: '', email: '' },
}

const defaultNominees = [
  { id: 'e1', name: 'Priya Menon', email: 'priya.menon@bajaj.com', designation: 'GM - Sales Strategy', relationship: 'reporting-manager', source: 'ec', locked: true },
  { id: 'e2', name: 'Vikram Sood', email: 'vikram.sood@bajaj.com', designation: 'VP - Operations', relationship: 'skip-manager', source: 'ec', locked: true },
]

function validate(nominees) {
  const errors = []
  if (nominees.filter((n) => n.relationship === 'reporting-manager').length < 1) errors.push('At least 1 Reporting Manager required.')
  if (nominees.filter((n) => n.relationship === 'peer').length < 4) errors.push(`At least 4 Peers required (${nominees.filter((n) => n.relationship === 'peer').length} added).`)
  return errors
}

function initials(name) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2)
}

export default function Nominees360() {
  const { nomineeDraft, saveNominees, submitNominees } = useUser()
  const [nominees, setNominees] = useState(() => nomineeDraft?.nominees ?? defaultNominees)
  const [directorySearches, setDirectorySearches] = useState({ 'reporting-manager': '', peer: '', 'direct-report': '' })
  const [externalDrafts, setExternalDrafts] = useState(emptyExternalDrafts)
  const [mode, setMode] = useState(() => nomineeDraft?.submitted ? 'submitted' : nomineeDraft?.nominees ? 'review' : 'edit')
  const isEditing = mode === 'edit'
  const isReviewing = mode === 'review'
  const submitted = mode === 'submitted'

  const errors = validate(nominees)
  const grouped = {
    'reporting-manager': nominees.filter((n) => n.relationship === 'reporting-manager'),
    'skip-manager': nominees.filter((n) => n.relationship === 'skip-manager'),
    peer: nominees.filter((n) => n.relationship === 'peer'),
    'direct-report': nominees.filter((n) => n.relationship === 'direct-report'),
  }

  function getDirectoryMatches(relationship) {
    const search = directorySearches[relationship].trim().toLowerCase()

    return ecDirectory.filter((person) => {
      const isAlreadyAdded = nominees.some((n) => n.id === person.id)
      const matchesSearch = !search || person.name.toLowerCase().includes(search) || person.designation.toLowerCase().includes(search)
      return !isAlreadyAdded && matchesSearch
    })
  }

  function updateExternalDraft(relationship, field, value) {
    setExternalDrafts((prev) => ({
      ...prev,
      [relationship]: {
        ...prev[relationship],
        [field]: value,
      },
    }))
  }

  function addExternalNominee(relationship) {
    const draft = externalDrafts[relationship]

    setNominees((prev) => [
      ...prev,
      {
        id: `ext-${relationship}-${Date.now()}`,
        name: draft.name,
        email: draft.email,
        relationship,
        source: 'external',
      },
    ])
    setExternalDrafts((prev) => ({
      ...prev,
      [relationship]: { name: '', email: '' },
    }))
  }

  function renderNominee(n) {
    const isLocked = n.locked

    return (
      <div key={n.id} className={`flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5 mb-2 ${isLocked ? 'border-[#dbeafe]' : 'border-[#e2e8f0]'}`}>
        <div className="w-7 h-7 rounded-full bg-[#dbeafe] flex items-center justify-center text-[#1e4d8c] text-xs font-semibold shrink-0">{initials(n.name)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#1a1f2e] truncate">{n.name}</p>
          <p className="text-[10px] text-gray-400 truncate">{n.designation ?? n.email}</p>
        </div>
        {isEditing && !isLocked && (
          <button onClick={() => setNominees((prev) => prev.filter((x) => x.id !== n.id))} className="text-gray-300 hover:text-red-400 ml-1">x</button>
        )}
      </div>
    )
  }

  function renderAddControls(relationship) {
    if (!isEditing) return null
    if (!addableRelationships.includes(relationship)) return null

    const matches = getDirectoryMatches(relationship)
    const draft = externalDrafts[relationship]
    const canAddExternal = draft.name.trim() && draft.email.trim()

    return (
      <div className="mt-3 rounded-lg border border-[#e2e8f0] bg-[#f8f9fc] p-3">
        <div className="mb-3">
          <p className="text-xs font-semibold text-[#1a1f2e] mb-2">Add from Employee Directory</p>
          <input
            type="text"
            placeholder={`Search ${REL_LABELS[relationship].toLowerCase()} by name or designation...`}
            value={directorySearches[relationship]}
            onChange={(e) => setDirectorySearches((prev) => ({ ...prev, [relationship]: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] mb-2"
          />
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {matches.map((person) => (
              <button
                key={person.id}
                onClick={() => setNominees((prev) => [...prev, { ...person, relationship, source: 'ec' }])}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white hover:bg-[#f1f4f9] transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-semibold shrink-0">{initials(person.name)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#1a1f2e]">{person.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{person.designation}</p>
                </div>
                <span className="text-[#1e4d8c] text-lg shrink-0">+</span>
              </button>
            ))}
            {matches.length === 0 && <p className="text-xs text-gray-300 italic text-center py-3">No more employees to add</p>}
          </div>
        </div>

        {externalRelationships.includes(relationship) && (
          <div className="border-t border-[#e2e8f0] pt-3">
            <p className="text-xs font-semibold text-[#1a1f2e] mb-1">Add External Respondent</p>
            <p className="text-[10px] text-gray-400 mb-2">For stakeholders outside Bajaj Auto.</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <input
                type="text"
                placeholder="Full name"
                value={draft.name}
                onChange={(e) => updateExternalDraft(relationship, 'name', e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c]"
              />
              <input
                type="email"
                placeholder="Email address"
                value={draft.email}
                onChange={(e) => updateExternalDraft(relationship, 'email', e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c]"
              />
              <button
                disabled={!canAddExternal}
                onClick={() => addExternalNominee(relationship)}
                className="px-4 py-2 rounded-lg border border-[#1e4d8c] text-[#1e4d8c] text-sm font-medium hover:bg-[#dbeafe] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function getVisibleRequirement(rel) {
    if (rel === 'reporting-manager' && grouped['reporting-manager'].length >= 1) return null
    if (rel === 'peer' && grouped.peer.length >= 4) return null
    if (rel === 'skip-manager') return null
    return REL_REQUIREMENTS[rel]
  }

  function handleSaveList() {
    if (errors.length > 0) return
    saveNominees(nominees)
    setMode('review')
  }

  function handleFinalSubmit() {
    if (errors.length > 0) return
    submitNominees(nominees)
    setMode('submitted')
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1a1f2e]">360 Nominees</span>
      </div>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1a1f2e]">360 Nominee Submission</h1>
        <p className="text-xs text-gray-400 mt-1">Current Reporting Manager and Skip Manager cannot be changed here. Previous Reporting Managers can be added below.</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {isEditing
            ? 'Select respondents who will provide feedback on your behaviours - Due 20 Jun 2025'
            : isReviewing
              ? 'Review the saved nominee list before final submission. Links are sent only after final submit.'
              : 'Nominee list submitted. Links have been sent to the selected respondents.'}
        </p>
      </div>

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
                <h3 className="text-sm font-semibold text-green-800">Nominees submitted ({nominees.length} respondents)</h3>
                <p className="text-xs text-green-600 mt-0.5">Links have been sent. Your BUHR can view this list.</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-b border-[#f1f4f9] flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted Nominees</p>
            <p className="text-xs text-gray-400">{nominees.length} total</p>
          </div>
          <div className="divide-y divide-[#f1f4f9]">
            {nominees.map((n) => (
              <div key={n.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-[#dbeafe] flex items-center justify-center text-[#1e4d8c] text-xs font-semibold shrink-0">
                  {initials(n.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1f2e] truncate">{n.name}</p>
                  <p className="text-xs text-gray-400 truncate">{n.email}</p>
                </div>
                <div className="hidden sm:block min-w-[150px] text-right">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {REL_LABELS[n.relationship]}
                  </span>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Link sent
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-[#f8f9fc]">
            <Link to="/participant/dashboard" className="text-xs text-[#1e4d8c] font-medium hover:underline">Back to Dashboard</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
          {/* Main form */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-[#1a1f2e] uppercase tracking-wide">
                {isReviewing ? 'Saved Nominee List' : 'Selected Nominees'}
              </h2>
              <p className="text-sm font-semibold text-[#1e4d8c]">{nominees.length} total</p>
            </div>
            {isReviewing && (
              <div className="bg-blue-50 border border-[#bfdbfe] rounded-lg px-4 py-2.5 mb-4">
                <p className="text-xs text-[#1e4d8c]">This saved list will be used for final submission unless you edit it.</p>
              </div>
            )}

            <div className="space-y-4">
              {Object.keys(grouped).map((rel) => (
                <div key={rel} className="rounded-xl border border-[#e2e8f0] bg-white p-4">
                  {(() => {
                    const visibleRequirement = getVisibleRequirement(rel)
                    return (
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{REL_LABELS[rel]}</p>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400">{grouped[rel].length} added</p>
                          {visibleRequirement && (
                            <p className={`text-xs font-semibold ${rel === 'peer' || rel === 'reporting-manager' ? 'text-red-500' : 'text-[#1e4d8c]'}`}>{visibleRequirement}</p>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                  {grouped[rel].length === 0
                    ? <p className="text-xs text-gray-300 italic pl-1">None added</p>
                    : grouped[rel].map(renderNominee)
                  }
                  {renderAddControls(rel)}
                </div>
              ))}
            </div>

            {errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                {errors.map((e) => <p key={e} className="text-xs text-red-600">! {e}</p>)}
              </div>
            )}

            {isEditing ? (
              <button
                disabled={errors.length > 0}
                onClick={handleSaveList}
                className="mt-5 w-full py-2.5 rounded-lg bg-[#1e4d8c] text-white text-sm font-medium hover:bg-[#183f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Nominee List
              </button>
            ) : (
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setMode('edit')}
                  className="flex-1 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#1a1f2e] text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Edit List
                </button>
                <button
                  disabled={errors.length > 0}
                  onClick={handleFinalSubmit}
                  className="flex-1 py-2.5 rounded-lg bg-[#1e4d8c] text-white text-sm font-medium hover:bg-[#183f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Final Submit and Send Links
                </button>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Requirements checklist */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sticky top-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Requirements</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Reporting Manager', detail: '1 or more', ok: grouped['reporting-manager'].length >= 1 },
                  { label: 'Skip Manager', detail: 'Required (pre-filled)', ok: grouped['skip-manager'].length === 1 },
                  { label: 'Peers / Int. Customers', detail: 'Minimum 4', ok: grouped.peer.length >= 4 },
                  { label: 'Direct Reportees', detail: 'Optional', ok: true },
                ].map((r) => (
                  <div key={r.label} className="flex items-start gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${r.ok ? 'bg-green-100' : 'bg-red-50'}`}>
                      {r.ok
                        ? <svg className="w-2.5 h-2.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-2.5 h-2.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      }
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#1a1f2e]">{r.label}</p>
                      <p className="text-[10px] text-gray-400">{r.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#e2e8f0]">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Total nominees</span>
                  <span className="font-semibold text-[#1e4d8c]">{nominees.length}</span>
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Deadline</p>
              <p className="text-sm font-semibold text-[#1a1f2e]">20 Jun 2025</p>
              <p className="text-xs text-gray-400 mt-0.5">Nominee list must be submitted by EOD</p>
            </div>

            {/* What happens on submit */}
            <div className="bg-[#f1f4f9] rounded-xl border border-[#e2e8f0] p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">On Final Submit</p>
              <div className="space-y-2">
                {[
                  'Magic links sent to all respondents',
                  'List locked and visible to your BUHR',
                  'Respondents can\'t be changed after this',
                ].map((tip) => (
                  <div key={tip} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#1e4d8c] mt-1.5 shrink-0" />
                    <p className="text-xs text-gray-600 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
