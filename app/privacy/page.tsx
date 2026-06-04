import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacybeleid — Agenda',
  description: 'Hoe deze agenda-app met je gegevens omgaat',
}

// Statische informatiepagina. De body heeft overflow-hidden (app-shell),
// dus deze pagina regelt haar eigen scroll-container.
export default function PrivacyPagina() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/" className="text-[#007AFF] text-[14px] font-medium">
          ← Terug naar de agenda
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Privacybeleid</h1>
        <p className="text-[13px] text-gray-400 mb-8">
          Praktische beschrijving van hoe deze app met je gegevens omgaat. Laatst bijgewerkt: juni 2026.
        </p>

        <div className="flex flex-col gap-8 text-[15px] text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-[17px] font-semibold text-gray-900 mb-2">Over deze app</h2>
            <p>
              Agenda is een persoonlijke agenda-app, beheerd door de eigenaar van dit domein.
              De app is bedoeld voor een kleine groep gebruikers (registratie is beperkt) en
              toont je afspraken, verjaardagen en Nederlandse feestdagen, met reminders via
              notificaties, Telegram en e-mail.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-gray-900 mb-2">Welke gegevens we verwerken</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>
                <strong className="text-gray-900">Account</strong> — je e-mailadres en een versleuteld
                wachtwoord (via Supabase Auth). Gebruikt om in te loggen en om reminder-e-mails te sturen.
              </li>
              <li>
                <strong className="text-gray-900">Agenda-inhoud</strong> — je afspraken (titel, datum, tijd,
                locatie, notities, labels) en verjaardagen (naam, dag/maand, optioneel jaar, notitie).
                Opgeslagen in een database (Supabase) en alleen toegankelijk voor jouw account.
              </li>
              <li>
                <strong className="text-gray-900">Push-abonnementen</strong> — als je notificaties aanzet,
                bewaren we het technische push-adres van je browser/apparaat om reminders te kunnen sturen.
              </li>
              <li>
                <strong className="text-gray-900">Telegram-koppeling</strong> — alleen als je Telegram koppelt:
                het chat-id (en eventueel je Telegram-gebruikersnaam) om reminders via Telegram te bezorgen.
                Ontkoppelen verwijdert deze gegevens direct.
              </li>
              <li>
                <strong className="text-gray-900">Lokale cache</strong> — je agenda wordt op je eigen apparaat
                gecachet (localStorage) zodat de app snel en offline werkt. Die kopie verlaat je apparaat niet.
              </li>
              <li>
                <strong className="text-gray-900">Technische logs</strong> — server-logs voor het oplossen van
                fouten, zonder wachtwoorden, tokens of de inhoud van je agenda-items.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-gray-900 mb-2">Waarvoor we ze gebruiken</h2>
            <p>
              Uitsluitend om de app te laten werken: je agenda tonen en synchroniseren tussen je
              apparaten, en reminders bezorgen via push-notificaties, Telegram of e-mail. Je gegevens
              worden niet verkocht en niet gedeeld voor advertenties.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-gray-900 mb-2">Diensten die we gebruiken</h2>
            <p>
              De app draait op Vercel (hosting) en Supabase (database en login). Reminder-e-mails
              worden verstuurd via Resend; Telegram-berichten via de Telegram Bot API (alleen als je
              zelf koppelt). Deze diensten verwerken gegevens alleen om hun functie te vervullen.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-gray-900 mb-2">Hoe lang we gegevens bewaren</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Je account en agenda-inhoud: zolang je account bestaat. Wat je verwijdert, is weg.</li>
              <li>Interne verzendmarkeringen van reminders (tegen dubbele meldingen): circa 60 dagen.</li>
              <li>Telegram-koppelcodes: circa 10 minuten geldig, daarna onbruikbaar.</li>
              <li>Telegram-koppeling en push-abonnementen: tot je ontkoppelt of notificaties uitzet.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-gray-900 mb-2">Notificaties: zelf in te stellen</h2>
            <p>
              Notificaties zijn opt-in: de browser vraagt eerst om toestemming. In Instellingen →
              Notificaties kun je Telegram koppelen of ontkoppelen en Telegram-reminders aan- of
              uitzetten. Browser-notificaties zet je uit via de instellingen van je browser of toestel.
            </p>
          </section>

          <section>
            <h2 className="text-[17px] font-semibold text-gray-900 mb-2">Je rechten en contact</h2>
            <p>
              Je kunt inzage, correctie of verwijdering van je gegevens (of je hele account) vragen
              via de beheerder. Contact: <strong className="text-gray-900">[supportadres invullen]</strong>.
            </p>
            <p className="mt-2 text-[13px] text-gray-400">
              Dit is een praktische beschrijving van de werkelijke werking van de app, opgesteld door
              de beheerder; het is geen juridisch getoetst document.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
