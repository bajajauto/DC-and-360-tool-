import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'

const reports = [
  {
    id: '360',
    title: '360° Feedback Report',
    subtitle: 'EX-to-LX Cohort · Jun 2025',
    status: 'available',
    releasedOn: '28 Jun 2025',
    description: 'Aggregated feedback from all your 360 respondents — competency scores, behaviour ratings, and qualitative themes.',
    icon: '360',
    bgColor: 'bg-[#dbeafe]',
    textColor: 'text-[#1e4d8c]',
  },
  {
    id: 'dc',
    title: 'DC Report',
    subtitle: 'EX-to-LX Cohort · Jul 2025',
    status: 'pending',
    releasedOn: null,
    description: 'Your full Development Centre report including assessor observations, integrated 360 findings, and an IDP focus area.',
    icon: 'DC',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
  },
]

export default function Reports() {
  const navigate = useNavigate()
  const { participantData } = useUser()
  const report360Released = participantData?.reportStatus === 'released'
  const displayReports = reports.map((report) => report.id === '360' ? {
    ...report,
    subtitle: participantData?.cohort?.name || 'Current cohort',
    status: report360Released ? 'available' : 'pending',
    releasedOn: report360Released ? 'Released by Talent Development' : null,
  } : report)
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1a1f2e]">My Reports</span>
      </div>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1a1f2e]">My Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your DC artefacts — released by TD and kept confidential</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_248px] gap-6">
        {/* Report cards */}
        <div className="space-y-4">
          {displayReports.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-start gap-5">
              <div className={`w-12 h-12 rounded-xl ${r.bgColor} flex items-center justify-center shrink-0`}>
                <span className={`text-xs font-bold ${r.textColor}`}>{r.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1a1f2e]">{r.title}</h3>
                    <p className="text-xs text-gray-400">{r.subtitle}</p>
                  </div>
                  {r.status === 'available'
                    ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-green-300 bg-green-100 text-green-700 shrink-0">Available</span>
                    : <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-300 bg-amber-100 text-amber-800 shrink-0">Pending Release</span>
                  }
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{r.description}</p>
                {r.status === 'available' ? (
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400">Released: {r.releasedOn}</p>
                    {r.id === '360' ? (
                      <button
                        onClick={() => navigate('/participant/360-report')}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1e4d8c] text-white text-xs font-medium hover:bg-[#183f73] transition-colors"
                      >
                        View Report →
                      </button>
                    ) : (
                      <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1e4d8c] text-white text-xs font-medium hover:bg-[#183f73] transition-colors">
                        ↓ Download PDF
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Confidentiality */}
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <p className="text-xs font-bold text-[#1e4d8c] uppercase tracking-wide mb-2">Confidentiality</p>
            <p className="text-xs font-medium text-blue-800 leading-relaxed">
              Reports are accessible only to you, your Reporting Manager, your BUHR, and the TD team.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
