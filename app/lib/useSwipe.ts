import { useRef } from 'react'
import type { PointerEvent, MouseEvent } from 'react'

const DREMPEL = 60   // minimale horizontale verplaatsing in px
const RATIO   = 1.5  // horizontaal moet minstens 1.5× groter zijn dan verticaal

export function useSwipe(
  onLinks: () => void,    // swipe naar links  → volgende
  onRechts: () => void,   // swipe naar rechts → vorige
  enabled = true,
) {
  const startX = useRef(0)
  const startY = useRef(0)
  const actief = useRef(false)
  // Onthoudt of de laatste touch een swipe was, zodat de erop volgende
  // click (op een event-button) onderdrukt kan worden.
  const swipeGedaan = useRef(false)

  function onPointerDown(e: PointerEvent) {
    if (!enabled || e.pointerType !== 'touch') return
    // Form-elementen moeten native blijven werken; event-buttons mogen wél swipen.
    if ((e.target as HTMLElement).closest('input, select, textarea, a')) return
    startX.current = e.clientX
    startY.current = e.clientY
    actief.current = true
    swipeGedaan.current = false
  }

  function onPointerCancel() {
    actief.current = false
  }

  function onPointerUp(e: PointerEvent) {
    if (!actief.current) return
    actief.current = false
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (Math.abs(dx) < DREMPEL) return
    if (Math.abs(dx) < Math.abs(dy) * RATIO) return
    swipeGedaan.current = true
    if (dx < 0) onLinks()
    else onRechts()
  }

  // Slokt de click op die na een swipe op een event-button volgt (capture-fase,
  // vóór de onClick van de button), zodat een swipe geen afspraak opent.
  function onClickCapture(e: MouseEvent) {
    if (swipeGedaan.current) {
      e.stopPropagation()
      e.preventDefault()
      swipeGedaan.current = false
    }
  }

  return { onPointerDown, onPointerUp, onPointerCancel, onClickCapture }
}
