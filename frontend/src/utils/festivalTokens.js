export const TOKEN_LAYOUTS = {
  4: { columns: 2, rows: 2 },
  8: { columns: 2, rows: 4 },
  12: { columns: 3, rows: 4 },
  16: { columns: 4, rows: 4 },
  20: { columns: 4, rows: 5 }
}

export function tokenPages(start, kidsEnd, end, perPage = 16) {
  if (!TOKEN_LAYOUTS[perPage]) throw new Error('Select a supported number of tokens per page.')
  if (![start, kidsEnd, end].every(Number.isSafeInteger) || start < 1 || end < start || end > 10000 || kidsEnd < start - 1 || kidsEnd > end || end - start >= 1000) {
    throw new Error('Use whole numbers: start at 1 or higher, kids end between start - 1 and last number, and at most 1,000 tokens (last number up to 10,000).')
  }
  const tokens = Array.from({ length: end - start + 1 }, (_, i) => ({ number: start + i, kids: start + i <= kidsEnd }))
  return Array.from({ length: Math.ceil(tokens.length / perPage) }, (_, i) => tokens.slice(i * perPage, (i + 1) * perPage))
}

const artworkPromises = new Map()
function loadArtwork(asset = 'festival-dancers-transparent.png') {
  if (!artworkPromises.has(asset)) artworkPromises.set(asset, new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => { artworkPromises.delete(asset); reject(new Error('Unable to load token artwork.')) }
    image.src = `${import.meta.env.BASE_URL}${asset}`
  }))
  return artworkPromises.get(asset)
}

// Preview and PDF share the same transparent dancer asset and drawing code.
export async function drawToken(canvas, token, society, event, label, showCategories = false, darkBackground = false, darkDesign = 'midnight', showDancers = true, design = 'ornate') {
  if (design === 'ornate') {
    const template = await loadArtwork('festival-ornate-template-transparent.png')
    if (!canvas) return canvas
    return drawOrnateToken(canvas, template, token, society, event, label, showCategories)
  }
  const artwork = showDancers ? await loadArtwork() : null
  if (!canvas) return canvas
  return drawCelebrationToken(canvas, token, society, event, label, showCategories, artwork, darkBackground, darkDesign)
}

function drawOrnateToken(canvas, template, token, society, event, label, showCategories) {
  canvas.width = 720; canvas.height = 720
  const c = canvas.getContext('2d')
  c.scale(.72, .72)
  // Keep the interior fully opaque without filling the transparent exterior.
  c.beginPath(); c.arc(500, 490, 450, 0, Math.PI * 2)
  c.fillStyle = '#000000'; c.fill()
  c.drawImage(template, 0, 0, 1000, 1000)
  const text = (value, y, size, maxWidth, fill, outline, serif = true) => {
    const family = serif ? 'Georgia, serif' : 'Arial, sans-serif'
    c.font = `900 ${size}px ${family}`
    while (c.measureText(value).width > maxWidth && size > 12) c.font = `900 ${--size}px ${family}`
    const metrics = c.measureText(value)
    const baseline = y + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2
    c.textAlign = 'center'; c.lineJoin = 'round'
    if (outline) { c.strokeStyle = outline; c.lineWidth = 7; c.strokeText(value, 500, baseline) }
    c.fillStyle = fill; c.fillText(value, 500, baseline)
  }
  c.save(); c.shadowColor = '#380315'; c.shadowBlur = 3; c.shadowOffsetY = 3
  text(society.trim(), event.trim() ? 221 : 250, 84, 590, '#fffef2', '#30091b')
  c.restore()
  if (event.trim()) {
    c.beginPath(); c.roundRect(230, 255, 540, 50, 25)
    c.fillStyle = '#200612'; c.fill()
    c.strokeStyle = '#e5b64e'; c.lineWidth = 1.5; c.stroke()
    text(event.trim(), 280, 42, 495, '#fffef2', undefined, false)
  }
  // Darken the busy mandala locally, fading out before the decorative rim.
  const numberBacking = c.createRadialGradient(500, 526, 70, 500, 526, 180)
  numberBacking.addColorStop(0, '#001816d9')
  numberBacking.addColorStop(.65, '#001816b3')
  numberBacking.addColorStop(1, '#00181600')
  c.beginPath(); c.arc(500, 526, 180, 0, Math.PI * 2)
  c.fillStyle = numberBacking; c.fill()
  c.save(); c.shadowColor = '#001d1c'; c.shadowBlur = 2; c.shadowOffsetY = 2
  text(String(token.number), 526, 365, 350, '#fffef2', '#001816')
  c.restore()
  text(label.toUpperCase(), 759, 101, 470, '#fffef2', '#30091b')
  if (showCategories) {
    c.beginPath(); c.roundRect(380, 863, 240, 48, 24)
    c.fillStyle = '#fff5d5'; c.fill(); c.strokeStyle = '#dfa424'; c.lineWidth = 3; c.stroke()
    text(token.kids ? 'KIDS' : 'ADULTS', 887, 32, 210, '#004b43', undefined, false)
  }
  return canvas
}

