import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { Resend } from 'resend'
import { migreerDatumVelden, parseGeboortejaar } from '@/lib/verjaardagen'
import { verstuurTelegram } from '@/lib/telegram'

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

// Claim een reminder atomisch via de unieke primary key van `verzonden_reminders`.
// Geeft `true` als deze reminder nog niet eerder is verstuurd (mag nu versturen),
// `false` bij een dubbele (al verstuurd → overslaan). Bij een ontbrekende tabel of
// andere fout: fail-open (versturen) zodat reminders blijven werken.
async function claimReminder(sleutel: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('verzonden_reminders').insert({ sleutel })
  if (!error) return true
  if (error.code === '23505') {
    console.log('[reminders] dubbel overgeslagen', { sleutel })
    return false
  }
  console.error('[reminders] claim-fout (fail-open, verstuur toch):', { sleutel, code: error.code, message: error.message })
  return true
}

// Escapet de tekens die Telegram's HTML-parse-mode aan zich trekt, zodat
// gebruikersinvoer (titel/locatie/naam) nooit de opmaak breekt of injecteert.
function escapeHtml(tekst: string): string {
  return tekst.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Verstuurt een push-payload naar alle subscriptions van een gebruiker.
// Dode subscriptions (404/410 = permanent verlopen of verwijderd) worden direct
// opgeruimd; andere fouten zijn transient en laten de subscription staan.
// Logt nooit endpoints of sleutels. Eén kapotte subscription stopt de rest niet.
async function stuurPushNaarGebruiker(
  userId: string,
  payload: string,
): Promise<{ verstuurd: number; opgeruimd: number }> {
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  let verstuurd = 0
  let opgeruimd = 0
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      verstuurd++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        opgeruimd++
        console.log('[reminders] dode push-subscription opgeruimd', { status })
      } else {
        console.error('[reminders] push mislukt', { status })
      }
    }
  }
  return { verstuurd, opgeruimd }
}

