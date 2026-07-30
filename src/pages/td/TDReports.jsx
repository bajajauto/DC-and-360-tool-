import { ArrowUpRight, Check, Download, Eye, FileSpreadsheet, FileText, Search, Send, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { download360Pptx, download360ResponseData } from '../../lib/reportDownload'

function getCohort(cohorts, participant) {
  return cohorts.find((cohort) => cohort.id === participant.cohortId)
}

export default function TDReports() {
  const [query, setQuery] = useState('')
  const [cohorts, setCohorts] = useState([])
  const [participants, setParticipants] = useState([])
  const [selectedCohortId, setSelectedCohortId] = useState('all')
  const [selectedReportType, setSelectedReportType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [releaseError, setReleaseError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      setLoading(true)
      setError('')

      try {
        const cohortResult = await api.getCohorts()
        const cohortRows = cohortResult.data || []
        const reportResult = await api.getReportRepository()

        if (!cancelled) {
          setCohorts(cohortRows)
          setParticipants(reportResult.data || [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadReports()

    return () => {
      cancelled = true
    }
  }, [])

  const cohortParticipants = useMemo(
    () => selectedCohortId === 'all' ? participants : participants.filter((participant) => participant.cohortId === selectedCohortId),
    [participants, selectedCohortId],
  )

  const generatedReports = useMemo(() => (
    selectedReportType === 'all'
      ? cohortParticipants
      : cohortParticipants.filter((report) => report.reportType === selectedReportType)
  ), [cohortParticipants, selectedReportType])

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const matchingReports = normalizedQuery ? generatedReports.filter((participant) => {
      const cohort = getCohort(cohorts, participant)
      return `${participant.name} ${participant.employeeId} ${participant.designation} ${participant.bu} ${cohort?.name || ''}`.toLowerCase().includes(normalizedQuery)
    }) : generatedReports

    if (selectedReportType !== 'all') return matchingReports

    const grouped = new Map()
    matchingReports.forEach((report) => {
      const current = grouped.get(report.id)
      if (current) {
        current.reportTypes.push(report.reportType)
        current.reportCount += 1
      } else {
        grouped.set(report.id, { ...report, reportTypes: [report.reportType], reportCount: 1 })
      }
    })
    return [...grouped.values()]
  }, [cohorts, generatedReports, query, selectedReportType])

  const releasedReports = generatedReports.filter((participant) => participant.reportStatus === 'released').length
  const representedCohorts = selectedCohortId === 'all' ? cohorts.length : cohorts.some((cohort) => cohort.id === selectedCohortId) ? 1 : 0

  async function handleDownload(participant) {
    setDownloadError('')

    try {
      await download360Pptx(participant.id, participant.name)
    } catch (err) {
      setDownloadError(err.message || 'Unable to download the report.')
    }
  }

  async function handleDownloadResponseData(participant) {
    setDownloadError('')

    try {
      await download360ResponseData(participant.id, participant.name)
    } catch (err) {
      setDownloadError(err.message || 'Unable to download the response data.')
    }
  }

  async function handleRelease(participant) {
    setReleaseError('')

    try {
      await api.release360Report(participant.id)
      setParticipants((current) =>
        current.map((item) =>
          item.reportId === participant.reportId
            ? { ...item, reportStatus: 'released', progress: 100, lastActivity: new Date().toISOString() }
            : item,
        ),
      )
    } catch (err) {
      setReleaseError(err.message || 'Unable to publish the report.')
    }
  }

  return (
    <div>
      <header className="h-20 bg-white border-b border-[#e4e9f1] px-8 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">Talent Development / Report Repository</p>
          <h1 className="text-3xl font-bold text-[#1e4d8c]">Report Repository</h1>
        </div>
      </header>

      <div className="p-8 max-w-[1360px] mx-auto">
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
            <p className="text-xs font-medium text-gray-500">Reports in repository</p>
            <p className="text-2xl font-bold mt-2 text-[#1e4d8c]">{generatedReports.length}</p>
            <p className="text-xs text-gray-400 mt-1">for the selected cohort view</p>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
            <p className="text-xs font-medium text-gray-500">Released reports</p>
            <p className="text-2xl font-bold mt-2 text-emerald-600">{releasedReports}</p>
            <p className="text-xs text-gray-400 mt-1">published and available</p>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
            <p className="text-xs font-medium text-gray-500">Cohorts represented</p>
            <p className="text-2xl font-bold mt-2 text-violet-600">{representedCohorts}</p>
            <p className="text-xs text-gray-400 mt-1">across current and historical DCs</p>
          </div>
        </section>

        <section className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e8edf4] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#1e5fba]">All reports</h2>
              <p className="text-xs text-gray-400 mt-0.5">Browse current and historical reports across Development Centre cohorts.</p>
              <div className="mt-3 inline-flex rounded-lg border border-[#dce3ed] bg-slate-50 p-1" aria-label="Filter by report type">
                {[['all', 'All reports'], ['dc', 'DC reports'], ['360', '360° Feedback Reports']].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedReportType(value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${selectedReportType === value ? 'bg-[#1e5fba] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {downloadError && <p className="text-xs text-red-600 mt-2">{downloadError}</p>}
              {releaseError && <p className="text-xs text-red-600 mt-2">{releaseError}</p>}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-end">
              <label>
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Filter by cohort</span>
                <select value={selectedCohortId} onChange={(event) => setSelectedCohortId(event.target.value)} aria-label="Filter reports by cohort" className="min-w-64 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-[#1e4d8c] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="all">All cohorts</option>
                  {cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name} · {cohort.programme} · {cohort.eventDate}</option>)}
                </select>
              </label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" className="w-full rounded-lg border border-[#dce3ed] py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-56" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f8fafc] border-b border-[#e8edf4]">
                <tr>
                  {(selectedReportType === 'all'
                    ? ['Ticket ID', 'Participant', 'DC Report', '360° Feedback Report', 'Cohort', 'Business unit', 'Actions']
                    : ['Ticket ID', 'Participant', 'Report type', 'Cohort', 'Business unit', 'Responses', 'Status', 'Actions']
                  ).map((label) => (
                    <th key={label} className={`px-5 py-3 text-[10px] uppercase tracking-wider font-semibold text-gray-400 ${selectedReportType === 'all' && ['DC Report', '360° Feedback Report'].includes(label) ? 'w-28 text-center' : ''}`}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2f6]">
                {filteredReports.map((participant) => {
                  const cohort = getCohort(cohorts, participant)

                  return (
                    <tr key={selectedReportType === 'all' ? participant.id : participant.reportId} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">{participant.employeeId}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span>
                            <span className="block text-sm font-semibold text-[#172033]">{participant.name}</span>
                            <span className="block text-[11px] text-gray-400">{participant.designation}</span>
                          </span>
                        </div>
                      </td>
                      {selectedReportType === 'all' ? <>
                        {['dc', '360'].map((type) => {
                          const available = participant.reportTypes.includes(type)
                          return <td key={type} className="w-28 px-5 py-4 text-center">
                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${available ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600'}`} title={available ? 'Report available' : 'Report not available'} aria-label={available ? 'Report available' : 'Report not available'}>
                              {available ? <Check size={15} strokeWidth={3} /> : <X size={14} />}
                            </span>
                          </td>
                        })}
                      </> : <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${participant.reportType === 'dc' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                          {participant.reportType === 'dc' ? 'DC Report' : '360° Feedback Report'}
                        </span>
                      </td>}
                      <td className="px-5 py-4">
                        <p className="text-xs font-medium text-[#374151]">{cohort?.name || 'Unassigned cohort'}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{cohort?.programme || 'Development Centre'}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600">{participant.bu}</td>
                      {selectedReportType !== 'all' && <td className="px-5 py-4">
                        <p className="text-xs font-semibold text-[#172033]">{participant.responses}/{participant.totalResponses}</p>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1">
                          <div className="h-1.5 bg-violet-500 rounded-full" style={{ width: `${participant.totalResponses ? participant.responses / participant.totalResponses * 100 : 0}%` }} />
                        </div>
                      </td>}
                      {selectedReportType !== 'all' && <td className="px-5 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-semibold ${
                          participant.reportStatus === 'released'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-blue-200 bg-blue-50 text-blue-700'
                        }`}>{participant.reportStatus}</span>
                        <p className="text-[10px] text-gray-400 mt-1">Updated {participant.lastActivity ? new Date(participant.lastActivity).toLocaleDateString('en-GB') : '-'}</p>
                      </td>}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {selectedReportType === 'all' && <Link to={`/td/reports/participant/${participant.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e4d8c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#173f72]">
                            View Reports <ArrowUpRight size={14} />
                          </Link>}
                          {selectedReportType !== 'all' && participant.reportType === '360' && <Link to={`/td/reports/${participant.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e4d8c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#173f72]">
                            <Eye size={14} />
                            Preview
                          </Link>}
                          {selectedReportType !== 'all' && participant.reportType === '360' && <button type="button" onClick={() => handleDownload(participant)} className="w-8 h-8 rounded-lg border border-[#dce3ed] flex items-center justify-center text-gray-500 hover:bg-gray-50" aria-label={`Download ${participant.name} report`}>
                            <Download size={14} />
                          </button>}
                          {selectedReportType !== 'all' && participant.reportType === '360' && <button type="button" onClick={() => handleDownloadResponseData(participant)} className="w-8 h-8 rounded-lg border border-[#dce3ed] flex items-center justify-center text-gray-500 hover:bg-gray-50" aria-label={`Download ${participant.name} response data`} title="Download 360 response data (Excel)">
                            <FileSpreadsheet size={14} />
                          </button>}
                          {selectedReportType !== 'all' && participant.reportType === '360' && <button
                            type="button"
                            onClick={() => handleRelease(participant)}
                            disabled={participant.reportStatus === 'released'}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <Send size={14} />
                            {participant.reportStatus === 'released' ? 'Published' : 'Publish'}
                          </button>}
                          {selectedReportType !== 'all' && participant.reportType === 'dc' && <span className="text-xs font-medium text-slate-500">Stored report</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {(loading || !filteredReports.length) && (
            <div className="py-16 text-center">
              <FileText className="mx-auto text-gray-300" />
              <p className="text-sm text-gray-500 mt-3">
                {loading ? 'Loading reports...' : generatedReports.length ? 'No reports match this search.' : selectedReportType !== 'all' ? `No ${selectedReportType === 'dc' ? 'DC' : '360'} reports are available for this cohort view.` : selectedCohortId === 'all' ? 'No reports are available in the repository yet.' : 'No reports are available for this cohort yet.'}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
