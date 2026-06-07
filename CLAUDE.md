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
  privacy/page.tsx                — statische privacybeleid-pagina (eigen scroll-container; supportadres = placeholder)
  layout.tsx                      — html/body, viewport-fit, theme-color, safe-area
  globals.css                     — Tailwind import, safe-area CSS (.safe-area-bottom)
  manifest.ts                     — PWA manifest (theme/background wit)
  favicon.ico                     — browser-favicon (16/32/48), gegenereerd uit public/icon.svg
  apple-icon.png                  — apple-touch-icon (180×180, full-bleed), gegenereerd uit public/icon.svg
  types.ts                        — Afspraak, Label, HerhalingConfig, WeergaveType
  components/
    AgendaApp.tsx                 — hoofd-component: state, auth, sync, navigatie, modals
    TopBar.tsx                    — header: desktop (Vandaag, titel, weergave-tabs, plus, avatar) / mobiel (‹ titel › links — titel tikbaar = vandaag, prominente plus + hamburger rechts)
    Sidebar.tsx                   — desktop-zijbalk (hidden sm:flex, w-60): app-naam + Verjaardagen/Labels/Filters (openen modals) + Notes-link onderaan
    MobielMenu.tsx                — mobiel off-canvas menu (drawer vanaf rechts, transform-animatie): Notes-link + Verjaardagen/Labels/Filters
    BottomBar.tsx                 — mobiele navigatiebalk (Maand/Week/Dag/Agenda + Profiel-knop met avatar)
    Avatar.tsx                    — gedeelde avatar-cirkel: profielfoto (data-URL uit user_metadata) óf blauwe initiaal-fallback
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
    ProfielMenu.tsx               — modal: naam, e-mail, knop naar Instellingen, uitlogknop
    InstellingenMenu.tsx          — modal met tabstructuur (tabs "Notificaties" + "Profielfoto"): push/test-e-mail/Telegram + profielfoto kiezen/verwijderen
    LoginPagina.tsx               — inlogformulier
    WeekStrip.tsx                 — horizontale weekstrip (dagweergave mobiel)
    SwRegistratie.tsx             — service worker registratie
    ErrorBoundary.tsx             — vangt render-crashes op (nette NL-melding + herlaadknop), gewrapt om children in layout.tsx
  lib/
    supabase.ts                   — Supabase client
    supabaseOpslag.ts             — CRUD functies voor Supabase (afspraken + labels)
    opslag.ts                     — localStorage cache
    datum.ts                      — datumhulpfuncties (NL namen, tijdNaarMinuten, etc.)
    herhaling.ts                  — genereerHerhalingen() op basis van HerhalingConfig
    verjaardagen.ts               — VERJAARDAG_LABEL + genereerVerjaardagAfspraken() (virtuele all-day events) + reminder-helpers
    feestdagen.ts                 — FEESTDAG_LABEL + berekenPasen()/feestdagenVoorJaar()/genereerFeestdagAfspraken() (virtuele paarse all-day events)
    kleuren.ts                    — labelAchtergrond() + eventKleuren() (achtergrond/tekst/accent per label) + contrastRatio()
    overlap.ts                    — stapelVolgorde() sorteert overlappende getimede events (korter bovenop)
    useSwipe.ts                   — swipe-navigatie hook (mobiel)
    afbeelding.ts                 — verkleinNaarVierkantDataUrl(): profielfoto valideren, center-croppen en verkleinen naar JPEG data-URL
    pushUtils.ts                  — subscribeerOpPush() voor Web Push abonnement
    telegram.ts                   — verstuurTelegram(): server-side Telegram Bot API helper (fail-soft)
  api/
    cron/reminders/route.ts       — cron-endpoint: reminders versturen (Telegram óf push + e-mail)
    push/subscribe/route.ts       — push-abonnement opslaan (POST) / per apparaat verwijderen (DELETE), user-scoped
    push/test/route.ts            — test push-notificatie versturen
    email/test/route.ts           — test e-mailreminder versturen (Resend)
    telegram/link/route.ts        — koppelcode + deeplink genereren (authed)
    telegram/webhook/route.ts     — Telegram-updates: /start <code> → koppelen (secret-header)
    telegram/status/route.ts      — koppelstatus ophalen / voorkeur (actief) wijzigen / ontkoppelen (authed; GET/PATCH/DELETE)
    telegram/test/route.ts        — testbericht naar gekoppelde Telegram-chat (authed)
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
| `TELEGRAM_BOT_TOKEN` | Telegram bot-token (BotFather), server-only |
| `TELEGRAM_WEBHOOK_SECRET` | Secret voor verificatie van inkomende Telegram-webhookcalls, server-only |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Bot-username voor de koppel-deeplink (publiek) |
| `TELEGRAM_WEBHOOK_URL` | Volledige webhook-URL, alleen gebruikt door `scripts/setWebhook.mjs` |

---

## Wat al gedaan is

