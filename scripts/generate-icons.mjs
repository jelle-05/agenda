/**
 * Genereert icon-192.png, icon-512.png, icon-maskable.png en icon-play.png
 * vanuit icon.svg. Vereist: npm install --save-dev sharp
 *
 * Maskable: het icoon wordt op ~80% gecentreerd op een vol-vlak #007AFF-canvas,
 * zodat de content binnen de Android safe zone valt en niets wordt afgesneden
 * in ronde/gemaskeerde icon-vormen. De afgeronde hoeken van het bron-icoon
 * vallen weg tegen dezelfde achtergrondkleur (naadloos full-bleed).
 * icon-play.png is hetzelfde beeld, klaar voor de Play Console-upload (512×512,
 * volledig dekkend) — wordt niet in het manifest gebruikt.
 *
 * Daarnaast (Next.js file conventions, geen <head>-code nodig):
 * - app/favicon.ico    — browser-tab favicon (multi-size PNG-in-ICO: 16/32/48)
 * - app/apple-icon.png — apple-touch-icon (180×180, full-bleed: iOS kent geen
 *   transparantie en rondt zelf de hoeken af)
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = join(__dirname, '..', 'public', 'icon.svg')
const svg = readFileSync(svgPath)

const ACHTERGROND = '#007AFF'  // zelfde blauw als de rect in icon.svg
const CANVAS = 512
const SAFE = 410               // ~80% van 512: binnen de maskable safe zone

// Normale icons: 1-op-1 resize van het SVG
for (const { naam, px } of [
  { naam: 'icon-192.png', px: 192 },
  { naam: 'icon-512.png', px: 512 },
]) {
  const uitvoer = join(__dirname, '..', 'public', naam)
  await sharp(svg).resize(px, px).png().toFile(uitvoer)
  console.log(`✓ ${naam} (${px}×${px})`)
}

// Maskable + Play Store-icoon: icoon op ~80% gecentreerd op vol-vlak canvas
const ingeschaald = await sharp(svg).resize(SAFE, SAFE).png().toBuffer()
const fullBleed = await sharp({
  create: { width: CANVAS, height: CANVAS, channels: 4, background: ACHTERGROND },
})
  .composite([{ input: ingeschaald }])  // gravity: centre (default)
  .png()
  .toBuffer()
for (const naam of ['icon-maskable.png', 'icon-play.png']) {
  const uitvoer = join(__dirname, '..', 'public', naam)
  writeFileSync(uitvoer, fullBleed)
  console.log(`✓ ${naam} (${CANVAS}×${CANVAS}, full-bleed ${ACHTERGROND}, content ${SAFE}px)`)
}

// Apple touch icon: zelfde full-bleed beeld als maskable, op 180×180
const appleIcon = join(__dirname, '..', 'app', 'apple-icon.png')
await sharp(fullBleed).resize(180, 180).png().toFile(appleIcon)
console.log(`✓ app/apple-icon.png (180×180, full-bleed ${ACHTERGROND})`)

// Favicon: multi-size ICO met ingebedde PNG's (door alle moderne browsers gelezen)
const FAVICON_MATEN = [16, 32, 48]
const pngs = await Promise.all(
  FAVICON_MATEN.map((px) => sharp(svg).resize(px, px).png().toBuffer())
)
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)            // reserved
header.writeUInt16LE(1, 2)            // type: 1 = icon
header.writeUInt16LE(pngs.length, 4)  // aantal afbeeldingen
let offset = 6 + 16 * pngs.length
const entries = pngs.map((png, i) => {
  const entry = Buffer.alloc(16)
  entry.writeUInt8(FAVICON_MATEN[i] % 256, 0)  // breedte (0 = 256)
  entry.writeUInt8(FAVICON_MATEN[i] % 256, 1)  // hoogte
  entry.writeUInt8(0, 2)                       // kleurenpalet: geen
  entry.writeUInt8(0, 3)                       // reserved
  entry.writeUInt16LE(1, 4)                    // color planes
  entry.writeUInt16LE(32, 6)                   // bits per pixel
  entry.writeUInt32LE(png.length, 8)           // bytegrootte
  entry.writeUInt32LE(offset, 12)              // offset in bestand
  offset += png.length
  return entry
})
const favicon = join(__dirname, '..', 'app', 'favicon.ico')
writeFileSync(favicon, Buffer.concat([header, ...entries, ...pngs]))
console.log(`✓ app/favicon.ico (${FAVICON_MATEN.join('/')}px, PNG-in-ICO)`)

console.log('Klaar!')
