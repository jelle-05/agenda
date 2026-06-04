# 📲 Toestel-tests — handmatige Android/PWA-testsessie (fase 1–3)

> Afvinkbare checklist voor de openstaande handmatige tests uit `twa_fases.md` fase 1–3 (Lighthouse, installability, offline, push). Uitvoeren op een **echt Android-toestel** met Android Chrome, **vóór fase 4** (of uiterlijk vóór fase 5 als bewust geaccepteerd restpunt). Later herhalen in de TWA-build (fase 6).
>
> ⚠️ Vooraf: OEM-batterijbeheer (Xiaomi/Samsung e.d.) voor Chrome op **"niet beperken"** zetten — agressief batterijbeheer vertekent pushresultaten. Geen endpoints, sleutels of persoonsgegevens noteren in testverslagen.

---

## 1. PWA-installability (fase 1-restpunt)

- [ ] Open `https://agenda.jellebol.nl` in Android Chrome.
- [ ] Controleer dat Chrome installatie aanbiedt (install-prompt of menu → **"App installeren"** / "Toevoegen aan startscherm").
- [ ] Installeer de app.
- [ ] Start de app vanaf het homescreen.
- [ ] Controleer **standalone**-gedrag: geen browser-UI/adresbalk, witte statusbalk, eigen app-venster in recents.
- [ ] Controleer dat **inloggen** werkt (Supabase e-mail/wachtwoord) en de sessie blijft na app-herstart.
- [ ] Controleer dat **Instellingen** werkt (profielavatar → Instellingen → tab Notificaties opent).

## 2. Lighthouse op productie (fase 1-restpunt)

Vanaf een desktop: `npx lighthouse https://agenda.jellebol.nl --view` — of Chrome DevTools → Lighthouse.

- [ ] Audit draaien op `https://agenda.jellebol.nl`.
- [ ] **Installability**: geen blockers (manifest geldig, SW actief, HTTPS).
- [ ] **Manifest**: `id`/`start_url`/`scope` herkend, `display: standalone`, kleuren aanwezig.
- [ ] **Service worker**: geregistreerd op scope `/`, offline-fallback gedetecteerd.
- [ ] **Icons**: geen meldingen over ontbrekende/te kleine icons; maskable icon herkend.
- [ ] Eventuele blockers/waarschuwingen noteren en fixen vóór fase 4 (TWA = webkwaliteit).

## 3. Offlinegedrag (fase 2-restpunt)

- [ ] Open de (geïnstalleerde) app en laat hem volledig laden.
- [ ] Zet **vliegtuigmodus** aan.
- [ ] Refresh / navigeer: de app toont de offline-fallback (`offline.html`) in plaats van een Chrome-foutpagina.
- [ ] Zet het netwerk weer aan → controleer herstel: app laadt weer normaal, data synct.

## 4. Pushmeldingen (fase 3-restpunt — 10 stappen)

Uitgewerkte versie van de checklist uit `twa_fases.md` fase 3.

1. [ ] Log in op `https://agenda.jellebol.nl` in Android Chrome → controleer dat de service worker actief is (desktop-DevTools via USB-debugging, of `chrome://serviceworker-internals` op het toestel).
2. [ ] Instellingen → Notificaties → sectie **Meldingen** → "Meldingen aanzetten" → Android 13+ toont de permissieprompt → accepteer → status wordt **"aan"** (groen).
3. [ ] Verstuur een **testpush** via de bestaande testflow (`POST /api/push/test` met Bearer-token) óf maak een echt event met reminder (bv. +5 min) → notificatie komt op tijd binnen als **systeemnotificatie**.
4. [ ] Tik op de notificatie → de app **opent/focust** op de juiste route.
5. [ ] Telegram-toggle **aan** (Instellingen → Notificaties → "Telegram-reminders") → zelfde remindertest → **géén** browserpush, **wél** Telegram-bericht (push wordt bewust vervangen).
6. [ ] Telegram-toggle **uit** → zelfde test → browserpush komt **weer** binnen.
7. [ ] **"Uitzetten op dit apparaat"** → opt-out werkt: geen meldingen meer op dit toestel; geen `[reminders] push mislukt` in de Vercel-logs (rij is netjes verwijderd).
8. [ ] 404/410-opruiming: meldingen weer aanzetten, daarna app-/site-data wissen **zonder** eerst uit te zetten → volgende reminder → Vercel-log toont `dode push-subscription opgeruimd`.
9. [ ] Vliegtuigmodus tijdens een reminder → app toont offline-pagina; daarna online → reminders hervatten.
10. [ ] **Vercel-logs controleren**: alleen statuscodes en compacte meldingen — nergens push-endpoints, sleutels of persoonsgegevens zichtbaar.

---

## Resultaat noteren

- [ ] Datum + toestel/Chrome-versie noteren (geen persoonsgegevens).
- [ ] Blockers → eerst fixen, daarna deze checklist herdraaien.
- [ ] Alles groen → restpunten fase 1–3 afvinken in `twa_fases.md` en door naar de gate **"Eerst regelen vóór fase 4"**.
