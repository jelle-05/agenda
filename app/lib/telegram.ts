/**
 * Server-side helper om berichten te sturen via de Telegram Bot API.
 *
 * Gebruikt alleen `fetch` (geen extra library). Bedoeld voor server-context
 * (cron, API-routes); leest het bot-token uit `process.env.TELEGRAM_BOT_TOKEN`.
 *
 * Fail-soft (net als de rest van de app): bij een ontbrekend token of een
 * fout retourneert de functie `false` en logt netjes — zonder ooit het token
 * of de chat-id-waarde te tonen.
 */

type ParseMode = 'HTML' | 'MarkdownV2'

interface TelegramOpties {
  /** Opmaak van `tekst`. Default 'HTML'. */
  parseMode?: ParseMode
  /** Linkvoorbeelden onderdrukken (rustiger reminders). Default true. */
  geenLinkPreview?: boolean
}

export interface TelegramResultaat {
  ok: boolean
  /** HTTP-status van de Telegram API bij een fout (bv. 403 = bot geblokkeerd); null bij netwerkfout of ontbrekend token. */
  status: number | null
}

/**
 * Stuurt één Telegram-bericht naar `chatId`.
 * @returns `{ ok, status }` — `ok: true` als Telegram het bericht accepteerde;
 *          `status` bevat bij een API-fout de HTTP-status (403 = geblokkeerd).
 */
export async function verstuurTelegram(
  chatId: string,
  tekst: string,
  opties: TelegramOpties = {},
): Promise<TelegramResultaat> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error('[telegram] TELEGRAM_BOT_TOKEN ontbreekt — bericht niet verstuurd')
    return { ok: false, status: null }
  }

  const { parseMode = 'HTML', geenLinkPreview = true } = opties

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: tekst,
        parse_mode: parseMode,
        disable_web_page_preview: geenLinkPreview,
      }),
    })

    if (!res.ok) {
      // Telegram geeft bij fouten een JSON-body met { ok, error_code, description }.
      const data = await res.json().catch(() => null)
      console.error('[telegram] sendMessage mislukt', {
        status: res.status,
        beschrijving: data?.description ?? null,
      })
      return { ok: false, status: res.status }
    }

    return { ok: true, status: null }
  } catch (err) {
    console.error('[telegram] netwerkfout bij sendMessage:', err instanceof Error ? err.message : err)
    return { ok: false, status: null }
  }
}
