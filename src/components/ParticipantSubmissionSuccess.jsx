import { Link } from 'react-router-dom'

export default function ParticipantSubmissionSuccess({ stepName, nextTo, nextLabel, detail, children }) {
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
        <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="mt-3 text-base font-semibold text-emerald-800">Successfully recorded</h2>
      <p className="mt-1 text-sm text-emerald-700">Your {stepName} has been successfully recorded.</p>
      {detail && <p className="mt-1 text-xs text-emerald-700">{detail}</p>}
      {children}
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link to="/participant/dashboard" className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">Back to Dashboard</Link>
        <Link to={nextTo} className="rounded-lg bg-[#1e4d8c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#183f73]">Go to Next Step{nextLabel ? `: ${nextLabel}` : ''}</Link>
      </div>
    </section>
  )
}
