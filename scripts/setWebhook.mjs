/**
 * Registreert de Telegram-webhook bij de Bot API (setWebhook).
 *
 * Herhaalbaar: draai dit opnieuw zodra de webhook-URL of het secret wijzigt
 * (bv. nieuw domein, of na het roteren van TELEGRAM_WEBHOOK_SECRET).
 *
 * Draaien (env uit .env.local):
 *   node --env-file=.env.local scripts/setWebhook.mjs
 *
 * Benodigde env (alleen namen — nooit waarden in code/Git/docs):
 *   TELEGRAM_BOT_TOKEN       Bot-token van BotFather (server-only).
 *   TELEGRAM_WEBHOOK_SECRET  Secret dat Telegram als header
 *                            X-Telegram-Bot-Api-Secret-Token meestuurt; de
 *                            webhook-route verifieert hiermee dat de call
 *                            echt van Telegram komt.
 *   TELEGRAM_WEBHOOK_URL     Volledige webhook-URL, bv.
 *                            https://<domein>/api/telegram/webhook
 *
 * Toont nooit token of secret in de output — alleen de URL en het resultaat.
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const URL = process.env.TELEGRAM_WEBHOOK_URL

const ontbrekend = [
  ['TELEGRAM_BOT_TOKEN', TOKEN],
  ['TELEGRAM_WEBHOOK_SECRET', SECRET],
  ['TELEGRAM_WEBHOOK_URL', URL],
].filter(([, v]) => !v).map(([k]) => k)

if (ontbrekend.length > 0) {
  console.error(`Ontbrekende env: ${ontbrekend.join(', ')}.`)
  console.error('Draai met: node --env-file=.env.local scripts/setWebhook.mjs')
  process.exit(1)
}

try {
  new globalThis.URL(URL)
} catch {
  console.error(`TELEGRAM_WEBHOOK_URL is geen geldige URL: ${URL}`)
  process.exit(1)
}

console.log(`Webhook registreren op: ${URL}`)

try {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: URL,
      secret_token: SECRET,
      allowed_updates: ['message'],
    }),
  })

  const data = await res.json().catch(() => null)

  if (res.ok && data?.ok) {
    console.log(`✅ Webhook ingesteld. Telegram: ${data.description ?? 'ok'}`)
  } else {
    console.error('❌ setWebhook mislukt:', {
      status: res.status,
      beschrijving: data?.description ?? null,
    })
    process.exit(1)
  }
} catch (err) {
  console.error('❌ Netwerkfout bij setWebhook:', err instanceof Error ? err.message : err)
  process.exit(1)
}
