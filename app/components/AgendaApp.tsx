'use client'

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { WeergaveType, Afspraak, Label } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  laadAfspraken, slaAfspraakOp, verwijderAfspraak, slaAlleAfsprakenOp,
  laadLabels, slaLabelOp, verwijderLabel, slaAlleLabelsOp,
} from '@/lib/opslag'
import {
  laadAfsprakenVanSupabase, slaAfspraakOpInSupabase, verwijderAfspraakUitSupabase,
  laadLabelsVanSupabase, slaLabelOpInSupabase, verwijderLabelUitSupabase,
  uploadNaarSupabase,
} from '@/lib/supabaseOpslag'
import { NL_MAANDEN, NL_MAANDEN_KORT, formatWeekTitel } from '@/lib/datum'
import TopBar from './TopBar'
import BottomBar from './BottomBar'
import LoginPagina from './LoginPagina'
import MaandWeergave from './MaandWeergave'
import WeekWeergave from './WeekWeergave'
import DagWeergave from './DagWeergave'
import AgendaLijst from './AgendaLijst'
import AfspraakFormulier from './AfspraakFormulier'
import LabelBeheer from './LabelBeheer'

export default function AgendaApp() {
  // Auth
  const [gebruiker, setGebruiker] = useState<User | null>(null)
  const [klaar, setKlaar]         = useState(false)     // auth + data both loaded

  // Calendar state
  const [weergave, setWeergave]         = useState<WeergaveType>('maand')
  const [huidigeDatum, setHuidigeDatum] = useState(() => new Date())
  const [afspraken, setAfspraken]       = useState<Afspraak[]>([])
  const [labels, setLabels]             = useState<Label[]>([])

  // Modal state
  const [formulierOpen, setFormulierOpen]         = useState(false)
  const [bewerkAfspraak, setBewerkAfspraak]       = useState<Afspraak | null>(null)
  const [labelBeheerOpen, setLabelBeheerOpen]     = useState(false)
  const [vooringevuldDatum, setVooringevuldDatum] = useState<Date | null>(null)

  // ── Auth & data init ────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null
      setGebruiker(user)
      if (user) await initialiseerData(user.id)
      setKlaar(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      setGebruiker(user)
      if (user) {
        setKlaar(false)
        await initialiseerData(user.id)
        setKlaar(true)
      } else {
        setAfspraken([])
        setLabels([])
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function initialiseerData(userId: string) {
    try {
      const [supLabels, supAfspraken] = await Promise.all([
        laadLabelsVanSupabase(),
        laadAfsprakenVanSupabase(),
      ])

      if (supLabels.length === 0 && supAfspraken.length === 0) {
        // Nieuwe gebruiker: lokale data uploaden naar Supabase
        const lokaleAfspraken = laadAfspraken()
        const lokaleLabels    = laadLabels()
        await uploadNaarSupabase(lokaleAfspraken, lokaleLabels, userId)
        setAfspraken(lokaleAfspraken)
        setLabels(lokaleLabels)
      } else {
        // Bestaande gebruiker: Supabase is de bron
        setAfspraken(supAfspraken)
        setLabels(supLabels)
        slaAlleAfsprakenOp(supAfspraken)
        slaAlleLabelsOp(supLabels)
      }
    } catch (err) {
      console.error('Supabase laden mislukt, gebruik lokale data:', err)
      setAfspraken(laadAfspraken())
      setLabels(laadLabels())
    }
  }

  async function uitloggen() {
    await supabase.auth.signOut()
  }

  // ── Navigatie ───────────────────────────────────────────────────────────────

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

  // ── Afspraak CRUD ────────────────────────────────────────────────────────────

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

  async function handleOpslaanAfspraak(afspraak: Afspraak) {
    setAfspraken(prev => slaAfspraakOp(afspraak, prev))
    setFormulierOpen(false)
    if (gebruiker) {
      try { await slaAfspraakOpInSupabase(afspraak, gebruiker.id) }
      catch (err) { console.error('Supabase afspraak sync mislukt:', err) }
    }
  }

  async function handleVerwijderAfspraak(id: string) {
    setAfspraken(prev => verwijderAfspraak(id, prev))
    setFormulierOpen(false)
    if (gebruiker) {
      try { await verwijderAfspraakUitSupabase(id) }
      catch (err) { console.error('Supabase verwijder sync mislukt:', err) }
    }
  }

  // ── Label CRUD ───────────────────────────────────────────────────────────────

  async function handleOpslaanLabel(label: Label) {
    setLabels(prev => slaLabelOp(label, prev))
    if (gebruiker) {
      try { await slaLabelOpInSupabase(label, gebruiker.id) }
      catch (err) { console.error('Supabase label sync mislukt:', err) }
    }
  }

  async function handleVerwijderLabel(id: string) {
    setLabels(prev => verwijderLabel(id, prev))
    setAfspraken(prev => {
      const updated = prev.map(a => ({ ...a, labelIds: a.labelIds.filter(l => l !== id) }))
      slaAlleAfsprakenOp(updated)
      return updated
    })
    if (gebruiker) {
      try { await verwijderLabelUitSupabase(id) }
      catch (err) { console.error('Supabase label verwijder sync mislukt:', err) }
    }
  }

  // ── Topbar titel ─────────────────────────────────────────────────────────────

  function getTitel(): string {
    if (weergave === 'maand' || weergave === 'agenda')
      return `${NL_MAANDEN[huidigeDatum.getMonth()]} ${huidigeDatum.getFullYear()}`
    if (weergave === 'week') return formatWeekTitel(huidigeDatum)
    const d = huidigeDatum
    return `${d.getDate()} ${NL_MAANDEN_KORT[d.getMonth()]} ${d.getFullYear()}`
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!klaar) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-[#007AFF] rounded-full animate-spin" />
      </div>
    )
  }

  if (!gebruiker) {
    return <LoginPagina onIngelogd={() => {}} />
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
        onUitloggen={uitloggen}
        gebruikerEmail={gebruiker.email ?? ''}
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
