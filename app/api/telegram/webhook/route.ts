import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verstuurTelegram } from '@/lib/telegram'

export const runtime = 'nodejs'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// Telegram POST't elke update hierheen. Beveiliging: Telegram stuurt het bij
// setWebhook ingestelde secret mee als header; alleen calls met het juiste
// secret worden verwerkt. We antwoorden altijd 200 op echte Telegram-calls,
// zodat Telegram niet onnodig opnieuw probeert.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse('forbidden', { status: 403 })
  }

  const update = await req.json().catch(() => null)
  const msg = update?.message
  const chatId = msg?.chat?.id
  const tekst: string = msg?.text ?? ''
  if (!chatId) return NextResponse.json({ ok: true })

  const chat = String(chatId)
  const match = tekst.match(/^\/start(?:\s+(\S+))?/)

  // Geen /start-commando: laat een korte hint achter.
  if (!match) {
    await verstuurTelegram(chat, 'Open de agenda-app en kies "Telegram koppelen" om reminders hier te ontvangen.')
    return NextResponse.json({ ok: true })
  }

  const code = match[1]
  if (!code) {
    await verstuurTelegram(chat, 'Geen koppelcode meegestuurd. Start de koppeling vanuit de agenda-app.')
    return NextResponse.json({ ok: true })
  }

  // Claim de code atomisch: alleen als hij bestaat, nog niet gebruikt is én niet verlopen.
  // De update slaagt voor exact één aanroep → geen dubbele koppeling bij dubbel /start.
  const { data: geclaimd } = await admin
    .from('telegram_koppelcodes')
    .update({ gebruikt: true })
    .eq('code', code)
    .eq('gebruikt', false)
    .gt('verloopt_op', new Date().toISOString())
    .select('user_id')
    .maybeSingle()

  if (!geclaimd) {
    await verstuurTelegram(chat, '⛔️ Deze koppelcode is ongeldig of verlopen. Vraag een nieuwe aan in de app.')
    return NextResponse.json({ ok: true })
  }

  const { error: upsertErr } = await admin.from('telegram_accounts').upsert({
    user_id: geclaimd.user_id,
    chat_id: chat,
    telegram_username: msg?.chat?.username ?? null,
    actief: true,
    gekoppeld_op: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (upsertErr) {
    console.error('[telegram] koppelen mislukt:', upsertErr.code, upsertErr.message)
    await verstuurTelegram(chat, 'Er ging iets mis bij het koppelen. Probeer het later opnieuw.')
    return NextResponse.json({ ok: true })
  }

  await verstuurTelegram(chat, '✅ Gekoppeld! Je ontvangt je reminders vanaf nu hier in Telegram.')
  return NextResponse.json({ ok: true })
}
