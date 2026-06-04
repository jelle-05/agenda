# 📬 Mail-webapp (Apple Mail-stijl) — Fases & Roadmap

> Onderzoeks- en faseringsdocument. **Er is nog geen code geschreven.** Dit bestand is de roadmap voor het bouwen van een mail-webapp die qua gebruik en design lijkt op Apple Mail. Designs als uitgangspunt: `D:\jelle\agenda\ideas\mail` (4 schermen).

---

## 1. Samenvatting van het project

Een persoonlijke **mail-webapp** in Apple Mail-stijl. De gebruiker (Jelle) koppelt één of meer mailaccounts via IMAP/SMTP (app-password), leest en beantwoordt mail, beheert mappen en prullenbak, en kan `.ics`-uitnodigingen met één klik toevoegen aan de bestaande agenda-app. De look & feel volgt de aangeleverde Apple Mail-designs: een rustige, minimalistische UI met een 3-koloms split-view op desktop (sidebar → berichtenlijst → leespaneel) en een inbox → detail → compose-flow op mobiel, inclusief dark mode, swipe-acties en keyboard shortcuts.

**Kernwaarden:** betrouwbaar mail kunnen lezen/versturen, veilige opslag van inloggegevens, en een interface die "native" aanvoelt op desktop én mobiel.

**Belangrijke nuance (eerlijk):** een mailclient is substantieel zwaarder dan de agenda-app. IMAP/SMTP kent veel randgevallen (provider-verschillen, mappen-naamgeving, encoding, grote mailboxes) en het **veilig** renderen van HTML-mail is een serieus beveiligingsonderwerp. De gewenste MVP (lezen + versturen + mappen + zoeken/attachments/drafts) is daardoor géén klein MVP; dit document knipt dat realistisch op in fase 1–3.

---

## 2. Technische uitgangspunten

| Onderdeel | Keuze |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS (zelfde conventies als de agenda-app) |
| Iconen | Lucide React |
| Backend | Aparte/langlopende **Node-service** voor IMAP/SMTP (geen pure serverless) |
| IMAP | `imapflow` |
| SMTP | `nodemailer` |
| Mail parsen | `mailparser` |
| HTML-mail veilig tonen | sanitizing (DOMPurify) + gesandboxte `iframe` |
| `.ics` parsen | `node-ical` / `ical.js` |
| Database | **PostgreSQL via Docker** (lokaal; dezelfde engine later op VPS) |
| Repository | **Aparte repo** (los van de agenda-app, eigen deploy) |
| Credential-encryptie | AES-256-GCM of libsodium; sleutel uit env |
| Taal | Nederlands |
| Thema | Light **en** dark mode |
| Hosting | **Eerst lokaal**; porteerbaar naar VPS/Docker |

**Waarom een aparte Node-backend en niet "alles in Next.js API routes / Vercel":** IMAP-sync, lange verbindingen (IMAP IDLE), achtergrond-workers en queues vragen om een **persistent draaiend proces**. Serverless functies (Vercel) zijn kortlevend en kunnen dat niet betrouwbaar. Voor de MVP (ophalen-bij-openen) kan veel nog binnen Next.js, maar de architectuur wordt vanaf het begin zo opgezet dat de mail-logica in een aparte laag/service zit die later op een VPS/Docker kan draaien.

---

## 3. Belangrijkste keuzes (op basis van de antwoorden)

