@AGENTS.md

---

# Projectgeheugen — Agenda-app

## Projectoverzicht

Persoonlijke agenda PWA, gebouwd als Apple Calendar-kloon. Eén gebruiker (Jelle), Nederlandstalig, light mode. Draait op Vercel, data in Supabase.

**Stack:**
- Next.js 16 (App Router, Turbopack) + TypeScript
- Tailwind CSS v4
- Supabase (database + auth + realtime)
- Vercel (hosting + serverless API routes)
- Web Push (VAPID) voor push-notificaties
- Resend voor e-mailreminders

**Belangrijke mappen en bestanden:**

```
app/
  page.tsx                        — root, rendert AgendaApp
  layout.tsx                      — html/body, viewport-fit, theme-color, safe-area
  globals.css                     — Tailwind import, safe-area CSS (.safe-area-bottom)
  manifest.ts                     — PWA manifest (theme/background wit)
  types.ts                        — Afspraak, Label, HerhalingConfig, WeergaveType
  components/
    AgendaApp.tsx                 — hoofd-component: state, auth, sync, navigatie, modals
    TopBar.tsx                    — desktop header (weergave-tabs, labels, profielavatar)
    BottomBar.tsx                 — mobiele navigatiebalk (Maand/Week/Dag/Agenda + Vandaag)
    WeekWeergave.tsx              — weekgrid met event-blokken, dubbelklik op tijdslot
    DagWeergave.tsx               — daggrid met event-blokken, dubbelklik op tijdslot
    MaandWeergave.tsx             — maandgrid
    AgendaLijst.tsx               — lijstweergave
    AfspraakFormulier.tsx         — modal: aanmaken/bewerken event (incl. herhaling)
    LabelBeheer.tsx               — modal: labels aanmaken/bewerken/verwijderen
    VerjaardagenLijst.tsx         — modal: overzicht verjaardagen (lijst + empty state)
    VerjaardagFormulier.tsx       — modal: verjaardag aanmaken/bewerken/verwijderen
    ProfielMenu.tsx               — modal: naam, e-mail, uitlogknop
    LoginPagina.tsx               — inlogformulier
    WeekStrip.tsx                 — horizontale weekstrip (dagweergave mobiel)
    SwRegistratie.tsx             — service worker registratie
  lib/
    supabase.ts                   — Supabase client
    supabaseOpslag.ts             — CRUD functies voor Supabase (afspraken + labels)
    opslag.ts                     — localStorage cache
    datum.ts                      — datumhulpfuncties (NL namen, tijdNaarMinuten, etc.)
    herhaling.ts                  — genereerHerhalingen() op basis van HerhalingConfig
    verjaardagen.ts               — VERJAARDAG_LABEL + genereerVerjaardagAfspraken() (virtuele all-day events) + reminder-helpers
    kleuren.ts                    — labelAchtergrond() kleurberekening
    useSwipe.ts                   — swipe-navigatie hook (mobiel)
    pushUtils.ts                  — subscribeerOpPush() voor Web Push abonnement
  api/
    cron/reminders/route.ts       — cron-endpoint: push + e-mail reminders versturen
    push/subscribe/route.ts       — push-abonnement opslaan in Supabase
    push/test/route.ts            — test push-notificatie versturen
    auth/check-capacity/route.ts  — accountlimiet check bij registratie
public/
  sw.js                           — service worker (cache, push-events, notificatieklik)
```

---

## Werkwijze in dit project

1. **Eerst analyseren** — lees de relevante bestanden voor je iets wijzigt
2. **Kort plan maken** — beschrijf wat je gaat doen en waarom, stel vragen bij twijfel
3. **Dan pas implementeren** — stap voor stap, kleine wijzigingen per keer
4. Geen onnodige grote refactors
5. Bestaande styling en Tailwind-conventies bewaren
6. Na elke wijziging `npm run build` draaien om te controleren
7. Altijd aangeven welke bestanden aangepast zijn en waarom
8. Committen en pushen naar `main` triggert automatisch Vercel-deploy

---

## Vercel & deployment

