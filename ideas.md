# Ideeën & vervolgstappen — Agenda-app

Centrale plek voor toekomstige features, verbeteringen en ideeën. Bijgewerkt naarmate de app groeit.

**Huidige staat (juni 2026):** standaardweergave week op desktop / dag op mobiel, events aanmaken/bewerken/verwijderen, herhalende events, labels, **verjaardagen** (dag/maand + optioneel geboortejaar, auto-leeftijd, keuzestap, tabel met paginatie, reminders 1u/1dag/1week), profielmenu, real-time sync, push-notificaties, e-mailreminders via Resend, PWA met witte safe areas.

---

## Quick wins

Kleine wijzigingen met direct zichtbaar resultaat. Weinig backend-werk.

---

### Vandaag-knop in topbar (desktop)
**Wat:** Klikbare "Vandaag"-knop naast de navigatiepijlen die direct terugsprint naar de huidige week/dag/maand.
**Waarom:** Nu alleen beschikbaar in de BottomBar op mobiel. Op desktop ontbreekt dit.
**Complexiteit:** Laag
**Bestanden:** `TopBar.tsx`, `AgendaApp.tsx`

---

### ~~Herhalend event bewerken~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Bij het opslaan van een bestaand herhalend event kiezen: "Alleen dit event" of "De hele reeks".
**Geïmplementeerd:** Scope-kiezer in `AfspraakFormulier.tsx`; bij "De hele reeks" worden alle occurrences bijgewerkt (behalve de datum). Geen DB-schemawijziging nodig.
**Nog open:** "Deze en toekomstige gebeurtenissen" (vereist verwijderen + heraan maken van toekomstige events — complexer).
**Bestanden:** `AfspraakFormulier.tsx`, `AgendaApp.tsx`

---

### Hele-dag events in weekoverzicht tonen
**Wat:** Hele-dag events bovenaan de weekkolommen weergeven (aparte rij), zoals in Google Calendar.
**Waarom:** Nu worden heeldagevents in de weekweergave niet getoond — alleen in de dagweergave.
**Complexiteit:** Middel
**Bestanden:** `WeekWeergave.tsx`

---

### ~~Swipe tussen weken/dagen op mobiel~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Op mobiel kun je naar links/rechts swipen om naar de volgende of vorige week/dag te navigeren.
**Geïmplementeerd:** `useSwipe` hook met pointer events (touch-only, drempel 60 px, ratio 1.5×). Actief in week- en dagweergave via `<main>` in `AgendaApp`. Vuurt niet bij start op button/input/select/textarea/a. Vertical scroll blijft ongestoord.
**Bestanden:** `lib/useSwipe.ts` (nieuw), `AgendaApp.tsx`

---

### ~~Verjaardagen-module~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Apart verjaardagbeheer via taart-icoon → keuzestap (toevoegen / bekijken). Tabel met paginatie, klikbare rijen voor bewerken. Datamodel dag/maand (verplicht) + geboortejaar (optioneel, **vrij tekstveld**: jaar/leeftijd/"onbekend") met automatisch berekende leeftijd bij een jaartal; oude `datum`/`leeftijd`-rijen worden bij inlezen gemigreerd (`migreerDatumVelden`). Reminders 1 uur / 1 dag / 1 week van tevoren (09:00-anker), in-app + cron (push + e-mail). Getoond als groene all-day events in de kalender zonder de view-componenten aan te passen. **Bulk-import** uit `namen_en_verjaardagen.md` via `scripts/importVerjaardagen.mjs` (idempotent, `--dry-run`).
**Bestanden:** `VerjaardagKeuze.tsx`, `VerjaardagenLijst.tsx`, `VerjaardagFormulier.tsx`, `lib/verjaardagen.ts`, `AgendaApp.tsx`, `api/cron/reminders/route.ts`, `scripts/importVerjaardagen.mjs`, opslag-helpers.
**Nog open:** "deze en toekomstige" reminder-methode per kanaal; eigen kleur per verjaardag.

---

