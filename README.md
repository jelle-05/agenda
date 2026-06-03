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
- **Overlappende events** — gelijktijdige/deels-overlappende events worden **over elkaar** getoond (volle breedte), maar met styling die ze duidelijk onderscheidbaar maakt: een fijne gekleurde omlijning per blok, een witte scheidingsrand + zachte schaduw, en een **stapelvolgorde** (`lib/overlap.ts` → `stapelVolgorde`) waarbij langere events achter komen en kortere events bovenop blijven (zichtbaar en tappable). Werkt in dag- en weekweergave, desktop en mobiel. All-day items (verjaardagen groen, feestdagen paars) staan in de aparte hele-dag-rij en blijven ongewijzigd.

### Labels
- Onbeperkt kleur-labels per afspraak
- Labels aanmaken/bewerken/verwijderen via Label-beheer
- **Kleur-customization per label** — naast de accentkleur (rand/stip) kun je per label een **eigen achtergrondkleur én tekstkleur** instellen (toggle "Eigen achtergrond/tekstkleur" + native color pickers, met live preview). Elke kleur heeft ook een **transparantie-slider (0–100%)** zodat events deels doorzichtig kunnen zijn; de alpha wordt in de kleur opgeslagen als 8-cijferig hex `#RRGGBBAA` (CSS-native, geen extra opslagveld). Events met dat label gebruiken die kleuren in alle weergaven (dag/week/maand/agenda). Labels zonder eigen kleuren houden de standaard lichte tint; events zonder label blijven grijs; **verjaardagen blijven groen, feestdagen paars**. De editor toont een **contrastwaarschuwing** bij een slecht leesbare combinatie (de keuze wordt niet overschreven). Opgeslagen in de `labels`-tabel (kolommen `achtergrond_kleur`/`tekst_kleur`) + localStorage; de helper `eventKleuren()` (`lib/kleuren.ts`) bepaalt achtergrond/tekst/accent met nette fallbacks.
- **Locatie in event-blokken** — de locatie wordt naast de titel op de bovenste regel getoond (lichter, afgekapt) i.p.v. op een tweede regel, zodat ze niet wegvalt onder een event dat eroverheen overlapt.

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
- **Geen dubbele mails (idempotent)**: de cron draait elke minuut en heeft een tolerantievenster van enkele minuten; om te voorkomen dat dezelfde reminder meerdere keren wordt verstuurd, claimt de cron elke reminder atomisch in de tabel `verzonden_reminders` (unieke `sleutel` = event-id + datum + tijd + offset). Alleen de eerste run binnen het venster verstuurt; de overige zien een duplicate-key en slaan over. Markeringen ouder dan 60 dagen worden automatisch opgeruimd. Bij het **bewerken** van een event verandert de sleutel (mag opnieuw één keer vuren), bij **verwijderen** verdwijnt het event uit de query (geen mail).
- **Debuggen**: de cron logt met prefix `[reminders]` in de Vercel-functielogs — o.a. *event/verjaardag due* (id, sleutel, geplande tijd), *dubbel overgeslagen*, *e-mail verstuurd*. Zonder geheime waarden.

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

# Telegram (optioneel, reminders — Fase 1)
TELEGRAM_BOT_TOKEN=bot-token-van-botfather
TELEGRAM_WEBHOOK_SECRET=zelfgekozen-geheim-voor-webhook-verificatie
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=JouwBotUsername
TELEGRAM_WEBHOOK_URL=https://jouw-app.vercel.app/api/telegram/webhook
```

> **Nooit echte tokens of secrets in Git of documentatie zetten** — alleen in `.env.local` (lokaal) en in de Vercel-omgevingsvariabelen. De waarden hierboven zijn placeholders.

### Database setup

Voer de volgende SQL uit in de Supabase SQL Editor:

```sql
create table labels (
  id text primary key,
  user_id uuid references auth.users not null,
  naam text not null,
  kleur text not null,
  achtergrond_kleur text,  -- optioneel: eigen achtergrondkleur
  tekst_kleur text,        -- optioneel: eigen tekstkleur
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

create table verzonden_reminders (
  sleutel text primary key,
  verzonden_op timestamptz default now()
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
alter table verzonden_reminders enable row level security;  -- alleen de service-role cron schrijft; clients geen toegang

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

Voeg de dedup-tabel toe die dubbele reminder-mails voorkomt:

```sql
create table if not exists verzonden_reminders (
  sleutel text primary key,
  verzonden_op timestamptz default now()
);
alter table verzonden_reminders enable row level security;
```

Voeg de kolommen toe voor kleur-customization per label (eigen achtergrond-/tekstkleur):

```sql
alter table labels add column if not exists achtergrond_kleur text;
alter table labels add column if not exists tekst_kleur text;
```

Voor de Telegram-koppeling (Fase 2) — twee nieuwe tabellen:

```sql
-- Koppeling app-gebruiker ↔ Telegram-chat (+ globale voorkeur 'actief').
create table if not exists telegram_accounts (
  user_id uuid primary key references auth.users not null,
  chat_id text not null,
  telegram_username text,
  actief boolean default true,
  gekoppeld_op timestamptz default now()
);
alter table telegram_accounts enable row level security;
create policy "eigen telegram_account" on telegram_accounts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Kortlevende, eenmalige koppelcodes. Alleen de service-role (link-route + webhook)
-- raakt deze tabel aan; clients hebben geen policy en dus geen toegang tot de codes.
create table if not exists telegram_koppelcodes (
  code text primary key,
  user_id uuid references auth.users not null,
  aangemaakt_op timestamptz default now(),
  verloopt_op timestamptz not null,
  gebruikt boolean default false
);
alter table telegram_koppelcodes enable row level security;
```

> Zonder deze migratie blijft de app werken: labels slaan lokaal op en naam/kleur blijven syncen (de upsert valt terug op een variant zonder de nieuwe kolommen); de eigen kleuren persisten server-side pas ná de migratie.

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

## Telegram-reminders (in opbouw)

Telegram wordt als betrouwbaarder pushkanaal toegevoegd (zie het faseringsdocument `telegram_fases.md`).

- **Fase 1** — technische basis: server-side verzendhelper (`app/lib/telegram.ts`) + webhook-registratiescript (`scripts/setWebhook.mjs`).
- **Fase 2** — veilige koppelflow: tabellen `telegram_accounts` + `telegram_koppelcodes`, routes `/api/telegram/link`, `/api/telegram/webhook`, `/api/telegram/status`, en een "Telegram koppelen"-knop in het profielmenu.

**Koppelen (na het aanmaken van de bot + env vars):** open het profielmenu → *Telegram koppelen* → de bot opent in Telegram → druk op **Start** → je krijgt een bevestigingsbericht en het profiel toont "gekoppeld".

De webhook registreren bij Telegram (herhaalbaar bij URL- of secret-wijziging):

```bash
node --env-file=.env.local scripts/setWebhook.mjs
```

Het script leest `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` en `TELEGRAM_WEBHOOK_URL` (= `https://<domein>/api/telegram/webhook`) en roept Telegram's `setWebhook` aan met een `secret_token`. De webhook-route verifieert dat secret via de header `X-Telegram-Bot-Api-Secret-Token`, zodat alleen Telegram de route kan aanroepen. Tokens/secrets worden nooit getoond in de output. De globale aan/uit-voorkeur en de cron-verzending volgen in latere fases.

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
