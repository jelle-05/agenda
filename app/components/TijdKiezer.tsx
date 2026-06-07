'use client'

interface Props {
  value: string                  // "HH:MM"
  onChange: (tijd: string) => void
}

const UREN = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTEN_STAP = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'))

// Tijdsinvoer met mobiel/desktop-split: op mobiel twee native selects
// (uur + minuut per 5 min — Android toont nette lijsten i.p.v. de ronde
// klok-picker, iOS de bekende wieltjes), op desktop het klassieke tijdveld.
export default function TijdKiezer({ value, onChange }: Props) {
  const [uur = '09', minuut = '00'] = value.split(':')

  // Afwijkende minuten (oude data, bv. 09:37) als extra optie injecteren,
  // zodat de huidige waarde nooit stilletjes verandert.
  const minuten = MINUTEN_STAP.includes(minuut)
    ? MINUTEN_STAP
    : [...MINUTEN_STAP, minuut].sort()

  return (
    <>
      {/* Mobiel: uur + minuut dropdowns */}
      <span className="flex items-center gap-0.5 sm:hidden">
        <select
          value={uur}
          onChange={e => onChange(`${e.target.value}:${minuut}`)}
          className="text-[15px] text-[#007AFF] outline-none bg-transparent text-right"
          aria-label="Uur"
        >
          {UREN.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <span className="text-[15px] text-[#007AFF]">:</span>
        <select
          value={minuut}
          onChange={e => onChange(`${uur}:${e.target.value}`)}
          className="text-[15px] text-[#007AFF] outline-none bg-transparent"
          aria-label="Minuten"
        >
          {minuten.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </span>

      {/* Desktop: klassiek tijdveld (typen + spinners) */}
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="hidden sm:block text-[15px] text-[#007AFF] outline-none bg-transparent"
      />
    </>
  )
}
