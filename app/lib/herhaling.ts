import type { Afspraak, HerhalingConfig } from '@/types'
import { toISODatum, getWeekStart } from './datum'

export function genereerHerhalingen(basis: Afspraak, config: HerhalingConfig): Afspraak[] {
  if (config.type === 'nooit') {
    return [{ ...basis, id: basis.id || crypto.randomUUID() }]
  }

  const groepId = crypto.randomUUID()
  const resultaten: Afspraak[] = []

  const [y, m, d] = basis.datum.split('-').map(Number)
  const startDatum = new Date(y, m - 1, d)

  const maakEvent = (datum: Date): Afspraak => ({
    ...basis,
    id: crypto.randomUUID(),
    datum: toISODatum(datum),
    herhalingGroepId: groepId,
  })

  if (config.type === 'dagelijks') {
    const totaalDagen = config.duur * 7
    for (let i = 0; i < totaalDagen; i++) {
      const datum = new Date(startDatum)
      datum.setDate(startDatum.getDate() + i)
      resultaten.push(maakEvent(datum))
    }

  } else if (config.type === 'wekelijks' || config.type === 'tweewekelijks') {
    const interval = config.type === 'tweewekelijks' ? 2 : 1
    const weekStart = getWeekStart(startDatum)
    const gesorteerdeDagen = [...config.dagen].sort((a, b) => a - b)

    for (let week = 0; week < config.duur; week += interval) {
      for (const dagIdx of gesorteerdeDagen) {
        const datum = new Date(weekStart)
        datum.setDate(weekStart.getDate() + week * 7 + dagIdx)
        if (datum >= startDatum) {
          resultaten.push(maakEvent(datum))
        }
      }
    }

  } else if (config.type === 'maandelijks') {
    for (let i = 0; i < config.duur; i++) {
      const datum = new Date(startDatum)
      datum.setMonth(startDatum.getMonth() + i)
      resultaten.push(maakEvent(datum))
    }
  }

  return resultaten.sort((a, b) => a.datum.localeCompare(b.datum))
}
