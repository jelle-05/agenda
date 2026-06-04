# 📱 TWA & Google Play Store — Onderzoek & Fasering

> Onderzoeks- en faseringsdocument. Doel: de bestaande agenda-PWA als **Trusted Web Activity (TWA)** verpakken en publiceren in de **Google Play Store**, in eerste instantie via een **interne/gesloten testtrack**. Er is nog geen Android/TWA-project — dit document is de roadmap.
>
> **Voortgang:** **Fase 1 (PWA-basis) is gebouwd** — manifest aangevuld met `id`/`scope`, echte maskable icon met safe zone (80% op vol-vlak `#007AFF`) + `icon-play.png` voor de latere Console-upload. **Fase 2 (productie/deployment + privacybasis) is gebouwd** — productie-checks uitgevoerd en groen (HTTPS, manifest met `id`/`scope` live, alle PWA-assets bereikbaar, HSTS actief), privacypagina `/privacy` toegevoegd met links op de loginpagina en in Instellingen. **Fase 3 (push robuust) is gebouwd** — 404/410-opschoning van dode subscriptions in cron + testroute (veilige logs zonder endpoints), VAPID-wisseldetectie + stale-subscription-herstel in `pushUtils`, en een sectie "Meldingen" in Instellingen (status / aanzetten / uitzetten per apparaat / uitleg bij geblokkeerd). Restpunten (vereisen productie/toestel/extern): Lighthouse-audit, de handmatige Android-pushtestchecklist (zie fase 3), en het supportadres (apart adres, nog aan te maken — placeholder op de privacypagina). **Fase-0-voorbereiding uitgewerkt (juni 2026):** gate-sectie **"Eerst regelen vóór fase 4"** (onder fase 3), praktische checklists in **`play_store_checklist.md`** (Developer-account + Console) en **`toestel_tests.md`** (handmatige Android-testsessie fase 1–3), en `.gitignore` voorbereid op keystore/signing-artifacts. **Fase 4 (Bubblewrap) is gebouwd (juni 2026)** via de **sideload-route** (bewuste routewijziging: lokale APK zonder Play-account; Play-traject = fase 5, later): project in `D:\jelle\agenda-twa`, eigen keystore, `app-release-signed.apk` + AAB, en `public/.well-known/assetlinks.json` met de échte fingerprint. Restpunt fase 4: APK sideloaden + testen op het toestel (incl. URL-balk-check na de assetlinks-deploy).
>
> Zelfde opzet als `telegram_fases.md` en `fases-mail.md`: per fase doel, technische stappen, complexiteit, risico's en een "klaar wanneer". Geen geheime waarden, keystores of persoonsgegevens in dit document of in de repo.

---

## 1. Samenvatting & doel

### Waarom een TWA?

De app is een volwaardige PWA (installeerbaar, offline-fallback, push), maar installatie via "Toevoegen aan startscherm" is voor gebruikers onbekend terrein en de browser-context heeft beperkingen. Een TWA verpakt de bestaande web-app in een echte Android-app:

- **Echte app-installatie** via de Play Store (vertrouwd, vindbaar, automatische updates van de wrapper).
- **Volledig scherm zonder browser-UI** — de app voelt native (mits Digital Asset Links kloppen).
- **Web Push werkt als systeemnotificatie** binnen de TWA (Chrome-engine), betrouwbaarder gepresenteerd dan in een browsertab.
- **Eén codebase** — de TWA toont gewoon `https://agenda.jellebol.nl`; elke Vercel-deploy is direct live in de app, zonder nieuwe Play-release.

### Eindresultaat

Een ondertekende Android-app (AAB) met package **`nl.jellebol.agenda`**, appnaam **"Agenda"**, in een **gesloten testtrack** in de Play Store, geïnstalleerd en getest op echte Android-toestellen. Publieke release is een **optionele vervolgmijlpaal** (zie fase 6).

### Must-have vs. nice-to-have

| Must-have (blokkeert publicatie) | Nice-to-have |
|---|---|
| Geldig manifest (incl. `scope`/`id`), echte maskable icon | Nieuwe screenshots per feature-release |
| Digital Asset Links exact kloppend | Shortcuts in het manifest (bv. "Nieuw event") |
| Signing/keystore + Play App Signing | In-app update-melding bij nieuwe SW-versie |
| Privacybeleid-URL + supportcontact | Publieke Play-release |
| Play-account, listing-basics, content rating, data safety | Aparte tablet-screenshots |
| Werkende installatie zonder URL-balk op een echt toestel | Push-subscription-opschoning (sterk aanbevolen, zie §4) |

---

## 2. Huidige status van het project

**Stack:** Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4 · Supabase (database/auth/realtime) · Vercel (hosting, auto-deploy op `main`) · Web Push (VAPID) · Resend (e-mail) · Telegram-bot (primair reminderkanaal). Productie: **`https://agenda.jellebol.nl`** (HTTPS via Vercel).