### Functionaliteit
- **Standaardweergave per apparaat** — initiële state `useState<WeergaveType>('dag')` (SSR-veilig); een mount-effect zet op desktop (`window.matchMedia('(min-width: 640px)')`, = Tailwind `sm`) eenmalig naar `'week'`. Draait één keer → springt niet terug en resizen verandert de keuze niet.
- **Auto-centreren huidige-tijd-indicator (juni 2026)** — het scroll-effect in `DagWeergave`/`WeekWeergave` (dep `[huidigeDatum]`) scrolt bij openen/navigeren naar de rode tijd-indicator, verticaal gecentreerd in de scrollcontainer (`scrollTop = nuPx - clientHeight/2`; de browser klemt vanzelf op [0, max] bij vroege ochtend/late avond). Conditie: dag = vandaag (dag) / vandaag in de getoonde week (week); anders de oude 07:00-fallback (`7 * UURHOOGTE`). Tijd wordt vers gelezen via `new Date()` i.p.v. de `nu`-state, zodat de 60s-kloktick géén herscroll triggert terwijl de gebruiker scrolt. Werkt vanzelf bij view-wissel en terugnavigeren (remount via `key={animatieSleutel}` → effect draait opnieuw). **Agenda-lijst** (`AgendaLijst.tsx`) volgt hetzelfde patroon: bij openen scrolt de lijst naar de sectie van vandaag (of de eerstvolgende dag mét items, `datum >= vandaag`; sticky "— Vandaag"-header komt tegen de top via `getBoundingClientRect`-delta). Liggen alle events van de maand vóór vandaag → scroll naar de onderkant; andere maand getoond → geen auto-scroll (bovenaan). Deps alleen `[huidigeDatum]` → data-refresh/filters verspringen de lijst niet; het effect staat vóór de empty-state early return (rules of hooks, refs null → no-op).
- **Navigatie-uitbreiding + Notes-link (juni 2026)** — desktop kreeg een echte **Sidebar** (`Sidebar.tsx`, `hidden sm:flex w-60`, zelfde patroon als de sidebar van de notes-app in `D:\jelle\notes`): app-naam bovenin (h-12 + border-b, lijnt uit met de TopBar), items Verjaardagen/Labels/Filters (openen de bestaande modals) en onderaan met border-t een externe link naar **https://notes.jellebol.nl** (`StickyNote`-icoon, plain `<a>` zonder target="_blank" — conform notes-app). Mobiel: avatar en hamburger **gewisseld** (avatar links, hamburger rechts), hamburger opent nu het nieuwe **off-canvas menu** (`MobielMenu.tsx`) i.p.v. direct het FilterMenu — drawer schuift vanaf rechts in met transform/opacity-transitions (300ms; **altijd gemount** i.t.t. het `if (!open) return null`-modalpatroon, nodig voor de sluit-animatie; `pointer-events-none` + `aria-hidden` als dicht, `motion-reduce:transition-none`, `safe-area-bottom`). Menu-items: Notes (link), Verjaardagen, Labels, Filters (sluiten het menu + openen de modal). De Cake/Tag/Sliders-iconen zijn **uit de TopBar verdwenen** (desktop → Sidebar, mobiel → MobielMenu); de mobiele plus-knop is nu een **gevulde blauwe cirkel** (w-8 h-8, desktop via `sm:`-overrides ongewijzigd subtiel). `AgendaApp`-render geherstructureerd: buitenste `flex flex-row` met Sidebar + rechterkolom `flex flex-col flex-1 min-w-0 h-full` (de `min-w-0` is essentieel tegen de flex `min-width:auto`-valkuil; swipe blijft op `<main>`, BottomBar in de kolom, modals + MobielMenu erbuiten). TopBar-props: `onLabels`/`onVerjaardagen`/`onFilters` weg, `onMenu` erbij.
- **Profielfoto + mobiele navigatie-herinrichting (juni 2026)** — **Profielfoto**: instelbaar via tab "Profielfoto" in `InstellingenMenu` (preview, "Foto kiezen", "Foto verwijderen" zodra er een foto is, status/fout conform het idle/laden/ok/fout-patroon). Opslag: client-side verkleind via `verkleinNaarVierkantDataUrl()` (`lib/afbeelding.ts` — type-check, max 10 MB input, `createImageBitmap` met EXIF-rotatie, center-crop, 256×256 JPEG q0.85, ~100KB-guard op het resultaat; canvas-re-encode neutraliseert ongeldige bestanden, HEIC faalt met nette NL-melding) en als **data-URL in `user_metadata.avatar_data_url`** via `supabase.auth.updateUser()` — **géén Storage-bucket, géén DB-migratie, géén API-route**. Verwijderen = sleutel op `null` (updateUser doet shallow merge). Na opslaan vuurt USER_UPDATED → `setGebruiker` in `AgendaApp` → de afgeleide `avatarUrl`-prop ververst alle plekken vanzelf. Weergave overal via het gedeelde **`Avatar.tsx`** (foto `<img>` met gerichte `no-img-element`-disable, anders blauwe initiaal-cirkel; bewust géén button — aanroepers leveren de knop): TopBar desktop (w-7), BottomBar (w-[22px]), ProfielMenu (w-16), Instellingen-preview (w-24). **Mobiele navigatie**: de Vandaag-knop (rode cirkel) in de BottomBar is vervangen door een **Profiel-knop** (avatar + "Profiel", opent ProfielMenu; de mobiele avatar linksboven in de TopBar is daarmee vervallen); "vandaag" op mobiel = **tik op de titel** in de TopBar (button met `sm:pointer-events-none sm:cursor-default` — desktop houdt de aparte Vandaag-knop). De mobiele header-nav is compacter en links uitgelijnd (titel geen `flex-1` meer maar een **vaste** `w-[160px]` gecentreerd + truncate — vast zodat de pijltjes niet verschuiven bij titels van wisselende lengte; desktop ongewijzigd `sm:w-[200px]`) en het hamburger-icoon is visueel breder via `scale-x-125` (transform, hoogte/layout ongemoeid).
- **Voorkeuren-tab in Instellingen (juni 2026)** — eerste feature uit het personalisatie-onderzoek. Tab "Voorkeuren" (eerste tab + default) in `InstellingenMenu` met drie instellingen: **Open kalender met** (`auto` = week op desktop/dag op mobiel — de oude hardcoded logica, blijft default; `laatst` = laatst gebruikte weergave; of vast dag/week/maand/agenda), **Standaard herinnering** en **Standaard duur** voor nieuwe afspraken. Opslag in **`user_metadata.voorkeuren`** via `supabase.auth.updateUser()` (avatar-patroon: synct via account, géén DB-migratie; USER_UPDATED → `setGebruiker` → de `voorkeuren`-useMemo in `AgendaApp` ververst alles). Per wijziging direct opgeslagen (optimistisch + rollback, "Voorkeuren opgeslagen"-status). `lib/voorkeuren.ts` bevat het type + `leesVoorkeuren()` (valideert per veld, valt per veld terug op default → ontbrekende/corrupte metadata geeft exact het oude gedrag). **Laatst gebruikte weergave** staat bewust in localStorage (`agenda_laatste_weergave`, helpers in `opslag.ts`) — per apparaat en geen netwerk-write per tab-wissel; alleen bewuste keuzes via TopBar/BottomBar (`wijzigWeergave`) tellen, navigatie zoals maand→dag-klik niet. Het oude matchMedia-mount-effect is vervangen door een **run-once-per-login effect** op `[gebruiker]` met `useRef`-guard (reset bij SIGNED_OUT; springt dus niet terug bij USER_UPDATED). `leeg()` in `AfspraakFormulier` gebruikt de standaarden alleen voor níéuwe events.
- **Countdowns voor favoriete events (juni 2026)** — derde idee uit `internet_ideas.md`. Events krijgen een **`favoriet`-veld** (DB-kolom, migratie in de Database-sectie; per occurrence — "hele reeks bewerken" raakt de ster bewust niet). Markeren via de rij "Countdown" met **ster-toggle** in `AfspraakFormulier` (geel gevuld = aan; dupliceren stript de ster). Nieuw menu-item **"Countdowns"** (Hourglass) in Sidebar + MobielMenu → `CountdownModal.tsx`: toekomstige favorieten dichtstbijzijnde eerst met afteltekst ("vandaag"/"morgen"/"over X dagen", op kalenderdagen), klik = navigeren + openen (hergebruik `kiesZoekresultaat`), ster per rij om uit te zetten (`toggleFavoriet` in AgendaApp, optimistisch + fail-soft); verlopen favorieten compact onder **"Voorbij"** (recentste eerst, max 5, nooit automatisch verwijderd; alleen events — verjaardagen tellen altijd naar de eerstvolgende editie); empty state. **Fail-open vóór de migratie**: `upsertAfspraken()` in `supabaseOpslag.ts` retried zonder de `favoriet`-kolom (zelfde patroon als `upsertLabels`); undo/drag spreaden het volledige object → de ster reist automatisch mee. **Verjaardagen als countdown (juni 2026)**: ook `Verjaardag` heeft een `favoriet`-kolom (eigen migratie) + ster-toggle "Countdown" in `VerjaardagFormulier`; de `CountdownModal` mengt favoriete events en verjaardagen in één gesorteerde lijst, waarbij de telldatum van een verjaardag de **eerstvolgende editie** is (`eerstvolgendeVerjaardag`) met "wordt X" als de leeftijd bekend is; klik opent de verjaardag-editor op die datum. `slaVerjaardagOpInSupabase` kreeg dezelfde fail-open-retry.
- **Weer-uitbreiding: detailoverlay, Instellingen-tabs, weer in dagoverzicht (juni 2026)** — (1) **`WeerModal.tsx`**: detailoverlay via Sidebar-item "Weer" (CloudSun) en het MobielMenu — vandaag groot (icoon/label/min-max/regenkans) + horizontaal scrollbare **uur-chips** (vanaf het huidige uur: tijd, icoon, temp, regen%) + lijst komende ~7 dagen (dag, icoon, regenkans, min/max); werkt zodra een locatie is ingesteld, óók als de dagkoppen-toggle uit staat (fetch hangt op locatie, toggle gate alleen `weerVoorWeergave` voor de views). (2) **`lib/weer.ts` v2**: `WeerBundel { dagen, uren }` — één call met daily (`+temperature_2m_min,precipitation_probability_max`) én hourly; `haalForecast()` = pure fetch zonder localStorage (server-bruikbaar), `haalWeerOp()` = client-wrapper met 1-uurs cache (versieveld `v:2`, oude cache ongeldig); `weerLabel(code)` = tekst-mapping los van lucide. (3) **Instellingen van 3 → 5 tabs**: Algemeen (startweergave + nieuwe afspraken), Kalender (werkuren + weer), Dagoverzicht, Notificaties, Account — tab-rij `overflow-x-auto` voor mobiel; het "Voorkeuren opgeslagen"-statusblok is gedeeld door de drie voorkeuren-tabs. (4) **Dagoverzicht (cron) met weer**: met ingestelde locatie krijgt het bericht "Weer: zonnig, 12 tot 21 graden" + "Kans op regen: 60 procent rond 15:00" (dag-max-kans; uur met hoogste kans als tijdsindicatie; < 15% → "vrijwel geen"); geldt voor mail én Telegram (gedeelde tekst); fail-soft.
- **Weer bij de dagkoppen (juni 2026)** — tweede idee uit `internet_ideas.md`. Klein lucide-weericoon + max-temperatuur bij de dagkoppen in **dag- en weekweergave** (maand bewust niet), komende ~7 dagen; daarbuiten niets. **`lib/weer.ts`**: `haalWeerOp(lat, lon)` via **Open-Meteo** (geen API-key/account; `daily=weather_code,temperature_2m_max`, `forecast_days=7`) met **1-uurs localStorage-cache** (`agenda_weer`, cache-key checkt coördinaten — locatiewissel = verse fetch); `zoekLocatie(naam)` via Open-Meteo Geocoding; `weerIcoon(code)` mapt WMO-codes naar lucide-iconen. **Privacy**: uitsluitend de vaste, handmatig ingestelde locatie gaat naar Open-Meteo — geen device-locatie, geen geschiedenis, alles client-side. Voorkeuren-velden `weer` (toggle, default uit)/`weerLocatieNaam`/`weerLat`/`weerLon` (user_metadata, geen migratie); sectie "Weer" in de Voorkeuren-tab (toggle + plaatsnaam-input → geocode bij blur, statusmeldingen, privacy-helpertekst). Eén fetch in `AgendaApp` (effect met cancel-guard) → `weer`-prop naar beide views; weekkolommen krijgen een **vaste-hoogte-regel** zodra weer aan staat (lege placeholder bij ontbrekende forecast → geen layout-shift). **Stil falen**: offline/API-fout → cache of gewoon geen weer, nooit een melding in de kalender.
- **Undo-snackbar (juni 2026)** — eerste idee uit `internet_ideas.md`. Na **verwijderen** (één event of "Alle herhalingen" = hele reeks) en **verslepen** (drag & drop) verschijnt een snackbar gecentreerd onderin ("Afspraak verwijderd/verplaatst · Herstel", reeks = "Reeks verwijderd"): nieuw `Snackbar.tsx` (`fixed bottom-20 sm:bottom-6`, mobiel boven de BottomBar, **z-40 = onder de modals**, `role="status"`, 5s-timer die **pauzeert bij hover**, cleanup bij unmount). Undo-state in `AgendaApp` (`toonUndo`/`herstelAfspraken`): **nieuwste actie vervangt de vorige** (sleutel-teller herstart de timer); herstel = snapshot opnieuw opslaan — **alle Supabase-opslag is upsert met dezelfde id's**, dus geen duplicaten, reminders/dedup blijven kloppen, reeks-herstel via bestaand `slaVeelAfsprakenOpInSupabase`. Aanpak bewust "direct uitvoeren + herstel-upsert" (geen uitgesteld verwijderen). **Bewerken-undo bewust uitgesteld** (bewuste opslagstap + reeks-bewerking vergt N-snapshots). Verloop timer = undo-state opgeruimd, verwijdering definitief.
- **Zoeken, herhaal-einddatum, minikalender en drag & drop (juni 2026)** — (1) **Zoekfunctie**: `ZoekModal.tsx` (bestaand modal-patroon), geopend via het Search-icoon in de TopBar (desktop) of "Zoeken" in het MobielMenu. Client-side over de volledige `afspraken`-state (titel/locatie/notitie) én de **verjaardagen** (naam/notitie, eigen sectie in de resultaten, gesorteerd op eerstvolgende; feestdagen bewust niet), vanaf 2 tekens, case- én diakriet-ongevoelig (`normaliseer()`: NFD + combining marks strippen), aankomend eerst, max 50; event kiezen = `setHuidigeDatum` + `openBewerkAfspraak`, verjaardag kiezen = navigeren naar de eerstvolgende editie + verjaardag-editor. Modal is **op mobiel gecentreerd** (geen bottom-sheet — het toetsenbord zou die verbergen). (2) **Herhaal-einddatum**: `HerhalingConfig.totDatum?` (ISO, inclusief) — **géén DB-migratie** (herhalingen zijn gematerialiseerd); `genereerHerhalingen` gebruikt bij `totDatum` veiligheidscaps (730 dagen / 104 weken / 24 maanden), einddatum vóór start → alleen het startevent (vangnet: minimaal het startevent); formulier kreeg een "T/m datum"-rij (`min={form.datum}`) die de "Eindigt na"-rij dimt/uitschakelt zodra gevuld. (3) **MiniKalender.tsx** in de Sidebar (desktop): eigen `peilmaand`-state gesynchroniseerd op `huidigeDatum`, ‹ › navigatie, vandaag = rood / selectie = blauw, event-dots (Set-memo), klik = `gaNaarDatum()` (**behoudt de weergave**, bewust anders dan `selecteerDag`). (4) **Drag & drop** (`lib/useEventDrag.ts`): **muis-only** (`pointerType === 'mouse'`-guard → touch/swipe/scroll mobiel volledig ongemoeid), week- + dagweergave, alleen getimede events; 5px-drempel (klik blijft klik via `consumeerKlik()`), 15-min-snap, duurbehoud met clamp binnen 00:00–24:00, week ook horizontaal (dag-delta via `offsetParent`-kolombreedte, geclamped op de weekgrenzen); live tijdlabel + schaduw tijdens slepen; drop → `verplaatsAfspraak()` in AgendaApp (optimistisch + fail-soft Supabase-sync). **Herhalend event verslepen = alleen die occurrence** (gematerialiseerd, zelfde semantiek als "Alleen dit event"). Vervolgstappen (ideas.md): maandweergave-drag, hele-dag-drag, touch-drag.
- **Afrondingsbundel: weeknummers, wachtwoord, Telegram-403, kleurpicker (juni 2026)** — (1) **ISO-weeknummers**: `getWeekNummer()` in `lib/datum.ts` (donderdag-truc, correct rond jaarwisselingen); getoond als "wk NN" in de lege hoek van de weekweergave-kolomhoofden en als "· week NN" achter de dagtitel; maand/TopBar bewust niet. (2) **Wachtwoord wijzigen**: de tab "Profielfoto" heet nu **"Account"** (id `account`) met de profielfoto-sectie + sectie Wachtwoord (2 velden `new-password`, client-side ≥6 tekens + match-check, `supabase.auth.updateUser({ password })`, idle/laden/ok/fout, velden leeg na succes; wachtwoorden nooit geloggd). (3) **Telegram bot-403 auto-disable**: `verstuurTelegram` retourneert nu `{ ok, status }` (alle checkende call-sites bijgewerkt; webhook-calls zijn fire-and-forget). Bij `status === 403` (bot geblokkeerd) verwijdert de cron de koppeling via `verwerkTelegram403()` → reminders vallen automatisch terug op web-push, dagoverzicht skipt met de bestaande UI-warning, Instellingen toont weer "Telegram koppelen". Bovendien: faalt een Telegram-reminderpoging (om welke reden ook), dan wordt in dezelfde firing alsnog web-push gestuurd. Tijdelijke fouten (5xx/netwerk) raken de koppeling niet. Testroute geeft bij 403 een gerichte foutmelding. (4) **Kleurpicker**: `PRESET_KLEUREN` in `LabelBeheer.tsx` van 12 → 24 (basis-iOS-palet + diepe/zachte tinten); zelfde hex-formaat dus overal automatisch ondersteund. (5) **Check**: "hele-dag events in weekweergave" bleek al volledig te bestaan (aparte rij boven het grid) — ideas.md-entry was verouderd.
- **Begroeting, dupliceren, invul-suggesties en werkuren (juni 2026)** — bundel van vier verbeteringen. (1) **Begroeting + dagsamenvatting**: `lib/begroeting.ts` → `begroetingstekst(naam, afsprakenVandaag)` ("Goedemorgen Jelle · 3 afspraken vandaag, eerste om 09:00"; dagdeel-bewust, heeldag-varianten, naam uit `voorkeuren.naam`); getoond in de Sidebar onder de app-naam (desktop) en onder de dagtitel in `DagWeergave` (alleen mobiel, `sm:hidden`); berekend in `AgendaApp` op de échte afspraken van vandaag (virtuele verjaardagen/feestdagen tellen niet mee). (2) **Event dupliceren**: knop in `AfspraakFormulier` bij bestaande events — reset `id`/`herhalingGroepId` in de formstate waardoor het formulier ter plekke een nieuw-event-formulier wordt (titel gelijk, Apple-conventie); pas "Toevoegen" slaat op, origineel blijft onaangeraakt. (3) **Invul-suggesties**: alleen bij níéuwe events; vanaf 2 tekens max 4 suggesties uit eigen events (case-insensitive `includes`, dedup per titel — recentste wint), dropdown onder het titelveld met pijltjes/Enter/Escape + `onMouseDown` (blur-race); kiezen vult titel/labelIds/locatie en past de bron-duur toe op de huidige begintijd, tenzij `eindHandmatig` (gezet door de eind-TijdKiezer) — datum/begintijd blijven altijd staan. (4) **Werkuren**: voorkeuren `werkuren`/`werkurenStart`/`werkurenEind` (default uit, 09:00–17:00; `start >= eind` → terug naar defaults in `leesVoorkeuren`); sectie in de Voorkeuren-tab met hergebruikte `TijdKiezer`; in Dag-/WeekWeergave per kolom twee overlay-divs (`bg-gray-100/60 pointer-events-none`, vóór lijnen/events in de DOM) — dubbelklik en events blijven werken, tijd-indicator (z-20) blijft bovenop; weekdag-selectie bewust uitgesteld (ideas.md). NB: de quick wins "Vandaag-knop desktop" en "klik op maanddag → nieuw event" bleken al te bestaan (TopBar resp. lege-ruimte-klik in de maandcel).
- **Dagoverzicht via Telegram of e-mail (juni 2026)** — tweede personalisatie-feature. Blok "Dagoverzicht" in de Voorkeuren-tab: toggle **Dagoverzicht ontvangen**, **Kanaal** (Telegram/E-mail), **Tijd** (halve uren, default 07:00) en optioneel **Naam** (begroeting; opslaan bij blur). Voorkeuren-velden `naam`/`dagoverzicht`/`dagoverzichtKanaal`/`dagoverzichtTijd` in `lib/voorkeuren.ts` (zelfde per-veld-validatie/defaults; default uit). Verzending zit **in de bestaande every-minute cron** (`/api/cron/reminders`, eigen sectie + `dagoverzichtVerstuurd` in de response): `auth.admin.listUsers()` → voorkeuren uit `user_metadata` → zelfde ±2 min-tolerantievenster → **dedup via `claimReminder('dagoverzicht|userId|datum')`** (max 1/dag, ook bij dubbele cron-runs) → afspraken van vandaag (heeldag eerst, "Hele dag {titel}") + verjaardagen van vandaag (`migreerDatumVelden`; niet-terugkomend alleen in eigen jaar). **Telegram-kanaal gebruikt alleen de koppeling** (helper `telegramChat()`, bewust zónder `actief`-check — dat is de reminder-voorkeur); niet gekoppeld → skip + log, de UI toont een rode warning (tgStatus al beschikbaar in `InstellingenMenu`). E-mail = **text-only** Resend-mail, subject "Dagoverzicht". **Berichten zijn bewust minimalistisch: platte tekst, geen emoji's, geen bold/markdown, geen em-dashes** ("Goedemorgen {naam}" / "Vandaag:" / "Vandaag staat er niets gepland." / "Geen afspraken" + "Verjaardagen:"-blok). Per gebruiker try/catch; geen nieuwe env vars; beperking: valt de cron-job.org-job stil, dan ook het dagoverzicht (zelfde afhankelijkheid als reminders).
- **Tijdsinvoer afspraakformulier (juni 2026)** — (1) **Eindtijd schuift mee** met de begintijd via `wijzigBeginTijd()` in `AfspraakFormulier.tsx`: duurbehoud (standaard 1 uur; handmatig gekozen duur blijft behouden), ongeldige/negatieve duur valt terug op 60 min, over middernacht wrapt de eindtijd (`% 1440`, zelfde wrap als `leeg()`). Eind-veld blijft los aanpasbaar. (2) **`TijdKiezer.tsx`** vervangt de kale `<input type="time">`-velden: op mobiel (`sm:hidden`) twee native selects (uur 00–23, minuten per 5; afwijkende minuten uit oude data worden als extra optie geïnjecteerd) — dit vermijdt de ronde Material-klok-picker op Android/Samsung; op desktop (`hidden sm:block`) het klassieke `type="time"`-veld. Geen nieuwe dependency, styling conform de bestaande velden.
- **Real-time sync** — Supabase Realtime `postgres_changes` op `afspraken` en `labels`; Realtime moet aan staan in Supabase dashboard
- **Profielmenu** — `ProfielMenu.tsx`, geöpend via de avatar in de TopBar (desktop) of de Profiel-knop in de BottomBar (mobiel). Bevat naam/e-mail, een **Instellingen**-knop en uitloggen.
- **Instellingenpagina** — `InstellingenMenu.tsx`, een modal met **tabstructuur** (tabs in een array → makkelijk uitbreidbaar; inmiddels **Algemeen / Kalender / Dagoverzicht / Notificaties / Account**, tab-rij horizontaal scrollbaar op mobiel). Geopend vanuit het profielmenu (knop "Instellingen", die het profielmenu sluit). Tab Notificaties bevat een sectie **Meldingen** (browser-push: status / aanzetten / uitzetten per apparaat / uitleg bij geblokkeerde permissie — TWA fase 3), de verplaatste **test-e-mailreminder**-knop en de **Telegram**-acties (koppelen / testbericht / aan-uit-toggle / ontkoppelen). De testknoppen stonden voorheen in `ProfielMenu.tsx`; die is nu teruggebracht tot profiel-info + navigatie. Werkt als bottom-sheet op mobiel en gecentreerde card op desktop (zelfde modal-patroon als `VerjaardagenLijst`).
- **Verjaardagen** — aparte structuur (tabel `verjaardagen` + localStorage-cache), geopend via "Verjaardagen" in de Sidebar (desktop) of het MobielMenu (mobiel). Klik opent eerst `VerjaardagKeuze.tsx` (keuzestap: nieuwe toevoegen / huidige bekijken). Beheer via `VerjaardagenLijst.tsx` (tabel + paginatie, klikbare rijen) + `VerjaardagFormulier.tsx` (aanmaken/bewerken/verwijderen met bevestiging).
  - **Datamodel**: `dag` + `maand` (verplicht), `geboortejaar` (optioneel, **vrije tekst**: "1998", "onbekend", "ongeveer 30") — géén opgeslagen `datum`/`leeftijd` meer. Leeftijd wordt berekend met `berekenLeeftijd()` via `parseGeboortejaar()` (pakt een 4-cijferig jaartal uit de tekst; anders geen leeftijd). `migreerDatumVelden()` leest nieuw model én oude rijen (`datum`/`leeftijd`, integer-`geboortejaar`) in als string, gebruikt bij Supabase- én localStorage-load. Bij opslaan wordt `datum` gesynthetiseerd gevuld (kolom NOT NULL bij bestaande installaties; jaar via `parseGeboortejaar` ?? 2000), maar dag/maand/geboortejaar zijn leidend.
  - **Import**: `scripts/importVerjaardagen.mjs` importeert `namen_en_verjaardagen.md` (formaat `Naam:` / `Verjaardag: DD-MM-YYYY`) via service-role naar Supabase. Idempotent (dedup op naam+dag+maand, deterministische id `imp-<slug>-<ddmm>`); `--dry-run` voor controle. Draaien: `node --env-file=.env.local scripts/importVerjaardagen.mjs`.
  - **Kalender**: getoond als **virtuele all-day events** via `genereerVerjaardagAfspraken()` (id `vj:<id>:<jaar>`, heeldag, groen virtueel label `VERJAARDAG_LABEL`), samen met de echte afspraken aan de views meegegeven — **geen view-component aangepast**. Klik op zo'n event opent de verjaardag-editor (`isVerjaardagEvent`). Terugkomend = instantie per jaar binnen een bereik rond nu.
  - **Reminders**: verankerd op **09:00**, opties geen / 1 uur / 1 dag / **1 week** (`herinneringMinuten` -1 / 60 / 1440 / 10080), zowel in-app (`AgendaApp` 30s-check) als via de cron (push + e-mail; kandidaat-jaren `[ditJaar, ditJaar+1]`, jaarlijks herberekend).
