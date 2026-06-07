# Ideeën & vervolgstappen — Agenda-app

Centrale plek voor toekomstige features, verbeteringen en ideeën. Bijgewerkt naarmate de app groeit.

**Zie ook:** [internet_ideas.md](internet_ideas.md) — ideeën uit internetonderzoek naar gebruikersfrustraties en geliefde features, inclusief scopevragen per idee.

**Huidige staat (juni 2026):** standaardweergave week op desktop / dag op mobiel, events aanmaken/bewerken/verwijderen, herhalende events, labels, **verjaardagen** (dag/maand + optioneel geboortejaar, auto-leeftijd, keuzestap, tabel met paginatie, reminders 1u/1dag/1week), profielmenu, real-time sync, push-notificaties, e-mailreminders via Resend, PWA met witte safe areas, **views openen bij nu** (dag/week gecentreerd op de tijd-indicator, agenda-lijst bij vandaag).

---

## Quick wins

Kleine wijzigingen met direct zichtbaar resultaat. Weinig backend-werk.

---

### ~~Vandaag-knop in topbar (desktop)~~ ✅ Bestond al
**Wat:** Klikbare "Vandaag"-knop naast de navigatiepijlen die direct terugspringt naar vandaag.
**Status:** bleek al aanwezig in `TopBar.tsx` (`hidden sm:block`, links van de pijlen) — toegevoegd bij de mobiele navigatie-herinrichting; dit idee was verouderd.

---

### ~~Herhalend event bewerken~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Bij het opslaan van een bestaand herhalend event kiezen: "Alleen dit event" of "De hele reeks".
**Geïmplementeerd:** Scope-kiezer in `AfspraakFormulier.tsx`; bij "De hele reeks" worden alle occurrences bijgewerkt (behalve de datum). Geen DB-schemawijziging nodig.
**Nog open:** "Deze en toekomstige gebeurtenissen" (vereist verwijderen + heraan maken van toekomstige events — complexer).
**Bestanden:** `AfspraakFormulier.tsx`, `AgendaApp.tsx`

---

### ~~Hele-dag events in weekoverzicht tonen~~ ✅ Bestond al
**Wat:** Hele-dag events bovenaan de weekkolommen weergeven (aparte rij).
**Status:** bleek al volledig aanwezig in `WeekWeergave.tsx` (aparte "hele dag"-rij boven het tijdsgrid, per dag, klikbaar/bewerkbaar, meerdere events gestapeld). Dit idee was verouderd.

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

### ~~Kleur-customization per label~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Per label een eigen achtergrond- én tekstkleur (naast de accentkleur) via toggle + native color pickers in `LabelBeheer`, met live preview en contrastwaarschuwing. `eventKleuren()` bepaalt achtergrond/tekst/accent met fallback naar de bestaande tint; verjaardagen blijven groen, feestdagen paars, label-loze events grijs. Opslag in `labels`-kolommen `achtergrond_kleur`/`tekst_kleur` (resiliente upsert, fail-open vóór migratie).
**Bestanden:** `types.ts`, `lib/kleuren.ts`, `lib/supabaseOpslag.ts`, `LabelBeheer.tsx`, Week/Dag/Maand/Agenda-weergaven.

---

### ~~Filters + maand-swipe + stabiele desktop-header~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Filters om events/verjaardagen/feestdagen per type te tonen/verbergen (persistent in localStorage), via desktop-filtericoon of mobiel hamburger-menu (`FilterMenu.tsx`); filtering in de `afsprakenVoorWeergave`-memo. Mobiel swipen werkt nu ook in maandweergave (`useSwipe` aan voor maand). Desktop-header: titel met vaste breedte zodat prev/next-knoppen niet meer verschuiven.
**Bestanden:** `FilterMenu.tsx` (nieuw), `TopBar.tsx`, `AgendaApp.tsx`, `types.ts`, `lib/opslag.ts`.

---

