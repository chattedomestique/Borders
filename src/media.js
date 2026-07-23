// N5 + §4.3: downscale photos on import to a sane working size, baking EXIF
// orientation in as we go. A 48 MP phone photo decodes to ~190 MB; the app never
// renders above ~1800 px, so anything past ~2048 is pure iOS-tab-eviction risk
// with no visible benefit. Throws on decode failure so intake can surface it.

const MAX_EDGE = 2048

export async function downscaleImageFile(file) {
  // createImageBitmap decodes off the main thread and, told to, applies the
  // EXIF orientation that a raw bitmap would otherwise ignore.
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height))
    // Already small and already a plain JPEG: keep the original bytes (an <img>
    // auto-orients it on the target), skip a needless re-encode.
    if (scale === 1 && file.type === 'image/jpeg') return file

    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = document.createElement('canvas')   // not OffscreenCanvas — universal on iOS
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingQuality = 'high'                 // §5.5: default is visibly softer
    ctx.drawImage(bmp, 0, 0, w, h)
    return await new Promise((res, rej) =>
      canvas.toBlob(b => b ? res(b) : rej(new Error('encode failed')), 'image/jpeg', 0.94))
  } finally {
    bmp.close()   // release the full-res bitmap immediately
  }
}
