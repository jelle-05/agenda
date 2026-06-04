'use client'

import { useState, useEffect } from 'react'
import type { Afspraak, Label, HerhalingConfig, HerhalingType } from '@/types'
import { HERHALING_LEEG } from '@/types'
import { toISODatum, getDagIndex } from '@/lib/datum'
import { labelAchtergrond } from '@/lib/kleuren'

const NL_KORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

type BewerkScope = 'enkel' | 'alles'

interface Props {
  open: boolean
  afspraak?: Afspraak | null
  labels: Label[]
  initiaalDatum: Date
  initiaalTijd?: string
  onOpslaan: (afspraak: Afspraak, herhaling: HerhalingConfig, scope?: BewerkScope) => void
  onVerwijder: (id: string, alleHerhalingen?: boolean) => void
  onSluit: () => void
}

function leeg(datum: string, beginTijd = '09:00'): Afspraak {
  const [h, m] = beginTijd.split(':').map(Number)
  const eindMin = h * 60 + m + 60
  const eindTijd = `${String(Math.floor(eindMin / 60) % 24).padStart(2, '0')}:${String(eindMin % 60).padStart(2, '0')}`
  return { id: '', titel: '', datum, beginTijd, eindTijd, heeldag: false, labelIds: [] }
}

export default function AfspraakFormulier({ open, afspraak, labels, initiaalDatum, initiaalTijd, onOpslaan, onVerwijder, onSluit }: Props) {
  const [form, setForm]           = useState<Afspraak>(() => leeg(toISODatum(initiaalDatum), initiaalTijd))
  const [herhaling, setHerhaling] = useState<HerhalingConfig>(HERHALING_LEEG)
  const [bewerkScope, setBewerkScope] = useState<BewerkScope>('enkel')

  useEffect(() => {
    if (open) {
      // Bewuste form-reset bij het openen van de modal; de component blijft gemount
      // (key-based reset zou het open/dicht-gedrag veranderen).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(afspraak ? { ...afspraak } : leeg(toISODatum(initiaalDatum), initiaalTijd))
      setHerhaling(HERHALING_LEEG)
      setBewerkScope('enkel')
    }
  }, [open, afspraak, initiaalDatum, initiaalTijd])

  if (!open) return null

  const isNieuw = !form.id
  const isHerhalend = !!form.herhalingGroepId

  function opslaan() {
    if (!form.titel.trim()) return
    onOpslaan(
      { ...form, id: form.id || crypto.randomUUID(), titel: form.titel.trim() },
      herhaling,
      (!isNieuw && isHerhalend) ? bewerkScope : undefined,
    )
  }

  function toggleLabel(id: string) {
    setForm(f => ({
      ...f,
      labelIds: f.labelIds.includes(id) ? f.labelIds.filter(l => l !== id) : [...f.labelIds, id],
    }))
  }

  function toggleDag(idx: number) {
    setHerhaling(h => ({
      ...h,
      dagen: h.dagen.includes(idx) ? h.dagen.filter(d => d !== idx) : [...h.dagen, idx],
    }))
  }

  function setHerhalingType(type: HerhalingType) {
    // Selecteer automatisch de dag van de huidige datum bij wekelijks/tweewekelijks
    const [y, m, d] = form.datum.split('-').map(Number)
    const dagIdx = getDagIndex(new Date(y, m - 1, d))
    setHerhaling(h => ({
      ...h,
      type,
      dagen: (type === 'wekelijks' || type === 'tweewekelijks') ? [dagIdx] : [],
    }))
  }

  const toonDagKiezer = herhaling.type === 'wekelijks' || herhaling.type === 'tweewekelijks'
  const duuretiket    = herhaling.type === 'maandelijks' ? 'maanden' : 'weken'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <button onClick={onSluit} className="text-[#007AFF] text-sm font-medium w-20">
            Annuleer
          </button>
          <h2 className="text-[15px] font-semibold text-gray-900">
            {isNieuw ? 'Nieuwe afspraak' : 'Bewerk afspraak'}
          </h2>
          <button
            onClick={opslaan}
            disabled={!form.titel.trim()}
            className="text-[#007AFF] text-sm font-semibold w-20 text-right disabled:opacity-40"
          >
            {isNieuw ? 'Toevoegen' : 'Gereed'}
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* Titel */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <input
              type="text"
              value={form.titel}
              onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
              placeholder="Titel"
              className="w-full text-[17px] font-medium placeholder:text-gray-300 outline-none bg-transparent"
              onKeyDown={e => e.key === 'Enter' && opslaan()}
            />
          </div>

          {/* Datum & tijden */}
          <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[15px] text-gray-800">Hele dag</span>
              <button
                onClick={() => setForm(f => ({ ...f, heeldag: !f.heeldag }))}
                className={['relative w-12 h-7 rounded-full transition-colors', form.heeldag ? 'bg-[#34C759]' : 'bg-gray-300'].join(' ')}
                aria-label="Hele dag"
              >
                <span className={['absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-all', form.heeldag ? 'left-[26px]' : 'left-[3px]'].join(' ')} />
              </button>
            </div>

            {!(isHerhalend && !isNieuw && bewerkScope === 'alles') && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[15px] text-gray-800">Datum</span>
                <input
                  type="date"
                  value={form.datum}
                  onChange={e => setForm(f => ({ ...f, datum: e.target.value }))}
                  className="text-[15px] text-[#007AFF] outline-none bg-transparent"
                />
              </div>
            )}

            {!form.heeldag && (
              <>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[15px] text-gray-800">Begin</span>
                  <input type="time" value={form.beginTijd}
                    onChange={e => setForm(f => ({ ...f, beginTijd: e.target.value }))}
                    className="text-[15px] text-[#007AFF] outline-none bg-transparent"
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[15px] text-gray-800">Eind</span>
                  <input type="time" value={form.eindTijd}
                    onChange={e => setForm(f => ({ ...f, eindTijd: e.target.value }))}
                    className="text-[15px] text-[#007AFF] outline-none bg-transparent"
                  />
                </div>
              </>
            )}
          </div>

          {/* Herhaling — alleen bij nieuwe events */}
          {isNieuw && (
            <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
              {/* Type */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[15px] text-gray-800">Herhalen</span>
                <select
                  value={herhaling.type}
                  onChange={e => setHerhalingType(e.target.value as HerhalingType)}
                  className="text-[15px] text-[#007AFF] outline-none bg-transparent text-right"
                >
                  <option value="nooit">Nooit</option>
                  <option value="dagelijks">Elke dag</option>
                  <option value="wekelijks">Elke week</option>
                  <option value="tweewekelijks">Elke 2 weken</option>
                  <option value="maandelijks">Elke maand</option>
                </select>
              </div>

              {/* Dag-kiezer (wekelijks / tweewekelijks) */}
              {toonDagKiezer && (
                <div className="px-4 py-3">
                  <p className="text-[13px] text-gray-400 mb-2 uppercase tracking-wide font-semibold">Dagen</p>
                  <div className="flex gap-1.5">
                    {NL_KORT.map((dag, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleDag(idx)}
                        className={[
                          'flex-1 py-1.5 rounded-lg text-[12px] font-semibold transition-colors',
                          herhaling.dagen.includes(idx)
                            ? 'bg-[#007AFF] text-white'
                            : 'bg-gray-200 text-gray-500',
                        ].join(' ')}
                      >
                        {dag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Duur */}
              {herhaling.type !== 'nooit' && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[15px] text-gray-800">Eindigt na</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={herhaling.type === 'maandelijks' ? 24 : 52}
                      value={herhaling.duur}
                      onChange={e => setHerhaling(h => ({ ...h, duur: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-14 text-[15px] text-[#007AFF] outline-none bg-gray-100 rounded-lg px-2 py-1 text-center"
                    />
                    <span className="text-[15px] text-gray-500">{duuretiket}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scope-kiezer voor bestaand herhalend event */}
          {!isNieuw && isHerhalend && (
            <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
              <div className="px-4 py-3">
                <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-2.5">Bewerk</p>
                <div className="flex bg-gray-200 rounded-lg p-0.5">
                  {(['enkel', 'alles'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setBewerkScope(s)}
                      className={[
                        'flex-1 py-1.5 rounded-md text-[13px] font-medium transition-all',
                        bewerkScope === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500',
                      ].join(' ')}
                    >
                      {s === 'enkel' ? 'Alleen dit event' : 'De hele reeks'}
                    </button>
                  ))}
                </div>
              </div>
              {bewerkScope === 'alles' && (
                <div className="px-4 py-2">
                  <p className="text-[12px] text-gray-400">De datum van elke herhaling blijft ongewijzigd.</p>
                </div>
              )}
            </div>
          )}

          {/* Herinnering */}
          {!form.heeldag && (
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[15px] text-gray-800">Herinnering</span>
                <select
                  value={form.herinneringMinuten ?? -1}
                  onChange={e => setForm(f => ({ ...f, herinneringMinuten: parseInt(e.target.value) }))}
                  className="text-[15px] text-[#007AFF] outline-none bg-transparent text-right"
                >
                  <option value={-1}>Geen</option>
                  <option value={0}>Bij aanvang</option>
                  <option value={5}>5 min van tevoren</option>
                  <option value={15}>15 min van tevoren</option>
                  <option value={30}>30 min van tevoren</option>
                  <option value={60}>1 uur van tevoren</option>
                  <option value={120}>2 uur van tevoren</option>
                  <option value={1440}>1 dag van tevoren</option>
                </select>
              </div>
            </div>
          )}

          {/* Labels */}
          {labels.length > 0 && (
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold mb-2.5">Labels</p>
              <div className="flex flex-wrap gap-2">
                {labels.map(label => {
                  const gekozen = form.labelIds.includes(label.id)
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className={['flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border-2 transition-all', gekozen ? '' : 'opacity-50'].join(' ')}
                      style={{
                        backgroundColor: labelAchtergrond(label.kleur, gekozen ? 0.18 : 0.08),
                        color: label.kleur,
                        borderColor: gekozen ? label.kleur : 'transparent',
                      }}
                    >
                      {label.naam}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Locatie */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <input
              type="text"
              value={form.locatie ?? ''}
              onChange={e => setForm(f => ({ ...f, locatie: e.target.value || undefined }))}
              placeholder="Locatie"
              className="w-full text-[15px] outline-none bg-transparent placeholder:text-gray-400"
            />
          </div>

          {/* Notities */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <textarea
              value={form.notitie ?? ''}
              onChange={e => setForm(f => ({ ...f, notitie: e.target.value || undefined }))}
              placeholder="Notities"
              rows={3}
              className="w-full text-[15px] outline-none bg-transparent placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Verwijder */}
          {!isNieuw && (
            <div className={['flex gap-2', isHerhalend ? '' : ''].join(' ')}>
              <button
                onClick={() => { onVerwijder(form.id, false); onSluit() }}
                className="flex-1 bg-red-50 text-red-500 rounded-xl py-3 text-[15px] font-medium hover:bg-red-100 transition-colors"
              >
                {isHerhalend ? 'Dit event' : 'Verwijder afspraak'}
              </button>
              {isHerhalend && (
                <button
                  onClick={() => { onVerwijder(form.id, true); onSluit() }}
                  className="flex-1 bg-red-50 text-red-500 rounded-xl py-3 text-[15px] font-medium hover:bg-red-100 transition-colors"
                >
                  Alle herhalingen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
