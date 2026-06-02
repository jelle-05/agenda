'use client'

import { toISODatum, NL_DAGEN_LANG, NL_MAANDEN_KORT, getDagIndex } from '@/lib/datum'
import { labelAchtergrond } from '@/lib/kleuren'
import type { Afspraak, Label } from '@/types'

interface Props {
  huidigeDatum: Date
  afspraken: Afspraak[]
  labels: Label[]
  onAfspraakKlik: (a: Afspraak) => void
}

function formatDatumHeader(datum: string): string {
  const [y, m, d] = datum.split('-').map(Number)
  const dag = new Date(y, m - 1, d)
  const naam = NL_DAGEN_LANG[getDagIndex(dag)]
  return `${naam.charAt(0).toUpperCase() + naam.slice(1)} ${d} ${NL_MAANDEN_KORT[m - 1]} ${y}`
}

export default function AgendaLijst({ huidigeDatum, afspraken, labels, onAfspraakKlik }: Props) {
  const jaar  = huidigeDatum.getFullYear()
  const maand = huidigeDatum.getMonth()
  const start = `${jaar}-${String(maand + 1).padStart(2, '0')}-01`
  const eind  = `${jaar}-${String(maand + 1).padStart(2, '0')}-31`

  const gefilterd = afspraken
    .filter(a => a.datum >= start && a.datum <= eind)
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.beginTijd.localeCompare(b.beginTijd))

  const gegroepeerd = gefilterd.reduce<Record<string, Afspraak[]>>((acc, a) => {
    if (!acc[a.datum]) acc[a.datum] = []
    acc[a.datum].push(a)
    return acc
  }, {})

  const vandaag = toISODatum(new Date())

  if (gefilterd.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-8">
        <span className="text-4xl">📭</span>
        <p className="text-gray-500 text-[15px] font-medium">Geen afspraken</p>
        <p className="text-gray-400 text-sm">
          Tik op <strong>+</strong> om een afspraak toe te voegen.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {Object.entries(gegroepeerd).map(([datum, dagAfspraken]) => (
        <div key={datum}>
          <div className={[
            'px-4 py-2 text-xs font-semibold uppercase tracking-wide sticky top-0 bg-white border-b border-gray-100',
            datum === vandaag ? 'text-[#FF3B30]' : 'text-gray-500',
          ].join(' ')}>
            {formatDatumHeader(datum)}{datum === vandaag ? ' — Vandaag' : ''}
          </div>

          {dagAfspraken.map(afspraak => {
            const label = labels.find(l => l.id === afspraak.labelIds[0])
            const kleur = label?.kleur ?? '#8E8E93'
            return (
              <button
                key={afspraak.id}
                onClick={() => onAfspraakKlik(afspraak)}
                className="flex items-start gap-3 w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ backgroundColor: kleur }} />
                <div className="w-20 shrink-0">
                  {afspraak.heeldag
                    ? <span className="text-xs text-gray-400">hele dag</span>
                    : <span className="text-xs text-gray-500 tabular-nums">{afspraak.beginTijd} – {afspraak.eindTijd}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{afspraak.titel}</p>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {afspraak.labelIds.map(lid => {
                      const l = labels.find(x => x.id === lid)
                      if (!l) return null
                      return (
                        <span
                          key={lid}
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: labelAchtergrond(l.kleur, 0.15), color: l.kleur }}
                        >
                          {l.naam}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
