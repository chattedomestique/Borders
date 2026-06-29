// Text-layer rendering + justify layout. Pure canvas work — no React.

export function drawTextLayer(ctx, totalW, totalH, layer, bboxMap) {
  const {
    id, content, font = 'system-ui, sans-serif', size = 80,
    color = '#ffffff', align = 'center', x = 0.5, y = 0.88,
    bold = false, italic = false, opacity = 100,
    shadow = false, stroke = false, strokeColor = '#000000',
    letterSpacing = 0, bg = 'none', bgColor = '#000000', bgOpacity = 50,
  } = layer

  if (!content?.trim()) {
    bboxMap?.delete(id)
    return
  }

  const lines = content.split('\n')
  const lineHeight = size * 1.3
  const blockH = lines.length * lineHeight
  const px = x * totalW
  const startY = y * totalH - blockH / 2 + lineHeight / 2

  ctx.save()
  ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px ${font}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = opacity / 100

  const justify = align === 'justify'
  // Width every justified line stretches to fill (the widest natural line).
  const maxLineW = Math.max(...lines.map(l => ctx.measureText(l).width))
  // Justified text reads as a centered block; L/C/R keep their own anchoring.
  const effAlign = justify ? 'center' : align
  const boxLeft = effAlign === 'center' ? px - maxLineW / 2
                : effAlign === 'right'  ? px - maxLineW
                : px

  // For justify we place every glyph by hand with letterSpacing off, then split
  // the leftover space evenly across the gaps so each line fills maxLineW — an
  // even rectangular paragraph with equal spacing between every character.
  ctx.textAlign = justify ? 'left' : align
  if (justify && 'letterSpacing' in ctx) ctx.letterSpacing = '0px'

  const layoutJustified = (line) => {
    const chars = Array.from(line)
    const widths = chars.map(c => ctx.measureText(c).width)
    const natural = widths.reduce((a, b) => a + b, 0)
    const gaps = chars.length - 1
    const extra = gaps > 0 ? (maxLineW - natural) / gaps : 0
    const xs = []
    let cx = 0
    for (let k = 0; k < chars.length; k++) { xs.push(cx); cx += widths[k] + extra }
    return { chars, xs }
  }
  const drawJustified = (drawFn, line, yPos) => {
    const { chars, xs } = layoutJustified(line)
    for (let k = 0; k < chars.length; k++) drawFn(chars[k], boxLeft + xs[k], yPos)
  }

  // Store bbox for hit-testing
  if (bboxMap) {
    const pad = 24
    bboxMap.set(id, {
      x: boxLeft - pad, y: startY - lineHeight / 2 - pad,
      w: maxLineW + pad * 2, h: blockH + pad * 2,
    })
  }

  // Per-line background
  if (bg !== 'none') {
    const pad = size * 0.28
    ctx.save()
    ctx.globalAlpha = (bgOpacity / 100) * (opacity / 100)
    ctx.fillStyle = bgColor
    lines.forEach((line, i) => {
      const lw = justify ? maxLineW : ctx.measureText(line).width
      const lx = justify             ? boxLeft - pad
               : align === 'center'  ? px - lw / 2 - pad
               : align === 'right'   ? px - lw - pad
               : px - pad
      const ly = startY + i * lineHeight - lineHeight / 2
      const rw = lw + pad * 2
      const rh = lineHeight
      if (bg === 'pill') {
        ctx.beginPath()
        ctx.roundRect(lx, ly, rw, rh, rh / 2)
        ctx.fill()
      } else {
        ctx.fillRect(lx, ly, rw, rh)
      }
    })
    ctx.restore()
  }

  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = size * 0.45
    ctx.shadowOffsetX = size * 0.05
    ctx.shadowOffsetY = size * 0.07
  }

  if (stroke) {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = Math.max(2, size * 0.07)
    ctx.lineJoin = 'round'
    if (justify) {
      lines.forEach((line, i) => drawJustified((c, cx, cy) => ctx.strokeText(c, cx, cy), line, startY + i * lineHeight))
    } else {
      lines.forEach((line, i) => ctx.strokeText(line, px, startY + i * lineHeight))
    }
  }

  ctx.fillStyle = color
  if (justify) {
    lines.forEach((line, i) => drawJustified((c, cx, cy) => ctx.fillText(c, cx, cy), line, startY + i * lineHeight))
  } else {
    lines.forEach((line, i) => ctx.fillText(line, px, startY + i * lineHeight))
  }
  ctx.restore()
}
