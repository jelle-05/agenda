'use client'

import { X, Star } from 'lucide-react'
import { toISODatum, NL_MAANDEN_KORT, NL_DAGEN_KORT, getDagIndex } from '@/lib/datum'
import { eventKleuren } from '@/lib/kleuren'
import type { Afspraak, Label } from '@/types'

interface Props {
  open: boolean
  afspraken: Afspraak[]
  labels: Label[]
  onKies: (a: Afspraak) => void
  onToggleFavoriet: (a: Afspraak) => void
  onSluit: () => void
}

// "vandaag" / "morgen" / "over X dagen" — op kalenderdagen, niet op uren.
function dagenTotTekst(datumIso: string): string {
  const [y, m, d] = datumIso.split('-').map(Number)
  const doel = new Date(y, m - 1, d)
  const nu = new Date()
  const vandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate())
  const dagen = Math.round((doel.getTime() - vandaag.getTime()) / (24 * 3600 * 1000))
  if (dagen <= 0) return 'vandaag'
  if (dagen === 1) return 'morgen'
  return `over ${dagen} dagen`
}

function formatDatum(datum: string): string {
  const [y, m, d] = datum.split('-').map(Number)
  const dag = new Date(y, m - 1, d)
  return `${NL_DAGEN_KORT[getDagIndex(dag)]} ${d} ${NL_MAANDEN_KORT[m - 1]} ${y}`
}

// Countdowns: alle favoriete events. Toekomstige (incl. vandaag) prominent met
// afteltekst; verlopen favorieten compact onder "Voorbij" (nooit automatisch
// verwijderd — uitzetten kan met de ster).
export default function CountdownModal({ open, afspraken, labels, onKies, onToggleFavoriet, onSluit }: Props) {
  if (!open) return null

  const vandaag = toISODatum(new Date())
  const favorieten = afspraken.filter(a => a.favoriet)
  const komend = favorieten
    .filter(a => a.datum >= vandaag)
    .sort((a, b) => a.datum.localeCompare(b.datum)
      || (a.heeldag !== b.heeldag ? (a.heeldag ? -1 : 1) : a.beginTijd.localeCompare(b.beginTijd)))
  const voorbij = favorieten
    .filter(a => a.datum < vandaag)
    .sort((a, b) => b.datum.localeCompare(a.datum))
    .slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <div className="w-16" />
          <h2 className="text-[15px] font-semibold text-gray-900">Countdowns</h2>
          <button onClick={onSluit} aria-label="Sluiten" className="w-16 flex justify-end text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {favorieten.length === 0 && (
            <div className="flex flex-col items-center gap-2 text-center px-8 py-10">
              <Star size={28} className="text-gray-300" />
              <p className="text-gray-500 text-[15px] font-medium">Nog geen countdowns</p>
              <p className="text-gray-400 text-sm">
                Markeer een afspraak als favoriet via de ster in het afspraakformulier om hier een countdown te zien.
              </p>
            </div>
          )}

          {komend.length > 0 && (
            <>
              <p className="text-[12px] text-gray-400 px-4 pt-3 pb-1">Je favoriete afspraken op een rij.</p>
              {komend.map(a => {
                const label = labels.find(l => l.id === a.labelIds[0])
                const { accent } = eventKleuren(label)
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <span className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: accent }} />
                    <button onClick={() => onKies(a)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {a.titel}
                        <span className="text-[#007AFF]"> {dagenTotTekst(a.datum)}</span>
                      </p>
                      <p className="text-[12px] text-gray-400 truncate">
                        {formatDatum(a.datum)}
                        {' · '}
                        {a.heeldag ? 'Hele dag' : `${a.beginTijd} – ${a.eindTijd}`}
                        {a.locatie ? ` · ${a.locatie}` : ''}
                      </p>
                    </button>
                    <button
                      onClick={() => onToggleFavoriet(a)}
                      aria-label="Countdown uitzetten"
                      className="p-1.5 -m-1 shrink-0"
                    >
                      <Star size={16} className="text-[#FFCC00]" fill="#FFCC00" />
                    </button>
                  </div>
                )
              })}
            </>
          )}

          {voorbij.length > 0 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 px-4 pt-4 pb-1">
                Voorbij
              </p>
              {voorbij.map(a => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100">
                  <button onClick={() => onKies(a)} className="flex-1 min-w-0 text-left">
                    <p className="text-[13px] text-gray-500 truncate">{a.titel}</p>
                    <p className="text-[11px] text-gray-400">{formatDatum(a.datum)}</p>
                  </button>
                  <button
                    onClick={() => onToggleFavoriet(a)}
                    aria-label="Countdown uitzetten"
                    className="p-1.5 -m-1 shrink-0"
                  >
                    <Star size={14} className="text-gray-300" fill="currentColor" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
