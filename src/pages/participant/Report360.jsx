import { useState } from 'react'
import { Link } from 'react-router-dom'

// ─── Mock report data ────────────────────────────────────────────────────────

const PARTICIPANT = {
  name: 'Rahul Kumar',
  employeeId: 'EX-78432',
  designation: 'Senior Manager – Sales Strategy',
  bu: 'Two-Wheeler',
  level: 'EX',
  cohort: 'EX-to-LX DC · Cohort 2025',
  reportingManager: 'Priya Menon',
  totalRespondents: 7,
}

// Radar order: GI (top) → AMT → DEP → CIPC → SPC (clockwise)
const RADAR_DATA = [
  { label: 'Generates Ideas', self: 4.00, others: 3.70 },
  { label: 'Aligns and\nMotivates Team', self: 4.00, others: 3.64 },
  { label: 'Develops and\nEngages People', self: 4.00, others: 3.73 },
  { label: 'Champions\nImprovement', self: 4.00, others: 3.45 },
  { label: 'Solves Problems\nCreatively', self: 3.80, others: 3.48 },
]

const OVERVIEW_TABLE = [
  { label: 'Generates Ideas', self: 4.00, others: 3.70 },
  { label: 'Solves Problems Creatively', self: 3.80, others: 3.48 },
  { label: 'Champions Improvement and Positive Change', self: 4.00, others: 3.45 },
  { label: 'Develops and Engages People', self: 4.00, others: 3.73 },
  { label: 'Aligns and Motivates Team', self: 4.00, others: 3.64 },
]

