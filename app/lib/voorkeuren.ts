import type { WeergaveType } from '@/types'

// Persoonlijke voorkeuren, opgeslagen in user_metadata.voorkeuren via
// supabase.auth.updateUser() (zelfde patroon als de profielfoto) — synct
// daardoor via het account, zonder DB-migratie of API-route.

export type StartWeergave = 'auto' | 'laatst' | WeergaveType

export interface Voorkeuren {
  startWeergave: StartWeergave     // 'auto' = week op desktop / dag op mobiel
  standaardHerinnering: number     // minuten van tevoren; -1 = geen
  standaardDuur: number            // duur van nieuwe events in minuten
}

export const STANDAARD_VOORKEUREN: Voorkeuren = {
  startWeergave: 'auto',
  standaardHerinnering: -1,
  standaardDuur: 60,
}

const WEERGAVEN: WeergaveType[] = ['dag', 'week', 'maand', 'agenda']

// Leest voorkeuren uit user_metadata; valideert per veld en valt per veld
// terug op de default, zodat ontbrekende of corrupte data nooit breekt.
export function leesVoorkeuren(metadata: unknown): Voorkeuren {
  const ruw = (metadata as { voorkeuren?: Partial<Voorkeuren> } | null | undefined)?.voorkeuren
  const start = ruw?.startWeergave
  const herinnering = ruw?.standaardHerinnering
  const duur = ruw?.standaardDuur
  return {
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
