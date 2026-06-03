# 🤖 Telegram-reminders voor de agenda-app — Onderzoek & Fasering

> Onderzoeks- en faseringsdocument. Doel: betrouwbare pushmeldingen via een Telegram-bot toevoegen aan de bestaande agenda-app, naast de huidige e-mail- (Resend) en browser-push (web-push/VAPID) reminders.
>
> **Voortgang:** Fase 1 (helper + webhook-script) en Fase 2 (koppelflow) zijn **gebouwd en end-to-end getest** — koppelen via de app levert een bevestigingsbericht in Telegram. **Fase 4 (cron verstuurt reminders via Telegram i.p.v. push) is gebouwd** in `app/api/cron/reminders/route.ts`. **Fase 5 (in-app 30s browser-push verwijderd) is gebouwd** in `app/components/AgendaApp.tsx`. De optionele **"Stuur testbericht"-knop** (`POST /api/telegram/test` + knop in `ProfielMenu`) is óók gebouwd. Nog open: Fase 3 (globale aan/uit-toggle in de UI).

---

## 1. Samenvatting

De agenda-app stuurt nu reminders via **e-mail (Resend)** en **browser-push (web-push/VAPID)**. Browser-push is op mobiel (vooral iOS) niet altijd betrouwbaar. Een **Telegram-bot** is een robuust, gratis en simpel kanaal: een bericht via de Telegram Bot API komt vrijwel altijd direct aan, op elk apparaat waar de gebruiker Telegram heeft.

Het plan: de gebruiker koppelt eenmalig zijn Telegram aan zijn account (via een unieke koppelcode en een bot-deeplink) en zet via een **globale voorkeur** Telegram-reminders aan. Vanaf dan **vervangt Telegram de browser-push** (e-mail blijft ongewijzigd) en krijgt de gebruiker op het ingestelde moment een net Telegram-bericht. De verzending wordt ingebouwd in de **bestaande cron-reminderstructuur** (`/api/cron/reminders`) met dezelfde **idempotentie** (`verzonden_reminders`-tabel) zodat er nooit dubbele berichten ontstaan.

**Belangrijkste inzicht:** dit sluit bijna één-op-één aan op de bestaande architectuur. De grootste nieuwe stukken zijn (a) de **koppelflow** (bot ↔ gebruiker) en (b) een **globale kanaalvoorkeur** (Telegram i.p.v. browser-push). De verzending zelf is een kleine uitbreiding van de cron.

---

## 2. Doel van Telegram-reminders

De gebruiker moet uiteindelijk kunnen:
- **Telegram koppelen** aan zijn account (eenmalig, veilig).
- Via een **globale voorkeur** Telegram-reminders aan/uit zetten (Telegram vervangt dan de browser-push; e-mail blijft).
- Op het ingestelde moment een **Telegram-bericht** ontvangen (bv. 5 min / 1 uur / 1 dag vooraf — de bestaande offsets `herinneringMinuten`).
- Telegram-reminders **automatisch laten meeveranderen** als het event wordt aangepast, en **vervallen** als het event wordt verwijderd.
- Telegram weer **ontkoppelen**.

