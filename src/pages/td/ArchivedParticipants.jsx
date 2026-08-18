import { Archive, CheckCircle2, MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

export default function ArchivedParticipants() {
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getArchivedParticipants()
      .then((result) => setParticipants(result.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-9 py-8">
      <div className="mx-auto max-w-[1200px]">
        <p className="mb-2 text-xs text-slate-500">Talent Development / Archived Participants</p>
        <div className="mb-6 flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ebf2fa] text-[#1e5fba]"><Archive size={20}/></div>
          <div><h1 className="font-serif text-[34px] font-semibold leading-tight text-[#1e4d8c]">Archived Participants</h1><p className="mt-1 text-sm text-slate-600">Records are retained here until the participant is added to another cohort from Manage Participants.</p></div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <section className="overflow-hidden rounded-[14px] border border-[#d5dce5] bg-white shadow-[0_2px_16px_rgba(31,41,55,.06)]">
          {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading archived participants…</p> : participants.length === 0 ? <p className="p-10 text-center text-sm text-slate-500">No participants are archived.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#ebf2fa]"><tr>{['Ticket ID', 'Participant', 'Archived from', 'Archived on', 'Retained 360', 'Records'].map((label) => <th key={label} className="border-b px-4 py-3 text-[11px] font-bold uppercase text-slate-600">{label}</th>)}</tr></thead><tbody>{participants.map((participant) => <tr key={participant.id} className="hover:bg-[#f8fbff]"><td className="border-b px-4 py-3 text-slate-500">{participant.employeeId}</td><td className="border-b px-4 py-3"><p className="font-semibold text-slate-900">{participant.name}</p><p className="text-xs text-slate-500">{participant.email} · {participant.designation}</p></td><td className="border-b px-4 py-3 text-slate-600">{participant.archivedFromCohortName || '—'}</td><td className="border-b px-4 py-3 text-slate-600">{participant.archivedAt ? new Date(participant.archivedAt).toLocaleDateString('en-GB') : '—'}</td><td className="border-b px-4 py-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f5ee] px-2.5 py-1 text-xs font-semibold text-[#15803d]"><MessageSquare size={12}/>{participant.submittedResponses}/{participant.totalResponses} responses</span></td><td className="border-b px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600"><CheckCircle2 size={13} className="text-[#15803d]"/>Pre-work, nominees, responses and reports retained</span></td></tr>)}</tbody></table></div>
          )}
        </section>
      </div>
    </div>
  )
}
