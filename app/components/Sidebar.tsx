'use client'

import { CalendarDays, Cake, Tag, SlidersHorizontal, StickyNote } from 'lucide-react'

interface Props {
  begroeting?: string
  onFilters: () => void
  onVerjaardagen: () => void
  onLabels: () => void
}

const itemKlasse =
  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors text-gray-700 hover:bg-gray-100'

// Desktop-zijbalk (verborgen op mobiel; daar neemt het off-canvas MobielMenu dit over).
// Zelfde patroon als de sidebar van de notes-app, met onderaan de link terug naar Notes.
export default function Sidebar({ begroeting, onFilters, onVerjaardagen, onLabels }: Props) {
  const items: {
    key: string
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    onClick: () => void
  }[] = [
    { key: 'verjaardagen', label: 'Verjaardagen', icon: Cake,              onClick: onVerjaardagen },
    { key: 'labels',       label: 'Labels',       icon: Tag,               onClick: onLabels },
    { key: 'filters',      label: 'Filters',      icon: SlidersHorizontal, onClick: onFilters },
  ]

  return (
    <aside className="hidden sm:flex flex-col w-60 shrink-0 border-r border-gray-200 bg-white">
      {/* App-naam — h-12 + border-b lijnen uit met de TopBar ernaast */}
      <div className="flex items-center gap-2 px-4 h-12 border-b border-gray-200">
        <CalendarDays size={18} className="text-[#007AFF]" />
        <span className="text-[15px] font-semibold text-gray-900">Agenda</span>
      </div>

      {/* Begroeting + dagsamenvatting — subtiel, op mobiel staat dit in de dagweergave */}
      {begroeting && (
        <div className="px-4 py-3 border-b border-gray-200">
          <p className="text-[13px] text-gray-500 truncate">{begroeting.split(' · ')[0]}</p>
          <p className="text-[12px] text-gray-400 truncate">{begroeting.split(' · ')[1]}</p>
        </div>
      )}

      {/* Navigatie */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {items.map(({ key, label, icon: Icon, onClick }) => (
          <button key={key} onClick={onClick} className={itemKlasse}>
            <Icon size={18} className="text-gray-400" />
            {label}
          </button>
        ))}
      </nav>

      {/* Externe link naar de notes-app */}
      <div className="p-2 border-t border-gray-200">
        <a href="https://notes.jellebol.nl" className={itemKlasse}>
          <StickyNote size={18} className="text-gray-400" />
          Notes
        </a>
      </div>
    </aside>
  )
}