function drawCelebrationToken(canvas, token, society, event, label, showCategories, artwork, darkBackground, darkDesign) {
  // Around 270 dpi at the printed token size, without oversized PDF images.
  canvas.width = 480; canvas.height = 520
  const c = canvas.getContext('2d')
  const ink = '#00665b'
  const midnight = darkBackground && darkDesign === 'midnight'
  const gradient = (x1, y1, x2, y2, stops) => {
    const g = c.createLinearGradient(x1, y1, x2, y2)
    stops.forEach(([offset, color]) => g.addColorStop(offset, color))
    return g
  }
  const gold = gradient(20, 20, 460, 470, midnight
    ? [[0, '#39c6c8'], [.3, '#e5ffff'], [.6, '#7ce8e1'], [1, '#36acbf']]
    : [[0, '#713900'], [.15, '#ffb800'], [.3, '#fff693'], [.45, '#e89000'], [.6, '#ffe967'], [.8, '#f6a000'], [1, '#8e4800']])
  const circle = (x, y, r, fill, stroke, width = 2) => {
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill()
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke() }
  }
  const text = (value, y, size, fill, maxWidth, outline, centerVertically = false) => {
    c.font = `900 ${size}px Arial, sans-serif`
    while (c.measureText(value).width > maxWidth && size > 10) c.font = `900 ${--size}px Arial, sans-serif`
    if (centerVertically) {
      const metrics = c.measureText(value)
      y += (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2
    }
    c.textAlign = 'center'; c.lineJoin = 'round'
    if (outline) { c.strokeStyle = outline; c.lineWidth = 5; c.strokeText(value, 240, y) }
    c.fillStyle = fill; c.fillText(value, 240, y)
  }
  const star = (x, y, radius) => {
    c.beginPath()
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5
      const r = i % 2 ? radius * .45 : radius
      const px = x + Math.cos(angle) * r; const py = y + Math.sin(angle) * r
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py)
    }
    c.closePath(); c.fillStyle = gold; c.fill()
    c.strokeStyle = '#b97500'; c.lineWidth = 1.5; c.stroke()
  }
  circle(240, 253, 233, gold, '#874707', 2)
  circle(240, 253, 228, 'transparent', '#fff18c', 2)
  const cream = c.createRadialGradient(240, 235, 20, 240, 253, 216)
  cream.addColorStop(0, midnight ? '#142544' : darkBackground ? '#293446' : '#fffdf2')
  cream.addColorStop(.7, midnight ? '#0a1730' : darkBackground ? '#182232' : '#fff4ce')
  cream.addColorStop(1, midnight ? '#050d20' : darkBackground ? '#0d1420' : '#ffdf82')
  circle(240, 253, 215, cream, '#e08b00', 2)
  for (let i = 0; i < 40; i++) {
    c.save(); c.translate(240, 253); c.rotate(i * Math.PI / 20)
    c.beginPath(); c.moveTo(-12, -225); c.lineTo(12, -225); c.lineTo(0, -208); c.closePath()
    c.fillStyle = midnight ? (i % 2 ? '#17335c' : '#047c83') : (i % 2 ? '#c00052' : '#00796b'); c.fill(); c.strokeStyle = midnight ? '#a1fff4' : '#ffe795'; c.lineWidth = 1; c.stroke(); c.restore()
  }
  c.save(); c.beginPath(); c.arc(240, 253, 213, 0, Math.PI * 2); c.clip()
  for (let i = 0; i < 30; i++) {
    const a = i * Math.PI / 15
    c.beginPath(); c.moveTo(240, 285); c.arc(240, 285, 400, a, a + .065); c.closePath(); c.fillStyle = darkBackground ? '#ffffff09' : '#ffffff35'; c.fill()
  }
  c.restore()
  for (let i = 0; i < 36; i++) {
    const a = i * Math.PI / 18
    c.save(); c.shadowColor = '#ffff85'; c.shadowBlur = 10
    circle(240 + Math.cos(a) * 222, 253 + Math.sin(a) * 222, 3.5, '#fffeb6')
    c.restore()
  }
  // Keep stars above the title, clear of the dancers and configurable text.
  star(240, 82, 25)
  star(183, 96, 10)
  star(297, 96, 10)
  // Transparent cutouts let the token background show through every gap.
  const dancers = [
    { source: [0, 0, .48, 1], target: [30, 180, 104, 217] },
    { source: [.48, 0, .52, 1], target: [346, 180, 113, 217] }
  ]
  for (const { source: [sx, sy, sw, sh], target: [dx, dy, dw, dh] } of artwork ? dancers : []) {
    c.drawImage(artwork, sx * artwork.naturalWidth, sy * artwork.naturalHeight,
      sw * artwork.naturalWidth, sh * artwork.naturalHeight, dx, dy, dw, dh)
  }
  const confetti = [[161, 86], [329, 73]]
  confetti.forEach(([x, y], i) => {
    c.save(); c.translate(x, y); c.rotate(i * .7)
    c.beginPath(); c.moveTo(-5, -8); c.quadraticCurveTo(12, -1, 3, 12); c.lineTo(-2, 8); c.quadraticCurveTo(5, 0, -10, -2); c.closePath(); c.fillStyle = i % 2 ? '#00aff4' : '#fa078e'; c.fill(); c.restore()
  })
  for (const [x, y, color] of [[129, 200, '#ffb300'], [353, 185, '#00aff4'], [160, 55, '#ffb300']]) circle(x, y, 4, color)
  text(society.trim(), 151, 39, midnight ? '#fffdf0' : darkBackground ? '#fff0b2' : '#8e0030', 358, darkBackground ? '#0d1420' : '#ffffff')
  text(event, 180, 23, darkBackground ? '#fff8e5' : ink, 340)
  if (midnight) {
    // A flat field and a single aqua outline keep attention on the number.
    circle(240, 294, 108, '#081426', '#7ce8e1', 3)
  } else {
    circle(240, 294, 110, gold, '#ffd632', 2)
    circle(240, 294, 102, ink, '#7b2b07', 2)
    const numberFill = c.createRadialGradient(211, 235, 1, 240, 294, 106)
    numberFill.addColorStop(0, '#009b82')
    numberFill.addColorStop(.5, '#006b5e')
    numberFill.addColorStop(1, '#003e39')
    circle(240, 294, 100, numberFill)
  }
  c.save(); c.beginPath(); c.arc(240, 294, 100, 0, Math.PI * 2); c.clip()
  for (let i = 0; !midnight && i < 24; i++) {
    const a = i * Math.PI / 12
    c.beginPath(); c.moveTo(240, 294); c.arc(240, 294, 105, a, a + .05); c.closePath(); c.fillStyle = '#c9dcff20'; c.fill()
  }
  c.restore()
  c.save(); c.shadowColor = '#0b193b'; c.shadowBlur = midnight ? 0 : 5; c.shadowOffsetY = midnight ? 0 : 3
  text(String(token.number), 294, 183, midnight ? '#fffef4' : '#fff6d8', 184, midnight ? undefined : '#d18a00', true)
  c.restore()
  const ribbon = gradient(0, 365, 0, 442, midnight
    ? [[0, '#0d6977'], [.2, '#075363'], [.7, '#06394a'], [1, '#04283b']]
    : [[0, '#ee3980'], [.15, '#c00052'], [.65, '#a00046'], [1, '#68002f']])
  for (const side of [-1, 1]) {
    c.save(); c.translate(240, 0); c.scale(side, 1)
    c.beginPath(); c.moveTo(146, 391); c.quadraticCurveTo(191, 391, 224, 402); c.lineTo(193, 429); c.lineTo(219, 466); c.quadraticCurveTo(181, 449, 150, 450); c.closePath(); c.fillStyle = ribbon; c.fill(); c.strokeStyle = '#e99e13'; c.lineWidth = 3; c.stroke(); c.restore()
  }
  c.beginPath(); c.moveTo(68, 373); c.bezierCurveTo(103, 358, 165, 387, 240, 380); c.bezierCurveTo(315, 387, 377, 358, 412, 373); c.lineTo(394, 440); c.bezierCurveTo(359, 423, 310, 451, 240, 443); c.bezierCurveTo(170, 451, 121, 423, 86, 440); c.closePath(); c.fillStyle = ribbon; c.fill(); c.strokeStyle = gold; c.lineWidth = 5; c.stroke()
  c.save(); c.shadowColor = '#0b193b'; c.shadowBlur = 2; c.shadowOffsetY = 2
  text(label.toUpperCase(), 428, 53, midnight ? '#fffef4' : '#fff0b2', 310)
  c.restore()
  if (showCategories) {
    // A dedicated badge keeps the category off the patterned rim and cut edge.
    c.save()
    c.beginPath(); c.roundRect(150, 449, 180, 38, 19)
    c.fillStyle = '#fff8e5'; c.fill()
    c.strokeStyle = '#a56a00'; c.lineWidth = 2; c.stroke()
    text(token.kids ? 'KIDS' : 'ADULTS', 468, 28, '#004b43', 154, undefined, true)
    c.restore()
  }
  return canvas
}