- **Filters** — `FilterMenu.tsx` (geopend via "Filters" in de Sidebar op desktop óf in het MobielMenu op mobiel). Type `Filters` (`{ events, verjaardagen, feestdagen }`) in `types.ts`; persistent in localStorage via `laadFilters`/`slaFiltersOp`/`STANDAARD_FILTERS` (`opslag.ts`, key `agenda_filters`). Filtering gebeurt in de `afsprakenVoorWeergave`-memo in `AgendaApp` (per type wel/niet meenemen) — alleen weergave, data blijft. Bij opstarten geladen via mount-`useEffect` (SSR-veilig).
- **Maand-swipe** — `useSwipe` is in `AgendaApp` aangezet voor `dag`/`week`/`maand`; `navigeerVorige/Volgende` doen maand ±1. Geen view-wijziging nodig (swipe staat op `<main>`).
- **Stabiele desktop-header** — titel-`<span>` in `TopBar` heeft `text-center truncate flex-1 sm:flex-none sm:w-[200px]`: vaste breedte op desktop zodat prev/next niet verschuiven; vloeiend op mobiel. Mobiele hamburger (`Menu`) staat rechts in de acties-groep (`sm:hidden`); de avatar staat op mobiel links in de nav-groep.
- **Kleur-customization per label** — `Label` heeft naast `kleur` (accent) optionele `achtergrondKleur`/`tekstKleur` (`types.ts`; DB-kolommen `achtergrond_kleur`/`tekst_kleur`). `eventKleuren(label, tintOpacity)` in `lib/kleuren.ts` geeft `{ accent, achtergrond, tekst }`: zonder eigen kleuren = huidige tint + accent-tekst (dus verjaardag/feestdag/label-loos ongewijzigd). Alle event-renders (Week/Dag/Maand/Agenda, timed + all-day) gebruiken `eventKleuren`. Beheer in `LabelBeheer.tsx`: toggle "Eigen achtergrond/tekstkleur" + twee native `<input type=color>` + live event-preview + `contrastRatio < 3` waarschuwing. `slaLabelOpInSupabase`/`uploadNaarSupabase` gebruiken `upsertLabels()` die fail-open terugvalt zonder de nieuwe kolommen (pre-migratie).
  - **Transparantie**: per kleur een slider (0–100%); de alpha wordt in de kleur-string opgeslagen als `#RRGGBBAA` (CSS-native), dus **géén extra kolom/migratie**. Helpers `hex6Van`/`alphaVan`/`metAlpha` (`lib/kleuren.ts`); de color-picker bindt aan het hex6-deel, de slider aan de alpha. 6-cijferige waarden = volledig dekkend (bestaande labels ongewijzigd).
  - **Locatie**: in `WeekWeergave`/`DagWeergave` wordt de locatie inline naast de titel getoond (bovenste regel, lichter, truncate) i.p.v. tweede regel — valt zo niet weg onder een overlappend event.
