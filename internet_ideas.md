# Internet-ideeën — inspiratie uit gebruikersfrustraties en geliefde features

Verzameld via internetonderzoek (juni 2026) naar wat mensen frustreert aan agenda-apps en welke features ze juist geweldig vinden. Per idee staan **scopevragen**: die beantwoorden we samen vóór de bouw, zodat de scope vooraf helder is.

Bronnen o.a.: The Week ("why are calendar apps so awful"), Reclaim ("why does my calendar suck"), Quora (Google Calendar design flaws), Apple Community-klachten, Pretty Progress (countdowns), Efficient App / Zapier (kalender- en time-blocking-apps 2026). Geen URL's met tracking; alles is openbaar vindbaar op deze titels.

**Aanbevolen top 3:** ① Undo-snackbar → ② Weer bij de dagkoppen → ③ Countdown voor favoriete events.

---

## 1. ~~Undo-snackbar ("Herstel")~~ ✅ Geïmplementeerd (juni 2026)
**Bron:** grootste frustratie in het onderzoek — per ongeluk verwijderen/wijzigen is definitief, geen nette undo (klassieke Google Calendar-klacht).
**Geïmplementeerd:** `Snackbar.tsx` + undo-state in `AgendaApp`. Scope-antwoorden: undo bij **verwijderen** (incl. hele reeks, "Reeks verwijderd") en **verslepen**; bewerken bewust later. Gecentreerd onderin (mobiel boven de BottomBar), 5 sec met hover-pauze, nieuwste actie vervangt de vorige. Herstel = upsert met dezelfde id's (geen duplicaten; reminders blijven intact).
**Nog open (vervolgstap):** undo na bewerken (incl. "hele reeks"-bewerking).

---

## 2. ~~Weer bij de dagkoppen~~ ✅ Geïmplementeerd (juni 2026)
**Bron:** veelgenoemde delight-feature; kale agenda's missen context voor het plannen van je dag.
**Geïmplementeerd:** `lib/weer.ts` (Open-Meteo, geen key) + sectie "Weer" in Voorkeuren. Scope-antwoorden: vaste locatie via plaatsnaam + geocoding (géén device-locatie), alleen dag-/weekweergave, ~7 dagen, lucide-icoon + max-temperatuur (geen neerslag in v1), 1-uurs localStorage-cache per locatie, stil falen, toggle standaard uit.
**Nog open (vervolgstap):** neerslagkans toevoegen als het compact blijft.

---

## 3. Countdown voor favoriete events ⭐ aanbevolen
**Bron:** countdown-apps (Pretty Progress e.d.) zijn populair puur om "nog 23 dagen tot vakantie" — klein, persoonlijk, motiverend.
**Wat:** markeer een event als favoriet → countdown zichtbaar op een vaste plek, bv. in de begroeting of Sidebar: "Vakantie over 23 dagen".
**Complexiteit:** Laag–Middel · **Privacy:** n.v.t. · **Bestanden (verwacht):** `types.ts`, `AfspraakFormulier.tsx`, `Sidebar.tsx`/`lib/begroeting.ts`, opslaglaag
**Scopevragen:**
- Hoe markeer je een favoriet: ster-icoon in het afspraakformulier, of ergens anders?
- Waar verschijnt de countdown: in de begroeting (1 regel), als apart Sidebar-blokje, of beide (desktop/mobiel)?
- Meerdere favorieten tegelijk: hoeveel tonen we, en in welke volgorde (dichtstbijzijnde eerst)?
- Wat gebeurt er na afloop van het event — favoriet automatisch laten vervallen?
- Tellen verjaardagen ook mee als mogelijke countdown ("Lisa jarig over 12 dagen")?
- Opslag: nieuw veld op `Afspraak` vergt een DB-kolom (`favoriet boolean`) — akkoord met die kleine migratie, of liever favorieten-ids in `user_metadata` (geen migratie, maar losser gekoppeld)?

---

## 4. Tijdsinzicht per label (weekstatistiek)
**Bron:** frustratie "kalenders geven geen context over waar je tijd heen gaat" (Reclaim).
**Wat:** statistiekje per week of maand op basis van jouw labels: "Deze week 14u gepland: 8u Werk · 3u Sport · 3u Privé" — labels + kleuren lenen zich er perfect voor, volledig client-side.
**Complexiteit:** Middel · **Privacy:** uitstekend · **Bestanden (verwacht):** nieuw component, `AgendaApp.tsx`
**Scopevragen:**
- Waar leeft dit: een blokje in de Sidebar, een eigen modal (via Sidebar/menu), of in het FilterMenu?
- Week, maand of allebei (met periode-navigatie)?
- Hoe tellen hele-dag events mee — niet, als vast aantal uren, of apart vermeld?
- Events zonder label: bucket "Overig" of weglaten?
- Alleen totalen, of ook een staafje/verdeling per dag?