| Onderdeel | Status | Waar |
|---|---|---|
| PWA-manifest | ✅ compleet (fase 1) | `app/manifest.ts` → `/manifest.webmanifest`. `name`/`short_name` "Agenda", `description`, `id: '/'`, `start_url: '/'`, `scope: '/'`, `display: standalone`, `orientation: portrait`, `background_color`/`theme_color` `#ffffff`, 4 icons. |
| App-icons | ✅ technisch op orde (fase 1) | `public/icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable.png` (echte safe zone: content op 80% op vol-vlak `#007AFF`), `icon-play.png` (512×512 voor de Play Console, niet in het manifest); pipeline in `scripts/generate-icons.mjs`. ⚠️ Kanttekening: gebaseerd op het **huidige** ontwerp — het gewenste nieuwe icoon-ontwerp (fase 0) staat nog open; script is herdraaibaar zodra dat er is. |
| Service worker | ✅ | `public/sw.js` (cache `agenda-v3`): offline-fallback `public/offline.html`, cache-first voor `/_next/static/`, push-handler + notificatieklik (opent/focust de app). Registratie via `app/components/SwRegistratie.tsx` (scope `/`). |
| Web Push | ✅ compleet | `app/lib/pushUtils.ts` (`subscribeerOpPush`) → `POST /api/push/subscribe` → Supabase-tabel `push_subscriptions` (per `user_id`, RLS). VAPID-keys via env (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Permissiebanner in `AgendaApp.tsx`; testroute `POST /api/push/test`. Verzending via de cron `app/api/cron/reminders/route.ts`. |
| Notificatielogica | ✅ | Alles via de server-cron (elke minuut, cron-job.org): Telegram gekoppeld+actief → Telegram; anders web-push; e-mail altijd. Idempotent via `verzonden_reminders`. |
| Auth & user data | ✅ | Supabase e-mail/wachtwoord, alles RLS per `user_id`; accountlimiet 10 (`/api/auth/check-capacity`). Geen externe OAuth-redirects → TWA-vriendelijke loginflow. |
| Deployment | ✅ | GitHub → Vercel auto-deploy op `main`; env vars in Vercel. |
| Digital Asset Links | ✅ (fase 4) | `public/.well-known/assetlinks.json` met de échte SHA-256 van de eigen signing-key (package `nl.jellebol.agenda`). Play App Signing-fingerprint volgt pas bij een evt. Play-upload. |
| Privacybeleid / support | ✅ pagina (fase 2), ⚠️ supportadres open | `app/privacy/page.tsx` → `agenda.jellebol.nl/privacy` (statisch, NL, beschrijft de echte verwerking: Supabase, Resend, Telegram, push, cache, logs, bewaartermijnen, rechten). Links: loginpagina-footer + onderaan Instellingen. ⚠️ Supportadres is nog een placeholder `[supportadres invullen]` — apart adres wordt later aangemaakt (open vraag 3). |
| Android-project | ✅ (fase 4) | Bubblewrap-project in `D:\jelle\agenda-twa` (buiten deze repo): `twa-manifest.json`, eigen keystore (PKCS12, alias `android`, wachtwoord in wachtwoordmanager), `app-release-signed.apk` + `app-release-bundle.aab`. Route: eerst sideload, Play later. |
| Play-account & assets | ❌ | Geen Google Play Developer-account; geen feature graphic/screenshots/beschrijvingen. |

---

## 3. Must-haves voor Google Play Store-publicatie (checklist)

### Web-app (PWA-kwaliteit)
- [x] Manifest aanvullen: `scope: '/'` en `id: '/'` toegevoegd in `app/manifest.ts` — **fase 1 gebouwd**.
- [ ] Nieuw app-icoon ontwerpen (beslissing fase 0) en doorvoeren in `public/icon.svg`.
- [x] **Echte maskable icon** genereren: icoon op 80% (410px) op vol-vlak `#007AFF` 512×512-canvas (`scripts/generate-icons.mjs`) — **fase 1 gebouwd**.
- [x] 512×512 Play Store-icoon (`public/icon-play.png`) — **fase 1 gebouwd** o.b.v. het huidige ontwerp; herdraaien zodra het nieuwe ontwerp er is.
- [ ] `theme_color`/`background_color` consistent (nu wit — ook de splash van de TWA wordt hiervan afgeleid).
- [ ] HTTPS actief op productiedomein (✅ al in orde via Vercel).
- [ ] `start_url` en `scope` verifiëren op productie (geen redirects buiten scope).
- [ ] Offline-fallback werkt (✅ `offline.html` — hertesten in TWA-context).
- [ ] Lighthouse PWA-audit zonder blockers.

### Android/TWA-techniek
- [ ] Package name / application ID: **`nl.jellebol.agenda`** (definitief — later wijzigen = nieuwe app).
- [ ] Bubblewrap-project genereren vanaf het productie-manifest.
- [ ] Keystore aanmaken (Bubblewrap) — **nooit committen**; bewaren in wachtwoordmanager + back-up. **Play App Signing** aanzetten (Google beheert de release-key, jouw keystore is de upload-key).
- [ ] `public/.well-known/assetlinks.json` met de juiste SHA-256-fingerprint(s) — let op: bij Play App Signing zijn er **twee** fingerprints (upload-key voor lokale builds, Play-signing-key voor de Store-versie); neem beide op.
- [ ] Geïnstalleerde build toont **geen URL-balk** (= asset links geverifieerd).

### Play Console & beleid
- [ ] Google Play Developer-account aanmaken (eenmalig $25 + identiteitsverificatie). ⚠️ Persoonlijk account (na nov 2023): **gesloten test met ≥12 testers gedurende 14 dagen is verplicht vóór een productierelease** — voor ons doel (gesloten test) geen blocker, wel relevant als het later publiek moet.
- [ ] App aanmaken in de Console: naam **"Agenda"**, app-categorie (Productiviteit), gratis.
- [x] **Privacybeleid-URL** — `agenda.jellebol.nl/privacy` (`app/privacy/page.tsx`) — **fase 2 gebouwd**: beschrijft de echte verwerking (account, agenda-inhoud, push-endpoints, Telegram-koppeling, cache, logs), doelen, bewaartermijnen en rechten. ⚠️ Contact is nog een placeholder.
- [ ] Support/contactinformatie (e-mailadres) in de listing en op de privacypagina — **wacht op het aparte supportadres** (open vraag 3); daarna de placeholder op `/privacy` vervangen.
- [ ] Listing-assets: korte beschrijving (≤80 tekens), lange beschrijving, **feature graphic 1024×500**, **≥2 telefoon-screenshots** (16:9 of 9:16, mobiele weergave: dag/week + instellingen bv.).
- [ ] **Content rating**-vragenlijst invullen (agenda-app zonder UGC/advertenties → "Iedereen").
- [ ] **Data safety**-formulier — moet exact kloppen met de echte verwerking: persoonlijke info (e-mailadres), app-activiteit (events/verjaardagen), verzameld + versleuteld in transit, niet gedeeld met derden voor advertenties; verwerkers: Supabase, Resend, Telegram (alleen indien gekoppeld), Vercel.
- [ ] Interne testtrack opzetten → daarna gesloten track met testerlijst (e-mailadressen).
- [ ] Release notes schrijven en AAB uploaden.

---

## 4. Pushmeldingen vanuit de TWA

### Behoefte & prioriteit

De app kent één notificatiebehoefte: **reminders** voor events en verjaardagen (offsets per item via `herinneringMinuten`). De kanaalkeuze is al gebouwd (Telegram-fases): **Telegram is het primaire kanaal** (gekoppeld + actief), **web-push is de fallback**, **e-mail loopt altijd**. Telegram- en e-mailstatussen hebben géén push nodig. Conclusie: push in de TWA is **belangrijk maar niet release-blokkerend** — een gekoppelde gebruiker merkt er niets van als push hapert.

### Gekozen aanpak: bestaande Web Push hergebruiken (geen FCM)

Een TWA draait op de Chrome-engine; de bestaande **Web Push (VAPID)**-keten werkt daar zonder wijzigingen en notificaties verschijnen als gewone Android-systeemnotificaties:

- **Permissie:** de bestaande banner in `AgendaApp.tsx` → `Notification.requestPermission()` → `subscribeerOpPush()`. Op **Android 13+** loopt dit via de runtime-notificatiepermissie van Chrome — zelfde flow, wel expliciet testen in TWA-context (fase 3/6).
- **Subscription-opslag:** ongewijzigd — `POST /api/push/subscribe` slaat endpoint+keys op in `push_subscriptions`, gekoppeld aan de ingelogde Supabase-gebruiker (RLS).
- **Verzending:** ongewijzigd — de cron (`app/api/cron/reminders/route.ts`) stuurt web-push alléén als de gebruiker geen actieve Telegram-koppeling heeft.
- **Opt-in/opt-out:** opt-in via de permissiebanner; opt-out via Android-notificatie-instellingen of door Telegram te koppelen (dan stopt push automatisch). De toggle "Telegram-reminders" in `InstellingenMenu.tsx` schakelt tussen Telegram en push-fallback.
- **Updates/verwijderingen:** bestaand gedrag — de dedup-sleutel bevat id+datum+tijd+offset; gewijzigd event = nieuwe sleutel (vuurt opnieuw), verwijderd event valt uit de query (geen melding).
- **Timezone:** de cron rekent in `Europe/Amsterdam` (hardcoded); het toestel toont de notificatie direct bij ontvangst. Bestaand aandachtspunt (zie `CLAUDE.md`), geen TWA-specifiek werk.
- **FCM is bewust niet gekozen:** het zou een Firebase-project, token-opslag en een nieuw server-sendpad vergen zonder functionele winst binnen een TWA. Beperking die we accepteren: geen FCM-extra's (topics, analytics).

### Foutafhandeling & opschoning — ✅ gebouwd (fase 3)

- **Bevinding:** de cron ruimde alleen `410` op, stil en zonder logging; de testroute logde het volledige endpoint en ruimde niets op; het verzendblok was 3× gedupliceerd.
- **Gebouwd:** helper `stuurPushNaarGebruiker(userId, payload)` in `app/api/cron/reminders/route.ts` (gebruikt door de event- én verjaardagstak): bij `404`/`410` wordt de subscription-rij verwijderd (service-role) met compacte log `[reminders] dode push-subscription opgeruimd` (alleen de statuscode, **nooit het endpoint**); andere fouten worden gelogd als transient en de subscription blijft staan. Eén kapotte subscription stopt de rest niet (per-sub try/catch). De cron-response bevat nu `pushOpgeruimd`. Zelfde gedrag in `api/push/test` (user-scoped via RLS, prefix `[push-test]`).
- Transient fouten (5xx/timeout): bestaand claim-eerst-beleid — geaccepteerd dat een zeldzame firing verloren gaat; geen retries.
- **Client-herstel:** `subscribeerOpPush` detecteert nu een VAPID-sleutelwissel (oude subscription wordt opgezegd en vervangen) en probeert bij een subscribe-fout eenmalig opnieuw na opruimen van een achtergebleven subscription. `afmeldenVanPush` (nieuw) regelt opt-out per apparaat: browser-unsubscribe + `DELETE /api/push/subscribe`.

### Testen op echte apparaten

Volgorde: ① Android Chrome (browsertab) → ② geïnstalleerde PWA → ③ TWA-build. Per stap: permissie vragen, `POST /api/push/test`, echt event met reminder, notificatieklik opent/focust de app. Plus: Telegram koppelen → controleren dat push stopt; ontkoppelen → push hervat.

### Beperkingen & risico's van push in een TWA

- Web-push vereist de Chrome-engine; op toestellen zonder (recente) Chrome valt de TWA terug op een andere browser met mogelijk afwijkend gedrag — voor persoonlijk gebruik verwaarloosbaar.
- Agressief batterijbeheer (Xiaomi/Samsung e.d.) kan ontvangst vertragen; Telegram blijft daarom het primaire kanaal.
- ~~Subscriptions verlopen stilletjes; zonder de 410-opschoning groeit de tabel en logt de cron blijvend fouten.~~ **Opgelost in fase 3** (404/410-cleanup in cron + testroute).
- Bekende beperking (geaccepteerd, single-user-app): wisselt een tweede account op hetzelfde apparaat, dan kan hetzelfde browser-endpoint onder twee `user_id`'s in `push_subscriptions` staan (`unique(user_id, endpoint)`) — beide accounts ontvangen dan meldingen op dat apparaat tot één ervan uitzet of de subscription verloopt.
- iOS blijft buiten scope: daar blijft de bestaande PWA (Safari/Home Screen) de route.

---

## 5. Gefaseerd implementatieplan

### Fase 0 — Beslissingen & ontbrekende input

- **Doel:** alle randvoorwaarden geregeld voordat er gebouwd wordt.
- **Al besloten:** doel = interne/gesloten test · appnaam = **Agenda** · package = **`nl.jellebol.agenda`** · push = bestaande Web Push · tooling = **Bubblewrap CLI** · privacybeleid = pagina in de app · nieuw icoon-ontwerp gewenst.
- **Nog te doen:**
  - [ ] Google Play Developer-account aanmaken + identiteitsverificatie (kan dagen duren — vroeg starten). → stappen in `play_store_checklist.md` §1.
  - [ ] Nieuw app-icoon ontwerpen (vector/SVG; werkt op wit én in een rond masker). → verwerkingsproces: zie "Eerst regelen vóór fase 4".
  - [ ] Testerlijst bepalen (e-mailadressen; voor een evt. latere productierelease: ≥12). Pas echt nodig bij fase 5 — zie `play_store_checklist.md` §3.
  - [ ] Support-e-mailadres kiezen voor de listing (apart adres, géén privé-mailadres; consistent op `/privacy` + listing) — zie `play_store_checklist.md` §3.
- **Complexiteit:** Laag (vooral regelen/wachten). **Risico:** verificatie-doorlooptijd.
- **Klaar wanneer:** account actief, icoon-ontwerp gekozen, testers + supportadres bekend.

### Fase 1 — PWA-basis op orde

- **Doel:** de web-app voldoet aantoonbaar aan alle PWA-eisen waarop de TWA leunt.
- **Stappen:**
  - [x] `app/manifest.ts`: `scope: '/'` en `id: '/'` toegevoegd.
  - [x] `scripts/generate-icons.mjs` uitgebreid: maskable = icoon op 80% (410px) gecentreerd op een vol-vlak `#007AFF` 512×512-canvas (sharp `create` + `composite`; de afgeronde hoeken van het bron-icoon vallen weg tegen dezelfde achtergrondkleur). Extra output: `icon-play.png` (zelfde beeld, voor de Console-upload in fase 5, niet in het manifest). Iconen opnieuw gegenereerd; maskable is niet langer byte-identiek aan icon-512 en visueel gecontroleerd (content ruim binnen de safe zone).
  - [ ] Lighthouse-audit (installability, manifest, SW) op productie; blockers fixen — **restpunt, na deploy**.
  - [ ] Installability-test: Android Chrome toont de install-prompt; geïnstalleerde PWA start standalone — **restpunt, vereist echt toestel**.
- **Bestanden:** `app/manifest.ts`, `scripts/generate-icons.mjs`, `public/icon-maskable.png` + `public/icon-play.png` (gegenereerd).
- **Complexiteit:** Laag. **Risico:** maskable-safe-zone verkeerd → afgesneden icoon op Android (ondervangen: 80%-schaling + visuele controle).
- **Klaar wanneer:** Lighthouse PWA-checks groen en het icoon staat netjes in een rond masker.
- ✅ **Gebouwd** (juni 2026) op de twee restpunten na (Lighthouse op productie + toestel-test). Kanttekening: gebaseerd op het huidige icoon-ontwerp; komt er een nieuw ontwerp (fase 0), dan volstaat `public/icon.svg` vervangen + `node scripts/generate-icons.mjs` herdraaien. SW/push-flow ongewijzigd (`public/sw.js`, `SwRegistratie.tsx`, `pushUtils.ts` — gecontroleerd, geen regressie: manifest/icons raken die keten niet en `/icon-192.png` blijft bestaan voor notificaties).

### Fase 2 — Productiedomein, privacy & deployment

- **Doel:** productie-omgeving en beleidspagina's klaar voor de Store.
- **Stappen:**
  - [x] HTTPS geverifieerd op productie: alle PWA-assets bereikbaar over HTTPS met status 200 (`/`, `/manifest.webmanifest` als `application/manifest+json`, `/sw.js`, `/icon-192.png`, `/icon-512.png`, `/icon-maskable.png`, `/offline.html`); **HSTS actief** (`Strict-Transport-Security: max-age=63072000`); manifest bevat live `id: '/'`, `start_url: '/'`, `scope: '/'` (start_url binnen scope) en de nieuwe maskable is gedeployd (bestandsgrootte wijkt af van icon-512).
  - [x] Deploymentconfig gecontroleerd: Vercel met framework-defaults (geen `vercel.json`, geen middleware, geen custom redirects/rewrites) — niets dat manifest/SW/icons in de weg zit. Loginflow volledig client-side binnen scope `/` (Supabase-auth zonder externe redirects). Bevinding: geen `.env.example` in de repo; alle env-namen + doel staan in `README.md` (volstaat, geen blocker).
  - [ ] Offline-gedrag hertesten op een toestel (vliegtuigmodus → `offline.html`) — **restpunt, samen met de installability-test**.
  - [x] **Privacypagina gebouwd**: statische route `app/privacy/page.tsx` (server component, eigen scroll-container — de app-shell-body heeft `overflow-hidden`). Beschrijft de werkelijke verwerking (account, agenda-inhoud, push-abonnementen, Telegram-koppeling, localStorage-cache, logs), doelen, verwerkers (Vercel/Supabase/Resend/Telegram), bewaartermijnen (account-gebonden; dedupmarkeringen ±60 dagen; koppelcodes ±10 min), notificatie-opt-in/uit en rechten. Links: loginpagina-footer + onderaan Instellingen → Notificaties. ⚠️ Contact = placeholder `[supportadres invullen]` tot het aparte supportadres er is.
  - [x] Env vars ongewijzigd; geen nieuwe secrets nodig.
- **Bestanden:** `app/privacy/page.tsx` (nieuw), `LoginPagina.tsx` + `InstellingenMenu.tsx` (privacylink).
- **Complexiteit:** Laag. **Risico:** privacytekst die niet klopt met de echte verwerking → afwijzing/data-safety-conflict.
- **Klaar wanneer:** `https://agenda.jellebol.nl/privacy` live en inhoudelijk juist.
- ✅ **Gebouwd** (juni 2026) op drie restpunten na: ① supportadres invullen zodra het aparte adres bestaat, ② Lighthouse-audit op productie (Chrome DevTools → Lighthouse → categorie "Progressive Web App" op `https://agenda.jellebol.nl`, of `npx lighthouse https://agenda.jellebol.nl --view`), ③ installability + offline-test op een echt Android-toestel (Chrome → menu → "App installeren"; daarna vliegtuigmodus → offline-pagina). Deze drie blokkeren fase 3 niet.

### Fase 3 — Pushmeldingen valideren & opschonen

- **Doel:** push aantoonbaar werkend op Android en robuust tegen verlopen subscriptions.
- **Stappen:**
  - [x] Cron-gedrag bij `410`/`404` onderzocht en opschoning gebouwd (zie §4): helper `stuurPushNaarGebruiker` in de cron (events + verjaardagen), zelfde cleanup in `api/push/test`, veilige logs zonder endpoints, response-veld `pushOpgeruimd`.
  - [x] Clientflow robuuster: VAPID-wisseldetectie + eenmalige retry in `subscribeerOpPush`; nieuw `afmeldenVanPush` + `DELETE /api/push/subscribe` (user-scoped, RLS) voor opt-out per apparaat.
  - [x] Instellingen-UI: sectie **"Meldingen"** in Instellingen → Notificaties met vier states — niet ondersteund (uitleg), geblokkeerd (uitleg: via site-instellingen aanzetten; geen zinloze herhaalprompt), uit ("Meldingen aanzetten" → permissie + subscribe), aan (groene status + "Uitzetten op dit apparaat"). Laden/fout-states conform bestaande knoppen.
  - [ ] End-to-end push-test op een echt Android-toestel — **restpunt, zie checklist hieronder**.
- **Bestanden:** `app/api/cron/reminders/route.ts`, `app/api/push/test/route.ts`, `app/api/push/subscribe/route.ts` (DELETE), `app/lib/pushUtils.ts`, `app/components/InstellingenMenu.tsx`.
- **Database:** géén migratie nodig — cleanup gebruikt de bestaande service-role (cron) en RLS-policies (test/subscribe-routes).
- **Complexiteit:** Laag–Middel. **Risico:** OEM-batterijbeheer vertekent testresultaten — testen met app op "niet beperken".
- **Klaar wanneer:** reminder-push komt betrouwbaar aan op Android en dode endpoints worden opgeruimd.
- ✅ **Gebouwd** (juni 2026) op de toestel-test na. **Handmatige Android-testchecklist** (na deploy, Android Chrome — later herhalen in de TWA, fase 6):
  1. [ ] Inloggen op `https://agenda.jellebol.nl` → DevTools/`chrome://serviceworker-internals`: SW actief.
  2. [ ] Instellingen → Notificaties → "Meldingen aanzetten" → Android 13+ toont de permissieprompt → status wordt "aan".
  3. [ ] Echt event met reminder (bv. +5 min) aanmaken → notificatie komt op tijd binnen als systeemnotificatie. (Sneltest zonder wachten: `POST /api/push/test` met Bearer-token.)
  4. [ ] Tik op de notificatie → app opent/focust.
  5. [ ] Telegram-toggle **aan** → zelfde test → géén browser-melding, wel Telegram.
  6. [ ] Telegram-toggle **uit** → browser-melding komt weer.
  7. [ ] "Uitzetten op dit apparaat" → geen meldingen meer; rij verdwenen (geen `[reminders] push mislukt` in Vercel-logs).
  8. [ ] 410-opruiming: app-site-data wissen zonder uit te zetten → volgende reminder → Vercel-log toont `dode push-subscription opgeruimd`.
  9. [ ] Vliegtuigmodus → app toont offline-pagina; daarna online → reminders hervatten.
  10. [ ] Logs controleren: nergens endpoints/sleutels, alleen statuscodes.

  De uitgewerkte testsessie (incl. installability, Lighthouse en offline) staat in **`toestel_tests.md`** — die versie gebruiken op het toestel.

### Eerst regelen vóór fase 4 ⛔ → nu: vóór fase 5 (Play-traject)

> **Gate (bijgewerkt juni 2026):** door de routewijziging (eerst lokale APK/sideload, zie fase 4) is fase 4 al uitgevoerd zónder Play-account; de punten hieronder gelden nu als voorwaarden voor het **Play-traject (fase 5)**. De punten "testtoestel" en "toestel-tests" blijven óók voor de sideload-route relevant.

- [ ] **Google Play Developer-account** aanmaken + identiteitsverificatie starten — langste doorlooptijd, dus eerst. Praktische stappen: **`play_store_checklist.md`** §1.
- [ ] **Nieuw icoon-ontwerp** afronden en verwerken (zie procesblok hieronder) — gewenst vóór de Bubblewrap-init, omdat die het manifest-icoon overneemt.
- [ ] **Supportadres** kiezen/aanmaken (apart adres, géén privé-mailadres) → placeholder `[supportadres invullen]` op `/privacy` (`app/privacy/page.tsx`) vervangen + hetzelfde adres voor de Play-listing aanhouden. Nodig vóór de Store-indiening (fase 5); zie `play_store_checklist.md` §3.
- [ ] **Android-testtoestel** klaarleggen (Chrome up-to-date, batterijbeheer op "niet beperken").
- [ ] **Handmatige PWA/push-tests** draaien: de testsessie in **`toestel_tests.md`** (installability, Lighthouse, offline, 10-staps pushchecklist) — uiterlijk vóór fase 5 als bewust geaccepteerd restpunt.
- [ ] **Locatie Android/TWA-project** beslissen — voorstel: aparte map **`D:\jelle\agenda-twa`** (buiten deze repo; in deze repo komt later alleen `assetlinks.json`).
- [x] `.gitignore` voorbereid op signing-artifacts (`*.keystore`, `*.jks`, `keystore.properties`, `**/key.properties`) — al toegevoegd, zodat keystores nooit per ongeluk gecommit kunnen worden.

**Pas daarna:** `bubblewrap init` (fase 4).

**Icoon-proces** — zodra het nieuwe ontwerp (vector/SVG) er is:

1. [ ] `public/icon.svg` vervangen door het nieuwe ontwerp.
2. [ ] `node scripts/generate-icons.mjs` draaien.
3. [ ] Gegenereerde bestanden controleren: `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable.png`, `public/icon-play.png`.
4. [ ] Visueel controleren dat `icon-maskable.png` safe-zone-padding heeft (content op 80% op vol-vlak `#007AFF`; niets wordt afgesneden in een rond masker).
5. [ ] `npm run lint` + `npm run build` draaien.
6. [ ] Pushen → Vercel-deploy afwachten.
7. [ ] Live controleren: `/manifest.webmanifest` + icons bereikbaar, nieuw beeld zichtbaar.
8. [ ] **Pas daarna** de Bubblewrap-init (fase 4).

### Fase 4 — TWA Android-project (Bubblewrap)

> **Routewijziging (juni 2026):** bewust gekozen voor **eerst een lokale APK (sideload)** zonder Play-account — het Play-traject (account, listing, testtrack) schuift op naar later en de gate hierboven geldt nu vooral voor fase 5. De keystore die hier is aangemaakt kan later als upload-key dienen.

- **Doel:** een ondertekende, lokaal geteste Android-app die de site zonder browser-UI toont.
- **Stappen:**
  - [x] Vereisten geïnstalleerd: Node v20 + `@bubblewrap/cli` via `npx`; Bubblewrap heeft zelf JDK 17 + Android SDK opgehaald (`C:\Users\info\.bubblewrap\`).
  - [x] `bubblewrap init --manifest https://agenda.jellebol.nl/manifest.webmanifest` — package **`nl.jellebol.agenda`** (default `…agenda.twa` bewust overschreven), naam "Agenda", kleuren/icons uit het manifest. ⚠️ De init crashte op Windows tijdens "Generating Android Project" (`The session has been destroyed`); opgelost met `bubblewrap update` (regenereert uit `twa-manifest.json` — daardoor staat de versie op 2/2).
  - [x] Keystore aangemaakt met keytool (JDK 17, PKCS12 → één wachtwoord): `android.keystore`, alias `android`, RSA 2048, 10000 dagen geldig. Wachtwoord in wachtwoordmanager; bestand buiten de repo + back-up (✅ `*.keystore`/`*.jks`/`keystore.properties`/`**/key.properties` staan al preventief in `.gitignore`).
  - [x] Android-project in aparte map: **`D:\jelle\agenda-twa`** (geen git-repo; niet in deze Next.js-repo).
  - [x] `bubblewrap build` → `app-release-signed.apk` (~1 MB) + `app-release-bundle.aab` (bewaard voor een evt. latere Play-upload).
  - [x] **Digital Asset Links**: `public/.well-known/assetlinks.json` toegevoegd met relation `delegate_permission/common.handle_all_urls`, package `nl.jellebol.agenda` en de échte SHA-256 van de eigen key (uitgelezen uit de APK met `apksigner verify --print-certs` — geen wachtwoord nodig). De **Play App Signing-fingerprint** als tweede entry volgt pas bij een evt. eerste Play-upload (fase 5). Nog verifiëren dat Vercel het bestand servet met een JSON-content-type — **na deploy**.
  - [x] Lokale build getest op toestel: APK gesideload, app opent **zonder URL-balk** (asset links geverifieerd door Google), login werkt, pushmeldingen werken. Resterende checks via `toestel_tests.md`.
  - **TWA-bevinding (juni 2026):** swipe-navigatie werkte niet op Android Chrome/TWA (op iOS wél) — Android Chrome vuurt bij `touch-action: auto` een `pointercancel` zodra het een touch-drag voor native scroll claimt, waardoor de `pointerup` van `useSwipe` nooit komt. Opgelost met `touch-pan-y` op `<main>` (`AgendaApp.tsx`); verticaal scrollen blijft native, de hook zelf is ongewijzigd. Tevens zijn de **push-notificatieteksten emoji-vrij** gemaakt (titel "Herinnering"/"Verjaardag"/"Testmelding"); e-mail/Telegram ongemoeid.
- **Bestanden (deze repo):** alleen `public/.well-known/assetlinks.json` + `.gitignore`-regel.
- **Complexiteit:** Middel. **Risico:** fingerprint-mismatch (URL-balk blijft zichtbaar); keystore kwijt = nieuwe upload-key-procedure via Google.
- **Klaar wanneer:** de geïnstalleerde TWA opent fullscreen zonder URL-balk en de AAB is klaar voor upload.

### Fase 5 — Play Store-voorbereiding

- **Doel:** complete, kloppende Store-vermelding in een testtrack.
- **Stappen:**
  - [ ] App aanmaken in de Play Console (naam "Agenda", Productiviteit, gratis).
  - [ ] **Play App Signing** accepteren bij de eerste AAB-upload; daarna de tweede fingerprint in `assetlinks.json` zetten (zie fase 4) en herdeployen.
  - [ ] Listing vullen: korte/lange beschrijving (NL), feature graphic 1024×500, ≥2 mobiele screenshots (dag-/weekweergave, instellingen), Play-icoon 512×512.
  - [ ] Content rating-vragenlijst en **data safety**-formulier invullen (conform privacypagina, zie §3).
  - [ ] Privacybeleid-URL en supportadres invullen.
  - [ ] **Interne testtrack** aanmaken → AAB uploaden → jezelf als tester; daarna evt. gesloten track met de testerlijst.
  - [ ] Release notes (NL, kort).
- **Complexiteit:** Middel (veel formulierwerk). **Risico:** data safety strijdig met werkelijke verwerking → afwijzing.
- **Klaar wanneer:** de app is installeerbaar via de interne/gesloten testlink.

### Fase 6 — Testen & release

- **Doel:** aantoonbaar werkende app voor alle kernflows; release op de gesloten track.
- **Stappen:**
  - [ ] Volledig testplan draaien (zie §6) op ≥1 echt Android-toestel.
  - [ ] Update-flow testen: webwijziging deployen → direct zichtbaar in de TWA (geen nieuwe AAB nodig); manifest-/kleurwijziging → nieuwe AAB-versie (versiecode ophogen, `bubblewrap update`).
  - [ ] Bevindingen fixen, evt. nieuwe AAB, release op de gesloten track.
  - [ ] **Optionele vervolgmijlpaal — publieke release:** vereist 14 dagen gesloten test met ≥12 testers (persoonlijk account), productie-review, én een heroverweging van de **accountlimiet (10)** + registratie-open-staan voor onbekenden.
- **Complexiteit:** Laag–Middel. **Klaar wanneer:** de TWA draait stabiel bij de testers; reminders (Telegram/push/e-mail) werken zoals op het web.

---

## 6. Testplan

| Test | Desktop (web) | Mobiele browser (Android Chrome) | Android TWA |
|---|---|---|---|
| Installability (prompt / Store-install) | n.v.t. | ✓ | ✓ (Play-testlink) |
| Manifestvalidatie (DevTools → Application) | ✓ | ✓ | ✓ (kleuren/splash/icoon) |
| Service worker actief + `offline.html` bij vliegtuigmodus | ✓ | ✓ | ✓ |
| Geen URL-balk (asset links) | n.v.t. | n.v.t. | ✓ |
| Login/logout (Supabase), sessie blijft na herstart | ✓ | ✓ | ✓ |
| Push: permissie → testpush (`/api/push/test`) → echte reminder → klik opent app | ✓ | ✓ | ✓ |
| Reminderkanaal: Telegram-toggle aan/uit → kanaal wisselt (push ↔ Telegram), e-mail altijd | ✓ | — | ✓ |
| Instellingen (e-mailtest, Telegram koppelen/test/ontkoppelen) | ✓ | ✓ | ✓ |
| Kernflows: event/verjaardag aanmaken-bewerken-verwijderen, herhalingen, filters, swipe | ✓ | ✓ | ✓ |
| Slechte verbinding (throttling): cache + nette degradatie | ✓ | ✓ | ✓ |
| Timezone: reminder-tijdstip klopt (toestel op NL-tijd; afwijkende toestel-tz noteren als bekend gedrag) | — | ✓ | ✓ |
| Update-flow: webdeploy direct zichtbaar zonder Store-update | — | — | ✓ |
| Play interne test: installeren via testlink, updaten naar nieuwe AAB-versie | — | — | ✓ |

---

## 7. Risico's & aandachtspunten

- **Digital Asset Links moet exact kloppen** — verkeerde of ontbrekende fingerprint = blijvende URL-balk. Bij Play App Signing twee fingerprints opnemen; na elke keystore-wijziging opnieuw controleren.
- **Package name en keystore zijn (vrijwel) onomkeerbaar** — `nl.jellebol.agenda` is definitief; keystore + wachtwoorden veilig bewaren, **nooit committen** (`.gitignore`-regel voor `*.keystore`/`*.jks`).
- **Data safety en privacybeleid moeten de werkelijkheid beschrijven** (Supabase, Resend, Telegram, push-endpoints, Vercel) — afwijkingen zijn een afwijzings-/verwijderingsgrond.
- **Persoonlijk Play-account-beperkingen** — verificatie kan duren; productierelease vereist eerst 14 dagen gesloten test met ≥12 testers. Voor de gesloten track zelf geen blocker.
- **TWA = webkwaliteit** — de app is zo goed als de PWA; Lighthouse-blockers eerst oplossen. Een kapotte deploy is direct kapot in de app (zelfde URL).
- **Push per platform verschillend** — web-push in de TWA via Chrome werkt, maar OEM-batterijbeheer en verlopen subscriptions vragen aandacht (opschoning, fase 3). Telegram blijft het primaire kanaal; iOS blijft de bestaande PWA-route.
- **Accountlimiet (10) en open registratie** — prima voor een gesloten test; bij een publieke release bewust heroverwegen.
- **Geen geheimen in repo/docs** — geen keystores, fingerprints zijn publiek-veilig maar tokens/keys niet; dit document bevat alleen env-namen.
- **Maskable icon** — de huidige variant snijdt af in ronde maskers; fix in fase 1 vóór de Bubblewrap-init (die het manifest-icoon overneemt).

## Aannames

- Vercel servet `public/.well-known/assetlinks.json` statisch met een bruikbaar content-type (verifiëren in fase 4; anders een rewrite/header in `vercel.json`).
- Listing-assets (screenshots, feature graphic, teksten) maken we zelf; voor een gesloten track volstaan basale assets.
- Het Android-project leeft buiten deze repo (aparte map/repo); in deze repo komt alleen `assetlinks.json` (+ `.gitignore`-regel).
- Geen iOS/App Store-traject; iOS blijft de bestaande PWA.

---

## 8. Open vragen

1. **Icoon-ontwerp** — hoe moet het nieuwe icoon eruitzien (stijl/kleur/vorm)? Beslissing nodig vóór fase 1; de hele icon-set en de Bubblewrap-init hangen ervan af.
2. **Testers** — welke e-mailadressen komen op de gesloten-testlijst (en zijn er ooit ≥12 beschikbaar voor een evt. productiepad)?
3. **Support-e-mailadres** — besloten: er komt een **apart supportadres** (nog aan te maken). Tot die tijd staat er een placeholder `[supportadres invullen]` op `/privacy`; zodra het adres bestaat: placeholder vervangen + adres in de Play-listing gebruiken.
4. **Publieke release later?** — zo ja: accountlimiet/registratiebeleid heroverwegen en het 12-testers/14-dagen-traject inplannen.
5. **Versiebeleid AAB** — wanneer hogen we de Android-versie op (alleen bij manifest-/wrapper-wijzigingen, of periodiek)? Voorstel: alleen bij wrapper-relevante wijzigingen.

---

### Aangemaakte/aangepaste bestanden (dit onderzoek)
- **Nieuw:** `twa_fases.md` (dit document).
- **Licht bijgewerkt:** `CLAUDE.md` (pointer naar dit document onder de toekomst-aandachtspunten).
- **Geen** codewijzigingen. **Geen** geheime waarden, keystores of persoonsgegevens opgenomen — alleen env-variabelenamen en publieke configuratie.
