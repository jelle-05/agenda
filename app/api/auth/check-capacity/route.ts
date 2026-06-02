import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const MAX_GEBRUIKERS = 2

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) return NextResponse.json({ vol: false }) // fail open bij fout

    const aantalGebruikers = data.users.length
    return NextResponse.json({ vol: aantalGebruikers >= MAX_GEBRUIKERS, aantal: aantalGebruikers })
  } catch {
    return NextResponse.json({ vol: false })
  }
}
