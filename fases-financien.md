# Financiën-app — globale roadmap

> Onderzoek- en faseringsdocument voor een persoonlijke financiën-app, in dezelfde stijl en stack als de agenda-app. **Nog geen code geschreven** — dit is het globale plan. De globale vragen zijn inmiddels **beantwoord** (zie §8); de scope/fasering hieronder is daarop aangepast.

**App:** "Financiën" · **subdomein:** `financien.jellebol.nl` · **gedeelde login** met de agenda (één Supabase-account/SSO).

---

## 1. Projectoverzicht & doel

Een **persoonlijke financiën-app** om grip te houden op je geld: bijhouden wat er binnenkomt en uitgaat, waar het heen gaat, en of je binnen je budget blijft. Eén gebruiker (Jelle), Nederlandstalig, light mode — net als de agenda.

**Uitgangspunten (zelfde DNA als de agenda):**
- **Privacyvriendelijk**: handmatige invoer, geen banksync, geen tracking, geen externe financiële API's.
- **Eigen ecosysteem**: draait op een eigen subdomein van `jellebol.nl`, naast agenda en notes.
- **Rustig en Apple-achtig**: dezelfde designtaal als de agenda (kaarten, labels met kleuren, bottom-sheets op mobiel).
- **PWA + later eventueel Android (TWA)**, net als de agenda.

Doel van v1: in een paar tikken een uitgave/inkomst toevoegen, en in één oogopslag zien hoe je maand ervoor staat.

---

## 2. Aansluiting op de agenda-app

De grote winst van zelfbouw: alles kan op **dezelfde fundering** staan.

| Onderdeel | Hergebruik uit de agenda |
|---|---|
| **Stack** | Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase + Vercel |
| **Auth** | Eén Supabase-project → **gedeelde login (SSO)** over `agenda.`, `notes.`, `geld.`… — één keer inloggen |
| **Design** | Zelfde componenten/patronen (modals, labels met kleur + transparantie, voorkeuren-tab, undo-snackbar, zoeken) |
| **Opslag-patroon** | localStorage-cache + Supabase + realtime, optimistisch opslaan met fail-soft sync — exact zoals de agenda |
| **Notificaties** | Bestaande Telegram/e-mail/push-infra hergebruiken voor betaalreminders |
| **Kruisverband** | Terugkerende kosten ↔ agenda (betaaldatum als event/reminder) |

Kortom: een tweede app bouwen is fors sneller dan de eerste, omdat het meeste patroonwerk al bestaat.

---

## 3. Kernfunctionaliteit (globaal)

- **Transacties** (inkomsten én uitgaven) toevoegen/bewerken/verwijderen: bedrag, datum, categorie, omschrijving, type (in/uit), potje.
- **Categorieën** met kleur, **zelf aan te maken** (zoals de labels in de agenda): Boodschappen, Huur, Vervoer, Uit eten, Salaris…
- **Meerdere potjes/rekeningen** (betaal/spaar/contant) met saldo per potje + totaal saldo.
- **Budgetten** per categorie per maand met voortgangsbalk ("€210 van €300 boodschappen").
- **Excel/CSV-import** vanuit je eigen bank-app: je exporteert daar een bestand en importeert het hier; de app herkent inkomsten/uitgaven en helpt categoriseren. **Geen bankkoppeling/PSD2** — gewoon een bestand dat jij zelf exporteert (privacyvriendelijk).
- **Overzichten/grafieken**: maandtotaal in/uit/over, verdeling per categorie, trend over de tijd, budgetvoortgang.
- **Terugkerende kosten** (huur, abonnementen) — automatisch elke maand, later gekoppeld aan de agenda (betaalreminder/event).

---

## 4. Datamodel (globaal, schetsmatig)

Supabase-tabellen, met RLS per gebruiker (zoals de agenda):

- **`transacties`** — bedrag, datum, type (in/uit), categorie, potje, omschrijving, terugkerend-vlag, evt. import-bron.
- **`categorieen`** — naam, kleur (à la labels).
- **`rekeningen`** (potjes) — naam, type (betaal/spaar/contant), beginsaldo.
- **`budgetten`** — categorie + maandlimiet.

Bedragen in **hele centen als integer** (geen floating-point-afrondingsfouten) — belangrijkste technische afspraak. Valuta: **EUR**.

---

## 5. Fasering (globaal)

