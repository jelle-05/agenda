import type { Afspraak } from '@/types'
import { tijdNaarMinuten } from './datum'

// Stapelvolgorde voor getimede events die elkaar mogen overlappen: sorteer op
// begintijd, en bij gelijke start de langste eerst. Zo worden langere events
// éérst (achter) gerenderd en kortere events daarna (bovenop) — die blijven
// zichtbaar en tappable wanneer ze binnen een langer event vallen.
export function stapelVolgorde(a: Afspraak, b: Afspraak): number {
  const startA = tijdNaarMinuten(a.beginTijd)
  const startB = tijdNaarMinuten(b.beginTijd)
  if (startA !== startB) return startA - startB
  const duurA = tijdNaarMinuten(a.eindTijd) - startA
  const duurB = tijdNaarMinuten(b.eindTijd) - startB
  return duurB - duurA
}