// Geeft de chat_id terug als de gebruiker Telegram gekoppeld én actief heeft;
// anders null (→ val terug op browser-push). Een ontbrekende tabel (pre-migratie)
// of andere fout telt als "niet gekoppeld" zodat reminders blijven werken.
async function actieveTelegramChat(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('telegram_accounts')
    .select('chat_id, actief')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    if (error.code !== '42P01') {
      console.error('[reminders] telegram_accounts ophalen mislukt:', error.code)
    }
    return null
  }
  return data?.actief && data.chat_id ? String(data.chat_id) : null
}

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

  // Oude verzonden-markeringen opruimen (> 60 dagen) zodat de tabel klein blijft.
  const grens = new Date(nu.getTime() - 60 * 24 * 3600_000).toISOString()
  const { error: opschoonFout } = await supabaseAdmin.from('verzonden_reminders').delete().lt('verzonden_op', grens)
  if (opschoonFout && opschoonFout.code !== '42P01') {
    console.warn('[reminders] opschoning overgeslagen:', opschoonFout.code)
  }

  const { data: afspraken, error } = await supabaseAdmin
    .from('afspraken')
    .select('id, user_id, titel, datum, begin_tijd, eind_tijd, locatie, herinnering_minuten')
    .in('datum', [vandaag, morgen])
    .eq('heeldag', false)
    .gte('herinnering_minuten', 0)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let pushVerstuurd     = 0
  let pushOpgeruimd     = 0
  let emailVerstuurd    = 0
  let telegramVerstuurd = 0

  for (const afspraak of afspraken ?? []) {
    if (!afspraak.begin_tijd) continue
    const [uur, min] = afspraak.begin_tijd.split(':').map(Number)
    const afspraakMin = uur * 60 + min
    // Dag-offset voor cross-midnight reminders: morgen-events tellen 1440 min op
    const dagOffset = afspraak.datum === morgen ? 1440 : 0
    const herinneringMin = afspraakMin + dagOffset - (afspraak.herinnering_minuten ?? 0)

    // Venster van 3 minuten (vangt kleine vertragingen van cron-job.org op)
    if (herinneringMin < nuMinuten - 1 || herinneringMin > nuMinuten + 2) continue

    // Idempotentie: één firing = één verzending, ook bij herhaalde cron-runs.
    const sleutel = `${afspraak.id}|${afspraak.datum}|${afspraak.begin_tijd}|${afspraak.herinnering_minuten}`
    console.log('[reminders] event due', { eventId: afspraak.id, sleutel, geplandMin: herinneringMin, nuMinuten })
    if (!(await claimReminder(sleutel))) continue

    const rm = afspraak.herinnering_minuten ?? 0
    const tijdstip = afspraak.begin_tijd.slice(0, 5)

    // Gedeelde opmaak (gebruikt door zowel Telegram als e-mail): datum/tijd/locatie/starttekst.
    const [dy, dm, dd] = afspraak.datum.split('-').map(Number)
    const datumObj   = new Date(dy, dm - 1, dd)
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

    // ── Reminderkanaal: Telegram vervangt browser-push (globale voorkeur) ─────
    // Gekoppeld + actief → Telegram; anders push als fallback. E-mail blijft los hieronder.
    const tgChat = await actieveTelegramChat(afspraak.user_id)
    if (tgChat) {
      const regels = [
        `<b>${escapeHtml(afspraak.titel)}</b>`,
        `${datumLabel} · ${tijdLabel}`,
      ]
      if (locatie) regels.push(escapeHtml(locatie))
      regels.push('', starttekst)
      if (await verstuurTelegram(tgChat, regels.join('\n'))) {
        telegramVerstuurd++
        console.log('[reminders] telegram verstuurd', { eventId: afspraak.id, sleutel })
      } else {
        console.error('[reminders] telegram mislukt', { eventId: afspraak.id, sleutel })
      }
    } else {
      // ── Push notificatie (fallback voor niet-gekoppelde gebruikers) ─────────
      // Bewust zonder emoji's en kort: titel "Herinnering", body "Titel om HH:MM".
      const payload = JSON.stringify({
        titel:   'Herinnering',
        bericht: `${afspraak.titel} om ${tijdstip}`,
        id:      afspraak.id,
      })
      const res = await stuurPushNaarGebruiker(afspraak.user_id, payload)
      pushVerstuurd += res.verstuurd
      pushOpgeruimd += res.opgeruimd
    }

    // ── E-mailherinnering ───────────────────────────────────────────────────
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) continue

    const { data: userResult } = await supabaseAdmin.auth.admin.getUserById(afspraak.user_id)
    const email = userResult?.user?.email
    if (!email) continue

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
      console.log('[reminders] e-mail verstuurd', { eventId: afspraak.id, email, sleutel })
    }
  }

  // ── Verjaardags-herinneringen ─────────────────────────────────────────────────
  // Verjaardagen zijn all-day; we verankeren ze op 09:00. Terugkomende
  // verjaardagen herhalen jaarlijks op dezelfde maand/dag.
  const { data: verjaardagen } = await supabaseAdmin
    .from('verjaardagen')
    .select('id, user_id, naam, dag, maand, geboortejaar, datum, leeftijd, terugkomend, herinnering_minuten')
    .gte('herinnering_minuten', 0)

  for (const vj of verjaardagen ?? []) {
    // Ondersteun zowel nieuw model (dag/maand/geboortejaar) als oude rijen (datum/leeftijd).
    const { dag: vd, maand: vm, geboortejaar } = migreerDatumVelden(vj)
    // Kandidaat-jaren: dit jaar en volgend jaar (vangt de dag-ervoor- en
    // week-ervoor-reminder rond de jaarwisseling op).
    const kandidaatJaren = [amNu.getFullYear(), amNu.getFullYear() + 1]

    for (const jaar of kandidaatJaren) {
      const occ = new Date(jaar, vm - 1, vd, 9, 0, 0, 0)              // 09:00 anker
      const rem = new Date(occ.getTime() - (vj.herinnering_minuten ?? 0) * 60_000)
      const remDatum = [
        rem.getFullYear(),
        String(rem.getMonth() + 1).padStart(2, '0'),
        String(rem.getDate()).padStart(2, '0'),
      ].join('-')
      const remMinuut = rem.getHours() * 60 + rem.getMinutes()

      if (remDatum !== vandaag) continue
      if (remMinuut < nuMinuten - 1 || remMinuut > nuMinuten + 2) continue

      // Idempotentie (zoals bij events): voorkomt dubbele verjaardags-reminders.
      const sleutel = `vj|${vj.id}|${jaar}|${vj.herinnering_minuten}`
      console.log('[reminders] verjaardag due', { verjaardagId: vj.id, sleutel, jaar, remMinuut, nuMinuten })
      if (!(await claimReminder(sleutel))) break

      const rmMin = vj.herinnering_minuten ?? 0
      const wanneer = rmMin >= 10080 ? 'over een week' : rmMin >= 1440 ? 'morgen' : 'vandaag'
      const geboortejaarNum = parseGeboortejaar(geboortejaar)
      const leeftijdTekst = geboortejaarNum != null
        ? ` en wordt ${occ.getFullYear() - geboortejaarNum}`
        : ''
      const verjaardagRegel = `${vj.naam} is ${wanneer} jarig${leeftijdTekst}.`

      // ── Reminderkanaal: Telegram vervangt browser-push (globale voorkeur) ───
      const tgChat = await actieveTelegramChat(vj.user_id)
      if (tgChat) {
        const bericht = `<b>${escapeHtml(vj.naam)}</b>\n${escapeHtml(verjaardagRegel)}`
        if (await verstuurTelegram(tgChat, bericht)) {
          telegramVerstuurd++
          console.log('[reminders] telegram verjaardag verstuurd', { verjaardagId: vj.id, sleutel })
        } else {
          console.error('[reminders] telegram verjaardag mislukt', { verjaardagId: vj.id, sleutel })
        }
      } else {
        // ── Push (fallback voor niet-gekoppelde gebruikers) ───────────────────
        // Bewust zonder emoji's: titel "Verjaardag", body de bestaande regel.
        const payload = JSON.stringify({
          titel:   'Verjaardag',
          bericht: `${vj.naam} is ${wanneer} jarig${leeftijdTekst}`,
          id:      `vj-${vj.id}`,
        })
        const res = await stuurPushNaarGebruiker(vj.user_id, payload)
        pushVerstuurd += res.verstuurd
        pushOpgeruimd += res.opgeruimd
      }

      // ── E-mail ──────────────────────────────────────────────────────────────
      if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
        const { data: userResult } = await supabaseAdmin.auth.admin.getUserById(vj.user_id)
        const email = userResult?.user?.email
        if (email) {
          const onderwerp = `🎂 ${vj.naam} is ${wanneer} jarig`
          const tekstRegel = verjaardagRegel
          const resend = new Resend(process.env.RESEND_API_KEY)
          const { error: resendFout } = await resend.emails.send({
            from:    process.env.RESEND_FROM_EMAIL!,
            to:      email,
            replyTo: process.env.RESEND_FROM_EMAIL,
            subject: onderwerp,
            text:    `${tekstRegel}\n\n—\nAgenda`,
            html: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:transparent">
  <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:48px 24px;color:#1a1a1a">
    <p style="margin:0 0 36px;font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#aaa">Verjaardag</p>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;line-height:1.25;color:#1a1a1a">🎂 ${vj.naam}</h1>
    <hr style="border:none;border-top:1px solid #e8e8e8;margin:0 0 24px">
    <p style="margin:0 0 48px;font-size:14px;color:#555;line-height:1.5">${tekstRegel}</p>
    <p style="margin:0;font-size:11px;color:#ccc">Agenda</p>
  </div>
</body>
</html>`,
          })
          if (resendFout) console.error('[reminders] Verjaardag-e-mail mislukt:', resendFout)
          else emailVerstuurd++
        }
      }

      break   // reminder voor deze verjaardag verstuurd — geen tweede kandidaat-jaar
    }
  }

  return NextResponse.json({
    ok: true,
    pushVerstuurd,
    pushOpgeruimd,
    emailVerstuurd,
    telegramVerstuurd,
    gecontroleerd: (afspraken?.length ?? 0) + (verjaardagen?.length ?? 0),
  })
}
