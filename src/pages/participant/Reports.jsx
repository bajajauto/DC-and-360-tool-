import { Link, useNavigate } from 'react-router-dom'

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

const timeline = [
  { label: 'Pre-Work Deadline', date: '20 Jun 2025', done: true },
  { label: '360 Feedback Cutoff', date: '30 Jun 2025', done: false },
  { label: 'DC Event', date: '25–26 Jul 2025', done: false },
  { label: 'DC Report Released', date: 'Aug 2025', done: false },
]

export default function Reports() {
  const navigate = useNavigate()
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
          {reports.map((r) => (
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
                    ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">Available</span>
                    : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 shrink-0">Pending Release</span>
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
                ) : (
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">🔒 You will be notified when this report is released by TD</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* DC Timeline */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">DC Timeline</p>
            <div className="space-y-3">
              {timeline.map((item, idx) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.done ? 'bg-[#1e4d8c]' : 'bg-gray-100'}`}>
                    {item.done
                      ? <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      : <span className="text-[9px] text-gray-400 font-medium">{idx + 1}</span>
                    }
                  </div>
                  <div>
                    <p className={`text-xs font-medium ${item.done ? 'text-gray-400 line-through' : 'text-[#1a1f2e]'}`}>{item.label}</p>
                    <p className="text-[10px] text-gray-400">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Confidentiality */}
          <div className="bg-[#f1f4f9] rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Confidentiality</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Reports are accessible only to you, your Reporting Manager (DC report only, post-release), your BUHR, and the TD team.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              Assessor inputs are presented in aggregated form and individual scores are not disclosed.
            </p>
          </div>

          {/* Report access */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Access</p>
            <div className="space-y-1.5">
              {[
                { who: 'You', access: 'All reports' },
                { who: 'Reporting Manager', access: 'DC Report (post-release)' },
                { who: 'BUHR', access: 'All reports' },
                { who: 'TD Team', access: 'All reports' },
              ].map((row) => (
                <div key={row.who} className="flex items-start gap-2 justify-between">
                  <p className="text-xs text-gray-400 shrink-0">{row.who}</p>
                  <p className="text-xs text-[#1a1f2e] font-medium text-right">{row.access}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
