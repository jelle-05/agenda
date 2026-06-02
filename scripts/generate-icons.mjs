/**
 * Genereert icon-192.png, icon-512.png en icon-maskable.png vanuit icon.svg.
 * Vereist: npm install --save-dev sharp
 */
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = join(__dirname, '..', 'public', 'icon.svg')
const svg = readFileSync(svgPath)

const sizes = [
  { naam: 'icon-192.png',      px: 192 },
  { naam: 'icon-512.png',      px: 512 },
  { naam: 'icon-maskable.png', px: 512 },
]

for (const { naam, px } of sizes) {
  const uitvoer = join(__dirname, '..', 'public', naam)
  await sharp(svg).resize(px, px).png().toFile(uitvoer)
  console.log(`✓ ${naam} (${px}×${px})`)
}

console.log('Klaar!')
