export type WeergaveType = 'dag' | 'week' | 'maand' | 'agenda'

export type Label = {
  id: string
  naam: string
  kleur: string
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
}

export type Verjaardag = {
  id: string
  naam: string
  datum: string      // YYYY-MM-DD (volledige datum; jaar bepaalt geboortejaar voor leeftijd)
  leeftijd?: number  // optioneel; leeftijd op `datum`
  notitie?: string
  herinneringMinuten?: number   // -1 = geen, 60 = 1 uur, 1440 = 1 dag van tevoren
  terugkomend: boolean          // elk jaar opnieuw op dezelfde maand/dag
}

export type HerhalingType = 'nooit' | 'dagelijks' | 'wekelijks' | 'tweewekelijks' | 'maandelijks'

export type HerhalingConfig = {
  type: HerhalingType
  dagen: number[]  // 0=Ma … 6=Zo, relevant bij wekelijks/tweewekelijks
  duur: number     // aantal weken (of maanden bij maandelijks)
}

export const HERHALING_LEEG: HerhalingConfig = {
  type: 'nooit',
  dagen: [],
  duur: 4,
}
