// Client-side afbeeldingshulp voor de profielfoto: valideert, crop't naar
// vierkant en verkleint naar een JPEG data-URL. De canvas-re-encode zorgt er
// ook voor dat alleen pixeldata overblijft (ongeldige/gevaarlijke bestanden
// worden geneutraliseerd of falen netjes bij het decoderen).

const MAX_INPUT_BYTES = 10 * 1024 * 1024  // 10 MB bronbestand
const MAX_RESULTAAT_TEKENS = 100 * 1024   // guard voor user_metadata (data-URL-lengte)

export async function verkleinNaarVierkantDataUrl(file: File, maat = 256): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Kies een afbeeldingsbestand.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('De afbeelding is te groot (max 10 MB).')
  }

  // imageOrientation: 'from-image' past EXIF-rotatie toe (foto's van telefoons).
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Deze afbeelding kon niet worden gelezen. Probeer een JPG of PNG.')
  }

  try {
    // Center-crop naar vierkant en verkleinen naar maat×maat
    const zijde = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - zijde) / 2
    const sy = (bitmap.height - zijde) / 2

    const canvas = document.createElement('canvas')
    canvas.width = maat
    canvas.height = maat
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Deze browser ondersteunt geen afbeeldingsbewerking.')

    ctx.drawImage(bitmap, sx, sy, zijde, zijde, 0, 0, maat, maat)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    if (dataUrl.length > MAX_RESULTAAT_TEKENS) {
      throw new Error('De verkleinde afbeelding is nog te groot.')
    }
    return dataUrl
  } finally {
    bitmap.close()
  }
}
