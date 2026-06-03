import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verstuurTelegram } from '@/lib/telegram'

export const runtime = 'nodejs'

function clientMetToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

// Stuurt een testbericht naar de gekoppelde Telegram-chat van de ingelogde
// gebruiker, zodat de koppeling te verifiëren is zonder op een echt event te
// wachten. De chat_id blijft server-side (RLS staat de eigen rij toe) en wordt
// nooit naar de client teruggestuurd.
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const supabase = clientMetToken(token)
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Ongeldig token' }, { status: 401 })

  const { data, error: dbErr } = await supabase
    .from('telegram_accounts')
    .select('chat_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (dbErr) {
    console.error('[telegram/test] account ophalen mislukt:', dbErr.code)
    return NextResponse.json({ error: 'Kon koppelstatus niet ophalen' }, { status: 500 })
  }
  if (!data?.chat_id) {
    return NextResponse.json({ error: 'Telegram is niet gekoppeld' }, { status: 400 })
  }

  const ok = await verstuurTelegram(
    String(data.chat_id),
    '🔔 <b>Testbericht</b>\nJe Telegram-reminders werken — je ontvangt je herinneringen vanaf nu hier.',
  )
  if (!ok) {
    return NextResponse.json(
      { error: 'Versturen mislukt. Is de bot geblokkeerd of het token onjuist?' },
      { status: 502 }
    )
  }

  return NextResponse.json({ verstuurd: true })
}
