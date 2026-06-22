import { Check, ChevronDown, ChevronRight, Download, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cohorts, participants } from '../../data/adminData'

const statusStyle = {
  ready: 'bg-amber-50 text-amber-700 border-amber-200',
  generated: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  waiting: 'bg-gray-50 text-gray-500 border-gray-200',
}

export default function Cohorts() {
  const [cohortId, setCohortId] = useState('ex-lx-25')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [generated, setGenerated] = useState(false)
  const cohort = cohorts.find((item) => item.id === cohortId)
  const cohortParticipants = useMemo(() => participants.filter((participant) => participant.cohortId === cohortId && (filter === 'all' || participant.reportStatus === filter) && `${participant.name} ${participant.employeeId} ${participant.bu}`.toLowerCase().includes(query.toLowerCase())), [cohortId, filter, query])
  const allInCohort = participants.filter((participant) => participant.cohortId === cohortId)
  const complete = allInCohort.filter((p) => p.progress === 100).length
  const responses = allInCohort.reduce((sum, p) => sum + p.responses, 0)
  const responseTotal = allInCohort.reduce((sum, p) => sum + p.totalResponses, 0)
  const ready = allInCohort.filter((p) => p.reportStatus === 'ready').length

  return (
    <div>
      <header className="h-20 bg-white border-b border-[#e4e9f1] px-8 flex items-center justify-between">
        <div><p className="text-xs text-gray-400 mb-1">Talent Development / Cohorts</p><h1 className="text-xl font-bold text-[#172033]">Cohort management</h1></div>
        <div className="relative">
          <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} className="appearance-none min-w-56 bg-white border border-[#dce3ed] rounded-lg py-2.5 pl-3 pr-9 text-sm font-medium text-[#172033] focus:outline-none focus:ring-2 focus:ring-blue-200">
            {cohorts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
        </div>
      </header>

      <div className="p-8 max-w-[1440px] mx-auto">
        {generated && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3 text-sm text-emerald-800"><span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center"><Check size={14} /></span><span><strong>{ready} reports prepared.</strong> They are now available for TD review before release.</span></div>}

        <section className="rounded-2xl bg-gradient-to-r from-[#17477f] to-[#2465a7] text-white p-6 mb-6 flex items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-200 mb-3"><span className="px-2 py-1 rounded-full bg-white/10">Active cohort</span><span>{cohort.programme}</span></div>
            <h2 className="text-2xl font-bold">{cohort.name}</h2>
            <p className="text-sm text-blue-100 mt-1">DC event: {cohort.eventDate} · {allInCohort.length} participants</p>
          </div>
          <button disabled={!ready || generated} onClick={() => setGenerated(true)} className="shrink-0 flex items-center gap-2 rounded-lg bg-white text-[#17477f] px-4 py-2.5 text-sm font-semibold hover:bg-blue-50 disabled:opacity-60"><Download size={16} />{generated ? 'Reports prepared' : `Generate ready reports (${ready})`}</button>
        </section>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Participants', value: allInCohort.length, note: 'in this cohort', color: 'text-[#1e4d8c]' },
            { label: 'Process complete', value: `${complete}/${allInCohort.length}`, note: `${Math.round((complete / allInCohort.length) * 100)}% completed`, color: 'text-emerald-600' },
            { label: '360 responses', value: `${responses}/${responseTotal}`, note: `${Math.round((responses / responseTotal) * 100)}% received`, color: 'text-violet-600' },
            { label: 'Reports ready', value: ready, note: 'awaiting generation', color: 'text-amber-600' },
          ].map((metric) => <div key={metric.label} className="bg-white border border-[#e2e8f0] rounded-xl p-5"><p className="text-xs font-medium text-gray-500">{metric.label}</p><p className={`text-2xl font-bold mt-2 ${metric.color}`}>{metric.value}</p><p className="text-xs text-gray-400 mt-1">{metric.note}</p></div>)}
        </div>

        <section className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e8edf4] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div><h3 className="font-semibold text-[#172033]">DC participants</h3><p className="text-xs text-gray-400 mt-0.5">Select a participant to view their application and assessment process</p></div>
            <div className="flex gap-2">
              <div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-gray-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search participants" className="w-56 border border-[#dce3ed] rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100" /></div>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-[#dce3ed] rounded-lg px-3 text-xs text-gray-600 bg-white"><option value="all">All reports</option><option value="ready">Ready</option><option value="generated">Generated</option><option value="waiting">Not ready</option></select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f8fafc] border-b border-[#e8edf4]"><tr>{['Participant', 'Business unit', 'Current stage', '360 responses', 'Overall progress', 'Report', ''].map((label) => <th key={label} className="px-5 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-400">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#eef2f6]">
                {cohortParticipants.map((participant) => <tr key={participant.id} className="hover:bg-blue-50/40 transition-colors group">
                  <td className="px-5 py-4"><Link to={`/td/participants/${participant.id}`} className="flex items-center gap-3"><span className="w-9 h-9 rounded-full bg-[#e4eef9] text-[#1e4d8c] flex items-center justify-center text-xs font-bold">{participant.initials}</span><span><span className="block text-sm font-semibold text-[#172033] group-hover:text-[#1e4d8c]">{participant.name}</span><span className="block text-[11px] text-gray-400">{participant.employeeId} · {participant.designation}</span></span></Link></td>
                  <td className="px-5 py-4 text-xs text-gray-600">{participant.bu}</td>
                  <td className="px-5 py-4"><span className="text-xs font-medium text-[#374151]">{participant.stage}</span><p className="text-[10px] text-gray-400 mt-0.5">Updated {participant.lastActivity}</p></td>
                  <td className="px-5 py-4"><p className="text-xs font-semibold text-[#172033]">{participant.responses}/{participant.totalResponses}</p><div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1"><div className="h-1.5 bg-violet-500 rounded-full" style={{ width: `${participant.totalResponses ? participant.responses / participant.totalResponses * 100 : 0}%` }} /></div></td>
                  <td className="px-5 py-4"><div className="flex items-center gap-2"><div className="w-20 h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 bg-[#2f6eae] rounded-full" style={{ width: `${participant.progress}%` }} /></div><span className="text-xs font-semibold text-gray-600">{participant.progress}%</span></div></td>
                  <td className="px-5 py-4"><span className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-semibold ${statusStyle[generated && participant.reportStatus === 'ready' ? 'generated' : participant.reportStatus]}`}>{generated && participant.reportStatus === 'ready' ? 'Generated' : participant.reportStatus === 'waiting' ? 'Not ready' : participant.reportStatus[0].toUpperCase() + participant.reportStatus.slice(1)}</span></td>
                  <td className="px-5 py-4"><Link aria-label={`View ${participant.name}`} to={`/td/participants/${participant.id}`} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-100 hover:text-[#1e4d8c]"><ChevronRight size={17} /></Link></td>
                </tr>)}
              </tbody>
            </table>
            {!cohortParticipants.length && <div className="py-16 text-center"><Users className="mx-auto text-gray-300" /><p className="text-sm text-gray-500 mt-3">No participants match this view.</p></div>}
          </div>
        </section>
      </div>
    </div>
  )
}
