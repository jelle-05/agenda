'use client'

import { ChevronLeft, ChevronRight, Plus, Menu } from 'lucide-react'
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
  onMenu: () => void
  onProfielMenu: () => void
  gebruikerEmail?: string
}

// Zonder display-utility: de instanties zetten zelf `flex sm:hidden` (mobiel) of `hidden sm:flex` (desktop)
const avatarKlasse =
  'w-7 h-7 rounded-full bg-[#007AFF] items-center justify-center text-white text-[11px] font-bold hover:bg-blue-600 transition-colors shrink-0'

export default function TopBar({
  weergave, onWeergaveChange, titel, onVorige, onVolgende, onVandaag,
  onNieuw, onMenu, onProfielMenu, gebruikerEmail,
}: Props) {
  const initiaal = gebruikerEmail?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="flex items-center justify-between px-3 h-12 border-b border-gray-200 bg-white shrink-0 gap-2">
      {/* Navigatie */}
      <div className="flex items-center gap-1 min-w-0 flex-1 sm:flex-none">
        {/* Avatar — alleen mobiel links (desktop: rechts in de acties-groep) */}
        <button
          onClick={onProfielMenu}
          title={gebruikerEmail}
          aria-label="Profiel"
          className={`flex sm:hidden mr-1 ${avatarKlasse}`}
        >
          {initiaal}
        </button>
        <button
          onClick={onVandaag}
          className="hidden sm:block text-[13px] font-medium text-[#007AFF] hover:opacity-70 transition-opacity px-1 shrink-0"
        >
          Vandaag
        </button>
        <button onClick={onVorige} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500 shrink-0">
          <ChevronLeft size={18} />
        </button>
        <span className="text-[15px] font-semibold text-gray-900 px-1 text-center truncate flex-1 sm:flex-none sm:w-[200px]">
          {titel}
        </span>
        <button onClick={onVolgende} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500 shrink-0">
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

      {/* Acties — Verjaardagen/Labels/Filters zitten in de Sidebar (desktop) en het MobielMenu (mobiel) */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Nieuw event — mobiel als gevulde blauwe cirkel (groter tap-target), desktop subtiel */}
        <button
          onClick={onNieuw}
          title="Nieuwe afspraak"
          aria-label="Nieuwe afspraak"
          className="flex items-center justify-center rounded-full transition-colors shrink-0 w-8 h-8 bg-[#007AFF] text-white hover:bg-blue-600 sm:w-auto sm:h-auto sm:p-1.5 sm:bg-transparent sm:text-gray-500 sm:hover:bg-gray-100"
        >
          <Plus size={18} />
        </button>

        {/* Avatar — opent profielmenu (alleen desktop; mobiel staat hij links) */}
        <button
          onClick={onProfielMenu}
          title={gebruikerEmail}
          aria-label="Profiel"
          className={`hidden sm:flex ml-1 ${avatarKlasse}`}
        >
          {initiaal}
        </button>

        {/* Hamburger — alleen mobiel, opent het off-canvas menu */}
        <button
          onClick={onMenu}
          className="sm:hidden p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-600 shrink-0"
          title="Menu"
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>
      </div>
    </header>
  )
}
