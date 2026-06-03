# Agenda

Persoonlijke agenda-app gebouwd met Next.js, Supabase en Tailwind CSS. Geïnspireerd op Apple Calendar — clean design, volledig Nederlandstalig.

## Features

### Kalender
- **Standaardweergave** — desktop opent in **week**, mobiel in **dag** (bepaald op basis van de `sm`-breakpoint van 640px bij het openen; daarna blijft je handmatige keuze staan)
- **Vier weergaven** — Dag, Week, Maand en Agenda (lijstoverzicht)
- **Filters** — toon/verberg per itemtype: **Events**, **Verjaardagen** en **Feestdagen**. Open via het filtericoon in de header (desktop) of het hamburger-menu linksboven (mobiel). De kalender update direct; filters verbergen alleen de weergave (data blijft bewaard) en worden persistent opgeslagen in `localStorage` (`agenda_filters`), dus ze blijven na refresh staan. Werkt in alle weergaven.
- **Swipe-navigatie (mobiel)** — links/rechts swipen navigeert naar de vorige/volgende **dag, week én maand** (drempel 60px, werkt ook over events/verjaardagen/feestdagen heen; verticaal scrollen blijft werken)
- **Stabiele header (desktop)** — de periode-titel heeft een vaste breedte, zodat de vorige/volgende-knoppen niet verschuiven bij wisselende maandnamen/weekranges
- **Dubbelklik op tijdslot** (desktop) — opent formulier met vooringevulde starttijd (afgerond op 30 min)
- **Navigatie** — vorige/volgende periode via pijlknoppen

### Events
- **Aanmaken, bewerken en verwijderen** van afspraken
- **Herhalende events** — dagelijks, wekelijks, tweewekelijks of maandelijks met dag-selectie en instelbare duur
- **Herhalende events verwijderen** — alleen dit event of alle herhalingen
- **Velden** — titel, datum, begin-/eindtijd, hele dag, locatie, notitie, label, herinnering
- **Event-blok styling** — titel bovenaan, locatie eronder, compact bij korte tijdsloten
- **Compacte weergave** — blokken ≥ 20px tonen tekst in compact formaat (10px); blokken ≥ 26px normaal (12px); blokken < 20px tonen alleen kleurblok

### Labels
- Onbeperkt kleur-labels per afspraak
- Labels aanmaken/bewerken/verwijderen via Label-beheer

### Verjaardagen
- **Apart beheer** — open via het taart-icoon rechtsboven (desktop én mobiel); dit toont eerst een **keuzestap**: *Nieuwe verjaardag toevoegen* of *Huidige verjaardagen bekijken*
- **Overzicht** — nette tabel (naam · datum · leeftijd · herinnering) gesorteerd op eerstvolgende datum, met **paginatie** (8 per pagina) en nette empty state; rijen zijn klikbaar om te bewerken
- **Velden** — naam (verplicht), **dag + maand** (verplicht), **jaar / leeftijd** (optioneel, vrije tekst), notitie, herinnering (geen / 1 uur / 1 dag / 1 week), elk jaar terugkomend (toggle)
- **Jaar / leeftijd** — vrij tekstveld: `1998`, `onbekend`, `ongeveer 30` of leeg mogen allemaal. Staat er een 4-cijferig jaartal in, dan wordt de **leeftijd automatisch berekend** (rekening houdend met of de verjaardag dit jaar al geweest is); anders toont het overzicht de ingevulde tekst of "Onbekend". Het veld blokkeert opslaan nooit.
- **Importeren** — bulk-import van namen + verjaardagen uit een markdownbestand via een seed-script (zie *Verjaardagen importeren* hieronder)
- **In de kalender** — verschijnen als groen all-day event bovenaan de dag (`🎂 Naam`), niet als tijdslot-event; terugkomende verjaardagen elk jaar opnieuw
- **Reminders** — verankerd op 09:00; zowel in-app als via de cron (push + e-mail), jaarlijks voor terugkomende verjaardagen
- **Bewerken/verwijderen** — tik op een verjaardag (in het overzicht of de kalender); verwijderen vraagt bevestiging