---

## 5. Jaaroverzicht ("Jouw jaar")
**Bron:** het Spotify-Wrapped-effect — mensen zijn dol op persoonlijke jaarstatistieken.
**Wat:** een kaartje met o.a. totaal aantal afspraken, drukste maand, meest gebruikte label, aantal verjaardagen gevierd. Eenmalig leuk, client-side berekend.
**Complexiteit:** Middel · **Privacy:** uitstekend · **Bestanden (verwacht):** nieuw component, ingang via Instellingen of Sidebar
**Scopevragen:**
- Wanneer/waar tonen: automatisch in december, altijd opvraagbaar via Instellingen, of beide?
- Welke statistieken willen we minimaal (en welke juist niet — bv. "minst drukke maand" kan saai zijn)?
- Over welk jaar: kalenderjaar tot nu, of laatste 12 maanden?
- Eén scrollbaar kaartje of meerdere "slides"?
- Moet het screenshot-vriendelijk zijn (vaste verhouding, app-naam erop)?

---

## 6. Streaks ("4 weken op rij")
**Bron:** habit-functies (TickTick/Reclaim) scoren hoog; een lichte variant past bij deze app.
**Wat:** bij consequent terugkerende events een aanmoediging in de begroeting: "Tennis — 4 weken op rij".
**Complexiteit:** Middel · **Privacy:** uitstekend · **Bestanden (verwacht):** `lib/begroeting.ts` of eigen helper, `AgendaApp.tsx`
**Scopevragen:**
- Wat telt als streak: het event stáát in de agenda, of moet het ook "gedaan" zijn (vereist het taken-vinkje, idee 7)?
- Alleen herhalende reeksen (zelfde `herhalingGroepId`), of ook losse events met dezelfde titel?
- Waar tonen en hoe vaak — alleen bij een mijlpaal (4, 8, 12 weken) om herhaling te voorkomen?
- Wat bij een gebroken streak: niets zeggen (positief blijven) of opnieuw beginnen tellen?

---

## 7. Taken-vinkje op events (afvinkbaar)
**Bron:** time blocking / taken-in-je-agenda is dé trend in 2026; dit is de lichtste zinvolle variant.
**Wat:** een event optioneel als "taak" markeren → afvinkbaar; afgevinkt = doorgestreept/gedimd in de weergaven.
**Complexiteit:** Middel–Hoog · **Privacy:** n.v.t. · **Bestanden (verwacht):** `types.ts`, DB-kolom, `AfspraakFormulier.tsx`, alle views
**Scopevragen:**
- Twee nieuwe DB-kolommen nodig (`is_taak`, `afgevinkt`) — akkoord met die migratie?
- Waar vink je af: in de agenda-lijst, op het event-blok zelf (tap-conflict met openen?), of alleen in het formulier?
- Visueel afgevinkt: doorstrepen, dimmen, of allebei — in álle weergaven of alleen de lijst?
- Moet een onafgevinkte taak van gisteren ergens terugkomen ("nog open"), of laten we dat bewust simpel?
- Telt een afgevinkte taak nog mee in de begroeting/dagsamenvatting en het dagoverzicht?

---

## 8. Reistijd-buffer ("vertrek om 08:40")
**Bron:** veelgehoorde wens bij events met locatie; volwaardige reistijd vergt een route-API, dit is de privacyvriendelijke handmatige variant.
**Wat:** per event met locatie een buffer instellen (bv. 30 min) → schaduwblokje vóór het event in dag/week + eventueel een reminder op de vertrektijd.
**Complexiteit:** Middel · **Privacy:** uitstekend (geen route-API) · **Bestanden (verwacht):** `types.ts`, DB-kolom, `AfspraakFormulier.tsx`, `Dag-/WeekWeergave.tsx`, evt. cron
**Scopevragen:**
- Nieuw DB-veld (`reistijd_minuten`) — akkoord met die kleine migratie?
- Alleen tonen als schaduwblok, of ook een aparte "tijd om te vertrekken"-reminder via de bestaande cron?
- Geldt de buffer ook ná het event (terugreis), of alleen ervoor?
- Beschikbaar voor alle events of alleen events mét locatie?
- Hoe ziet het schaduwblok eruit (gestreept/transparant, klikbaar of niet)?

---

## Bewust niet opgenomen
- **AI-scheduling / auto-replanning** (Motion/Reclaim-stijl): vergt externe AI-diensten — botst met de privacy-uitgangspunten van deze app.
- **Volwaardig takenbeheer / Pomodoro**: te grote scope-verschuiving; idee 7 is de passende lichte variant.
- **Attachments bij events**: opslag-complexiteit (Storage-bucket) weegt niet op tegen het nut voor één gebruiker.