### ~~Nederlandse feestdagen~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Nationale feestdagen automatisch in de kalender als paarse all-day events (read-only, niet opgeslagen). Vaste datums + Pasen-afhankelijke dagen berekend uit Eerste Paasdag (Meeus-algoritme), per jaar gegenereerd. Zelfde virtuele-event-patroon als verjaardagen, geen view-component aangepast.
**Bestanden:** `lib/feestdagen.ts` (nieuw), `AgendaApp.tsx`.

---

### ~~Views openen bij nu~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Dag- en weekweergave scrollen bij openen automatisch naar de rode huidige-tijd-indicator, verticaal gecentreerd in de scrollcontainer (07:00-fallback als vandaag niet zichtbaar is). De Agenda-lijst start bij de sectie van vandaag — of de eerstvolgende dag mét items; liggen alle events van de maand in het verleden dan eindigt de lijst onderaan, andere maanden openen bovenaan.
**Geïmplementeerd:** scroll-effect op `[huidigeDatum]` per view; tijd wordt vers gelezen zodat de 60s-kloktick en data-refreshes/filters géén herscroll triggeren terwijl de gebruiker scrolt. Browser klemt scrollTop vanzelf bij randtijden.
**Bestanden:** `DagWeergave.tsx`, `WeekWeergave.tsx`, `AgendaLijst.tsx`.

---

### ~~Event aanmaken via klik op maandweergave~~ ✅ Bestond al
**Wat:** Klikken op een dag in de maandweergave opent direct het formulier met die datum vooringevuld.
**Status:** bleek al aanwezig — klik op de lege ruimte in een dagcel (`MaandWeergave.tsx`, `onNieuwAfspraak(dag)`); dagnummer = naar dagweergave, event = bewerken. Dit idee was verouderd.

---

### ~~Kleurpicker voor labels uitbreiden~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Meer voorgedefinieerde kleuren aanbieden.
**Geïmplementeerd:** `PRESET_KLEUREN` van 12 → 24 (basis-iOS-palet + diepe/zachte tinten) in `LabelBeheer.tsx`; volledige hex/HSL-picker bestond al via de eigen-kleuren-toggle (native color inputs).

---

## Personalisatie (onderzoek juni 2026)

Onderzoek naar manieren om de app persoonlijker te maken, getoetst aan actuele kalender-app-trends (smart defaults, dagoverzichten, calendar sets, natural language input) én aan wat haalbaar is binnen deze codebase. Uitgangspunten: privacyvriendelijk (geen externe diensten of tracking, alles afgeleid van eigen data), geen grote refactors, aansluiten op bestaande patronen (`user_metadata` à la profielfoto, localStorage à la filters, cron + Telegram/Resend).

**Prioriteit (waarde vs. complexiteit):** ① Voorkeuren-tab → ② Telegram/e-mail-dagoverzicht → ③ Begroeting in-app → ④ Slimme invul-suggesties → ⑤ Persoonlijke werkuren. **Advies eerst bouwen:** de Voorkeuren-tab — laagste risico, fundament waar werkuren en accentkleur later in landen, en lost het bestaande idee "Weergave-voorkeur opslaan" mee op.

---

### ~~Voorkeuren-tab in Instellingen (slimme standaarden)~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Tab "Voorkeuren" in `InstellingenMenu` met: **Open kalender met** (automatisch / laatst gebruikt / vaste weergave), **standaard herinnering** en **standaard duur** voor nieuwe events. Later uitbreidbaar met werkuren, accentkleur, eerste weekdag.
**Geïmplementeerd:** opslag in `user_metadata.voorkeuren` (avatar-patroon, synct via account, geen DB-migratie; `lib/voorkeuren.ts` met `leesVoorkeuren()` + veilige defaults per veld). Laatst gebruikte weergave per apparaat in localStorage (`agenda_laatste_weergave`); startweergave toegepast via run-once-per-login effect. Opslaan per wijziging, optimistisch met rollback. Absorbeert het idee *Weergave-voorkeur opslaan*.
**Bestanden:** `lib/voorkeuren.ts` (nieuw), `InstellingenMenu.tsx`, `AgendaApp.tsx`, `AfspraakFormulier.tsx`, `lib/opslag.ts`

