import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { api } from '../../lib/api'

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

const addableRelationships = ['reporting-manager', 'skip-manager', 'peer', 'direct-report']

const emptyExternalDrafts = {
  'reporting-manager': { name: '', email: '' },
  'skip-manager': { name: '', email: '' },
  peer: { name: '', email: '' },
  'direct-report': { name: '', email: '' },
}

function validate(nominees) {
  const errors = []
  if (nominees.filter((n) => n.relationship === 'reporting-manager').length < 1) errors.push('At least 1 Reporting Manager required.')
  if (nominees.filter((n) => n.relationship === 'skip-manager').length !== 1) errors.push('Exactly 1 Skip Manager required.')
  if (nominees.filter((n) => n.relationship === 'peer').length < 4) errors.push(`At least 4 Peers required (${nominees.filter((n) => n.relationship === 'peer').length} added).`)
  return errors
}

function initials(name) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2)
}

export default function Nominees360() {
  const { user, refreshParticipantData } = useUser()
  const participantId = user?.participantId

  const [nominees, setNominees] = useState([])
  const [inviteLinks, setInviteLinks] = useState([])
  const [selectedInvite, setSelectedInvite] = useState(null)
  const [externalDrafts, setExternalDrafts] = useState(emptyExternalDrafts)
  const [mode, setMode] = useState('edit')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isEditing = mode === 'edit'
  const isReviewing = mode === 'review'
  const submitted = mode === 'submitted'

  useEffect(() => {
    if (!participantId) return
    api.getParticipant(participantId)
      .then((result) => {
        const loaded = result.data.nominees || []
        setNominees(loaded)
        if (loaded.some(n => n.status === 'submitted')) {
          setMode('submitted')
        } else if (loaded.length > 0) {
          setMode('review')
        } else {
          setMode('edit')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [participantId])

  const errors = validate(nominees)
  const grouped = {
    'reporting-manager': nominees.filter((n) => n.relationship === 'reporting-manager'),
    'skip-manager': nominees.filter((n) => n.relationship === 'skip-manager'),
    peer: nominees.filter((n) => n.relationship === 'peer'),
    'direct-report': nominees.filter((n) => n.relationship === 'direct-report'),
  }

  function updateExternalDraft(relationship, field, value) {
    setExternalDrafts((prev) => ({ ...prev, [relationship]: { ...prev[relationship], [field]: value } }))
  }

  function addExternalNominee(relationship) {
    const draft = externalDrafts[relationship]
    setNominees((prev) => [
      ...prev,
      { id: `ext-${relationship}-${Date.now()}`, name: draft.name, email: draft.email, relationship, source: 'external' },
    ])
    setExternalDrafts((prev) => ({ ...prev, [relationship]: { name: '', email: '' } }))
  }

  function renderNominee(n) {
    const isLocked = n.locked
    return (
      <div key={n.id ?? n.email} className={`flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5 mb-2 ${isLocked ? 'border-[#dbeafe]' : 'border-[#e2e8f0]'}`}>
        <div className="w-7 h-7 rounded-full bg-[#dbeafe] flex items-center justify-center text-[#1e4d8c] text-xs font-semibold shrink-0">{initials(n.name)}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#1a1f2e] truncate">{n.name}</p>
          <p className="text-[10px] text-gray-400 truncate">{n.designation ?? n.email}</p>
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
    const draft = externalDrafts[relationship]
    const relationshipAtLimit = relationship === 'skip-manager' && grouped[relationship].length >= 1
    const canAdd = draft.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) && !relationshipAtLimit

    return (
      <div className="mt-3 rounded-lg border border-[#e2e8f0] bg-[#f8f9fc] p-3">
          <div>
            <p className="text-xs font-semibold text-[#1a1f2e] mb-2">Add {REL_LABELS[relationship]}</p>
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
                disabled={!canAdd}
                onClick={() => addExternalNominee(relationship)}
                className="px-4 py-2 rounded-lg border border-[#1e4d8c] text-[#1e4d8c] text-sm font-medium hover:bg-[#dbeafe] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {relationshipAtLimit ? 'Added' : 'Add'}
              </button>
            </div>
          </div>
      </div>
    )
  }

  function getVisibleRequirement(rel) {
    if (rel === 'reporting-manager' && grouped['reporting-manager'].length >= 1) return null
    if (rel === 'peer' && grouped.peer.length >= 4) return null
    if (rel === 'skip-manager' && grouped['skip-manager'].length === 1) return null
    return REL_REQUIREMENTS[rel]
  }

  async function handleSaveList() {
    if (errors.length > 0 || !participantId) return
    setSaving(true)
    setError('')
    try {
      const result = await api.saveNominees(participantId, nominees.map(n => ({
        name: n.name,
        email: n.email,
        designation: n.designation || null,
        relationship: n.relationship,
        source: n.source || 'manual',
        locked: n.locked || false,
      })))
      setNominees(result.data)
      refreshParticipantData(participantId)
      setMode('review')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleFinalSubmit() {
    if (errors.length > 0 || !participantId) return
    setSubmitting(true)
    setError('')
    try {
      const result = await api.submitNominees(participantId)
      setNominees(result.data)
      setInviteLinks(result.invites || [])
      setSelectedInvite(null)
      refreshParticipantData(participantId)
      setMode('submitted')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function showInviteLink(nominee) {
    const invite = inviteLinks.find(link => link.nomineeId === nominee.id)
    if (!invite) return
    setSelectedInvite({ ...invite, name: nominee.name, email: nominee.email })
  }

  async function copySelectedInvite() {
    if (!selectedInvite?.inviteUrl) return
    await navigator.clipboard?.writeText(selectedInvite.inviteUrl)
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

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1a1f2e]">360 Nominees</span>
      </div>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1a1f2e]">360 Nominee Submission</h1>
        <p className="text-xs text-gray-400 mt-1">Enter the name and email address for every nominee, including your Reporting Manager and Skip Manager.</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {isEditing
            ? 'Select respondents who will provide feedback on your behaviours - Due 20 Jun 2025'
            : isReviewing
              ? 'Review the saved nominee list before final submission. Links are sent only after final submit.'
              : 'Nominee list submitted. Emails have been sent to the selected respondents.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!submitted && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Final submission warning:</strong> Once submitted, your 360 nominations cannot be edited or changed. Please verify every name, email address and relationship before submitting.
        </div>
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
            {nominees.map((n) => {
              const invite = inviteLinks.find(l => l.nomineeId === n.id)
              const isSelected = selectedInvite?.nomineeId === n.id

              return (
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
                    {invite && (
                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() => showInviteLink(n)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full hover:bg-green-200 transition-colors"
                        >
                          View link
                        </button>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="mt-3 ml-12 rounded-lg border border-[#e2e8f0] bg-[#f8f9fc] p-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-xs font-semibold text-[#1a1f2e]">Magic link</p>
                          <p className="text-[10px] text-gray-400">{selectedInvite.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={copySelectedInvite}
                          className="shrink-0 rounded-lg border border-[#bfdbfe] bg-white px-3 py-1.5 text-xs font-medium text-[#1e4d8c] hover:bg-blue-50"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2">
                        <p className="break-all text-xs leading-5 text-gray-600">{selectedInvite.inviteUrl}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="px-5 py-4 bg-[#f8f9fc]">
            <Link to="/participant/dashboard" className="text-xs text-[#1e4d8c] font-medium hover:underline">Back to Dashboard</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
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
                disabled={errors.length > 0 || saving}
                onClick={handleSaveList}
                className="mt-5 w-full py-2.5 rounded-lg bg-[#1e4d8c] text-white text-sm font-medium hover:bg-[#183f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Nominee List'}
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
                  disabled={errors.length > 0 || submitting}
                  onClick={handleFinalSubmit}
                  className="flex-1 py-2.5 rounded-lg bg-[#1e4d8c] text-white text-sm font-medium hover:bg-[#183f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Final Submit and Send Links'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 sticky top-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Requirements</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Reporting Manager', detail: '1 or more', ok: grouped['reporting-manager'].length >= 1 },
                  { label: 'Skip Manager', detail: 'Exactly 1', ok: grouped['skip-manager'].length === 1 },
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

            <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Deadline</p>
              <p className="text-sm font-semibold text-[#1a1f2e]">20 Jun 2025</p>
              <p className="text-xs text-gray-400 mt-0.5">Nominee list must be submitted by EOD</p>
            </div>

            <div className="bg-[#f1f4f9] rounded-xl border border-[#e2e8f0] p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">On Final Submit</p>
              <div className="space-y-2">
                {[
                  'Emails sent to all respondents with their unique link',
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
