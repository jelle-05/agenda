import type { Afspraak, Label } from '@/types'
import { mockAfspraken, mockLabels } from './mockData'

const SLEUTEL_AFSPRAKEN = 'agenda_afspraken'
const SLEUTEL_LABELS    = 'agenda_labels'

export function laadAfspraken(): Afspraak[] {
  const data = localStorage.getItem(SLEUTEL_AFSPRAKEN)
  if (!data) {
    const seeded = [...mockAfspraken]
    localStorage.setItem(SLEUTEL_AFSPRAKEN, JSON.stringify(seeded))
    return seeded
  }
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
  if (!data) {
    const seeded = [...mockLabels]
    localStorage.setItem(SLEUTEL_LABELS, JSON.stringify(seeded))
    return seeded
  }
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
