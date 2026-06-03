'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Bell, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { WeergaveType, Afspraak, Label, Verjaardag } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  laadAfspraken, slaAfspraakOp, verwijderAfspraak, slaAlleAfsprakenOp,
  laadLabels, slaLabelOp, verwijderLabel, slaAlleLabelsOp,
  laadVerjaardagen, slaVerjaardagOp, verwijderVerjaardag, slaAlleVerjaardagenOp,
} from '@/lib/opslag'
import {
  laadAfsprakenVanSupabase, slaAfspraakOpInSupabase, verwijderAfspraakUitSupabase,
  laadLabelsVanSupabase, slaLabelOpInSupabase, verwijderLabelUitSupabase,
  laadVerjaardagenVanSupabase, slaVerjaardagOpInSupabase, verwijderVerjaardagUitSupabase,
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
import ProfielMenu from './ProfielMenu'
import VerjaardagenLijst from './VerjaardagenLijst'
import VerjaardagFormulier from './VerjaardagFormulier'
import VerjaardagKeuze from './VerjaardagKeuze'
import { subscribeerOpPush } from '@/lib/pushUtils'
import { genereerHerhalingen } from '@/lib/herhaling'
import type { HerhalingConfig } from '@/types'
import { slaVeelAfsprakenOpInSupabase } from '@/lib/supabaseOpslag'
import { useSwipe } from '@/lib/useSwipe'
import {
  VERJAARDAG_LABEL, genereerVerjaardagAfspraken, isVerjaardagEvent,
  verjaardagIdUitEvent, eerstvolgendeVerjaardag,
} from '@/lib/verjaardagen'

export default function AgendaApp() {
  // Auth
  const [gebruiker, setGebruiker] = useState<User | null>(null)
  const [klaar, setKlaar]         = useState(false)     // auth + data both loaded

  // Calendar state
  const [weergave, setWeergave]         = useState<WeergaveType>('dag')
  const [huidigeDatum, setHuidigeDatum] = useState(() => new Date())
  const [afspraken, setAfspraken]       = useState<Afspraak[]>([])
  const [labels, setLabels]             = useState<Label[]>([])
  const [verjaardagen, setVerjaardagen] = useState<Verjaardag[]>([])

  // Notificatie banner
  const [toonNotifBanner, setToonNotifBanner]     = useState(false)
  const gevierdRef                                = useRef(new Set<string>())

  // Modal state
  const [formulierOpen, setFormulierOpen]         = useState(false)
  const [bewerkAfspraak, setBewerkAfspraak]       = useState<Afspraak | null>(null)
  const [labelBeheerOpen, setLabelBeheerOpen]     = useState(false)
  const [profielMenuOpen, setProfielMenuOpen]     = useState(false)
  const [verjaardagKeuzeOpen, setVerjaardagKeuzeOpen] = useState(false)
  const [verjaardagenOpen, setVerjaardagenOpen]   = useState(false)
  const [verjaardagFormOpen, setVerjaardagFormOpen] = useState(false)
  const [bewerkVerjaardag, setBewerkVerjaardag]   = useState<Verjaardag | null>(null)
  const [vooringevuldDatum, setVooringevuldDatum] = useState<Date | null>(null)
  const [vooringevuldTijd, setVooringevuldTijd]   = useState<string | undefined>(undefined)
  const [animatieSleutel, setAnimatieSleutel]     = useState(0)
  const [animatieKlasse, setAnimatieKlasse]       = useState('')

  // ── Swipe-navigatie (mobiel) ─────────────────────────────────────────────────

  const swipeHandlers = useSwipe(
    navigeerVolgende,
    navigeerVorige,
    weergave === 'week' || weergave === 'dag',
  )

  // ── Verjaardagen in de kalender ───────────────────────────────────────────────
  // Leid virtuele all-day events af uit de verjaardagen en voeg een groen
  // virtueel label toe; zo renderen alle views verjaardagen automatisch zonder
  // dat de view-componenten verjaardagen apart hoeven te kennen.
  const verjaardagAfspraken = useMemo(
    () => genereerVerjaardagAfspraken(verjaardagen, huidigeDatum.getFullYear()),
    [verjaardagen, huidigeDatum],
  )
  const afsprakenVoorWeergave = useMemo(
    () => [...afspraken, ...verjaardagAfspraken],
    [afspraken, verjaardagAfspraken],
  )
  const labelsVoorWeergave = useMemo(() => [...labels, VERJAARDAG_LABEL], [labels])

  // ── Auth & data init ────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null
      setGebruiker(user)

      if (user) {
        // Toon gecachte localStorage-data direct — geen wachten op netwerk
        setAfspraken(laadAfspraken())
        setLabels(laadLabels())
        setVerjaardagen(laadVerjaardagen())
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
        setVerjaardagen([])
        // klaar blijft true → loginpagina zichtbaar
      }
      // TOKEN_REFRESHED / USER_UPDATED: geen actie — data is al geladen
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Android back-gesture blokkeren ────────────────────────────────────────────
  // Single-page app op '/': de systeem-back-swipe zou de app verlaten en een
  // grijs/leeg scherm tonen. Houd de history-stack gevuld zodat back binnen de
  // app blijft (modals sluit je via hun eigen knop).
  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const onPop = () => window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // ── Standaardweergave: desktop = week, mobiel = dag ───────────────────────────
  // Eenmalig bij init: initiële state is 'dag' (SSR-veilig). Op desktop (≥ sm,
  // 640px) eenmaal upgraden naar 'week'. Draait één keer → springt niet terug
  // tijdens gebruik en resizen verandert de keuze niet.
  useEffect(() => {
    if (window.matchMedia('(min-width: 640px)').matches) setWeergave('week')
  }, [])

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
    // Verjaardagen apart: tabel kan ontbreken vóór migratie — fouten negeren
    try {
      const supVerjaardagen = await laadVerjaardagenVanSupabase()
      setVerjaardagen(supVerjaardagen)
      slaAlleVerjaardagenOp(supVerjaardagen)
    } catch {
      // Tabel bestaat nog niet of netwerk niet beschikbaar
    }
    void userId
  }

  // Herlaad alle data vanuit Supabase en update state + cache
  async function herlaadData() {
    try {
      const [supLabels, supAfspraken] = await Promise.all([
        laadLabelsVanSupabase(),
        laadAfsprakenVanSupabase(),
      ])
      setAfspraken(supAfspraken)
      setLabels(supLabels)
      slaAlleAfsprakenOp(supAfspraken)
      slaAlleLabelsOp(supLabels)
    } catch {
      // Netwerk niet beschikbaar
    }
    try {
      const supVerjaardagen = await laadVerjaardagenVanSupabase()
      setVerjaardagen(supVerjaardagen)
      slaAlleVerjaardagenOp(supVerjaardagen)
    } catch {
      // Tabel bestaat nog niet of netwerk niet beschikbaar
    }
  }

  // Real-time sync: luister naar wijzigingen in de database
  useEffect(() => {
    if (!gebruiker) return

    const kanaal = supabase
      .channel(`agenda-${gebruiker.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'afspraken' }, herlaadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labels' }, herlaadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'verjaardagen' }, herlaadData)
      .subscribe()

    return () => { supabase.removeChannel(kanaal) }
  }, [gebruiker]) // eslint-disable-line react-hooks/exhaustive-deps

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
    try {
      const supVerjaardagen = await laadVerjaardagenVanSupabase()
      setVerjaardagen(supVerjaardagen)
      slaAlleVerjaardagenOp(supVerjaardagen)
    } catch {
      setVerjaardagen(laadVerjaardagen())
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

    async function checkHerinneringen() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return

      const nu = Date.now()

      // Gebruik SW showNotification (werkt op iOS 16.4+ PWA én Android);
      // val terug op new Notification() op desktop waar geen SW nodig is.
      let swReg: ServiceWorkerRegistration | null = null
      if ('serviceWorker' in navigator) {
        try { swReg = await navigator.serviceWorker.ready } catch { /* ignore */ }
      }

      for (const a of afspraken) {
        if ((a.herinneringMinuten ?? -1) < 0 || a.heeldag) continue
        const [uur, min] = a.beginTijd.split(':').map(Number)
        const [y, m, d] = a.datum.split('-').map(Number)
        const afspraakMs = new Date(y, m - 1, d, uur, min).getTime()
        const herinneringMs = afspraakMs - (a.herinneringMinuten ?? 0) * 60_000
        const sleutel = `${a.id}-${herinneringMs}`

        // Venster van 30 seconden rond de herinneringstijd
        if (!gevierdRef.current.has(sleutel) && herinneringMs > nu - 30_000 && herinneringMs <= nu + 30_000) {
          gevierdRef.current.add(sleutel)
          const minuten = a.herinneringMinuten ?? 0
          const tijdTekst = minuten === 0 ? 'Nu' : minuten < 60 ? `Over ${minuten} min` : `Over ${minuten / 60} uur`
          const opties = { body: `${tijdTekst} — ${a.beginTijd}`, icon: '/icon-192.png', tag: sleutel }

          try {
            if (swReg) {
              await swReg.showNotification(`📅 ${a.titel}`, opties)
            } else {
              new Notification(`📅 ${a.titel}`, opties)
            }
          } catch (err) {
            console.error('Notificatie mislukt:', err)
          }
        }
      }

      // Verjaardags-herinneringen — verankerd op 09:00; werkt jaarlijks voor
      // terugkomende verjaardagen via eerstvolgendeVerjaardag().
      for (const v of verjaardagen) {
        if ((v.herinneringMinuten ?? -1) < 0) continue
        const occMs = eerstvolgendeVerjaardag(v, new Date(nu)).getTime()
        const herinneringMs = occMs - (v.herinneringMinuten ?? 0) * 60_000
        const sleutel = `vj-${v.id}-${herinneringMs}`

        if (!gevierdRef.current.has(sleutel) && herinneringMs > nu - 30_000 && herinneringMs <= nu + 30_000) {
          gevierdRef.current.add(sleutel)
          const rm = v.herinneringMinuten ?? 0
          const tekst = rm >= 10080 ? 'Over een week jarig' : rm >= 1440 ? 'Morgen jarig' : 'Bijna jarig'
          const opties = { body: tekst, icon: '/icon-192.png', tag: sleutel }
          try {
            if (swReg) {
              await swReg.showNotification(`🎂 ${v.naam}`, opties)
            } else {
              new Notification(`🎂 ${v.naam}`, opties)
            }
          } catch (err) {
            console.error('Notificatie mislukt:', err)
          }
        }
      }
    }

    const interval = setInterval(() => { void checkHerinneringen() }, 30_000)
    void checkHerinneringen()
    return () => clearInterval(interval)
  }, [afspraken, verjaardagen, gebruiker]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigatie ───────────────────────────────────────────────────────────────

  function navigeerVorige() {
    const d = new Date(huidigeDatum)
    if (weergave === 'maand' || weergave === 'agenda') d.setMonth(d.getMonth() - 1)
    else if (weergave === 'week') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    if (weergave === 'week' || weergave === 'dag') {
      setAnimatieKlasse('slide-van-links')
      setAnimatieSleutel(k => k + 1)
    }
    setHuidigeDatum(d)
  }

  function navigeerVolgende() {
    const d = new Date(huidigeDatum)
    if (weergave === 'maand' || weergave === 'agenda') d.setMonth(d.getMonth() + 1)
    else if (weergave === 'week') d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    if (weergave === 'week' || weergave === 'dag') {
      setAnimatieKlasse('slide-van-rechts')
      setAnimatieSleutel(k => k + 1)
    }
    setHuidigeDatum(d)
  }

  function gaNaarVandaag() { setHuidigeDatum(new Date()) }

  function selecteerDag(datum: Date) {
    setHuidigeDatum(datum)
    setWeergave('dag')
  }

  // ── Afspraak CRUD ────────────────────────────────────────────────────────────

  function openNieuwAfspraak(datum?: Date, beginTijd?: string) {
    setVooringevuldDatum(datum ?? huidigeDatum)
    setVooringevuldTijd(beginTijd)
    setBewerkAfspraak(null)
    setFormulierOpen(true)
  }

  function openBewerkAfspraak(afspraak: Afspraak) {
    // Virtuele verjaardags-events openen de verjaardag-editor i.p.v. het afspraakformulier
    if (isVerjaardagEvent(afspraak.id)) {
      const vid = verjaardagIdUitEvent(afspraak.id)
      const v = verjaardagen.find(x => x.id === vid)
      if (v) openBewerkVerjaardag(v)
      return
    }
    setBewerkAfspraak(afspraak)
    setVooringevuldDatum(null)
    setFormulierOpen(true)
  }

  // ── Verjaardagen ─────────────────────────────────────────────────────────────

  function openNieuwVerjaardag() {
    setBewerkVerjaardag(null)
    setVerjaardagKeuzeOpen(false)
    setVerjaardagenOpen(false)
    setVerjaardagFormOpen(true)
  }

  function openBewerkVerjaardag(v: Verjaardag) {
    setBewerkVerjaardag(v)
    setVerjaardagKeuzeOpen(false)
    setVerjaardagenOpen(false)
    setVerjaardagFormOpen(true)
  }

  function openVerjaardagenOverzicht() {
    setVerjaardagKeuzeOpen(false)
    setVerjaardagenOpen(true)
  }

  async function handleOpslaanVerjaardag(v: Verjaardag) {
    setVerjaardagen(prev => slaVerjaardagOp(v, prev))
    setVerjaardagFormOpen(false)
    if (gebruiker) {
      try { await slaVerjaardagOpInSupabase(v, gebruiker.id) }
      catch (err) { console.error('Supabase verjaardag sync mislukt:', err) }
    }
  }

  async function handleVerwijderVerjaardag(id: string) {
    setVerjaardagen(prev => verwijderVerjaardag(id, prev))
    setVerjaardagFormOpen(false)
    if (gebruiker) {
      try { await verwijderVerjaardagUitSupabase(id) }
      catch (err) { console.error('Supabase verjaardag verwijder sync mislukt:', err) }
    }
  }

  async function handleOpslaanAfspraak(afspraak: Afspraak, herhaling: HerhalingConfig, scope?: 'enkel' | 'alles') {
    if (scope === 'alles' && afspraak.herhalingGroepId) {
      const groepId = afspraak.herhalingGroepId
      const gedeeldeVelden = {
        titel: afspraak.titel,
        beginTijd: afspraak.beginTijd,
        eindTijd: afspraak.eindTijd,
        heeldag: afspraak.heeldag,
        labelIds: afspraak.labelIds,
        notitie: afspraak.notitie,
        locatie: afspraak.locatie,
        herinneringMinuten: afspraak.herinneringMinuten,
      }
      const bijgewerkt = afspraken
        .filter(ev => ev.herhalingGroepId === groepId)
        .map(ev => ({ ...ev, ...gedeeldeVelden }))
      setAfspraken(prev => {
        const next = prev.map(ev => ev.herhalingGroepId === groepId ? { ...ev, ...gedeeldeVelden } : ev)
        slaAlleAfsprakenOp(next)
        return next
      })
      setFormulierOpen(false)
      if (gebruiker && bijgewerkt.length > 0) {
        try { await slaVeelAfsprakenOpInSupabase(bijgewerkt, gebruiker.id) }
        catch (err) { console.error('Supabase reeks sync mislukt:', err) }
      }
      return
    }

    const events = genereerHerhalingen(afspraak, herhaling)
    setAfspraken(prev => {
      let next = prev
      for (const ev of events) next = slaAfspraakOp(ev, next)
      return next
    })
    setFormulierOpen(false)
    if (gebruiker) {
      try {
        if (events.length === 1) {
          await slaAfspraakOpInSupabase(events[0], gebruiker.id)
        } else {
          await slaVeelAfsprakenOpInSupabase(events, gebruiker.id)
        }
      } catch (err) { console.error('Supabase afspraak sync mislukt:', err) }
    }
  }

  async function handleVerwijderAfspraak(id: string, alleHerhalingen = false) {
    setAfspraken(prev => {
      if (alleHerhalingen) {
        const groepId = prev.find(a => a.id === id)?.herhalingGroepId
        const teVerwijderen = groepId ? prev.filter(a => a.herhalingGroepId === groepId).map(a => a.id) : [id]
        let next = prev
        for (const vid of teVerwijderen) next = verwijderAfspraak(vid, next)
        if (gebruiker) {
          Promise.all(teVerwijderen.map(vid => verwijderAfspraakUitSupabase(vid)))
            .catch(err => console.error('Supabase verwijder sync mislukt:', err))
        }
        return next
      }
      return verwijderAfspraak(id, prev)
    })
    setFormulierOpen(false)
    if (!alleHerhalingen && gebruiker) {
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
        onVandaag={gaNaarVandaag}
        onNieuw={() => openNieuwAfspraak()}
        onLabels={() => setLabelBeheerOpen(true)}
        onVerjaardagen={() => setVerjaardagKeuzeOpen(true)}
        onProfielMenu={() => setProfielMenuOpen(true)}
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

      <main className="flex-1 overflow-hidden" {...swipeHandlers}>
        {weergave === 'maand' && (
          <MaandWeergave
            huidigeDatum={huidigeDatum}
            afspraken={afsprakenVoorWeergave}
            labels={labelsVoorWeergave}
            onDagKlik={selecteerDag}
            onAfspraakKlik={openBewerkAfspraak}
            onNieuwAfspraak={openNieuwAfspraak}
          />
        )}
        {weergave === 'week' && (
          <WeekWeergave
            huidigeDatum={huidigeDatum}
            afspraken={afsprakenVoorWeergave}
            labels={labelsVoorWeergave}
            onDagKlik={selecteerDag}
            onAfspraakKlik={openBewerkAfspraak}
            onNieuwAfspraak={openNieuwAfspraak}
            animatieKlasse={animatieKlasse}
            animatieSleutel={animatieSleutel}
          />
        )}
        {weergave === 'dag' && (
          <DagWeergave
            huidigeDatum={huidigeDatum}
            afspraken={afsprakenVoorWeergave}
            labels={labelsVoorWeergave}
            onDagKlik={selecteerDag}
            onAfspraakKlik={openBewerkAfspraak}
            onNieuwAfspraak={openNieuwAfspraak}
            animatieKlasse={animatieKlasse}
            animatieSleutel={animatieSleutel}
          />
        )}
        {weergave === 'agenda' && (
          <AgendaLijst
            huidigeDatum={huidigeDatum}
            afspraken={afsprakenVoorWeergave}
            labels={labelsVoorWeergave}
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
        initiaalTijd={vooringevuldTijd}
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

      <ProfielMenu
        open={profielMenuOpen}
        email={gebruiker.email ?? ''}
        onUitloggen={uitloggen}
        onSluit={() => setProfielMenuOpen(false)}
      />

      <VerjaardagKeuze
        open={verjaardagKeuzeOpen}
        onNieuw={openNieuwVerjaardag}
        onBekijken={openVerjaardagenOverzicht}
        onSluit={() => setVerjaardagKeuzeOpen(false)}
      />

      <VerjaardagenLijst
        open={verjaardagenOpen}
        verjaardagen={verjaardagen}
        onNieuw={openNieuwVerjaardag}
        onBewerk={openBewerkVerjaardag}
        onSluit={() => setVerjaardagenOpen(false)}
      />

      <VerjaardagFormulier
        open={verjaardagFormOpen}
        verjaardag={bewerkVerjaardag}
        onOpslaan={handleOpslaanVerjaardag}
        onVerwijder={handleVerwijderVerjaardag}
        onSluit={() => setVerjaardagFormOpen(false)}
      />
    </div>
  )
}