---

### ~~Persoonlijk dagoverzicht via Telegram en/of e-mail~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Elke ochtend (instelbaar tijdstip, default 07:00) een minimalistisch platte-tekst-overzicht van de afspraken en verjaardagen van vandaag, via Telegram of e-mail.
**Geïmplementeerd:** blok "Dagoverzicht" in de Voorkeuren-tab (toggle, kanaal, tijd, optionele begroetingsnaam; voorkeuren in `user_metadata.voorkeuren`). Verzending in de bestaande every-minute cron (`/api/cron/reminders`) met dedup via `claimReminder` (max 1/dag). Telegram vereist alleen de koppeling (los van de actief-vlag); e-mail is text-only met subject "Dagoverzicht". Berichten bewust zonder emoji's/opmaak/em-dashes. Vervangt het idee *Dagelijkse overzichtsmail*.
**Bestanden:** `lib/voorkeuren.ts`, `InstellingenMenu.tsx`, `api/cron/reminders/route.ts`

---

### ~~Begroeting + dagsamenvatting in de app~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Tijdsafhankelijke begroeting met voornaam en mini-samenvatting ("Goedemorgen Jelle · 3 afspraken vandaag, eerste om 09:00").
**Geïmplementeerd:** `lib/begroeting.ts` (dagdeel-bewust, heeldag-varianten, naam uit `voorkeuren.naam`); desktop in de Sidebar onder de app-naam, mobiel als compacte regel onder de dagtitel in `DagWeergave` (`sm:hidden`). Client-side berekend op de echte afspraken van vandaag.
**Bestanden:** `lib/begroeting.ts` (nieuw), `Sidebar.tsx`, `DagWeergave.tsx`, `AgendaApp.tsx`

---

### ~~Slimme invul-suggesties bij nieuw event~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Bij het typen van een titel suggesties tonen uit eerdere events; kiezen vult label, locatie en duur voor.
**Geïmplementeerd:** in `AfspraakFormulier.tsx` (alleen bij nieuwe events): vanaf 2 tekens max 4 suggesties (case-insensitive, dedup per titel, recentste eerst), dropdown met pijltjes/Enter/Escape + muis/touch; duur van het bron-event wordt toegepast op de huidige begintijd tenzij de eindtijd handmatig is gekozen. Volledig client-side.

---

### ~~Persoonlijke werkuren~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Instelbare dagstart/-einde; het week/daggrid dimt de uren erbuiten.
**Geïmplementeerd:** voorkeuren `werkuren`/`werkurenStart`/`werkurenEind` (default uit, 09:00–17:00; ongeldige range valt terug op defaults); sectie "Werkuren" in de Voorkeuren-tab (hergebruik `TijdKiezer`); dim-overlays (`pointer-events-none`) in dag- en weekweergave — alles blijft klikbaar.
**Nog open (vervolgstap):** weekdag-selectie (bv. werkuren alleen ma–vr) en de scroll-fallback voor andere dagen op de eigen dagstart i.p.v. 07:00.

---

### Label-filtersets ("Werk" / "Privé")
**Wat:** Filters uitbreiden naar labelniveau en combinaties opslaan als benoemde sets die je met één tik wisselt (Calendar Sets-lite, naar Fantastical-voorbeeld).
**Waarom:** Contextwisselingen (werkweek vs. weekend) zonder telkens losse filters om te zetten.
**Opslag:** localStorage (uitbreiding `agenda_filters`-patroon).
**Privacy:** Uitstekend.
**Complexiteit:** Middel–Hoog (filtermodel + UI in `FilterMenu`)
**Bestanden:** `FilterMenu.tsx`, `types.ts`, `lib/opslag.ts`, `AgendaApp.tsx`
**Risico:** voor één gebruiker mogelijk overkill — pas bouwen als labelgebruik groeit.

---