- **Stack:** Next.js + aparte Node-backend voor IMAP/SMTP.
- **Hosting:** eerst lokaal; ontworpen om later naar VPS/Docker te verhuizen.
- **Providers eerst:** generiek **IMAP/SMTP via app-password** (werkt met iCloud, Gmail, Outlook, eigen server). OAuth voor Gmail/Outlook/iCloud komt later.
- **Gebruikers:** single-user (Jelle), maar het datamodel is **multi-user-ready** (`user_id` op alle tabellen) zodat uitbreiden later geen herbouw vraagt.
- **MVP-scope:** account koppelen + lezen, versturen (nieuw/reply/reply-all/forward + attachments), mappen + verplaatsen + verwijderen, en zoeken/attachments/drafts — gesequenced over fase 1–3.
- **Agenda-integratie:** `.ics` herkennen + knop **"Toevoegen aan agenda"**, geschreven naar de **bestaande agenda-app** (Supabase `afspraken`-structuur). Eén agenda, geen dubbele data.
- **Sync:** ophalen bij openen + handmatig verversen voor de MVP; periodiek pollen / IMAP IDLE in een latere fase.
- **Design/UX:** de aangeleverde designs zijn **leidend** voor desktop én mobiel; dark mode, responsive split-view, swipe-acties (mobiel) en keyboard shortcuts (desktop) horen erbij.
- **Security vanaf fase 1:** credentials/tokens **versleuteld** opslaan, **app-login + veilige sessies**, en **logging zonder gevoelige data** (geen wachtwoorden of mailinhoud in logs). 2FA is een latere toevoeging.
- **Project & opslag (uit de uitgangsvragen):** **aparte repository**; **PostgreSQL via Docker** lokaal; **caching = headers + body on-demand** (body bij openen ophalen en cachen); **Sent via IMAP** (`APPEND` in de server-Sent map) en **drafts lokaal + server**; eerste **testaccount = eigen domein `info@jellebol.nl`**; `.ics`-afspraken naar **dezelfde Supabase `afspraken`-tabel zonder aparte bron-markering**; **mappen verplaatsen** in fase 1–3, **mappen aanmaken/hernoemen/herorden** pas in fase 5.

> **Designs (samenvatting van wat erin zit):**
> - **Desktop (1):** 3-koloms — sidebar (Favorites: Inbox/Sent/Drafts/Junk/Trash/Archive + Smart Mailboxes + eigen mappen), berichtenlijst met categorie-tabs + zoekbalk, leespaneel met afzender-avatar en rich content (o.a. een ingesloten kaart-kaartje "View in Apple Maps").
> - **Mobiel (2):** grote "Inbox"-titel, categorie-pills (Primary/Transactions…), avatar + onderwerp + snippet + datum + bijlage-icoon, "All Mail"-schakelaar.
> - **Mobiel (3):** "Mailboxes"-scherm — All Inboxes, per account (iCloud, Gmail), VIP, Unread, eigen mappen, Edit-knop.
> - **Mobiel (4):** Inbox met terug-chevron (account/mailbox wisselen), filterknop linksonder, compose-knop rechtsonder, zoekbalk, categorie-pill.

---

## 4. Aanbevolen architectuur

### 4.1 Lagen
```
┌──────────────────────────────────────────────┐
│  Next.js frontend (App Router, Tailwind)      │  UI: sidebar / lijst / detail / compose
├──────────────────────────────────────────────┤
│  API-laag (Next route handlers)               │  auth, endpoints, validatie
├──────────────────────────────────────────────┤
│  Mail-service (Node, aparte module/proces)    │  IMAP (imapflow) + SMTP (nodemailer) + parsing
├──────────────────────────────────────────────┤
│  Opslag: PostgreSQL  +  cache van mailmeta     │  accounts, mailboxes, messages, attachments, drafts
├──────────────────────────────────────────────┤
│  Crypto (AES-GCM) │ Agenda-koppeling (Supabase)│  credential-encryptie + ".ics → afspraken"
└──────────────────────────────────────────────┘
```

### 4.2 Datamodel-schets (indicatief, multi-user-ready)
- `users` — app-gebruiker (login/sessies). *Nu 1 gebruiker, structuur al aanwezig.*
- `mail_accounts` — `user_id`, weergavenaam, e-mail, IMAP host/poort/secure, SMTP host/poort/secure, gebruikersnaam, **`secret_encrypted`** (app-password/token, AES-GCM), provider-hint.
- `mailboxes` — `account_id`, IMAP-pad, weergavenaam, type (inbox/sent/drafts/trash/archive/junk/custom), unread-count.
- `messages` — `mailbox_id`, IMAP UID, message-id, afzender/ontvangers, onderwerp, datum, snippet, flags (read/answered/flagged), `has_attachments`, **lazy** body-cache.
- `attachments` — `message_id`, bestandsnaam, mime-type, grootte, opslag/cache-verwijzing.
- `drafts` — concepten (lokaal opgeslagen, later naar IMAP Drafts gesynct).
- *Agenda:* schrijven naar de **bestaande Supabase `afspraken`-tabel** (geen eigen kopie).