- **Feestdagen** — Nederlandse nationale feestdagen, getoond via hetzelfde virtuele-event-patroon als verjaardagen: `genereerFeestdagAfspraken()` in `lib/feestdagen.ts` levert virtuele all-day `Afspraak`-objecten (id `fd:<key>:<jaar>`, heeldag, **paars** virtueel label `FEESTDAG_LABEL` kleur `#AF52DE`) die in `AgendaApp` aan `afsprakenVoorWeergave`/`labelsVoorWeergave` worden toegevoegd — **geen view-component aangepast**. **Geen opslag/DB/reminders**: puur per jaar berekend (bereik `peiljaar-2…+6`), dus geen duplicaten en read-only. Klik op een feestdag is een no-op (`isFeestdagEvent`-guard in `openBewerkAfspraak`). Vaste datums hard gecodeerd (incl. Koningsdag → 26 apr als 27 apr op zondag valt, Dodenherdenking 4 mei, Sinterklaas 5 dec); Pasen-afhankelijke dagen (Goede Vrijdag, Eerste/Tweede Paasdag, Hemelvaart, Eerste/Tweede Pinksterdag) berekend uit `berekenPasen()` (Meeus/Jones/Butcher); Prinsjesdag = derde dinsdag van september.
- **Settings-tab (oud) verwijderd** — het oude `InstellingenPanel.tsx` stond na het verwijderen van de tab nog als dode code in de repo en is in juni 2026 definitief verwijderd, samen met het ongebruikte `app/lib/mockData.ts`; de huidige instellingen leven in `InstellingenMenu.tsx` (zie "Instellingenpagina" hierboven)
- **Zoekicoon verwijderd** — uit TopBar
- **Error boundary** — `ErrorBoundary.tsx` (class component) om `{children}` in `layout.tsx`: bij een onverwachte render-fout een nette NL-melding + "Herlaad de app"-knop i.p.v. een wit scherm
- **Lint-conventie mount-effects** — de `react-hooks/set-state-in-effect`-regel (ESLint 9 / eslint-config-next 16) keurt setState in effect-bodies af; de bewuste SSR-veilige mount-effects (filters/weergave laden, notificatiebanner, form-reset bij modal-open) hebben een gerichte `// eslint-disable-next-line react-hooks/set-state-in-effect` met uitleg-comment. Niet herschrijven naar lazy `useState`-init: dat geeft hydration-mismatches met de statisch geprerenderde HTML.

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
- **Favicon = app-icoon** — alle iconen worden beheerd via `public/icon.svg` (bron) + `scripts/generate-icons.mjs` (sharp). Het script genereert naast de manifest-iconen (`public/icon-192/512/maskable/play.png`) ook `app/favicon.ico` (multi-size 16/32/48, PNG-in-ICO) en `app/apple-icon.png` (180×180, full-bleed `#007AFF` zoals de maskable — iOS kent geen transparantie). De `<link rel="icon">`/`<link rel="apple-touch-icon">`-tags komen automatisch via Next.js file conventions (`app/favicon.ico`/`app/apple-icon.png`), inclusief content-hash als cache-buster — géén handmatige `<head>`-config. Bij een nieuw icoon-ontwerp: alleen `icon.svg` vervangen en het script herdraaien (`node scripts/generate-icons.mjs`).

