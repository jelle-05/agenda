# ✅ Play Store-checklist — Developer-account & Console-voorbereiding

> Praktische, afvinkbare checklist voor het Google Play Developer-account en de latere Play Console-stappen. Hoort bij `twa_fases.md` (fase 0 + fase 5). Geen geheime waarden, accountgegevens of persoonsgegevens in dit document — alleen publieke configuratie en besluiten.

---

## 1. Developer-account aanmaken (fase 0 — nu starten)

⚠️ Identiteitsverificatie kan dagen tot weken duren — **dit is het langst lopende restpunt, dus vroeg starten.**

- [ ] Accounttype kiezen: **persoonlijk** of **organisatie**.
  - ⚠️ Persoonlijk account (aangemaakt na nov 2023): een **productierelease** vereist eerst een gesloten test met **≥12 testers gedurende 14 dagen**. Voor ons doel (gesloten testtrack) is dat géén blocker — wel relevant als de app later publiek moet.
  - Organisatie-account vereist een ingeschreven organisatie (KvK/D-U-N-S) — alleen relevant als die er is.
- [ ] Registreren op [play.google.com/console](https://play.google.com/console) met een Google-account.
- [ ] Eenmalige registratiekosten betalen (**$25**, creditcard/betaalmethode nodig).
- [ ] **Identiteitsverificatie** doorlopen (geldig identiteitsbewijs; bij persoonlijk account ook adresverificatie). Status afwachten — kan dagen duren.
- [ ] Bevestiging dat het account **actief** is (Console toegankelijk, "App maken" beschikbaar).

## 2. Vastliggende beslissingen (al genomen — niet meer wijzigen)

| Onderdeel | Besluit |
|---|---|
| Appnaam | **Agenda** |
| Package name / application ID | **`nl.jellebol.agenda`** (definitief — later wijzigen = nieuwe app) |
| Categorie | Productiviteit |
| Prijs | Gratis |
| Doel | Interne/gesloten testtrack (publieke release = optionele vervolgmijlpaal) |
| Productiedomein | `https://agenda.jellebol.nl` |
| Privacybeleid-URL | `https://agenda.jellebol.nl/privacy` |
| Push | Bestaande Web Push (VAPID), géén FCM |
| Tooling | Bubblewrap CLI |

## 3. Nog te kiezen / regelen (fase 0)

- [ ] **Supportadres** — er komt een **apart supportadres** (nog aan te maken). Regels:
  - Géén privé-mailadres gebruiken; het adres wordt publiek zichtbaar in de Play-listing.
  - Zodra het bestaat: **hetzelfde adres consistent** invullen op ① `/privacy` (placeholder `[supportadres invullen]` in `app/privacy/page.tsx`), ② de Play Console-listing, ③ evt. documentatie.
  - Nodig **vóór de Play Store-indiening** (fase 5), niet voor de Bubblewrap-init zelf.
- [ ] **Testerlijst** (pas echt nodig bij fase 5 — gesloten track):
  - E-mailadressen van testers verzamelen (Google-accounts; testers moeten de testlink accepteren).
  - Voor de gesloten track volstaat elke lijst (ook 1 persoon); **≥12 testers** alleen nodig bij een latere productierelease (persoonlijk account).
  - Lijst niet in de repo opnemen (persoonsgegevens) — beheren in de Play Console zelf.

## 4. Later in de Play Console (fase 5 — nog niet uitvoeren)

- [ ] App aanmaken: naam **"Agenda"**, Productiviteit, gratis.
- [ ] **Play App Signing** accepteren bij de eerste AAB-upload (daarna de tweede fingerprint in `assetlinks.json` zetten — zie `twa_fases.md` fase 4/5).
- [ ] Listing-assets: korte beschrijving (≤80 tekens), lange beschrijving (NL), **feature graphic 1024×500**, **≥2 telefoon-screenshots** (mobiele weergave: dag/week + instellingen bv.), Play-icoon 512×512 (`public/icon-play.png`).
- [ ] **Content rating**-vragenlijst (agenda-app zonder UGC/advertenties → "Iedereen").
- [ ] **Data safety**-formulier invullen **op basis van `/privacy`** — moet exact kloppen met de echte verwerking: persoonlijke info (e-mailadres), app-activiteit (events/verjaardagen), verzameld + versleuteld in transit, niet gedeeld met derden voor advertenties; verwerkers: Supabase, Resend, Telegram (alleen indien gekoppeld), Vercel.
- [ ] Privacybeleid-URL (`https://agenda.jellebol.nl/privacy`) en supportadres invullen.
- [ ] Interne testtrack aanmaken → AAB uploaden → jezelf als tester; daarna evt. gesloten track met de testerlijst.
- [ ] Release notes (NL, kort).
