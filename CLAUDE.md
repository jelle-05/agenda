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
    FilterMenu.tsx                — modal: filters (events/verjaardagen/feestdagen tonen/verbergen)
    LabelBeheer.tsx               — modal: labels aanmaken/bewerken/verwijderen
    VerjaardagKeuze.tsx           — modal: keuzestap (nieuwe toevoegen / huidige bekijken)
    VerjaardagenLijst.tsx         — modal: overzicht verjaardagen (tabel + paginatie + empty state)
    VerjaardagFormulier.tsx       — modal: verjaardag aanmaken/bewerken/verwijderen (dag/maand + optioneel geboortejaar)
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
    feestdagen.ts                 — FEESTDAG_LABEL + berekenPasen()/feestdagenVoorJaar()/genereerFeestdagAfspraken() (virtuele paarse all-day events)
    kleuren.ts                    — labelAchtergrond() kleurberekening
    overlap.ts                    — stapelVolgorde() sorteert overlappende getimede events (korter bovenop)
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
- **Standaardweergave per apparaat** — initiële state `useState<WeergaveType>('dag')` (SSR-veilig); een mount-effect zet op desktop (`window.matchMedia('(min-width: 640px)')`, = Tailwind `sm`) eenmalig naar `'week'`. Draait één keer → springt niet terug en resizen verandert de keuze niet.
- **Herhalende events** — `HerhalingConfig` type, `genereerHerhalingen()` in `herhaling.ts`, bulk-opslaan via `slaVeelAfsprakenOpInSupabase()`; verwijderen van één of alle herhalingen
- **Real-time sync** — Supabase Realtime `postgres_changes` op `afspraken` en `labels`; Realtime moet aan staan in Supabase dashboard
- **Profielmenu** — `ProfielMenu.tsx`, geöpend via avatar in TopBar
- **Verjaardagen** — aparte structuur (tabel `verjaardagen` + localStorage-cache), geopend via taart-icoon in TopBar (zichtbaar op desktop én mobiel). Klik opent eerst `VerjaardagKeuze.tsx` (keuzestap: nieuwe toevoegen / huidige bekijken). Beheer via `VerjaardagenLijst.tsx` (tabel + paginatie, klikbare rijen) + `VerjaardagFormulier.tsx` (aanmaken/bewerken/verwijderen met bevestiging).
  - **Datamodel**: `dag` + `maand` (verplicht), `geboortejaar` (optioneel, **vrije tekst**: "1998", "onbekend", "ongeveer 30") — géén opgeslagen `datum`/`leeftijd` meer. Leeftijd wordt berekend met `berekenLeeftijd()` via `parseGeboortejaar()` (pakt een 4-cijferig jaartal uit de tekst; anders geen leeftijd). `migreerDatumVelden()` leest nieuw model én oude rijen (`datum`/`leeftijd`, integer-`geboortejaar`) in als string, gebruikt bij Supabase- én localStorage-load. Bij opslaan wordt `datum` gesynthetiseerd gevuld (kolom NOT NULL bij bestaande installaties; jaar via `parseGeboortejaar` ?? 2000), maar dag/maand/geboortejaar zijn leidend.
  - **Import**: `scripts/importVerjaardagen.mjs` importeert `namen_en_verjaardagen.md` (formaat `Naam:` / `Verjaardag: DD-MM-YYYY`) via service-role naar Supabase. Idempotent (dedup op naam+dag+maand, deterministische id `imp-<slug>-<ddmm>`); `--dry-run` voor controle. Draaien: `node --env-file=.env.local scripts/importVerjaardagen.mjs`.
  - **Kalender**: getoond als **virtuele all-day events** via `genereerVerjaardagAfspraken()` (id `vj:<id>:<jaar>`, heeldag, groen virtueel label `VERJAARDAG_LABEL`), samen met de echte afspraken aan de views meegegeven — **geen view-component aangepast**. Klik op zo'n event opent de verjaardag-editor (`isVerjaardagEvent`). Terugkomend = instantie per jaar binnen een bereik rond nu.
  - **Reminders**: verankerd op **09:00**, opties geen / 1 uur / 1 dag / **1 week** (`herinneringMinuten` -1 / 60 / 1440 / 10080), zowel in-app (`AgendaApp` 30s-check) als via de cron (push + e-mail; kandidaat-jaren `[ditJaar, ditJaar+1]`, jaarlijks herberekend).
