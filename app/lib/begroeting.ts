import type { Afspraak } from '@/types'

// Persoonlijke begroeting met dagsamenvatting, getoond in de Sidebar (desktop)
// en onder de dagtitel (mobiel). Bewust subtiel en kort; " · " als separator.
export function begroetingstekst(naam: string, afsprakenVandaag: Afspraak[], nu: Date = new Date()): string {
  const uur = nu.getHours()
  const dagdeel = uur < 12 ? 'Goedemorgen' : uur < 18 ? 'Goedemiddag' : 'Goedenavond'
  const aanhef = naam ? `${dagdeel} ${naam}` : dagdeel

  // Heeldag eerst, daarna op begintijd — de "eerste" afspraak van de dag.
  const gesorteerd = [...afsprakenVandaag].sort((a, b) => {
    if (a.heeldag !== b.heeldag) return a.heeldag ? -1 : 1
    return a.beginTijd.localeCompare(b.beginTijd)
  })

  if (gesorteerd.length === 0) return `${aanhef} · niets gepland vandaag`

  const eerste = gesorteerd[0]
  const wanneer = eerste.heeldag
    ? (gesorteerd.length === 1 ? 'de hele dag' : 'eerste is de hele dag')
    : (gesorteerd.length === 1 ? `om ${eerste.beginTijd}` : `eerste om ${eerste.beginTijd}`)

  const aantal = gesorteerd.length === 1 ? '1 afspraak' : `${gesorteerd.length} afspraken`
  return `${aanhef} · ${aantal} vandaag, ${wanneer}`
}
