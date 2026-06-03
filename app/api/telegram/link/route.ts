import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

// Hoe lang een koppelcode geldig is (kortlevend = veiliger).
const GELDIGHEID_MIN = 10

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

function clientMetToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

// Genereert een unieke, kortlevende koppelcode en geeft een Telegram-deeplink terug.
// De code wordt via de service-role opgeslagen (clients hebben geen directe toegang
// tot de codes-tabel); de webhook wisselt 'm later in voor een chat_id.
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const supabase = clientMetToken(token)
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Ongeldig token' }, { status: 401 })

  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
  if (!username) {
    return NextResponse.json({ error: 'Telegram-bot niet geconfigureerd' }, { status: 503 })
  }

  // base64url van 9 bytes = 12 url-veilige tekens (toegestaan in Telegram's start-parameter).
  const code = randomBytes(9).toString('base64url')
  const verlooptOp = new Date(Date.now() + GELDIGHEID_MIN * 60_000).toISOString()

  // Oude, nog ongebruikte codes van deze gebruiker opruimen (één actieve code tegelijk).
  await admin.from('telegram_koppelcodes').delete().eq('user_id', user.id).eq('gebruikt', false)

  const { error: insErr } = await admin.from('telegram_koppelcodes').insert({
    code,
    user_id: user.id,
    verloopt_op: verlooptOp,
    gebruikt: false,
  })
  if (insErr) {
    console.error('[telegram] koppelcode opslaan mislukt:', insErr.code, insErr.message)
    return NextResponse.json({ error: 'Kon koppelcode niet aanmaken' }, { status: 500 })
  }

  return NextResponse.json({
    deeplink: `https://t.me/${username}?start=${code}`,
    verlooptOp,
  })
}