### 4.3 Frontend-componenten (volgen de designs)
- `Sidebar` / `MailboxList` — accounts, systeemmappen, eigen mappen, VIP/Unread (smart mailboxes later).
- `MessageList` — virtuele lijst met avatar/onderwerp/snippet/datum/bijlage-indicator; filter- en zoekbalk; swipe-acties op mobiel.
- `MessageDetail` — header (afzender, ontvangers, datum), veilige body-render (sandboxed iframe), bijlagen, `.ics`-detectie + "Toevoegen aan agenda".
- `Compose` — nieuw/reply/reply-all/forward, to/cc/bcc, bijlagen, opslaan als concept.
- Layout: **3-koloms split-view** ≥ desktop; op mobiel stack (lijst → detail → compose) met terug-navigatie.

### 4.4 Mappenstructuur (indicatief)
```
mail-app/
  app/                  # Next.js routes + UI
    (mail)/             # sidebar/lijst/detail layout
    api/                # route handlers (auth, accounts, sync, send, ics)
    components/         # Sidebar, MessageList, MessageDetail, Compose, ...
    lib/
      mail/             # imapClient.ts, smtpClient.ts, parse.ts, sanitizeHtml.ts
      crypto/           # encrypt/decrypt credentials
      agenda/           # ics → Supabase afspraken
      db/               # queries/migraties
  server/               # (optioneel) langlopende sync-worker voor latere fases
```

### 4.5 Veilig HTML-mail renderen (cruciaal)
HTML-mail is onvertrouwde input. Aanpak: **sanitizen** (DOMPurify, scripts/onclick/forms strippen) **én** renderen in een **gesandboxte `iframe`** (`sandbox` zonder `allow-scripts`, `allow-same-origin` uit). Externe afbeeldingen standaard **blokkeren** met een "afbeeldingen laden"-knop (privacy/trackingpixels). Altijd een **plain-text fallback**.

---

## 5. Fase 0 — Onderzoek & setup

- **Doel:** ontwikkelomgeving en fundament neerzetten; mailverbinding bewijzen met één testaccount.
- **Features:** nog geen UI-features; technische spike.
- **Technische onderdelen:**
  - Next.js + TypeScript + Tailwind project opzetten (los van de agenda-repo).
  - PostgreSQL via **Docker** + migratie-setup; mail-app in een **aparte repository**.
  - `.env` met DB-url en **`MAIL_ENCRYPTION_KEY`** (nooit committen).
  - Spike: met `imapflow` verbinden met het **eigen domein-account `info@jellebol.nl`** (IMAP/SMTP-host, poorten en app-/wachtwoord van de mailhost opvragen) en mailheaders ophalen; met `nodemailer` een testmail sturen.
  - Crypto-helper (AES-GCM) voor encrypt/decrypt van credentials.
- **Complexiteit:** **Middel** (IMAP-spike kan tegenvallen door provider-instellingen).
- **Risico's:** providers vereisen app-passwords/IMAP-aanzetten; firewalls/poorten; encoding-verrassingen.
- **Afhankelijkheden:** geen.
- **Klaar wanneer:** je kunt lokaal verbinden met één account, een lijst headers ophalen en een testmail versturen; credentials worden versleuteld opgeslagen.

---

## 6. Fase 1 — MVP: account koppelen + mail lezen

- **Doel:** een werkende, veilige mailviewer: account toevoegen, inbox lezen.
- **Features:**
  - Mailaccount toevoegen (IMAP/SMTP-velden: host, poort, secure, gebruikersnaam, app-password); **verbinding testen**.
  - Inbox ophalen (headers), mail openen, **HTML veilig renderen** + plain-text fallback.
  - Gelezen/ongelezen status; basis berichtenlijst (avatar/onderwerp/snippet/datum) volgens design.
  - App-login + veilige sessie; credentials **versleuteld** opgeslagen.
  - Sync: ophalen bij openen + **handmatig verversen**.
