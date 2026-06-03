'use client'

import { X } from 'lucide-react'
import type { Filters } from '@/types'
import { VERJAARDAG_KLEUR } from '@/lib/verjaardagen'
import { FEESTDAG_KLEUR } from '@/lib/feestdagen'

interface Props {
  open: boolean
  filters: Filters
  onWijzig: (key: keyof Filters) => void
  onSluit: () => void
}

const RIJEN: { key: keyof Filters; naam: string; kleur: string }[] = [
  { key: 'events',       naam: 'Events',       kleur: '#007AFF' },
  { key: 'verjaardagen', naam: 'Verjaardagen', kleur: VERJAARDAG_KLEUR },
  { key: 'feestdagen',   naam: 'Feestdagen',   kleur: FEESTDAG_KLEUR },
]

export default function FilterMenu({ open, filters, onWijzig, onSluit }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[400px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100">
          <div className="w-16" />
          <h2 className="text-[15px] font-semibold text-gray-900">Filters</h2>
          <button onClick={onSluit} className="w-16 flex justify-end text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Toggles */}
        <div className="p-4">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-2 px-1">Tonen in kalender</p>
          <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
            {RIJEN.map(({ key, naam, kleur }) => {
              const aan = filters[key]
              return (
                <div key={key} className="flex items-center justify-between px-4 py-3">
                  <span className="flex items-center gap-2.5 text-[15px] text-gray-800">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: kleur }} />
                    {naam}
                  </span>
                  <button
                    onClick={() => onWijzig(key)}
                    className={['relative w-12 h-7 rounded-full transition-colors', aan ? 'bg-[#34C759]' : 'bg-gray-300'].join(' ')}
                    aria-label={naam}
                    aria-pressed={aan}
                  >
                    <span className={['absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-all', aan ? 'left-[26px]' : 'left-[3px]'].join(' ')} />
                  </button>
                </div>
              )
            })}
          </div>
          <p className="text-[12px] text-gray-400 mt-3 px-1">
            Filters verbergen alleen de weergave; je gegevens blijven bewaard.
          </p>
        </div>
      </div>
    </div>
  )
}
