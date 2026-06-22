import { useState } from 'react'
import { Link } from 'react-router-dom'

const profile = {
  Name: 'Rahul Kumar',
  'Ticket No': 'EX-78432',
  Designation: 'Senior Manager – Sales Strategy',
  'Business Unit': 'Two-Wheeler',
  Level: 'EX',
  'Date of Joining': '12 Mar 2018',
  Qualification: 'MBA – IIM Ahmedabad',
  Contact: 'rahul.kumar@bajaj.com | +91 98765 43210',
}

export default function RoleInterview() {
  const [saved, setSaved] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1a1f2e]">Role Interview</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1a1f2e]">Role Interview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Complete all sections and submit before 20 Jun 2025</p>
        </div>
        {submitted && (
          <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-100 text-green-700">✓ Submitted</span>
        )}
      </div>

      {/* Auto-populated header */}
      <div className="bg-[#f1f4f9] rounded-xl border border-[#e2e8f0] p-5 mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Participant Details (auto-filled)</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {Object.entries(profile).map(([key, val]) => (
            <div key={key} className="flex gap-2">
              <p className="text-xs text-gray-400 w-28 shrink-0">{key}</p>
              <p className="text-xs text-[#1a1f2e] font-medium">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-green-800 mb-1">Role Interview submitted</h3>
          <p className="text-xs text-green-600">Your responses are locked. Assessors can now view your submission.</p>
          <Link to="/participant/dashboard" className="mt-4 inline-block text-xs text-[#1e4d8c] font-medium hover:underline">← Back to Dashboard</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            {
              title: '1. Career Transitions (Last 3 Years)',
              hint: 'Briefly describe the roles you have held in the last 3 years — title, function, and key scope of responsibility.',
              placeholder: 'e.g. 2022–23: Manager – Sales, West Region (managed 12-person team, ₹180 Cr target)...',
              rows: 5,
            },
            {
              title: '2. Current Role Summary',
              hint: 'Describe your current role, team size, key accountabilities, and the outcomes you are measured on.',
              placeholder: 'Describe your current role, key accountabilities, team size, and success metrics...',
              rows: 5,
            },
          ].map((section) => (
            <div key={section.title} className="bg-white rounded-xl border border-[#e2e8f0] p-6">
              <h2 className="text-sm font-semibold text-[#1a1f2e] mb-1">{section.title}</h2>
              <p className="text-xs text-gray-400 mb-4">{section.hint}</p>
              <textarea
                rows={section.rows}
                placeholder={section.placeholder}
                className="w-full px-4 py-3 rounded-lg border border-[#e2e8f0] text-sm text-[#1a1f2e] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent resize-none"
              />
            </div>
          ))}

          {['3. Key Highlights (2–3 examples)', '4. Key Challenges (2–3 examples)'].map((title, si) => (
            <div key={title} className="bg-white rounded-xl border border-[#e2e8f0] p-6">
              <h2 className="text-sm font-semibold text-[#1a1f2e] mb-3">{title}</h2>
              <p className="text-xs text-gray-400 mb-4">
                {si === 0
                  ? 'Share 2–3 specific achievements from the last 2 years. Use the STAR format where possible.'
                  : 'Share 2–3 significant challenges you have navigated. What made them hard, and what did you learn?'}
              </p>
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n}>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">{si === 0 ? 'Highlight' : 'Challenge'} {n}</p>
                    <textarea
                      rows={3}
                      placeholder={`Describe ${si === 0 ? 'highlight' : 'challenge'} ${n}...`}
                      className="w-full px-4 py-3 rounded-lg border border-[#e2e8f0] text-sm text-[#1a1f2e] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between py-4 border-t border-[#e2e8f0]">
            <div className="flex items-center gap-2">
              {saved && <p className="text-xs text-green-600 font-medium">✓ Draft saved</p>}
              <p className="text-xs text-gray-400">Auto-saved every 60 seconds</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Save Draft
              </button>
              <button onClick={() => setSubmitted(true)} className="px-5 py-2 rounded-lg bg-[#1e4d8c] text-white text-sm font-medium hover:bg-[#183f73] transition-colors">
                Submit & Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