### Reminders
- ~~**In-app check** elke 30 seconden~~ — **verwijderd (Telegram Fase 5)**. Vroeger vuurde `AgendaApp` lokaal via `ServiceWorkerRegistration.showNotification()` met dedup via `gevierdRef`; dat is weg om dubbele meldingen náást de cron (web-push/Telegram) te voorkomen. **Alle reminders lopen nu uitsluitend via de server-cron.** De notificatie-permissiebanner + `subscribeerOpPush` blijven wél bestaan, zodat de web-push-fallback via de cron blijft werken.
- **Cron-endpoint** `/api/cron/reminders` — push + e-mail; draait elke minuut via cron-job.org. De "due"-check heeft een tolerantievenster van ~4 minuten → zonder dedup zou dezelfde mail 4× verstuurd worden.
- **Dode push-subscriptions opgeschoond (TWA fase 3)** — helper `stuurPushNaarGebruiker(userId, payload)` in de cron (gebruikt door event- én verjaardagstak): bij web-push-status **404/410** wordt de `push_subscriptions`-rij verwijderd met compacte log `[reminders] dode push-subscription opgeruimd` (alleen statuscode, nooit endpoints/sleutels); andere fouten = transient → subscription blijft. Response bevat `pushOpgeruimd`. Zelfde cleanup in `/api/push/test` (user-scoped, prefix `[push-test]`). Client: `subscribeerOpPush` detecteert VAPID-sleutelwissel (unsubscribe + opnieuw) en doet één retry bij subscribe-fouten; `afmeldenVanPush` (nieuw in `pushUtils.ts`) = browser-unsubscribe + `DELETE /api/push/subscribe`. Geen DB-migratie nodig geweest.
- **Idempotentie (dubbele mails voorkomen)** — `claimReminder(sleutel)` doet een atomische `insert` in tabel `verzonden_reminders` (PK `sleutel`). Events: `${id}|${datum}|${begin_tijd}|${herinnering_minuten}`; verjaardagen: `vj|${id}|${jaar}|${herinnering_minuten}`. `23505` (duplicate) → overslaan; ontbrekende tabel/andere fout → **fail-open** (verstuur toch). Alleen de eerste cron-run binnen het venster verstuurt. Markeringen > 60 dagen worden bij elke run opgeruimd. Logging met prefix `[reminders]` in Vercel-logs (due/dubbel-overgeslagen/verstuurd).
- **E-mailreminders** via Resend — zelfde `herinnering_minuten` instelling als push; domein `jellebol.nl` geverifieerd; env vars ingesteld in Vercel.

