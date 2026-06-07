'use client'

import { X, Cake, Tag, SlidersHorizontal, StickyNote, Search } from 'lucide-react'

interface Props {
  open: boolean
  onSluit: () => void
  onZoek: () => void
  onFilters: () => void
  onVerjaardagen: () => void
  onLabels: () => void
}

const itemKlasse =
  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors text-gray-700 hover:bg-gray-100'

// Mobiel off-canvas menu: drawer die vanaf rechts inschuift (de hamburger zit rechtsboven).
// Bewust altijd gemount (geen `if (!open) return null` zoals de modals): alleen zo kan de
// sluit-animatie via CSS-transitions vloeiend aflopen. `pointer-events-none` als dicht
// voorkomt dat het onzichtbare paneel kliks of focus onderschept.
export default function MobielMenu({ open, onSluit, onZoek, onFilters, onVerjaardagen, onLabels }: Props) {
  const actieItems: {
    key: string
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    onClick: () => void
  }[] = [
    { key: 'zoeken',       label: 'Zoeken',       icon: Search,            onClick: onZoek },
    { key: 'verjaardagen', label: 'Verjaardagen', icon: Cake,              onClick: onVerjaardagen },
    { key: 'labels',       label: 'Labels',       icon: Tag,               onClick: onLabels },
    { key: 'filters',      label: 'Filters',      icon: SlidersHorizontal, onClick: onFilters },
  ]

  return (
    <div
      className={['fixed inset-0 z-50 sm:hidden', open ? '' : 'pointer-events-none'].join(' ')}
      aria-hidden={!open}
      inert={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onSluit}
        className={[
          'absolute inset-0 bg-black/30 transition-opacity duration-300 motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />

      {/* Paneel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={[
          'absolute top-0 right-0 h-full w-72 max-w-[80%] bg-white shadow-xl flex flex-col',
          'transition-transform duration-300 ease-out motion-reduce:transition-none safe-area-bottom',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200">
          <h2 className="text-[15px] font-semibold text-gray-900">Menu</h2>
          <button onClick={onSluit} aria-label="Sluiten" className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Items — actie-items sluiten het menu en openen de bijbehorende modal */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <a href="https://notes.jellebol.nl" className={itemKlasse}>
            <StickyNote size={18} className="text-gray-400" />
            Notes
          </a>
          {actieItems.map(({ key, label, icon: Icon, onClick }) => (
            <button key={key} onClick={() => { onSluit(); onClick() }} className={itemKlasse}>
              <Icon size={18} className="text-gray-400" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
