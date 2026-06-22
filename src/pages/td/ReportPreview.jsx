import { ArrowLeft, Download, Eye, Lock, Printer } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { competencyScores, getParticipant } from '../../data/adminData'

function ScoreBar({ score, color = 'bg-[#23609e]' }) {
  return <div className="flex items-center gap-3"><div className="h-2 flex-1 bg-[#e8edf3] rounded-full overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${score / 4 * 100}%` }} /></div><span className="w-7 text-right text-xs font-bold text-[#1d2a3e]">{score.toFixed(1)}</span></div>
}

export default function ReportPreview() {
  const { participantId } = useParams()
  const participant = getParticipant(participantId || 'rahul-kumar')
  if (!participant) return <Navigate to="/td/cohorts" replace />
  if (participant.responses < participant.totalResponses || participant.reportStatus === 'waiting') {
    return <Navigate to={`/td/participants/${participant.id}`} replace />
  }

  const printReport = () => window.print()
  return <div className="min-h-screen">
    <header className="h-20 bg-white border-b border-[#e4e9f1] px-8 flex items-center justify-between print:hidden">
      <div className="flex items-center gap-4"><Link to={`/td/participants/${participant.id}`} className="w-9 h-9 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-gray-500"><ArrowLeft size={17} /></Link><div><p className="text-xs text-gray-400">{participant.name} / Reports</p><h1 className="text-xl font-bold text-[#172033]">360 report preview</h1></div></div>
      <div className="flex items-center gap-2"><button onClick={printReport} className="flex items-center gap-2 border border-[#dce3ed] rounded-lg px-3.5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"><Printer size={15} />Print preview</button><button onClick={printReport} className="flex items-center gap-2 bg-[#1e4d8c] text-white rounded-lg px-4 py-2.5 text-xs font-semibold hover:bg-[#173f72]"><Download size={15} />Generate PDF</button></div>
    </header>

    <div className="px-8 py-5 max-w-[1080px] mx-auto print:hidden">
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 flex items-center gap-3"><Eye size={17} className="text-[#1e4d8c]" /><p className="text-xs text-blue-800"><strong>TD preview.</strong> Values below are calculated from {participant.responses} completed assessments. Generate PDF opens the browser’s save-as-PDF dialog.</p></div>
    </div>

    <main className="report-sheet max-w-[980px] mx-auto mb-12 bg-white shadow-sm border border-[#e1e6ed] print:border-0 print:shadow-none">
      <section className="min-h-[520px] bg-[#143e72] text-white p-14 relative overflow-hidden report-page">
        <div className="absolute w-80 h-80 rounded-full border-[70px] border-white/5 -right-24 -top-24" />
        <div className="relative flex justify-between items-start"><div className="flex items-center gap-3"><div className="w-11 h-11 bg-white rounded-lg text-[#143e72] font-extrabold flex items-center justify-center">B</div><div><p className="font-semibold">BAJAJ AUTO</p><p className="text-[10px] tracking-[0.2em] text-blue-200">TALENT DEVELOPMENT</p></div></div><p className="text-xs text-blue-200">CONFIDENTIAL</p></div>
        <div className="relative mt-28"><p className="text-sm tracking-[0.18em] uppercase text-blue-200">Development Centre · 360 Feedback</p><h2 className="text-5xl font-light mt-5 leading-tight">Leadership<br/><strong className="font-bold">Feedback Report</strong></h2><div className="mt-12 w-16 h-1 bg-[#f4ad43]" /><p className="text-2xl font-semibold mt-7">{participant.name}</p><p className="text-sm text-blue-200 mt-2">{participant.designation} · {participant.bu}</p></div>
        <div className="absolute bottom-10 left-14 right-14 flex justify-between text-xs text-blue-200"><span>EX to LX Cohort '25</span><span>June 2025</span></div>
      </section>

      <section className="p-12 report-page">
        <div className="flex justify-between items-start border-b-2 border-[#173f72] pb-5"><div><p className="text-[10px] tracking-[0.18em] text-[#2b69a7] font-bold">360 FEEDBACK REPORT</p><h2 className="text-2xl font-bold text-[#172033] mt-1">Your feedback at a glance</h2></div><span className="text-xs text-gray-400">01</span></div>
        <div className="grid grid-cols-3 gap-4 mt-7">
          <div className="rounded-xl bg-[#edf4fb] p-5"><p className="text-3xl font-bold text-[#1e4d8c]">{participant.responses}</p><p className="text-xs text-gray-600 mt-1">completed assessments</p></div>
          <div className="rounded-xl bg-[#f3effb] p-5"><p className="text-3xl font-bold text-violet-700">5</p><p className="text-xs text-gray-600 mt-1">leadership competencies</p></div>
          <div className="rounded-xl bg-[#eef8f2] p-5"><p className="text-3xl font-bold text-emerald-700">3.3</p><p className="text-xs text-gray-600 mt-1">overall aggregate / 4</p></div>
        </div>
        <div className="mt-9"><h3 className="text-sm font-bold text-[#172033]">How to read this report</h3><p className="text-xs text-gray-600 leading-6 mt-3">Scores are averages of completed assessments on a four-point behaviour scale. “Others” combines eligible peer and direct-report responses. The participant’s self-rating is shown separately and is not included in the nominee aggregate.</p></div>
        <div className="mt-7 border border-[#dfe6ee] rounded-xl overflow-hidden"><div className="grid grid-cols-[1fr_repeat(4,72px)] bg-[#f5f7fa] px-4 py-3 text-[10px] font-bold text-gray-500 uppercase"><span>Competency</span><span className="text-center">Self</span><span className="text-center">Manager</span><span className="text-center">Others</span><span className="text-center text-[#1e4d8c]">Aggregate</span></div>{competencyScores.map((item) => <div key={item.code} className="grid grid-cols-[1fr_repeat(4,72px)] px-4 py-3 border-t border-[#edf1f5] text-xs items-center"><span><strong className="text-[#172033]">{item.code}</strong><span className="block text-[10px] text-gray-400 mt-0.5">{item.name}</span></span><span className="text-center text-gray-500">{item.self.toFixed(1)}</span><span className="text-center text-gray-500">{item.manager.toFixed(1)}</span><span className="text-center text-gray-500">{item.others.toFixed(1)}</span><span className="text-center font-bold text-[#1e4d8c]">{item.aggregate.toFixed(1)}</span></div>)}</div>
        <div className="mt-6 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3"><Lock size={14} className="text-amber-600 mt-0.5"/><p className="text-[10px] text-amber-800 leading-relaxed">To protect respondent confidentiality, individual nominee scores are not displayed. A category is reported only when the minimum response threshold is met.</p></div>
      </section>

      <section className="p-12 report-page border-t border-[#e4e9f1]">
        <div className="flex justify-between items-start border-b-2 border-[#173f72] pb-5"><div><p className="text-[10px] tracking-[0.18em] text-[#2b69a7] font-bold">COMPETENCY PROFILE</p><h2 className="text-2xl font-bold text-[#172033] mt-1">Aggregate score summary</h2></div><span className="text-xs text-gray-400">02</span></div>
        <div className="mt-8 space-y-6">{competencyScores.map((item) => <div key={item.code}><div className="flex justify-between mb-2"><div><span className="inline-flex w-10 text-[10px] font-bold text-[#1e4d8c]">{item.code}</span><span className="text-xs font-semibold text-[#263247]">{item.name}</span></div></div><ScoreBar score={item.aggregate} /></div>)}</div>
        <div className="flex justify-between text-[9px] text-gray-400 pl-10 mt-3"><span>1 · Rarely</span><span>2 · Occasionally</span><span>3 · Often</span><span>4 · Almost always</span></div>
        <div className="grid grid-cols-2 gap-5 mt-10">
          <div className="rounded-xl border-l-4 border-emerald-500 bg-emerald-50 p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Relative strengths</p><h3 className="text-sm font-bold text-[#172033] mt-3">Develops & Engages People</h3><p className="text-xs text-gray-600 leading-5 mt-2">Others experience consistent support, timely feedback and an inclusive environment.</p><h3 className="text-sm font-bold text-[#172033] mt-4">Aligns & Motivates Team</h3><p className="text-xs text-gray-600 leading-5 mt-2">Strong alignment of team priorities with organisation goals.</p></div>
          <div className="rounded-xl border-l-4 border-amber-500 bg-amber-50 p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Development focus</p><h3 className="text-sm font-bold text-[#172033] mt-3">Champions Improvement & Change</h3><p className="text-xs text-gray-600 leading-5 mt-2">Build clearer milestones and engage sponsors earlier in the change journey.</p><h3 className="text-sm font-bold text-[#172033] mt-4">Solves Problems Creatively</h3><p className="text-xs text-gray-600 leading-5 mt-2">Strengthen solution evaluation against customer needs and constraints.</p></div>
        </div>
      </section>

      <section className="p-12 report-page border-t border-[#e4e9f1]">
        <div className="flex justify-between items-start border-b-2 border-[#173f72] pb-5"><div><p className="text-[10px] tracking-[0.18em] text-[#2b69a7] font-bold">QUALITATIVE FEEDBACK</p><h2 className="text-2xl font-bold text-[#172033] mt-1">Start · Continue · Stop</h2></div><span className="text-xs text-gray-400">03</span></div>
        <div className="mt-8 space-y-4">{[
          ['Start', 'Create more space for the team to test small ideas before committing to a full solution.', 'bg-blue-50 border-blue-500 text-blue-700'],
          ['Continue', 'Continue giving clear context, involving the team in decisions and recognising contributions.', 'bg-emerald-50 border-emerald-500 text-emerald-700'],
          ['Stop', 'Avoid stepping into execution too quickly when the team can work through the problem independently.', 'bg-rose-50 border-rose-400 text-rose-700'],
        ].map(([label, copy, classes]) => <div key={label} className={`rounded-xl border-l-4 p-5 ${classes}`}><p className="text-xs font-bold uppercase tracking-wider">{label}</p><p className="text-sm text-[#334155] leading-6 mt-2">“{copy}”</p><p className="text-[10px] text-gray-400 mt-3">Synthesised theme from multiple respondents</p></div>)}</div>
        <div className="mt-10 border-t border-[#e6ebf1] pt-6"><h3 className="text-sm font-bold text-[#172033]">Suggested development question</h3><p className="mt-3 text-xl text-[#1e4d8c] leading-relaxed">How might you create clearer sponsorship and milestones for change while preserving the ownership your team values?</p></div>
        <div className="mt-14 flex justify-between text-[9px] text-gray-400"><span>Confidential · For development purposes only</span><span>Generated 22 Jun 2026</span></div>
      </section>
    </main>
  </div>
}