### Feestdagen
- **Automatisch** — Nederlandse nationale feestdagen verschijnen vanzelf in de kalender, zonder handmatige invoer; per zichtbaar jaar berekend (geen opslag, geen duplicaten)
- **Paarse all-day events** — bovenaan de dag, duidelijk onderscheiden van events en (groene) verjaardagen; op een dag met zowel een feestdag als een verjaardag blijven beide zichtbaar
- **Read-only** — feestdagen kunnen niet bewerkt of verwijderd worden (klik doet niets)
- **Ondersteund:** Nieuwjaarsdag, Goede Vrijdag, Eerste/Tweede Paasdag, Koningsdag, Dodenherdenking, Bevrijdingsdag, Hemelvaartsdag, Eerste/Tweede Pinksterdag, Prinsjesdag, Sinterklaas, Eerste/Tweede Kerstdag, Oudjaarsdag
- **Vaste vs. variabele datums** — vaste datums (bijv. Koningsdag 27 april of 26 april als die op zondag valt, Dodenherdenking 4 mei, Sinterklaas 5 december) staan hard gecodeerd; de Pasen-afhankelijke dagen (Goede Vrijdag, Pasen, Hemelvaart, Pinksteren) worden per jaar berekend uit Eerste Paasdag (Gauss/Meeus-algoritme) en Prinsjesdag als de derde dinsdag van september

### Auth & profiel
- Inloggen met e-mail en wachtwoord via Supabase Auth
- **Profielmenu** — klik op avatar-icoon rechtsboven: toont naam, e-mailadres en uitlogknop
- Geen instellingen-tab (verwijderd), geen zoekicoon (verwijderd)

### Sync & offline
- Data gesynchroniseerd via Supabase
- **Real-time sync** — wijzigingen op één apparaat verschijnen direct op andere apparaten
- Offline beschikbaar via localStorage-cache

### Reminders
- **In-app**: controle elke 30 seconden, notificatie via `ServiceWorkerRegistration.showNotification()` (werkt op iOS 16.4+ PWA, Android en desktop)
- **Server-side push**: cron-job stuurt Web Push (VAPID) via `/api/cron/reminders`
- **E-mail**: zelfde cron stuurt ook e-mail via Resend naar het e-mailadres van de ingelogde gebruiker
- **Status**: push-notificaties kunnen onbetrouwbaar zijn op iOS; e-mail is de betrouwbaardere fallback

### PWA
- Installeerbaar op Android en iOS als native app
- Witte statusbalk en home-indicator via `viewport-fit=cover` en safe-area CSS
- Service worker met offline-fallback

---

## Tech stack

| Onderdeel | Keuze |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 |
| Backend / Auth | Supabase |
| Hosting | Vercel |
| Push notificaties | Web Push (VAPID) via `web-push` |
| E-mail | Resend |
| Real-time sync | Supabase Realtime (`postgres_changes`) |

---

## Lokaal draaien

### Vereisten

