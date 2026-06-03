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

// Leid dag/maand/geboortejaar af uit zowel het nieuwe model (dag/maand/
// geboortejaar) als het oude model (datum 'YYYY-MM-DD' + leeftijd). Gebruikt
// bij het inlezen vanuit Supabase én localStorage, zodat bestaande data blijft
// werken zonder handmatige migratie.
export function migreerDatumVelden(bron: {
  dag?: number | null
  maand?: number | null
  geboortejaar?: number | null
  datum?: string | null
  leeftijd?: number | null
}): { dag: number; maand: number; geboortejaar?: number } {
  if (bron.dag != null && bron.maand != null) {
    return { dag: bron.dag, maand: bron.maand, geboortejaar: bron.geboortejaar ?? undefined }
  }
  if (bron.datum) {
    const [y, m, d] = bron.datum.split('-').map(Number)
    return { dag: d, maand: m, geboortejaar: bron.leeftijd != null ? y - bron.leeftijd : undefined }
  }
  const nu = new Date()
  return { dag: nu.getDate(), maand: nu.getMonth() + 1 }
}

// Leeftijd die iemand wordt in `jaar` (op de verjaardag in dat jaar).
export function leeftijdInJaar(v: Verjaardag, jaar: number): number | null {
  if (v.geboortejaar == null) return null
  return jaar - v.geboortejaar
}

// Huidige leeftijd, rekening houdend met of de verjaardag dit jaar al geweest is.
export function berekenLeeftijd(v: Verjaardag, ref = new Date()): number | null {
  if (v.geboortejaar == null) return null
  let leeftijd = ref.getFullYear() - v.geboortejaar
  const refMaand = ref.getMonth() + 1
  const nogNietGeweest = refMaand < v.maand || (refMaand === v.maand && ref.getDate() < v.dag)
  if (nogNietGeweest) leeftijd -= 1
  return leeftijd
}

// Aantal dagen in een maand (1-12), met schrikkeljaar als jaar bekend is.
export function dagenInMaand(maand: number, jaar?: number): number {
  if (maand === 2) {
    const j = jaar ?? 2000   // 2000 is schrikkeljaar → sta 29 feb toe als jaar onbekend
    const schrikkel = (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0
    return schrikkel ? 29 : 28
  }
  return [4, 6, 9, 11].includes(maand) ? 30 : 31
}

// Validatie voor het formulier: is deze dag geldig binnen de maand (+ jaar)?
export function geldigeDag(dag: number, maand: number, jaar?: number): boolean {
  if (!Number.isInteger(dag) || !Number.isInteger(maand)) return false
  if (maand < 1 || maand > 12) return false
  if (dag < 1) return false
  return dag <= dagenInMaand(maand, jaar)
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
    const jaren = v.terugkomend
      ? Array.from({ length: totJaar - vanJaar + 1 }, (_, i) => vanJaar + i)
      : [eerstvolgendeVerjaardag(v, new Date()).getFullYear()]

    for (const jaar of jaren) {
      const datum = `${jaar}-${String(v.maand).padStart(2, '0')}-${String(v.dag).padStart(2, '0')}`
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
  let occ = new Date(ref.getFullYear(), v.maand - 1, v.dag, VERJAARDAG_ANKER_UUR, 0, 0, 0)
  // Meer dan ~1,5 dag voorbij → pak de editie van volgend jaar.
  if (occ.getTime() < ref.getTime() - 36 * 3600_000) {
    occ = new Date(ref.getFullYear() + 1, v.maand - 1, v.dag, VERJAARDAG_ANKER_UUR, 0, 0, 0)
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
export const MND_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
export const MND_LANG = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]
export function formatVerjaardagDatum(dag: number, maand: number): string {
  return `${dag} ${MND_KORT[maand - 1]}`
}
