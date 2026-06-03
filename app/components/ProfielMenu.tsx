'use client'

import { useEffect, useRef, useState } from 'react'
import { LogOut, Mail, Send, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  open: boolean
  email: string
  onUitloggen: () => void
  onSluit: () => void
}

export default function ProfielMenu({ open, email, onUitloggen, onSluit }: Props) {
  const [emailTestStatus, setEmailTestStatus] = useState<'idle' | 'laden' | 'ok' | 'fout'>('idle')
  const [emailTestFout, setEmailTestFout] = useState('')

  const [tgStatus, setTgStatus] = useState<'laden' | 'niet' | 'gekoppeld'>('laden')
  const [tgUsername, setTgUsername] = useState<string | null>(null)
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
      if (res.ok && j.gekoppeld) { setTgStatus('gekoppeld'); setTgUsername(j.telegramUsername); return true }
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

  if (!open) return null

  const prefix = email.split('@')[0] ?? ''
  const naam   = prefix.charAt(0).toUpperCase() + prefix.slice(1)
  const initiaal = naam[0] ?? '?'

  async function stuurTestEmail() {
    setEmailTestStatus('laden')
    setEmailTestFout('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { setEmailTestStatus('fout'); setEmailTestFout('Niet ingelogd'); return }
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (!res.ok) { setEmailTestStatus('fout'); setEmailTestFout(json.error ?? 'Onbekende fout'); return }
      setEmailTestStatus('ok')
    } catch {
      setEmailTestStatus('fout')
      setEmailTestFout('Netwerkfout')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end p-0 sm:p-2 sm:pt-14">
      <div className="absolute inset-0 bg-black/20" onClick={onSluit} />

      <div className="relative w-full sm:w-72 bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100">
          <div className="w-16" />
          <h2 className="text-[15px] font-semibold text-gray-900">Profiel</h2>
          <button onClick={onSluit} className="w-16 flex justify-end text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Avatar + info */}
        <div className="flex flex-col items-center gap-2 px-4 py-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-[#007AFF] flex items-center justify-center text-white text-2xl font-bold select-none">
            {initiaal}
          </div>
          <p className="text-[17px] font-semibold text-gray-900">{naam}</p>
          <p className="text-[13px] text-gray-400">{email}</p>
        </div>

        {/* Test e-mail */}
        <div className="px-4 pt-4 pb-0">
          <button
            onClick={stuurTestEmail}
            disabled={emailTestStatus === 'laden'}
            className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
          >
            <Mail size={16} />
            {emailTestStatus === 'laden' ? 'Versturen…' : 'Test e-mailreminder sturen'}
          </button>
          {emailTestStatus === 'ok' && (
            <p className="text-[12px] text-green-600 text-center mt-2">Verstuurd naar {email}</p>
          )}
          {emailTestStatus === 'fout' && (
            <p className="text-[12px] text-red-500 text-center mt-2">{emailTestFout}</p>
          )}
        </div>

        {/* Telegram koppelen */}
        <div className="px-4 pt-4 pb-0">
          {tgStatus === 'gekoppeld' ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center gap-2 text-[13px] text-green-600">
                <Send size={15} />
                <span>Telegram gekoppeld{tgUsername ? ` (@${tgUsername})` : ''}</span>
              </div>
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
          {tgFout && <p className="text-[12px] text-red-500 text-center mt-2">{tgFout}</p>}
        </div>

        {/* Uitloggen */}
        <div className="p-4">
          <button
            onClick={() => { onUitloggen(); onSluit() }}
            className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl py-3 text-[15px] font-medium transition-colors"
          >
            <LogOut size={16} />
            Uitloggen
          </button>
        </div>
      </div>
    </div>
  )
}