Niet-doelen (nu): tweerichtingsinteractie (commando's om events te beheren via de bot), groepschats, of meerdere Telegram-accounts per gebruiker. Wel als latere ideeën benoemd.

---

## 3. Botnaam-voorstellen (met advies)

Telegram kent twee namen: een **weergavenaam** (vrij) en een **username** die **moet eindigen op `bot`** (bv. `@AgendaSeinBot`) en uniek moet zijn.

| Weergavenaam | Voorbeeld-username | Sfeer |
|---|---|---|
| **AgendaSein** | `@AgendaSeinBot` | Kort, NL, "sein" = signaal/melding — past bij agenda + reminder |
| **Tijdsein** | `@TijdseinBot` | Kort, neutraal, klinkt als een tijdsignaal |
| **HerinnerMij** | `@HerinnerMijBot` | Heel expliciet over wat het doet |
| **Planningsmaatje** | `@PlanningsmaatjeBot` | Vriendelijker/persoonlijker |
| **Jelle's Agenda** | `@JelleAgendaBot` | Persoonlijk, duidelijk single-user |

**Gekozen richting:** **HerinnerMij** (expliciet over wat de bot doet). Definitieve `@username` (bv. `@HerinnerMijBot`, `@HerinnerMijReminderBot`) hangt af van wat nog vrij is bij BotFather — check dat vlak vóór fase 1 en kies de eerste vrije variant. AgendaSein/Tijdsein blijven nette alternatieven mocht de username bezet zijn.

---

## 4. Aanbevolen technische aanpak

### 4.1 Hoe werkt een Telegram-bot technisch? (onderzoeksvraag 1)
- **Aanmaken** via **@BotFather** in Telegram: `/newbot` → weergavenaam + username → je krijgt een **bot-token**.
- **Token veilig opslaan** als environment variable `TELEGRAM_BOT_TOKEN` (server-only, nooit in code/Git/docs).
- **Berichten sturen** via de Bot API: `POST https://api.telegram.org/bot<token>/sendMessage` met `chat_id` + `text` (+ optioneel `parse_mode`). Geen extra library nodig — een simpele `fetch` volstaat (past bij de bestaande cron die ook `fetch`/SDK's gebruikt).
- **Updates ontvangen** (bv. `/start`): twee opties:
  - **Webhook** — Telegram POST't elke update naar jouw URL. **Aanbevolen** voor Vercel/serverless: geen draaiend proces nodig.
  - **Long polling** (`getUpdates` in een lus) — vereist een **persistent draaiend proces**, dus **niet geschikt voor Vercel**.
- **Chat ID** = het unieke id van de chat tussen gebruiker en bot. Dit haal je uit de eerste update die de gebruiker stuurt (bv. `/start`) en koppel je aan de app-gebruiker.

### 4.2 Webhook i.p.v. polling (onderzoeksvraag 7)
Nieuwe route **`/api/telegram/webhook`** (Node runtime). Beveiliging: zet bij `setWebhook` een **`secret_token`**; Telegram stuurt dat mee als header `X-Telegram-Bot-Api-Secret-Token`. De route vergelijkt die met env `TELEGRAM_WEBHOOK_SECRET` en weigert anders. Zo kan niemand anders je webhook misbruiken.

### 4.3 Koppelflow gebruiker ↔ bot (onderzoeksvraag 2)
Veilige koppeling met een **eenmalige, kortlevende koppelcode** + Telegram-deeplink:
1. Gebruiker klikt in de app (ProfielMenu) op **"Telegram koppelen"**.
2. App roept `POST /api/telegram/link` (geauthenticeerd) → backend genereert een **unieke code** (bv. 8–12 tekens), slaat op in `telegram_koppelcodes` met `user_id` + `verloopt_op` (bv. 10 min) + `gebruikt=false`.
3. App toont een knop/deeplink: **`https://t.me/<bot-username>?start=<code>`** (username uit `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`). Tik → Telegram opent de bot; "Start" stuurt automatisch `/start <code>`.
4. **Webhook** ontvangt `/start <code>`: zoekt de code op, controleert `gebruikt=false` en niet verlopen, koppelt **`chat_id`** aan de `user_id` in `telegram_accounts`, markeert code `gebruikt=true`, en stuurt een bevestigingsbericht ("✅ Gekoppeld! Je ontvangt nu reminders hier.").
5. App toont via `GET /api/telegram/status` dat Telegram **gekoppeld** is (poll of refresh).

Waarom veilig: de code is **per gebruiker, eenmalig en verloopt snel**; alleen wie de code uit de ingelogde app heeft, kan koppelen. Niemand kan zo andermans account koppelen.

### 4.4 Reminderkanaal: globale voorkeur, Telegram vervangt browser-push (onderzoeksvraag 3) — **gekozen**
**Geen per-event kanaalveld.** In plaats daarvan een **globale voorkeur per gebruiker**: zodra Telegram gekoppeld én actief is, lopen reminders via **Telegram in plaats van browser-push**. **E-mail blijft** ongewijzigd naast Telegram.
- De reminder-offsets blijven de bestaande `herinneringMinuten` (5 min / 1 uur / 1 dag, etc.) — die staan al per event.
- **Voorkeur-opslag:** een vlag `actief` op `telegram_accounts` (default `true` bij koppelen), bedienbaar in het profiel ("Telegram-reminders aan/uit"). Geen wijziging aan de `afspraken`-tabel nodig.
- **"Vervangt push" concreet in de cron:** per reminder-firing →
  - **E-mail:** zoals nu (op basis van `herinneringMinuten`).
  - **Push vs Telegram:** als de gebruiker Telegram gekoppeld + actief heeft → **Telegram** sturen en **géén** web-push; anders → web-push als fallback (huidige gedrag).
- **Web-push/VAPID uitfaseren:** zodra Telegram het pad is, kan de browser-push (`push_subscriptions` + de in-app 30s-check) worden uitgefaseerd. We houden web-push alleen nog als fallback voor niet-gekoppelde gebruikers; volledig verwijderen kan later.

### 4.5 Inplannen & verzenden (onderzoeksvraag 4)
**Hergebruik de bestaande cron** `app/api/cron/reminders/route.ts` (elke minuut via cron-job.org). Voeg per match een **Telegram-tak** toe:
- Alleen versturen als `herinnering_kanaal` ∈ {`telegram`, `beide`} **en** de gebruiker een `chat_id` heeft.
- **Idempotentie via de bestaande `claimReminder(sleutel)`** met een **kanaal-specifieke sleutel**: `${id}|${datum}|${begin_tijd}|${herinnering_minuten}|telegram`. Zo kan exact één Telegram-bericht per firing verstuurd worden, ook al draait de cron meerdere keren binnen het venster (de huidige oorzaak van "4× e-mail" wordt zo voorkomen).
- **Bij event-aanpassing:** de sleutel bevat datum/tijd/offset, dus een gewijzigd event krijgt een **nieuwe sleutel** → mag opnieuw één keer vuren. Ongewijzigd opnieuw opslaan = zelfde sleutel = geen dubbel.
- **Bij event-verwijdering:** het event valt uit de cron-query → er wordt niets meer verstuurd. Geen aparte "reminder verwijderen" nodig (reminders zijn afgeleid, niet los gepland).
- **Markeren als verstuurd:** dat is precies wat de `verzonden_reminders`-insert doet.

### 4.6 Berichtopmaak (onderzoeksvraag 5)
Kort, duidelijk, professioneel. Voorbeeld (Telegram `parse_mode: HTML` of platte tekst):
```
📅 <eventnaam>
🗓️ <datum> · <begin–eindtijd>
📍 <locatie>            ← alleen tonen als er een locatie is
Dit event begint over 5 minuten.
```
- Eventnaam, datum, tijd, en locatie (alleen indien aanwezig).
- Remindertekst afgeleid van de offset (zoals de bestaande e-mail: "Nu", "over 5 minuten", "over 1 uur", "over 1 dag").
- **Geen** debug-info, ids, tokens of andere gevoelige/technische data in het bericht.

---

## 5. Benodigde environment variables (alleen namen, nooit waarden)

| Variabele | Doel | Zichtbaarheid |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot-token voor de Telegram Bot API | **server-only** |
| `TELEGRAM_WEBHOOK_SECRET` | Secret om binnenkomende webhook-calls te verifiëren | **server-only** |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Bot-username voor de koppel-deeplink in de UI | publiek (geen secret) |

Bestaande env vars blijven ongewijzigd (`SUPABASE_*`, `VAPID_*`, `CRON_SECRET`, `RESEND_*`). **Geen geheime waarden in dit document of in code** — alleen de namen.

---

## 6. Benodigde databasevelden (Supabase)

Nieuwe tabellen (SQL draait de gebruiker later in de Supabase SQL Editor; hier alleen de structuur):

- **`telegram_accounts`** — koppeling gebruiker ↔ Telegram + globale voorkeur
  - `user_id uuid` (PK/FK → auth.users)
  - `chat_id text` (Telegram chat-id)
  - `telegram_username text` (optioneel, voor weergave)
  - `actief boolean default true` (**globale voorkeur**: Telegram-reminders aan/uit)
  - `gekoppeld_op timestamptz default now()`
- **`telegram_koppelcodes`** — tijdelijke koppelcodes
  - `code text` (PK)
  - `user_id uuid`
  - `aangemaakt_op timestamptz default now()`
  - `verloopt_op timestamptz`
  - `gebruikt boolean default false`
- **`afspraken`** — **geen wijziging** nodig (kanaalkeuze is globaal, niet per event).
- **Hergebruik `verzonden_reminders`** (bestaat al) voor idempotentie, met Telegram-kanaal in de `sleutel`.

RLS: `telegram_accounts`/`telegram_koppelcodes` met policies per `user_id` (zoals de bestaande tabellen); de cron en webhook gebruiken de **service-role** (omzeilt RLS). Geen client-toegang tot codes nodig behalve via de eigen API-routes.

---

## 7. Benodigde API-routes

| Route | Methode | Auth | Doel |
|---|---|---|---|
| `/api/telegram/link` | POST | ingelogde gebruiker | Genereer + bewaar koppelcode; geef deeplink/koppelcode terug |
| `/api/telegram/status` | GET / DELETE | ingelogde gebruiker | Status (gekoppeld?) ophalen; DELETE = ontkoppelen |
| `/api/telegram/webhook` | POST | `secret_token`-header | Telegram-updates verwerken (`/start <code>` → koppelen) |
| `/api/telegram/test` (optioneel) | POST | ingelogde gebruiker | Testbericht sturen om koppeling te controleren |
| `/api/cron/reminders` (bestaand) | GET | `x-cron-secret` | **Uitbreiden** met Telegram-verzending + dedup |

De webhook eenmalig registreren bij Telegram via `setWebhook` (met `secret_token`) — kan met een klein script of handmatige API-call (buiten de app).

---

## 8. Fase 1 — Telegram-bot aanmaken & configureren

- **Doel:** een werkende bot die berichten kan sturen, met veilig opgeslagen token.
- **Technische stappen:**
  - Bot aanmaken via @BotFather; weergavenaam + username kiezen (zie §3).
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` instellen (lokaal `.env.local` + Vercel).
  - Eenvoudige helper `lib/telegram.ts` met `verstuurTelegram(chatId, tekst)` (fetch naar `sendMessage`).
  - Webhook registreren via een **klein script `scripts/setWebhook.mjs`** (leest env, zet `setWebhook` met `secret_token`) — herhaalbaar bij URL-wijziging, geen secrets hardcoded.
- **Bestanden/onderdelen:** `app/lib/telegram.ts` (nieuw), `scripts/setWebhook.mjs` (nieuw), env-config (lokaal + Vercel).
- **Complexiteit:** **Laag**.
- **Risico's:** verkeerde webhook-URL/secret; token per ongeluk committen (gebruik env).
- **Klaar wanneer:** je kunt programmatorisch een testbericht naar je eigen chat sturen en de webhook ontvangt updates.

---

## 9. Fase 2 — Telegram-account koppelen aan gebruiker

- **Doel:** veilige koppeling chat_id ↔ app-gebruiker.
- **Technische stappen:**
  - Tabellen `telegram_accounts` + `telegram_koppelcodes` (+ RLS).
  - `POST /api/telegram/link` (code genereren/opslaan, deeplink teruggeven).
  - `/api/telegram/webhook`: `/start <code>` verwerken → koppelen, code invalideren, bevestiging sturen.
  - `GET/DELETE /api/telegram/status` (status + ontkoppelen).
- **Bestanden/onderdelen:** nieuwe API-routes onder `app/api/telegram/*`, query-helpers (Supabase).
- **Complexiteit:** **Middel** (koppelflow + beveiliging is het hart van de feature).
- **Risico's:** codes die niet verlopen/herbruikbaar zijn (account-kaping); race bij dubbel `/start`; webhook niet geverifieerd.
- **Klaar wanneer:** je kunt in de app "koppelen" starten, in Telegram de bot starten, en de app toont daarna "gekoppeld" — met een code die daarna ongeldig is. ✅ **Behaald** (getest: bot **HerinnerMij**, webhook op `https://agenda.jellebol.nl/api/telegram/webhook`, bevestigingsbericht ontvangen).

---

## 10. Fase 3 — Globale Telegram-voorkeur (Telegram vervangt push)

- **Doel:** een gebruiker laat reminders globaal via Telegram lopen (i.p.v. browser-push); geen per-event keuze.
- **Technische stappen:**
  - `telegram_accounts.actief` als voorkeur-vlag (default `true` bij koppelen).
  - In `ProfielMenu.tsx` een toggle "Telegram-reminders aan/uit" (alleen zichtbaar als gekoppeld).
  - **Geen** wijziging aan `afspraken`/`AfspraakFormulier`: de bestaande `herinneringMinuten` per event blijft de offset; het kanaal is globaal.
- **Bestanden/onderdelen:** `app/components/ProfielMenu.tsx`, `/api/telegram/status` (toggle), query-helpers.
- **Complexiteit:** **Laag** (één voorkeur-vlag + toggle; geen event-schemawijziging).
- **Risico's:** duidelijk communiceren dat "aan" betekent dat browser-push vervangen wordt.
- **Klaar wanneer:** je kunt in het profiel Telegram-reminders aan/uit zetten en dat wordt opgeslagen.

---

## 11. Fase 4 — Scheduler/reminder-verzending uitbreiden

- **Doel:** op het juiste moment één bericht sturen via het juiste kanaal, idempotent.
- **Technische stappen:**
  - In `app/api/cron/reminders/route.ts`, per match:
    - **E-mail:** ongewijzigd.
    - **Push vs Telegram:** lookup `telegram_accounts` op `user_id`. Heeft de gebruiker `chat_id` + `actief=true` → **`claimReminder('…|telegram')`** (claim-eerst) en bij succes `verstuurTelegram(chatId, tekst)`; **sla de web-push over**. Anders → web-push zoals nu (fallback).
  - **Claim-eerst** (gekozen): markeren vóór verzenden → nooit dubbel; een zeldzame transient Telegram-fout kan één bericht missen (geaccepteerd, consistent met de e-mail-aanpak).
  - Berichtopmaak (§4.6); logging met `[reminders]`-prefix, **zonder** gevoelige data.
- **Bestanden/onderdelen:** `app/api/cron/reminders/route.ts`, `app/lib/telegram.ts`.
- **Complexiteit:** **Middel** (kleine logica, maar idempotentie/kanaalkeuze/edge cases vragen aandacht).
- **Risico's:** geblokkeerde bot / Telegram API-error (netjes opvangen, niet crashen); per ongeluk zowel push als Telegram sturen (voorkomen door de if/else).
- **Klaar wanneer:** een reminder van een gekoppelde gebruiker levert exact één Telegram-bericht (en geen browser-push) op het juiste moment, ook bij meerdere cron-runs.
- ✅ **Gebouwd** in `app/api/cron/reminders/route.ts` (events én verjaardagen). Per firing: helper `actieveTelegramChat(userId)` zoekt `telegram_accounts` (chat_id + `actief`); is die er → `verstuurTelegram(...)` en **géén** web-push; anders push als fallback. E-mail ongewijzigd.
  - **Idempotentie:** hergebruikt de **bestaande** `claimReminder(sleutel)` (claim-eerst), die de hele firing al afdekt — push en Telegram sluiten elkaar binnen één firing uit, dus een aparte `…|telegram`-sleutel is overbodig (zou enkel een extra rij opleveren zonder extra garantie). Kleine, bewuste afwijking van het voorstel in §4.5.
  - **Berichtopmaak:** HTML (`parse_mode: HTML`); gebruikersinvoer (titel/locatie/naam) wordt ge-escaped via `escapeHtml()` tegen opmaakbreuk/injectie. Event: titel · datum · tijd · (locatie) · starttekst. Verjaardag: naam + "is … jarig (en wordt N)".
  - **Edge cases:** ontbrekend token → `verstuurTelegram` faalt soft (`false`, geen crash); ontbrekende `telegram_accounts`-tabel (`42P01`) → behandeld als niet-gekoppeld → push-fallback; mislukte Telegram-call wordt gelogd (`[reminders] telegram mislukt`) zonder gevoelige data. Nog **niet** gedaan: een geblokkeerde bot (403) automatisch `actief=false` zetten.

---

## 12. Fase 5 — UI/UX & foutafhandeling

- **Doel:** nette koppel-UI, globale toggle, en de oude in-app browser-push uitfaseren.
- **Technische stappen:**
  - `ProfielMenu.tsx`: sectie "Telegram" met koppelen/ontkoppelen, status, **toggle "Telegram-reminders aan/uit"** en een "Stuur testbericht"-knop (zoals de bestaande e-mailtest).
  - **In-app 30s browser-push verwijderen** uit `AgendaApp.tsx` (de lokale SW-melding), conform de keuze "alleen cron + Telegram". Web-push/VAPID blijft voorlopig alleen als fallback voor niet-gekoppelde gebruikers; volledige verwijdering kan later.
  - Foutmeldingen netjes tonen (koppelen mislukt, bot geblokkeerd, etc.).
- **Bestanden/onderdelen:** `app/components/ProfielMenu.tsx`, `app/components/AgendaApp.tsx` (in-app push eruit). Geen wijziging aan `AfspraakFormulier` (kanaal is globaal).
- **Complexiteit:** **Laag–Middel**.
- **Risico's:** verwarrende status bij half-voltooide koppeling; per ongeluk én in-app push én Telegram (ondervangen door de in-app push te verwijderen); mobiele weergave.
- **Klaar wanneer:** je kunt koppelen/ontkoppelen/togglen/testen vanuit het profiel, en er komt geen dubbele/lokale browser-push meer naast Telegram.
- ✅ **Deels gebouwd — de kern (geen dubbele meldingen):** het in-app 30s-interval (`checkHerinneringen` + `setInterval`) is **volledig verwijderd** uit `AgendaApp.tsx`, samen met de nu ongebruikte `gevierdRef`-ref, de `useRef`-import en de `eerstvolgendeVerjaardag`-import. Alle reminders lopen nu uitsluitend via de server-cron (Fase 4). Behouden: de notificatie-permissiebanner (`vraagNotificatieToestemming`) en `subscribeerOpPush` — die blijven nodig zodat de **web-push-fallback** (voor niet-gekoppelde gebruikers) via de cron blijft werken.
  - **Waarom dit dubbele meldingen voorkomt:** voorheen vuurde de in-app check een lokale melding *en* stuurde de cron web-push/Telegram → tot 2 meldingen. Nu is er één bron (de cron), dus een gekoppelde gebruiker krijgt alleen Telegram en een niet-gekoppelde alleen web-push.
  - **"Stuur testbericht"-knop gebouwd:** `POST /api/telegram/test` (authed; leest de eigen `chat_id` server-side via RLS, stuurt een testbericht via `verstuurTelegram`; nette fouten bij niet-gekoppeld / mislukte verzending) + een knop in de gekoppeld-sectie van `ProfielMenu.tsx`. Zo verifieer je de koppeling zonder op een echt event te wachten.
  - **Nog open (Fase 3):** de **toggle "Telegram-reminders aan/uit"** (`telegram_accounts.actief` via de UI). De koppel-/ontkoppel-UI uit Fase 2 staat er al.

---

## 13. Fase 6 — Testen & productie/deployment

- **Doel:** betrouwbaar live op Vercel.
- **Technische stappen:**
  - Env vars in Vercel; webhook-URL naar het productiedomein zetten (`setWebhook`).
  - End-to-end test: koppelen → event met Telegram-reminder → bericht ontvangen; test aanpassen/verwijderen van events.
  - Cron blijft cron-job.org (elke minuut). Geen aparte worker nodig.
  - Idempotentie testen door de cron meerdere keren binnen het venster te draaien.
- **Bestanden/onderdelen:** Vercel-config, `README.md`/`CLAUDE.md` updaten bij implementatie.
- **Complexiteit:** **Middel**.
- **Risico's:** webhook in dev vs prod (verschillende URLs); rate limits Telegram.
- **Klaar wanneer:** in productie ontvang je betrouwbaar Telegram-reminders, zonder duplicaten, en koppelen werkt op desktop en mobiel.

---

## 14. Security & privacy aandachtspunten

- **Bot-token nooit hardcoden** → alleen `TELEGRAM_BOT_TOKEN` (env, server-only). Niet in code, Git of dit document.
- **Webhook verifiëren** met `TELEGRAM_WEBHOOK_SECRET` (header-check) zodat alleen Telegram je route kan aanroepen.
- **Koppelcodes**: uniek, willekeurig, **kortlevend** (bv. 10 min) en **eenmalig** (`gebruikt`-flag). Voorkomt dat iemand andermans account koppelt.
- **Chat ID** alleen server-side opslaan/gebruiken (service-role); niet onnodig naar de client sturen.
- **RLS** op de nieuwe tabellen; cron/webhook via service-role.
- **Logging zonder gevoelige data**: geen tokens, geen volledige berichten/mailinhoud, geen chat_ids onnodig loggen.
- **Geen geheimen in docs/README** — alleen env-namen.
- **Ontkoppelen** moet de `chat_id` echt verwijderen (recht om los te koppelen).

---

## 15. Edge cases (onderzoeksvraag 8)

| Situatie | Afhandeling |
|---|---|
| Telegram nog niet gekoppeld | Telegram-optie tonen als "niet beschikbaar / koppel eerst"; cron slaat Telegram-verzending over (geen `chat_id`). |
| Bot geblokkeerd door gebruiker | Telegram API geeft `403`; vang op, log neutraal, markeer evt. koppeling als "inactief"; geen crash. |
| `chat_id` ontbreekt of `actief=false` | Geen Telegram-bericht; val terug op web-push (fallback). E-mail blijft sowieso lopen. |
| Telegram API-error (5xx/timeout) | Try/catch; **niet** als verstuurd markeren bij harde fout? → afweging: bij claim-eerst kan een verloren bericht ontstaan. Aanbeveling: claim-eerst (geen duplicaten) en accepteren dat een zeldzame transient fout een bericht kan missen; venster vangt kleine vertraging op. |
| Reminder-tijd in het verleden | Venstercheck in de cron (zoals nu) → niet versturen voor oude tijden. |
| Event gewijzigd vlak voor verzending | Nieuwe sleutel (datum/tijd/offset) → klopt met de nieuwe situatie; oude sleutel blijft onschadelijk staan. |
| Event verwijderd | Valt uit de cron-query → geen bericht. |
| Scheduler draait meerdere keren | `claimReminder` (unique PK) → alleen de eerste run stuurt. |
| Dubbele `/start <code>` | Code is na eerste gebruik `gebruikt=true` → tweede keer netjes "al gekoppeld/ongeldig". |
| Meerdere accounts/apparaten | MVP: één `chat_id` per gebruiker; later uitbreidbaar. |

---

## 16. Beantwoorde keuzes

De eerder openstaande vragen zijn beantwoord en in dit document verwerkt:

1. **Kanaalmodel:** **globale voorkeur** per gebruiker (vlag `telegram_accounts.actief`) — géén per-event kanaalveld. De reminder-offset blijft per event (`herinneringMinuten`).
2. **Verhouding tot bestaande kanalen:** **Telegram vervangt browser-push** (als gekoppeld + actief). **E-mail blijft** ongewijzigd. Web-push blijft alleen als fallback voor niet-gekoppelde gebruikers en wordt later uitgefaseerd.
3. **Transient Telegram-fouten:** **claim-eerst** (markeren vóór verzenden) → nooit dubbel; een zeldzame transient fout kan één bericht missen (geaccepteerd, consistent met de e-mail-aanpak).
4. **Webhook registreren:** **klein script in de repo** (`scripts/setWebhook.mjs`), herhaalbaar en zonder hardcoded secrets.
5. **In-app 30s-check:** **uitzetten** — alleen de server-cron stuurt Telegram. De lokale browser-push wordt verwijderd zodat er geen dubbele/onbetrouwbare meldingen meer zijn.
6. **Botnaam:** richting **HerinnerMij**; definitieve `@username` afhankelijk van beschikbaarheid bij BotFather.

**Nog praktisch te bepalen bij implementatie:** exacte `@username` (vrij bij BotFather), en wanneer web-push/VAPID volledig wordt verwijderd (nu nog als fallback behouden).

---

## 17. Implementatie-checklist

- [ ] Bot aanmaken via BotFather; token veilig in env (`TELEGRAM_BOT_TOKEN`).
- [ ] Env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_URL` (lokaal + Vercel).
- [x] `app/lib/telegram.ts` met `verstuurTelegram(chatId, tekst, opties?)` — **Fase 1 gebouwd**.
- [x] `scripts/setWebhook.mjs` om de webhook te registreren (met `secret_token`) — **Fase 1 gebouwd**.
- [x] Tabellen `telegram_accounts` (incl. `actief`-vlag) + `telegram_koppelcodes` (+ RLS) — **Fase 2** (SQL door gebruiker te draaien). **Geen** `afspraken`-wijziging (kanaal is globaal).
- [x] Routes: `/api/telegram/link`, `/api/telegram/status` (status + ontkoppelen), `/api/telegram/webhook` — **Fase 2 gebouwd**; `/api/telegram/test` (testbericht) **gebouwd**. (Toggle = Fase 3.)
- [x] Koppelflow end-to-end (code → deeplink → `/start` → koppelen → bevestiging) — **Fase 2 gebouwd + getest** (webhook live op productie, bevestigingsbericht ontvangen).
- [~] `ProfielMenu`: koppelen/ontkoppelen — **Fase 2 (minimaal) gebouwd**. **Toggle "Telegram-reminders aan/uit"** = Fase 3; testbericht = later.
- [x] Cron: per gekoppelde+actieve gebruiker **Telegram i.p.v. web-push** (e-mail ongewijzigd) — **Fase 4 gebouwd**. Idempotentie via de bestaande firing-claim (claim-eerst); aparte `…|telegram`-sleutel niet nodig (zie Fase 11).
- [x] **In-app 30s browser-push verwijderen** uit `AgendaApp.tsx` — **Fase 5 gebouwd** (interval + `checkHerinneringen` + `gevierdRef` weg; permissiebanner + push-subscription behouden voor de web-push-fallback).
- [x] Berichtopmaak (eventnaam/datum/tijd/locatie/remindertekst), geen gevoelige data — **Fase 4 gebouwd** (HTML + `escapeHtml`).
- [ ] Edge cases afgevangen (geblokkeerd, geen chat_id, API-error, dubbele runs).
- [ ] Testen op desktop + mobiel; idempotentie verifiëren.
- [ ] `README.md`/`CLAUDE.md` bijwerken bij implementatie. Geen geheimen committen.

---

### Aangemaakte/aangepaste bestanden (dit onderzoek)
- **Nieuw:** `telegram_fases.md` (dit document).
- **Licht bijgewerkt:** `CLAUDE.md` (pointer naar dit document onder de toekomst-aandachtspunten).
- **Geen** codewijzigingen. **Geen** bot-tokens, API keys of andere geheime waarden opgenomen — alleen env-variabelenamen.
