'use client'

import { ChevronLeft, ChevronRight, Search, Plus } from 'lucide-react'
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
}

export default function TopBar({ weergave, onWeergaveChange, titel, onVorige, onVolgende }: Props) {
  return (
    <header className="flex items-center justify-between px-3 h-12 border-b border-gray-200 bg-white shrink-0 gap-2">
      {/* Navigatie links */}
      <div className="flex items-center gap-1 min-w-0">
        <button
          onClick={onVorige}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-[15px] font-semibold text-gray-900 whitespace-nowrap px-1">
          {titel}
        </span>
        <button
          onClick={onVolgende}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weergave tabs — alleen desktop */}
      <div className="hidden sm:flex items-center rounded-lg overflow-hidden border border-gray-200 shrink-0">
        {WEERGAVEN.map((v) => (
          <button
            key={v.key}
            onClick={() => onWeergaveChange(v.key)}
            className={[
              'px-3.5 py-1.5 text-sm font-medium transition-colors border-r border-gray-200 last:border-0',
              weergave === v.key
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Acties rechts */}
      <div className="flex items-center gap-1 shrink-0">
        <button className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
          <Search size={18} />
        </button>
        <button className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
          <Plus size={18} />
        </button>
      </div>
    </header>
  )
}
