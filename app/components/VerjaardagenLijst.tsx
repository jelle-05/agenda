'use client'

import { useState } from 'react'
import { Plus, X, Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Verjaardag } from '@/types'
import {
  VERJAARDAG_KLEUR, sorteerOpEerstvolgende, formatVerjaardagDatum, berekenLeeftijd,
} from '@/lib/verjaardagen'

interface Props {
  open: boolean
  verjaardagen: Verjaardag[]
  onNieuw: () => void
  onBewerk: (v: Verjaardag) => void
  onSluit: () => void
}

const PER_PAGINA = 8

function reminderLabel(min?: number): string {
  if (min == null || min < 0) return '—'
  if (min >= 10080) return '1 week'
  if (min >= 1440) return '1 dag'
  if (min >= 60) return '1 uur'
  return 'Aan'
}

export default function VerjaardagenLijst({ open, verjaardagen, onNieuw, onBewerk, onSluit }: Props) {
  const [pagina, setPagina] = useState(0)

  if (!open) return null

  const nu         = new Date()
  const gesorteerd = sorteerOpEerstvolgende(verjaardagen, nu)
  const aantalPaginas = Math.max(1, Math.ceil(gesorteerd.length / PER_PAGINA))
  const huidigePagina = Math.min(pagina, aantalPaginas - 1)
  const zichtbaar = gesorteerd.slice(huidigePagina * PER_PAGINA, huidigePagina * PER_PAGINA + PER_PAGINA)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[540px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
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
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="font-semibold px-4 py-2">Naam</th>
                  <th className="font-semibold px-2 py-2">Datum</th>
                  <th className="font-semibold px-2 py-2 hidden sm:table-cell">Leeftijd</th>
                  <th className="font-semibold px-4 py-2 text-right">Herinnering</th>
                </tr>
              </thead>
              <tbody>
                {zichtbaar.map(v => {
                  const leeftijd = berekenLeeftijd(v, nu)
                  const heeftReminder = (v.herinneringMinuten ?? -1) >= 0
                  return (
                    <tr
                      key={v.id}
                      onClick={() => onBewerk(v)}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: VERJAARDAG_KLEUR }} />
                          <span className="text-[14px] font-medium text-gray-900 truncate">{v.naam}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-[13px] text-gray-600 whitespace-nowrap">
                        {formatVerjaardagDatum(v.dag, v.maand)}
                      </td>
                      <td className="px-2 py-3 text-[13px] text-gray-600 hidden sm:table-cell whitespace-nowrap">
                        {leeftijd != null ? `${leeftijd} jaar` : 'Onbekend'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {heeftReminder ? (
                          <span className="inline-flex items-center gap-1 text-[12px] text-gray-500">
                            <Bell size={13} className="text-[#34C759]" />
                            {reminderLabel(v.herinneringMinuten)}
                          </span>
                        ) : (
                          <span className="text-[12px] text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginatie */}
        {aantalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
            <button
              onClick={() => setPagina(p => Math.max(0, p - 1))}
              disabled={huidigePagina === 0}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-[13px] text-gray-500">
              Pagina {huidigePagina + 1} van {aantalPaginas}
            </span>
            <button
              onClick={() => setPagina(p => Math.min(aantalPaginas - 1, p + 1))}
              disabled={huidigePagina >= aantalPaginas - 1}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
