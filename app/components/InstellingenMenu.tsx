'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, Camera, Mail, Send, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { subscribeerOpPush, afmeldenVanPush } from '@/lib/pushUtils'
import { verkleinNaarVierkantDataUrl } from '@/lib/afbeelding'
import { STANDAARD_VOORKEUREN, type DagoverzichtKanaal, type StartWeergave, type Voorkeuren } from '@/lib/voorkeuren'
import { zoekLocatie } from '@/lib/weer'
import Avatar from './Avatar'
import TijdKiezer from './TijdKiezer'

interface Props {
  open: boolean
  email: string
  avatarUrl?: string | null
  voorkeuren?: Voorkeuren
  onSluit: () => void
}

// Tabs staan in een array zodat er later eenvoudig instellingstabjes bij kunnen.
// De voorkeuren zijn verdeeld over drie tabs (Algemeen/Kalender/Dagoverzicht)
// zodat geen enkel tabblad te lang wordt; de tab-rij scrolt horizontaal op mobiel.
const TABS = [
  { id: 'algemeen',     label: 'Algemeen' },
  { id: 'kalender',     label: 'Kalender' },
  { id: 'dagoverzicht', label: 'Dagoverzicht' },
  { id: 'notificaties', label: 'Notificaties' },
  { id: 'account',      label: 'Account' },
] as const
type TabId = (typeof TABS)[number]['id']

