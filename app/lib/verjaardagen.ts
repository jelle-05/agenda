import type { Afspraak, Label, Verjaardag } from '@/types'

// Virtueel label voor verjaardagen — wordt aan de views meegegeven zodat de
// afgeleide all-day events automatisch groen gekleurd worden, zonder dat de
// view-componenten verjaardagen apart hoeven te kennen.
export const VERJAARDAG_LABEL_ID = '__verjaardag__'
export const VERJAARDAG_KLEUR    = '#34C759'   // iOS-groen, uniek voor verjaardagen
export const VERJAARDAG_LABEL: Label = {
  id:    VERJAARDAG_LABEL_ID,
  naam:  'Verjaardag',
  kleur: VERJAARDAG_KLEUR,
}

// Tijdstip waarop een verjaardag "plaatsvindt" voor reminder-berekening.
export const VERJAARDAG_ANKER_UUR = 9   // 09:00

// Een afgeleid kalender-event heeft een id `vj:<verjaardagId>:<jaar>` zodat
// AgendaApp een klik kan herleiden naar de juiste verjaardag.
export const VERJAARDAG_EVENT_PREFIX = 'vj:'

export function isVerjaardagEvent(id: string): boolean {
  return id.startsWith(VERJAARDAG_EVENT_PREFIX)
}

export function verjaardagIdUitEvent(eventId: string): string | null {
  if (!isVerjaardagEvent(eventId)) return null
  return eventId.slice(VERJAARDAG_EVENT_PREFIX.length, eventId.lastIndexOf(':')) || null
}

// Leeftijd die iemand wordt in `jaar`, afgeleid van de leeftijd op `datum`.
export function leeftijdInJaar(v: Verjaardag, jaar: number): number | null {
  if (v.leeftijd == null) return null
  const geboortejaar = Number(v.datum.slice(0, 4)) - v.leeftijd
  return jaar - geboortejaar
}

// Compacte titel voor de kalender, bv. "🎂 Jan".
export function verjaardagTitel(naam: string): string {
  return `🎂 ${naam}`
}

// Genereer virtuele all-day afspraken voor weergave in de kalender.
// Terugkomende verjaardagen krijgen een instantie per jaar binnen een ruim
// bereik rond nu; eenmalige verjaardagen alleen op hun eigen datum.
export function genereerVerjaardagAfspraken(
  verjaardagen: Verjaardag[],
  peiljaar = new Date().getFullYear(),
): Afspraak[] {
  const events: Afspraak[] = []
  const vanJaar = peiljaar - 2
  const totJaar = peiljaar + 6

  for (const v of verjaardagen) {
    const [vy, vm, vd] = v.datum.split('-').map(Number)
    const jaren = v.terugkomend
      ? Array.from({ length: totJaar - vanJaar + 1 }, (_, i) => vanJaar + i)
      : [vy]

    for (const jaar of jaren) {
      const datum = `${jaar}-${String(vm).padStart(2, '0')}-${String(vd).padStart(2, '0')}`
      events.push({
        id:        `${VERJAARDAG_EVENT_PREFIX}${v.id}:${jaar}`,
        titel:     verjaardagTitel(v.naam),
        datum,
        beginTijd: '00:00',
        eindTijd:  '23:59',
        heeldag:   true,
        labelIds:  [VERJAARDAG_LABEL_ID],
        notitie:   v.notitie,
      })
    }
  }

  return events
}

// Eerstvolgende verjaardags-moment (verankerd op 09:00) ten opzichte van `ref`.
// Voor terugkomende verjaardagen: dit jaar, of volgend jaar als die al ruim
// voorbij is. Voor eenmalige: de opgeslagen datum.
export function eerstvolgendeVerjaardag(v: Verjaardag, ref: Date): Date {
  const [vy, vm, vd] = v.datum.split('-').map(Number)
  if (!v.terugkomend) return new Date(vy, vm - 1, vd, VERJAARDAG_ANKER_UUR, 0, 0, 0)

  let occ = new Date(ref.getFullYear(), vm - 1, vd, VERJAARDAG_ANKER_UUR, 0, 0, 0)
  // Meer dan ~1,5 dag voorbij → pak de editie van volgend jaar.
  if (occ.getTime() < ref.getTime() - 36 * 3600_000) {
    occ = new Date(ref.getFullYear() + 1, vm - 1, vd, VERJAARDAG_ANKER_UUR, 0, 0, 0)
  }
  return occ
}

// Sorteer verjaardagen op eerstvolgende datum (voor het overzicht).
export function sorteerOpEerstvolgende(verjaardagen: Verjaardag[], ref = new Date()): Verjaardag[] {
  return [...verjaardagen].sort(
    (a, b) => eerstvolgendeVerjaardag(a, ref).getTime() - eerstvolgendeVerjaardag(b, ref).getTime(),
  )
}

// Korte datumweergave "10 apr" voor het overzicht.
const MND_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
export function formatVerjaardagDatum(datum: string): string {
  const [, m, d] = datum.split('-').map(Number)
  return `${d} ${MND_KORT[m - 1]}`
}
