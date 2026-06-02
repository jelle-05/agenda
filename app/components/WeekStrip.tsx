'use client'

import { getWeekDagen, getDagIndex, isVandaag, isSameDag, NL_DAGEN_KORT } from '@/lib/datum'

interface Props {
  peildatum: Date
  geselecteerd: Date
  onDagKlik: (d: Date) => void
}

export default function WeekStrip({ peildatum, geselecteerd, onDagKlik }: Props) {
  const dagen = getWeekDagen(peildatum)

  return (
    <div className="flex border-b border-gray-200 bg-white shrink-0">
      {dagen.map((dag, i) => {
        const vandaag = isVandaag(dag)
        const gekozen = isSameDag(dag, geselecteerd)
        return (
          <button
            key={i}
            onClick={() => onDagKlik(dag)}
            className="flex-1 flex flex-col items-center py-1.5 hover:bg-gray-50 transition-colors"
          >
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              {NL_DAGEN_KORT[getDagIndex(dag)]}
            </span>
            <span
              key={vandaag ? 'vandaag' : (gekozen ? 'g' : 'n')}
              className={[
                'w-8 h-8 flex items-center justify-center text-[15px] mt-0.5 rounded-full font-medium',
                vandaag                   ? 'bg-[#FF3B30] text-white'            : '',
                gekozen && !vandaag       ? 'bg-[#007AFF] text-white dot-actief' : '',
                !vandaag && !gekozen      ? 'text-gray-800'                      : '',
              ].join(' ')}
            >
              {dag.getDate()}
            </span>
          </button>
        )
      })}
    </div>
  )
}
