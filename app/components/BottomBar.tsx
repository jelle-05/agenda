'use client'

import { Calendar, CalendarDays, Clock, List } from 'lucide-react'
import type { WeergaveType } from '@/types'

const TABS: { key: WeergaveType; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'maand',  label: 'Maand',  icon: Calendar },
  { key: 'week',   label: 'Week',   icon: CalendarDays },
  { key: 'dag',    label: 'Dag',    icon: Clock },
  { key: 'agenda', label: 'Agenda', icon: List },
]

interface Props {
  weergave: WeergaveType
  onWeergaveChange: (w: WeergaveType) => void
  onVandaag: () => void
}

export default function BottomBar({ weergave, onWeergaveChange, onVandaag }: Props) {
  return (
    <nav className="sm:hidden flex items-stretch border-t border-gray-200 bg-white shrink-0 safe-area-bottom">
      {TABS.map(({ key, label, icon: Icon }) => {
        const actief = weergave === key
        return (
          <button
            key={key}
            onClick={() => onWeergaveChange(key)}
            className={[
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors',
              actief ? 'text-[#007AFF]' : 'text-gray-400',
            ].join(' ')}
          >
            <Icon size={22} className={actief ? 'text-[#007AFF]' : 'text-gray-400'} />
            {label}
          </button>
        )
      })}

      {/* Vandaag knop */}
      <button
        onClick={onVandaag}
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium text-[#007AFF]"
      >
        <span className="w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#FF3B30] text-white text-[11px] font-bold">
          {new Date().getDate()}
        </span>
        Vandaag
      </button>
    </nav>
  )
}
