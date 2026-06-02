import { useRef } from 'react'
import type { PointerEvent } from 'react'

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

  function onPointerDown(e: PointerEvent) {
    if (!enabled || e.pointerType !== 'touch') return
    if ((e.target as HTMLElement).closest('button, input, select, textarea, a')) return
    startX.current = e.clientX
    startY.current = e.clientY
    actief.current = true
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
    if (dx < 0) onLinks()
    else onRechts()
  }

  return { onPointerDown, onPointerUp, onPointerCancel }
}
