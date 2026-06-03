'use client'

import { useState, useEffect } from 'react'
import type { Verjaardag } from '@/types'
import { toISODatum } from '@/lib/datum'

interface Props {
  open: boolean
  verjaardag?: Verjaardag | null
  onOpslaan: (verjaardag: Verjaardag) => void
  onVerwijder: (id: string) => void
  onSluit: () => void
}

function leeg(): Verjaardag {
  return { id: '', naam: '', datum: toISODatum(new Date()), terugkomend: true, herinneringMinuten: -1 }
}

export default function VerjaardagFormulier({ open, verjaardag, onOpslaan, onVerwijder, onSluit }: Props) {
  const [form, setForm] = useState<Verjaardag>(() => leeg())
  const [bevestigVerwijder, setBevestigVerwijder] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(verjaardag ? { ...verjaardag } : leeg())
      setBevestigVerwijder(false)
    }
  }, [open, verjaardag])

  if (!open) return null

  const isNieuw = !form.id
  const geldig  = form.naam.trim().length > 0 && !!form.datum

  function opslaan() {
    if (!geldig) return
    onOpslaan({
      ...form,
      id: form.id || crypto.randomUUID(),
      naam: form.naam.trim(),
      notitie: form.notitie?.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <button onClick={onSluit} className="text-[#007AFF] text-sm font-medium w-20">
            Annuleer
          </button>
          <h2 className="text-[15px] font-semibold text-gray-900">
            {isNieuw ? 'Nieuwe verjaardag' : 'Bewerk verjaardag'}
          </h2>
          <button
            onClick={opslaan}
            disabled={!geldig}
            className="text-[#007AFF] text-sm font-semibold w-20 text-right disabled:opacity-40"
          >
            {isNieuw ? 'Toevoegen' : 'Gereed'}
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* Naam (verplicht) */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <input
              type="text"
              value={form.naam}
              onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
              placeholder="Naam"
              className="w-full text-[17px] font-medium placeholder:text-gray-300 outline-none bg-transparent"
              onKeyDown={e => e.key === 'Enter' && opslaan()}
            />
          </div>

          {/* Datum, leeftijd, terugkomend */}
          <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px] text-gray-800">Datum</span>
              <input
                type="date"
                value={form.datum}
                onChange={e => setForm(f => ({ ...f, datum: e.target.value }))}
                className="text-[15px] text-[#007AFF] outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px] text-gray-800">Leeftijd <span className="text-gray-400 text-[13px]">(optioneel)</span></span>
              <input
                type="number"
                min={0}
                max={150}
                value={form.leeftijd ?? ''}
                onChange={e => {
                  const v = e.target.value
                  setForm(f => ({ ...f, leeftijd: v === '' ? undefined : Math.max(0, parseInt(v) || 0) }))
                }}
                placeholder="—"
                className="w-20 text-[15px] text-[#007AFF] outline-none bg-gray-100 rounded-lg px-2 py-1 text-center placeholder:text-gray-300"
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px] text-gray-800">Elk jaar terugkomend</span>
              <button
                onClick={() => setForm(f => ({ ...f, terugkomend: !f.terugkomend }))}
                className={['relative w-12 h-7 rounded-full transition-colors', form.terugkomend ? 'bg-[#34C759]' : 'bg-gray-300'].join(' ')}
                aria-label="Elk jaar terugkomend"
              >
                <span className={['absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-all', form.terugkomend ? 'left-[26px]' : 'left-[3px]'].join(' ')} />
              </button>
            </div>
          </div>

          {/* Reminder */}
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px] text-gray-800">Herinnering</span>
              <select
                value={form.herinneringMinuten ?? -1}
                onChange={e => setForm(f => ({ ...f, herinneringMinuten: parseInt(e.target.value) }))}
                className="text-[15px] text-[#007AFF] outline-none bg-transparent text-right"
              >
                <option value={-1}>Geen</option>
                <option value={60}>1 uur van tevoren</option>
                <option value={1440}>1 dag van tevoren</option>
              </select>
            </div>
          </div>

          {/* Notitie */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <textarea
              value={form.notitie ?? ''}
              onChange={e => setForm(f => ({ ...f, notitie: e.target.value || undefined }))}
              placeholder="Notitie (optioneel)"
              rows={3}
              className="w-full text-[15px] outline-none bg-transparent placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Verwijder (met bevestiging) */}
          {!isNieuw && (
            bevestigVerwijder ? (
              <div className="bg-red-50 rounded-xl p-3 space-y-2">
                <p className="text-[14px] text-red-600 text-center">Deze verjaardag verwijderen?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBevestigVerwijder(false)}
                    className="flex-1 bg-white text-gray-600 rounded-xl py-2.5 text-[15px] font-medium hover:bg-gray-50 transition-colors"
                  >
                    Annuleer
                  </button>
                  <button
                    onClick={() => { onVerwijder(form.id); onSluit() }}
                    className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-[15px] font-medium hover:bg-red-600 transition-colors"
                  >
                    Verwijder
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setBevestigVerwijder(true)}
                className="w-full bg-red-50 text-red-500 rounded-xl py-3 text-[15px] font-medium hover:bg-red-100 transition-colors"
              >
                Verwijder verjaardag
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
