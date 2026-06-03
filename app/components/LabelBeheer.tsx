'use client'

import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import type { Label } from '@/types'
import { eventKleuren, contrastRatio } from '@/lib/kleuren'

const PRESET_KLEUREN = [
  '#FF3B30', '#FF6B00', '#FF9500', '#FFCC00',
  '#34C759', '#00C7BE', '#32ADE6', '#007AFF',
  '#5856D6', '#AF52DE', '#FF2D55', '#8E8E93',
]

interface Props {
  open: boolean
  labels: Label[]
  onOpslaan: (label: Label) => void
  onVerwijder: (id: string) => void
  onSluit: () => void
}

export default function LabelBeheer({ open, labels, onOpslaan, onVerwijder, onSluit }: Props) {
  const [modus, setModus] = useState<'lijst' | 'bewerk'>('lijst')
  const [bewerk, setBewerk] = useState<Partial<Label>>({})

  if (!open) return null

  const isNieuw = !bewerk.id

  function openNieuw() {
    setBewerk({ naam: '', kleur: '#007AFF' })
    setModus('bewerk')
  }

  function openBewerk(label: Label) {
    setBewerk({ ...label })
    setModus('bewerk')
  }

  function terug() {
    setModus('lijst')
    setBewerk({})
  }

  function opslaan() {
    if (!bewerk.naam?.trim()) return
    onOpslaan({
      id: bewerk.id || crypto.randomUUID(),
      naam: bewerk.naam.trim(),
      kleur: bewerk.kleur || '#007AFF',
      achtergrondKleur: bewerk.achtergrondKleur,
      tekstKleur: bewerk.tekstKleur,
    })
    terug()
  }

  // Eigen kleuren staan aan zodra een achtergrondkleur is ingesteld.
  const eigenKleuren = bewerk.achtergrondKleur != null
  function setEigenKleuren(aan: boolean) {
    if (aan) setBewerk(l => ({ ...l, achtergrondKleur: l.kleur || '#007AFF', tekstKleur: '#FFFFFF' }))
    else setBewerk(l => ({ ...l, achtergrondKleur: undefined, tekstKleur: undefined }))
  }
  const contrastLaag = eigenKleuren
    && contrastRatio(bewerk.achtergrondKleur || '#FFFFFF', bewerk.tekstKleur || '#000000') < 3

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[400px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          {modus === 'bewerk' ? (
            <>
              <button onClick={terug} className="text-[#007AFF] text-sm font-medium w-20">
                ← Terug
              </button>
              <h2 className="text-[15px] font-semibold text-gray-900">
                {isNieuw ? 'Nieuw label' : 'Bewerk label'}
              </h2>
              <button
                onClick={opslaan}
                disabled={!bewerk.naam?.trim()}
                className="text-[#007AFF] text-sm font-semibold w-20 text-right disabled:opacity-40"
              >
                Bewaar
              </button>
            </>
          ) : (
            <>
              <div className="w-20" />
              <h2 className="text-[15px] font-semibold text-gray-900">Labels</h2>
              <button onClick={onSluit} className="text-[#007AFF] text-sm font-semibold w-20 text-right">
                Gereed
              </button>
            </>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {modus === 'lijst' ? (
            <>
              {/* Label lijst */}
              <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
                {labels.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-400 text-center">Nog geen labels</div>
                ) : (
                  labels.map(label => (
                    <button
                      key={label.id}
                      onClick={() => openBewerk(label)}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-100 transition-colors"
                    >
                      <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: label.kleur }} />
                      <span className="flex-1 text-[15px] text-gray-900 text-left">{label.naam}</span>
                      <ChevronRight size={16} className="text-gray-400" />
                    </button>
                  ))
                )}
              </div>

              {/* Nieuw label */}
              <button
                onClick={openNieuw}
                className="flex items-center gap-3 w-full bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-[#007AFF] flex items-center justify-center shrink-0">
                  <Plus size={12} className="text-white" />
                </span>
                <span className="text-[15px] text-[#007AFF]">Nieuw label</span>
              </button>
            </>
          ) : (
            <>
              {/* Naam */}
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <input
                  type="text"
                  value={bewerk.naam ?? ''}
                  onChange={e => setBewerk(l => ({ ...l, naam: e.target.value }))}
                  placeholder="Labelnaam"
                  className="w-full text-[17px] font-medium placeholder:text-gray-300 outline-none bg-transparent"
                  onKeyDown={e => e.key === 'Enter' && opslaan()}
                />
              </div>

              {/* Kleur */}
              <div className="bg-gray-50 rounded-xl px-4 py-4">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-3">Kleur</p>
                <div className="grid grid-cols-6 gap-3">
                  {PRESET_KLEUREN.map(kleur => (
                    <button
                      key={kleur}
                      onClick={() => setBewerk(l => ({ ...l, kleur }))}
                      className={[
                        'w-9 h-9 rounded-full transition-all',
                        bewerk.kleur === kleur ? 'scale-110 ring-2 ring-offset-2 ring-gray-500' : 'hover:scale-105',
                      ].join(' ')}
                      style={{ backgroundColor: kleur }}
                    />
                  ))}
                </div>

              </div>

              {/* Eigen achtergrond-/tekstkleur */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] text-gray-800">Eigen achtergrond/tekstkleur</span>
                  <button
                    onClick={() => setEigenKleuren(!eigenKleuren)}
                    className={['relative w-12 h-7 rounded-full transition-colors', eigenKleuren ? 'bg-[#34C759]' : 'bg-gray-300'].join(' ')}
                    aria-label="Eigen kleuren"
                    aria-pressed={eigenKleuren}
                  >
                    <span className={['absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-all', eigenKleuren ? 'left-[26px]' : 'left-[3px]'].join(' ')} />
                  </button>
                </div>

                {eigenKleuren && (
                  <div className="flex gap-3">
                    <label className="flex-1 flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                      <span className="text-[13px] text-gray-600">Achtergrond</span>
                      <input
                        type="color"
                        value={bewerk.achtergrondKleur || '#007AFF'}
                        onChange={e => setBewerk(l => ({ ...l, achtergrondKleur: e.target.value }))}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                        aria-label="Achtergrondkleur"
                      />
                    </label>
                    <label className="flex-1 flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                      <span className="text-[13px] text-gray-600">Tekst</span>
                      <input
                        type="color"
                        value={bewerk.tekstKleur || '#FFFFFF'}
                        onChange={e => setBewerk(l => ({ ...l, tekstKleur: e.target.value }))}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                        aria-label="Tekstkleur"
                      />
                    </label>
                  </div>
                )}

                {contrastLaag && (
                  <p className="text-[12px] text-orange-500">Laag contrast — tekst mogelijk slecht leesbaar.</p>
                )}

                {/* Preview als event-blok */}
                {bewerk.naam && (() => {
                  const { accent, achtergrond, tekst } = eventKleuren(bewerk as Label, 0.22)
                  return (
                    <div className="pt-1">
                      <p className="text-[11px] text-gray-400 mb-1.5">Voorbeeld</p>
                      <div
                        className="rounded-md px-2.5 py-1.5 text-[13px] font-semibold truncate"
                        style={{ backgroundColor: achtergrond, color: tekst, borderLeft: `3px solid ${accent}` }}
                      >
                        {bewerk.naam}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Verwijder */}
              {!isNieuw && (
                <button
                  onClick={() => { onVerwijder(bewerk.id!); terug() }}
                  className="w-full bg-red-50 text-red-500 rounded-xl py-3 text-[15px] font-medium hover:bg-red-100 transition-colors"
                >
                  Verwijder label
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
