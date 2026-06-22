import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'

export default function Photograph() {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError(null)
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Only JPG and PNG files are accepted.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File must be smaller than 5 MB.')
      return
    }
    setPreview(URL.createObjectURL(file))
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1a1f2e]">Photograph</span>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a1f2e]">Photograph Upload</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload a recent, professional photograph for your DC artefact</p>
      </div>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-green-800 mb-1">Photograph submitted</h3>
          <p className="text-xs text-green-600">Your photo is locked and available to assessors.</p>
          {preview && <img src={preview} alt="Submitted" className="w-28 h-28 rounded-full object-cover border-4 border-green-200 mx-auto mt-4" />}
          <Link to="/participant/dashboard" className="mt-4 inline-block text-xs text-[#1e4d8c] font-medium hover:underline">← Back to Dashboard</Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[#f1f4f9] rounded-xl border border-[#e2e8f0] p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Photo Guidelines</p>
            <ul className="space-y-1.5">
              {[
                'Recent photograph (within the last 12 months)',
                'Professional attire, neutral background preferred',
                'Face clearly visible, front-facing',
                'Format: JPG or PNG only',
                'File size: Maximum 5 MB',
                'Minimum resolution: 400 × 400 px',
              ].map((g) => (
                <li key={g} className="flex items-start gap-2 text-xs text-gray-600">
                  <svg className="w-3.5 h-3.5 text-[#1e4d8c] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {g}
                </li>
              ))}
            </ul>
          </div>

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
                className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-10 text-center cursor-pointer hover:border-[#1e4d8c] hover:bg-[#f8f9fc] transition-colors"
              >
                <div className="w-12 h-12 bg-[#dbeafe] rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#1e4d8c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#1a1f2e] mb-1">Drag & drop your photo here</p>
                <p className="text-xs text-gray-400 mb-3">or click to browse files</p>
                <p className="text-[10px] text-gray-300">JPG · PNG · Max 5 MB</p>
                <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>
            )}
            {error && <p className="text-xs text-red-500 mt-3 flex items-center gap-1.5">⚠ {error}</p>}
          </div>

          <div className="flex justify-end gap-3">
            <Link to="/participant/dashboard" className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</Link>
            <button
              disabled={!preview}
              onClick={() => preview && setSubmitted(true)}
              className="px-5 py-2 rounded-lg bg-[#1e4d8c] text-white text-sm font-medium hover:bg-[#183f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit & Lock
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
