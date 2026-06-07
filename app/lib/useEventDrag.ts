import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { Afspraak } from '@/types'
import { tijdNaarMinuten } from './datum'

const DREMPEL = 5   // px verplaatsing voordat een drag start (klik blijft klik)
const SNAP    = 15  // minuten waarop de nieuwe begintijd snapt

export interface DragStand {
  id: string
  dagDelta: number      // hele dagen opzij (alleen weekweergave)
  minutenDelta: number  // gesnapte minuten omhoog/omlaag
}

interface KolomGrenzen {
  minDag: number   // bv. -kolomIndex (niet vóór maandag slepen)
  maxDag: number   // bv. 6 - kolomIndex
}

// Drag & drop voor getimede events in de dag-/weekweergave — bewust muis-only
// (`pointerType === 'mouse'`): touch blijft volledig bij useSwipe en native
// scroll, dus mobiel gedrag verandert niet. De duur blijft behouden; de hook
// clampt de verticale delta zodat het event binnen 00:00–24:00 blijft.
export function useEventDrag(
  uurHoogte: number,
  onDrop: (afspraak: Afspraak, dagDelta: number, minutenDelta: number) => void,
) {
  const [drag, setDrag] = useState<DragStand | null>(null)
  const start   = useRef<{ x: number; y: number; afspraak: Afspraak; kolomBreedte: number; grenzen: KolomGrenzen } | null>(null)
  const laatste = useRef<DragStand | null>(null)
  const bezig   = useRef(false)
  const slokKlik = useRef(false)

  // Props om op een event-button te spreaden. `grenzen` alleen meegeven in de
  // weekweergave (horizontale dag-verplaatsing); kolombreedte = offsetParent
  // van het absoluut gepositioneerde blok = de dagkolom.
  function dragProps(afspraak: Afspraak, grenzen?: KolomGrenzen) {
    return {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return
        const kolom = (e.currentTarget as HTMLElement).offsetParent as HTMLElement | null
        start.current = {
          x: e.clientX,
          y: e.clientY,
          afspraak,
          kolomBreedte: grenzen && kolom ? kolom.clientWidth : 0,
          grenzen: grenzen ?? { minDag: 0, maxDag: 0 },
        }
        bezig.current = false
        laatste.current = null
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const s = start.current
        if (!s) return
        const dx = e.clientX - s.x
        const dy = e.clientY - s.y
        if (!bezig.current && Math.abs(dx) < DREMPEL && Math.abs(dy) < DREMPEL) return
        bezig.current = true

        // Verticaal: pixels → minuten, gesnapt; geclamped op duurbehoud binnen de dag.
        const beginMin = tijdNaarMinuten(s.afspraak.beginTijd)
        const duur = Math.max(tijdNaarMinuten(s.afspraak.eindTijd) - beginMin, 0)
        let minutenDelta = Math.round(((dy / uurHoogte) * 60) / SNAP) * SNAP
        minutenDelta = Math.max(-beginMin, Math.min(minutenDelta, 24 * 60 - duur - beginMin))

        // Horizontaal (week): pixels → hele dagen, geclamped op de weekgrenzen.
        let dagDelta = 0
        if (s.kolomBreedte > 0) {
          dagDelta = Math.round(dx / s.kolomBreedte)
          dagDelta = Math.max(s.grenzen.minDag, Math.min(dagDelta, s.grenzen.maxDag))
        }

        const stand = { id: s.afspraak.id, dagDelta, minutenDelta }
        laatste.current = stand
        setDrag(stand)
      },
      onPointerUp: () => {
        const s = start.current
        start.current = null
        setDrag(null)
        if (!s || !bezig.current) return
        bezig.current = false
        slokKlik.current = true   // de click die op deze pointerup volgt niet als "open" behandelen
        const stand = laatste.current
        if (stand && (stand.dagDelta !== 0 || stand.minutenDelta !== 0)) {
          onDrop(s.afspraak, stand.dagDelta, stand.minutenDelta)
        }
      },
      onPointerCancel: () => {
        start.current = null
        bezig.current = false
        setDrag(null)
      },
    }
  }

  // Door de event-button aan te roepen in onClick: geeft één keer `true` terug
  // direct na een drag, zodat het formulier dan niet opent (zelfde idee als
  // de click-onderdrukking in useSwipe).
  function consumeerKlik(): boolean {
    if (slokKlik.current) {
      slokKlik.current = false
      return true
    }
    return false
  }

  return { drag, dragProps, consumeerKlik }
}