- **Technische onderdelen:** `imapflow` fetch (envelope/flags/bodystructure), lazy body-fetch + cache in Postgres, sanitize+iframe-render, auth/sessies, crypto.
- **Complexiteit:** **Hoog** (de fundamenten: IMAP, veilige render, opslag, auth).
- **Risico's:** veilig HTML renderen, grote mailboxes/paginatie, provider-eigenaardigheden.
- **Afhankelijkheden:** fase 0.
- **Klaar wanneer:** je kunt inloggen, een account koppelen, je inbox bekijken en mails veilig lezen — met versleutelde credentials.

---

## 7. Fase 2 — Mail versturen

- **Doel:** van viewer naar echte mailclient: opstellen, beantwoorden, doorsturen.
- **Features:** nieuwe mail opstellen; **reply / reply all**; **forward**; **attachments meesturen**; **concepten (drafts)**; verzonden mail in Sent zetten.
- **Technische onderdelen:**
  - `nodemailer` via SMTP; correcte headers (`In-Reply-To`, `References`, `Message-ID`).
  - Geciteerde tekst bij reply/forward; ontvangers-logica voor reply-all.
  - Bijlagen uploaden + encoderen (MIME, groottelimieten bewaken).
  - Drafts lokaal opslaan en autosave; verzonden bericht in IMAP `Sent` `APPEND`-en.
- **Complexiteit:** **Hoog** (correcte headers/threading + attachments zijn foutgevoelig).
- **Risico's:** verkeerde headers breken threading; deliverability (zie risico's); attachment-encoding.
- **Afhankelijkheden:** fase 1.
- **Klaar wanneer:** je kunt nieuwe mail sturen, beantwoorden (reply/all), doorsturen, bijlagen meesturen, en concepten bewaren — met nette threading-headers.

---

## 8. Fase 3 — Mappen, prullenbak, attachments & zoeken

- **Doel:** volwaardig mailbeheer.
- **Features:**
  - Mappen ophalen; **systeemmappen herkennen** (Inbox/Sent/Drafts/Trash/Archive/Junk); mail **verplaatsen** tussen mappen.
  - *(Mappen aanmaken/hernoemen/verwijderen/herorden — het "Edit/Mailboxes"-scherm — staat in **fase 5**.)*
  - Mail naar **prullenbak**, permanent verwijderen, **prullenbak legen** (met **bevestiging**, en **undo** waar haalbaar).
  - **Attachments** tonen/downloaden.
  - **Zoeken/filteren** (op afzender/onderwerp/inhoud) + paginatie/infinite scroll.
- **Technische onderdelen:** IMAP `LIST`/`MOVE`/`COPY`+`STORE \Deleted`/`EXPUNGE`; provider-specifieke delete-logica (Gmail labels vs. echte mappen; iCloud-paden); zoek via IMAP `SEARCH` of lokale index. (Map-CRUD `CREATE`/`RENAME`/`DELETE` → fase 5.)
- **Complexiteit:** **Middel–Hoog** (provider-verschillen in mappen/verwijderen).
- **Risico's:** verschillende Trash/Archive-conventies per provider; "undo" is lastig bij echte EXPUNGE.
- **Afhankelijkheden:** fase 1–2.
- **Klaar wanneer:** je kunt mappen beheren, mail verplaatsen/verwijderen, prullenbak legen (met bevestiging), bijlagen openen en zoeken.

---

## 9. Fase 4 — Agenda-integratie (`.ics` → bestaande agenda)

- **Doel:** uitnodigingen herkennen en met één klik in de bestaande agenda zetten.
- **Features:** `.ics`-bijlagen/uitnodigingen **herkennen**; preview (titel/datum/tijd/locatie); knop **"Toevoegen aan agenda"** met **bevestigingsflow**; afspraak naar de **bestaande Supabase `afspraken`-tabel** (zonder aparte bron-markering — komt binnen als een gewone afspraak).
- **Technische onderdelen:** `.ics` parsen (`node-ical`); mappen naar het bestaande afspraken-datamodel (titel/datum/begin-/eindtijd/locatie/notitie); Supabase-write met `user_id`; correcte **timezone-afhandeling** (VTIMEZONE → lokale tijd). Geen schemawijziging aan de agenda-app nodig.
- **Complexiteit:** **Middel** (`.ics` + timezones zijn de lastige stukken).
- **Risico's:** timezone-fouten (afspraak op verkeerde tijd), terugkerende events (RRULE), dubbele toevoegingen.
- **Afhankelijkheden:** fase 1; toegang tot de Supabase van de agenda-app.
- **Klaar wanneer:** een mail met `.ics` toont een nette preview en "Toevoegen aan agenda" maakt de afspraak correct (juiste tijd/locatie) in de bestaande agenda, zonder duplicaten.