- Node.js v18+
- Een Supabase-project ([supabase.com](https://supabase.com))

### Installatie

```bash
git clone https://github.com/jelle-05/agenda.git
cd agenda
npm install
```

### Omgevingsvariabelen

Maak een `.env.local` aan in de root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key
SUPABASE_SERVICE_ROLE_KEY=jouw-service-role-key

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=jouw-vapid-public-key
VAPID_PRIVATE_KEY=jouw-vapid-private-key
VAPID_SUBJECT=mailto:jouw@email.nl

# Cron beveiliging
CRON_SECRET=jouw-geheim-wachtwoord

# E-mail via Resend (optioneel)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=agenda@jouwdomein.nl
```

### Database setup

Voer de volgende SQL uit in de Supabase SQL Editor:

```sql
create table labels (
  id text primary key,
  user_id uuid references auth.users not null,
  naam text not null,
  kleur text not null,
  aangemaakt_op timestamptz default now()
);

create table afspraken (
  id text primary key,
  user_id uuid references auth.users not null,
  titel text not null,
  datum text not null,
  begin_tijd text,
  eind_tijd text,
  heeldag boolean default false,
  label_ids text[] default '{}',
  notitie text,
  locatie text,
  herinnering_minuten integer default -1,
  herhalingsgroep_id text,
  aangemaakt_op timestamptz default now()
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  aangemaakt_op timestamptz default now(),
  unique(user_id, endpoint)
);

create table verjaardagen (
  id text primary key,
  user_id uuid references auth.users not null,
  naam text not null,
  dag integer not null,
  maand integer not null,
  geboortejaar text,  -- vrije tekst (jaar of leeftijd), optioneel
  notitie text,
  herinnering_minuten integer default -1,
  terugkomend boolean default true,
  datum text,        -- legacy/compat (wordt bij opslaan gesynthetiseerd)
  leeftijd integer,  -- legacy/compat
  aangemaakt_op timestamptz default now()
);

alter table afspraken enable row level security;
alter table labels enable row level security;
alter table push_subscriptions enable row level security;
alter table verjaardagen enable row level security;

create policy "eigen afspraken" on afspraken for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "eigen labels" on labels for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "eigen subscriptions" on push_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "eigen verjaardagen" on verjaardagen for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Zet ook **Realtime** aan voor de tabellen `afspraken`, `labels` en `verjaardagen` via Supabase → Database → Replication.

**Bestaande installatie migreren** (verjaardagen-tabel had eerder alleen `datum`/`leeftijd`):

```sql
alter table verjaardagen add column if not exists dag integer;
alter table verjaardagen add column if not exists maand integer;
alter table verjaardagen add column if not exists geboortejaar integer;
```

Bestaande rijen worden bij het inlezen automatisch geïnterpreteerd (dag/maand uit `datum`, geboortejaar uit `datum`-jaar − `leeftijd`). De kolommen `datum`/`leeftijd` blijven bestaan voor compatibiliteit.

Het `geboortejaar`-veld is een **vrij tekstveld** geworden (jaar of leeftijd). Zet een bestaande integer-kolom om naar tekst:

```sql
alter table verjaardagen alter column geboortejaar type text using geboortejaar::text;
```

### Starten

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Reminders instellen (server-side)

Stel een cron-job in (bijv. via [cron-job.org](https://cron-job.org)) die elke minuut draait:

- **URL:** `https://jouw-app.vercel.app/api/cron/reminders`
- **Methode:** GET
- **Header:** `x-cron-secret: jouw-cron-secret`

De cron stuurt bij een verlopen herinneringstijd zowel een push-notificatie als een e-mail (als `RESEND_API_KEY` en `RESEND_FROM_EMAIL` ingesteld zijn).

Voor e-mailreminders: maak een gratis account aan op [resend.com](https://resend.com), verifieer je domein en voeg de env vars toe in Vercel.

---

## Verjaardagen importeren

Namen + verjaardagen kunnen in bulk worden geïmporteerd uit een markdownbestand `namen_en_verjaardagen.md` in de projectroot. Verwacht formaat per persoon:

```
Naam: Jan Jansen
Verjaardag: 26-06-2000
```

Een datum `Onbekend` (of een niet-parsebare regel) wordt **niet** geïmporteerd maar gerapporteerd. Draaien:

```bash
# Eerst (eenmalig) de tekst-migratie uit "Bestaande installatie migreren" draaien.
node --env-file=.env.local scripts/importVerjaardagen.mjs
```

Het script (`scripts/importVerjaardagen.mjs`) gebruikt de service-role sleutel uit `.env.local`, koppelt de verjaardagen aan de gebruiker met e-mail `info@jellebol.nl` (override met `IMPORT_USER_EMAIL` of `IMPORT_USER_ID`), en is **idempotent**: bestaande verjaardagen (zelfde naam + dag + maand) worden overgeslagen en nieuwe krijgen een deterministische id — opnieuw draaien voegt dus geen duplicaten toe. Het print een samenvatting met toegevoegde, overgeslagen en niet-geïmporteerde regels.

Eerst alleen controleren zonder iets te schrijven:

```bash
node scripts/importVerjaardagen.mjs --dry-run
```

> Het bestand `namen_en_verjaardagen.md` is alleen voor deze eenmalige import; het is geen onderdeel van de runtime van de app.

## Deployen

Het project is verbonden met Vercel via GitHub. Elke push naar `main` triggert automatisch een nieuwe deploy.

```bash
git add .
git commit -m "beschrijving"
git push origin main
```

Env vars beheer je via Vercel → Project → Settings → Environment Variables.