### Database
- Kolom `herhalingsgroep_id` handmatig toegevoegd aan bestaande Supabase `afspraken` tabel via SQL:
  ```sql
  alter table afspraken add column if not exists herhalingsgroep_id text;
  ```
- Kolom `favoriet` toevoegen voor de Countdowns-feature (client valt fail-open terug zonder deze kolom):
  ```sql
  alter table afspraken add column if not exists favoriet boolean default false;
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
- Kolom `favoriet` toevoegen aan `verjaardagen` voor Countdowns (client valt fail-open terug zonder deze kolom):
  ```sql
  alter table verjaardagen add column if not exists favoriet boolean default false;
  ```
- Kleur-customization per label — kolommen toevoegen aan `labels` (client valt fail-open terug zonder deze kolommen):
  ```sql
  alter table labels add column if not exists achtergrond_kleur text;
  alter table labels add column if not exists tekst_kleur text;
  ```
- Telegram-koppeling (Fase 2) — twee tabellen toevoegen:
  ```sql
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

  create table if not exists telegram_koppelcodes (
    code text primary key,
    user_id uuid references auth.users not null,
    aangemaakt_op timestamptz default now(),
    verloopt_op timestamptz not null,
    gebruikt boolean default false
  );
  alter table telegram_koppelcodes enable row level security;
  ```
  `telegram_koppelcodes` heeft bewust **geen** authenticated-policy: alleen de service-role (link-route + webhook) leest/schrijft codes, clients hebben geen toegang. `telegram_accounts` wordt door de status-route (user-scoped, RLS) gelezen/verwijderd en door de webhook (service-role) ge-upsert.

---

## Aandachtspunten voor de toekomst

- **Push-notificaties iOS** — werken alleen in standalone PWA-modus (Home Screen), niet in Safari-tab; vereist iOS 16.4+
- **E-mailreminders** — afhankelijk van cron-job.org die elke minuut draait; als cron stopt, geen reminders
- **Herhalende events bewerken** — momenteel alleen aanmaken en verwijderen; bewerken van één instantie vs. alle herhalingen is nog niet geïmplementeerd
- **Mobiele weergave testen** — na safe-area wijzigingen altijd testen op echte iOS en Android
- **Timezone** — cron gebruikt `Europe/Amsterdam`; client gebruikt lokale timezone; consistent als gebruiker in NL zit
- **Accountlimiet** — ingesteld op 10 accounts max (`/api/auth/check-capacity`)
- **TWA / Google Play Store (in opbouw)** — onderzoek + fasering in `twa_fases.md`. Doel: de PWA via Bubblewrap als Trusted Web Activity in een **gesloten Play-testtrack** (package `nl.jellebol.agenda`, appnaam "Agenda", bestaande Web Push hergebruikt — geen FCM). **Fase 1 gebouwd**: manifest aangevuld met `id: '/'` + `scope: '/'` (`app/manifest.ts`); `scripts/generate-icons.mjs` genereert nu een **echte maskable icon** (icoon op 80% op vol-vlak `#007AFF` 512×512-canvas — niet meer byte-identiek aan icon-512) plus `public/icon-play.png` (Play Console-upload, niet in het manifest). **Fase 2 gebouwd**: productie geverifieerd (HTTPS + HSTS, manifest met `id`/`scope` live, alle PWA-assets 200, Vercel-defaults zonder vercel.json/middleware) en **privacypagina** `app/privacy/page.tsx` (→ `/privacy`, statisch; links op loginpagina + onderaan Instellingen; supportadres nog placeholder — er komt een apart adres). **Fase 3 gebouwd**: push robuust — 404/410-opschoning dode subscriptions (cron + testroute, logs zonder endpoints), VAPID-wisseldetectie + retry in `pushUtils`, `afmeldenVanPush` + `DELETE /api/push/subscribe`, en de sectie "Meldingen" in Instellingen; handmatige Android-testchecklist in `twa_fases.md` fase 3. Restpunten fase 1–3: Lighthouse-audit op productie, Android-pushtestchecklist op echt toestel, supportadres invullen. **Fase-0-voorbereiding gebouwd (juni 2026)**: gate-sectie **"Eerst regelen vóór fase 4"** in `twa_fases.md` (afvinkbaar: Play-account, icoon-proces in 8 stappen, supportadres, testtoestel, toestel-tests, locatie Android-project — voorstel `D:\jelle\agenda-twa`); praktische checklists in **`play_store_checklist.md`** (Developer-account, vastliggende beslissingen, supportadres-/testerlijst-regels, Console-stappen fase 5) en **`toestel_tests.md`** (handmatige Android-testsessie: installability, Lighthouse, offline, 10-staps push); `.gitignore` voorbereid op signing-artifacts (`*.keystore`, `*.jks`, `keystore.properties`, `**/key.properties`); TODO-comment bij de supportadres-placeholder in `app/privacy/page.tsx`. **Fase 4 gebouwd (juni 2026) via de sideload-route** (routewijziging: eerst lokale APK zonder Play-account; Play-traject = fase 5, later): Bubblewrap-project in `D:\jelle\agenda-twa` (buiten de repo; JDK/SDK door Bubblewrap zelf in `C:\Users\info\.bubblewrap\`), package `nl.jellebol.agenda` (init-default `…twa` overschreven), eigen PKCS12-keystore via keytool (wachtwoord in wachtwoordmanager, nooit in repo/chat), `app-release-signed.apk` + AAB, en `public/.well-known/assetlinks.json` met de échte SHA-256 (uit de APK gelezen via `apksigner verify --print-certs`). Bekende valkuil: `bubblewrap init` crashte op Windows ("The session has been destroyed") — herstel met `bubblewrap update`. **TWA-bevinding swipe (juni 2026)**: swipe-navigatie deed het niet op Android Chrome/TWA (wel op iOS) — Android Chrome vuurt `pointercancel` zodra het een touch-drag voor native scroll claimt, waardoor `pointerup` (en dus de swipe-evaluatie) nooit komt; `touch-pan-y` op `<main>` alleen bleek in de praktijk **niet** genoeg. Definitieve fix: `useSwipe` herschreven van pointer-events naar **touch-events** (`touchstart`/`touchend`/`touchcancel`) — die lopen tijdens native scroll gewoon door en krijgen geen cancel; zelfde drempels (60px, ratio 1.5), zelfde target-filter en click-onderdrukking, desktop/muis vanzelf uitgesloten (geen touch-events). `touch-pan-y` op `<main>` blijft staan als flankerende maatregel. **Pushnotificaties emoji-vrij (juni 2026)**: cron-event = titel "Herinnering" + body "{titel} om {HH:MM}", cron-verjaardag = titel "Verjaardag", testroute = "Testmelding"/"Pushmeldingen werken op dit apparaat", sw.js-fallbacktitel "Agenda"; icon/badge/tag/klikgedrag ongewijzigd. E-mail (🎂 in verjaardag-subject/h1) en de Telegram-koppelbevestiging (✅/⛔️) zijn bewust ongemoeid gelaten (eigen, niet-gedeelde strings). **Op het toestel bevestigd (juni 2026)**: APK gesideload, fullscreen zonder URL-balk (Google's Asset Links-API bevestigt de statement), login, pushmeldingen én swipe werken. Nog te doen: resterende toestel-tests (Lighthouse, offline, volledige 10-staps pushchecklist — `toestel_tests.md`), nieuw icoon-ontwerp (dan `icon.svg` vervangen + script herdraaien + nieuwe APK), en het optionele Play-traject (account, listing; tweede Play App Signing-fingerprint in `assetlinks.json` bij de eerste upload).
- **Telegram-reminders (afgerond)** — onderzoek + fasering in `telegram_fases.md`. Telegram-bot (richting **HerinnerMij**) als betrouwbaarder pushkanaal: **globale voorkeur per gebruiker**, Telegram **vervangt browser-push** (e-mail blijft); de in-app 30s-push wordt verwijderd. Aanpak sluit aan op de bestaande cron (`/api/cron/reminders`) + `verzonden_reminders`-dedup (sleutel `…|telegram`, claim-eerst); koppelen via kortlevende koppelcode + bot-deeplink + **webhook** (geen polling op Vercel), geregistreerd met `scripts/setWebhook.mjs`. Nieuwe tabellen `telegram_accounts` (incl. `actief`-vlag) + `telegram_koppelcodes`; **geen** `afspraken`-wijziging. Env-namen: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_URL` (geen waarden in repo/docs).
  - **Fase 1 gebouwd**: server-side helper `app/lib/telegram.ts` (`verstuurTelegram(chatId, tekst, opties?)`, alleen `fetch`, fail-soft → `false` bij ontbrekend token of fout, logt nooit token/chat_id) + herhaalbaar registratiescript `scripts/setWebhook.mjs` (`node --env-file=.env.local scripts/setWebhook.mjs`, zet `setWebhook` met `secret_token` + `allowed_updates:['message']`).
  - **Fase 2 gebouwd**: koppelflow. Tabellen `telegram_accounts` + `telegram_koppelcodes` (SQL hierboven). Routes: `POST /api/telegram/link` (authed → genereert kortlevende `base64url`-code (10 min), slaat op via service-role, geeft `t.me/<bot>?start=<code>` terug), `POST /api/telegram/webhook` (verifieert `X-Telegram-Bot-Api-Secret-Token`, claimt de code **atomisch** via `update ... where gebruikt=false and verloopt_op>now() returning user_id` → upsert `telegram_accounts` → bevestigingsbericht), `GET/DELETE /api/telegram/status` (user-scoped: status / ontkoppelen). UI: minimale "Telegram koppelen/ontkoppelen"-sectie in `ProfielMenu.tsx` (opent deeplink + polled status elke 3s tot ~2 min). **End-to-end getest op productie** (bot `@HerinnerMijBot`, webhook `https://agenda.jellebol.nl/api/telegram/webhook`).
  - **Fase 4 gebouwd**: cron-verzending. In `app/api/cron/reminders/route.ts` (events én verjaardagen) bepaalt de helper `actieveTelegramChat(userId)` per firing of de gebruiker Telegram gekoppeld + `actief=true` heeft. Zo ja → `verstuurTelegram(...)` (HTML, `escapeHtml()` op titel/locatie/naam) en **géén** web-push; anders web-push als fallback. **E-mail blijft ongewijzigd.** Idempotentie via de **bestaande** firing-`claimReminder` (claim-eerst, dekt de hele firing) — bewust géén aparte `…|telegram`-sleutel (push/Telegram sluiten elkaar binnen één firing uit). Fail-soft bij ontbrekend token / ontbrekende `telegram_accounts`-tabel (`42P01` → push-fallback); response bevat nu `telegramVerstuurd`. Build + lint groen. Nog **niet** live getest (vereist een actieve cron-firing) en een geblokkeerde bot (403) wordt nog niet automatisch op `actief=false` gezet.
  - **Fase 5 gebouwd**: in-app 30s browser-push verwijderd uit `AgendaApp.tsx` (interval + `checkHerinneringen` + `gevierdRef` + ongebruikte imports `useRef`/`eerstvolgendeVerjaardag` weg). Reminders lopen nu uitsluitend via de cron, dus geen dubbele meldingen meer náást Telegram. Permissiebanner + `subscribeerOpPush` behouden voor de web-push-fallback. Notificatieflow nu: **gekoppeld+actief → Telegram; niet-gekoppeld → web-push via cron; e-mail altijd.**
  - **Testbericht-knop gebouwd**: `POST /api/telegram/test` (authed; leest de eigen `chat_id` server-side via RLS en stuurt een testbericht via `verstuurTelegram`) + een knop in de gekoppeld-sectie van `ProfielMenu.tsx`. Verifieert de koppeling zonder op een echt event te wachten.
  - **Berichten zonder emoji's**: de Telegram-reminderteksten (event + verjaardag in `cron/reminders` en het testbericht in `telegram/test`) bevatten **geen emoji's** meer (`📅`/`🗓️`/`📍`/`🎂`/`🔔` verwijderd). Opmaak verder gelijk: event = `<b>titel</b>` / `datum · tijd` / `locatie` / starttekst; verjaardag = `<b>naam</b>` + regel. Escaping (`escapeHtml`) en `parse_mode: HTML` ongewijzigd. **Push- en e-mailberichten houden hun emoji's** (alleen Telegram aangepast). De koppel-bevestiging in de webhook (`✅`/`⛔️`) is géén reminder en is ongemoeid gelaten.
  - **Fase 3 gebouwd**: globale aan/uit-toggle. `PATCH /api/telegram/status` (authed, body `{ actief: boolean }`, user-scoped update op `telegram_accounts.actief` via RLS; 404 als niet gekoppeld) + iOS-stijl toggle "Telegram-reminders" in de gekoppeld-sectie van `InstellingenMenu.tsx` (zelfde switch-patroon als `FilterMenu`; optimistisch met rollback + foutmelding bij mislukken; `aria-pressed`/`disabled` tijdens opslaan). `GET /api/telegram/status` leverde `actief` al; de cron las de vlag al (`actieveTelegramChat`) — uit = web-push-fallback, e-mail altijd. **Alle Telegram-fases zijn hiermee afgerond.** Nog open (idee): geblokkeerde bot (403) automatisch op `actief=false` zetten.