> Slimme **tekstherkenning** ("morgen 14:00") is bewust **niet** in deze fase (gekozen scope = `.ics` first) — staat bij latere ideeën, met aandacht voor false positives.

---

## 10. Fase 5 — Apple Mail-polish & responsive/dark UX

- **Doel:** de app laten aanvoelen als Apple Mail op desktop én mobiel.
- **Features:** **responsive split-view** (3-koloms desktop; mobiel inbox→detail→compose); **dark mode**; **swipe-acties** (archiveren/verwijderen/markeren) op mobiel; **keyboard shortcuts** op desktop (↑/↓ navigeren, ⌘R reply, etc.); toegankelijke focus-states; subtiele typografie/borders conform designs; filter-pills en zoekbalk; **mapbeheer-scherm** (Edit/Mailboxes uit design 3): mappen **aanmaken/hernoemen/verwijderen/herorden** (IMAP `CREATE`/`RENAME`/`DELETE`).
- **Technische onderdelen:** Tailwind dark-variant + thema-toggle, gesture-handling (zoals de bestaande `useSwipe` in de agenda-app als referentie), shortcut-handler, virtuele lijst voor performance.
- **Complexiteit:** **Middel**.
- **Risico's:** scope-creep richting pixel-perfect; geen beschermde Apple-assets letterlijk kopiëren (eigen iconen/illustraties).
- **Afhankelijkheden:** fase 1–3 (werkende functionaliteit om te polishen).
- **Klaar wanneer:** de app oogt en voelt als de designs, werkt soepel op desktop en mobiel, met dark mode, swipe en shortcuts.

---

## 11. Fase 6 — Security, sync & productiegeschiktheid

- **Doel:** klaar voor betrouwbaar dagelijks gebruik buiten "lokaal".
- **Features:** robuuste **sync** (periodiek pollen en/of **IMAP IDLE** via een langlopende worker), achtergrond-queues, deploy naar **VPS/Docker**, optioneel **OAuth** voor Gmail/Outlook/iCloud, hardening.
- **Technische onderdelen:** sync-worker/queue (bijv. BullMQ + Redis), IMAP IDLE-verbindingen, reconnection/backoff, Dockerfile + compose, secrets-beheer buiten de repo, rate-limiting, security-review (sanitizing, headers, sessies).
- **Complexiteit:** **Hoog** (langlopende verbindingen, deploy, OAuth-verificaties).
- **Risico's:** Google/Microsoft OAuth-verificatie en -review; verbindingsstabiliteit; resourcegebruik bij veel mail.
- **Afhankelijkheden:** fase 1–5.
- **Klaar wanneer:** de app draait stabiel op een server, synct automatisch, slaat alles veilig op, en is logisch te beheren.

---

## 12. Latere ideeën

- **Slimme tekstherkenning** voor datums/tijden/locaties in vrije mailtekst ("afspraak morgen 14:00") met "Toevoegen aan agenda" — met sterke false-positive-bescherming.
- **OAuth-providers** (Gmail/Outlook/iCloud) naast app-passwords.
- **Categorieën / Smart Mailboxes / VIP / Unified inbox** ("All Inboxes") zoals in de designs.
- **Push-notificaties** voor nieuwe mail (Web Push, zoals in de agenda-app).
- **Multi-user** activeren (registratie, isolatie, accountlimiet).
- Snoozen, regels/filters, handtekeningen, "Undo Send", conversatie-threading, offline-cache/PWA.
- AI-samenvattingen ("Summarize" zoals in design 1).

---

## 13. Risico's & aandachtspunten

