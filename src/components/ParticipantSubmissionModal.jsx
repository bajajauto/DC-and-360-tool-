export default function ParticipantSubmissionModal({ stepName, canEdit, cutoff, onClose, onEdit }) {
  const cutoffLabel = cutoff ? new Date(cutoff).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the cohort cutoff'
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <section role="dialog" aria-modal="true" aria-labelledby="submission-confirmation-title" className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 id="submission-confirmation-title" className="mt-4 text-xl font-bold text-slate-900">Successfully submitted</h2>
        <p className="mt-2 text-sm text-slate-600">Your {stepName} has been submitted successfully.</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{canEdit ? `If you want to make any changes, you can edit and submit again until ${cutoffLabel}.` : 'The cutoff has passed, so this submission can no longer be changed.'}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Done</button>
          {canEdit && <button type="button" onClick={onEdit} className="rounded-lg bg-[#1e4d8c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#183f73]">Make Changes</button>}
        </div>
      </section>
    </div>
  )
}
