import { supabase } from './supabase'
import type { Afspraak, Label, Verjaardag } from '@/types'
import { migreerDatumVelden } from './verjaardagen'

// ── Converters ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rijNaarAfspraak(rij: any): Afspraak {
  return {
    id:        rij.id,
    titel:     rij.titel,
    datum:     rij.datum,
    beginTijd: rij.begin_tijd ?? '00:00',
    eindTijd:  rij.eind_tijd  ?? '23:59',
    heeldag:   rij.heeldag,
    labelIds:  rij.label_ids ?? [],
    notitie:            rij.notitie              ?? undefined,
    locatie:            rij.locatie              ?? undefined,
    herinneringMinuten: rij.herinnering_minuten  ?? -1,
    herhalingGroepId:   rij.herhalingsgroep_id   ?? undefined,
  }
}

function afspraakNaarRij(a: Afspraak, userId: string) {
  return {
    id:         a.id,
    user_id:    userId,
    titel:      a.titel,
    datum:      a.datum,
    begin_tijd: a.heeldag ? null : a.beginTijd,
    eind_tijd:  a.heeldag ? null : a.eindTijd,
    heeldag:    a.heeldag,
    label_ids:  a.labelIds,
    notitie:             a.notitie            ?? null,
    locatie:             a.locatie            ?? null,
    herinnering_minuten: a.herinneringMinuten ?? -1,
    herhalingsgroep_id:  a.herhalingGroepId   ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rijNaarLabel(rij: any): Label {
  return { id: rij.id, naam: rij.naam, kleur: rij.kleur }
}

function labelNaarRij(l: Label, userId: string) {
  return { id: l.id, user_id: userId, naam: l.naam, kleur: l.kleur }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rijNaarVerjaardag(rij: any): Verjaardag {
  const { dag, maand, geboortejaar } = migreerDatumVelden(rij)
  return {
    id:    rij.id,
    naam:  rij.naam,
    dag,
    maand,
    geboortejaar,
    notitie:            rij.notitie             ?? undefined,
    herinneringMinuten: rij.herinnering_minuten ?? -1,
    terugkomend:        rij.terugkomend         ?? true,
  }
}

function verjaardagNaarRij(v: Verjaardag, userId: string) {
  // `datum` blijft gevuld (kolom is NOT NULL) maar dag/maand/geboortejaar zijn
  // leidend; het synthetische jaar (2000 als geboortejaar onbekend) doet er niet toe.
  const jaar = v.geboortejaar ?? 2000
  const datum = `${jaar}-${String(v.maand).padStart(2, '0')}-${String(v.dag).padStart(2, '0')}`
  return {
    id:       v.id,
    user_id:  userId,
    naam:     v.naam,
    dag:          v.dag,
    maand:        v.maand,
    geboortejaar: v.geboortejaar ?? null,
    datum,
    leeftijd:            null,
    notitie:             v.notitie            ?? null,
    herinnering_minuten: v.herinneringMinuten ?? -1,
    terugkomend:         v.terugkomend,
  }
}

// ── Afspraken ────────────────────────────────────────────────────────────────

export async function laadAfsprakenVanSupabase(): Promise<Afspraak[]> {
  const { data, error } = await supabase.from('afspraken').select('*')
  if (error) throw error
  return (data ?? []).map(rijNaarAfspraak)
}

export async function slaAfspraakOpInSupabase(a: Afspraak, userId: string): Promise<void> {
  const { error } = await supabase.from('afspraken').upsert(afspraakNaarRij(a, userId))
  if (error) throw error
}

export async function slaVeelAfsprakenOpInSupabase(afspraken: Afspraak[], userId: string): Promise<void> {
  if (!afspraken.length) return
  const { error } = await supabase.from('afspraken').upsert(afspraken.map(a => afspraakNaarRij(a, userId)))
  if (error) throw error
}

export async function verwijderAfspraakUitSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('afspraken').delete().eq('id', id)
  if (error) throw error
}

// ── Labels ───────────────────────────────────────────────────────────────────

export async function laadLabelsVanSupabase(): Promise<Label[]> {
  const { data, error } = await supabase.from('labels').select('*')
  if (error) throw error
  return (data ?? []).map(rijNaarLabel)
}

export async function slaLabelOpInSupabase(l: Label, userId: string): Promise<void> {
  const { error } = await supabase.from('labels').upsert(labelNaarRij(l, userId))
  if (error) throw error
}

export async function verwijderLabelUitSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('labels').delete().eq('id', id)
  if (error) throw error
}

// ── Verjaardagen ───────────────────────────────────────────────────────────────

export async function laadVerjaardagenVanSupabase(): Promise<Verjaardag[]> {
  const { data, error } = await supabase.from('verjaardagen').select('*')
  if (error) throw error
  return (data ?? []).map(rijNaarVerjaardag)
}

export async function slaVerjaardagOpInSupabase(v: Verjaardag, userId: string): Promise<void> {
  const { error } = await supabase.from('verjaardagen').upsert(verjaardagNaarRij(v, userId))
  if (error) throw error
}

export async function verwijderVerjaardagUitSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('verjaardagen').delete().eq('id', id)
  if (error) throw error
}

// ── Bulk upload (eerste login) ────────────────────────────────────────────────

export async function uploadNaarSupabase(
  afspraken: Afspraak[],
  labels: Label[],
  userId: string
): Promise<void> {
  if (labels.length > 0) {
    const { error } = await supabase
      .from('labels')
      .upsert(labels.map(l => labelNaarRij(l, userId)))
    if (error) throw error
  }
  if (afspraken.length > 0) {
    const { error } = await supabase
      .from('afspraken')
      .upsert(afspraken.map(a => afspraakNaarRij(a, userId)))
    if (error) throw error
  }
}
