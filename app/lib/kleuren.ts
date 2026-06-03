import type { Label } from '@/types'

export function labelAchtergrond(kleur: string, opacity = 0.15): string {
  const r = parseInt(kleur.slice(1, 3), 16)
  const g = parseInt(kleur.slice(3, 5), 16)
  const b = parseInt(kleur.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// Bepaalt de drie kleuren voor het renderen van een event op basis van zijn label.
// - accent: rand/stip (en fallback). Altijd `label.kleur` of de standaard-grijze kleur.
// - achtergrond: eigen `achtergrondKleur` van het label, anders een lichte tint van accent.
// - tekst: eigen `tekstKleur` van het label, anders de accentkleur.
// Labels zonder eigen kleuren, label-loze events, verjaardagen en feestdagen
// houden zo exact hun bestaande weergave.
export function eventKleuren(label?: Label, tintOpacity = 0.18): {
  accent: string
  achtergrond: string
  tekst: string
} {
  const accent = label?.kleur ?? '#8E8E93'
  const achtergrond = label?.achtergrondKleur ?? labelAchtergrond(accent, tintOpacity)
  const tekst = label?.tekstKleur ?? accent
  return { accent, achtergrond, tekst }
}

// Relatieve luminantie van een #rrggbb-kleur (WCAG).
function luminantie(hex: string): number {
  const c = [1, 3, 5].map(i => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

// WCAG-contrastverhouding tussen twee #rrggbb-kleuren (1 = geen contrast, 21 = max).
export function contrastRatio(hex1: string, hex2: string): number {
  try {
    const l1 = luminantie(hex1)
    const l2 = luminantie(hex2)
    const licht = Math.max(l1, l2)
    const donker = Math.min(l1, l2)
    return (licht + 0.05) / (donker + 0.05)
  } catch {
    return 21
  }
}
