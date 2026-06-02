'use client'

import { ChevronLeft, ChevronRight, Plus, Tag } from 'lucide-react'
import type { WeergaveType } from '@/types'

const WEERGAVEN: { key: WeergaveType; label: string }[] = [
  { key: 'dag',    label: 'Dag'    },
  { key: 'week',   label: 'Week'   },
  { key: 'maand',  label: 'Maand'  },
  { key: 'agenda', label: 'Agenda' },
]

interface Props {
  weergave: WeergaveType
  onWeergaveChange: (w: WeergaveType) => void
  titel: string
  onVorige: () => void
  onVolgende: () => void
  onVandaag: () => void
  onNieuw: () => void
  onLabels: () => void
  onProfielMenu: () => void
  gebruikerEmail?: string
}

export default function TopBar({
  weergave, onWeergaveChange, titel, onVorige, onVolgende, onVandaag,
  onNieuw, onLabels, onProfielMenu, gebruikerEmail,
}: Props) {
  const initiaal = gebruikerEmail?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="flex items-center justify-between px-3 h-12 border-b border-gray-200 bg-white shrink-0 gap-2">
      {/* Navigatie */}
      <div className="flex items-center gap-1 min-w-0">
        <button
          onClick={onVandaag}
          className="hidden sm:block text-[13px] font-medium text-[#007AFF] hover:opacity-70 transition-opacity px-1 shrink-0"
        >
          Vandaag
        </button>
        <button onClick={onVorige} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronLeft size={18} />
        </button>
        <span className="text-[15px] font-semibold text-gray-900 whitespace-nowrap px-1">
          {titel}
        </span>
        <button onClick={onVolgende} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weergave tabs — desktop only */}
      <div className="hidden sm:flex items-center rounded-lg overflow-hidden border border-gray-200 shrink-0">
        {WEERGAVEN.map(v => (
          <button
            key={v.key}
            onClick={() => onWeergaveChange(v.key)}
            className={[
              'px-3.5 py-1.5 text-sm font-medium transition-colors border-r border-gray-200 last:border-0',
              weergave === v.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Acties */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onLabels} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500" title="Labels">
          <Tag size={18} />
        </button>
        <button onClick={onNieuw} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500" title="Nieuwe afspraak">
          <Plus size={18} />
        </button>

        {/* Avatar — opent profielmenu */}
        <button
          onClick={onProfielMenu}
          title={gebruikerEmail}
          className="ml-1 w-7 h-7 rounded-full bg-[#007AFF] flex items-center justify-center text-white text-[11px] font-bold hover:bg-blue-600 transition-colors shrink-0"
        >
          {initiaal}
        </button>
      </div>
    </header>
  )
}
