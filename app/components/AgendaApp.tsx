'use client'

import { useState } from 'react'
import type { WeergaveType } from '@/types'
import { mockAfspraken, mockLabels } from '@/lib/mockData'
import { NL_MAANDEN, NL_MAANDEN_KORT, formatWeekTitel } from '@/lib/datum'
import TopBar from './TopBar'
import BottomBar from './BottomBar'
import MaandWeergave from './MaandWeergave'
import WeekWeergave from './WeekWeergave'
import DagWeergave from './DagWeergave'
import AgendaLijst from './AgendaLijst'

export default function AgendaApp() {
  const [weergave, setWeergave] = useState<WeergaveType>('maand')
  const [huidigeDatum, setHuidigeDatum] = useState(() => new Date())

  function navigeerVorige() {
    const d = new Date(huidigeDatum)
    if (weergave === 'maand' || weergave === 'agenda') d.setMonth(d.getMonth() - 1)
    else if (weergave === 'week') d.setDate(d.getDate() - 7)
    else if (weergave === 'dag') d.setDate(d.getDate() - 1)
    setHuidigeDatum(d)
  }

  function navigeerVolgende() {
    const d = new Date(huidigeDatum)
    if (weergave === 'maand' || weergave === 'agenda') d.setMonth(d.getMonth() + 1)
    else if (weergave === 'week') d.setDate(d.getDate() + 7)
    else if (weergave === 'dag') d.setDate(d.getDate() + 1)
    setHuidigeDatum(d)
  }

  function gaNaarVandaag() {
    setHuidigeDatum(new Date())
  }

  function selecteerDag(datum: Date) {
    setHuidigeDatum(datum)
    setWeergave('dag')
  }

  function getTitel(): string {
    if (weergave === 'maand' || weergave === 'agenda') {
      return `${NL_MAANDEN[huidigeDatum.getMonth()]} ${huidigeDatum.getFullYear()}`
    }
    if (weergave === 'week') {
      return formatWeekTitel(huidigeDatum)
    }
    // dag
    const d = huidigeDatum
    return `${d.getDate()} ${NL_MAANDEN_KORT[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <TopBar
        weergave={weergave}
        onWeergaveChange={setWeergave}
        titel={getTitel()}
        onVorige={navigeerVorige}
        onVolgende={navigeerVolgende}
      />

      <main className="flex-1 overflow-hidden">
        {weergave === 'maand' && (
          <MaandWeergave
            huidigeDatum={huidigeDatum}
            afspraken={mockAfspraken}
            labels={mockLabels}
            onDagKlik={selecteerDag}
          />
        )}
        {weergave === 'week' && (
          <WeekWeergave
            huidigeDatum={huidigeDatum}
            afspraken={mockAfspraken}
            labels={mockLabels}
            onDagKlik={selecteerDag}
          />
        )}
        {weergave === 'dag' && (
          <DagWeergave
            huidigeDatum={huidigeDatum}
            afspraken={mockAfspraken}
            labels={mockLabels}
            onDagKlik={selecteerDag}
          />
        )}
        {weergave === 'agenda' && (
          <AgendaLijst
            huidigeDatum={huidigeDatum}
            afspraken={mockAfspraken}
            labels={mockLabels}
          />
        )}
      </main>

      <BottomBar
        weergave={weergave}
        onWeergaveChange={setWeergave}
        onVandaag={gaNaarVandaag}
      />
    </div>
  )
}