> Je koos budgetten én potjes voor "v1". In de bouwvolgorde zetten we de transactie-MVP eerst (fase 1) en budgetten/grafieken direct erna (fase 2) — samen vormen die jouw eerste volwaardige versie.

**Fase 0 — Setup & datamodel**
Nieuw Next.js-project op `financien.jellebol.nl`, **gedeelde Supabase-auth** met de agenda, designsysteem overnemen, tabellen aanmaken (`transacties`/`categorieen`/`rekeningen`/`budgetten`).

**Fase 1 — MVP: transacties, potjes & saldo**
Inkomsten/uitgaven toevoegen met categorie en potje, lijst per maand, zelf categorieën beheren (met kleur), meerdere potjes met saldo per potje + totaal, maandtotaal in/uit/over.

**Fase 2 — Budgetten & grafieken**
Budget per categorie/maand met voortgangsbalk; grafieken: verdeling per categorie, trend over de maanden, en de maandtotalen prominent.

**Fase 3 — Excel/CSV-import**
Een bestand uit je bank-app importeren: parsen, in/uit herkennen, aan categorieën/potjes koppelen, duplicaten voorkomen. Bewust ná de MVP omdat het parsen wat uitzoekwerk vergt (bankformaten verschillen).

**Fase 4 — Terugkerende kosten & agenda-koppeling**
Vaste lasten die maandelijks automatisch verschijnen; betaaldatums als event/reminder in de agenda (hergebruik van de cron/Telegram-infra).

**Fase 5 — Dashboard, export & polish**
Persoonlijk overzicht ("deze maand: €X uitgegeven, €Y over"), CSV-export, en aansluiting op een gedeeld "Vandaag"-dashboard van het ecosysteem.

---

## 6. Ecosysteem-integratie

- **Gedeelde login** over alle jellebol.nl-apps (één Supabase-account).
- **"Vandaag"-dashboard** (toekomstig): agenda + taken + weer + saldo van de maand op één startpagina.
- **Agenda-koppeling**: terugkerende betalingen als virtuele events (zelfde patroon als verjaardagen/feestdagen) en/of een betaalreminder.

---

## 7. Privacy & uitgangspunten

- **Geen banksync/PSD2** in v1 — handmatige invoer is privacyvriendelijk, simpel en betrouwbaar (zelfde keuze als de handmatige reistijd in de agenda).
- Geen tracking, geen externe diensten voor financiële data; alles in je eigen Supabase.
- Valuta: **EUR** (multi-valuta is een latere optie).
- Bedragen als integer-centen opslaan.

---

## 8. Beslissingen (beantwoord — juni 2026)

| # | Vraag | Keuze |
|---|---|---|
| 1 | Scope v1 | **Inkomsten + uitgaven + saldo** |
| 2 | Invoer | **Handmatig + Excel/CSV-import** vanuit de eigen bank-app (zelf geëxporteerd bestand; géén bankkoppeling/PSD2) |
| 3 | Categorieën | **Zelf aanmaken met kleur** (zoals de labels in de agenda) |
| 4 | Budgetten | **In v1** (qua bouwvolgorde fase 2, direct na de transactie-MVP) |
| 5 | Agenda-koppeling | **Betaalreminder + event, maar later** (fase 4) |
| 6 | Rekeningen/potjes | **Meerdere potjes** (betaal/spaar/contant) |
| 7 | Valuta | **Alleen EUR** (bedragen als integer-centen) |
| 8 | Grafieken | **Alle vier**: verdeling per categorie, trend over de tijd, maandtotaal in/uit/over, budgetvoortgang |
| 9 | Naam & subdomein | **"Financiën"** op **`financien.jellebol.nl`** |
| 10 | Login | **Gedeeld met de agenda** (één Supabase-account, SSO) |

---

## 9. Latere ideeën & risico's

**Later mogelijk:** spaardoelen met voortgang, automatische detectie van terugkerende uitgaven, CSV-import vanuit je bank, multi-valuta, gedeelde huishoud-administratie (multi-user), bonnetjes-foto bij een transactie.

**Aandachtspunten:** geldbedragen altijd als integer-centen (afrondingsfouten voorkomen); maand-/jaargrenzen bij overzichten; tijdzone consistent met de agenda; terugkerende kosten netjes genereren zonder duplicaten (zelfde les als de herhalende events in de agenda).

---

*Volgende stap: beantwoord de globale vragen hierboven — daarna werk ik dit uit tot een gedetailleerd faseplan (zoals `twa_fases.md` / `telegram_fases.md`) en kunnen we fase 0 starten.*
