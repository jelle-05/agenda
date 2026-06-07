'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { toISODatum, NL_MAANDEN_KORT, NL_DAGEN_KORT, getDagIndex } from '@/lib/datum'
import { eventKleuren } from '@/lib/kleuren'
import type { Afspraak, Label } from '@/types'

interface Props {
  open: boolean
  afspraken: Afspraak[]
  labels: Label[]
  onKies: (a: Afspraak) => void
  onSluit: () => void
}

// Case- en diakriet-ongevoelig vergelijken ("cafe" vindt "Café"): NFD splitst
// letters en accenten, daarna strippen we de combining marks (U+0300–U+036F).
function normaliseer(tekst: string): string {
  return tekst.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function formatDatum(datum: string): string {
  const [y, m, d] = datum.split('-').map(Number)
  const dag = new Date(y, m - 1, d)
  return `${NL_DAGEN_KORT[getDagIndex(dag)]} ${d} ${NL_MAANDEN_KORT[m - 1]} ${y}`
}

// Zoekt client-side door alle eigen events (titel, locatie, notitie) — de
// volledige dataset staat al in state, dus geen API nodig. Verjaardagen en
// feestdagen vallen bewust buiten de zoekresultaten.
export default function ZoekModal({ open, afspraken, labels, onKies, onSluit }: Props) {
  const [term, setTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      // Bewuste reset + autofocus bij openen (modal-open-conventie).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTerm('')
      inputRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const schoon = normaliseer(term.trim())
  const vandaag = toISODatum(new Date())

  let resultaten: Afspraak[] = []
  if (schoon.length >= 2) {
    const matches = afspraken.filter(a =>
      normaliseer(a.titel).includes(schoon)
      || (a.locatie && normaliseer(a.locatie).includes(schoon))
      || (a.notitie && normaliseer(a.notitie).includes(schoon))
    )
    // Aankomend eerst (dichtstbijzijnde bovenaan), daarna verleden (recentste eerst).
    const komend   = matches.filter(a => a.datum >= vandaag).sort((a, b) => a.datum.localeCompare(b.datum) || a.beginTijd.localeCompare(b.beginTijd))
    const verleden = matches.filter(a => a.datum < vandaag).sort((a, b) => b.datum.localeCompare(a.datum) || a.beginTijd.localeCompare(b.beginTijd))
    resultaten = [...komend, ...verleden].slice(0, 50)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[70vh]">
        {/* Header met zoekveld */}
        <div className="flex items-center gap-2 px-4 h-12 border-b border-gray-100 shrink-0">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={term}
            onChange={e => setTerm(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onSluit()}
            placeholder="Zoek in titel, locatie of notities"
            className="flex-1 text-[15px] outline-none bg-transparent placeholder:text-gray-400 min-w-0"
            aria-label="Zoeken"
          />
          <button onClick={onSluit} aria-label="Sluiten" className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Resultaten */}
        <div className="overflow-y-auto flex-1">
          {schoon.length < 2 && (
            <p className="text-[13px] text-gray-400 text-center px-4 py-8">
              Typ minimaal 2 tekens om te zoeken.
            </p>
          )}
          {schoon.length >= 2 && resultaten.length === 0 && (
            <p className="text-[13px] text-gray-400 text-center px-4 py-8">
              Geen afspraken gevonden voor &ldquo;{term.trim()}&rdquo;.
            </p>
          )}
          {resultaten.map(a => {
            const label = labels.find(l => l.id === a.labelIds[0])
            const { accent } = eventKleuren(label)
            return (
              <button
                key={a.id}
                onClick={() => onKies(a)}
                className="flex items-start gap-3 w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ backgroundColor: accent }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.titel}</p>
                  <p className="text-[12px] text-gray-400 truncate">
                    {formatDatum(a.datum)}
                    {' · '}
                    {a.heeldag ? 'Hele dag' : `${a.beginTijd} – ${a.eindTijd}`}
                    {a.locatie ? ` · ${a.locatie}` : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
