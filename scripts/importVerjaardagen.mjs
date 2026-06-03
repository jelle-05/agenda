/**
 * Importeert namen + verjaardagen uit ../namen_en_verjaardagen.md in de
 * Supabase-tabel `verjaardagen`, gekoppeld aan één gebruiker.
 *
 * Draaien (env uit .env.local):
 *   node --env-file=.env.local scripts/importVerjaardagen.mjs
 *
 * Optionele env:
 *   IMPORT_USER_EMAIL  (default: info@jellebol.nl)
 *   IMPORT_USER_ID     (overschrijft het zoeken op e-mail)
 *
 * Idempotent: bestaande verjaardagen (zelfde naam + dag + maand) worden
 * overgeslagen en nieuwe krijgen een deterministische id, dus opnieuw draaien
 * voegt geen duplicaten toe. Ongeldige regels (bv. "Onbekend") worden niet stil
 * overgeslagen maar aan het eind gerapporteerd.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MD_PAD = join(__dirname, '..', 'namen_en_verjaardagen.md')

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DOEL_EMAIL = process.env.IMPORT_USER_EMAIL ?? 'info@jellebol.nl'
const DRY_RUN = process.argv.includes('--dry-run')

if (!DRY_RUN && (!URL || !SERVICE_KEY)) {
  console.error('Ontbrekende env: NEXT_PUBLIC_SUPABASE_URL en/of SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Draai met: node --env-file=.env.local scripts/importVerjaardagen.mjs')
  process.exit(1)
}

// supabase-js initialiseert een realtime-client die WebSocket vereist (ontbreekt
// in Node < 22). Dit script gebruikt alleen REST/auth — een stub volstaat.
if (typeof globalThis.WebSocket === 'undefined') {
  try {
    const ws = await import('ws')
    globalThis.WebSocket = ws.default
  } catch {
    globalThis.WebSocket = class {}
  }
}

const supabase = DRY_RUN ? null : createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── Helpers ────────────────────────────────────────────────────────────────────

function dagenInMaand(maand, jaar) {
  if (maand === 2) {
    const j = jaar ?? 2000
    const schrikkel = (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0
    return schrikkel ? 29 : 28
  }
  return [4, 6, 9, 11].includes(maand) ? 30 : 31
}

function geldigeDag(dag, maand, jaar) {
  if (!Number.isInteger(dag) || !Number.isInteger(maand)) return false
  if (maand < 1 || maand > 12) return false
  if (dag < 1) return false
  return dag <= dagenInMaand(maand, jaar)
}

function slug(naam) {
  return naam
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // diacritics weg
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Parse markdown ──────────────────────────────────────────────────────────────

function parseMarkdown(tekst) {
  const regels = tekst.split(/\r?\n/)
  const items = []   // { naam, ruweDatum }
  let huidigeNaam = null

  for (const regel of regels) {
    const naamMatch = regel.match(/^\s*Naam:\s*(.+?)\s*$/i)
    if (naamMatch) { huidigeNaam = naamMatch[1]; continue }
    const verjMatch = regel.match(/^\s*Verjaardag:\s*(.+?)\s*$/i)
    if (verjMatch && huidigeNaam) {
      items.push({ naam: huidigeNaam, ruweDatum: verjMatch[1] })
      huidigeNaam = null
    }
  }
  return items
}

// ── Hoofdlogica ──────────────────────────────────────────────────────────────────

async function main() {
  // 1. Doel-gebruiker bepalen
  let userId = process.env.IMPORT_USER_ID
  if (!userId && !DRY_RUN) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) { console.error('Gebruikers ophalen mislukt:', error.message); process.exit(1) }
    const user = data.users.find(u => (u.email ?? '').toLowerCase() === DOEL_EMAIL.toLowerCase())
    if (!user) {
      console.error(`Geen gebruiker gevonden met e-mail ${DOEL_EMAIL}. Zet IMPORT_USER_EMAIL of IMPORT_USER_ID.`)
      process.exit(1)
    }
    userId = user.id
  }
  console.log(DRY_RUN ? 'DRY RUN — geen schrijfacties naar Supabase' : `Doel-gebruiker: ${userId}`)
  if (DRY_RUN) userId = userId ?? 'dry-run'

  // 2. Markdown parsen
  const tekst = readFileSync(MD_PAD, 'utf8')
  const items = parseMarkdown(tekst)
  console.log(`Gevonden regels in markdown: ${items.length}`)

  // 3. Bestaande verjaardagen laden voor dedup
  let bestaandeSleutels = new Set()
  if (!DRY_RUN) {
    const { data: bestaand, error: laadFout } = await supabase
      .from('verjaardagen')
      .select('naam, dag, maand')
      .eq('user_id', userId)
    if (laadFout) { console.error('Bestaande verjaardagen laden mislukt:', laadFout.message); process.exit(1) }
    bestaandeSleutels = new Set((bestaand ?? []).map(r => `${(r.naam ?? '').toLowerCase()}|${r.dag}|${r.maand}`))
  }

  // 4. Verwerken
  const teImporteren = []
  const ongeldig = []          // { naam, ruweDatum, reden }
  const overgeslagenDup = []   // naam
  const gezienInBestand = new Set()

  for (const { naam, ruweDatum } of items) {
    const m = ruweDatum.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (!m) {
      ongeldig.push({ naam, ruweDatum, reden: 'geen geldige datum (DD-MM-YYYY)' })
      continue
    }
    const dag = Number(m[1]), maand = Number(m[2]), jaar = Number(m[3])
    if (!geldigeDag(dag, maand, jaar)) {
      ongeldig.push({ naam, ruweDatum, reden: 'ongeldige dag/maand-combinatie' })
      continue
    }
    const sleutel = `${naam.toLowerCase()}|${dag}|${maand}`
    if (bestaandeSleutels.has(sleutel) || gezienInBestand.has(sleutel)) {
      overgeslagenDup.push(naam)
      continue
    }
    gezienInBestand.add(sleutel)

    const dd = String(dag).padStart(2, '0')
    const mm = String(maand).padStart(2, '0')
    teImporteren.push({
      id: `imp-${slug(naam)}-${dd}${mm}`,
      user_id: userId,
      naam,
      dag,
      maand,
      geboortejaar: String(jaar),
      datum: `${jaar}-${mm}-${dd}`,   // legacy NOT NULL-kolom; dag/maand/geboortejaar zijn leidend
      leeftijd: null,
      notitie: null,
      herinnering_minuten: -1,
      terugkomend: true,
    })
  }

  // 5. Upsert in batches
  let toegevoegd = 0
  if (DRY_RUN) {
    toegevoegd = teImporteren.length
  } else {
    const BATCH = 200
    for (let i = 0; i < teImporteren.length; i += BATCH) {
      const batch = teImporteren.slice(i, i + BATCH)
      const { error } = await supabase.from('verjaardagen').upsert(batch, { onConflict: 'id' })
      if (error) { console.error('Upsert mislukt:', error.message); process.exit(1) }
      toegevoegd += batch.length
    }
  }

  // 6. Samenvatting
  console.log('\n──────── Samenvatting ────────')
  console.log(`${DRY_RUN ? 'Zou toevoegen' : 'Toegevoegd/bijgewerkt'} : ${toegevoegd}`)
  console.log(`Overgeslagen (bestond): ${overgeslagenDup.length}`)
  console.log(`Niet geïmporteerd     : ${ongeldig.length}`)
  if (ongeldig.length) {
    console.log('\nNiet geïmporteerde regels:')
    for (const o of ongeldig) console.log(`  - ${o.naam} (Verjaardag: ${o.ruweDatum}) → ${o.reden}`)
  }
  console.log('\nKlaar.')
}

main().catch(err => { console.error(err); process.exit(1) })
