import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'

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

  const email = user.email
  if (!email) return NextResponse.json({ error: 'Geen e-mailadres gevonden' }, { status: 400 })

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY of RESEND_FROM_EMAIL niet ingesteld in Vercel' },
      { status: 500 }
    )
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: resendFout } = await resend.emails.send({
    from:    process.env.RESEND_FROM_EMAIL!,
    to:      email,
    subject: 'Test e-mailreminder — Agenda',
    text: `Test e-mail vanuit de Agenda-app.\n\nAls je dit ontvangt, werkt Resend correct en komen e-mailreminders aan.\n\n— Agenda`,
    html: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:transparent">
  <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:48px 24px;color:#1a1a1a">
    <p style="margin:0 0 36px;font-size:11px;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:#aaa">Test</p>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;line-height:1.25;color:#1a1a1a">E-mailreminders werken ✓</h1>
    <hr style="border:none;border-top:1px solid #e8e8e8;margin:0 0 24px">
    <p style="margin:0 0 48px;font-size:14px;color:#555;line-height:1.5">Resend is correct geconfigureerd. Je ontvangt e-mailreminders voor afspraken met een herinnering ingesteld.</p>
    <p style="margin:0;font-size:11px;color:#ccc">Agenda</p>
  </div>
</body>
</html>`,
  })

  if (resendFout) {
    console.error('[email/test] Versturen mislukt:', resendFout)
    return NextResponse.json({ error: resendFout.message ?? 'Versturen mislukt' }, { status: 500 })
  }

  return NextResponse.json({ verstuurd: true, naar: email })
}
