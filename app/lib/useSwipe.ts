import { useRef } from 'react'
import type { TouchEvent, MouseEvent } from 'react'

const DREMPEL = 60   // minimale horizontale verplaatsing in px
const RATIO   = 1.5  // horizontaal moet minstens 1.5× groter zijn dan verticaal

// Bewust touch-events i.p.v. pointer-events: Android Chrome (browser én TWA) vuurt
// pointercancel zodra het een touch-drag voor native scroll claimt, waardoor
// pointerup — en dus de swipe-evaluatie — nooit komt. Touch-events lopen tijdens
// native scroll gewoon door (touchend vuurt altijd bij loslaten), dus die zijn
// betrouwbaar op zowel Android als iOS. Muisgebruik vuurt geen touch-events,
// waardoor desktop vanzelf buiten schot blijft.
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

  function onTouchStart(e: TouchEvent) {
    if (!enabled || e.touches.length !== 1) return
    // Form-elementen moeten native blijven werken; event-buttons mogen wél swipen.
    if ((e.target as HTMLElement).closest('input, select, textarea, a')) return
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    actief.current = true
    swipeGedaan.current = false
  }

  function onTouchCancel() {
    actief.current = false
  }

  function onTouchEnd(e: TouchEvent) {
    if (!actief.current) return
    actief.current = false
    const t = e.changedTouches[0]
    if (!t) return
    const dx = t.clientX - startX.current
    const dy = t.clientY - startY.current
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

  return { onTouchStart, onTouchEnd, onTouchCancel, onClickCapture }
}
