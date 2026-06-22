import { useState } from 'react'
import { Link } from 'react-router-dom'

type Relationship = 'reporting-manager' | 'skip-manager' | 'peer' | 'direct-report'

type Nominee = {
  id: string
  name: string
  email: string
  designation?: string
  relationship: Relationship
  source: 'ec' | 'external'
}

const ecDirectory = [
  { id: 'e1', name: 'Priya Menon', email: 'priya.menon@bajaj.com', designation: 'GM – Sales Strategy' },
  { id: 'e2', name: 'Vikram Sood', email: 'vikram.sood@bajaj.com', designation: 'VP – Operations' },
  { id: 'e3', name: 'Anika Kapoor', email: 'anika.kapoor@bajaj.com', designation: 'Manager – Digital Marketing' },
  { id: 'e4', name: 'Deepak Rajan', email: 'deepak.rajan@bajaj.com', designation: 'Manager – Brand Strategy' },
  { id: 'e5', name: 'Shalini Nair', email: 'shalini.nair@bajaj.com', designation: 'Senior Manager – Fleet' },
  { id: 'e6', name: 'Arjun Mehta', email: 'arjun.mehta@bajaj.com', designation: 'Senior Manager – EV Sales' },
  { id: 'e7', name: 'Kavitha S', email: 'kavitha.s@bajaj.com', designation: 'DM – Sales Analytics' },
  { id: 'e8', name: 'Ravi Kumar', email: 'ravi.kumar@bajaj.com', designation: 'DM – Sales Strategy' },
]

const REL_LABELS: Record<Relationship, string> = {
  'reporting-manager': 'Reporting Manager',
  'skip-manager': 'Skip Manager',
  peer: 'Peer / Internal Customer',
  'direct-report': 'Direct Report',
}

function validate(nominees: Nominee[]) {
  const errors: string[] = []
  if (nominees.filter((n) => n.relationship === 'reporting-manager').length !== 1) errors.push('Exactly 1 Reporting Manager required.')
  if (nominees.filter((n) => n.relationship === 'peer').length < 4) errors.push(`At least 4 Peers required (${nominees.filter((n) => n.relationship === 'peer').length} added).`)
  return errors
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2)
}

