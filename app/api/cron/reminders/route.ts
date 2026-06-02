import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { Resend } from 'resend'

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

  let pushVerstuurd  = 0
  let emailVerstuurd = 0

  for (const afspraak of afspraken) {
    if (!afspraak.begin_tijd) continue
    const [uur, min] = afspraak.begin_tijd.split(':').map(Number)
    const afspraakMin = uur * 60 + min
    const herinneringMin = afspraakMin - (afspraak.herinnering_minuten ?? 0)

    // Schiet af binnen een venster van 1 minuut
    if (herinneringMin < nuMinuten || herinneringMin > nuMinuten + 1) continue

    const rm = afspraak.herinnering_minuten ?? 0
    const tijdTekst = rm === 0 ? 'Nu gepland'
      : rm < 60 ? `Over ${rm} min`
      : `Over ${rm / 60} uur`
    const tijdstip = afspraak.begin_tijd.slice(0, 5)

    // ── Push notificatie ────────────────────────────────────────────────────
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', afspraak.user_id)

    if (subs?.length) {
      const payload = JSON.stringify({
        titel:   `📅 ${afspraak.titel}`,
        bericht: `${tijdTekst} — ${tijdstip}`,
        id:      afspraak.id,
      })

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          pushVerstuurd++
        } catch (err) {
          if ((err as { statusCode?: number }).statusCode === 410) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      }
    }

    // ── E-mailherinnering ───────────────────────────────────────────────────
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) continue

    const { data: userResult } = await supabaseAdmin.auth.admin.getUserById(afspraak.user_id)
    const email = userResult?.user?.email
    if (!email) continue

    const resend = new Resend(process.env.RESEND_API_KEY)
    try {
      await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL,
        to:      email,
        subject: `Herinnering: ${afspraak.titel} om ${tijdstip}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <p style="font-size:13px;color:#8E8E93;margin:0 0 4px">Agenda herinnering</p>
            <h2 style="font-size:20px;font-weight:600;color:#1c1c1e;margin:0 0 8px">${afspraak.titel}</h2>
            <p style="font-size:15px;color:#3C3C43;margin:0 0 4px">🕐 Vandaag om <strong>${tijdstip}</strong></p>
            <p style="font-size:15px;color:#007AFF;margin:0">${tijdTekst}</p>
          </div>
        `,
      })
      emailVerstuurd++
    } catch (err) {
      console.error('E-mailherinnering mislukt:', err)
    }
  }

  return NextResponse.json({ ok: true, pushVerstuurd, emailVerstuurd, gecontroleerd: afspraken.length })
}
