import { ArrowLeft, Check, ChevronRight, Clock, FileText, Mail, MoreHorizontal, Users } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { getParticipant, processSteps } from '../../data/adminData'

function stepState(participant, index) {
  const completed = Math.floor((participant.progress / 100) * processSteps.length)
  if (processSteps[index].id === 'feedback' && participant.responses < participant.totalResponses) return 'upcoming'
  if (processSteps[index].id === 'report' && participant.responses < participant.totalResponses) return 'upcoming'
  if (index < completed) return 'complete'
  if (index === completed) return 'current'
  return 'upcoming'
}

export default function ParticipantDetail() {
  const { participantId } = useParams()
  const participant = getParticipant(participantId)
  const [taskView, setTaskView] = useState('all')
  if (!participant) return <Navigate to="/td/cohorts" replace />

  const allNomineesSubmitted = participant.totalResponses > 0 && participant.responses === participant.totalResponses
  const reportReady = allNomineesSubmitted && participant.reportStatus !== 'waiting'

  const tasksWithState = processSteps.map((step, index) => ({ ...step, index, state: stepState(participant, index) }))
  const completedTasks = tasksWithState.filter((step) => step.state === 'complete')
  const pendingTasks = tasksWithState.filter((step) => step.state !== 'complete')
  const taskGroups = taskView === 'all'
    ? [
        { id: 'completed', label: 'Completed tasks', tasks: completedTasks },
        { id: 'pending', label: 'Pending tasks', tasks: pendingTasks },
      ]
    : taskView === 'completed'
      ? [{ id: 'completed', label: 'Completed tasks', tasks: completedTasks }]
      : [{ id: 'pending', label: 'Pending tasks', tasks: pendingTasks }]

  return <div>
    <header className="h-20 bg-white border-b border-[#e4e9f1] px-8 flex items-center justify-between">
      <div className="flex items-center gap-4"><Link to="/td/cohorts" className="w-9 h-9 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-gray-500 hover:text-[#1e4d8c]"><ArrowLeft size={17} /></Link><div><p className="text-xs text-gray-400">Cohorts / {participant.name}</p><h1 className="text-xl font-bold text-[#172033]">Participant process</h1></div></div>
      <button className="w-9 h-9 rounded-lg border border-[#e2e8f0] flex items-center justify-center text-gray-500"><MoreHorizontal size={18} /></button>
    </header>
    <div className="p-8 max-w-[1360px] mx-auto">
      <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6 mb-6 flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#dceafb] text-[#1e4d8c] flex items-center justify-center text-xl font-bold">{participant.initials}</div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#172033]">{participant.name}</h2>
          <p className="text-sm mt-1.5">
            <span className="font-semibold text-[#2563a5]">{participant.employeeId}</span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="font-medium text-violet-700">{participant.designation}</span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="font-medium text-cyan-700">{participant.bu}</span>
          </p>
          <p className="text-xs mt-3">
            <span className="text-gray-400">Reporting manager: </span>
            <span className="font-semibold text-amber-700">Priya Menon</span>
            <span className="mx-3 text-gray-300">•</span>
            <span className="font-semibold text-emerald-700">EX to LX Cohort '25</span>
          </p>
        </div>
        <div className="min-w-56"><div className="flex justify-between text-xs mb-2"><span className="text-gray-500">Overall completion</span><strong>{participant.progress}%</strong></div><div className="h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full bg-[#2867a7]" style={{ width: `${participant.progress}%` }} /></div></div>
      </section>

      <div className="grid xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <section className="bg-white border border-[#e2e8f0] rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div><h3 className="font-semibold text-[#172033]">Application process</h3><p className="text-xs text-gray-400 mt-1">Live status across participant, nominee and assessor tasks</p></div>
              <div className="inline-flex self-start rounded-lg bg-[#f1f4f8] p-1" role="group" aria-label="Filter application tasks">
                <button
                  onClick={() => setTaskView('all')}
                  aria-pressed={taskView === 'all'}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${taskView === 'all' ? 'bg-white text-[#172033] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  All <span className={`ml-1 ${taskView === 'all' ? 'text-[#1e4d8c]' : 'text-gray-400'}`}>{tasksWithState.length}</span>
                </button>
                <button
                  onClick={() => setTaskView('completed')}
                  aria-pressed={taskView === 'completed'}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${taskView === 'completed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Completed <span className={`ml-1 ${taskView === 'completed' ? 'text-emerald-500' : 'text-gray-400'}`}>{completedTasks.length}</span>
                </button>
                <button
                  onClick={() => setTaskView('pending')}
                  aria-pressed={taskView === 'pending'}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${taskView === 'pending' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Pending <span className={`ml-1 ${taskView === 'pending' ? 'text-rose-500' : 'text-gray-400'}`}>{pendingTasks.length}</span>
                </button>
              </div>
            </div>
            <div className="space-y-6">
              {taskGroups.map((group) => <div key={group.id}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${group.id === 'completed' ? 'text-emerald-600' : 'text-rose-600'}`}>{group.label}</span>
                  <div className={`h-px flex-1 ${group.id === 'completed' ? 'bg-emerald-200' : 'bg-rose-200'}`} />
                  {group.id === 'pending' && <span className="text-[10px] font-medium text-rose-500">Current: {participant.stage}</span>}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {group.tasks.map((step) => { const { state, index } = step; return <div key={step.id} className={`rounded-xl border p-4 flex gap-3 ${state === 'complete' ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${state === 'complete' ? 'bg-emerald-100 text-emerald-700' : state === 'current' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-600'}`}>{state === 'complete' ? <Check size={15} /> : state === 'current' ? <Clock size={14} /> : index + 1}</span>
                    <div className="flex-1"><p className="text-sm font-semibold text-[#253047]">{step.label}</p><p className={`text-[11px] mt-1 ${state === 'complete' ? 'text-emerald-700/60' : 'text-rose-700/60'}`}>Owner: {step.owner}</p></div><span className={`text-[10px] capitalize font-medium ${state === 'complete' ? 'text-emerald-600' : 'text-rose-600'}`}>{state}</span>
                  </div> })}
                </div>
              </div>)}
            </div>
          </section>

          <section className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e8edf3] flex justify-between"><div><h3 className="font-semibold text-[#172033]">360 feedback collection</h3><p className="text-xs text-gray-400 mt-1">Individual responses remain confidential</p></div><div className="text-right"><p className="text-lg font-bold text-violet-700">{participant.responses}/{participant.totalResponses}</p><p className="text-[10px] text-gray-400">responses received</p></div></div>
            <div className="p-5 grid sm:grid-cols-4 gap-3">
              {[['Self', 1, 1], ['Reporting manager', 1, 1], ['Peers', Math.max(0, participant.responses - 3), 4], ['Direct reports', Math.min(2, Math.max(0, participant.responses - 2)), 2]].map(([label, count, total]) => <div key={label} className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4"><p className="text-[11px] text-gray-500">{label}</p><p className="text-lg font-bold text-[#172033] mt-2">{count}<span className="text-xs font-normal text-gray-400">/{total}</span></p><div className="h-1 bg-gray-200 rounded mt-2"><div className="h-1 bg-violet-500 rounded" style={{ width: `${Math.min(100, count / total * 100)}%` }} /></div></div>)}
            </div>
            {participant.responses < participant.totalResponses && <div className="px-5 pb-5"><button className="flex items-center gap-2 text-xs font-semibold text-[#1e4d8c] border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50"><Mail size={14} />Send reminder to pending nominees</button></div>}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl bg-[#173f72] text-white p-5"><div className="flex items-start justify-between"><span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><FileText size={19} /></span><span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${reportReady ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/10 text-blue-100'}`}>{reportReady ? 'Data ready' : 'Not ready'}</span></div><h3 className="font-semibold mt-5">Aggregated 360 report</h3><p className="text-xs text-blue-200 mt-2 leading-relaxed">{reportReady ? 'All nominees have submitted. Scores can now be aggregated and populated into the report template.' : `${participant.totalResponses - participant.responses} nominee response${participant.totalResponses - participant.responses === 1 ? '' : 's'} still pending. The report unlocks only after every nominee submits.`}</p>{reportReady ? <Link to={`/td/reports/${participant.id}`} className="mt-5 w-full bg-white text-[#173f72] rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2">Preview report <ChevronRight size={16} /></Link> : <button disabled className="mt-5 w-full bg-white/10 text-blue-200 rounded-lg py-2.5 text-sm font-semibold">Waiting for all nominees ({participant.responses}/{participant.totalResponses})</button>}</section>
          <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5"><h3 className="text-sm font-semibold text-[#172033] mb-4">Participant details</h3>{[['Email', `${participant.name.toLowerCase().replace(' ', '.')}@bajaj.com`], ['DC type', 'EX to LX'], ['Event', '25–26 Jul 2025'], ['Location', 'Akurdi, Pune']].map(([label, value]) => <div key={label} className="flex justify-between py-2.5 border-b last:border-0 border-[#edf1f5] gap-3"><span className="text-xs text-gray-400">{label}</span><span className="text-xs font-medium text-[#374151] text-right">{value}</span></div>)}</section>
          <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5"><div className="flex gap-3"><Users size={17} className="text-gray-400 mt-0.5"/><div><h3 className="text-xs font-semibold text-[#172033]">Confidentiality</h3><p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">TD can monitor completion, but the report exposes only aggregated nominee scores. Individual ratings are never shown.</p></div></div></section>
        </aside>
      </div>
    </div>
  </div>
}
