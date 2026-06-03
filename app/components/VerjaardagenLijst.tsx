'use client'

import { Plus, X, Bell, Repeat, Cake } from 'lucide-react'
import type { Verjaardag } from '@/types'
import {
  VERJAARDAG_KLEUR, sorteerOpEerstvolgende, formatVerjaardagDatum,
  eerstvolgendeVerjaardag, leeftijdInJaar,
} from '@/lib/verjaardagen'
import { labelAchtergrond } from '@/lib/kleuren'

interface Props {
  open: boolean
  verjaardagen: Verjaardag[]
  onNieuw: () => void
  onBewerk: (v: Verjaardag) => void
  onSluit: () => void
}

export default function VerjaardagenLijst({ open, verjaardagen, onNieuw, onBewerk, onSluit }: Props) {
  if (!open) return null

  const nu        = new Date()
  const gesorteerd = sorteerOpEerstvolgende(verjaardagen, nu)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <button onClick={onSluit} className="w-16 flex justify-start text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
          <h2 className="text-[15px] font-semibold text-gray-900">Verjaardagen</h2>
          <button onClick={onNieuw} className="w-16 flex justify-end text-[#007AFF] hover:opacity-70 transition-opacity" title="Nieuwe verjaardag">
            <Plus size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {gesorteerd.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 text-center px-8 py-16">
              <span className="text-5xl">🎂</span>
              <p className="text-gray-600 text-[15px] font-medium">Nog geen verjaardagen</p>
              <p className="text-gray-400 text-sm max-w-[260px]">
                Voeg verjaardagen toe en zie ze automatisch in je kalender verschijnen.
              </p>
              <button
                onClick={onNieuw}
                className="mt-2 inline-flex items-center gap-1.5 bg-[#34C759] text-white rounded-full px-4 py-2 text-[14px] font-semibold hover:brightness-95 transition-all"
              >
                <Plus size={16} /> Verjaardag toevoegen
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {gesorteerd.map(v => {
                const occ      = eerstvolgendeVerjaardag(v, nu)
                const leeftijd = leeftijdInJaar(v, occ.getFullYear())
                const heeftReminder = (v.herinneringMinuten ?? -1) >= 0
                return (
                  <li key={v.id}>
                    <button
                      onClick={() => onBewerk(v)}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: labelAchtergrond(VERJAARDAG_KLEUR, 0.15) }}
                      >
                        <Cake size={18} style={{ color: VERJAARDAG_KLEUR }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-gray-900 truncate">{v.naam}</p>
                        <p className="text-[13px] text-gray-500">
                          {formatVerjaardagDatum(v.datum)}
                          {leeftijd != null && leeftijd >= 0 && <span className="text-gray-400"> · wordt {leeftijd}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-gray-300">
                        {v.terugkomend && <Repeat size={15} />}
                        {heeftReminder && <Bell size={15} />}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
