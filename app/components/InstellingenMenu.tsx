'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail, Send, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  open: boolean
  email: string
  onSluit: () => void
}

// Tabs staan in een array zodat er later eenvoudig instellingstabjes bij kunnen.
const TABS = [
  { id: 'notificaties', label: 'Notificaties' },
] as const
type TabId = (typeof TABS)[number]['id']

export default function InstellingenMenu({ open, email, onSluit }: Props) {
  const [actieveTab, setActieveTab] = useState<TabId>('notificaties')

  const [emailTestStatus, setEmailTestStatus] = useState<'idle' | 'laden' | 'ok' | 'fout'>('idle')
  const [emailTestFout, setEmailTestFout] = useState('')

  const [tgStatus, setTgStatus] = useState<'laden' | 'niet' | 'gekoppeld'>('laden')
  const [tgUsername, setTgUsername] = useState<string | null>(null)
  const [tgActief, setTgActief] = useState(true)
  const [tgActiefBezig, setTgActiefBezig] = useState(false)
  const [tgBezig, setTgBezig] = useState(false)
  const [tgFout, setTgFout] = useState('')
  const [tgTestStatus, setTgTestStatus] = useState<'idle' | 'laden' | 'ok' | 'fout'>('idle')
  const [tgTestFout, setTgTestFout] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // Bij openen status ophalen; bij sluiten een lopende poll netjes stoppen.
  useEffect(() => {
    // setState gebeurt pas ná de fetch (async), niet synchroon in de effect-body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) haalTgStatus()
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[480px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <div className="w-16" />
          <h2 className="text-[15px] font-semibold text-gray-900">Instellingen</h2>
          <button onClick={onSluit} className="w-16 flex justify-end text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 pt-2 border-b border-gray-100 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActieveTab(tab.id)}
              className={[
                'px-3 py-2 text-[14px] font-medium border-b-2 -mb-px transition-colors',
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
          {actieveTab === 'notificaties' && (
            <div className="flex flex-col gap-4">
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
