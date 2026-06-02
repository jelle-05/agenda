'use client'

import { useEffect, useRef, useState } from 'react'
import WeekStrip from './WeekStrip'
import { toISODatum, isVandaag, formatDagTitel, tijdNaarMinuten } from '@/lib/datum'
import { labelAchtergrond } from '@/lib/kleuren'
import type { Afspraak, Label } from '@/types'

const UURHOOGTE = 60

interface Props {
  huidigeDatum: Date
  afspraken: Afspraak[]
  labels: Label[]
  onDagKlik: (d: Date) => void
  onAfspraakKlik: (a: Afspraak) => void
}

export default function DagWeergave({ huidigeDatum, afspraken, labels, onDagKlik, onAfspraakKlik }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nu, setNu] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNu(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * UURHOOGTE
  }, [huidigeDatum])

  const iso = toISODatum(huidigeDatum)
  const dagAfspraken      = afspraken.filter(a => a.datum === iso && !a.heeldag)
  const heeldagAfspraken  = afspraken.filter(a => a.datum === iso && a.heeldag)
  const nuMinuten         = nu.getHours() * 60 + nu.getMinutes()
  const toonTijdlijn      = isVandaag(huidigeDatum)

  return (
    <div className="h-full flex flex-col">
      <WeekStrip peildatum={huidigeDatum} geselecteerd={huidigeDatum} onDagKlik={onDagKlik} />

      {/* Dagtitel */}
      <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100 shrink-0">
        {formatDagTitel(huidigeDatum)}
      </div>

      {/* Hele dag */}
      {heeldagAfspraken.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-200 shrink-0 bg-gray-50/50 flex-wrap">
          <span className="text-[10px] text-gray-400 shrink-0">hele dag</span>
          {heeldagAfspraken.map(a => {
            const label = labels.find(l => l.id === a.labelIds[0])
            const kleur = label?.kleur ?? '#8E8E93'
            return (
              <button
                key={a.id}
                onClick={() => onAfspraakKlik(a)}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium hover:opacity-80 transition-opacity"
                style={{ backgroundColor: labelAchtergrond(kleur, 0.15), color: kleur }}
              >
                {a.titel}
              </button>
            )
          })}
        </div>
      )}

      {/* Tijdsgrid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex" style={{ height: `${24 * UURHOOGTE}px`, minHeight: `${24 * UURHOOGTE}px` }}>
          {/* Tijdlabels */}
          <div className="w-14 shrink-0 relative">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="absolute w-full flex items-start justify-end pr-2 pt-0.5"
                style={{ height: UURHOOGTE, top: i * UURHOOGTE }}
              >
                {i > 0 && <span className="text-[10px] text-gray-400 tabular-nums">{String(i).padStart(2, '0')}:00</span>}
              </div>
            ))}
          </div>

          {/* Events kolom */}
          <div className="flex-1 relative border-l border-gray-100">
            {/* Uurlijnen */}
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="absolute w-full border-t border-gray-100" style={{ top: i * UURHOOGTE }} />
            ))}
            {Array.from({ length: 24 }, (_, i) => (
              <div key={`half-${i}`} className="absolute w-full border-t border-gray-50" style={{ top: i * UURHOOGTE + UURHOOGTE / 2 }} />
            ))}

            {/* Tijdlijn */}
            {toonTijdlijn && (
              <div
                className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                style={{ top: (nuMinuten / 60) * UURHOOGTE }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30] -ml-1.5 shrink-0" />
                <div className="flex-1 border-t-2 border-[#FF3B30]" />
              </div>
            )}

            {/* Afspraken */}
            {dagAfspraken.map(afspraak => {
              const label = labels.find(l => l.id === afspraak.labelIds[0])
              const kleur = label?.kleur ?? '#8E8E93'
              const beginMin = tijdNaarMinuten(afspraak.beginTijd)
              const eindMin  = tijdNaarMinuten(afspraak.eindTijd)
              const top      = (beginMin / 60) * UURHOOGTE
              const height   = Math.max(((eindMin - beginMin) / 60) * UURHOOGTE, 24)

              return (
                <button
                  key={afspraak.id}
                  onClick={() => onAfspraakKlik(afspraak)}
                  className="absolute left-1 right-2 rounded-md px-2 py-1 overflow-hidden text-left hover:brightness-95 transition-all"
                  style={{ top, height, backgroundColor: labelAchtergrond(kleur, 0.18), borderLeft: `3px solid ${kleur}` }}
                >
                  <p className="text-[12px] font-semibold leading-tight truncate" style={{ color: kleur }}>
                    {afspraak.titel}
                  </p>
                  {height > 32 && (
                    <p className="text-[10px] leading-tight" style={{ color: kleur, opacity: 0.75 }}>
                      {afspraak.beginTijd} – {afspraak.eindTijd}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
