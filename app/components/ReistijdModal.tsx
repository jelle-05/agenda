'use client'

import { X, Car } from 'lucide-react'
import { tijdNaarMinuten, minutenNaarTijd, NL_MAANDEN_KORT, NL_DAGEN_KORT, getDagIndex } from '@/lib/datum'
import { eventKleuren } from '@/lib/kleuren'
import type { Afspraak, Label } from '@/types'

interface Props {
  open: boolean
  afspraken: Afspraak[]
  labels: Label[]
  onKies: (a: Afspraak) => void
  onSluit: () => void
}

function formatDatum(datum: string): string {
  const [y, m, d] = datum.split('-').map(Number)
  const dag = new Date(y, m - 1, d)
  return `${NL_DAGEN_KORT[getDagIndex(dag)]} ${d} ${NL_MAANDEN_KORT[m - 1]} ${y}`
}

// Reistijd: overzicht van aankomende events met een reistijd-buffer, gesorteerd
// op vertrekmoment. Toont wanneer je moet vertrekken; klik opent het event.
export default function ReistijdModal({ open, afspraken, labels, onKies, onSluit }: Props) {
  if (!open) return null

  const nu = new Date()
  // Vertrekmoment = event-begin minus reistijd; alleen toekomstige vertrektijden.
  const items = afspraken
    .filter(a => !a.heeldag && (a.reistijdMinuten ?? 0) > 0)
    .map(a => {
      const [y, m, d] = a.datum.split('-').map(Number)
      const beginMin = tijdNaarMinuten(a.beginTijd)
      const vertrekMin = beginMin - (a.reistijdMinuten ?? 0)
      const vertrekMoment = new Date(y, m - 1, d, 0, 0, 0, 0)
      vertrekMoment.setMinutes(vertrekMin)
      return { a, vertrekMin, vertrekMoment }
    })
    .filter(x => x.vertrekMoment.getTime() >= nu.getTime())
    .sort((x, y) => x.vertrekMoment.getTime() - y.vertrekMoment.getTime())

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <div className="w-16" />
          <h2 className="text-[15px] font-semibold text-gray-900">Reistijd</h2>
          <button onClick={onSluit} aria-label="Sluiten" className="w-16 flex justify-end text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-2 text-center px-8 py-10">
              <Car size={28} className="text-gray-300" />
              <p className="text-gray-500 text-[15px] font-medium">Nog geen reistijd ingesteld</p>
              <p className="text-gray-400 text-sm">
                Voeg reistijd toe aan een afspraak om hier vertrektijden te zien.
              </p>
            </div>
          )}

          {items.map(({ a, vertrekMin }) => {
            const label = labels.find(l => l.id === a.labelIds[0])
            const { accent } = eventKleuren(label)
            const vertrek = minutenNaarTijd((vertrekMin + 24 * 60) % (24 * 60))
            return (
              <button
                key={a.id}
                onClick={() => onKies(a)}
                className="flex items-start gap-3 w-full px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="w-1 self-stretch rounded-full shrink-0 mt-0.5" style={{ backgroundColor: accent }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    <span className="text-[#007AFF]">Vertrek om {vertrek}</span> · {a.titel}
                  </p>
                  <p className="text-[12px] text-gray-400 truncate">
                    {formatDatum(a.datum)} · afspraak om {a.beginTijd}
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
