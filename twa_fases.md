# 📱 TWA & Google Play Store — Onderzoek & Fasering

> Onderzoeks- en faseringsdocument. Doel: de bestaande agenda-PWA als **Trusted Web Activity (TWA)** verpakken en publiceren in de **Google Play Store**, in eerste instantie via een **interne/gesloten testtrack**. **Er is nog geen TWA-code geschreven** — dit document is de roadmap.
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
| PWA-manifest | ✅ aanwezig, ⚠️ incompleet | `app/manifest.ts` → `/manifest.webmanifest`. Heeft `name`/`short_name` "Agenda", `description`, `start_url: '/'`, `display: standalone`, `orientation: portrait`, `background_color`/`theme_color` `#ffffff`, 4 icons. **Mist `scope` en `id`.** |
| App-icons | ⚠️ deels | `public/icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable.png`; pipeline in `scripts/generate-icons.mjs`. **De maskable is byte-identiek aan icon-512 — geen safe-zone-padding**, dus op Android wordt het icoon afgesneden in ronde maskers. Nieuw icoon-ontwerp is gewenst (beslissing fase 0). |
| Service worker | ✅ | `public/sw.js` (cache `agenda-v3`): offline-fallback `public/offline.html`, cache-first voor `/_next/static/`, push-handler + notificatieklik (opent/focust de app). Registratie via `app/components/SwRegistratie.tsx` (scope `/`). |
| Web Push | ✅ compleet | `app/lib/pushUtils.ts` (`subscribeerOpPush`) → `POST /api/push/subscribe` → Supabase-tabel `push_subscriptions` (per `user_id`, RLS). VAPID-keys via env (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Permissiebanner in `AgendaApp.tsx`; testroute `POST /api/push/test`. Verzending via de cron `app/api/cron/reminders/route.ts`. |
| Notificatielogica | ✅ | Alles via de server-cron (elke minuut, cron-job.org): Telegram gekoppeld+actief → Telegram; anders web-push; e-mail altijd. Idempotent via `verzonden_reminders`. |
| Auth & user data | ✅ | Supabase e-mail/wachtwoord, alles RLS per `user_id`; accountlimiet 10 (`/api/auth/check-capacity`). Geen externe OAuth-redirects → TWA-vriendelijke loginflow. |
| Deployment | ✅ | GitHub → Vercel auto-deploy op `main`; env vars in Vercel. |
| Digital Asset Links | ❌ | Geen `public/.well-known/assetlinks.json`. |
| Privacybeleid / support | ❌ | Geen privacypagina of supportvermelding (vereist voor Play, ook voor testtracks). |
| Android-project | ❌ | Geen Android-codebase; keuze = **Bubblewrap CLI**. |
| Play-account & assets | ❌ | Geen Google Play Developer-account; geen feature graphic/screenshots/beschrijvingen. |

---

## 3. Must-haves voor Google Play Store-publicatie (checklist)

### Web-app (PWA-kwaliteit)
- [ ] Manifest aanvullen: `scope: '/'` en `id` toevoegen in `app/manifest.ts`.
- [ ] Nieuw app-icoon ontwerpen (beslissing fase 0) en doorvoeren in `public/icon.svg`.
- [ ] **Echte maskable icon** genereren: icoon op ~80% binnen een gevuld achtergrondvlak (`scripts/generate-icons.mjs` uitbreiden).
- [ ] 512×512 Play Store-icoon afleiden van het nieuwe ontwerp.
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
- [ ] **Privacybeleid-URL** — nieuwe statische pagina in de app (bv. `agenda.jellebol.nl/privacy`): welke data (account-e-mail, events/verjaardagen in Supabase, push-endpoints, optioneel Telegram chat-id), waarvoor, hoe lang, contact.
- [ ] Support/contactinformatie (e-mailadres) in de listing en op/bij de privacypagina.
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

### Foutafhandeling & opschoning (verbeterpunt, fase 3)

- **Onderzoeken:** wat doet de cron nu bij een mislukte web-push (`410 Gone`/`404` = verlopen subscription)? Indien er nog geen opschoning is: bij `410`/`404` de betreffende rij uit `push_subscriptions` verwijderen (service-role), met `[reminders]`-logging zonder endpoint-URL's. Voorkomt eindeloos sturen naar dode endpoints na herinstallatie van de TWA.
- Transient fouten (5xx/timeout): bestaand claim-eerst-beleid — geaccepteerd dat een zeldzame firing verloren gaat; geen retries.

### Testen op echte apparaten

Volgorde: ① Android Chrome (browsertab) → ② geïnstalleerde PWA → ③ TWA-build. Per stap: permissie vragen, `POST /api/push/test`, echt event met reminder, notificatieklik opent/focust de app. Plus: Telegram koppelen → controleren dat push stopt; ontkoppelen → push hervat.

### Beperkingen & risico's van push in een TWA

- Web-push vereist de Chrome-engine; op toestellen zonder (recente) Chrome valt de TWA terug op een andere browser met mogelijk afwijkend gedrag — voor persoonlijk gebruik verwaarloosbaar.
- Agressief batterijbeheer (Xiaomi/Samsung e.d.) kan ontvangst vertragen; Telegram blijft daarom het primaire kanaal.
- Subscriptions verlopen stilletjes; zonder de 410-opschoning groeit de tabel en logt de cron blijvend fouten.
- iOS blijft buiten scope: daar blijft de bestaande PWA (Safari/Home Screen) de route.

---

## 5. Gefaseerd implementatieplan

### Fase 0 — Beslissingen & ontbrekende input

- **Doel:** alle randvoorwaarden geregeld voordat er gebouwd wordt.
- **Al besloten:** doel = interne/gesloten test · appnaam = **Agenda** · package = **`nl.jellebol.agenda`** · push = bestaande Web Push · tooling = **Bubblewrap CLI** · privacybeleid = pagina in de app · nieuw icoon-ontwerp gewenst.
- **Nog te doen:**
  - [ ] Google Play Developer-account aanmaken + identiteitsverificatie (kan dagen duren — vroeg starten).
  - [ ] Nieuw app-icoon ontwerpen (vector/SVG; werkt op wit én in een rond masker).
  - [ ] Testerlijst bepalen (e-mailadressen; voor een evt. latere productierelease: ≥12).
  - [ ] Support-e-mailadres kiezen voor de listing.
- **Complexiteit:** Laag (vooral regelen/wachten). **Risico:** verificatie-doorlooptijd.
- **Klaar wanneer:** account actief, icoon-ontwerp gekozen, testers + supportadres bekend.

### Fase 1 — PWA-basis op orde

- **Doel:** de web-app voldoet aantoonbaar aan alle PWA-eisen waarop de TWA leunt.
- **Stappen:**
  - [ ] `app/manifest.ts`: `scope: '/'` en `id` toevoegen.
  - [ ] Nieuw icoon → `public/icon.svg`; `scripts/generate-icons.mjs` uitbreiden zodat de **maskable** variant het icoon op ~80% in een gevuld vlak zet (i.p.v. de huidige 1-op-1 kopie); extra output: 512×512 Play-icoon.
  - [ ] Lighthouse-audit (installability, manifest, SW) op productie; blockers fixen.
  - [ ] Installability-test: Android Chrome toont de install-prompt; geïnstalleerde PWA start standalone.
- **Bestanden:** `app/manifest.ts`, `public/icon*.{svg,png}`, `scripts/generate-icons.mjs`.
- **Complexiteit:** Laag. **Risico:** maskable-safe-zone verkeerd → afgesneden icoon op Android.
- **Klaar wanneer:** Lighthouse PWA-checks groen en het icoon staat netjes in een rond masker.

### Fase 2 — Productiedomein, privacy & deployment

- **Doel:** productie-omgeving en beleidspagina's klaar voor de Store.
- **Stappen:**
  - [ ] HTTPS/redirect-gedrag verifiëren (`agenda.jellebol.nl`, geen mixed content; ✅ verwacht via Vercel).
  - [ ] Loginflow controleren: alles binnen scope `/` (Supabase-auth zonder externe redirects — ✅ verwacht).
  - [ ] Offline-gedrag hertesten (vliegtuigmodus → `offline.html`).
  - [ ] **Privacypagina bouwen**: statische route `/privacy` in de app (NL, conform §3-checklist), link in `LoginPagina` of `InstellingenMenu`-voettekst + supportadres.
  - [ ] Env vars ongewijzigd; geen nieuwe secrets nodig voor de TWA zelf.
- **Bestanden:** nieuw `app/privacy/page.tsx` (statisch), kleine linktoevoeging.
- **Complexiteit:** Laag. **Risico:** privacytekst die niet klopt met de echte verwerking → afwijzing/data-safety-conflict.
- **Klaar wanneer:** `https://agenda.jellebol.nl/privacy` live en inhoudelijk juist.

### Fase 3 — Pushmeldingen valideren & opschonen

- **Doel:** push aantoonbaar werkend op Android en robuust tegen verlopen subscriptions.
- **Stappen:**
  - [ ] End-to-end push-test op een echt Android-toestel (browser + geïnstalleerde PWA): permissie, testpush, echte reminder, notificatieklik.
  - [ ] Telegram-interactie testen: toggle uit → push-fallback vuurt; toggle aan → alleen Telegram.
  - [ ] Cron-gedrag bij `410 Gone`/`404` onderzoeken in `app/api/cron/reminders/route.ts`; opschoning van dode subscriptions toevoegen indien afwezig (zie §4).
- **Bestanden:** `app/api/cron/reminders/route.ts` (mogelijk), verder geen.
- **Complexiteit:** Laag–Middel. **Risico:** OEM-batterijbeheer vertekent testresultaten — testen met app op "niet beperken".
- **Klaar wanneer:** reminder-push komt betrouwbaar aan op Android en dode endpoints worden opgeruimd.

### Fase 4 — TWA Android-project (Bubblewrap)

- **Doel:** een ondertekende, lokaal geteste Android-app die de site zonder browser-UI toont.
- **Stappen:**
  - [ ] Vereisten installeren: Node + `@bubblewrap/cli` (via `npx`), JDK + Android SDK (Bubblewrap kan deze zelf ophalen).
  - [ ] `bubblewrap init --manifest https://agenda.jellebol.nl/manifest.webmanifest` — package `nl.jellebol.agenda`, naam "Agenda", kleuren uit het manifest, maskable icon als bron.
  - [ ] Keystore: door Bubblewrap laten genereren; wachtwoorden in wachtwoordmanager; bestand buiten de repo (en `*.keystore`/`*.jks` preventief in `.gitignore`).
  - [ ] Het Android-project in een **aparte map/repo** houden (bv. `D:\jelle\agenda-twa`) — niet in deze Next.js-repo.
  - [ ] `bubblewrap build` → AAB + (test-)APK; APK op toestel installeren.
  - [ ] **Digital Asset Links**: `public/.well-known/assetlinks.json` toevoegen met relation `delegate_permission/common.handle_all_urls`, package `nl.jellebol.agenda` en de SHA-256 van de upload-key (uit `bubblewrap fingerprint` / keytool). Na de eerste Play-upload de **Play App Signing-fingerprint** uit de Console als tweede entry toevoegen. Verifiëren dat Vercel het bestand servet met `Content-Type: application/json`.
  - [ ] Lokale build testen: app opent zonder URL-balk (asset links OK), navigatie/login/offline werken.
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
3. **Support-e-mailadres** — welk adres komt in de Play-listing en op de privacypagina?
4. **Publieke release later?** — zo ja: accountlimiet/registratiebeleid heroverwegen en het 12-testers/14-dagen-traject inplannen.
5. **Versiebeleid AAB** — wanneer hogen we de Android-versie op (alleen bij manifest-/wrapper-wijzigingen, of periodiek)? Voorstel: alleen bij wrapper-relevante wijzigingen.

---

### Aangemaakte/aangepaste bestanden (dit onderzoek)
- **Nieuw:** `twa_fases.md` (dit document).
- **Licht bijgewerkt:** `CLAUDE.md` (pointer naar dit document onder de toekomst-aandachtspunten).
- **Geen** codewijzigingen. **Geen** geheime waarden, keystores of persoonsgegevens opgenomen — alleen env-variabelenamen en publieke configuratie.
