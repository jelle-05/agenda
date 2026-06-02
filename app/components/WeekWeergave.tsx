'use client'

import { useEffect, useRef, useState } from 'react'
import { getWeekDagen, toISODatum, isVandaag, getDagIndex, isSameDag, NL_DAGEN_KORT, tijdNaarMinuten } from '@/lib/datum'
import { labelAchtergrond } from '@/lib/kleuren'
import type { Afspraak, Label } from '@/types'

const UURHOOGTE = 60

interface Props {
  huidigeDatum: Date
  afspraken: Afspraak[]
  labels: Label[]
  onDagKlik: (d: Date) => void
  onAfspraakKlik: (a: Afspraak) => void
  onNieuwAfspraak: (dag: Date, beginTijd: string) => void
}

function minutenNaarTijd(min: number): string {
  const m = Math.max(0, Math.min(min, 23 * 60 + 30))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export default function WeekWeergave({ huidigeDatum, afspraken, labels, onDagKlik, onAfspraakKlik, onNieuwAfspraak }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nu, setNu] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNu(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * UURHOOGTE
  }, [huidigeDatum])

  const weekDagen = getWeekDagen(huidigeDatum)
  const nuMinuten = nu.getHours() * 60 + nu.getMinutes()

  function handleDubbelklik(e: React.MouseEvent<HTMLDivElement>, dag: Date) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const rawMinuten = (y / UURHOOGTE) * 60
    const afgerond = Math.floor(rawMinuten / 30) * 30
    onNieuwAfspraak(dag, minutenNaarTijd(afgerond))
  }

  return (
    <div className="h-full flex flex-col">
      {/* Kolomhoofden */}
      <div className="flex border-b border-gray-200 shrink-0 bg-white">
        <div className="w-14 shrink-0" />
        {weekDagen.map((dag, i) => {
          const vandaag = isVandaag(dag)
          const gekozen = isSameDag(dag, huidigeDatum)
          return (
            <button
              key={i}
              onClick={() => onDagKlik(dag)}
              className="flex-1 flex flex-col items-center py-1.5 hover:bg-gray-50 transition-colors min-w-0"
            >
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                {NL_DAGEN_KORT[getDagIndex(dag)]}
              </span>
              <span className={[
                'w-8 h-8 flex items-center justify-center text-[15px] mt-0.5 rounded-full font-medium',
                vandaag ? 'bg-[#FF3B30] text-white' : '',
                gekozen && !vandaag ? 'bg-[#007AFF] text-white' : '',
                !vandaag && !gekozen ? 'text-gray-800' : '',
              ].join(' ')}>
                {dag.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tijdsgrid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex" style={{ height: `${24 * UURHOOGTE}px`, minHeight: `${24 * UURHOOGTE}px` }}>
          {/* Tijdlabels */}
          <div className="w-14 shrink-0 relative">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="absolute w-full flex items-start justify-end pr-2 pt-0.5" style={{ height: UURHOOGTE, top: i * UURHOOGTE }}>
                {i > 0 && <span className="text-[10px] text-gray-400 tabular-nums">{String(i).padStart(2, '0')}:00</span>}
              </div>
            ))}
          </div>

          {/* Dag kolommen */}
          {weekDagen.map((dag, di) => {
            const iso = toISODatum(dag)
            const dagAfspraken = afspraken.filter(a => a.datum === iso && !a.heeldag)
            const toonTijdlijn = isVandaag(dag)

            return (
              <div
                key={di}
                className="flex-1 relative border-l border-gray-100 min-w-0"
                onDoubleClick={e => handleDubbelklik(e, dag)}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="absolute w-full border-t border-gray-100" style={{ top: i * UURHOOGTE }} />
                ))}

                {toonTijdlijn && (
                  <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: (nuMinuten / 60) * UURHOOGTE }}>
                    <span className="w-2 h-2 rounded-full bg-[#FF3B30] -ml-1 shrink-0" />
                    <div className="flex-1 border-t-2 border-[#FF3B30]" />
                  </div>
                )}

                {dagAfspraken.map(afspraak => {
                  const label    = labels.find(l => l.id === afspraak.labelIds[0])
                  const kleur    = label?.kleur ?? '#8E8E93'
                  const beginMin = tijdNaarMinuten(afspraak.beginTijd)
                  const eindMin  = tijdNaarMinuten(afspraak.eindTijd)
                  const top      = (beginMin / 60) * UURHOOGTE
                  const height   = Math.max(((eindMin - beginMin) / 60) * UURHOOGTE, 20)

                  return (
                    <button
                      key={afspraak.id}
                      onClick={() => onAfspraakKlik(afspraak)}
                      onDoubleClick={e => e.stopPropagation()}
                      className="absolute inset-x-0.5 rounded overflow-hidden text-left hover:brightness-95 transition-all px-1 pt-0.5 pb-0.5 flex flex-col justify-start items-stretch"
                      style={{ top, height, backgroundColor: labelAchtergrond(kleur, 0.18), borderLeft: `2px solid ${kleur}` }}
                    >
                      <div className="flex items-baseline gap-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate leading-tight flex-1" style={{ color: kleur }}>
                          {afspraak.titel}
                        </p>
                        {height >= 30 && (
                          <p className="text-[9px] shrink-0 tabular-nums leading-tight" style={{ color: kleur, opacity: 0.75 }}>
                            {afspraak.beginTijd}
                          </p>
                        )}
                      </div>
                      {height >= 44 && afspraak.locatie && (
                        <p className="text-[9px] truncate leading-tight mt-0.5" style={{ color: kleur, opacity: 0.65 }}>
                          {afspraak.locatie}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
