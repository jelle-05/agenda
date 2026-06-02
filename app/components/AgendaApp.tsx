'use client'

import { useState, useEffect } from 'react'
import type { WeergaveType, Afspraak, Label } from '@/types'
import {
  laadAfspraken, slaAfspraakOp, verwijderAfspraak, slaAlleAfsprakenOp,
  laadLabels, slaLabelOp, verwijderLabel,
} from '@/lib/opslag'
import { NL_MAANDEN, NL_MAANDEN_KORT, formatWeekTitel } from '@/lib/datum'
import TopBar from './TopBar'
import BottomBar from './BottomBar'
import MaandWeergave from './MaandWeergave'
import WeekWeergave from './WeekWeergave'
import DagWeergave from './DagWeergave'
import AgendaLijst from './AgendaLijst'
import AfspraakFormulier from './AfspraakFormulier'
import LabelBeheer from './LabelBeheer'

export default function AgendaApp() {
  const [weergave, setWeergave]         = useState<WeergaveType>('maand')
  const [huidigeDatum, setHuidigeDatum] = useState(() => new Date())
  const [afspraken, setAfspraken]       = useState<Afspraak[]>([])
  const [labels, setLabels]             = useState<Label[]>([])
  const [geladen, setGeladen]           = useState(false)

  // Modal states
  const [formulierOpen, setFormulierOpen]     = useState(false)
  const [bewerkAfspraak, setBewerkAfspraak]   = useState<Afspraak | null>(null)
  const [labelBeheerOpen, setLabelBeheerOpen] = useState(false)
  const [vooringevuldDatum, setVooringevuldDatum] = useState<Date | null>(null)

  useEffect(() => {
    setAfspraken(laadAfspraken())
    setLabels(laadLabels())
    setGeladen(true)
  }, [])

  // Navigatie
  function navigeerVorige() {
    const d = new Date(huidigeDatum)
    if (weergave === 'maand' || weergave === 'agenda') d.setMonth(d.getMonth() - 1)
    else if (weergave === 'week') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setHuidigeDatum(d)
  }

  function navigeerVolgende() {
    const d = new Date(huidigeDatum)
    if (weergave === 'maand' || weergave === 'agenda') d.setMonth(d.getMonth() + 1)
    else if (weergave === 'week') d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setHuidigeDatum(d)
  }

  function gaNaarVandaag() { setHuidigeDatum(new Date()) }

  function selecteerDag(datum: Date) {
    setHuidigeDatum(datum)
    setWeergave('dag')
  }

  // Afspraak CRUD
  function openNieuwAfspraak(datum?: Date) {
    setVooringevuldDatum(datum ?? huidigeDatum)
    setBewerkAfspraak(null)
    setFormulierOpen(true)
  }

  function openBewerkAfspraak(afspraak: Afspraak) {
    setBewerkAfspraak(afspraak)
    setVooringevuldDatum(null)
    setFormulierOpen(true)
  }

  function handleOpslaanAfspraak(afspraak: Afspraak) {
    setAfspraken(prev => slaAfspraakOp(afspraak, prev))
    setFormulierOpen(false)
  }

  function handleVerwijderAfspraak(id: string) {
    setAfspraken(prev => verwijderAfspraak(id, prev))
    setFormulierOpen(false)
  }

  // Label CRUD
  function handleOpslaanLabel(label: Label) {
    setLabels(prev => slaLabelOp(label, prev))
  }

  function handleVerwijderLabel(id: string) {
    setLabels(prev => verwijderLabel(id, prev))
    setAfspraken(prev => {
      const updated = prev.map(a => ({ ...a, labelIds: a.labelIds.filter(l => l !== id) }))
      slaAlleAfsprakenOp(updated)
      return updated
    })
  }

  function getTitel(): string {
    if (weergave === 'maand' || weergave === 'agenda')
      return `${NL_MAANDEN[huidigeDatum.getMonth()]} ${huidigeDatum.getFullYear()}`
    if (weergave === 'week') return formatWeekTitel(huidigeDatum)
    const d = huidigeDatum
    return `${d.getDate()} ${NL_MAANDEN_KORT[d.getMonth()]} ${d.getFullYear()}`
  }

  if (!geladen) {
    return <div className="h-full flex items-center justify-center text-gray-400 text-sm">Laden…</div>
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <TopBar
        weergave={weergave}
        onWeergaveChange={setWeergave}
        titel={getTitel()}
        onVorige={navigeerVorige}
        onVolgende={navigeerVolgende}
        onNieuw={() => openNieuwAfspraak()}
        onLabels={() => setLabelBeheerOpen(true)}
      />

      <main className="flex-1 overflow-hidden">
        {weergave === 'maand' && (
          <MaandWeergave
            huidigeDatum={huidigeDatum}
            afspraken={afspraken}
            labels={labels}
            onDagKlik={selecteerDag}
            onAfspraakKlik={openBewerkAfspraak}
            onNieuwAfspraak={openNieuwAfspraak}
          />
        )}
        {weergave === 'week' && (
          <WeekWeergave
            huidigeDatum={huidigeDatum}
            afspraken={afspraken}
            labels={labels}
            onDagKlik={selecteerDag}
            onAfspraakKlik={openBewerkAfspraak}
          />
        )}
        {weergave === 'dag' && (
          <DagWeergave
            huidigeDatum={huidigeDatum}
            afspraken={afspraken}
            labels={labels}
            onDagKlik={selecteerDag}
            onAfspraakKlik={openBewerkAfspraak}
          />
        )}
        {weergave === 'agenda' && (
          <AgendaLijst
            huidigeDatum={huidigeDatum}
            afspraken={afspraken}
            labels={labels}
            onAfspraakKlik={openBewerkAfspraak}
          />
        )}
      </main>

      <BottomBar
        weergave={weergave}
        onWeergaveChange={setWeergave}
        onVandaag={gaNaarVandaag}
      />

      <AfspraakFormulier
        open={formulierOpen}
        afspraak={bewerkAfspraak}
        labels={labels}
        initiaalDatum={vooringevuldDatum ?? huidigeDatum}
        onOpslaan={handleOpslaanAfspraak}
        onVerwijder={handleVerwijderAfspraak}
        onSluit={() => setFormulierOpen(false)}
      />

      <LabelBeheer
        open={labelBeheerOpen}
        labels={labels}
        onOpslaan={handleOpslaanLabel}
        onVerwijder={handleVerwijderLabel}
        onSluit={() => setLabelBeheerOpen(false)}
      />
    </div>
  )
}