### ~~Filters + maand-swipe + stabiele desktop-header~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Filters om events/verjaardagen/feestdagen per type te tonen/verbergen (persistent in localStorage), via desktop-filtericoon of mobiel hamburger-menu (`FilterMenu.tsx`); filtering in de `afsprakenVoorWeergave`-memo. Mobiel swipen werkt nu ook in maandweergave (`useSwipe` aan voor maand). Desktop-header: titel met vaste breedte zodat prev/next-knoppen niet meer verschuiven.
**Bestanden:** `FilterMenu.tsx` (nieuw), `TopBar.tsx`, `AgendaApp.tsx`, `types.ts`, `lib/opslag.ts`.

---

### ~~Nederlandse feestdagen~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Nationale feestdagen automatisch in de kalender als paarse all-day events (read-only, niet opgeslagen). Vaste datums + Pasen-afhankelijke dagen berekend uit Eerste Paasdag (Meeus-algoritme), per jaar gegenereerd. Zelfde virtuele-event-patroon als verjaardagen, geen view-component aangepast.
**Bestanden:** `lib/feestdagen.ts` (nieuw), `AgendaApp.tsx`.

---

### Event aanmaken via klik op maandweergave
**Wat:** Klikken op een dag in de maandweergave opent direct het formulier met die datum vooringevuld.
**Waarom:** Nu werkt dubbelklik alleen in week- en dagweergave. Maandweergave heeft geen snelle aanmaakflow.
**Complexiteit:** Laag
**Bestanden:** `MaandWeergave.tsx`, `AgendaApp.tsx`

---

### Kleurpicker voor labels uitbreiden
**Wat:** Meer voorgedefinieerde kleuren of een volledige kleurpicker (hex/HSL) aanbieden.
**Waarom:** Nu is de keuze beperkt. Meer kleuren geven meer visuele structuur aan de kalender.
**Complexiteit:** Laag
**Bestanden:** `LabelBeheer.tsx`

---

## Calendar verbeteringen

---

### Conflictdetectie en overlappende events
**Wat:** Overlappende events naast elkaar weergeven in de week/dagweergave (side-by-side), zoals Google Calendar dat doet.
**Waarom:** Nu overlappen ze letterlijk over elkaar. Bij meerdere events op hetzelfde tijdstip is het onleesbaar.
**Complexiteit:** Middel–Hoog
**Bestanden:** `WeekWeergave.tsx`, `DagWeergave.tsx`

---

### Weeknummer tonen
**Wat:** Weeknummer weergeven in de topbar of bij de kolomhoofden in de weekweergave.
**Waarom:** Handig voor planning en zakelijk gebruik. Standaard in Apple Calendar.
**Complexiteit:** Laag
**Bestanden:** `WeekWeergave.tsx`, `datum.ts`

---

### Eerste dag van de week instelbaar
**Wat:** Instelling om te kiezen of de week begint op maandag of zondag.
**Waarom:** Sommige gebruikers (of landen) starten de week op zondag. Nu is maandag hardcoded.
**Complexiteit:** Laag
**Bestanden:** `datum.ts`, `WeekWeergave.tsx`, `WeekStrip.tsx`

---

### Mini-maandkalender in sidebar (desktop)
**Wat:** Kleine maandkalender naast het hoofdgrid op desktop (zoals macOS Agenda).
**Waarom:** Snel navigeren naar een specifieke datum zonder van weergave te wisselen.
**Complexiteit:** Middel
**Bestanden:** Nieuwe component `MiniKalender.tsx`, layout aanpassen

---

## Event management

---

### Sleep-en-laat-vallen (drag & drop) voor events
**Wat:** Events verslepen naar een ander tijdstip of dag door te slepen.
**Waarom:** Snelste manier om een event te verzetten, standaard in alle kalender-apps.
**Complexiteit:** Hoog
**Bestanden:** `WeekWeergave.tsx`, `DagWeergave.tsx`, `AgendaApp.tsx`
**Opmerking:** Vergt een drag-library of custom pointer-event implementatie.

---

### Event dupliceren
**Wat:** Een bestaand event kopiëren naar een andere datum/tijd.
**Waarom:** Handig voor terugkerende taken die niet exact op schema passen voor de herhalings-functie.
**Complexiteit:** Laag
**Bestanden:** `AfspraakFormulier.tsx`, `AgendaApp.tsx`

---