### Accentkleur van de app instelbaar
**Wat:** De vaste iOS-blauw (`#007AFF`) vervangen door een instelbare accentkleur (Voorkeuren-tab).
**Waarom:** Kleinste vorm van "eigen" thema naast het bestaande licht-thema; opstap richting dark mode.
**Complexiteit:** Middel–Hoog — de kleur staat verspreid hardcoded in componenten; vergt eerst een nette CSS-variabele-refactor (`@theme` in `globals.css`).
**Privacy:** Uitstekend.
**Bestanden:** `globals.css`, vrijwel alle componenten (eenmalige sweep), `InstellingenMenu.tsx`
**Risico:** refactor raakt veel bestanden — alleen doen als losse, doelgerichte wijziging.

---

### Natural language invoer
**Wat:** Snel-invoerveld dat "tennis morgen 15:00" of "kapper vr 10u" parseert naar een vooringevuld formulier.
**Waarom:** Snelste invoermethode (de geliefde Fantastical-feature), volledig offline te doen.
**Complexiteit:** Middel–Hoog — Nederlandse datumtaal ("volgende week di", "overmorgen") is foutgevoelig; altijd het formulier als tussenstap tonen, nooit direct opslaan.
**Privacy:** Uitstekend — parsing client-side.
**Bestanden:** nieuw `lib/parseInvoer.ts`, `TopBar.tsx`/`AfspraakFormulier.tsx`

---

## Calendar verbeteringen

---

### Conflictdetectie en overlappende events
**Wat:** Overlappende events naast elkaar weergeven in de week/dagweergave (side-by-side), zoals Google Calendar dat doet.
**Waarom:** Nu overlappen ze letterlijk over elkaar. Bij meerdere events op hetzelfde tijdstip is het onleesbaar.
**Complexiteit:** Middel–Hoog
**Bestanden:** `WeekWeergave.tsx`, `DagWeergave.tsx`

---

### ~~Weeknummer tonen~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Weeknummer weergeven bij de kolomhoofden in de weekweergave.
**Geïmplementeerd:** `getWeekNummer()` (ISO 8601, donderdag-truc) in `lib/datum.ts`; "wk NN" in de hoek van de weekweergave-kolomhoofden + "· week NN" achter de dagtitel in de dagweergave.

---

### Eerste dag van de week instelbaar
**Wat:** Instelling om te kiezen of de week begint op maandag of zondag.
**Waarom:** Sommige gebruikers (of landen) starten de week op zondag. Nu is maandag hardcoded.
**Complexiteit:** Laag
**Bestanden:** `datum.ts`, `WeekWeergave.tsx`, `WeekStrip.tsx`

---

### ~~Mini-maandkalender in sidebar (desktop)~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Kleine maandkalender in de Sidebar op desktop (zoals macOS Agenda).
**Geïmplementeerd:** `MiniKalender.tsx` — vandaag rood, geselecteerde datum blauw, event-dots, ‹ › maandnavigatie (volgt externe navigatie automatisch); klik navigeert mét behoud van de huidige weergave.

---

## Event management

---

### ~~Sleep-en-laat-vallen (drag & drop) voor events~~ ✅ Geïmplementeerd (juni 2026, desktop)
**Wat:** Events verslepen naar een ander tijdstip of dag.
**Geïmplementeerd:** custom hook `lib/useEventDrag.ts` (pointer events, **muis-only** zodat mobiel scrollen/swipen onaangeroerd blijft): week- en dagweergave, getimede events, 15-min-snap, duurbehoud, 5px-drempel (klik blijft klik), live tijdlabel tijdens slepen; herhalend event verslepen wijzigt alleen die occurrence.
**Nog open (vervolgstappen):** drag in de maandweergave, hele-dag events verslepen, touch-drag op mobiel (bewust overgeslagen i.v.m. conflict met scroll/swipe).

---

### ~~Event dupliceren~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Een bestaand event kopiëren naar een andere datum/tijd.
**Geïmplementeerd:** knop "Dupliceer afspraak" in `AfspraakFormulier.tsx` — zet het formulier ter plekke om naar nieuw-event-modus (id leeg, zelfde velden, titel ongewijzigd); pas bij Toevoegen wordt opgeslagen, origineel blijft onaangeraakt.

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

