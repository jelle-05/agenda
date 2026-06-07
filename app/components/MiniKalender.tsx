'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getMaandDagen, toISODatum, isVandaag, isSameDag, NL_DAGEN_KORT, NL_MAANDEN } from '@/lib/datum'
import type { Afspraak } from '@/types'

interface Props {
  huidigeDatum: Date
  afspraken: Afspraak[]
  onDagKlik: (d: Date) => void
}

// Compacte maandkalender voor de desktop-Sidebar (à la macOS Agenda):
// vandaag = rode cirkel, geselecteerde datum = blauwe cirkel, dotje onder
// dagen met events. Klik navigeert met behoud van de huidige weergave.
export default function MiniKalender({ huidigeDatum, afspraken, onDagKlik }: Props) {
  const [peil, setPeil] = useState(() => new Date(huidigeDatum.getFullYear(), huidigeDatum.getMonth(), 1))

  useEffect(() => {
    // Volg externe navigatie (pijlen/vandaag/zoekresultaat): toon altijd de
    // maand van de actieve datum. Bewuste sync-op-prop (zelfde conventie als
    // de andere mount-/sync-effects in dit project).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeil(new Date(huidigeDatum.getFullYear(), huidigeDatum.getMonth(), 1))
  }, [huidigeDatum])

  const dagen = getMaandDagen(peil.getFullYear(), peil.getMonth())

  // Dagen met minstens één event — voor het dotje (goedkope Set-memo).
  const eventDagen = useMemo(() => new Set(afspraken.map(a => a.datum)), [afspraken])

  function vorigeMaand() {
    setPeil(p => new Date(p.getFullYear(), p.getMonth() - 1, 1))
  }
  function volgendeMaand() {
    setPeil(p => new Date(p.getFullYear(), p.getMonth() + 1, 1))
  }

  return (
    <div className="px-3 py-3 border-b border-gray-200">
      {/* Maandheader met navigatie */}
      <div className="flex items-center justify-between px-1 mb-1.5">
        <span className="text-[12px] font-semibold text-gray-700">
          {NL_MAANDEN[peil.getMonth()]} {peil.getFullYear()}
        </span>
        <span className="flex items-center">
          <button onClick={vorigeMaand} aria-label="Vorige maand" className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <button onClick={volgendeMaand} aria-label="Volgende maand" className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <ChevronRight size={14} />
          </button>
        </span>
      </div>

      {/* Daginitalen */}
      <div className="grid grid-cols-7">
        {NL_DAGEN_KORT.map(naam => (
          <div key={naam} className="text-center text-[9px] text-gray-300 uppercase pb-0.5">
            {naam.charAt(0)}
          </div>
        ))}
      </div>

      {/* Dagen */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {dagen.map((dag, i) => {
          if (!dag) return <div key={`leeg-${i}`} />
          const vandaag = isVandaag(dag)
          const gekozen = isSameDag(dag, huidigeDatum)
          const heeftEvents = eventDagen.has(toISODatum(dag))
          return (
            <button
              key={toISODatum(dag)}
              onClick={() => onDagKlik(dag)}
              className="flex flex-col items-center group"
              aria-label={`Ga naar ${toISODatum(dag)}`}
            >
              <span className={[
                'w-6 h-6 flex items-center justify-center text-[11px] rounded-full transition-colors',
                vandaag ? 'bg-[#FF3B30] text-white font-semibold'
                : gekozen ? 'bg-[#007AFF] text-white font-semibold'
                : 'text-gray-700 group-hover:bg-gray-100',
              ].join(' ')}>
                {dag.getDate()}
              </span>
              <span className={[
                'w-[3px] h-[3px] rounded-full -mt-px',
                heeftEvents ? 'bg-gray-300' : 'bg-transparent',
              ].join(' ')} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
