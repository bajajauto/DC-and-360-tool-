import { Download, Eye, FileText, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cohorts, participants } from '../../data/adminData'

const generatedReports = participants.filter((participant) => participant.reportStatus === 'generated')

function getCohort(participant) {
  return cohorts.find((cohort) => cohort.id === participant.cohortId)
}

export default function TDReports() {
  const [query, setQuery] = useState('')
  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return generatedReports
    return generatedReports.filter((participant) => {
      const cohort = getCohort(participant)
      return `${participant.name} ${participant.employeeId} ${participant.designation} ${participant.bu} ${cohort?.name || ''}`.toLowerCase().includes(normalizedQuery)
    })
  }, [query])
  const totalResponses = generatedReports.reduce((sum, participant) => sum + participant.responses, 0)

  return (
    <div>
      <header className="h-20 bg-white border-b border-[#e4e9f1] px-8 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">Talent Development / Reports</p>
          <h1 className="text-xl font-bold text-[#172033]">360 reports</h1>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-[#dce3ed] bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <Download size={15} />
          Download all
        </button>
      </header>

      <div className="p-8 max-w-[1360px] mx-auto">
        <section className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
            <p className="text-xs font-medium text-gray-500">Generated reports</p>
            <p className="text-2xl font-bold mt-2 text-[#1e4d8c]">{generatedReports.length}</p>
            <p className="text-xs text-gray-400 mt-1">available for TD review</p>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
            <p className="text-xs font-medium text-gray-500">Completed responses</p>
            <p className="text-2xl font-bold mt-2 text-violet-600">{totalResponses}</p>
            <p className="text-xs text-gray-400 mt-1">included in generated reports</p>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
            <p className="text-xs font-medium text-gray-500">Release status</p>
            <p className="text-2xl font-bold mt-2 text-emerald-600">Ready</p>
            <p className="text-xs text-gray-400 mt-1">PDF previews can be opened now</p>
          </div>
        </section>

        <section className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e8edf4] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#172033]">Already generated</h2>
              <p className="text-xs text-gray-400 mt-0.5">Reports with completed 360 data and a generated report status</p>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" className="w-56 border border-[#dce3ed] rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f8fafc] border-b border-[#e8edf4]">
                <tr>
                  {['Participant', 'Cohort', 'Business unit', 'Responses', 'Generated', 'Actions'].map((label) => (
                    <th key={label} className="px-5 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-400">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f6]">
                {filteredReports.map((participant) => {
                  const cohort = getCohort(participant)
                  return (
                    <tr key={participant.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-[#e4eef9] text-[#1e4d8c] flex items-center justify-center text-xs font-bold">{participant.initials}</span>
                          <span>
                            <span className="block text-sm font-semibold text-[#172033]">{participant.name}</span>
                            <span className="block text-[11px] text-gray-400">{participant.employeeId} - {participant.designation}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-medium text-[#374151]">{cohort?.name || 'Unassigned cohort'}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{cohort?.programme || 'Development Centre'}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600">{participant.bu}</td>
                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold text-[#172033]">{participant.responses}/{participant.totalResponses}</p>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1">
                          <div className="h-1.5 bg-violet-500 rounded-full" style={{ width: `${participant.responses / participant.totalResponses * 100}%` }} />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-700">Generated</span>
                        <p className="text-[10px] text-gray-400 mt-1">Updated {participant.lastActivity}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link to={`/td/reports/${participant.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e4d8c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#173f72]">
                            <Eye size={14} />
                            Preview
                          </Link>
                          <Link to={`/td/reports/${participant.id}`} className="w-8 h-8 rounded-lg border border-[#dce3ed] flex items-center justify-center text-gray-500 hover:bg-gray-50" aria-label={`Download ${participant.name} report`}>
                            <Download size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!filteredReports.length && (
            <div className="py-16 text-center">
              <FileText className="mx-auto text-gray-300" />
              <p className="text-sm text-gray-500 mt-3">{generatedReports.length ? 'No generated reports match this search.' : 'No generated reports yet.'}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