- **IMAP/SMTP-complexiteit:** veel randgevallen (mappen-naamgeving, UID-validity, encoding, grote mailboxes, paginatie). Plan tijd voor "saaie" robuustheid.
- **Veilig HTML-mail renderen:** onvertrouwde input → altijd sanitizen **én** sandboxen, externe afbeeldingen blokkeren (trackingpixels). Dit is een beveiligingsverantwoordelijkheid, geen detail.
- **Provider-verschillen:** Gmail (labels i.p.v. mappen), iCloud (app-password verplicht, specifieke paden), Outlook (eigen quirks). Delete/Trash/Archive verschillen per provider.
- **Serverless kan geen echte sync:** IMAP IDLE/queues vereisen een persistent proces (VPS/Docker). Daarom "lokaal eerst" en backend-laag los van de UI.
- **Deliverability (uitgaande mail):** zonder correcte SPF/DKIM/DMARC van het verzendende domein belandt mail in spam. Bij verzenden via de SMTP van de provider is dit meestal geregeld; bij eigen verzendinfra niet.
- **Credential-veiligheid:** app-passwords/tokens zijn gevoelig → AES-GCM, sleutel buiten de repo, nooit in logs.
- **Privacy/logging:** geen mailinhoud of wachtwoorden in logs; bewust omgaan met cache van mailbodies.
- **Timezones (.ics):** verkeerde tijdzone = afspraak op het verkeerde moment; goed testen.
- **Scope:** de gewenste MVP is breed; bewaak de fasering om niet vast te lopen.
- **Geen beschermde assets:** Apple Mail als inspiratie, maar eigen iconen/illustraties/teksten.

---

## 14. Beantwoorde uitgangsvragen

De eerder openstaande vragen zijn beantwoord en in dit document verwerkt:

1. **Database:** **PostgreSQL via Docker** lokaal (dezelfde engine later op een VPS, geen migratie van DB-engine).
2. **Repo:** **aparte repository** voor de mail-app (schone scheiding van de agenda-app).
3. **Agenda-koppeling:** schrijven naar de **bestaande Supabase `afspraken`-tabel zonder aparte bron-markering** — een toegevoegde uitnodiging komt binnen als een gewone afspraak (geen schemawijziging nodig).
4. **Caching:** **headers + body on-demand** (mailinhoud bij openen ophalen en cachen); geen volledige offline-cache in de eerste fases.
5. **Sent/Drafts:** **Sent via IMAP `APPEND`** in de server-Sent map (zichtbaar in alle clients); **drafts lokaal met autosave + later naar de IMAP Drafts-map**.
6. **Eerste testaccount (fase 0):** **eigen domein `info@jellebol.nl`** — IMAP/SMTP-host, poorten en (app-)wachtwoord van de mailhost nog op te vragen.
7. **Mapbeheer-UX:** **mail verplaatsen** in fase 1–3; **mappen aanmaken/hernoemen/verwijderen/herorden** (Edit/Mailboxes-scherm) in **fase 5**.

**Nog praktisch te verzamelen (geen blokkades voor de roadmap):**
- De concrete IMAP/SMTP-instellingen van `jellebol.nl` (host, poorten, secure/STARTTLS, of een app-wachtwoord nodig is).
- Of "undo" bij verwijderen haalbaar is per provider (afhankelijk van `EXPUNGE`-gedrag).

---

## 15. Globale complexiteit per fase

| Fase | Onderwerp | Complexiteit | Belangrijkste risico |
|---|---|---|---|
| 0 | Onderzoek & setup | Middel | IMAP-spike / provider-instellingen |
| 1 | MVP: koppelen + lezen | **Hoog** | Veilig HTML renderen, opslag, auth |
| 2 | Versturen | **Hoog** | Headers/threading + attachments |
| 3 | Mappen/prullenbak/zoeken | Middel–Hoog | Provider-verschillen in mappen/delete |
| 4 | Agenda-integratie (.ics) | Middel | Timezones / dubbele afspraken |
| 5 | Apple Mail-polish & UX | Middel | Scope-creep richting pixel-perfect |
| 6 | Security, sync, productie | **Hoog** | IMAP IDLE/workers, OAuth-verificatie, deploy |

---

### Aangemaakte/aangepaste bestanden
- **Nieuw:** `fases-mail.md` (dit document). Er zijn **geen** codewijzigingen gedaan. Het bestaande `fases.md` (agenda-roadmap) is ongemoeid gelaten. Geen geheime waarden, API keys, wachtwoorden of tokens opgenomen.
