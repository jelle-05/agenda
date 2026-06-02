import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const runtime = 'nodejs'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_SUBJECT}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

export async function GET(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Huidige tijd in Amsterdam-tijdzone
  const nu = new Date()
  const amNu = new Date(nu.toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }))
  const nuMinuten = amNu.getHours() * 60 + amNu.getMinutes()
  const vandaag = [
    amNu.getFullYear(),
    String(amNu.getMonth() + 1).padStart(2, '0'),
    String(amNu.getDate()).padStart(2, '0'),
  ].join('-')

  const { data: afspraken, error } = await supabaseAdmin
    .from('afspraken')
    .select('id, user_id, titel, begin_tijd, herinnering_minuten')
    .eq('datum', vandaag)
    .eq('heeldag', false)
    .gte('herinnering_minuten', 0)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!afspraken?.length) return NextResponse.json({ ok: true, verstuurd: 0 })

  let verstuurd = 0

  for (const afspraak of afspraken) {
    if (!afspraak.begin_tijd) continue
    const [uur, min] = afspraak.begin_tijd.split(':').map(Number)
    const afspraakMin = uur * 60 + min
    const herinneringMin = afspraakMin - (afspraak.herinnering_minuten ?? 0)

    // Schiet af binnen een venster van 1 minuut
    if (herinneringMin < nuMinuten || herinneringMin > nuMinuten + 1) continue

    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', afspraak.user_id)

    if (!subs?.length) continue

    const rm = afspraak.herinnering_minuten ?? 0
    const tijdTekst = rm === 0 ? 'Nu gepland'
      : rm < 60 ? `Over ${rm} min`
      : `Over ${rm / 60} uur`

    const payload = JSON.stringify({
      titel:   `📅 ${afspraak.titel}`,
      bericht: `${tijdTekst} — ${afspraak.begin_tijd.slice(0, 5)}`,
      id:      afspraak.id,
    })

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        verstuurd++
      } catch (err) {
        // Verlopen abonnement verwijderen
        if ((err as { statusCode?: number }).statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }
  }

  return NextResponse.json({ ok: true, verstuurd, gecontroleerd: afspraken.length })
}
