import { ArrowLeft, Check, ChevronRight, Clock, Download, FileText, Mail, Users } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { processSteps } from '../../data/adminData'
import { api } from '../../lib/api'
import { exportParticipantNomineeStatus, exportParticipantProcessStatus } from '../../lib/trackingExport'

const relationshipLabels = {
  'reporting-manager': 'Reporting Manager',
  'skip-manager': 'Skip Manager / BU Head',
  peer: 'Peer / Internal Customer',
  'direct-report': 'Direct Report',
}

function stepState(participant, step, index) {
  if (participant.taskStatus?.[step.id] === 'completed') return 'complete'
  const firstIncompleteIndex = processSteps.findIndex((s) => participant.taskStatus?.[s.id] !== 'completed')
  return index === firstIncompleteIndex ? 'current' : 'upcoming'
}

export default function ParticipantDetail() {
  const { participantId } = useParams()
  const [participant, setParticipant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [taskView, setTaskView] = useState('all')
  const [reportAction, setReportAction] = useState({ loading: false, error: '' })

  async function handleGenerateReport() {
    setReportAction({ loading: true, error: '' })
    try {
      await api.generate360Report(participant.id)
      setParticipant((current) => {
        const taskStatus = { ...current.taskStatus, report: 'completed' }
        const taskCompletionPercent = Math.round(
          (Object.values(taskStatus).filter((status) => status === 'completed').length / Object.keys(taskStatus).length) * 100,
        )
        return { ...current, reportStatus: 'generated', progress: 100, taskStatus, taskCompletionPercent, lastActivity: new Date().toISOString() }
      })
    } catch (err) {
      setReportAction({ loading: false, error: err.message || 'Unable to generate the report.' })
      return
    }
    setReportAction({ loading: false, error: '' })
  }

  useEffect(() => {
    if (!participantId) return
    setLoading(true)
    setError('')
    api.getParticipant(participantId)
      .then((result) => setParticipant(result.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [participantId])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded w-64" />
          <div className="h-56 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (!participant) return <Navigate to="/td/cohorts" replace />

  const allNomineesSubmitted = participant.totalResponses > 0 && participant.responses === participant.totalResponses
  const reportReady = participant.reportReady === true
  const cutoffPassed = participant.threeSixtyCutoffPassed === true
  const reportGenerated = ['generated', 'released'].includes(participant.reportStatus)
  const cohort = participant.cohort
  const nominees = participant.nominees || []
  const pendingNominees = nominees.filter((nominee) => nominee.status !== 'submitted')
  const relationshipSummary = ['reporting-manager', 'skip-manager', 'peer', 'direct-report'].map((relationship) => {
    const items = nominees.filter((nominee) => nominee.relationship === relationship)
    return {
      relationship,
      responded: items.filter((nominee) => nominee.status === 'submitted').length,
      total: items.length,
    }
  }).filter((item) => item.total > 0)

  const tasksWithState = processSteps.map((step, index) => ({ ...step, index, state: stepState(participant, step, index) }))
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
      <div className="flex items-center gap-2">
        <button onClick={() => exportParticipantProcessStatus(participant, cohort?.name)} className="flex items-center gap-2 rounded-lg border border-[#dce3ed] bg-white px-3 py-2 text-xs font-semibold text-[#1e4d8c] hover:bg-blue-50"><Download size={15} />Process status</button>
        <button onClick={() => exportParticipantNomineeStatus(participant)} className="flex items-center gap-2 rounded-lg border border-[#dce3ed] bg-white px-3 py-2 text-xs font-semibold text-[#1e4d8c] hover:bg-blue-50"><Download size={15} />Nominee status</button>
      </div>
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
            <span className="font-semibold text-amber-700">{participant.masterData?.reportingManagerName || 'Not available'}</span>
            <span className="mx-3 text-gray-300">•</span>
            <span className="font-semibold text-emerald-700">{cohort?.name || 'Unassigned cohort'}</span>
          </p>
        </div>
        <div className="min-w-56"><div className="flex justify-between text-xs mb-2"><span className="text-gray-500">Overall completion</span><strong>{participant.taskCompletionPercent}%</strong></div><div className="h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full bg-[#2867a7]" style={{ width: `${participant.taskCompletionPercent}%` }} /></div></div>
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
              {relationshipSummary.map(({ relationship, responded, total }) => <div key={relationship} className="rounded-xl bg-[#f8fafc] border border-[#edf1f5] p-4"><p className="text-[11px] text-gray-500">{relationshipLabels[relationship] || relationship}</p><p className="text-lg font-bold text-[#172033] mt-2">{responded}<span className="text-xs font-normal text-gray-400">/{total}</span></p><div className="h-1 bg-gray-200 rounded mt-2"><div className="h-1 bg-violet-500 rounded" style={{ width: `${Math.min(100, total ? responded / total * 100 : 0)}%` }} /></div></div>)}
            </div>
            {participant.responses < participant.totalResponses && <div className="px-5 pb-5"><button className="flex items-center gap-2 text-xs font-semibold text-[#1e4d8c] border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50"><Mail size={14} />Send reminder to pending nominees</button></div>}
          </section>

          <section className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e8edf3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div><h3 className="font-semibold text-[#172033]">Nominated respondents</h3><p className="text-xs text-gray-400 mt-1">Names are visible for tracking completion; feedback content remains confidential</p></div>
              <span className="text-xs font-semibold text-rose-600">{pendingNominees.length} pending</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc] border-b border-[#e8edf4]"><tr>{['Nominee', 'Relationship', 'Status', 'Nominated', 'Responded'].map((label) => <th key={label} className="px-5 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-400">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-[#eef2f6]">
                  {nominees.map((nominee) => <tr key={`${nominee.email}-${nominee.relationship}`}>
                    <td className="px-5 py-4"><p className="text-sm font-semibold text-[#172033]">{nominee.name}</p><p className="text-[11px] text-gray-400">{nominee.email}</p></td>
                    <td className="px-5 py-4 text-xs text-gray-600">{nominee.relationshipLabel || relationshipLabels[nominee.relationship] || nominee.relationship}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${nominee.status === 'submitted' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{nominee.status === 'submitted' ? 'Submitted' : 'Pending'}</span></td>
                    <td className="px-5 py-4 text-xs text-gray-500">{nominee.submittedAt ? new Date(nominee.submittedAt).toLocaleDateString('en-GB') : '-'}</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{nominee.status === 'submitted' ? 'Awaiting response' : '-'}</td>
                  </tr>)}
                </tbody>
              </table>
              {!nominees.length && <div className="py-12 text-center"><Users className="mx-auto text-gray-300" /><p className="text-sm text-gray-500 mt-3">No nominees submitted yet.</p></div>}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl bg-[#173f72] p-5 text-white">
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><FileText size={19} /></span>
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${reportGenerated || reportReady ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/10 text-blue-100'}`}>{reportGenerated ? 'Generated' : reportReady ? 'Data ready' : 'Not ready'}</span>
            </div>
            <h3 className="mt-5 font-semibold">Aggregated 360 report</h3>
            <p className="mt-2 text-xs leading-relaxed text-blue-200">{reportGenerated ? 'This report was generated by Talent Development and is ready to preview.' : reportReady ? cutoffPassed && !allNomineesSubmitted ? 'The 360 cutoff has passed. TD can generate the report from the responses received so far.' : 'Every required respondent has submitted a complete rating set. TD can now generate the report.' : allNomineesSubmitted ? 'Responses are marked submitted, but one or more required rating sets are incomplete. Generation remains locked until the cutoff passes.' : `${participant.totalResponses - participant.responses} nominee response${participant.totalResponses - participant.responses === 1 ? '' : 's'} still pending. The report unlocks when all responses are complete or after the 360 cutoff.`}</p>
            {reportAction.error && <p className="mt-3 text-xs text-red-200">{reportAction.error}</p>}
            {reportGenerated ? <Link to={`/td/reports/${participant.id}`} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-[#173f72]">Preview report <ChevronRight size={16} /></Link> : reportReady ? <button onClick={handleGenerateReport} disabled={reportAction.loading} className="mt-5 w-full rounded-lg bg-emerald-400 py-2.5 text-sm font-semibold text-[#12345a] disabled:opacity-60">{reportAction.loading ? 'Generating…' : 'Generate report'}</button> : <button disabled className="mt-5 w-full rounded-lg bg-white/10 py-2.5 text-sm font-semibold text-blue-200">Report generation locked</button>}
          </section>
          <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5"><h3 className="text-sm font-semibold text-[#172033] mb-4">Participant details</h3>{[['Email', participant.email || '-'], ['DC type', cohort?.programme || 'Development Centre'], ['Job level', participant.masterData?.jobLevel || '-'], ['Department', participant.masterData?.department || '-'], ['Location', participant.masterData?.location || '-'], ['Skip manager', participant.masterData?.skipManagerName || '-'], ['BU Head', participant.masterData?.buHeadName || '-'], ['BUHR', participant.masterData?.buhrName || '-']].map(([label, value]) => <div key={label} className="flex justify-between py-2.5 border-b last:border-0 border-[#edf1f5] gap-3"><span className="text-xs text-gray-400">{label}</span><span className="text-xs font-medium text-[#374151] text-right">{value}</span></div>)}</section>
          <section className="bg-white border border-[#e2e8f0] rounded-2xl p-5"><div className="flex gap-3"><Users size={17} className="text-gray-400 mt-0.5"/><div><h3 className="text-xs font-semibold text-[#172033]">Confidentiality</h3><p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">TD can monitor completion, but the report exposes only aggregated nominee scores. Individual ratings are never shown.</p></div></div></section>
        </aside>
      </div>
    </div>
  </div>
}
