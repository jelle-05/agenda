# 📅 Agenda App — Fases Plan

## Projectoverzicht

| Onderdeel | Keuze |
|---|---|
| Framework | Next.js (App Router) |
| Hosting | Vercel (gratis) |
| Backend / Auth | Supabase (gratis tier) |
| Styling | Tailwind CSS |
| Taal | Nederlands |
| Design | Minimalistisch, licht thema |
| PWA | Ja (offline support) |

---

## Fase 1 — Projectopzet & Basisstructuur

**Doel:** Een werkende Next.js app lokaal draaien en deployen op Vercel.

### Taken
- [ ] Node.js installeren (v18+)
- [ ] Claude Code installeren (`npm install -g @anthropic-ai/claude-code`)
- [ ] Next.js project aanmaken:
  ```bash
  npx create-next-app@latest agenda-app
  ```
  Kies: TypeScript ✅ | Tailwind ✅ | App Router ✅
- [ ] Project openen in Claude Code
- [ ] GitHub repository aanmaken en code pushen
- [ ] Vercel account aanmaken en koppelen aan GitHub repo
- [ ] Eerste deploy testen (lege app live zetten)
- [ ] Eigen domein koppelen in Vercel dashboard

### Resultaat
> Je hebt een live Next.js app op jouw domein, klaar om te bouwen.

---

## Fase 2 — UI & Design Fundament

**Doel:** Het visuele skelet van de app bouwen — navigatie, layout en basiscomponenten.

### Taken
- [ ] Globale layout instellen (sidebar of topnav)
- [ ] Kleurpalet & typografie definiëren in Tailwind config
- [ ] Maandweergave component bouwen (kalenderraster)
- [ ] Weekweergave component bouwen
- [ ] Dagweergave component bouwen
- [ ] Agendaweergave (lijst) component bouwen
- [ ] Navigatie tussen weergaven implementeren
- [ ] Responsief maken (mobiel + desktop)

### Claude Code prompt voorbeeld
```
Bouw een minimalistisch Nederlandse agenda app in Next.js met Tailwind.
Maak een maandweergave component met een kalenderraster. Light mode,
clean design. Gebruik Nederlandse dagnamen (ma, di, wo, do, vr, za, zo).
```

### Resultaat
> Een mooie, klikbare agenda UI zonder echte data.

---

## Fase 3 — Lokale Data & Afspraken

**Doel:** Afspraken aanmaken, bekijken, bewerken en verwijderen (CRUD) — lokaal opgeslagen.

### Taken
- [ ] Datamodel definiëren voor een afspraak:
  ```typescript
  type Afspraak = {
    id: string
    titel: string
    datum: string        // ISO 8601
    beginTijd: string
    eindTijd: string
    categorie: string   // bijv. "werk", "persoonlijk"
    kleur: string       // hex kleurcode
    notitie?: string
  }
  ```
- [ ] `localStorage` / `IndexedDB` integratie voor offline opslag
- [ ] Formulier voor nieuwe afspraak aanmaken
- [ ] Afspraak bewerken en verwijderen
- [ ] Afspraken tonen in alle vier de weergaven
- [ ] Categorieën met kleuren instellen

### Resultaat
> De app werkt volledig offline — afspraken worden lokaal opgeslagen.

---

## Fase 4 — Authenticatie & Supabase Sync

**Doel:** Login systeem + afspraken synchroniseren via Supabase.

### Taken
- [ ] Supabase account aanmaken op supabase.com
- [ ] Nieuw Supabase project aanmaken
- [ ] `afspraken` tabel aanmaken in Supabase:
  ```sql
  create table afspraken (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users,
    titel text,
    datum date,
    begin_tijd time,
    eind_tijd time,
    categorie text,
    kleur text,
    notitie text,
    aangemaakt_op timestamptz default now()
  );
  ```
- [ ] Row Level Security (RLS) instellen (elke gebruiker ziet alleen eigen data)
- [ ] Supabase Auth integreren (e-mail + wachtwoord login)
- [ ] Login / registreer pagina bouwen
- [ ] Afspraken synchroniseren tussen lokaal en Supabase
- [ ] Omgevingsvariabelen instellen in Vercel

### Resultaat
> Je kunt inloggen en afspraken worden gesynchroniseerd — op elk apparaat beschikbaar.

---

## Fase 5 — Herinneringen & Notificaties

**Doel:** Push notificaties voor afspraken instellen.

### Taken
- [ ] PWA instellen met `next-pwa`
- [ ] Web Push notificaties implementeren
- [ ] Herinnering instellen per afspraak (bijv. 15 min van tevoren)
- [ ] Notificaties testen op mobiel (via "Add to homescreen")

### Resultaat
> De app stuurt herinneringen — ook als je het tabblad dicht hebt.

---

## Fase 6 — Afwerking & Launch

**Doel:** De app polishen en klaarstomen voor dagelijks gebruik.

### Taken
- [ ] PWA manifest instellen (icoon, naam, kleur)
- [ ] Offline fallback pagina
- [ ] Laden/fout-states afhandelen
- [ ] Performance optimaliseren (Lighthouse check)
- [ ] Testen op iOS Safari + Android Chrome
- [ ] Eigen domein SSL controleren

### Resultaat
> Een productie-klare agenda app op jouw eigen domein.

---

## Technische Stack Overzicht

```
Frontend:     Next.js 14+ (App Router) + TypeScript
Styling:      Tailwind CSS
Icons:        Lucide React
Backend:      Supabase (PostgreSQL + Auth + Realtime)
Hosting:      Vercel
PWA:          next-pwa
Lokale data:  localStorage / IndexedDB (offline-first)
```

---

## Aanbevolen volgorde voor Claude Code

1. Begin altijd een sessie met context:
   > *"We bouwen een Nederlandse agenda app in Next.js met Tailwind en Supabase. Light mode, minimalistisch design."*

2. Werk fase voor fase — sluit één fase af voor je begint aan de volgende.

3. Commit na elke werkende feature naar GitHub — Vercel deployt automatisch.
