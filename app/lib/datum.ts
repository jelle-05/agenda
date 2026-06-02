export const NL_MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]
export const NL_MAANDEN_KORT = [
  'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
]
export const NL_DAGEN_KORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
export const NL_DAGEN_LANG = [
  'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag',
]

export function toISODatum(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dag = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dag}`
}

export function isVandaag(d: Date): boolean {
  return toISODatum(d) === toISODatum(new Date())
}

export function isSameDag(a: Date, b: Date): boolean {
  return toISODatum(a) === toISODatum(b)
}

// Returns 0=Ma … 6=Zo
export function getDagIndex(d: Date): number {
  const js = d.getDay()
  return js === 0 ? 6 : js - 1
}

export function getWeekStart(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  r.setDate(d.getDate() - getDagIndex(d))
  return r
}

export function getWeekDagen(d: Date): Date[] {
  const start = getWeekStart(d)
  return Array.from({ length: 7 }, (_, i) => {
    const dag = new Date(start)
    dag.setDate(start.getDate() + i)
    return dag
  })
}

export function getMaandDagen(jaar: number, maand: number): (Date | null)[] {
  const eerste = new Date(jaar, maand, 1)
  const aantalDagen = new Date(jaar, maand + 1, 0).getDate()
  const eersteWeekdag = getDagIndex(eerste)
  const result: (Date | null)[] = []
  for (let i = 0; i < eersteWeekdag; i++) result.push(null)
  for (let i = 1; i <= aantalDagen; i++) result.push(new Date(jaar, maand, i))
  while (result.length % 7 !== 0) result.push(null)
  return result
}

export function formatWeekTitel(d: Date): string {
  const dagen = getWeekDagen(d)
  const start = dagen[0]
  const eind = dagen[6]
  if (start.getMonth() === eind.getMonth()) {
    return `${start.getDate()} – ${eind.getDate()} ${NL_MAANDEN_KORT[start.getMonth()]} ${start.getFullYear()}`
  }
  return `${start.getDate()} ${NL_MAANDEN_KORT[start.getMonth()]} – ${eind.getDate()} ${NL_MAANDEN_KORT[eind.getMonth()]} ${eind.getFullYear()}`
}

export function formatDagTitel(d: Date): string {
  const naam = NL_DAGEN_LANG[getDagIndex(d)]
  return `${naam.charAt(0).toUpperCase() + naam.slice(1)} — ${d.getDate()} ${NL_MAANDEN_KORT[d.getMonth()]} ${d.getFullYear()}`
}

export function tijdNaarMinuten(tijd: string): number {
  const [uur, min] = tijd.split(':').map(Number)
  return uur * 60 + min
}