export default function InstellingenMenu({ open, email, avatarUrl, voorkeuren = STANDAARD_VOORKEUREN, onSluit }: Props) {
  const [actieveTab, setActieveTab] = useState<TabId>('algemeen')

  const [vk, setVk] = useState<Voorkeuren>(voorkeuren)
  const [vkStatus, setVkStatus] = useState<'idle' | 'laden' | 'ok' | 'fout'>('idle')
  const [vkFout, setVkFout] = useState('')

  const [weerLocatieInvoer, setWeerLocatieInvoer] = useState(voorkeuren.weerLocatieNaam)
  const [locatieStatus, setLocatieStatus] = useState<'idle' | 'zoeken' | 'ok' | 'fout'>('idle')

  const [emailTestStatus, setEmailTestStatus] = useState<'idle' | 'laden' | 'ok' | 'fout'>('idle')
  const [emailTestFout, setEmailTestFout] = useState('')

  const [pushStatus, setPushStatus] = useState<'laden' | 'niet-ondersteund' | 'geblokkeerd' | 'uit' | 'aan'>('laden')
  const [pushBezig, setPushBezig] = useState(false)
  const [pushFout, setPushFout] = useState('')

  const [tgStatus, setTgStatus] = useState<'laden' | 'niet' | 'gekoppeld'>('laden')
  const [tgUsername, setTgUsername] = useState<string | null>(null)
  const [tgActief, setTgActief] = useState(true)
  const [tgActiefBezig, setTgActiefBezig] = useState(false)
  const [tgBezig, setTgBezig] = useState(false)
  const [tgFout, setTgFout] = useState('')
  const [tgTestStatus, setTgTestStatus] = useState<'idle' | 'laden' | 'ok' | 'fout'>('idle')
  const [tgTestFout, setTgTestFout] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [fotoStatus, setFotoStatus] = useState<'idle' | 'laden' | 'ok' | 'fout'>('idle')
  const [fotoFout, setFotoFout] = useState('')
  const fotoInputRef = useRef<HTMLInputElement | null>(null)

  const [wwNieuw, setWwNieuw]           = useState('')
  const [wwBevestig, setWwBevestig]     = useState('')
  const [wwStatus, setWwStatus]         = useState<'idle' | 'laden' | 'ok' | 'fout'>('idle')
  const [wwFout, setWwFout]             = useState('')

  async function token() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  // Haalt de koppelstatus op; geeft true terug als Telegram gekoppeld is.
  async function haalTgStatus(): Promise<boolean> {
    const t = await token()
    if (!t) { setTgStatus('niet'); return false }
    try {
      const res = await fetch('/api/telegram/status', { headers: { Authorization: `Bearer ${t}` } })
      const j = await res.json()
      if (res.ok && j.gekoppeld) {
        setTgStatus('gekoppeld'); setTgUsername(j.telegramUsername); setTgActief(j.actief ?? true)
        return true
      }
      setTgStatus('niet'); setTgUsername(null); return false
    } catch {
      setTgStatus('niet'); return false
    }
  }

  // Bepaalt de browser-meldingenstatus: ondersteund → permissie → actieve subscription.
  async function bepaalPushStatus() {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('niet-ondersteund')
      return
    }
    if (Notification.permission === 'denied') { setPushStatus('geblokkeerd'); return }
    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = reg ? await reg.pushManager.getSubscription() : null
        setPushStatus(sub ? 'aan' : 'uit')
        return
      } catch {
        // val door naar 'uit' — aanzetten maakt dan een nieuwe subscription
      }
    }
    setPushStatus('uit')
  }

  // Bij openen status ophalen en oude fotofeedback wissen; bij sluiten een
  // lopende poll netjes stoppen.
  useEffect(() => {
    // Bewuste reset bij openen (modal-open-conventie); tg/push-setState gebeurt pas ná de fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) { haalTgStatus(); bepaalPushStatus(); setFotoStatus('idle'); setFotoFout(''); setVk(voorkeuren); setVkStatus('idle'); setVkFout(''); setWwNieuw(''); setWwBevestig(''); setWwStatus('idle'); setWwFout(''); setWeerLocatieInvoer(voorkeuren.weerLocatieNaam); setLocatieStatus('idle') }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Meldingen aanzetten: permissie vragen (alleen vanuit 'uit', dus geen
  // herhaalde prompt bij 'geblokkeerd') en daarna subscriben + opslaan.
  async function zetMeldingenAan() {
    setPushFout(''); setPushBezig(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setPushStatus(perm === 'denied' ? 'geblokkeerd' : 'uit')
        return
      }
      const t = await token()
      if (!t) { setPushFout('Niet ingelogd'); return }
      if (await subscribeerOpPush(t)) setPushStatus('aan')
      else setPushFout('Meldingen aanzetten mislukt')
    } finally {
      setPushBezig(false)
    }
  }

  // Opt-out per apparaat: browser-subscription opzeggen + serverrij verwijderen.
  async function zetMeldingenUit() {
    setPushFout(''); setPushBezig(true)
    try {
      const t = await token()
      if (!t) { setPushFout('Niet ingelogd'); return }
      if (await afmeldenVanPush(t)) setPushStatus('uit')
      else setPushFout('Uitzetten mislukt')
    } finally {
      setPushBezig(false)
    }
  }

  async function startKoppelen() {
    setTgFout(''); setTgBezig(true)
    const t = await token()
    if (!t) { setTgBezig(false); setTgFout('Niet ingelogd'); return }
    try {
      const res = await fetch('/api/telegram/link', { method: 'POST', headers: { Authorization: `Bearer ${t}` } })
      const j = await res.json()
      if (!res.ok) { setTgBezig(false); setTgFout(j.error ?? 'Kon niet koppelen'); return }
      window.open(j.deeplink, '_blank', 'noopener')
      // Poll tot de webhook de koppeling heeft verwerkt (max ~2 min).
      let pogingen = 0
      pollRef.current = setInterval(async () => {
        pogingen++
        const ok = await haalTgStatus()
        if (ok || pogingen >= 40) {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          setTgBezig(false)
          if (!ok) setTgFout('Nog niet gekoppeld. Open de link en druk op Start in Telegram.')
        }
      }, 3000)
    } catch {
      setTgBezig(false); setTgFout('Netwerkfout')
    }
  }

  // Globale voorkeur: Telegram-reminders aan/uit (Fase 3). Bij fout draait de UI terug.
  async function wijzigTgActief() {
    if (tgActiefBezig) return
    const nieuw = !tgActief
    setTgFout(''); setTgActiefBezig(true); setTgActief(nieuw)
    const t = await token()
    if (!t) { setTgActief(!nieuw); setTgActiefBezig(false); setTgFout('Niet ingelogd'); return }
    try {
      const res = await fetch('/api/telegram/status', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ actief: nieuw }),
      })
      const j = await res.json()
      if (!res.ok) { setTgActief(!nieuw); setTgFout(j.error ?? 'Opslaan mislukt') }
    } catch {
      setTgActief(!nieuw); setTgFout('Netwerkfout')
    } finally {
      setTgActiefBezig(false)
    }
  }

  async function ontkoppel() {
    setTgFout('')
    const t = await token()
    if (!t) return
    try {
      await fetch('/api/telegram/status', { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } })
      setTgStatus('niet'); setTgUsername(null); setTgTestStatus('idle')
    } catch {
      setTgFout('Ontkoppelen mislukt')
    }
  }

  async function stuurTestTelegram() {
    setTgTestStatus('laden'); setTgTestFout('')
    const t = await token()
    if (!t) { setTgTestStatus('fout'); setTgTestFout('Niet ingelogd'); return }
    try {
      const res = await fetch('/api/telegram/test', { method: 'POST', headers: { Authorization: `Bearer ${t}` } })
      const j = await res.json()
      if (!res.ok) { setTgTestStatus('fout'); setTgTestFout(j.error ?? 'Versturen mislukt'); return }
      setTgTestStatus('ok')
    } catch {
      setTgTestStatus('fout'); setTgTestFout('Netwerkfout')
    }
  }

  async function stuurTestEmail() {
    setEmailTestStatus('laden'); setEmailTestFout('')
    const t = await token()
    if (!t) { setEmailTestStatus('fout'); setEmailTestFout('Niet ingelogd'); return }
    try {
      const res = await fetch('/api/email/test', { method: 'POST', headers: { Authorization: `Bearer ${t}` } })
      const json = await res.json()
      if (!res.ok) { setEmailTestStatus('fout'); setEmailTestFout(json.error ?? 'Onbekende fout'); return }
      setEmailTestStatus('ok')
    } catch {
      setEmailTestStatus('fout'); setEmailTestFout('Netwerkfout')
    }
  }

  // Voorkeuren: per wijziging direct opslaan in user_metadata (volledig object —
  // updateUser merged shallow op top-niveau). Optimistisch met rollback bij fout;
  // USER_UPDATED → AgendaApp ververst de voorkeuren-prop vanzelf.
  async function wijzigVoorkeur(patch: Partial<Voorkeuren>) {
    const oud = vk
    const nieuw = { ...vk, ...patch }
    setVk(nieuw); setVkStatus('laden'); setVkFout('')
    try {
      const { error } = await supabase.auth.updateUser({ data: { voorkeuren: nieuw } })
      if (error) { setVk(oud); setVkStatus('fout'); setVkFout('Opslaan mislukt. Probeer opnieuw.'); return }
      setVkStatus('ok')
    } catch {
      setVk(oud); setVkStatus('fout'); setVkFout('Netwerkfout')
    }
  }

  // Profielfoto: client-side verkleinen naar 256×256 JPEG en als data-URL in
  // user_metadata opslaan. USER_UPDATED → AgendaApp ververst de avatarUrl-prop.
  async function kiesFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''   // reset zodat dezelfde foto opnieuw kiesbaar is
    if (!file) return
    setFotoStatus('laden'); setFotoFout('')
    try {
      const dataUrl = await verkleinNaarVierkantDataUrl(file, 256)
      const { error } = await supabase.auth.updateUser({ data: { avatar_data_url: dataUrl } })
      if (error) { setFotoStatus('fout'); setFotoFout('Opslaan mislukt. Probeer opnieuw.'); return }
      setFotoStatus('ok')
    } catch (err) {
      setFotoStatus('fout')
      setFotoFout(err instanceof Error ? err.message : 'Er ging iets mis.')
    }
  }

  // Plaatsnaam → coördinaten via Open-Meteo Geocoding; bij succes alles in één
  // keer opslaan (naam + lat/lon). Alleen de vaste, hier ingestelde locatie
  // wordt gebruikt — nooit de device-locatie.
  async function zoekWeerLocatie() {
    const naam = weerLocatieInvoer.trim()
    if (!naam || naam === vk.weerLocatieNaam) return
    setLocatieStatus('zoeken')
    const gevonden = await zoekLocatie(naam)
    if (!gevonden) { setLocatieStatus('fout'); return }
    setWeerLocatieInvoer(gevonden.naam)
    setLocatieStatus('ok')
    wijzigVoorkeur({ weerLocatieNaam: gevonden.naam, weerLat: gevonden.lat, weerLon: gevonden.lon })
  }

  // Wachtwoord wijzigen via de ingelogde Supabase-sessie. Client-side validatie
  // vóór de call; wachtwoorden worden nooit gelogd of zelf opgeslagen.
  async function wijzigWachtwoord() {
    setWwFout('')
    if (wwNieuw.length < 6) { setWwStatus('fout'); setWwFout('Gebruik minimaal 6 tekens.'); return }
    if (wwNieuw !== wwBevestig) { setWwStatus('fout'); setWwFout('De wachtwoorden komen niet overeen.'); return }
    setWwStatus('laden')
    try {
      const { error } = await supabase.auth.updateUser({ password: wwNieuw })
      if (error) {
        setWwStatus('fout')
        // Bekendste Supabase-fouten netjes vertalen; anders generiek.
        setWwFout(
          error.message.includes('different from the old')
            ? 'Het nieuwe wachtwoord moet anders zijn dan het huidige.'
            : 'Wijzigen mislukt. Log opnieuw in en probeer het nog eens.'
        )
        return
      }
      setWwStatus('ok'); setWwNieuw(''); setWwBevestig('')
    } catch {
      setWwStatus('fout'); setWwFout('Netwerkfout. Probeer het opnieuw.')
    }
  }

  // updateUser doet een shallow merge op user_metadata: de sleutel expliciet
  // op null zetten verwijdert de foto zonder andere metadata te raken.
  async function verwijderFoto() {
    setFotoStatus('laden'); setFotoFout('')
    const { error } = await supabase.auth.updateUser({ data: { avatar_data_url: null } })
    if (error) { setFotoStatus('fout'); setFotoFout('Verwijderen mislukt.'); return }
    setFotoStatus('ok')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      {/* Breder op desktop zodat alle vijf tabs zonder scrollen passen */}
      <div className="relative w-full sm:w-[600px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <div className="w-16" />
          <h2 className="text-[15px] font-semibold text-gray-900">Instellingen</h2>
          <button onClick={onSluit} className="w-16 flex justify-end text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs — horizontaal scrollbaar (5 tabs passen niet op smalle schermen) */}
        <div className="flex items-center gap-1 px-3 pt-2 border-b border-gray-100 shrink-0 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActieveTab(tab.id)}
              className={[
                'px-3 py-2 text-[14px] font-medium border-b-2 -mb-px transition-colors shrink-0 whitespace-nowrap',
                actieveTab === tab.id
                  ? 'border-[#007AFF] text-[#007AFF]'
                  : 'border-transparent text-gray-500 hover:text-gray-800',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4">
          {(actieveTab === 'algemeen' || actieveTab === 'kalender' || actieveTab === 'dagoverzicht') && (
            <div className="flex flex-col gap-4">
              {actieveTab === 'algemeen' && (<>
              <section className="flex flex-col gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Kalender</h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-[15px] text-gray-800 shrink-0">Open kalender met</span>
                    <select
                      value={vk.startWeergave}
                      onChange={e => wijzigVoorkeur({ startWeergave: e.target.value as StartWeergave })}
                      disabled={vkStatus === 'laden'}
                      className="text-[15px] text-[#007AFF] outline-none bg-transparent text-right min-w-0"
                    >
                      <option value="auto">Automatisch</option>
                      <option value="laatst">Laatst gebruikt</option>
                      <option value="dag">Dag</option>
                      <option value="week">Week</option>
                      <option value="maand">Maand</option>
                      <option value="agenda">Agenda</option>
                    </select>
                  </div>
                </div>
                <p className="text-[12px] text-gray-400 px-1">
                  Automatisch = week op desktop en dag op mobiel. Laatst gebruikt onthoudt je keuze per apparaat.
                </p>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Nieuwe afspraken</h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-[15px] text-gray-800 shrink-0">Standaard herinnering</span>
                    <select
                      value={vk.standaardHerinnering}
                      onChange={e => wijzigVoorkeur({ standaardHerinnering: parseInt(e.target.value) })}
                      disabled={vkStatus === 'laden'}
                      className="text-[15px] text-[#007AFF] outline-none bg-transparent text-right min-w-0"
                    >
                      <option value={-1}>Geen</option>
                      <option value={0}>Bij aanvang</option>
                      <option value={5}>5 min van tevoren</option>
                      <option value={15}>15 min van tevoren</option>
                      <option value={30}>30 min van tevoren</option>
                      <option value={60}>1 uur van tevoren</option>
                      <option value={120}>2 uur van tevoren</option>
                      <option value={1440}>1 dag van tevoren</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 gap-3">
                    <span className="text-[15px] text-gray-800 shrink-0">Standaard duur</span>
                    <select
                      value={vk.standaardDuur}
                      onChange={e => wijzigVoorkeur({ standaardDuur: parseInt(e.target.value) })}
                      disabled={vkStatus === 'laden'}
                      className="text-[15px] text-[#007AFF] outline-none bg-transparent text-right min-w-0"
                    >
                      <option value={15}>15 minuten</option>
                      <option value={30}>30 minuten</option>
                      <option value={45}>45 minuten</option>
                      <option value={60}>1 uur</option>
                      <option value={90}>1,5 uur</option>
                      <option value={120}>2 uur</option>
                    </select>
                  </div>
                </div>
                <p className="text-[12px] text-gray-400 px-1">
                  Geldt alleen voor nieuwe afspraken; bestaande afspraken veranderen niet.
                </p>
              </section>
              </>)}

              {actieveTab === 'kalender' && (<>
              <section className="flex flex-col gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Werkuren</h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[15px] text-gray-800">Werkuren gebruiken</span>
                    <button
                      onClick={() => wijzigVoorkeur({ werkuren: !vk.werkuren })}
                      disabled={vkStatus === 'laden'}
                      className={[
                        'relative w-12 h-7 rounded-full transition-colors disabled:opacity-50',
                        vk.werkuren ? 'bg-[#34C759]' : 'bg-gray-300',
                      ].join(' ')}
                      aria-label="Werkuren gebruiken"
                      aria-pressed={vk.werkuren}
                    >
                      <span className={['absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-all', vk.werkuren ? 'left-[26px]' : 'left-[3px]'].join(' ')} />
                    </button>
                  </div>
                  {vk.werkuren && (
                    <>
                      <div className="flex items-center justify-between px-4 py-3 gap-3">
                        <span className="text-[15px] text-gray-800 shrink-0">Begin werkdag</span>
                        <TijdKiezer value={vk.werkurenStart} onChange={t => wijzigVoorkeur({ werkurenStart: t })} />
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 gap-3">
                        <span className="text-[15px] text-gray-800 shrink-0">Einde werkdag</span>
                        <TijdKiezer value={vk.werkurenEind} onChange={t => wijzigVoorkeur({ werkurenEind: t })} />
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[12px] text-gray-400 px-1">
                  Uren buiten je werkdag worden gedimd in de dag- en weekweergave.
                </p>
                {vk.werkuren && vk.werkurenStart >= vk.werkurenEind && (
                  <p className="text-[12px] text-red-500 px-1">
                    Begintijd moet voor de eindtijd liggen. De kalender gebruikt anders 09:00 tot 17:00.
                  </p>
                )}
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Weer</h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[15px] text-gray-800">Weer tonen in agenda</span>
                    <button
                      onClick={() => wijzigVoorkeur({ weer: !vk.weer })}
                      disabled={vkStatus === 'laden'}
                      className={[
                        'relative w-12 h-7 rounded-full transition-colors disabled:opacity-50',
                        vk.weer ? 'bg-[#34C759]' : 'bg-gray-300',
                      ].join(' ')}
                      aria-label="Weer tonen in agenda"
                      aria-pressed={vk.weer}
                    >
                      <span className={['absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-all', vk.weer ? 'left-[26px]' : 'left-[3px]'].join(' ')} />
                    </button>
                  </div>
                  {vk.weer && (
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <span className="text-[15px] text-gray-800 shrink-0">Locatie</span>
                      <input
                        type="text"
                        value={weerLocatieInvoer}
                        placeholder="Bijv. Rotterdam"
                        onChange={e => { setWeerLocatieInvoer(e.target.value); setLocatieStatus('idle') }}
                        onBlur={zoekWeerLocatie}
                        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        className="text-[15px] text-[#007AFF] outline-none bg-transparent text-right min-w-0 placeholder:text-gray-300"
                        aria-label="Locatie voor weersinformatie"
                      />
                    </div>
                  )}
                </div>
                {locatieStatus === 'zoeken' && (
                  <p className="text-[12px] text-gray-400 px-1">Zoeken…</p>
                )}
                {locatieStatus === 'fout' && (
                  <p className="text-[12px] text-red-500 px-1">Plaats niet gevonden. Probeer een andere naam.</p>
                )}
                {locatieStatus === 'ok' && (
                  <p className="text-[12px] text-green-600 px-1">Locatie ingesteld: {vk.weerLocatieNaam || weerLocatieInvoer}</p>
                )}
                {vk.weer && !vk.weerLat && locatieStatus === 'idle' && (
                  <p className="text-[12px] text-gray-400 px-1">Stel een locatie in om weer te zien.</p>
                )}
                <p className="text-[12px] text-gray-400 px-1">
                  Weersverwachting via Open-Meteo op basis van deze vaste locatie. Er wordt geen live locatie gevolgd.
                </p>
              </section>
              </>)}

              {actieveTab === 'dagoverzicht' && (
              <section className="flex flex-col gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Dagoverzicht</h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-[15px] text-gray-800">Dagoverzicht ontvangen</span>
                    <button
                      onClick={() => wijzigVoorkeur({ dagoverzicht: !vk.dagoverzicht })}
                      disabled={vkStatus === 'laden'}
                      className={[
                        'relative w-12 h-7 rounded-full transition-colors disabled:opacity-50',
                        vk.dagoverzicht ? 'bg-[#34C759]' : 'bg-gray-300',
                      ].join(' ')}
                      aria-label="Dagoverzicht ontvangen"
                      aria-pressed={vk.dagoverzicht}
                    >
                      <span className={['absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-all', vk.dagoverzicht ? 'left-[26px]' : 'left-[3px]'].join(' ')} />
                    </button>
                  </div>
                  {vk.dagoverzicht && (
                    <>
                      <div className="flex items-center justify-between px-4 py-3 gap-3">
                        <span className="text-[15px] text-gray-800 shrink-0">Kanaal</span>
                        <select
                          value={vk.dagoverzichtKanaal}
                          onChange={e => wijzigVoorkeur({ dagoverzichtKanaal: e.target.value as DagoverzichtKanaal })}
                          disabled={vkStatus === 'laden'}
                          className="text-[15px] text-[#007AFF] outline-none bg-transparent text-right min-w-0"
                        >
                          <option value="telegram">Telegram</option>
                          <option value="email">E-mail</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 gap-3">
                        <span className="text-[15px] text-gray-800 shrink-0">Tijd</span>
                        <select
                          value={vk.dagoverzichtTijd}
                          onChange={e => wijzigVoorkeur({ dagoverzichtTijd: e.target.value })}
                          disabled={vkStatus === 'laden'}
                          className="text-[15px] text-[#007AFF] outline-none bg-transparent text-right min-w-0"
                        >
                          {Array.from({ length: 48 }, (_, i) => {
                            const t = `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`
                            return <option key={t} value={t}>{t}</option>
                          })}
                        </select>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 gap-3">
                        <span className="text-[15px] text-gray-800 shrink-0">Naam</span>
                        <input
                          type="text"
                          value={vk.naam}
                          maxLength={40}
                          placeholder="Voor de begroeting"
                          onChange={e => setVk(v => ({ ...v, naam: e.target.value }))}
                          onBlur={e => wijzigVoorkeur({ naam: e.target.value.trim().slice(0, 40) })}
                          className="text-[15px] text-[#007AFF] outline-none bg-transparent text-right min-w-0 placeholder:text-gray-300"
                        />
                      </div>
                    </>
                  )}
                </div>
                <p className="text-[12px] text-gray-400 px-1">
                  Ontvang elke ochtend een kort overzicht van je afspraken en verjaardagen.
                </p>
                {vk.dagoverzicht && vk.dagoverzichtKanaal === 'telegram' && tgStatus === 'niet' && (
                  <p className="text-[12px] text-red-500 px-1">
                    Telegram is nog niet gekoppeld (tabblad Notificaties). Zonder koppeling wordt er niets verstuurd.
                  </p>
                )}
              </section>
              )}

              {/* Opslaan-status — gedeeld door de drie voorkeuren-tabs */}
              {vkStatus === 'ok' && (
                <p className="text-[12px] text-green-600 text-center">Voorkeuren opgeslagen</p>
              )}
              {vkStatus === 'fout' && (
                <p className="text-[12px] text-red-500 text-center">{vkFout}</p>
              )}
            </div>
          )}

          {actieveTab === 'notificaties' && (
            <div className="flex flex-col gap-4">
              {/* Browser-meldingen (web-push) */}
              <section className="flex flex-col gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Meldingen</h3>

                {pushStatus === 'niet-ondersteund' && (
                  <p className="text-[13px] text-gray-400 text-center px-2">
                    Browser-meldingen worden op dit apparaat niet ondersteund.
                  </p>
                )}

                {pushStatus === 'geblokkeerd' && (
                  <p className="text-[13px] text-gray-500 text-center px-2">
                    Meldingen zijn geblokkeerd voor deze site. Zet ze aan via de
                    site-instellingen van je browser en open dit menu opnieuw.
                  </p>
                )}

                {(pushStatus === 'uit' || pushStatus === 'laden') && (
                  <button
                    onClick={zetMeldingenAan}
                    disabled={pushBezig || pushStatus === 'laden'}
                    className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
                  >
                    <Bell size={16} />
                    {pushBezig ? 'Bezig…' : 'Meldingen aanzetten'}
                  </button>
                )}

                {pushStatus === 'aan' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-center gap-2 text-[13px] text-green-600">
                      <Bell size={15} />
                      <span>Meldingen staan aan op dit apparaat</span>
                    </div>
                    <button
                      onClick={zetMeldingenUit}
                      disabled={pushBezig}
                      className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
                    >
                      {pushBezig ? 'Bezig…' : 'Uitzetten op dit apparaat'}
                    </button>
                  </div>
                )}

                {pushFout && <p className="text-[12px] text-red-500 text-center">{pushFout}</p>}

                <p className="text-[12px] text-gray-400 px-1">
                  Reminders komen als browser-melding binnen zolang Telegram niet
                  actief is; staat Telegram aan, dan vervangt Telegram de melding.
                </p>
              </section>

              {/* E-mailreminders */}
              <section className="flex flex-col gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">E-mail</h3>
                <button
                  onClick={stuurTestEmail}
                  disabled={emailTestStatus === 'laden'}
                  className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
                >
                  <Mail size={16} />
                  {emailTestStatus === 'laden' ? 'Versturen…' : 'Test e-mailreminder sturen'}
                </button>
                {emailTestStatus === 'ok' && (
                  <p className="text-[12px] text-green-600 text-center">Verstuurd naar {email}</p>
                )}
                {emailTestStatus === 'fout' && (
                  <p className="text-[12px] text-red-500 text-center">{emailTestFout}</p>
                )}
              </section>

              {/* Telegram */}
              <section className="flex flex-col gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Telegram</h3>
                {tgStatus === 'gekoppeld' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-center gap-2 text-[13px] text-green-600">
                      <Send size={15} />
                      <span>Telegram gekoppeld{tgUsername ? ` (@${tgUsername})` : ''}</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                      <span className="text-[15px] text-gray-800">Telegram-reminders</span>
                      <button
                        onClick={wijzigTgActief}
                        disabled={tgActiefBezig}
                        className={[
                          'relative w-12 h-7 rounded-full transition-colors disabled:opacity-50',
                          tgActief ? 'bg-[#34C759]' : 'bg-gray-300',
                        ].join(' ')}
                        aria-label="Telegram-reminders"
                        aria-pressed={tgActief}
                      >
                        <span className={['absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-all', tgActief ? 'left-[26px]' : 'left-[3px]'].join(' ')} />
                      </button>
                    </div>
                    <p className="text-[12px] text-gray-400 px-1">
                      Uit = reminders via browser-push in plaats van Telegram; e-mail blijft altijd.
                    </p>
                    <button
                      onClick={stuurTestTelegram}
                      disabled={tgTestStatus === 'laden'}
                      className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
                    >
                      <Send size={16} />
                      {tgTestStatus === 'laden' ? 'Versturen…' : 'Stuur testbericht'}
                    </button>
                    {tgTestStatus === 'ok' && (
                      <p className="text-[12px] text-green-600 text-center">Testbericht verstuurd naar Telegram</p>
                    )}
                    {tgTestStatus === 'fout' && (
                      <p className="text-[12px] text-red-500 text-center">{tgTestFout}</p>
                    )}
                    <button
                      onClick={ontkoppel}
                      className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
                    >
                      Telegram ontkoppelen
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startKoppelen}
                    disabled={tgBezig || tgStatus === 'laden'}
                    className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
                  >
                    <Send size={16} />
                    {tgBezig ? 'Wacht op koppeling…' : 'Telegram koppelen'}
                  </button>
                )}
                {tgFout && <p className="text-[12px] text-red-500 text-center">{tgFout}</p>}
              </section>

              {/* Privacybeleid */}
              <p className="text-center pt-1">
                <Link href="/privacy" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
                  Privacybeleid
                </Link>
              </p>
            </div>
          )}

          {actieveTab === 'account' && (
            <div className="flex flex-col gap-4">
              <section className="flex flex-col items-center gap-3">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400 self-start">Profielfoto</h3>

                {/* Preview — foto of initiaal-fallback */}
                <Avatar email={email} avatarUrl={avatarUrl} className="w-24 h-24" tekstKlasse="text-3xl" />

                <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={kiesFoto} />

                <button
                  onClick={() => fotoInputRef.current?.click()}
                  disabled={fotoStatus === 'laden'}
                  className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
                >
                  <Camera size={16} />
                  {fotoStatus === 'laden' ? 'Bezig…' : 'Foto kiezen'}
                </button>

                {avatarUrl && (
                  <button
                    onClick={verwijderFoto}
                    disabled={fotoStatus === 'laden'}
                    className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
                  >
                    Foto verwijderen
                  </button>
                )}

                {fotoStatus === 'ok' && (
                  <p className="text-[12px] text-green-600 text-center">Profielfoto bijgewerkt</p>
                )}
                {fotoStatus === 'fout' && (
                  <p className="text-[12px] text-red-500 text-center">{fotoFout}</p>
                )}

                <p className="text-[12px] text-gray-400 px-1 text-center">
                  De foto wordt vierkant bijgesneden en verkleind (max 10 MB). JPG of PNG werkt het best.
                </p>
              </section>

              {/* Wachtwoord wijzigen */}
              <section className="flex flex-col gap-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">Wachtwoord</h3>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <input
                    type="password"
                    value={wwNieuw}
                    onChange={e => setWwNieuw(e.target.value)}
                    placeholder="Nieuw wachtwoord"
                    autoComplete="new-password"
                    aria-label="Nieuw wachtwoord"
                    className="w-full text-[15px] outline-none bg-transparent placeholder:text-gray-400"
                  />
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <input
                    type="password"
                    value={wwBevestig}
                    onChange={e => setWwBevestig(e.target.value)}
                    placeholder="Herhaal nieuw wachtwoord"
                    autoComplete="new-password"
                    aria-label="Herhaal nieuw wachtwoord"
                    className="w-full text-[15px] outline-none bg-transparent placeholder:text-gray-400"
                    onKeyDown={e => e.key === 'Enter' && wijzigWachtwoord()}
                  />
                </div>
                <button
                  onClick={wijzigWachtwoord}
                  disabled={wwStatus === 'laden' || !wwNieuw || !wwBevestig}
                  className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
                >
                  {wwStatus === 'laden' ? 'Bezig…' : 'Wachtwoord wijzigen'}
                </button>
                {wwStatus === 'ok' && (
                  <p className="text-[12px] text-green-600 text-center">Wachtwoord gewijzigd</p>
                )}
                {wwStatus === 'fout' && (
                  <p className="text-[12px] text-red-500 text-center">{wwFout}</p>
                )}
                <p className="text-[12px] text-gray-400 px-1">
                  Minimaal 6 tekens. Je blijft ingelogd na het wijzigen.
                </p>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
