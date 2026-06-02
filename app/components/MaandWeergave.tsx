'use client'

import { getMaandDagen, toISODatum, isVandaag, getDagIndex, NL_DAGEN_KORT } from '@/lib/datum'
import { labelAchtergrond } from '@/lib/kleuren'
import type { Afspraak, Label } from '@/types'

interface Props {
  huidigeDatum: Date
  afspraken: Afspraak[]
  labels: Label[]
  onDagKlik: (d: Date) => void
}

export default function MaandWeergave({ huidigeDatum, afspraken, labels, onDagKlik }: Props) {
  const jaar = huidigeDatum.getFullYear()
  const maand = huidigeDatum.getMonth()
  const dagen = getMaandDagen(jaar, maand)
  const aantalRijen = dagen.length / 7

  return (
    <div className="h-full flex flex-col select-none">
      {/* Daghoofden */}
      <div className="grid grid-cols-7 border-b border-gray-200 shrink-0">
        {NL_DAGEN_KORT.map((naam) => (
          <div key={naam} className="text-center text-[11px] font-medium text-gray-400 uppercase py-2 tracking-wide">
            {naam}
          </div>
        ))}
      </div>

      {/* Maandgrid */}
      <div
        className="flex-1 grid grid-cols-7"
        style={{ gridTemplateRows: `repeat(${aantalRijen}, 1fr)` }}
      >
        {dagen.map((dag, i) => {
          if (!dag) {
            return <div key={`leeg-${i}`} className="border-b border-r border-gray-100 bg-gray-50/50" />
          }

          const iso = toISODatum(dag)
          const dagAfspraken = afspraken
            .filter((a) => a.datum === iso)
            .sort((a, b) => {
              if (a.heeldag && !b.heeldag) return -1
              if (!a.heeldag && b.heeldag) return 1
              return a.beginTijd.localeCompare(b.beginTijd)
            })
          const vandaag = isVandaag(dag)
          const isWeekend = getDagIndex(dag) >= 5

          return (
            <button
              key={iso}
              onClick={() => onDagKlik(dag)}
              className={[
                'border-b border-r border-gray-100 p-1 text-left overflow-hidden flex flex-col',
                'hover:bg-blue-50/30 transition-colors',
                isWeekend ? 'bg-gray-50/40' : 'bg-white',
              ].join(' ')}
            >
              {/* Dagnummer */}
              <div className="flex justify-center mb-0.5">
                <span
                  className={[
                    'w-7 h-7 flex items-center justify-center text-sm rounded-full font-medium',
                    vandaag
                      ? 'bg-[#FF3B30] text-white'
                      : isWeekend
                      ? 'text-gray-400'
                      : 'text-gray-800',
                  ].join(' ')}
                >
                  {dag.getDate()}
                </span>
              </div>

              {/* Afspraken */}
              <div className="flex flex-col gap-[2px] w-full min-w-0">
                {dagAfspraken.slice(0, 3).map((afspraak) => {
                  const label = labels.find((l) => l.id === afspraak.labelIds[0])
                  const kleur = label?.kleur ?? '#8E8E93'
                  return (
                    <div
                      key={afspraak.id}
                      className="flex items-center gap-1 rounded-[3px] px-1 py-[1px] w-full min-w-0"
                      style={{ backgroundColor: labelAchtergrond(kleur, 0.15) }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: kleur }}
                      />
                      <span
                        className="text-[10px] font-medium truncate leading-tight"
                        style={{ color: kleur }}
                      >
                        {afspraak.titel}
                      </span>
                    </div>
                  )
                })}
                {dagAfspraken.length > 3 && (
                  <span className="text-[9px] text-gray-400 pl-1">
                    +{dagAfspraken.length - 3} meer
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