### Meerdere herinneringen per event
**Wat:** Meer dan één reminder instellen per event, bijv. 1 dag van tevoren én 30 minuten van tevoren.
**Waarom:** Standaard in Apple Calendar; nuttig voor belangrijke afspraken.
**Complexiteit:** Middel (vereist `herinnering_minuten[]` array in DB)
**Bestanden:** `types.ts`, `AfspraakFormulier.tsx`, `supabaseOpslag.ts`, `route.ts` (cron)

---

### Kleur per event instellen (los van label)
**Wat:** Een event een eigen kleur geven, los van welk label erop zit.
**Waarom:** Snelle visuele herkenning zonder een label aan te maken.
**Complexiteit:** Laag
**Bestanden:** `types.ts`, `AfspraakFormulier.tsx`, event-rendering in Week/DagWeergave

---

### Einde herhalende reeks instellen via einddatum
**Wat:** Naast "eindigt na X weken" ook een einddatum kunnen opgeven.
**Waarom:** "Elke maandag tot en met 31 december" is intuïtiever dan "elke maandag voor 26 weken".
**Complexiteit:** Laag–Middel
**Bestanden:** `types.ts`, `AfspraakFormulier.tsx`, `herhaling.ts`

---

## Reminder & e-mail verbeteringen

---

### E-mailreminder: test-knop in de app
**Wat:** Een knop in de interface om een test-reminder-mail te sturen.
**Waarom:** Nu is er wel een `/api/push/test` endpoint maar niets voor e-mail. Handig om template-wijzigingen te controleren.
**Complexiteit:** Laag
**Bestanden:** Nieuw API-route `/api/email/test`, eventueel knop in ProfielMenu

---

### Reminder-methode per event kiezen
**Wat:** Per event kiezen tussen push, e-mail of beide.
**Waarom:** Niet elke reminder hoeft een e-mail te genereren. Geeft meer controle.
**Complexiteit:** Middel (nieuw DB-veld `herinnering_type`)
**Bestanden:** `types.ts`, `AfspraakFormulier.tsx`, `supabaseOpslag.ts`, cron

---

### Dagelijkse overzichtsmail
**Wat:** Elke ochtend (bijv. 07:00) een e-mail met alle events van die dag.
**Waarom:** Handig als je de app niet elke dag opent maar wel wilt weten wat er op de planning staat.
**Complexiteit:** Laag (extra cron-endpoint + aparte cron-job instelling)
**Bestanden:** Nieuw API-route `/api/cron/dagoverzicht`

---

## Mobiele UX

---

### Pull-to-refresh
**Wat:** Omlaag trekken op mobiel refresht de app en herlaadt data van Supabase.
**Waarom:** Intuïtief patroon op iOS/Android; handig als real-time sync een keer hapert.
**Complexiteit:** Laag–Middel
**Bestanden:** `AgendaApp.tsx` of de weergave-componenten

---

### Haptic feedback bij acties (iOS PWA)
**Wat:** Subtiele trilimpuls bij het opslaan of verwijderen van een event.
**Waarom:** Maakt de app authentieker als native-app-vervanging op iOS.
**Complexiteit:** Laag (`navigator.vibrate()` of `window.webkit.messageHandlers`)
**Opmerking:** Beperkte ondersteuning buiten Safari iOS PWA.

---

### Lange-druk op event voor snelmenu
**Wat:** Lang indrukken op een event opent een snelmenu (bewerken, dupliceren, verwijderen).
**Waarom:** Sneller dan event openen, scrollen naar verwijder-knop.
**Complexiteit:** Middel
**Bestanden:** Event-componenten in Week/DagWeergave

---

### Betere maandweergave op mobiel
**Wat:** In de maandweergave een agenda-lijstje tonen voor de geselecteerde dag (onder het grid).
**Waarom:** Kleine event-blokjes in de maandweergave zijn op mobiel slecht leesbaar.
**Complexiteit:** Middel
**Bestanden:** `MaandWeergave.tsx`

---

## Profiel & account

---

### Weergave-voorkeur opslaan
**Wat:** De gekozen weergave (week/dag/maand) onthouden na sluiten van de app.
**Waarom:** Nu start de app altijd in weekweergave. Als iemand liever dagweergave gebruikt, moet dat elke keer opnieuw worden ingesteld.
**Complexiteit:** Laag (localStorage)
**Bestanden:** `AgendaApp.tsx`

