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

  // Optionele einddatum (inclusief): vervangt de duur-limiet, met een
  // veiligheidscap zodat een verre datum nooit duizenden events genereert.
  // Een einddatum vóór de startdatum levert alleen het startevent op.
  const totDatum = config.totDatum && config.totDatum >= basis.datum ? config.totDatum : null
  const binnenEind = (datum: Date) => !totDatum || toISODatum(datum) <= totDatum

  const maakEvent = (datum: Date): Afspraak => ({
    ...basis,
    id: crypto.randomUUID(),
    datum: toISODatum(datum),
    herhalingGroepId: groepId,
  })

  if (config.type === 'dagelijks') {
    const totaalDagen = totDatum ? 730 : config.duur * 7
    for (let i = 0; i < totaalDagen; i++) {
      const datum = new Date(startDatum)
      datum.setDate(startDatum.getDate() + i)
      if (!binnenEind(datum)) break
      resultaten.push(maakEvent(datum))
    }

  } else if (config.type === 'wekelijks' || config.type === 'tweewekelijks') {
    const interval = config.type === 'tweewekelijks' ? 2 : 1
    const weekStart = getWeekStart(startDatum)
    const gesorteerdeDagen = [...config.dagen].sort((a, b) => a - b)
    const totaalWeken = totDatum ? 104 : config.duur

    for (let week = 0; week < totaalWeken; week += interval) {
      for (const dagIdx of gesorteerdeDagen) {
        const datum = new Date(weekStart)
        datum.setDate(weekStart.getDate() + week * 7 + dagIdx)
        if (datum >= startDatum && binnenEind(datum)) {
          resultaten.push(maakEvent(datum))
        }
      }
    }

  } else if (config.type === 'maandelijks') {
    const totaalMaanden = totDatum ? 24 : config.duur
    for (let i = 0; i < totaalMaanden; i++) {
      const datum = new Date(startDatum)
      datum.setMonth(startDatum.getMonth() + i)
      if (!binnenEind(datum)) break
      resultaten.push(maakEvent(datum))
    }
  }

  // Vangnet: het startevent hoort er altijd in te zitten (bv. einddatum vóór start).
  if (resultaten.length === 0) resultaten.push(maakEvent(startDatum))

  return resultaten.sort((a, b) => a.datum.localeCompare(b.datum))
}
