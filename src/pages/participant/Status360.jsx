import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useUser } from '../../context/UserContext'

function initials(respondent) {
  if (respondent.isSelf) return 'ME'
  const { name } = respondent
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2)
}

function formatSubmittedAt(value) {
  return value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : null
}

const relationshipStyles = {
  Self: { row: 'bg-amber-50 border-amber-100', avatar: 'bg-amber-100 text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  'Reporting Manager': { row: 'bg-purple-50 border-purple-100', avatar: 'bg-purple-100 text-purple-700', badge: 'bg-purple-100 text-purple-700' },
  'Skip Manager': { row: 'bg-indigo-50 border-indigo-100', avatar: 'bg-indigo-100 text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
  Peer: { row: 'bg-sky-50 border-sky-100', avatar: 'bg-sky-100 text-sky-700', badge: 'bg-sky-100 text-sky-700' },
  'Direct Report': { row: 'bg-teal-50 border-teal-100', avatar: 'bg-teal-100 text-teal-700', badge: 'bg-teal-100 text-teal-700' },
}

export default function Status360() {
  const { user, participantData, refreshParticipantData } = useUser()

  useEffect(() => {
    if (!user?.participantId) return
    refreshParticipantData(user.participantId)
    const interval = window.setInterval(() => refreshParticipantData(user.participantId), 30000)
    return () => window.clearInterval(interval)
  }, [refreshParticipantData, user?.participantId])

  const respondents = participantData?.respondents ?? []
  const summary = participantData?.responseSummary
  const submitted = summary?.submitted ?? respondents.filter((respondent) => respondent.status === 'submitted').length
  const total = summary?.total ?? respondents.length
  const pending = summary?.pending ?? Math.max(0, total - submitted)
  const cutoffDate = participantData?.cohort?.threeSixtyCutoff
  const cutoffLabel = cutoffDate ? new Date(cutoffDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD'

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1a1f2e]">360 Status</span>
      </div>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1a1f2e]">360 Feedback Status</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track who has submitted · Cutoff: {cutoffLabel}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_248px] gap-6">
        {/* Main content */}
        <div className="space-y-5">
          {/* Summary banner */}
          <div className="bg-[#1e4d8c] rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-blue-200 text-sm">Responses received</p>
                <p className="text-3xl font-bold mt-0.5">{submitted} <span className="text-blue-300 text-lg font-normal">/ {total}</span></p>
              </div>
              <p className="text-sm font-semibold text-blue-100">{pending} pending</p>
            </div>
            <div className="flex justify-end text-xs text-blue-300 mt-1">
              <span>Cutoff: {cutoffLabel}</span>
            </div>
          </div>

          {/* Respondents table */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#f1f4f9]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Respondents ({total})</p>
            </div>
            <div className="space-y-2 p-3">
              {!respondents.length && (
                <p className="px-4 py-8 text-center text-sm text-gray-500">
                  Respondent tracking will appear after the nominee list is submitted.
                </p>
              )}
              {respondents.map((r) => (
                <div key={r.id} className={`flex items-center gap-4 rounded-lg border px-4 py-3.5 ${relationshipStyles[r.relationship]?.row ?? 'bg-gray-50 border-gray-100'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${relationshipStyles[r.relationship]?.avatar ?? 'bg-gray-100 text-gray-500'}`}>
                    {initials(r)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1f2e]">{r.isSelf ? 'You (Self)' : r.name}</p>
                    <span className={`inline-flex mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${relationshipStyles[r.relationship]?.badge ?? 'bg-gray-100 text-gray-500'}`}>{r.relationship}</span>
                  </div>
                  <div className="text-right shrink-0">
                    {r.status === 'submitted' ? (
                      <div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">✓ Submitted</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatSubmittedAt(r.submittedAt)}</p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">⏳ Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Your 360° Feedback Report will be auto-generated once all responses are received or the cutoff date passes.
          </p>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Confidentiality */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-500 mt-0.5 shrink-0">ⓘ</span>
              <div>
                <p className="text-xs font-semibold text-amber-800 mb-1">Confidentiality Notice</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  You can see <strong>who</strong> has submitted but not their individual responses. All feedback is aggregated to protect confidentiality.
                </p>
              </div>
            </div>
          </div>

          {/* Stats breakdown */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Breakdown</p>
            <div className="space-y-3">
              {[
                { label: 'Submitted', count: submitted, color: 'bg-green-500' },
                { label: 'Pending', count: pending, color: 'bg-gray-300' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="font-semibold text-[#1a1f2e]">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-[#f1f4f9] rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What Happens Next</p>
            <div className="space-y-3">
              {[
                { step: '1', text: `Responses will be collected until the cutoff date: ${cutoffLabel}` },
                { step: '2', text: 'Scores are aggregated based on pre-defined competencies.' },
                { step: '3', text: 'The 360° Feedback Report will be shared with you, your Reporting Manager and BUHR after completion of the DC.' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#1e4d8c] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-white text-[9px] font-bold">{item.step}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cutoff info */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Feedback Cutoff</p>
            <p className="text-sm font-semibold text-[#1a1f2e]">{cutoffLabel}</p>
            <p className="text-xs text-gray-400 mt-0.5">Respondents cannot submit after this date</p>
          </div>
        </div>
      </div>
    </div>
  )
}
