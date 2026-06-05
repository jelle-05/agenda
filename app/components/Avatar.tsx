'use client'

interface Props {
  email: string
  avatarUrl?: string | null
  /** maat + eventuele display-utilities voor de cirkel, bijv. "w-7 h-7" */
  className?: string
  /** tekstgrootte van de initiaal-fallback, bijv. "text-[11px]" of "text-2xl" */
  tekstKlasse?: string
}

// Gedeelde avatar-weergave: profielfoto (data-URL uit user_metadata) óf de
// blauwe initiaal-cirkel als fallback. Bewust géén button — de aanroepers
// leveren zelf de knop/semantiek (onClick, aria-label, hover) eromheen.
export default function Avatar({ email, avatarUrl, className = '', tekstKlasse = '' }: Props) {
  if (avatarUrl) {
    return (
      // Data-URL uit user_metadata: next/image is hier ongeschikt (geen remote
      // loader nodig en niets te optimaliseren aan een lokale data-URL).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        draggable={false}
        className={`rounded-full object-cover select-none shrink-0 ${className}`}
      />
    )
  }

  const initiaal = email?.[0]?.toUpperCase() ?? '?'
  return (
    <span
      className={`rounded-full bg-[#007AFF] flex items-center justify-center text-white font-bold select-none shrink-0 ${tekstKlasse} ${className}`}
    >
      {initiaal}
    </span>
  )
}
