'use client'

import { useEffect, useRef } from 'react'

const DUUR_MS = 5000

interface Props {
  melding: string
  sleutel: number          // verandert per actie → timer herstart (nieuwste vervangt vorige)
  onHerstel: () => void
  onVerloop: () => void
}

// Undo-snackbar: kort bericht met een Herstel-knop, gecentreerd onderin
// (mobiel boven de BottomBar). Timer pauzeert zolang de muis erop staat.
// z-40 = bewust ónder de modals (z-50).
export default function Snackbar({ melding, sleutel, onHerstel, onVerloop }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // De callback in een ref zodat de timer-effect alleen op `sleutel` draait
  // (en niet herstart wanneer de parent nieuwe functie-instanties doorgeeft).
  // Bijwerken in een effect — niet tijdens render (react-hooks/refs).
  const verloopRef = useRef(onVerloop)
  useEffect(() => { verloopRef.current = onVerloop })

  function stopTimer() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }
  function startTimer() {
    stopTimer()
    timer.current = setTimeout(() => verloopRef.current(), DUUR_MS)
  }

  useEffect(() => {
    startTimer()
    return stopTimer   // cleanup bij unmount of nieuwe actie — geen lekkende timers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleutel])

  return (
    <div className="fixed inset-x-0 bottom-20 sm:bottom-6 z-40 flex justify-center pointer-events-none safe-area-bottom px-4">
      <div
        role="status"
        aria-live="polite"
        onMouseEnter={stopTimer}
        onMouseLeave={startTimer}
        className="pointer-events-auto flex items-center gap-4 bg-gray-900 text-white rounded-xl px-4 py-3 shadow-lg max-w-full"
      >
        <span className="text-[14px] truncate">{melding}</span>
        <button
          onClick={onHerstel}
          className="text-[14px] font-semibold text-[#6CB2FF] hover:text-white transition-colors shrink-0"
        >
          Herstel
        </button>
      </div>
    </div>
  )
}