export default function Nominees360() {
  const [nominees, setNominees] = useState<Nominee[]>([
    { id: 'e1', name: 'Priya Menon', email: 'priya.menon@bajaj.com', designation: 'GM – Sales Strategy', relationship: 'reporting-manager', source: 'ec' },
    { id: 'e2', name: 'Vikram Sood', email: 'vikram.sood@bajaj.com', designation: 'VP – Operations', relationship: 'skip-manager', source: 'ec' },
  ])
  const [search, setSearch] = useState('')
  const [extName, setExtName] = useState('')
  const [extEmail, setExtEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const errors = validate(nominees)
  const grouped = {
    'reporting-manager': nominees.filter((n) => n.relationship === 'reporting-manager'),
    'skip-manager': nominees.filter((n) => n.relationship === 'skip-manager'),
    peer: nominees.filter((n) => n.relationship === 'peer'),
    'direct-report': nominees.filter((n) => n.relationship === 'direct-report'),
  }

  const filtered = ecDirectory.filter(
    (p) => !nominees.find((n) => n.id === p.id) && (p.name.toLowerCase().includes(search.toLowerCase()) || p.designation?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
        <span>/</span>
        <span className="text-[#1a1f2e]">360 Nominees</span>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a1f2e]">360 Nominee Submission</h1>
        <p className="text-sm text-gray-500 mt-0.5">Select respondents who will provide feedback on your behaviours · Due 20 Jun 2025</p>
      </div>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-green-800 mb-1">Nominees submitted ({nominees.length} respondents)</h3>
          <p className="text-xs text-green-600">360 invites will be dispatched. Your BUHR can view this list.</p>
          <Link to="/participant/dashboard" className="mt-4 inline-block text-xs text-[#1e4d8c] font-medium hover:underline">← Back to Dashboard</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: nominees */}
          <div>
            <h2 className="text-sm font-semibold text-[#1a1f2e] mb-3 uppercase tracking-wide">Selected Nominees <span className="text-gray-400 font-normal normal-case">({nominees.length})</span></h2>

            <div className="bg-[#f1f4f9] rounded-lg p-3 mb-4 space-y-1">
              {[
                { label: 'Reporting Manager', req: 'Exactly 1', count: grouped['reporting-manager'].length, ok: grouped['reporting-manager'].length === 1 },
                { label: 'Skip Manager', req: 'Optional', count: grouped['skip-manager'].length, ok: true },
                { label: 'Peers / Internal Customers', req: 'Min 4', count: grouped.peer.length, ok: grouped.peer.length >= 4 },
                { label: 'Direct Reports', req: 'All (if any)', count: grouped['direct-report'].length, ok: true },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${r.ok ? 'bg-green-500' : 'bg-red-400'}`} />
                    <span className="text-xs text-gray-600">{r.label}</span>
                  </div>
                  <span className="text-xs text-gray-400">{r.count} · {r.req}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {(Object.keys(grouped) as Relationship[]).map((rel) => (
                <div key={rel}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{REL_LABELS[rel]}</p>
                  {grouped[rel].length === 0
                    ? <p className="text-xs text-gray-300 italic pl-1">None added</p>
                    : grouped[rel].map((n) => (
                      <div key={n.id} className="flex items-center gap-3 bg-white border border-[#e2e8f0] rounded-lg px-3 py-2.5 mb-2">
                        <div className="w-7 h-7 rounded-full bg-[#dbeafe] flex items-center justify-center text-[#1e4d8c] text-xs font-semibold shrink-0">{initials(n.name)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#1a1f2e] truncate">{n.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{n.designation ?? n.email}</p>
                        </div>
                        <select
                          value={n.relationship}
                          onChange={(e) => setNominees((prev) => prev.map((x) => x.id === n.id ? { ...x, relationship: e.target.value as Relationship } : x))}
                          className="text-[10px] border border-[#e2e8f0] rounded px-1 py-0.5 text-gray-600 focus:outline-none"
                        >
                          <option value="reporting-manager">Reporting Manager</option>
                          <option value="skip-manager">Skip Manager</option>
                          <option value="peer">Peer</option>
                          <option value="direct-report">Direct Report</option>
                        </select>
                        <button onClick={() => setNominees((prev) => prev.filter((x) => x.id !== n.id))} className="text-gray-300 hover:text-red-400 ml-1">✕</button>
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>

            {errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                {errors.map((e) => <p key={e} className="text-xs text-red-600">⚠ {e}</p>)}
              </div>
            )}

            <button
              disabled={errors.length > 0}
              onClick={() => setSubmitted(true)}
              className="mt-5 w-full py-2.5 rounded-lg bg-[#1e4d8c] text-white text-sm font-medium hover:bg-[#183f73] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit Nominees
            </button>
          </div>

          {/* Right: search + external */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <h3 className="text-sm font-semibold text-[#1a1f2e] mb-3">Add from Employee Directory</h3>
              <input
                type="text"
                placeholder="Search by name or designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] mb-3"
              />
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setNominees((prev) => [...prev, { ...p, relationship: 'peer', source: 'ec' }])}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f1f4f9] transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-semibold shrink-0">{initials(p.name)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#1a1f2e]">{p.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{p.designation}</p>
                    </div>
                    <span className="text-[#1e4d8c] text-lg shrink-0">+</span>
                  </button>
                ))}
                {filtered.length === 0 && <p className="text-xs text-gray-300 italic text-center py-4">No more employees to add</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <h3 className="text-sm font-semibold text-[#1a1f2e] mb-1">Add External Respondent</h3>
              <p className="text-xs text-gray-400 mb-3">For stakeholders outside Bajaj Auto (e.g. dealers, partners)</p>
              <div className="space-y-2">
                <input type="text" placeholder="Full name" value={extName} onChange={(e) => setExtName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c]" />
                <input type="email" placeholder="Email address" value={extEmail} onChange={(e) => setExtEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c]" />
                <button
                  disabled={!extEmail.trim() || !extName.trim()}
                  onClick={() => { setNominees((prev) => [...prev, { id: `ext-${Date.now()}`, name: extName, email: extEmail, relationship: 'peer', source: 'external' }]); setExtName(''); setExtEmail('') }}
                  className="w-full py-2 rounded-lg border border-[#1e4d8c] text-[#1e4d8c] text-sm font-medium hover:bg-[#dbeafe] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add External Nominee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
