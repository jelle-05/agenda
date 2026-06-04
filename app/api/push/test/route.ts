import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const runtime = 'nodejs'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_SUBJECT}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

function clientMetToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const supabase = clientMetToken(token)
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Ongeldig token' }, { status: 401 })

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id)

  if (!subs?.length) {
    return NextResponse.json({ error: 'Geen abonnementen gevonden. Zet meldingen aan in de app.' }, { status: 404 })
  }

  const payload = JSON.stringify({
    titel:   '📅 Test melding',
    bericht: 'Push notificaties werken! ✓',
    id:      `test-${Date.now()}`,
  })

  let verstuurd = 0
  let opgeruimd = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      verstuurd++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        // Permanent verlopen abonnement → opruimen (user-scoped, RLS).
        // Bewust geen endpoint in de log.
        await supabase.from('push_subscriptions').delete()
          .eq('user_id', user.id).eq('endpoint', sub.endpoint)
        opgeruimd++
        console.log('[push-test] dode push-subscription opgeruimd', { status })
      } else {
        // Transient (netwerk/5xx): subscription behouden.
        console.error('[push-test] push mislukt', { status })
      }
    }
  }

  return NextResponse.json({ verstuurd, opgeruimd })
}
