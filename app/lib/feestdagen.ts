import type { Afspraak, Label } from '@/types'
import { toISODatum } from './datum'

// Virtueel label voor feestdagen — net als bij verjaardagen wordt dit aan de
// views meegegeven zodat de afgeleide all-day events automatisch paars gekleurd
// worden, zonder dat de view-componenten feestdagen apart hoeven te kennen.
export const FEESTDAG_LABEL_ID = '__feestdag__'
export const FEESTDAG_KLEUR    = '#AF52DE'   // iOS-paars, uniek voor feestdagen
export const FEESTDAG_LABEL: Label = {
  id:    FEESTDAG_LABEL_ID,
  naam:  'Feestdag',
  kleur: FEESTDAG_KLEUR,
}

// Afgeleide kalender-events krijgen een id `fd:<key>:<jaar>`.
export const FEESTDAG_EVENT_PREFIX = 'fd:'

export function isFeestdagEvent(id: string): boolean {
  return id.startsWith(FEESTDAG_EVENT_PREFIX)
}

// Eerste Paasdag (Gregoriaans) volgens het algoritme van Meeus/Jones/Butcher.
// Geeft { maand (1-12), dag }.
export function berekenPasen(jaar: number): { maand: number; dag: number } {
  const a = jaar % 19
  const b = Math.floor(jaar / 100)
  const c = jaar % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const maand = Math.floor((h + l - 7 * m + 114) / 31)   // 3 = maart, 4 = april
  const dag   = ((h + l - 7 * m + 114) % 31) + 1
  return { maand, dag }
}

// Datum n dagen na een gegeven (jaar, maand, dag).
function plusDagen(jaar: number, maand: number, dag: number, n: number): Date {
  return new Date(jaar, maand - 1, dag + n)
}

type FeestdagDef = { key: string; naam: string; datum: Date }

// Officiële Nederlandse feestdagen voor een gegeven jaar.
export function feestdagenVoorJaar(jaar: number): FeestdagDef[] {
  const pasen = berekenPasen(jaar)
  const paasDatum = (offset: number) => plusDagen(jaar, pasen.maand, pasen.dag, offset)

  // Koningsdag: 27 april, maar 26 april als 27 april op zondag valt.
  const koningsdag = new Date(jaar, 3, 27)
  if (koningsdag.getDay() === 0) koningsdag.setDate(26)

  return [
    { key: 'nieuwjaar',       naam: 'Nieuwjaarsdag',      datum: new Date(jaar, 0, 1) },
    { key: 'goedevrijdag',    naam: 'Goede Vrijdag',      datum: paasDatum(-2) },
    { key: 'pasen1',          naam: 'Eerste Paasdag',     datum: paasDatum(0) },
    { key: 'pasen2',          naam: 'Tweede Paasdag',     datum: paasDatum(1) },
    { key: 'koningsdag',      naam: 'Koningsdag',         datum: koningsdag },
    { key: 'bevrijdingsdag',  naam: 'Bevrijdingsdag',     datum: new Date(jaar, 4, 5) },
    { key: 'hemelvaart',      naam: 'Hemelvaartsdag',     datum: paasDatum(39) },
    { key: 'pinksteren1',     naam: 'Eerste Pinksterdag', datum: paasDatum(49) },
    { key: 'pinksteren2',     naam: 'Tweede Pinksterdag', datum: paasDatum(50) },
    { key: 'kerst1',          naam: 'Eerste Kerstdag',    datum: new Date(jaar, 11, 25) },
    { key: 'kerst2',          naam: 'Tweede Kerstdag',    datum: new Date(jaar, 11, 26) },
    { key: 'oudjaar',         naam: 'Oudjaarsdag',        datum: new Date(jaar, 11, 31) },
  ]
}

// Genereer virtuele all-day afspraken voor weergave in de kalender, voor een
// ruim jaarbereik rond `peiljaar` (dekt ver navigeren én weken die over de
// jaarwisseling lopen). Nooit opgeslagen — puur afgeleid, dus geen duplicaten.
export function genereerFeestdagAfspraken(peiljaar = new Date().getFullYear()): Afspraak[] {
  const events: Afspraak[] = []
  for (let jaar = peiljaar - 2; jaar <= peiljaar + 6; jaar++) {
    for (const fd of feestdagenVoorJaar(jaar)) {
      events.push({
        id:        `${FEESTDAG_EVENT_PREFIX}${fd.key}:${jaar}`,
        titel:     fd.naam,
        datum:     toISODatum(fd.datum),
        beginTijd: '00:00',
        eindTijd:  '23:59',
        heeldag:   true,
        labelIds:  [FEESTDAG_LABEL_ID],
      })
    }
  }
  return events
}