- **Filters** — `FilterMenu.tsx` (geopend via desktop-filtericoon `SlidersHorizontal` in TopBar-acties óf het mobiele hamburger-menu linksboven). Type `Filters` (`{ events, verjaardagen, feestdagen }`) in `types.ts`; persistent in localStorage via `laadFilters`/`slaFiltersOp`/`STANDAARD_FILTERS` (`opslag.ts`, key `agenda_filters`). Filtering gebeurt in de `afsprakenVoorWeergave`-memo in `AgendaApp` (per type wel/niet meenemen) — alleen weergave, data blijft. Bij opstarten geladen via mount-`useEffect` (SSR-veilig).
- **Maand-swipe** — `useSwipe` is in `AgendaApp` aangezet voor `dag`/`week`/`maand`; `navigeerVorige/Volgende` doen maand ±1. Geen view-wijziging nodig (swipe staat op `<main>`).
- **Stabiele desktop-header** — titel-`<span>` in `TopBar` heeft `text-center truncate flex-1 sm:flex-none sm:w-[200px]`: vaste breedte op desktop zodat prev/next niet verschuiven; vloeiend op mobiel. Mobiele hamburger (`Menu`) staat als eerste in de nav-groep (`sm:hidden`).
- **Feestdagen** — Nederlandse nationale feestdagen, getoond via hetzelfde virtuele-event-patroon als verjaardagen: `genereerFeestdagAfspraken()` in `lib/feestdagen.ts` levert virtuele all-day `Afspraak`-objecten (id `fd:<key>:<jaar>`, heeldag, **paars** virtueel label `FEESTDAG_LABEL` kleur `#AF52DE`) die in `AgendaApp` aan `afsprakenVoorWeergave`/`labelsVoorWeergave` worden toegevoegd — **geen view-component aangepast**. **Geen opslag/DB/reminders**: puur per jaar berekend (bereik `peiljaar-2…+6`), dus geen duplicaten en read-only. Klik op een feestdag is een no-op (`isFeestdagEvent`-guard in `openBewerkAfspraak`). Vaste datums hard gecodeerd (incl. Koningsdag → 26 apr als 27 apr op zondag valt, Dodenherdenking 4 mei, Sinterklaas 5 dec); Pasen-afhankelijke dagen (Goede Vrijdag, Eerste/Tweede Paasdag, Hemelvaart, Eerste/Tweede Pinksterdag) berekend uit `berekenPasen()` (Meeus/Jones/Butcher); Prinsjesdag = derde dinsdag van september.
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
- **Overlappende events** — events mogen elkaar overlappen (volle breedte, géén kolommen). Duidelijkheid via styling: gekleurde omlijning (`border: 1px solid labelAchtergrond(kleur,0.55)` + `borderLeft` accent), witte scheidingsrand + zachte schaduw (`boxShadow: '0 0 0 1px rgba(255,255,255,0.92), …'`) en tint 0.22. Stapelvolgorde via `stapelVolgorde()` (`lib/overlap.ts`): langere events achter, kortere bovenop (zichtbaar/tappable). All-day items (verjaardag/feestdag) niet betrokken (aparte hele-dag-rij).

### Mobiel / PWA
- **Witte statusbalk en home indicator** — `viewport-fit: cover` in `layout.tsx`, `padding-top: env(safe-area-inset-top)` op body, `.safe-area-bottom` class op BottomBar
- **`statusBarStyle: 'default'`** — donkere iconen op witte achtergrond (iOS)

### Reminders
- **In-app check** elke 30 seconden; gebruikt `ServiceWorkerRegistration.showNotification()` (werkt op iOS PWA); fallback `new Notification()` op desktop. Eigen dedup via `gevierdRef` (per sessie).
- **Cron-endpoint** `/api/cron/reminders` — push + e-mail; draait elke minuut via cron-job.org. De "due"-check heeft een tolerantievenster van ~4 minuten → zonder dedup zou dezelfde mail 4× verstuurd worden.
- **Idempotentie (dubbele mails voorkomen)** — `claimReminder(sleutel)` doet een atomische `insert` in tabel `verzonden_reminders` (PK `sleutel`). Events: `${id}|${datum}|${begin_tijd}|${herinnering_minuten}`; verjaardagen: `vj|${id}|${jaar}|${herinnering_minuten}`. `23505` (duplicate) → overslaan; ontbrekende tabel/andere fout → **fail-open** (verstuur toch). Alleen de eerste cron-run binnen het venster verstuurt. Markeringen > 60 dagen worden bij elke run opgeruimd. Logging met prefix `[reminders]` in Vercel-logs (due/dubbel-overgeslagen/verstuurd).
- **E-mailreminders** via Resend — zelfde `herinnering_minuten` instelling als push; domein `jellebol.nl` geverifieerd; env vars ingesteld in Vercel.

### Database
- Kolom `herhalingsgroep_id` handmatig toegevoegd aan bestaande Supabase `afspraken` tabel via SQL:
  ```sql
  alter table afspraken add column if not exists herhalingsgroep_id text;
  ```
- Tabel `verzonden_reminders` toevoegen (voorkomt dubbele reminder-mails; cron vangt afwezigheid fail-open op):
  ```sql
  create table if not exists verzonden_reminders (
    sleutel text primary key,
    verzonden_op timestamptz default now()
  );
  alter table verzonden_reminders enable row level security;
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
- Verjaardagen-model uitgebreid naar dag/maand/geboortejaar — kolommen toevoegen aan bestaande `verjaardagen` tabel:
  ```sql
  alter table verjaardagen add column if not exists dag integer;
  alter table verjaardagen add column if not exists maand integer;
  alter table verjaardagen add column if not exists geboortejaar integer;
  ```
  Oude rijen (`datum`/`leeftijd`) worden bij inlezen automatisch geïnterpreteerd via `migreerDatumVelden()`; die kolommen blijven bestaan voor compatibiliteit.
- `geboortejaar` omgezet naar vrij tekstveld — kolomtype aanpassen:
  ```sql
  alter table verjaardagen alter column geboortejaar type text using geboortejaar::text;
  ```

---

## Aandachtspunten voor de toekomst

- **Push-notificaties iOS** — werken alleen in standalone PWA-modus (Home Screen), niet in Safari-tab; vereist iOS 16.4+
- **E-mailreminders** — afhankelijk van cron-job.org die elke minuut draait; als cron stopt, geen reminders
- **Herhalende events bewerken** — momenteel alleen aanmaken en verwijderen; bewerken van één instantie vs. alle herhalingen is nog niet geïmplementeerd
- **Mobiele weergave testen** — na safe-area wijzigingen altijd testen op echte iOS en Android
- **Timezone** — cron gebruikt `Europe/Amsterdam`; client gebruikt lokale timezone; consistent als gebruiker in NL zit
- **Accountlimiet** — ingesteld op 10 accounts max (`/api/auth/check-capacity`)
