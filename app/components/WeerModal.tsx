'use client'

import { X, Droplets } from 'lucide-react'
import { toISODatum, NL_DAGEN_LANG, getDagIndex, isVandaag } from '@/lib/datum'
import { weerIcoon, type WeerBundel } from '@/lib/weer'

interface Props {
  open: boolean
  locatieNaam: string
  weer: WeerBundel | null
  onSluit: () => void
}

// Weer-detailoverlay: vandaag (incl. uurverloop, horizontaal scrollbaar) +
// de komende ~7 dagen met min/max en regenkans. Data komt uit dezelfde
// 1-uurs-cache als de dagkoppen — geen extra API-verkeer.
export default function WeerModal({ open, locatieNaam, weer, onSluit }: Props) {
  if (!open) return null

  const vandaagIso = toISODatum(new Date())
  const vandaag = weer?.dagen[vandaagIso]
  const nuUur = new Date().getHours()
  // Uren van vandaag vanaf het huidige uur; de avond erbij houden ('s nachts
  // gewoon alles van vandaag tonen).
  const urenVandaag = (weer?.uren[vandaagIso] ?? []).filter(u => parseInt(u.tijd) >= nuUur)

  const dagen = Object.entries(weer?.dagen ?? {}).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <div className="w-16" />
          <h2 className="text-[15px] font-semibold text-gray-900 truncate">
            Weer{locatieNaam ? ` · ${locatieNaam}` : ''}
          </h2>
          <button onClick={onSluit} aria-label="Sluiten" className="w-16 flex justify-end text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-4">
          {!weer && (
            <p className="text-[13px] text-gray-400 text-center px-4 py-8">
              Geen weergegevens beschikbaar. Stel een locatie in via Instellingen → Kalender → Weer.
            </p>
          )}

          {/* Vandaag */}
          {vandaag && (() => {
            const { Icoon, label } = weerIcoon(vandaag.code)
            return (
              <section className="flex flex-col gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Vandaag</h3>
                <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-4">
                  <Icoon size={36} className="text-gray-500 shrink-0" aria-label={label} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-gray-900 capitalize">{label}</p>
                    <p className="text-[13px] text-gray-500">
                      {Math.round(vandaag.minTemp)}° tot {Math.round(vandaag.maxTemp)}°
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] text-gray-500 shrink-0">
                    <Droplets size={14} className="text-[#32ADE6]" />
                    {vandaag.neerslagKans}%
                  </div>
                </div>

                {/* Uurverloop — horizontaal scrollbaar */}
                {urenVandaag.length > 0 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                    {urenVandaag.map(u => {
                      const { Icoon: UurIcoon, label: uurLabel } = weerIcoon(u.code)
                      return (
                        <div key={u.tijd} className="flex flex-col items-center gap-0.5 bg-gray-50 rounded-lg px-2.5 py-2 shrink-0">
                          <span className="text-[10px] text-gray-400 tabular-nums">{u.tijd}</span>
                          <UurIcoon size={14} className="text-gray-500" aria-label={uurLabel} />
                          <span className="text-[12px] font-medium text-gray-800 tabular-nums">{Math.round(u.temp)}°</span>
                          <span className={['text-[10px] tabular-nums', u.neerslagKans > 0 ? 'text-[#32ADE6]' : 'text-transparent'].join(' ')}>
                            {u.neerslagKans}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })()}

          {/* Komende dagen */}
          {dagen.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Komende dagen</h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
                {dagen.map(([datum, dag]) => {
                  const [y, m, d] = datum.split('-').map(Number)
                  const dt = new Date(y, m - 1, d)
                  const naam = isVandaag(dt)
                    ? 'Vandaag'
                    : NL_DAGEN_LANG[getDagIndex(dt)].charAt(0).toUpperCase() + NL_DAGEN_LANG[getDagIndex(dt)].slice(1)
                  const { Icoon, label } = weerIcoon(dag.code)
                  return (
                    <div key={datum} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-[14px] text-gray-800 w-24 shrink-0">{naam}</span>
                      <Icoon size={16} className="text-gray-500 shrink-0" aria-label={label} />
                      <span className="flex items-center gap-1 text-[12px] text-gray-400 tabular-nums w-14 shrink-0">
                        <Droplets size={11} className="text-[#32ADE6]" />
                        {dag.neerslagKans}%
                      </span>
                      <span className="flex-1 text-right text-[14px] tabular-nums">
                        <span className="text-gray-400">{Math.round(dag.minTemp)}°</span>
                        <span className="text-gray-300"> / </span>
                        <span className="text-gray-900 font-medium">{Math.round(dag.maxTemp)}°</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
