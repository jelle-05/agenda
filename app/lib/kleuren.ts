export function labelAchtergrond(kleur: string, opacity = 0.15): string {
  const r = parseInt(kleur.slice(1, 3), 16)
  const g = parseInt(kleur.slice(3, 5), 16)
  const b = parseInt(kleur.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
