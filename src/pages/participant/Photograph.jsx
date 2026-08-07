import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useUser } from '../../context/UserContext'
import ParticipantSubmissionSuccess from '../../components/ParticipantSubmissionSuccess'

const guidelines = [
  'Recent professional photograph',
  'Professional attire, neutral background preferred',
  'Face clearly visible, front-facing',
  'Format: JPG or PNG only',
  'File size: Maximum 5 MB',
  'Minimum resolution: 400 × 400 px',
]

function formatDeadline(cutoff) {
  return cutoff ? new Date(cutoff).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the deadline configured for your cohort'
}

export default function Photograph() {
  const { user, refreshParticipantData } = useUser()
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(true)
  const [cutoff, setCutoff] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!user?.participantId) return
    api.getParticipantPhoto(user.participantId)
      .then(({ data }) => {
        setPreview(data.url || null)
        setSubmitted(Boolean(data.url))
        setCanEdit(data.canEdit !== false)
        setCutoff(data.cutoff || null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user?.participantId])

  function handleFile(file) {
    setError(null)
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPG and PNG files are accepted.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be smaller than 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPreview(String(reader.result || ''))
    reader.onerror = () => setError('The photograph could not be read.')
    reader.readAsDataURL(file)
  }

  async function submitPhoto() {
    if (!preview || !user?.participantId) return
    setSaving(true)
    setError(null)
    try {
      await api.saveParticipantPhoto(user.participantId, preview)
      await refreshParticipantData(user.participantId)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1a1f2e]">Photograph</span>
      </div>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1a1f2e]">Photograph Upload</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload a recent, professional photograph for your DC artefact</p>
        <p className={`mt-2 text-sm font-semibold ${canEdit ? 'text-red-600' : 'text-amber-600'}`}>
          {canEdit ? `Deadline: ${formatDeadline(cutoff)}` : 'The cutoff date has passed — this upload is now locked.'}
        </p>
      </div>

      {loading ? null : submitted ? (
        <div className="max-w-xl"><ParticipantSubmissionSuccess stepName="photograph" nextTo="/participant/pre-work" nextLabel="Self Reflection" detail="Your photo is locked and available to assessors.">{preview && <img src={preview} alt="Submitted" className="mx-auto mt-4 h-28 w-28 rounded-full border-4 border-emerald-200 object-cover" />}</ParticipantSubmissionSuccess></div>
      ) : !canEdit ? (
        <div className="max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h3 className="mb-1 text-sm font-semibold text-amber-800">Upload window closed</h3>
          <p className="text-xs text-amber-700">The cutoff date has passed and no photograph was submitted. Contact Talent Development if you need an exception.</p>
          <Link to="/participant/dashboard" className="mt-4 inline-block text-xs text-[#1e4d8c] font-medium hover:underline">← Back to Dashboard</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
          {/* Upload area */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
              {preview ? (
                <div className="flex flex-col items-center gap-4">
                  <img src={preview} alt="Preview" className="w-36 h-36 rounded-full object-cover border-4 border-[#dbeafe]" />
                  <p className="text-xs text-gray-500">Preview looks good? Submit below, or replace.</p>
                  <button onClick={() => { setPreview(null); setError(null) }} className="text-xs text-red-500 hover:text-red-700 underline">
                    Remove and choose another
                  </button>
                </div>
              ) : (
                <div
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-12 text-center cursor-pointer hover:border-[#1e4d8c] hover:bg-[#f8f9fc] transition-colors"
                >
                  <div className="w-14 h-14 bg-[#dbeafe] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-[#1e4d8c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[#1a1f2e] mb-1">Drag & drop your photo here</p>
                  <p className="text-xs text-gray-400 mb-4">or click to browse files</p>
                  <p className="text-[10px] text-gray-300">JPG · PNG · Max 5 MB</p>
                  <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                </div>
              )}
              {error && <p className="text-xs text-red-500 mt-3 flex items-center gap-1.5">⚠ {error}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <Link to="/participant/dashboard" className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</Link>
              <button
                disabled={!preview || saving}
                onClick={submitPhoto}
                className="px-5 py-2 rounded-lg bg-[#1e4d8c] text-white text-sm font-medium hover:bg-[#183f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Submitting…' : 'Submit & Lock'}
              </button>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Guidelines */}
            <div className="rounded-xl border border-[#9fc2ec] border-l-4 border-l-[#1e5fba] bg-[#eaf3ff] p-5 shadow-sm">
              <p className="mb-4 text-sm font-bold uppercase tracking-wide text-[#1e4d8c]">Photo Guidelines</p>
              <ul className="space-y-2.5">
                {guidelines.map((g) => (
                  <li key={g} className="flex items-start gap-2.5 text-[13px] font-semibold leading-5 text-[#29496f]">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#1e5fba]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {g}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
