import type { WeergaveType } from '@/types'

// Persoonlijke voorkeuren, opgeslagen in user_metadata.voorkeuren via
// supabase.auth.updateUser() (zelfde patroon als de profielfoto) — synct
// daardoor via het account, zonder DB-migratie of API-route.

export type StartWeergave = 'auto' | 'laatst' | WeergaveType
export type DagoverzichtKanaal = 'telegram' | 'email'

export interface Voorkeuren {
  startWeergave: StartWeergave     // 'auto' = week op desktop / dag op mobiel
  standaardHerinnering: number     // minuten van tevoren; -1 = geen
  standaardDuur: number            // duur van nieuwe events in minuten
  naam: string                     // begroetingsnaam voor het dagoverzicht; '' = geen
  dagoverzicht: boolean            // elke ochtend een kort overzicht ontvangen
  dagoverzichtKanaal: DagoverzichtKanaal
  dagoverzichtTijd: string         // 'HH:MM', verstuurd door de cron (elke minuut)
}

export const STANDAARD_VOORKEUREN: Voorkeuren = {
  startWeergave: 'auto',
  standaardHerinnering: -1,
  standaardDuur: 60,
  naam: '',
  dagoverzicht: false,
  dagoverzichtKanaal: 'telegram',
  dagoverzichtTijd: '07:00',
}

const WEERGAVEN: WeergaveType[] = ['dag', 'week', 'maand', 'agenda']

// Leest voorkeuren uit user_metadata; valideert per veld en valt per veld
// terug op de default, zodat ontbrekende of corrupte data nooit breekt.
export function leesVoorkeuren(metadata: unknown): Voorkeuren {
  const ruw = (metadata as { voorkeuren?: Partial<Voorkeuren> } | null | undefined)?.voorkeuren
  const start = ruw?.startWeergave
  const herinnering = ruw?.standaardHerinnering
  const duur = ruw?.standaardDuur
  const naam = ruw?.naam
  const kanaal = ruw?.dagoverzichtKanaal
  const tijd = ruw?.dagoverzichtTijd
  return {
    naam: typeof naam === 'string' ? naam.trim().slice(0, 40) : STANDAARD_VOORKEUREN.naam,
    dagoverzicht: typeof ruw?.dagoverzicht === 'boolean'
      ? ruw.dagoverzicht
      : STANDAARD_VOORKEUREN.dagoverzicht,
    dagoverzichtKanaal: kanaal === 'telegram' || kanaal === 'email'
      ? kanaal
      : STANDAARD_VOORKEUREN.dagoverzichtKanaal,
    dagoverzichtTijd: typeof tijd === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(tijd)
      ? tijd
      : STANDAARD_VOORKEUREN.dagoverzichtTijd,
    startWeergave:
      start === 'auto' || start === 'laatst' || WEERGAVEN.includes(start as WeergaveType)
        ? (start as StartWeergave)
        : STANDAARD_VOORKEUREN.startWeergave,
    standaardHerinnering:
      typeof herinnering === 'number' && Number.isFinite(herinnering) && herinnering >= -1
        ? herinnering
        : STANDAARD_VOORKEUREN.standaardHerinnering,
    standaardDuur:
      typeof duur === 'number' && Number.isFinite(duur) && duur > 0 && duur <= 24 * 60
        ? duur
        : STANDAARD_VOORKEUREN.standaardDuur,
  }
}
