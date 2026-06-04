import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function clientMetToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

async function gebruikerUit(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { error: NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 }) }
  const supabase = clientMetToken(token)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { error: NextResponse.json({ error: 'Ongeldig token' }, { status: 401 }) }
  return { supabase, user }
}

// Status van de Telegram-koppeling van de ingelogde gebruiker.
export async function GET(req: NextRequest) {
  const { supabase, user, error } = await gebruikerUit(req)
  if (error) return error

  const { data, error: dbErr } = await supabase
    .from('telegram_accounts')
    .select('telegram_username, actief')
    .eq('user_id', user.id)
    .maybeSingle()

  // Ontbrekende tabel (pre-migratie) → behandel als "niet gekoppeld".
  if (dbErr && dbErr.code !== 'PGRST116') {
    console.error('[telegram] status ophalen mislukt:', dbErr.code, dbErr.message)
  }

  return NextResponse.json({
    gekoppeld: !!data,
    telegramUsername: data?.telegram_username ?? null,
    actief: data?.actief ?? false,
  })
}

// Globale voorkeur (Fase 3): Telegram-reminders aan/uit zetten.
export async function PATCH(req: NextRequest) {
  const { supabase, user, error } = await gebruikerUit(req)
  if (error) return error

  let actief: unknown
  try {
    ({ actief } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  }
  if (typeof actief !== 'boolean') {
    return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  }

  const { data, error: updErr } = await supabase
    .from('telegram_accounts')
    .update({ actief })
    .eq('user_id', user.id)
    .select('actief')
    .maybeSingle()

  if (updErr) {
    console.error('[telegram] voorkeur opslaan mislukt:', updErr.code, updErr.message)
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Telegram is niet gekoppeld' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, actief: data.actief })
}

// Ontkoppelen: verwijdert de chat_id-koppeling van de ingelogde gebruiker.
export async function DELETE(req: NextRequest) {
  const { supabase, user, error } = await gebruikerUit(req)
  if (error) return error

  const { error: delErr } = await supabase.from('telegram_accounts').delete().eq('user_id', user.id)
  if (delErr) {
    console.error('[telegram] ontkoppelen mislukt:', delErr.code, delErr.message)
    return NextResponse.json({ error: 'Ontkoppelen mislukt' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
