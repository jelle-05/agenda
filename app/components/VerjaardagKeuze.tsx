'use client'

import { Plus, List, X, Cake } from 'lucide-react'
import { VERJAARDAG_KLEUR } from '@/lib/verjaardagen'
import { labelAchtergrond } from '@/lib/kleuren'

interface Props {
  open: boolean
  onNieuw: () => void
  onBekijken: () => void
  onSluit: () => void
}

export default function VerjaardagKeuze({ open, onNieuw, onBekijken, onSluit }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100">
          <div className="w-16" />
          <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-1.5">
            <Cake size={16} style={{ color: VERJAARDAG_KLEUR }} /> Verjaardagen
          </h2>
          <button onClick={onSluit} className="w-16 flex justify-end text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Keuzes */}
        <div className="p-4 space-y-2.5">
          <button
            onClick={onNieuw}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left hover:brightness-95 transition-all"
            style={{ backgroundColor: labelAchtergrond(VERJAARDAG_KLEUR, 0.12) }}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: labelAchtergrond(VERJAARDAG_KLEUR, 0.2) }}
            >
              <Plus size={18} style={{ color: VERJAARDAG_KLEUR }} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-semibold text-gray-900">Nieuwe verjaardag toevoegen</span>
              <span className="block text-[13px] text-gray-500">Voeg iemand toe aan je kalender</span>
            </span>
          </button>

          <button
            onClick={onBekijken}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
              <List size={18} className="text-gray-600" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-semibold text-gray-900">Huidige verjaardagen bekijken</span>
              <span className="block text-[13px] text-gray-500">Overzicht, bewerken en verwijderen</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
