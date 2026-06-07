'use client'

import { useEffect, useRef, useState } from 'react'
import { getWeekDagen, toISODatum, isVandaag, getDagIndex, isSameDag, NL_DAGEN_KORT, tijdNaarMinuten, getWeekNummer } from '@/lib/datum'
import { labelAchtergrond, eventKleuren } from '@/lib/kleuren'
import { stapelVolgorde } from '@/lib/overlap'
import { useEventDrag } from '@/lib/useEventDrag'
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
  werkuren?: { start: string; eind: string } | null
  onVerplaats?: (a: Afspraak, nieuweDatum: string, nieuweBeginTijd: string) => void
}

function minutenNaarTijd(min: number): string {
  const m = Math.max(0, Math.min(min, 23 * 60 + 30))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export default function WeekWeergave({ huidigeDatum, afspraken, labels, onDagKlik, onAfspraakKlik, onNieuwAfspraak, animatieKlasse = '', animatieSleutel = 0, werkuren = null, onVerplaats }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nu, setNu] = useState(() => new Date())

  // Drag & drop (desktop/muis): verticaal = tijd (15-min-snap, duurbehoud),
  // horizontaal = andere dag binnen de week. Nieuwe datum uit de dag-delta.
  const { drag, dragProps, consumeerKlik } = useEventDrag(UURHOOGTE, (a, dagDelta, minutenDelta) => {
    if (!onVerplaats) return
    const [y, m, d] = a.datum.split('-').map(Number)
    const nieuweDatum = toISODatum(new Date(y, m - 1, d + dagDelta))
    onVerplaats(a, nieuweDatum, minutenNaarTijd(tijdNaarMinuten(a.beginTijd) + minutenDelta))
  })

  useEffect(() => {
    const interval = setInterval(() => setNu(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (getWeekDagen(huidigeDatum).some(isVandaag)) {
      // Centreer de huidige-tijd-indicator in beeld; de browser klemt
      // scrollTop vanzelf op [0, max] (vroege ochtend / late avond).
      // Tijd vers lezen (niet de nu-state) zodat de kloktick geen herscroll triggert.
      const d = new Date()
      el.scrollTop = ((d.getHours() * 60 + d.getMinutes()) / 60) * UURHOOGTE - el.clientHeight / 2
    } else {
      el.scrollTop = 7 * UURHOOGTE
    }
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
      {/* Kolomhoofden — de hoek toont het ISO-weeknummer */}
      <div className="flex border-b border-gray-200 sm:border-[#dfdfdf] shrink-0 bg-white">
        <div className="w-14 shrink-0 flex items-end justify-end pr-2 pb-1.5">
          <span className="text-[10px] text-gray-300 uppercase tracking-wide leading-none">wk {getWeekNummer(huidigeDatum)}</span>
        </div>
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

      {/* Hele-dag rij */}
      {weekDagen.some(dag => afspraken.some(a => a.datum === toISODatum(dag) && a.heeldag)) && (
        <div className="flex border-b border-gray-200 sm:border-[#dfdfdf] shrink-0 bg-white">
          <div className="w-14 shrink-0 flex items-end justify-end pr-2 pb-1">
            <span className="text-[9px] text-gray-300 uppercase tracking-wide leading-none">hele dag</span>
          </div>
          {weekDagen.map((dag, di) => {
            const iso = toISODatum(dag)
            const heeldagAfspraken = afspraken.filter(a => a.datum === iso && a.heeldag)
            return (
              <div key={di} className="flex-1 border-l border-gray-100 sm:border-[#dfdfdf] min-w-0 py-0.5 px-0.5 flex flex-col gap-[2px]">
                {heeldagAfspraken.map(afspraak => {
                  const label = labels.find(l => l.id === afspraak.labelIds[0])
                  const { accent, achtergrond, tekst } = eventKleuren(label, 0.15)
                  return (
                    <button
                      key={afspraak.id}
                      onClick={() => onAfspraakKlik(afspraak)}
                      className="flex items-center gap-1 rounded-[3px] px-1 py-[1px] w-full min-w-0 hover:opacity-80 transition-opacity text-left"
                      style={{ backgroundColor: achtergrond }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                      <span className="text-[10px] font-medium truncate leading-tight" style={{ color: tekst }}>
                        {afspraak.titel}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Tijdsgrid — wrapper remount triggert de animatie betrouwbaar in alle browsers */}
      <div key={animatieSleutel} className={`flex-1 overflow-hidden ${animatieKlasse}`}>
      <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden">
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
            // Sorteer zo dat langere events achter kortere komen (korter bovenop, tappable).
            const dagAfspraken = afspraken.filter(a => a.datum === iso && !a.heeldag).sort(stapelVolgorde)
            const toonTijdlijn = isVandaag(dag)

            return (
              <div
                key={di}
                className="flex-1 relative border-l border-gray-100 sm:border-[#dfdfdf] min-w-0"
                onDoubleClick={e => handleDubbelklik(e, dag)}
              >
                {/* Werkuren — dim buiten de werkdag (pointer-events-none, vóór lijnen/events) */}
                {werkuren && (
                  <>
                    <div
                      className="absolute inset-x-0 top-0 bg-gray-100/60 pointer-events-none"
                      style={{ height: (tijdNaarMinuten(werkuren.start) / 60) * UURHOOGTE }}
                    />
                    <div
                      className="absolute inset-x-0 bottom-0 bg-gray-100/60 pointer-events-none"
                      style={{ height: ((24 * 60 - tijdNaarMinuten(werkuren.eind)) / 60) * UURHOOGTE }}
                    />
                  </>
                )}
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="absolute w-full border-t border-gray-100 sm:border-[#dfdfdf]" style={{ top: i * UURHOOGTE }} />
                ))}

                {toonTijdlijn && (
                  <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: (nuMinuten / 60) * UURHOOGTE }}>
                    <span className="w-2 h-2 rounded-full bg-[#FF3B30] -ml-1 shrink-0" />
                    <div className="flex-1 border-t-2 border-[#FF3B30]" />
                  </div>
                )}

                {dagAfspraken.map(afspraak => {
                  const label    = labels.find(l => l.id === afspraak.labelIds[0])
                  const { accent, achtergrond, tekst } = eventKleuren(label, 0.22)
                  const beginMin = tijdNaarMinuten(afspraak.beginTijd)
                  const eindMin  = tijdNaarMinuten(afspraak.eindTijd)
                  const top      = (beginMin / 60) * UURHOOGTE
                  const height   = Math.max(((eindMin - beginMin) / 60) * UURHOOGTE, 20)

                  const sleep = drag?.id === afspraak.id ? drag : null

                  return (
                    <button
                      key={afspraak.id}
                      onClick={() => { if (consumeerKlik()) return; onAfspraakKlik(afspraak) }}
                      onDoubleClick={e => e.stopPropagation()}
                      {...dragProps(afspraak, { minDag: -di, maxDag: 6 - di })}
                      className="absolute inset-x-0.5 rounded overflow-hidden text-left hover:brightness-95 transition-all flex flex-col justify-start items-stretch sm:cursor-grab"
                      style={{
                        top, height,
                        backgroundColor: achtergrond,
                        border: `1px solid ${labelAchtergrond(accent, 0.55)}`,
                        borderLeft: `2px solid ${accent}`,
                        boxShadow: sleep
                          ? '0 4px 16px rgba(0,0,0,0.25)'
                          : '0 0 0 1px rgba(255,255,255,0.92), 0 1px 3px rgba(0,0,0,0.10)',
                        padding: height < 26 ? '2px 4px' : 7,
                        ...(sleep ? {
                          transform: `translate(${sleep.dagDelta * 100}%, ${(sleep.minutenDelta / 60) * UURHOOGTE}px)`,
                          zIndex: 50,
                          opacity: 0.9,
                          cursor: 'grabbing',
                          transition: 'none',
                        } : {}),
                      }}
                    >
                      {sleep && (
                        <span className="absolute top-0.5 right-1 text-[10px] font-semibold tabular-nums" style={{ color: tekst }}>
                          {minutenNaarTijd(beginMin + sleep.minutenDelta)}
                        </span>
                      )}
                      {height >= 20 && (
                        <div className="flex items-baseline gap-1.5 min-w-0">
                          <p
                            className="font-semibold truncate"
                            style={{ color: tekst, fontSize: height < 26 ? 10 : 12, lineHeight: height < 26 ? 1.1 : 'normal' }}
                          >
                            {afspraak.titel}
                          </p>
                          {height >= 26 && afspraak.locatie && (
                            <span className="text-[10px] truncate leading-tight" style={{ color: tekst, opacity: 0.6 }}>
                              {afspraak.locatie}
                            </span>
                          )}
                        </div>
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
    </div>
  )
}
