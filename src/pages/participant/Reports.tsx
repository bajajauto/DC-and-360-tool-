import { Link } from 'react-router-dom'

const reports = [
  {
    id: '360',
    title: '360 Feedback Report',
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
  {
    id: 'sdp',
    title: 'SDP Report',
    subtitle: 'Annual · FY 2024–25',
    status: 'available',
    releasedOn: '15 Apr 2025',
    description: 'Your self-development plan report drawn from the SDP tool — includes self-reflection, goals, and manager inputs.',
    icon: 'SDP',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-700',
  },
]

export default function Reports() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1a1f2e]">My Reports</span>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-bold text-[#1a1f2e]">My Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your DC artefacts — released by TD and kept confidential</p>
      </div>

      <div className="space-y-4">
        {reports.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-[#e2e8f0] p-6 flex items-start gap-5">
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
                  ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">Available</span>
                  : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 shrink-0">Pending Release</span>
                }
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">{r.description}</p>
              {r.status === 'available' ? (
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-gray-400">Released: {r.releasedOn}</p>
                  <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1e4d8c] text-white text-xs font-medium hover:bg-[#183f73] transition-colors">
                    ↓ Download PDF
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 flex items-center gap-1.5">🔒 You will be notified when this report is released by TD</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-[#f1f4f9] rounded-xl border border-[#e2e8f0] p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Confidentiality</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your reports are confidential and accessible only to you, your Reporting Manager (DC report only, post-release), your BUHR, and the TD team. Assessor inputs are presented in aggregated form and individual assessor scores are not disclosed.
        </p>
      </div>
    </div>
  )
}