const COMPETENCIES = [
  {
    id: 'gi',
    title: 'Generates Ideas',
    description: 'This competency signifies the ability of the participant to question status quo and bring in new perspectives to the situations.',
    byGroup: { self: 4.00, peers: 3.80, directReports: null, reportingManager: 3.20, skipManager: null },
    behaviours: [
      { text: 'When faced with a problem, is able to come up with new ideas', self: 4.00, peers: 3.80, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Encourages others to share ideas', self: 4.00, peers: 3.80, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Appreciates the merits in ideas shared by others', self: 4.00, peers: 4.00, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Synthesizes ideas from others', self: 4.00, peers: 3.60, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Uses a method to evaluate ideas for their effectiveness', self: 4.00, peers: 3.80, directReports: null, reportingManager: 3.00, skipManager: null },
    ],
    strengths: [
      'Generally explores new ideas when faced with a problem',
      'Always comes with a new idea to solve the problem; believes in going to the place and discussing the problem before taking a decision',
      'Ability to bifurcate the problem statement into basic activities helps generate good ideas',
      'Moderating brainstorming approach',
    ],
    developmentAreas: [
      'Proactive approach required to anticipate problems',
      'Too critical in idea effectiveness evaluations',
      'Training for advanced technologies needed',
    ],
    selfStrengths: ['Open for new ideas and acceptance to new technology'],
    selfDevelopmentAreas: ['New technology exposure needs to be built'],
  },
  {
    id: 'spc',
    title: 'Solves Problems Creatively',
    description: 'This competency signifies the ability of the participant to solve problems creatively and look out for answers to mitigate the problems.',
    byGroup: { self: 3.80, peers: 3.54, directReports: null, reportingManager: 3.20, skipManager: null },
    behaviours: [
      { text: 'When faced with a problem, arrives at a clear problem statement', self: 4.00, peers: 3.80, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Arrives at the root causes of a problem through analysis', self: 4.00, peers: 3.20, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Identifies risks and organisation constraints', self: 4.00, peers: 3.60, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'When confronted with a problem, breaks it down into smaller components', self: 3.00, peers: 3.40, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Gets the required buy-in from the concerned stakeholders, including the team', self: 4.00, peers: 3.60, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Adapts pre-existing solutions to resolve problems', self: 4.00, peers: 3.40, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Reviews impact of newly tried out ideas', self: 3.00, peers: 3.80, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: "Evaluates solutions to see if they meet the customers' needs", self: 4.00, peers: 3.80, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Continuously reviews progress towards goal achievement', self: 4.00, peers: 3.20, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Implements corrective action to improve effectiveness', self: 4.00, peers: 3.60, directReports: null, reportingManager: 3.00, skipManager: null },
    ],
    strengths: [
      'Breaks down problems into smaller components',
      'Involves team and takes help of respective persons to resolve problems',
      'Solution-centric approach; proposes out-of-the-box solutions when traditional methodology does not serve the purpose',
      'Works proactively with team for solving problems',
    ],
    developmentAreas: [
      'Delegation for problem solving of certain level problems',
      'Microlevel analysis of problem to be improved',
      'Need more focus on risk and organizational constraints',
    ],
    selfStrengths: ['Open to new and creative ideas to solve problems'],
    selfDevelopmentAreas: ['NA'],
  },
  {
    id: 'cipc',
    title: 'Champions Improvement & Positive Change',
    description: 'This competency signifies the ability of the participant to proactively bring-in changes that have long-term impact, look at continuous improvements and develop systems to sustain changes.',
    byGroup: { self: 4.00, peers: 3.56, directReports: null, reportingManager: 2.91, skipManager: null },
    behaviours: [
      { text: 'Looks for opportunities & identifies the need for improvement/change', self: 4.00, peers: 3.40, directReports: null, reportingManager: 2.00, skipManager: null },
      { text: 'Visualizes the end state and makes a case for improvement/change', self: 4.00, peers: 3.20, directReports: null, reportingManager: 2.00, skipManager: null },
      { text: 'Identifies sponsor/s for change and gains buy in', self: 4.00, peers: 3.00, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Works to gain buy in from all stakeholders', self: 4.00, peers: 3.40, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Works to resolve resistance from all stakeholders (direct & indirect)', self: 4.00, peers: 3.80, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Defines clear milestones to mark and guide improvement/change', self: 4.00, peers: 3.40, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Resolves bottlenecks/blocks that emerge while executing improvement/change', self: 4.00, peers: 4.00, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Provides support/negotiates for infrastructure, tools, resources etc.', self: 4.00, peers: 3.80, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Tracks progress and implements course correction', self: 4.00, peers: 3.80, directReports: null, reportingManager: 2.00, skipManager: null },
      { text: 'Evaluates the outcome achieved and takes corrective actions for gap closure', self: 4.00, peers: 3.40, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Recognises/acknowledges/appreciates when milestones are reached', self: 4.00, peers: 4.00, directReports: null, reportingManager: 4.00, skipManager: null },
    ],
    strengths: [
      'Hardworker towards achieving goals within timeline',
      'Always evaluates things after completion and involves the team for input',
      'Looks for opportunities and identifies the need for improvement',
      'Versatility in knowledge; good domain knowledge of all stakeholders for collaborative improvement',
    ],
    developmentAreas: [
      'Can guide and mentor others (stakeholders) for championing improvement',
      'Should evaluate learning from challenges faced during improvement and trace progress for new projects',
      'Need more focus on visualization of end state of action',
    ],
    selfStrengths: ['Team development focus is high so next level leadership can be created'],
    selfDevelopmentAreas: ['NA'],
  },
  {
    id: 'dep',
    title: 'Develops and Engages People',
    description: 'This competency defines how the participant takes charge of the team, brings in clarity in terms of the goals, involves everyone, resolves conflicts and optimizes team resources.',
    byGroup: { self: 4.00, peers: 3.72, directReports: null, reportingManager: 3.77, skipManager: null },
    behaviours: [
      { text: 'Builds and sustains positive work relations with team, peers and external network', self: 4.00, peers: 3.80, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Clearly articulates goals, roles, responsibilities & checks team understanding', self: 4.00, peers: 3.60, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: "Seeks the team's opinion about goals and key decisions", self: 4.00, peers: 4.00, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Monitors and tracks people engagement', self: 4.00, peers: 3.60, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Gives timely feedback', self: 4.00, peers: 3.60, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Is open to receiving feedback', self: 4.00, peers: 3.80, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Addresses and resolves conflicts while working towards solutions that benefit the organization', self: 4.00, peers: 3.60, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Provides a safe environment for team members to take risks', self: 4.00, peers: 4.00, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Assigns stretch goals to High Potentials in the team', self: 4.00, peers: 3.60, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Provides training & development support to ensure individual performance', self: 4.00, peers: 3.80, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Encourages collaboration and teamwork among employees from diverse backgrounds', self: 4.00, peers: 3.80, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Engages in efforts to create a more inclusive work environment', self: 4.00, peers: 3.60, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Challenges bias and stereotypes in the workplace', self: 4.00, peers: 3.60, directReports: null, reportingManager: 4.00, skipManager: null },
    ],
    strengths: [
      'Has good interpersonal skills',
      'Very good manager with healthy relations with team',
      'Initiates team skill plan for team members',
    ],
    developmentAreas: [
      "Inclination in giving input on others' strengths in comparison to weaknesses",
      'Need to work on more team engagement',
      'Stretched targets to be given to team members with periodic review for timely correction',
    ],
    selfStrengths: ['Delegating responsibility to next level team for their development and engagement'],
    selfDevelopmentAreas: ['Training and development of DR system to teammates'],
  },
  {
    id: 'amt',
    title: 'Aligns and Motivates Team',
    description: 'This competency defines how the participant guides and motivates his/her team members towards task completion to achieve better team performance.',
    byGroup: { self: 4.00, peers: 3.69, directReports: null, reportingManager: 3.43, skipManager: null },
    behaviours: [
      { text: 'Aligns own and team goals to organisation goals', self: 4.00, peers: 3.80, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Conducts periodic reviews to check progress against milestones', self: 4.00, peers: 3.60, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Updates team of their progress towards achievement of goals', self: 4.00, peers: 3.80, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Ensures that individuals meet their committed goal(s)', self: 4.00, peers: 3.60, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Takes on stretch goals for oneself', self: 4.00, peers: 3.80, directReports: null, reportingManager: 3.00, skipManager: null },
      { text: 'Removes any blocks/obstacles to performance faced by the team', self: 4.00, peers: 3.60, directReports: null, reportingManager: 4.00, skipManager: null },
      { text: 'Appreciates and recognises individual and team efforts', self: 4.00, peers: 3.60, directReports: null, reportingManager: 4.00, skipManager: null },
    ],
    strengths: [
      'Good leadership skills to steer team towards common goal',
      'Always motivates team to do better than earlier',
      'Motivates team members for their efforts',
      'Removes any blocks/obstacles to performance faced by the team',
    ],
    developmentAreas: [
      'More to work on appreciation of persons',
      'Regular review of team members to give feedback on assigned task progress',
      'Review mechanism for subordinates can be revised to increase review frequency',
    ],
    selfStrengths: ['Involvement in micro level activities helps team to align towards target'],
    selfDevelopmentAreas: ['NA'],
  },
]

const OVERALL_COMMENTS = {
  start: [
    'Delegation of relatively less important activities',
    'Recognize what has been wrong in earlier projects',
    'Reduce follow-ups for completion of activity',
    'Review mechanism to be improved; proactive approach required to anticipate any challenge',
  ],
  stop: [
    'Firefighting in place of proactive planning / overconfidence',
    'Inclination towards highlighting strengths of individuals while reviewing them',
    'Over thinking',
    'Sympathetic, empathic approach',
    'Workaholic — needs to improve work-life balance',
  ],
  continue: [
    'Collaborative approach; good team management',
    'Assertion towards completing tasks on time; sincerity towards work',
    'Periodic review of projects; anticipate challenges through deep involvement',
    'Prioritizing and focusing on management goals',
    'Team alignment, motivation of team',
  ],
  selfStart: ['NA'],
  selfStop: ['NA'],
  selfContinue: ['NA'],
}

// ─── Radar Chart (SVG pentagon) ──────────────────────────────────────────────

function RadarChart({ data, size = 260 }) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.34
  const n = data.length
  const maxVal = 4

  function pt(i, val) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (val / maxVal) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  function polyPath(points) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'
  }

  const gridLevels = [1, 2, 3, 4]
  const axisEnds = data.map((_, i) => pt(i, maxVal))

  const selfPts = data.map((d, i) => pt(i, d.self))
  const otherPts = data.map((d, i) => pt(i, d.others))

  // Label positions — push outward past the axis end
  function labelPos(i) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = maxR + 34
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid rings */}
      {gridLevels.map((lvl) => (
        <path key={lvl} d={polyPath(data.map((_, i) => pt(i, lvl)))} fill="none" stroke="#e2e8f0" strokeWidth={0.8} />
      ))}
      {/* Axis spokes */}
      {axisEnds.map((end, i) => (
        <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e2e8f0" strokeWidth={0.8} />
      ))}
      {/* Grid level labels */}
      {gridLevels.map((lvl) => {
        const p = pt(0, lvl)
        return <text key={lvl} x={p.x + 3} y={p.y - 3} fontSize={7} fill="#9ca3af">{lvl}</text>
      })}
      {/* Others polygon */}
      <path d={polyPath(otherPts)} fill="rgba(22,163,74,0.15)" stroke="#16a34a" strokeWidth={2} />
      {/* Self polygon */}
      <path d={polyPath(selfPts)} fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth={2} />
      {/* Dots */}
      {selfPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#3b82f6" />)}
      {otherPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#16a34a" />)}
      {/* Labels */}
      {data.map((d, i) => {
        const lp = labelPos(i)
        const lines = d.label.split('\n')
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#374151" fontFamily="inherit">
            {lines.map((line, li) => (
              <tspan key={li} x={lp.x} dy={li === 0 ? 0 : 12}>{line}</tspan>
            ))}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Horizontal bar chart ────────────────────────────────────────────────────

function BarChart({ groups }) {
  const colours = {
    Self: 'bg-[#1e4d8c]',
    'Peers/Internal Customers': 'bg-[#2d7a2d]',
    'Direct Reports': 'bg-[#7c3aed]',
    'Reporting Manager': 'bg-[#991b1b]',
    'Skip Level Manager': 'bg-[#6b7280]',
  }
  return (
    <div className="space-y-2">
      {groups.filter(g => g.score !== null).map((g) => (
        <div key={g.label} className="flex items-center gap-3">
          <p className="text-xs text-gray-500 w-44 shrink-0 text-right">{g.label}</p>
          <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
            <div
              className={`${colours[g.label] ?? 'bg-gray-400'} rounded-full h-4 transition-all`}
              style={{ width: `${(g.score / 4) * 100}%` }}
            />
          </div>
          <p className="text-xs font-semibold text-gray-700 w-8 shrink-0">{g.score.toFixed(2)}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Score table for detailed feedback ──────────────────────────────────────

const COLS = ['Self', 'Peers/Internal\nCustomers', 'Direct\nReports', 'Reporting\nManager', 'Skip Level\nManager']

function score(val) {
  if (val === null) return <span className="text-gray-300">NA</span>
  return val.toFixed(2)
}

function ScoreTable({ behaviours }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#1e4d8c] text-white">
            <th className="text-left px-3 py-2 font-medium w-8">Sr.</th>
            <th className="text-left px-3 py-2 font-medium">Competency</th>
            {COLS.map((c) => (
              <th key={c} className="px-3 py-2 font-medium text-center whitespace-pre-line leading-tight w-20">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {behaviours.map((b, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-[#dbeafe]/30' : 'bg-white'}>
              <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
              <td className="px-3 py-2.5 text-[#1a1f2e] leading-snug">{b.text}</td>
              <td className="px-3 py-2.5 text-center font-medium text-[#1a1f2e]">{score(b.self)}</td>
              <td className="px-3 py-2.5 text-center font-medium text-[#1a1f2e]">{score(b.peers)}</td>
              <td className="px-3 py-2.5 text-center font-medium text-gray-400">{score(b.directReports)}</td>
              <td className="px-3 py-2.5 text-center font-medium text-[#1a1f2e]">{score(b.reportingManager)}</td>
              <td className="px-3 py-2.5 text-center font-medium text-gray-400">{score(b.skipManager)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Qualitative comments ────────────────────────────────────────────────────

function QualitativeSection({ strengths, developmentAreas, selfStrengths, selfDevelopmentAreas }) {
  return (
    <div className="mt-4 border border-[#e2e8f0] rounded-xl overflow-hidden">
      <div className="grid grid-cols-2">
        <div className="bg-[#1e4d8c] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide">Key Strength</div>
        <div className="bg-[#1e4d8c] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wide border-l border-blue-700">Key Development Areas</div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[#e2e8f0]">
        <div className="px-4 py-3 space-y-1.5">
          {strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[#1e4d8c] shrink-0 mt-0.5">•</span>
              <p className="text-xs text-gray-700 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 space-y-1.5">
          {developmentAreas.map((d, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[#1e4d8c] shrink-0 mt-0.5">•</span>
              <p className="text-xs text-gray-700 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Self comments */}
      <div className="bg-[#bfdbfe]/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-center text-[#1e4d8c] border-t border-[#e2e8f0]">
        Self Comments
      </div>
      <div className="grid grid-cols-2 divide-x divide-[#e2e8f0]">
        <div className="px-4 py-3 space-y-1.5">
          {selfStrengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-gray-400 shrink-0 mt-0.5">•</span>
              <p className="text-xs text-gray-600 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 space-y-1.5">
          {selfDevelopmentAreas.map((d, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-gray-400 shrink-0 mt-0.5">•</span>
              <p className="text-xs text-gray-600 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Section divider ─────────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <h2 className="text-sm font-bold text-[#1a1f2e] uppercase tracking-wide mt-8 mb-4 pb-2 border-b-2 border-[#1e4d8c]">
      {children}
    </h2>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Report360() {
  const [reflections, setReflections] = useState({ learnings: '', comparison: '', surprise: '', agreement: '' })

  return (
    <div className="p-6">
      {/* Breadcrumb + print */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link to="/participant/dashboard" className="hover:text-gray-600">Dashboard</Link>
          <span>/</span>
          <Link to="/participant/reports" className="hover:text-gray-600">My Reports</Link>
          <span>/</span>
          <span className="text-[#1a1f2e]">360 Feedback Report</span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save PDF
        </button>
      </div>

      {/* Report container */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">

        {/* Cover header */}
        <div className="bg-[#1e4d8c] px-8 py-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-1">Bajaj Auto Ltd</p>
              <h1 className="text-2xl font-bold">360° Feedback Report</h1>
              <p className="text-blue-200 text-sm mt-0.5">Confidential</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-200 mb-1">{PARTICIPANT.cohort}</p>
              <p className="text-2xl font-bold">{PARTICIPANT.name}</p>
              <p className="text-blue-200 text-sm">{PARTICIPANT.designation}</p>
            </div>
          </div>
        </div>

        {/* Participant info strip */}
        <div className="bg-[#f8f9fc] border-b border-[#e2e8f0] px-8 py-3 flex flex-wrap gap-6">
          {[
            ['Employee ID', PARTICIPANT.employeeId],
            ['Business Unit', PARTICIPANT.bu],
            ['Level', PARTICIPANT.level],
            ['Reporting Manager', PARTICIPANT.reportingManager],
            ['Total Respondents', `${PARTICIPANT.totalRespondents} (including Self)`],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-xs font-semibold text-[#1a1f2e]">{value}</p>
            </div>
          ))}
        </div>

        <div className="px-8 py-6 space-y-2">

          {/* ── Introduction ── */}
          <SectionHeading>Introduction</SectionHeading>
          <p className="text-xs text-gray-600 leading-relaxed">
            This report brings together the feedback given by people that you actively work with — your manager, skip level manager (if applicable), peers, direct reports and yourself. We urge you to internalize this feedback and then take ownership of your development.
          </p>
          <p className="text-xs font-semibold text-gray-700 mt-3 mb-1">What is the right mindset to receive feedback?</p>
          <ul className="text-xs text-gray-600 space-y-1 ml-4">
            <li>✓ Assume it is constructive</li>
            <li>✓ Accept it positively</li>
          </ul>
          <p className="text-xs text-gray-600 leading-relaxed mt-3">
            To get the most benefit from this report, the DC Coach will support you in identifying the key messages and the most important trends, relating them to your real challenges at work, and defining development opportunities.
          </p>
          <p className="text-xs text-gray-600 leading-relaxed mt-2">
            The results of the report are intended for you to develop yourself as a professional and craft your development plan. This report will be shared with your Manager and HR team.
          </p>

          {/* ── Interpreting the Report ── */}
          <SectionHeading>Interpreting the Report</SectionHeading>
          <p className="text-xs text-gray-600 mb-3">You and your contributors used the following response scale for the ratings:</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: '1', label: 'Rarely' },
              { value: '2', label: 'Occasionally' },
              { value: '3', label: 'Often' },
              { value: '4', label: 'Almost Always' },
            ].map((s) => (
              <div key={s.value} className="bg-[#f1f4f9] rounded-lg p-3 text-center border border-[#e2e8f0]">
                <p className="text-xl font-bold text-[#1e4d8c]">{s.value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-[#f1f4f9] rounded-lg p-4">
            <p className="text-xs font-semibold text-[#1e4d8c] mb-2">Use these questions to understand the meaning of your results:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {[
                'How do your responses compare to those of your contributors?',
                'How do the scores from the various contributor groups compare to each other?',
                'Are there areas where you consistently rate yourself lower or higher than others rate you?',
                'How are the written comments related to the feedback received in the overall competency score table?',
              ].map((q) => (
                <li key={q} className="flex items-start gap-2"><span>•</span><span>{q}</span></li>
              ))}
            </ul>
          </div>

          {/* ── Feedback Overview ── */}
          <SectionHeading>Feedback Overview</SectionHeading>
          <p className="text-xs text-gray-500 mb-4">Summarizes graphically your self-perception and compares it with the feedback you receive</p>
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start">
            {/* Radar chart */}
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-[#3b82f6]" /><p className="text-xs text-gray-600">Self</p></div>
                <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-[#16a34a]" /><p className="text-xs text-gray-600">Others</p></div>
              </div>
              <RadarChart data={RADAR_DATA} size={280} />
            </div>
            {/* Overview table */}
            <div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1e4d8c] text-white">
                    <th className="text-left px-4 py-2.5 font-medium">Section Name</th>
                    <th className="px-4 py-2.5 font-medium text-center w-20">Self</th>
                    <th className="px-4 py-2.5 font-medium text-center w-20">Others</th>
                  </tr>
                </thead>
                <tbody>
                  {OVERVIEW_TABLE.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? 'bg-[#dbeafe]/30' : 'bg-white'}>
                      <td className="px-4 py-2.5 text-gray-700">{i + 1}. {row.label}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-[#1e4d8c]">{row.self.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-[#1a1f2e]">{row.others.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Summary of Competencies ── */}
          <SectionHeading>Summary of Competencies</SectionHeading>
          <div className="space-y-8">
            {COMPETENCIES.map((comp) => (
              <div key={comp.id} className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start pb-6 border-b border-[#f1f4f9] last:border-0">
                <div>
                  <h3 className="text-xs font-bold text-[#1a1f2e] uppercase tracking-wide mb-2">{comp.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{comp.description}</p>
                </div>
                <BarChart groups={[
                  { label: 'Self', score: comp.byGroup.self },
                  { label: 'Peers/Internal Customers', score: comp.byGroup.peers },
                  { label: 'Direct Reports', score: comp.byGroup.directReports },
                  { label: 'Reporting Manager', score: comp.byGroup.reportingManager },
                  { label: 'Skip Level Manager', score: comp.byGroup.skipManager },
                ]} />
              </div>
            ))}
          </div>

          {/* ── Overall Comments ── */}
          <SectionHeading>Overall Comments</SectionHeading>
          <p className="text-xs text-gray-500 mb-3">Overall, what would you like this person to:</p>
          <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
            <div className="grid grid-cols-3">
              {['Start Doing', 'Stop Doing', 'Continue Doing'].map((h, i) => (
                <div key={h} className={`bg-[#1e4d8c] text-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${i > 0 ? 'border-l border-blue-700' : ''}`}>{h}</div>
              ))}
            </div>
            <div className="grid grid-cols-3 divide-x divide-[#e2e8f0]">
              {[OVERALL_COMMENTS.start, OVERALL_COMMENTS.stop, OVERALL_COMMENTS.continue].map((items, ci) => (
                <div key={ci} className="px-4 py-3 space-y-1.5">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#1e4d8c] shrink-0 mt-0.5">•</span>
                      <p className="text-xs text-gray-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="bg-[#bfdbfe]/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-center text-[#1e4d8c] border-t border-[#e2e8f0]">
              Self Comments
            </div>
            <div className="grid grid-cols-3 divide-x divide-[#e2e8f0]">
              {[OVERALL_COMMENTS.selfStart, OVERALL_COMMENTS.selfStop, OVERALL_COMMENTS.selfContinue].map((items, ci) => (
                <div key={ci} className="px-4 py-3">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-gray-400 shrink-0 mt-0.5">•</span>
                      <p className="text-xs text-gray-500 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── Detailed Feedback per competency ── */}
          <SectionHeading>Detailed Feedback</SectionHeading>
          <div className="space-y-10">
            {COMPETENCIES.map((comp) => (
              <div key={comp.id}>
                <h3 className="text-xs font-bold text-[#1a1f2e] uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-[#1e4d8c] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {comp.id.toUpperCase()}
                  </span>
                  {comp.title}
                </h3>
                <ScoreTable behaviours={comp.behaviours} />
                <div className="mt-3 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Qualitative Comments of {comp.title}
                </div>
                <QualitativeSection
                  strengths={comp.strengths}
                  developmentAreas={comp.developmentAreas}
                  selfStrengths={comp.selfStrengths}
                  selfDevelopmentAreas={comp.selfDevelopmentAreas}
                />
              </div>
            ))}
          </div>

          {/* ── Your Reflections ── */}
          <SectionHeading>Your Reflections</SectionHeading>
          <p className="text-xs text-gray-500 mb-4">Use the space below to capture your key takeaways after reading this report. Share these with your DC Coach during the debrief.</p>
          <div className="space-y-4">
            {[
              { key: 'learnings', label: 'Key learnings from the report' },
              { key: 'comparison', label: 'How did your self-assessment compare with others\' feedback?' },
              { key: 'surprise', label: 'Areas of surprise / disagreement' },
              { key: 'agreement', label: 'Areas of agreement' },
            ].map(({ key, label }) => (
              <div key={key} className="border border-[#e2e8f0] rounded-xl overflow-hidden">
                <div className="bg-[#f8f9fc] px-4 py-2 border-b border-[#e2e8f0]">
                  <p className="text-xs font-medium text-gray-600">{label}</p>
                </div>
                <textarea
                  rows={4}
                  value={reflections[key]}
                  onChange={(e) => setReflections((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="Write your thoughts here..."
                  className="w-full px-4 py-3 text-sm text-[#1a1f2e] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent resize-none"
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-[#e2e8f0] flex items-center justify-between">
            <p className="text-[10px] text-gray-400">Bajaj Auto Ltd | 360 Feedback Confidential Report</p>
            <p className="text-[10px] text-gray-400">EX-to-LX DC · Cohort 2025</p>
          </div>
        </div>
      </div>
    </div>
  )
}
