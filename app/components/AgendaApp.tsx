'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
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
import InstellingenPanel from './InstellingenPanel'
import { subscribeerOpPush } from '@/lib/pushUtils'

export default function AgendaApp() {
  // Auth
  const [gebruiker, setGebruiker] = useState<User | null>(null)
  const [klaar, setKlaar]         = useState(false)     // auth + data both loaded

  // Calendar state
  const [weergave, setWeergave]         = useState<WeergaveType>('maand')
  const [huidigeDatum, setHuidigeDatum] = useState(() => new Date())
  const [afspraken, setAfspraken]       = useState<Afspraak[]>([])
  const [labels, setLabels]             = useState<Label[]>([])

  // Notificatie banner
  const [toonNotifBanner, setToonNotifBanner]     = useState(false)
  const gevierdRef                                = useRef(new Set<string>())

  // Modal state
  const [formulierOpen, setFormulierOpen]         = useState(false)
  const [bewerkAfspraak, setBewerkAfspraak]       = useState<Afspraak | null>(null)
  const [labelBeheerOpen, setLabelBeheerOpen]         = useState(false)
  const [instellingenOpen, setInstellingenOpen]       = useState(false)
  const [vooringevuldDatum, setVooringevuldDatum] = useState<Date | null>(null)

  // ── Auth & data init ────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null
      setGebruiker(user)

      if (user) {
        // Toon gecachte localStorage-data direct — geen wachten op netwerk
        setAfspraken(laadAfspraken())
        setLabels(laadLabels())
        setKlaar(true)
        // Sync Supabase stil op de achtergrond
        achtergrondSync(user.id)
      } else {
        setKlaar(true)   // Toon loginpagina
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null
      setGebruiker(user)

      if (event === 'SIGNED_IN' && user) {
        // Verse login: eenmalig volledige initialisatie
        setKlaar(false)
        initialiseerData(user.id).finally(() => setKlaar(true))
      } else if (event === 'SIGNED_OUT') {
        setAfspraken([])
        setLabels([])
        // klaar blijft true → loginpagina zichtbaar
      }
      // TOKEN_REFRESHED / USER_UPDATED: geen actie — data is al geladen
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Stille achtergrond-sync: update UI zonder spinner
  async function achtergrondSync(userId: string) {
    try {
      const [supLabels, supAfspraken] = await Promise.all([
        laadLabelsVanSupabase(),
        laadAfsprakenVanSupabase(),
      ])
      if (supAfspraken.length > 0 || supLabels.length > 0) {
        setAfspraken(supAfspraken)
        setLabels(supLabels)
        slaAlleAfsprakenOp(supAfspraken)
        slaAlleLabelsOp(supLabels)
      }
    } catch {
      // Netwerk niet beschikbaar: gecachte data blijft zichtbaar
    }
    void userId
  }

  // Volledige initialisatie voor eerste login (upload lokale data als Supabase leeg is)
  async function initialiseerData(userId: string) {
    try {
      const [supLabels, supAfspraken] = await Promise.all([
        laadLabelsVanSupabase(),
        laadAfsprakenVanSupabase(),
      ])

      if (supLabels.length === 0 && supAfspraken.length === 0) {
        const lokaleAfspraken = laadAfspraken()
        const lokaleLabels    = laadLabels()
        await uploadNaarSupabase(lokaleAfspraken, lokaleLabels, userId)
        setAfspraken(lokaleAfspraken)
        setLabels(lokaleLabels)
      } else {
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

  // ── Notificaties ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (gebruiker && 'Notification' in window && Notification.permission === 'default') {
      setToonNotifBanner(true)
    }
  }, [gebruiker])

  async function vraagNotificatieToestemming() {
    const perm = await Notification.requestPermission()
    setToonNotifBanner(false)
    if (perm === 'granted') {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) await subscribeerOpPush(session.access_token)
    }
  }

  // Abonneer bij opstarten als toestemming al gegeven is
  useEffect(() => {
    if (!gebruiker) return
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) subscribeerOpPush(session.access_token)
    })
  }, [gebruiker])

  // Controleer elke 30 seconden op herinneringen die af moeten gaan
  useEffect(() => {
    if (!gebruiker) return

    function checkHerinneringen() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return
      const nu = Date.now()

      afspraken.forEach((a) => {
        if ((a.herinneringMinuten ?? -1) < 0 || a.heeldag) return
        const [uur, min] = a.beginTijd.split(':').map(Number)
        const [y, m, d] = a.datum.split('-').map(Number)
        const afspraakMs = new Date(y, m - 1, d, uur, min).getTime()
        const herinneringMs = afspraakMs - (a.herinneringMinuten ?? 0) * 60_000
        const sleutel = `${a.id}-${herinneringMs}`

        // Schiet af als we binnen een venster van 30 seconden rond de herinneringstijd zitten
        if (!gevierdRef.current.has(sleutel) && herinneringMs > nu - 30_000 && herinneringMs <= nu + 30_000) {
          gevierdRef.current.add(sleutel)
          const minuten = a.herinneringMinuten ?? 0
          const tijdTekst = minuten === 0 ? 'Nu' : minuten < 60 ? `Over ${minuten} min` : `Over ${minuten / 60} uur`
          new Notification(`📅 ${a.titel}`, {
            body: `${tijdTekst} — ${a.beginTijd}`,
            icon: '/icon-192.png',
            tag:  sleutel,
          })
        }
      })
    }

    const interval = setInterval(checkHerinneringen, 30_000)
    checkHerinneringen()
    return () => clearInterval(interval)
  }, [afspraken, gebruiker])

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
        onInstellingen={() => setInstellingenOpen(true)}
        onUitloggen={uitloggen}
        gebruikerEmail={gebruiker.email ?? ''}
      />

      {/* Notificatie banner */}
      {toonNotifBanner && (
        <div className="flex items-center justify-between bg-blue-50 border-b border-blue-100 px-4 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-[#007AFF] shrink-0" />
            <span className="text-[13px] text-gray-700">Zet meldingen aan voor herinneringen</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={vraagNotificatieToestemming} className="text-[13px] text-[#007AFF] font-semibold">
              Aanzetten
            </button>
            <button onClick={() => setToonNotifBanner(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

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

      <InstellingenPanel
        open={instellingenOpen}
        onSluit={() => setInstellingenOpen(false)}
      />
    </div>
  )
}