- **Verbinding:** GitHub repo `jelle-05/agenda` → Vercel project, auto-deploy op push naar `main`
- **Lokaal testen:** `npm run dev` → [http://localhost:3000](http://localhost:3000)
- **Deploy triggeren:** `git push origin main` (of lege commit als alleen env vars veranderden)
- **Env vars beheren:** Vercel → Project → Settings → Environment Variables

**Benodigde environment variables** (nooit geheime waarden in code of CLAUDE.md):

| Variabele | Doel |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publieke sleutel |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin-sleutel (server-only) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID publieke sleutel voor Web Push |
| `VAPID_PRIVATE_KEY` | VAPID privésleutel (server-only) |
| `VAPID_SUBJECT` | mailto: adres voor VAPID |
| `CRON_SECRET` | Geheim voor cron-endpoint beveiliging |
| `RESEND_API_KEY` | Resend API sleutel voor e-mailreminders |
| `RESEND_FROM_EMAIL` | Verzendadres, bijv. `agenda@jellebol.nl` |

---

## Wat al gedaan is

### Functionaliteit
- **Weekoverzicht standaard** — `useState<WeergaveType>('week')` in AgendaApp
- **Herhalende events** — `HerhalingConfig` type, `genereerHerhalingen()` in `herhaling.ts`, bulk-opslaan via `slaVeelAfsprakenOpInSupabase()`; verwijderen van één of alle herhalingen
- **Real-time sync** — Supabase Realtime `postgres_changes` op `afspraken` en `labels`; Realtime moet aan staan in Supabase dashboard
- **Profielmenu** — `ProfielMenu.tsx`, geöpend via avatar in TopBar
- **Verjaardagen** — aparte structuur (tabel `verjaardagen` + localStorage-cache), geopend via taart-icoon in TopBar (zichtbaar op desktop én mobiel). Beheer via `VerjaardagenLijst.tsx` (overzicht) + `VerjaardagFormulier.tsx` (aanmaken/bewerken/verwijderen met bevestiging). In de kalender getoond als **virtuele all-day events**: `genereerVerjaardagAfspraken()` leidt `Afspraak`-objecten af (id `vj:<id>:<jaar>`, heeldag, groen virtueel label `VERJAARDAG_LABEL`) die samen met de echte afspraken aan de views worden meegegeven — **geen view-component aangepast**. Klik op zo'n event opent de verjaardag-editor (gedetecteerd via `isVerjaardagEvent`). Terugkomende verjaardagen genereren een instantie per jaar binnen een bereik rond nu. Reminders verankerd op **09:00** (geen / 1 uur / 1 dag), zowel in-app (`AgendaApp` 30s-check) als via de cron (push + e-mail; jaarlijks herberekend).
- **Settings-tab verwijderd** — `InstellingenPanel` volledig verwijderd
- **Zoekicoon verwijderd** — uit TopBar

### Event-rendering
- **Dubbelklik op tijdslot** — `onDoubleClick` op dag-kolom (week) en events-kolom (dag); berekent tijd op 30 min afgerond via `e.clientY - rect.top` (géén scrollTop erbij, dat was een bug)
- **Titel bovenaan** — `flex flex-col justify-start` op event-button (anders centreert browser verticaal)
- **Compacte weergave korte events:**
  - `height < 20px`: alleen kleurblok, geen tekst
  - `height 20–25px`: tekst zichtbaar, compacte stijl (font 10px, line-height 1.1, padding 2px/4px)
  - `height ≥ 26px`: normale stijl (font 12px, padding 7px)
  - Locatie alleen zichtbaar bij height ≥ 44px

### Mobiel / PWA
- **Witte statusbalk en home indicator** — `viewport-fit: cover` in `layout.tsx`, `padding-top: env(safe-area-inset-top)` op body, `.safe-area-bottom` class op BottomBar
- **`statusBarStyle: 'default'`** — donkere iconen op witte achtergrond (iOS)

### Reminders
- **In-app check** elke 30 seconden; gebruikt `ServiceWorkerRegistration.showNotification()` (werkt op iOS PWA); fallback `new Notification()` op desktop
- **Cron-endpoint** `/api/cron/reminders` — push + e-mail; draait elke minuut via cron-job.org
- **E-mailreminders** via Resend — zelfde `herinnering_minuten` instelling als push; domein `jellebol.nl` geverifieerd; env vars ingesteld in Vercel

### Database
- Kolom `herhalingsgroep_id` handmatig toegevoegd aan bestaande Supabase `afspraken` tabel via SQL:
  ```sql
  alter table afspraken add column if not exists herhalingsgroep_id text;
  ```
- Tabel `verjaardagen` toevoegen (nodig vóór de verjaardagen-feature persistent werkt; client vangt afwezigheid netjes op):
  ```sql
  create table if not exists verjaardagen (
    id text primary key,
    user_id uuid references auth.users not null,
    naam text not null,
    datum text not null,
    leeftijd integer,
    notitie text,
    herinnering_minuten integer default -1,
    terugkomend boolean default true,
    aangemaakt_op timestamptz default now()
  );
  alter table verjaardagen enable row level security;
  create policy "eigen verjaardagen" on verjaardagen for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
  ```
  Zet **Realtime** aan voor `verjaardagen` (Database → Replication).

---

## Aandachtspunten voor de toekomst

- **Push-notificaties iOS** — werken alleen in standalone PWA-modus (Home Screen), niet in Safari-tab; vereist iOS 16.4+
- **E-mailreminders** — afhankelijk van cron-job.org die elke minuut draait; als cron stopt, geen reminders
- **Herhalende events bewerken** — momenteel alleen aanmaken en verwijderen; bewerken van één instantie vs. alle herhalingen is nog niet geïmplementeerd
- **Mobiele weergave testen** — na safe-area wijzigingen altijd testen op echte iOS en Android
- **Timezone** — cron gebruikt `Europe/Amsterdam`; client gebruikt lokale timezone; consistent als gebruiker in NL zit
- **Accountlimiet** — ingesteld op 10 accounts max (`/api/auth/check-capacity`)
