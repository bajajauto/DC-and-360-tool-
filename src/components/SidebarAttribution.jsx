import attributionMark from '../assets/hr-digitization-team.png'

export default function SidebarAttribution({ dark = false }) {
  return (
    <div className="px-2 pb-2" aria-label="Developed by HR Digitization Team">
      <img
        src={attributionMark}
        alt="Developed by HR Digitization Team"
        className={`h-auto w-full select-none object-contain ${dark ? 'brightness-0 invert opacity-45' : 'opacity-40'}`}
      />
    </div>
  )
}
