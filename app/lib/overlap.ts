import type { Afspraak } from '@/types'
import { tijdNaarMinuten } from './datum'

export type OverlapInfo = { kolom: number; kolommen: number }

// Bereken voor een set getimede afspraken (één dag) hoe overlappende events
// naast elkaar in kolommen geplaatst worden. Geeft per event-id de toegewezen
// `kolom` (0-based) en het totaal aantal `kolommen` in zijn overlap-cluster.
//
// Klassieke interval-kolompacking: sorteer op begintijd (dan eindtijd), groepeer
// transitief overlappende events in clusters en wijs binnen een cluster greedy
// de eerste vrije kolom toe.
export function berekenOverlap(afspraken: Afspraak[]): Record<string, OverlapInfo> {
  const items = afspraken
    .map(a => {
      const start = tijdNaarMinuten(a.beginTijd)
      const eind  = Math.max(tijdNaarMinuten(a.eindTijd), start + 1)
      return { id: a.id, start, eind }
    })
    .sort((a, b) => a.start - b.start || a.eind - b.eind)

  const result: Record<string, OverlapInfo> = {}
  let cluster: typeof items = []
  let clusterEind = -1

  function flush() {
    if (cluster.length === 0) return
    const kolomEinde: number[] = []          // laatste eindtijd per kolom
    for (const it of cluster) {
      let k = kolomEinde.findIndex(e => e <= it.start)
      if (k === -1) { k = kolomEinde.length; kolomEinde.push(it.eind) }
      else kolomEinde[k] = it.eind
      result[it.id] = { kolom: k, kolommen: 0 }   // kolommen later invullen
    }
    const kolommen = kolomEinde.length
    for (const it of cluster) result[it.id].kolommen = kolommen
    cluster = []
    clusterEind = -1
  }

  for (const it of items) {
    if (cluster.length > 0 && it.start >= clusterEind) flush()
    cluster.push(it)
    clusterEind = Math.max(clusterEind, it.eind)
  }
  flush()

  return result
}
