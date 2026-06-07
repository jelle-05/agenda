'use client'

import { useEffect, useRef } from 'react'
import { toISODatum, NL_DAGEN_LANG, NL_MAANDEN_KORT, getDagIndex } from '@/lib/datum'
import { eventKleuren } from '@/lib/kleuren'
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
  const scrollRef  = useRef<HTMLDivElement>(null)
  const vandaagRef = useRef<HTMLDivElement>(null)

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
  // Sectie van vandaag, of anders de eerstvolgende dag mét items (keys staan op datum gesorteerd).
  const doelDatum = Object.keys(gegroepeerd).find(d => d >= vandaag)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Alleen auto-scrollen als vandaag in de getoonde maand valt (datums vers
    // berekenen in het effect → dep-array blijft schoon: alleen huidigeDatum).
    const v = toISODatum(new Date())
    const s = `${huidigeDatum.getFullYear()}-${String(huidigeDatum.getMonth() + 1).padStart(2, '0')}-01`
    if (v < s || v > s.slice(0, 8) + '31') return
    const doel = vandaagRef.current
    if (doel) {
      // Zet de sectie van vandaag bovenaan; de sticky "— Vandaag"-header komt tegen de top.
      el.scrollTop = doel.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop
    } else {
      // Alle events deze maand liggen vóór vandaag → eindig onderaan (dichtst bij vandaag).
      el.scrollTop = el.scrollHeight
    }
  }, [huidigeDatum])

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
    <div ref={scrollRef} className="h-full overflow-y-auto">
      {Object.entries(gegroepeerd).map(([datum, dagAfspraken]) => (
        <div key={datum} ref={datum === doelDatum ? vandaagRef : undefined}>
          <div className={[
            'px-4 py-2 text-xs font-semibold uppercase tracking-wide sticky top-0 bg-white border-b border-gray-100',
            datum === vandaag ? 'text-[#FF3B30]' : 'text-gray-500',
          ].join(' ')}>
            {formatDatumHeader(datum)}{datum === vandaag ? ' — Vandaag' : ''}
          </div>

          {dagAfspraken.map(afspraak => {
            const label = labels.find(l => l.id === afspraak.labelIds[0])
            const { accent } = eventKleuren(label)
            return (
              <button
                key={afspraak.id}
                onClick={() => onAfspraakKlik(afspraak)}
                className="flex items-start gap-3 w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ backgroundColor: accent }} />
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
                      const ck = eventKleuren(l, 0.15)
                      return (
                        <span
                          key={lid}
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: ck.achtergrond, color: ck.tekst }}
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