export async function generateTokenPdf(pages, settings) {
  const perPage = settings.perPage ?? 16
  const layout = TOKEN_LAYOUTS[perPage]
  if (!layout) throw new Error('Select a supported number of tokens per page.')
  const { default: PDFDocument } = await import('pdfkit/js/pdfkit.standalone.js')
  const doc = new PDFDocument({ autoFirstPage: false, compress: true, info: { Title: `${settings.society} - Festival tokens` } })
  const chunks = []
  const result = new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(new Blob(chunks, { type: 'application/pdf' })))
    doc.on('error', reject)
  })
  try {
    if (settings.design === 'ornate' || !settings.design) await loadArtwork('festival-ornate-template-transparent.png')
    else if (settings.showDancers) await loadArtwork()
    const canvas = document.createElement('canvas')
    for (let p = 0; p < pages.length; p++) {
      doc.addPage({ size: 'A4', margin: 0 })
      const width = doc.page.width; const height = doc.page.height
      const cellWidth = (width - 40) / layout.columns; const cellHeight = (height - 58) / layout.rows
      for (const [i, token] of pages[p].entries()) {
        const x = 20 + (i % layout.columns) * cellWidth; const y = 20 + Math.floor(i / layout.columns) * cellHeight
        doc.save().lineWidth(.3).strokeColor('#d1d5db').dash(2, { space: 3 }).rect(x, y, cellWidth, cellHeight).stroke().restore()
        await drawToken(canvas, token, settings.society, settings.event, settings.label, settings.showCategories, settings.darkBackground, settings.darkDesign, settings.showDancers, settings.design)
        const imageWidth = Math.min(cellWidth - 8, (cellHeight - 8) * canvas.width / canvas.height)
        const imageHeight = imageWidth * canvas.height / canvas.width
        doc.image(canvas.toDataURL('image/png'), x + (cellWidth - imageWidth) / 2, y + (cellHeight - imageHeight) / 2, { width: imageWidth, height: imageHeight })
      }
      doc.fontSize(8).fillColor('#64748b').text(`Page ${p + 1} of ${pages.length} | Tokens ${pages[p][0].number}-${pages[p].at(-1).number} | A4 - ${perPage} tokens per page`, 20, height - 25, { width: width - 40, align: 'center', lineBreak: false })
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    doc.end()
  } catch (error) { doc.end(); throw error }
  return result
}
