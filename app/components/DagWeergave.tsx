'use client'

import { useEffect, useRef, useState } from 'react'
import WeekStrip from './WeekStrip'
import { toISODatum, isVandaag, formatDagTitel, tijdNaarMinuten } from '@/lib/datum'
import { labelAchtergrond } from '@/lib/kleuren'
import { berekenOverlap } from '@/lib/overlap'
import type { Afspraak, Label } from '@/types'

const UURHOOGTE = 60

interface Props {
  huidigeDatum: Date
  afspraken: Afspraak[]
  labels: Label[]
  onDagKlik: (d: Date) => void
  onAfspraakKlik: (a: Afspraak) => void
  onNieuwAfspraak: (dag: Date, beginTijd: string) => void
  animatieKlasse?: string
  animatieSleutel?: number
}

function minutenNaarTijd(min: number): string {
  const m = Math.max(0, Math.min(min, 23 * 60 + 30))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export default function DagWeergave({ huidigeDatum, afspraken, labels, onDagKlik, onAfspraakKlik, onNieuwAfspraak, animatieKlasse = '', animatieSleutel = 0 }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nu, setNu] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNu(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * UURHOOGTE
  }, [huidigeDatum])

  const iso               = toISODatum(huidigeDatum)
  const dagAfspraken      = afspraken.filter(a => a.datum === iso && !a.heeldag)
  const overlap           = berekenOverlap(dagAfspraken)
  const heeldagAfspraken  = afspraken.filter(a => a.datum === iso && a.heeldag)
  const nuMinuten         = nu.getHours() * 60 + nu.getMinutes()
  const toonTijdlijn      = isVandaag(huidigeDatum)

  function handleDubbelklik(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const rawMinuten = (y / UURHOOGTE) * 60
    const afgerond = Math.floor(rawMinuten / 30) * 30
    onNieuwAfspraak(huidigeDatum, minutenNaarTijd(afgerond))
  }

  return (
    <div className="h-full flex flex-col">
      <WeekStrip peildatum={huidigeDatum} geselecteerd={huidigeDatum} onDagKlik={onDagKlik} />

      {/* Dagtitel */}
      <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100 sm:border-[#dfdfdf] shrink-0">
        {formatDagTitel(huidigeDatum)}
      </div>

      {/* Hele dag */}
      {heeldagAfspraken.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-200 sm:border-[#dfdfdf] shrink-0 bg-gray-50/50 flex-wrap">
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

      {/* Lege staat */}
      {dagAfspraken.length === 0 && heeldagAfspraken.length === 0 && (
        <div className="px-4 py-3 border-b border-gray-100 sm:border-[#dfdfdf]">
          <p className="text-sm text-gray-300 text-center">Geen afspraken</p>
        </div>
      )}

      {/* Tijdsgrid — wrapper remount triggert de animatie betrouwbaar in alle browsers */}
      <div key={animatieSleutel} className={`flex-1 overflow-hidden ${animatieKlasse}`}>
      <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden">
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
          <div
            className="flex-1 relative border-l border-gray-100 sm:border-[#dfdfdf]"
            onDoubleClick={handleDubbelklik}
          >
            {/* Uurlijnen */}
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="absolute w-full border-t border-gray-100 sm:border-[#dfdfdf]" style={{ top: i * UURHOOGTE }} />
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
              const label    = labels.find(l => l.id === afspraak.labelIds[0])
              const kleur    = label?.kleur ?? '#8E8E93'
              const beginMin = tijdNaarMinuten(afspraak.beginTijd)
              const eindMin  = tijdNaarMinuten(afspraak.eindTijd)
              const top      = (beginMin / 60) * UURHOOGTE
              const height   = Math.max(((eindMin - beginMin) / 60) * UURHOOGTE, 24)
              const { kolom, kolommen } = overlap[afspraak.id] ?? { kolom: 0, kolommen: 1 }
              const breedte  = 100 / kolommen

              return (
                <button
                  key={afspraak.id}
                  onClick={() => onAfspraakKlik(afspraak)}
                  onDoubleClick={e => e.stopPropagation()}
                  className="absolute rounded-md overflow-hidden text-left hover:brightness-95 transition-all flex flex-col justify-start items-stretch"
                  style={{
                    top, height,
                    left: `calc(${kolom * breedte}% + 4px)`,
                    width: `calc(${breedte}% - 12px)`,
                    backgroundColor: labelAchtergrond(kleur, 0.22),
                    borderLeft: `3px solid ${kleur}`,
                    boxShadow: '0 0 0 1px #fff, 0 1px 2px rgba(0,0,0,0.06)',
                    padding: height < 26 ? '2px 5px' : 7,
                  }}
                >
                  {height >= 20 && (
                    <>
                      <p
                        className="font-semibold truncate overflow-hidden whitespace-nowrap"
                        style={{ color: kleur, fontSize: height < 26 ? 10 : 12, lineHeight: height < 26 ? 1.1 : 'normal' }}
                      >
                        {afspraak.titel}
                      </p>
                      {afspraak.locatie && height >= 42 && (
                        <p className="text-[11px] truncate leading-tight mt-0.5" style={{ color: kleur, opacity: 0.65 }}>
                          {afspraak.locatie}
                        </p>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
