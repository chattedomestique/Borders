// Import intake: validate the decode, bake in EXIF orientation, and hand the
// renderer as many pixels as it can safely hold.
//
// The old ceiling was 2048px plus a JPEG re-encode on *every* import, and that
// cost real detail. The renderer draws the media at 1800px on its long side,
// and a crop only uses part of the source — so a 9:16 crop out of a 4:3 photo
// was taking an 864px-wide strip and scaling it back UP to 1013px. Measured
// against the same crop taken from the original pixels, that threw away more
// than half the detail before the first edit.
//
// So: only touch the file when it is genuinely too big to hold. 4096 is the
// canvas edge iOS Safari has always honoured (16.7 Mpx area), and it clears
// every phone photo up to ~12 MP untouched — no resample, no re-encode, the
// original bytes go straight to the <img>. Peak memory is unchanged by the
// ceiling either way, because the full decode has to happen regardless in
// order to validate the file; what grows is the retained copy, which is the
// price of not degrading the source.

const MAX_EDGE = 4096

// Types an <img> is guaranteed to render once createImageBitmap has decoded
// them. HEIC/HEIF/TIFF are deliberately absent: only some browsers decode
// those, so they keep going through the conversion below rather than gambling
// on the <img> path.
const PASSTHROUGH = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])

export async function downscaleImageFile(file) {
  // createImageBitmap decodes off the main thread and, told to, applies the
  // EXIF orientation that a raw bitmap would otherwise ignore.
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height))
    // Within bounds and in a format the <img> takes as-is: ship the original
    // bytes untouched. This is the path almost every photo takes.
    if (scale === 1 && PASSTHROUGH.has(file.type)) return file

    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = document.createElement('canvas')   // not OffscreenCanvas — universal on iOS
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'                 // §5.5: default is visibly softer
    ctx.drawImage(bmp, 0, 0, w, h)
    // A PNG source is usually a graphic or a screenshot — flat colour and
    // possibly alpha, both of which JPEG wrecks — so keep it lossless. Photos
    // re-encode at 0.97, high enough that the resample dominates the error.
    const png = file.type === 'image/png'
    return await new Promise((res, rej) => canvas.toBlob(
      b => b ? res(b) : rej(new Error('encode failed')),
      png ? 'image/png' : 'image/jpeg',
      png ? undefined : 0.97,
    ))
  } finally {
    bmp.close()   // release the full-res bitmap immediately
  }
}
