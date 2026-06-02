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
  herinneringMinuten?: number  // -1 = geen, 0 = bij aanvang, anders N minuten van tevoren
}
