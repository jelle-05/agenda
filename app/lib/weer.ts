import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning } from 'lucide-react'

// Weersverwachting via Open-Meteo: gratis, geen API-key, geen account.
// Privacy: alleen de handmatig ingestelde locatie (Voorkeuren) gaat naar de
// API — geen device-locatie, geen geschiedenis, niets via een eigen backend.
// Fouten zijn altijd stil (null/cache): een falende weer-API raakt de agenda nooit.

export interface DagWeer {
  code: number      // WMO weather code
  maxTemp: number   // maximumtemperatuur (°C)
}
export type WeerPerDag = Record<string, DagWeer>   // key = 'YYYY-MM-DD'

const CACHE_SLEUTEL = 'agenda_weer'
const CACHE_TTL_MS = 60 * 60 * 1000   // 1 uur

interface WeerCache {
  lat: number
  lon: number
  opgehaald: number
  dagen: WeerPerDag
}

function leesCache(lat: number, lon: number): WeerPerDag | null {
  try {
    const ruw = localStorage.getItem(CACHE_SLEUTEL)
    if (!ruw) return null
    const cache = JSON.parse(ruw) as WeerCache
    if (cache.lat !== lat || cache.lon !== lon) return null         // andere locatie → verse fetch
    if (Date.now() - cache.opgehaald > CACHE_TTL_MS) return null    // verlopen
    return cache.dagen
  } catch {
    return null
  }
}

function schrijfCache(lat: number, lon: number, dagen: WeerPerDag): void {
  try {
    const cache: WeerCache = { lat, lon, opgehaald: Date.now(), dagen }
    localStorage.setItem(CACHE_SLEUTEL, JSON.stringify(cache))
  } catch {
    // localStorage vol/onbeschikbaar → gewoon zonder cache verder
  }
}

/** Daily forecast (~7 dagen) voor de opgegeven coördinaten; 1 uur gecachet. */
export async function haalWeerOp(lat: number, lon: number): Promise<WeerPerDag | null> {
  const gecached = leesCache(lat, lon)
  if (gecached) return gecached

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&daily=weather_code,temperature_2m_max&timezone=auto&forecast_days=7`
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('[weer] forecast mislukt:', res.status)
      return null
    }
    const data = await res.json()
    const datums: string[] = data?.daily?.time ?? []
    const codes: number[] = data?.daily?.weather_code ?? []
    const temps: number[] = data?.daily?.temperature_2m_max ?? []

    const dagen: WeerPerDag = {}
    datums.forEach((datum, i) => {
      if (typeof codes[i] === 'number' && typeof temps[i] === 'number') {
        dagen[datum] = { code: codes[i], maxTemp: temps[i] }
      }
    })
    if (Object.keys(dagen).length === 0) return null
    schrijfCache(lat, lon, dagen)
    return dagen
  } catch (err) {
    console.warn('[weer] forecast niet beschikbaar:', err instanceof Error ? err.message : err)
    return null
  }
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

// WMO weather code → lucide-icoon + NL-label (compacte mapping, dekkend voor
// alle codes die Open-Meteo daily teruggeeft).
export function weerIcoon(code: number): { Icoon: typeof Sun; label: string } {
  if (code === 0) return { Icoon: Sun, label: 'zonnig' }
  if (code <= 2) return { Icoon: CloudSun, label: 'half bewolkt' }
  if (code === 3) return { Icoon: Cloud, label: 'bewolkt' }
  if (code === 45 || code === 48) return { Icoon: CloudFog, label: 'mist' }
  if (code >= 51 && code <= 57) return { Icoon: CloudDrizzle, label: 'motregen' }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { Icoon: CloudRain, label: 'regen' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { Icoon: CloudSnow, label: 'sneeuw' }
  if (code >= 95) return { Icoon: CloudLightning, label: 'onweer' }
  return { Icoon: Cloud, label: 'bewolkt' }
}
