export type WeergaveType = 'dag' | 'week' | 'maand' | 'agenda'

// Weergavefilters: bepalen welke itemtypes in de kalender getoond worden.
export type Filters = {
  events: boolean
  verjaardagen: boolean
  feestdagen: boolean
}

export type Label = {
  id: string
  naam: string
  kleur: string              // accent (rand/stip) + fallback voor achtergrond/tekst
  achtergrondKleur?: string  // optioneel: eigen achtergrondkleur voor events
  tekstKleur?: string        // optioneel: eigen tekstkleur voor events
}

export type Afspraak = {
  id: string
  titel: string
  datum: string      // YYYY-MM-DD
  beginTijd: string  // HH:MM
  eindTijd: string   // HH:MM
  heeldag: boolean
  labelIds: string[]
  notitie?: string
  locatie?: string
  herinneringMinuten?: number   // -1 = geen, 0 = bij aanvang, N = N minuten van tevoren
  herhalingGroepId?: string     // koppelt herhalende instanties aan elkaar
  favoriet?: boolean            // gemarkeerd voor de Countdowns-lijst (per occurrence)
}

export type Verjaardag = {
  id: string
  naam: string
  dag: number        // 1-31, verplicht
  maand: number      // 1-12, verplicht
  geboortejaar?: string   // optioneel, vrije tekst (bv. "1998", "onbekend", "ongeveer 30"); leeftijd wordt berekend als er een jaartal in staat
  notitie?: string
  herinneringMinuten?: number   // -1 = geen, 60 = 1 uur, 1440 = 1 dag, 10080 = 1 week van tevoren
  terugkomend: boolean          // elk jaar opnieuw op dezelfde maand/dag
  favoriet?: boolean            // gemarkeerd voor de Countdowns-lijst
}

export type HerhalingType = 'nooit' | 'dagelijks' | 'wekelijks' | 'tweewekelijks' | 'maandelijks'

export type HerhalingConfig = {
  type: HerhalingType
  dagen: number[]   // 0=Ma … 6=Zo, relevant bij wekelijks/tweewekelijks
  duur: number      // aantal weken (of maanden bij maandelijks)
  totDatum?: string // 'YYYY-MM-DD', inclusief; indien gezet vervangt dit `duur` (met veiligheidscap)
}

export const HERHALING_LEEG: HerhalingConfig = {
  type: 'nooit',
  dagen: [],
  duur: 4,
}
