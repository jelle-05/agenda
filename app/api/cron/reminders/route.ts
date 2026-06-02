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
  if (!process.env.CRON_SECRET || req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
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

  // Morgen ophalen voor cross-midnight reminders (bijv. "1 dag van tevoren")
  const morgenDt = new Date(amNu)
  morgenDt.setDate(morgenDt.getDate() + 1)
  const morgen = [
    morgenDt.getFullYear(),
    String(morgenDt.getMonth() + 1).padStart(2, '0'),
    String(morgenDt.getDate()).padStart(2, '0'),
  ].join('-')

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.warn('[reminders] RESEND_API_KEY of RESEND_FROM_EMAIL niet ingesteld — e-mailreminders worden overgeslagen')
  }

  const { data: afspraken, error } = await supabaseAdmin
    .from('afspraken')
    .select('id, user_id, titel, datum, begin_tijd, eind_tijd, locatie, herinnering_minuten')
    .in('datum', [vandaag, morgen])
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
    // Dag-offset voor cross-midnight reminders: morgen-events tellen 1440 min op
    const dagOffset = afspraak.datum === morgen ? 1440 : 0
    const herinneringMin = afspraakMin + dagOffset - (afspraak.herinnering_minuten ?? 0)

    // Venster van 3 minuten (vangt kleine vertragingen van cron-job.org op)
    if (herinneringMin < nuMinuten - 1 || herinneringMin > nuMinuten + 2) continue

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

    // Datum formatteren in het Nederlands (gebruik afspraak.datum, niet vandaag)
    const [dy, dm, dd] = afspraak.datum.split('-').map(Number)
    const datumObj  = new Date(dy, dm - 1, dd)
    const datumTekst = datumObj.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
    const datumLabel = datumTekst.charAt(0).toUpperCase() + datumTekst.slice(1)

    const eindTijdLabel = afspraak.eind_tijd ? afspraak.eind_tijd.slice(0, 5) : null
    const tijdLabel     = eindTijdLabel ? `${tijdstip} – ${eindTijdLabel}` : tijdstip
    const locatie       = afspraak.locatie ?? null

    const starttekst = rm === 0
      ? 'Dit event begint nu.'
      : rm < 60
        ? `Dit event begint over ${rm} minuten.`
        : `Dit event begint over ${rm / 60} uur.`

    const rij = (label: string, waarde: string) => `
      <tr>
        <td style="padding:7px 16px 7px 0;font-size:13px;color:#999;white-space:nowrap;vertical-align:top">${label}</td>
        <td style="padding:7px 0;font-size:14px;color:#1a1a1a">${waarde}</td>
      </tr>`

    const plainText = [
      `Reminder: ${afspraak.titel}`,
      '',
      `Datum     ${datumLabel}`,
      `Tijd      ${tijdLabel}`,
      locatie ? `Locatie   ${locatie}` : '',
      '',
      starttekst,
      '',
      '—',
      'Agenda',
    ].filter(r => r !== null).join('\n')

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: resendFout } = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL!,
      to:      email,
      replyTo: process.env.RESEND_FROM_EMAIL,
      subject: `Reminder: ${afspraak.titel}`,
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
        'Priority':   'urgent',
      },
      text: plainText,
      html: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:transparent">
  <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:48px 24px;color:#1a1a1a">

    <p style="margin:0 0 36px;font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#aaa">Reminder</p>

    <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;line-height:1.25;color:#1a1a1a">${afspraak.titel}</h1>

    <hr style="border:none;border-top:1px solid #e8e8e8;margin:0 0 24px">

    <table style="width:100%;border-collapse:collapse">
      ${rij('Datum', datumLabel)}
      ${rij('Tijd', tijdLabel)}
      ${locatie ? rij('Locatie', locatie) : ''}
    </table>

    <hr style="border:none;border-top:1px solid #e8e8e8;margin:24px 0">

    <p style="margin:0 0 48px;font-size:14px;color:#555;line-height:1.5">${starttekst}</p>

    <p style="margin:0;font-size:11px;color:#ccc">Agenda</p>

  </div>
</body>
</html>`,
    })
    if (resendFout) {
      console.error('[reminders] E-mailherinnering mislukt:', resendFout)
    } else {
      emailVerstuurd++
    }
  }

  return NextResponse.json({ ok: true, pushVerstuurd, emailVerstuurd, gecontroleerd: afspraken.length })
}