### ~~Einde herhalende reeks instellen via einddatum~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Naast "eindigt na X weken" ook een einddatum kunnen opgeven.
**Geïmplementeerd:** `HerhalingConfig.totDatum` (inclusief; geen DB-migratie — reeksen worden gematerialiseerd). Formulier kreeg een "T/m datum"-rij die "Eindigt na" vervangt zodra gevuld; veiligheidscaps (104 weken / 24 maanden / 730 dagen); einddatum vóór de startdatum levert alleen het startevent op.

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

### ~~Dagelijkse overzichtsmail~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Elke ochtend een e-mail met alle events van die dag.
**Geïmplementeerd:** als onderdeel van het bredere *Persoonlijk dagoverzicht via Telegram en/of e-mail* (sectie Personalisatie) — aan/uit, kanaalkeuze en tijdstip in Instellingen → Voorkeuren.

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

### ~~Weergave-voorkeur opslaan~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** De gekozen weergave (week/dag/maand/agenda) onthouden na sluiten van de app.
**Geïmplementeerd:** onderdeel van de *Voorkeuren-tab in Instellingen* (sectie Personalisatie) — kies "Laatst gebruikt" of een vaste startweergave; laatst gebruikte weergave wordt per apparaat onthouden in localStorage.

---

### Tijdzone-instelling
**Wat:** Gebruiker kan zijn tijdzone instellen in het profielmenu.
**Waarom:** Nu is de tijdzone in de cron hardcoded op `Europe/Amsterdam`. Bij gebruik vanuit het buitenland kloppen reminders niet.
**Complexiteit:** Middel
**Bestanden:** `ProfielMenu.tsx`, `supabaseOpslag.ts`, cron

---

### ~~Wachtwoord wijzigen~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Een wachtwoord-wijzigingsflow vanuit de app.
**Geïmplementeerd:** sectie Wachtwoord in Instellingen → tab **Account** (voorheen "Profielfoto"): nieuw wachtwoord + bevestiging, ≥ 6 tekens, via `supabase.auth.updateUser({ password })`; nette fout-/succesmeldingen, velden leeg na succes.

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

### ~~Error boundary toevoegen~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Componenten omhullen met een React error boundary zodat crashes netjes worden opgevangen.
**Geïmplementeerd:** `ErrorBoundary.tsx` (class component met NL-foutmelding + "Herlaad de app"-knop) gewrapt om `{children}` in `app/layout.tsx`. Logt alleen de foutmelding, geen gebruikersdata.
**Bestanden:** `ErrorBoundary.tsx` (nieuw), `app/layout.tsx`

---

### ~~Telegram: geblokkeerde bot automatisch uitzetten (403)~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Bij een Telegram-`403` (bot geblokkeerd) de koppeling automatisch opruimen zodat de cron terugvalt op web-push.
**Geïmplementeerd:** `verstuurTelegram()` retourneert nu `{ ok, status }`; bij 403 verwijdert de cron de koppeling (`verwerkTelegram403`) — reminders vallen automatisch terug op push, dagoverzicht toont de bestaande warning, en de app toont weer "Telegram koppelen". Plus: elke mislukte Telegram-reminderpoging krijgt in dezelfde firing een push-fallback. Tijdelijke fouten (5xx/netwerk) raken de koppeling niet.
**Bestanden:** `lib/telegram.ts`, `api/cron/reminders/route.ts`, `api/telegram/test/route.ts`

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

### ~~Zoekfunctie~~ ✅ Geïmplementeerd (juni 2026)
**Wat:** Zoeken in eventtitels, locaties en notities.
**Geïmplementeerd:** `ZoekModal.tsx`, client-side over de volledige eventdataset én de verjaardagen (alles staat al in state), case- en diakriet-ongevoelig, vanaf 2 tekens, aankomend eerst (max 50). Resultaat kiezen navigeert naar de datum en opent het event of de verjaardag-editor. Zoekicoon terug in de desktop-TopBar; mobiel via het menu (modal gecentreerd i.v.m. het toetsenbord). Feestdagen vallen bewust buiten de resultaten.

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
