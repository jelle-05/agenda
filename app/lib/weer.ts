import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning } from 'lucide-react'

// Weersverwachting via Open-Meteo: gratis, geen API-key, geen account.
// Privacy: alleen de handmatig ingestelde locatie (Voorkeuren) gaat naar de
// API — geen device-locatie, geen geschiedenis, niets via een eigen backend.
// Fouten zijn altijd stil (null/cache): een falende weer-API raakt de agenda nooit.
//
// `haalForecast` is een pure fetch (geen localStorage) en daardoor ook
// server-side bruikbaar (cron/dagoverzicht); `haalWeerOp` is de client-wrapper
// met 1-uurs cache.

export interface DagWeer {
  code: number        // WMO weather code
  maxTemp: number     // maximumtemperatuur (°C)
  minTemp: number     // minimumtemperatuur (°C)
  neerslagKans: number // max. neerslagkans van de dag (%)
}
export interface UurWeer {
  tijd: string        // 'HH:MM'
  temp: number
  neerslagKans: number
  code: number
}
export type WeerPerDag = Record<string, DagWeer>            // key = 'YYYY-MM-DD'
export interface WeerBundel {
  dagen: WeerPerDag
  uren: Record<string, UurWeer[]>                            // key = 'YYYY-MM-DD'
}

const CACHE_SLEUTEL = 'agenda_weer'
const CACHE_VERSIE = 2
const CACHE_TTL_MS = 60 * 60 * 1000   // 1 uur

interface WeerCache {
  v: number
  lat: number
  lon: number
  opgehaald: number
  bundel: WeerBundel
}

function leesCache(lat: number, lon: number): WeerBundel | null {
  try {
    const ruw = localStorage.getItem(CACHE_SLEUTEL)
    if (!ruw) return null
    const cache = JSON.parse(ruw) as WeerCache
    if (cache.v !== CACHE_VERSIE) return null                   // oud formaat → verse fetch
    if (cache.lat !== lat || cache.lon !== lon) return null     // andere locatie
    if (Date.now() - cache.opgehaald > CACHE_TTL_MS) return null
    return cache.bundel
  } catch {
    return null
  }
}

function schrijfCache(lat: number, lon: number, bundel: WeerBundel): void {
  try {
    const cache: WeerCache = { v: CACHE_VERSIE, lat, lon, opgehaald: Date.now(), bundel }
    localStorage.setItem(CACHE_SLEUTEL, JSON.stringify(cache))
  } catch {
    // localStorage vol/onbeschikbaar → gewoon zonder cache verder
  }
}

/** Pure forecast-fetch (daily + hourly, ~7 dagen) — geen cache, ook server-side bruikbaar. */
export async function haalForecast(lat: number, lon: number): Promise<WeerBundel | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
      + `&hourly=temperature_2m,precipitation_probability,weather_code`
      + `&timezone=auto&forecast_days=7`
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('[weer] forecast mislukt:', res.status)
      return null
    }
    const data = await res.json()

    const dagen: WeerPerDag = {}
    const dDatums: string[] = data?.daily?.time ?? []
    dDatums.forEach((datum, i) => {
      const code = data.daily.weather_code?.[i]
      const max = data.daily.temperature_2m_max?.[i]
      const min = data.daily.temperature_2m_min?.[i]
      const kans = data.daily.precipitation_probability_max?.[i]
      if (typeof code === 'number' && typeof max === 'number' && typeof min === 'number') {
        dagen[datum] = { code, maxTemp: max, minTemp: min, neerslagKans: typeof kans === 'number' ? kans : 0 }
      }
    })

    const uren: Record<string, UurWeer[]> = {}
    const uTijden: string[] = data?.hourly?.time ?? []          // 'YYYY-MM-DDTHH:MM'
    uTijden.forEach((t, i) => {
      const temp = data.hourly.temperature_2m?.[i]
      const kans = data.hourly.precipitation_probability?.[i]
      const code = data.hourly.weather_code?.[i]
      if (typeof temp !== 'number' || typeof code !== 'number') return
      const [datum, tijd] = t.split('T')
      if (!uren[datum]) uren[datum] = []
      uren[datum].push({ tijd, temp, neerslagKans: typeof kans === 'number' ? kans : 0, code })
    })

    if (Object.keys(dagen).length === 0) return null
    return { dagen, uren }
  } catch (err) {
    console.warn('[weer] forecast niet beschikbaar:', err instanceof Error ? err.message : err)
    return null
  }
}

/** Client-variant met 1-uurs localStorage-cache. */
export async function haalWeerOp(lat: number, lon: number): Promise<WeerBundel | null> {
  const gecached = leesCache(lat, lon)
  if (gecached) return gecached
  const bundel = await haalForecast(lat, lon)
  if (bundel) schrijfCache(lat, lon, bundel)
  return bundel
}

/** Zoekt coördinaten bij een plaatsnaam via Open-Meteo Geocoding; null bij geen resultaat. */
export async function zoekLocatie(naam: string): Promise<{ naam: string; lat: number; lon: number } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(naam)}&count=1&language=nl`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const r = data?.results?.[0]
    if (!r || typeof r.latitude !== 'number' || typeof r.longitude !== 'number') return null
    return { naam: r.name as string, lat: r.latitude, lon: r.longitude }
  } catch {
    return null
  }
}

/** WMO weather code → kort NL-label (tekst-only, ook voor mail/Telegram). */
export function weerLabel(code: number): string {
  if (code === 0) return 'zonnig'
  if (code <= 2) return 'half bewolkt'
  if (code === 3) return 'bewolkt'
  if (code === 45 || code === 48) return 'mist'
  if (code >= 51 && code <= 57) return 'motregen'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'regen'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'sneeuw'
  if (code >= 95) return 'onweer'
  return 'bewolkt'
}

// WMO weather code → lucide-icoon + NL-label (voor de UI).
export function weerIcoon(code: number): { Icoon: typeof Sun; label: string } {
  const label = weerLabel(code)
  if (code === 0) return { Icoon: Sun, label }
  if (code <= 2) return { Icoon: CloudSun, label }
  if (code === 3) return { Icoon: Cloud, label }
  if (code === 45 || code === 48) return { Icoon: CloudFog, label }
  if (code >= 51 && code <= 57) return { Icoon: CloudDrizzle, label }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { Icoon: CloudRain, label }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icoon: CloudSnow, label }
  if (code >= 95) return { Icoon: CloudLightning, label }
  return { Icoon: Cloud, label }
}
