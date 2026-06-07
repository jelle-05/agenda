'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { WeergaveType, Afspraak, Label, Verjaardag, Filters } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  laadAfspraken, slaAfspraakOp, verwijderAfspraak, slaAlleAfsprakenOp,
  laadLabels, slaLabelOp, verwijderLabel, slaAlleLabelsOp,
  laadVerjaardagen, slaVerjaardagOp, verwijderVerjaardag, slaAlleVerjaardagenOp,
  STANDAARD_FILTERS, laadFilters, slaFiltersOp,
  laadLaatsteWeergave, slaLaatsteWeergaveOp,
} from '@/lib/opslag'
import { leesVoorkeuren } from '@/lib/voorkeuren'
import { begroetingstekst } from '@/lib/begroeting'
import {
  laadAfsprakenVanSupabase, slaAfspraakOpInSupabase, verwijderAfspraakUitSupabase,
  laadLabelsVanSupabase, slaLabelOpInSupabase, verwijderLabelUitSupabase,
  laadVerjaardagenVanSupabase, slaVerjaardagOpInSupabase, verwijderVerjaardagUitSupabase,
  uploadNaarSupabase,
} from '@/lib/supabaseOpslag'
import { NL_MAANDEN, NL_MAANDEN_KORT, formatWeekTitel, toISODatum, tijdNaarMinuten, minutenNaarTijd } from '@/lib/datum'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import MobielMenu from './MobielMenu'
import BottomBar from './BottomBar'
import LoginPagina from './LoginPagina'
import MaandWeergave from './MaandWeergave'
import WeekWeergave from './WeekWeergave'
import DagWeergave from './DagWeergave'
import AgendaLijst from './AgendaLijst'
import AfspraakFormulier from './AfspraakFormulier'
import LabelBeheer from './LabelBeheer'
import ProfielMenu from './ProfielMenu'
import InstellingenMenu from './InstellingenMenu'
import VerjaardagenLijst from './VerjaardagenLijst'
import VerjaardagFormulier from './VerjaardagFormulier'
import VerjaardagKeuze from './VerjaardagKeuze'
import FilterMenu from './FilterMenu'
import ZoekModal from './ZoekModal'
import { subscribeerOpPush } from '@/lib/pushUtils'
import { genereerHerhalingen } from '@/lib/herhaling'
import type { HerhalingConfig } from '@/types'
import { slaVeelAfsprakenOpInSupabase } from '@/lib/supabaseOpslag'
import { useSwipe } from '@/lib/useSwipe'
import {
  VERJAARDAG_LABEL, genereerVerjaardagAfspraken, isVerjaardagEvent,
  verjaardagIdUitEvent, eerstvolgendeVerjaardag,
} from '@/lib/verjaardagen'
import { FEESTDAG_LABEL, genereerFeestdagAfspraken, isFeestdagEvent } from '@/lib/feestdagen'

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

  // Modal state
  const [formulierOpen, setFormulierOpen]         = useState(false)
  const [zoekOpen, setZoekOpen]                   = useState(false)
  const [bewerkAfspraak, setBewerkAfspraak]       = useState<Afspraak | null>(null)
  const [labelBeheerOpen, setLabelBeheerOpen]     = useState(false)
  const [profielMenuOpen, setProfielMenuOpen]     = useState(false)
  const [instellingenOpen, setInstellingenOpen]   = useState(false)
  const [verjaardagKeuzeOpen, setVerjaardagKeuzeOpen] = useState(false)
  const [verjaardagenOpen, setVerjaardagenOpen]   = useState(false)
  const [verjaardagFormOpen, setVerjaardagFormOpen] = useState(false)
  const [bewerkVerjaardag, setBewerkVerjaardag]   = useState<Verjaardag | null>(null)
  const [filterMenuOpen, setFilterMenuOpen]       = useState(false)
  const [mobielMenuOpen, setMobielMenuOpen]       = useState(false)
  const [filters, setFilters]                     = useState<Filters>(STANDAARD_FILTERS)
  const [vooringevuldDatum, setVooringevuldDatum] = useState<Date | null>(null)
  const [vooringevuldTijd, setVooringevuldTijd]   = useState<string | undefined>(undefined)
  const [animatieSleutel, setAnimatieSleutel]     = useState(0)
  const [animatieKlasse, setAnimatieKlasse]       = useState('')

  // ── Swipe-navigatie (mobiel) ─────────────────────────────────────────────────

  const swipeHandlers = useSwipe(
    navigeerVolgende,
    navigeerVorige,
    weergave === 'week' || weergave === 'dag' || weergave === 'maand',
  )

  // ── Verjaardagen in de kalender ───────────────────────────────────────────────
  // Leid virtuele all-day events af uit de verjaardagen en voeg een groen
  // virtueel label toe; zo renderen alle views verjaardagen automatisch zonder
  // dat de view-componenten verjaardagen apart hoeven te kennen.
  const verjaardagAfspraken = useMemo(
    () => genereerVerjaardagAfspraken(verjaardagen, huidigeDatum.getFullYear()),
    [verjaardagen, huidigeDatum],
  )
  // Nederlandse feestdagen — eveneens als virtuele paarse all-day events.
  const feestdagAfspraken = useMemo(
    () => genereerFeestdagAfspraken(huidigeDatum.getFullYear()),
    [huidigeDatum],
  )
  // Filters bepalen welke itemtypes zichtbaar zijn (alleen weergave, data blijft intact).
  const afsprakenVoorWeergave = useMemo(
    () => [
      ...(filters.events ? afspraken : []),
      ...(filters.feestdagen ? feestdagAfspraken : []),
      ...(filters.verjaardagen ? verjaardagAfspraken : []),
    ],
    [afspraken, feestdagAfspraken, verjaardagAfspraken, filters],
  )
  const labelsVoorWeergave = useMemo(() => [...labels, FEESTDAG_LABEL, VERJAARDAG_LABEL], [labels])
  // Persoonlijke voorkeuren uit user_metadata; na opslaan in Instellingen vuurt
  // USER_UPDATED → setGebruiker → deze memo (en alle afnemers) verversen vanzelf.
  const voorkeuren = useMemo(() => leesVoorkeuren(gebruiker?.user_metadata), [gebruiker])
  // Begroeting + dagsamenvatting op basis van de échte afspraken van vandaag
  // (virtuele verjaardagen/feestdagen tellen niet mee als "afspraak").
  const begroeting = useMemo(() => {
    const vandaagIso = toISODatum(new Date())
    return begroetingstekst(voorkeuren.naam, afspraken.filter(a => a.datum === vandaagIso))
  }, [voorkeuren, afspraken])
  // Werkuren-dim voor de dag-/weekweergave (null = uit, exact de oude weergave).
  const werkUren = useMemo(
    () => voorkeuren.werkuren ? { start: voorkeuren.werkurenStart, eind: voorkeuren.werkurenEind } : null,
    [voorkeuren],
  )

  // Laad opgeslagen filtervoorkeuren bij opstarten (client-only, SSR-veilig).
  // localStorage is pas op de client beschikbaar; een lazy useState-init zou een
  // hydration-mismatch geven met de statisch geprerenderde HTML.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setFilters(laadFilters()) }, [])

  function wijzigFilter(key: keyof Filters) {
    setFilters(prev => {
      const next = { ...prev, [key]: !prev[key] }
      slaFiltersOp(next)
      return next
    })
  }

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
        startWeergaveToegepast.current = false   // herinloggen past de startweergave opnieuw toe
        // klaar blijft true → loginpagina zichtbaar
      }
      // TOKEN_REFRESHED / USER_UPDATED: geen actie — data is al geladen
    })

    return () => subscription.unsubscribe()
  }, [])  

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

  // ── Startweergave ─────────────────────────────────────────────────────────────
  // Eenmalig per login toegepast zodra de gebruiker bekend is (voorkeur uit
  // user_metadata): 'auto' = week op desktop / dag op mobiel (≥ sm, 640px),
  // 'laatst' = laatst gebruikte weergave uit localStorage (fallback auto),
  // anders de vaste keuze. Ref-guard: draait één keer per login → springt niet
  // terug bij USER_UPDATED (bv. voorkeuren opslaan) en resizen verandert niets.
  // Geen flash: de UI toont een spinner tot `klaar`.
  const startWeergaveToegepast = useRef(false)
  useEffect(() => {
    if (!gebruiker || startWeergaveToegepast.current) return
    startWeergaveToegepast.current = true
    const vk = leesVoorkeuren(gebruiker.user_metadata)
    const auto = (): WeergaveType =>
      window.matchMedia('(min-width: 640px)').matches ? 'week' : 'dag'
    // matchMedia bestaat alleen op de client; bewuste eenmalige init (SSR-veilig).
    setWeergave(
      vk.startWeergave === 'laatst' ? (laadLaatsteWeergave() ?? auto())
      : vk.startWeergave === 'auto' ? auto()
      : vk.startWeergave
    )
  }, [gebruiker])

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
  }, [gebruiker])  

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
      // Leest de externe browser-API Notification.permission — kan niet tijdens render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // In-app 30s-reminderscheck is uitgefaseerd (Fase 5). Alle reminders lopen nu
  // via de server-cron (/api/cron/reminders): Telegram voor gekoppelde+actieve
  // gebruikers, anders web-push als fallback, en e-mail altijd. Zo vuurt er geen
  // lokale browser-push meer náást Telegram (geen dubbele meldingen). De
  // permission-banner + push-subscription hierboven blijven nodig voor die
  // web-push-fallback.

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

  // Bewuste weergave-keuze via de tabs (TopBar/BottomBar): onthoud als "laatst
  // gebruikt" voor de startweergave-voorkeur. Navigatie (bv. maand→dag-klik in
  // selecteerDag) telt bewust niet als keuze.
  function wijzigWeergave(w: WeergaveType) {
    setWeergave(w)
    slaLaatsteWeergaveOp(w)
  }

  function selecteerDag(datum: Date) {
    setHuidigeDatum(datum)
    setWeergave('dag')
  }

  // Navigeren met behoud van de huidige weergave (minikalender in de Sidebar).
  function gaNaarDatum(datum: Date) {
    setHuidigeDatum(datum)
  }

  // Drag & drop: verplaats een event naar een nieuwe datum/begintijd met behoud
  // van de duur. Optimistisch (state + cache direct), Supabase-sync fail-soft —
  // zelfde patroon als alle andere mutaties; realtime corrigeert bij conflicten.
  // Bij herhalende events verplaatst dit bewust alleen déze occurrence (events
  // zijn gematerialiseerd; zelfde semantiek als bewerken met "Alleen dit event").
  async function verplaatsAfspraak(afspraak: Afspraak, nieuweDatum: string, nieuweBeginTijd: string) {
    const duur = Math.max(tijdNaarMinuten(afspraak.eindTijd) - tijdNaarMinuten(afspraak.beginTijd), 0)
    const eindMin = Math.min(tijdNaarMinuten(nieuweBeginTijd) + duur, 24 * 60 - 1)
    const bijgewerkt: Afspraak = {
      ...afspraak,
      datum: nieuweDatum,
      beginTijd: nieuweBeginTijd,
      eindTijd: minutenNaarTijd(eindMin),
    }
    setAfspraken(prev => slaAfspraakOp(bijgewerkt, prev))
    if (gebruiker) {
      try { await slaAfspraakOpInSupabase(bijgewerkt, gebruiker.id) }
      catch (err) { console.error('Supabase verplaats sync mislukt:', err) }
    }
  }

  // Zoekresultaat: navigeer naar de datum van het event én open het meteen.
  function kiesZoekresultaat(afspraak: Afspraak) {
    setZoekOpen(false)
    const [y, m, d] = afspraak.datum.split('-').map(Number)
    setHuidigeDatum(new Date(y, m - 1, d))
    openBewerkAfspraak(afspraak)
  }

  // Zoekresultaat (verjaardag): navigeer naar de eerstvolgende editie en open de editor.
  function kiesZoekVerjaardag(v: Verjaardag) {
    setZoekOpen(false)
    setHuidigeDatum(eerstvolgendeVerjaardag(v, new Date()))
    openBewerkVerjaardag(v)
  }

  // ── Afspraak CRUD ────────────────────────────────────────────────────────────

  function openNieuwAfspraak(datum?: Date, beginTijd?: string) {
    setVooringevuldDatum(datum ?? huidigeDatum)
    setVooringevuldTijd(beginTijd)
    setBewerkAfspraak(null)
    setFormulierOpen(true)
  }

  function openBewerkAfspraak(afspraak: Afspraak) {
    // Feestdagen zijn read-only: klikken doet niets (geen bewerken/verwijderen).
    if (isFeestdagEvent(afspraak.id)) return
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

  // Profielfoto uit user_metadata (data-URL); na supabase.auth.updateUser()
  // vuurt USER_UPDATED → setGebruiker → alle avatar-plekken verversen vanzelf.
  const avatarUrl = (gebruiker.user_metadata?.avatar_data_url as string | undefined) ?? null

  return (
    <div className="flex flex-row h-full bg-white">
      {/* Desktop-zijbalk — verborgen op mobiel */}
      <Sidebar
        begroeting={begroeting}
        huidigeDatum={huidigeDatum}
        afspraken={afspraken}
        onDagKlik={gaNaarDatum}
        onFilters={() => setFilterMenuOpen(true)}
        onVerjaardagen={() => setVerjaardagKeuzeOpen(true)}
        onLabels={() => setLabelBeheerOpen(true)}
      />

      {/* Rechterkolom: TopBar + banner + views + BottomBar.
          min-w-0 is essentieel: anders kan deze flex-child niet krimpen en breken truncate/overflow. */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <TopBar
          weergave={weergave}
          onWeergaveChange={wijzigWeergave}
          titel={getTitel()}
          onVorige={navigeerVorige}
          onVolgende={navigeerVolgende}
          onVandaag={gaNaarVandaag}
          onNieuw={() => openNieuwAfspraak()}
          onZoek={() => setZoekOpen(true)}
          onMenu={() => setMobielMenuOpen(true)}
          onProfielMenu={() => setProfielMenuOpen(true)}
          gebruikerEmail={gebruiker.email ?? ''}
          avatarUrl={avatarUrl}
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

        {/* Swipe-navigatie via touch-events (zie uitleg in useSwipe.ts); touch-pan-y
            voorkomt dat Android Chrome horizontale drags als native gesture claimt. */}
        <main className="flex-1 overflow-hidden touch-pan-y" {...swipeHandlers}>
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
              werkuren={werkUren}
              onVerplaats={verplaatsAfspraak}
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
              werkuren={werkUren}
              begroeting={begroeting}
              onVerplaats={verplaatsAfspraak}
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
          onWeergaveChange={wijzigWeergave}
          onProfielMenu={() => setProfielMenuOpen(true)}
          email={gebruiker.email ?? ''}
          avatarUrl={avatarUrl}
        />
      </div>

      {/* Mobiel off-canvas menu — opent via de hamburger in de TopBar */}
      <MobielMenu
        open={mobielMenuOpen}
        onSluit={() => setMobielMenuOpen(false)}
        onZoek={() => setZoekOpen(true)}
        onFilters={() => setFilterMenuOpen(true)}
        onVerjaardagen={() => setVerjaardagKeuzeOpen(true)}
        onLabels={() => setLabelBeheerOpen(true)}
      />

      <ZoekModal
        open={zoekOpen}
        afspraken={afspraken}
        verjaardagen={verjaardagen}
        labels={labels}
        onKies={kiesZoekresultaat}
        onKiesVerjaardag={kiesZoekVerjaardag}
        onSluit={() => setZoekOpen(false)}
      />

      <AfspraakFormulier
        open={formulierOpen}
        afspraak={bewerkAfspraak}
        labels={labels}
        afspraken={afspraken}
        initiaalDatum={vooringevuldDatum ?? huidigeDatum}
        initiaalTijd={vooringevuldTijd}
        voorkeuren={voorkeuren}
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
        avatarUrl={avatarUrl}
        onInstellingen={() => setInstellingenOpen(true)}
        onUitloggen={uitloggen}
        onSluit={() => setProfielMenuOpen(false)}
      />

      <InstellingenMenu
        open={instellingenOpen}
        email={gebruiker.email ?? ''}
        avatarUrl={avatarUrl}
        voorkeuren={voorkeuren}
        onSluit={() => setInstellingenOpen(false)}
      />

      <FilterMenu
        open={filterMenuOpen}
        filters={filters}
        onWijzig={wijzigFilter}
        onSluit={() => setFilterMenuOpen(false)}
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
