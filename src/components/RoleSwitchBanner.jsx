import { ArrowRight, Building2, UserRound } from 'lucide-react'

export default function RoleSwitchBanner({ target, onSwitch }) {
  const toBuhr = target === 'buhr'
  const Icon = toBuhr ? Building2 : UserRound

  return (
    <div className="border-b border-blue-200 bg-gradient-to-r from-[#eaf3ff] via-[#f4f8ff] to-[#eef8f6] px-5 py-2.5 sm:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#1e5fba] shadow-sm ring-1 ring-blue-100">
            <Icon size={16} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 sm:text-sm">
              {toBuhr ? 'Track employees in your business unit' : 'Continue your own development journey'}
            </p>
            <p className="hidden text-[11px] text-slate-500 sm:block">
              {toBuhr ? 'Open your BUHR workspace without signing out.' : 'Return to your participant tasks without signing out.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSwitch}
          className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-[#1e5fba] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#174d98] hover:shadow-md"
        >
          {toBuhr ? 'Switch to BUHR view' : 'Switch to Participant view'}
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
