'use client'

import { useState } from 'react'
import { Bell, BellOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  open: boolean
  onSluit: () => void
}

type TestStatus = 'idle' | 'laden' | 'ok' | 'fout'

export default function InstellingenPanel({ open, onSluit }: Props) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [foutTekst, setFoutTekst]   = useState('')

  if (!open) return null

  const notifStatus = typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission
    : 'unsupported'

  async function stuurTestMelding() {
    setTestStatus('laden')
    setFoutTekst('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Niet ingelogd')

      const resp = await fetch('/api/push/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await resp.json()
      if (!resp.ok) throw new Error(json.error || `HTTP ${resp.status}`)

      setTestStatus('ok')
      setTimeout(() => setTestStatus('idle'), 3000)
    } catch (err) {
      setFoutTekst(err instanceof Error ? err.message : 'Onbekende fout')
      setTestStatus('fout')
      setTimeout(() => setTestStatus('idle'), 5000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onSluit} />

      <div className="relative w-full sm:w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100 shrink-0">
          <div className="w-20" />
          <h2 className="text-[15px] font-semibold text-gray-900">Instellingen</h2>
          <button onClick={onSluit} className="text-[#007AFF] text-sm font-semibold w-20 text-right">
            Gereed
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wide px-1">
            Notificaties
          </p>

          <div className="bg-gray-50 rounded-xl overflow-hidden divide-y divide-gray-200">
            {/* Status rij */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                {notifStatus === 'granted'
                  ? <Bell size={16} className="text-[#34C759] shrink-0" />
                  : <BellOff size={16} className="text-gray-400 shrink-0" />
                }
                <span className="text-[15px] text-gray-800">Push meldingen</span>
              </div>
              <span className={[
                'text-[13px] font-medium',
                notifStatus === 'granted' ? 'text-[#34C759]' : 'text-gray-400',
              ].join(' ')}>
                {notifStatus === 'granted' ? 'Aan'
                  : notifStatus === 'denied' ? 'Geweigerd'
                  : notifStatus === 'unsupported' ? 'Niet beschikbaar'
                  : 'Uit'}
              </span>
            </div>

            {/* Test-knop (alleen als meldingen aan staan) */}
            {notifStatus === 'granted' && (
              <div className="px-4 py-3">
                <button
                  onClick={stuurTestMelding}
                  disabled={testStatus === 'laden'}
                  className="w-full flex items-center justify-center gap-2 bg-[#007AFF] text-white rounded-xl py-2.5 text-[15px] font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60"
                >
                  {testStatus === 'laden' && <Loader2 size={16} className="animate-spin" />}
                  {testStatus === 'ok'    && <CheckCircle size={16} />}
                  {testStatus === 'fout'  && <AlertCircle size={16} />}
                  {testStatus === 'laden' ? 'Versturen…'
                    : testStatus === 'ok' ? 'Verstuurd!'
                    : testStatus === 'fout' ? 'Mislukt'
                    : 'Test melding versturen'}
                </button>
                {testStatus === 'fout' && foutTekst && (
                  <p className="text-red-500 text-[12px] text-center mt-2">{foutTekst}</p>
                )}
              </div>
            )}

            {/* Uitleg als meldingen uit staan */}
            {notifStatus !== 'granted' && notifStatus !== 'unsupported' && (
              <div className="px-4 py-3">
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  {notifStatus === 'denied'
                    ? 'Je hebt meldingen geweigerd. Zet ze aan via de browserinstellingen.'
                    : 'Sluit dit venster en klik op "Meldingen aanzetten" in de blauwe banner.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
