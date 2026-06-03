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