---

### Tijdzone-instelling
**Wat:** Gebruiker kan zijn tijdzone instellen in het profielmenu.
**Waarom:** Nu is de tijdzone in de cron hardcoded op `Europe/Amsterdam`. Bij gebruik vanuit het buitenland kloppen reminders niet.
**Complexiteit:** Middel
**Bestanden:** `ProfielMenu.tsx`, `supabaseOpslag.ts`, cron

---

### Wachtwoord wijzigen
**Wat:** In het profielmenu een wachtwoord-wijzigingsflow aanbieden.
**Waarom:** Nu is er geen manier om het wachtwoord te veranderen vanuit de app.
**Complexiteit:** Laag (Supabase Auth heeft dit ingebouwd)
**Bestanden:** `ProfielMenu.tsx`

---

## Technische verbeteringen

---

### Optimistische UI bij event opslaan
**Wat:** Event verschijnt direct in de kalender bij opslaan, zonder te wachten op Supabase-bevestiging.
**Waarom:** Nu voelt opslaan soms traag omdat de UI wacht op de Supabase-response.
**Complexiteit:** Laag (lokale state al aanwezig, alleen volgorde aanpassen)
**Bestanden:** `AgendaApp.tsx`
**Opmerking:** Is grotendeels al zo — controleer of er nog een race-conditie is met real-time sync.

---

### Service worker cache-strategie verbeteren
**Wat:** API-responses (afspraken, labels) ook cachen in de service worker voor betere offline ervaring.
**Waarom:** Nu valt de app terug op localStorage, maar wijzigingen die offline zijn gemaakt gaan verloren bij sync.
**Complexiteit:** Hoog
**Bestanden:** `public/sw.js`

---

### Error boundary toevoegen
**Wat:** Componenten omhullen met een React error boundary zodat crashes netjes worden opgevangen.
**Waarom:** Nu crasht de volledige app bij een onverwachte fout.
**Complexiteit:** Laag
**Bestanden:** Nieuw `ErrorBoundary.tsx`, `app/layout.tsx`

---

### End-to-end tests voor kritieke flows
**Wat:** Geautomatiseerde tests voor: event aanmaken, bewerken, verwijderen en herhalende events.
**Waarom:** Voorkomt regressies bij nieuwe features.
**Complexiteit:** Middel–Hoog (Playwright of Cypress opzetten)

---

## Later / grotere features

Features die interessant zijn maar meer architectuurwerk vragen.

---

### Gedeelde kalenders (meerdere gebruikers)
**Wat:** Een kalender delen met iemand anders, zodat beiden events kunnen zien en aanpassen.
**Waarom:** Handig voor koppels, gezinnen of kleine teams.
**Complexiteit:** Hoog (datamodel aanpassen, toegangsbeheer, uitnodigingen)

---

### CalDAV / iCal import & export
**Wat:** Events importeren vanuit of exporteren naar Apple Calendar, Google Calendar of Outlook via `.ics`-bestanden.
**Waarom:** Interoperabiliteit met andere kalender-systemen.
**Complexiteit:** Middel–Hoog

---

### Zoekfunctie
**Wat:** Zoeken in eventtitels, locaties en notities.
**Waarom:** Bij veel events is navigeren naar een specifiek event lastig.
**Complexiteit:** Laag–Middel (Supabase full-text search of client-side filter)
**Bestanden:** Nieuwe zoekcomponent, `AgendaApp.tsx`
**Opmerking:** Zoekicoon is eerder verwijderd — herintroduceren als de functie er is.

---

### Widget voor iOS/Android
**Wat:** Een home screen widget die de events van vandaag of morgen toont.
**Waarom:** Snel overzicht zonder de app te openen.
**Complexiteit:** Hoog (vereist native app wrapper, bijv. Capacitor)

---

### Dark mode
**Wat:** Ondersteuning voor donker kleurthema, automatisch op basis van systeemvoorkeur.
**Waarom:** Prettiger voor gebruik 's avonds of in donkere omgevingen.
**Complexiteit:** Middel (Tailwind `dark:` classes doorvoeren)
**Bestanden:** Alle UI-componenten, `globals.css`, `layout.tsx`
