# Agenda

Persoonlijke agenda-app gebouwd met Next.js, Supabase en Tailwind CSS. Geïnspireerd op Apple Calendar — clean design, volledig Nederlandstalig.

## Features

- **Vier weergaven** — Dag, Week, Maand en Agenda (lijstoverzicht)
- **Afspraken beheren** — aanmaken, bewerken en verwijderen
- **Herhalende events** — dagelijks, wekelijks, tweewekelijks of maandelijks met dag-selectie
- **Labels** — onbeperkt kleur-labels per afspraak
- **Herinneringen** — browser push-notificaties (ook als de app op de achtergrond staat)
- **Inloggen** — e-mail en wachtwoord via Supabase Auth
- **Sync** — data gesynchroniseerd via Supabase, offline beschikbaar via localStorage-cache
- **PWA** — installeerbaar op Android en iOS als native app

## Tech stack

| Onderdeel | Keuze |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| Backend / Auth | Supabase |
| Hosting | Vercel |
| Push notificaties | Web Push (VAPID) |

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
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key
SUPABASE_SERVICE_ROLE_KEY=jouw-service-role-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=jouw-vapid-public-key
VAPID_PRIVATE_KEY=jouw-vapid-private-key
VAPID_SUBJECT=mailto:jouw@email.nl
CRON_SECRET=jouw-geheim-wachtwoord
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

alter table afspraken enable row level security;
alter table labels enable row level security;
alter table push_subscriptions enable row level security;

create policy "eigen afspraken" on afspraken for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "eigen labels" on labels for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "eigen subscriptions" on push_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Starten

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Push notificaties (optioneel)

Voor herinneringen die werken als de app gesloten is, stel een cron-job in (bijv. via [cron-job.org](https://cron-job.org)):

- URL: `https://jouw-app.vercel.app/api/cron/reminders`
- Interval: elke minuut
- Header: `x-cron-secret: jouw-cron-secret`
