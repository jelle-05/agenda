import type { Afspraak, Label, Verjaardag } from '@/types'
import { migreerDatumVelden } from './verjaardagen'

const SLEUTEL_AFSPRAKEN    = 'agenda_afspraken'
const SLEUTEL_LABELS       = 'agenda_labels'
const SLEUTEL_VERJAARDAGEN = 'agenda_verjaardagen'

export function laadAfspraken(): Afspraak[] {
  const data = localStorage.getItem(SLEUTEL_AFSPRAKEN)
  if (!data) return []
  return JSON.parse(data) as Afspraak[]
}

export function slaAfspraakOp(afspraak: Afspraak, alle: Afspraak[]): Afspraak[] {
  const idx = alle.findIndex(a => a.id === afspraak.id)
  const nieuw = idx >= 0 ? alle.map((a, i) => (i === idx ? afspraak : a)) : [...alle, afspraak]
  localStorage.setItem(SLEUTEL_AFSPRAKEN, JSON.stringify(nieuw))
  return nieuw
}

export function verwijderAfspraak(id: string, alle: Afspraak[]): Afspraak[] {
  const nieuw = alle.filter(a => a.id !== id)
  localStorage.setItem(SLEUTEL_AFSPRAKEN, JSON.stringify(nieuw))
  return nieuw
}

export function slaAlleAfsprakenOp(alle: Afspraak[]): void {
  localStorage.setItem(SLEUTEL_AFSPRAKEN, JSON.stringify(alle))
}

export function slaAlleLabelsOp(alle: Label[]): void {
  localStorage.setItem(SLEUTEL_LABELS, JSON.stringify(alle))
}

export function laadLabels(): Label[] {
  const data = localStorage.getItem(SLEUTEL_LABELS)
  if (!data) return []
  return JSON.parse(data) as Label[]
}

export function slaLabelOp(label: Label, alle: Label[]): Label[] {
  const idx = alle.findIndex(l => l.id === label.id)
  const nieuw = idx >= 0 ? alle.map((l, i) => (i === idx ? label : l)) : [...alle, label]
  localStorage.setItem(SLEUTEL_LABELS, JSON.stringify(nieuw))
  return nieuw
}

export function verwijderLabel(id: string, alle: Label[]): Label[] {
  const nieuw = alle.filter(l => l.id !== id)
  localStorage.setItem(SLEUTEL_LABELS, JSON.stringify(nieuw))
  return nieuw
}

// ── Verjaardagen ───────────────────────────────────────────────────────────────

export function laadVerjaardagen(): Verjaardag[] {
  const data = localStorage.getItem(SLEUTEL_VERJAARDAGEN)
  if (!data) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ruw = JSON.parse(data) as any[]
  // Migreer eventueel oude gecachte vorm (datum/leeftijd) naar dag/maand/geboortejaar.
  return ruw.map(r => {
    const { dag, maand, geboortejaar } = migreerDatumVelden(r)
    return {
      id: r.id,
      naam: r.naam,
      dag,
      maand,
      geboortejaar,
      notitie: r.notitie ?? undefined,
      herinneringMinuten: r.herinneringMinuten ?? -1,
      terugkomend: r.terugkomend ?? true,
    } as Verjaardag
  })
}

export function slaVerjaardagOp(verjaardag: Verjaardag, alle: Verjaardag[]): Verjaardag[] {
  const idx = alle.findIndex(v => v.id === verjaardag.id)
  const nieuw = idx >= 0 ? alle.map((v, i) => (i === idx ? verjaardag : v)) : [...alle, verjaardag]
  localStorage.setItem(SLEUTEL_VERJAARDAGEN, JSON.stringify(nieuw))
  return nieuw
}

export function verwijderVerjaardag(id: string, alle: Verjaardag[]): Verjaardag[] {
  const nieuw = alle.filter(v => v.id !== id)
  localStorage.setItem(SLEUTEL_VERJAARDAGEN, JSON.stringify(nieuw))
  return nieuw
}

export function slaAlleVerjaardagenOp(alle: Verjaardag[]): void {
  localStorage.setItem(SLEUTEL_VERJAARDAGEN, JSON.stringify(alle))
}
