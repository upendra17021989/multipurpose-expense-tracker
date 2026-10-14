export function tokenPages(start, kidsEnd, end) {
  if (![start, kidsEnd, end].every(Number.isSafeInteger) || start < 1 || end < start || end > 10000 || kidsEnd < start - 1 || kidsEnd > end || end - start >= 1000) {
    throw new Error('Use whole numbers: start at 1 or higher, kids end between start - 1 and last number, and at most 1,000 tokens (last number up to 10,000).')
  }
  const tokens = Array.from({ length: end - start + 1 }, (_, i) => ({ number: start + i, kids: start + i <= kidsEnd }))
  return Array.from({ length: Math.ceil(tokens.length / 16) }, (_, i) => tokens.slice(i * 16, i * 16 + 16))
}

// The preview and PDF use the same artwork, including browser fonts for society names.
export function drawToken(canvas, token, society, event, label) {
  return drawCelebrationToken(canvas, token, society, event, label)
}

function drawCelebrationToken(canvas, token, society, event, label) {
  // Around 270 dpi at the printed token size, without oversized PDF images.
  canvas.width = 480; canvas.height = 520
  const c = canvas.getContext('2d')
  const ink = token.kids ? '#6100c5' : '#102f62'
  const gradient = (x1, y1, x2, y2, stops) => {
    const g = c.createLinearGradient(x1, y1, x2, y2)
    stops.forEach(([offset, color]) => g.addColorStop(offset, color))
    return g
  }
  const gold = gradient(20, 20, 460, 470, [[0, '#713900'], [.15, '#ffb800'], [.3, '#fff693'], [.45, '#e89000'], [.6, '#ffe967'], [.8, '#f6a000'], [1, '#8e4800']])
  const circle = (x, y, r, fill, stroke, width = 2) => {
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = fill; c.fill()
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke() }
  }
  const text = (value, y, size, fill, maxWidth, outline) => {
    c.font = `900 ${size}px Arial, sans-serif`
    while (c.measureText(value).width > maxWidth && size > 10) c.font = `900 ${--size}px Arial, sans-serif`
    c.textAlign = 'center'; c.lineJoin = 'round'
    if (outline) { c.strokeStyle = outline; c.lineWidth = 5; c.strokeText(value, 240, y) }
    c.fillStyle = fill; c.fillText(value, 240, y)
  }
  const star = (x, y, r, color = gold) => {
    c.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5; const radius = i % 2 ? r * .45 : r
      const px = x + Math.cos(a) * radius; const py = y + Math.sin(a) * radius
      if (!i) c.moveTo(px, py); else c.lineTo(px, py)
    }
    c.closePath(); c.fillStyle = color; c.fill(); c.strokeStyle = '#ef9800'; c.lineWidth = 1.2; c.stroke()
  }
  circle(240, 253, 233, gold, '#874707', 2)
  circle(240, 253, 228, 'transparent', '#fff18c', 2)
  const cream = c.createRadialGradient(240, 235, 20, 240, 253, 216)
  cream.addColorStop(0, '#fffdf2'); cream.addColorStop(.7, '#fff4ce'); cream.addColorStop(1, '#ffdf82')
  circle(240, 253, 215, cream, '#e08b00', 2)
  c.save(); c.beginPath(); c.arc(240, 253, 213, 0, Math.PI * 2); c.clip()
  for (let i = 0; i < 30; i++) {
    const a = i * Math.PI / 15
    c.beginPath(); c.moveTo(240, 285); c.arc(240, 285, 400, a, a + .065); c.closePath(); c.fillStyle = '#ffffff35'; c.fill()
  }
  c.restore()
  for (let i = 0; i < 36; i++) {
    const a = i * Math.PI / 18
    c.save(); c.shadowColor = '#ffff85'; c.shadowBlur = 10
    circle(240 + Math.cos(a) * 222, 253 + Math.sin(a) * 222, 3.5, '#fffeb6')
    c.restore()
  }
  star(240, 85, 29)
  // Faceted highlights give the central star a polished gold finish.
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5
    c.beginPath(); c.moveTo(240, 85); c.lineTo(240 + Math.cos(a) * 28, 85 + Math.sin(a) * 28); c.lineTo(240 + Math.cos(a + Math.PI / 5) * 13, 85 + Math.sin(a + Math.PI / 5) * 13); c.closePath(); c.fillStyle = i % 2 ? '#ffea43' : '#dc7a00'; c.fill()
  }
  for (const [x, y, color, angle] of [[97, 102, '#ff0094', .4], [384, 102, '#00b8ef', -.4]]) {
    c.save(); c.strokeStyle = '#421278'; c.lineWidth = 2
    c.beginPath(); c.moveTo(x, y + 23); c.bezierCurveTo(x - 20, y + 44, x + 20, y + 46, x, y + 62); c.bezierCurveTo(x - 9, y + 72, x - 2, y + 80, x - 4, y + 83); c.stroke()
    c.translate(x, y); c.rotate(angle)
    const balloon = c.createRadialGradient(-9, -15, 1, 0, 0, 30)
    balloon.addColorStop(0, '#ffffff'); balloon.addColorStop(.22, color); balloon.addColorStop(1, color === '#ff0094' ? '#ce0075' : '#0085ca')
    c.beginPath(); c.ellipse(0, 0, 22, 27, 0, 0, Math.PI * 2); c.fillStyle = balloon; c.fill()
    c.beginPath(); c.ellipse(-6, -15, 11, 5, -.25, 0, Math.PI * 2); c.fillStyle = '#ffffff75'; c.fill()
    c.beginPath(); c.moveTo(0, 26); c.lineTo(-4, 31); c.lineTo(4, 31); c.closePath(); c.fillStyle = color; c.fill(); c.restore()
  }
  const confetti = [[59, 193], [408, 211], [55, 276], [400, 301], [82, 332], [379, 362], [161, 86], [329, 73]]
  confetti.forEach(([x, y], i) => {
    c.save(); c.translate(x, y); c.rotate(i * .7)
    c.beginPath(); c.moveTo(-5, -8); c.quadraticCurveTo(12, -1, 3, 12); c.lineTo(-2, 8); c.quadraticCurveTo(5, 0, -10, -2); c.closePath(); c.fillStyle = i % 2 ? '#00aff4' : '#fa078e'; c.fill(); c.restore()
  })
  for (const [x, y, color] of [[129, 200, '#ffb300'], [420, 263, '#f309ab'], [102, 290, '#ff179e'], [353, 185, '#00aff4'], [110, 350, '#00aff4'], [160, 55, '#ffb300']]) circle(x, y, 4, color)
  star(91, 238, 11, '#7918e8'); star(381, 241, 11); star(74, 346, 12)
  text(society.trim(), 151, 39, ink, 358, '#ffffff')
  text(event, 180, 23, ink, 340)
  circle(240, 294, 110, gold, '#ffd632', 2)
  circle(240, 294, 102, ink, '#7b2b07', 2)
  const numberFill = c.createRadialGradient(211, 235, 1, 240, 294, 106)
  numberFill.addColorStop(0, token.kids ? '#b12fff' : '#397bc4')
  numberFill.addColorStop(.5, token.kids ? '#8413ed' : '#174c8d')
  numberFill.addColorStop(1, token.kids ? '#4900b8' : '#071d49')
  circle(240, 294, 100, numberFill)
  c.save(); c.beginPath(); c.arc(240, 294, 100, 0, Math.PI * 2); c.clip()
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12
    c.beginPath(); c.moveTo(240, 294); c.arc(240, 294, 105, a, a + .05); c.closePath(); c.fillStyle = token.kids ? '#e778ff15' : '#8eeaff20'; c.fill()
  }
  c.restore()
  c.save(); c.shadowColor = token.kids ? '#310058' : '#04122c'; c.shadowBlur = 5; c.shadowOffsetY = 3
  text(String(token.number), 359, 183, '#ffffff', 184, token.kids ? '#450080' : '#061b40')
  c.restore()
  const ribbon = gradient(0, 365, 0, 442, token.kids
    ? [[0, '#ff64b9'], [.15, '#f90685'], [.65, '#e60069'], [1, '#a40049']]
    : [[0, '#63e6dc'], [.15, '#00ab9f'], [.65, '#007c78'], [1, '#004c50']])
  for (const side of [-1, 1]) {
    c.save(); c.translate(240, 0); c.scale(side, 1)
    c.beginPath(); c.moveTo(146, 391); c.quadraticCurveTo(191, 391, 224, 402); c.lineTo(193, 429); c.lineTo(219, 466); c.quadraticCurveTo(181, 449, 150, 450); c.closePath(); c.fillStyle = ribbon; c.fill(); c.strokeStyle = '#e99e13'; c.lineWidth = 3; c.stroke(); c.restore()
  }
  c.beginPath(); c.moveTo(68, 373); c.bezierCurveTo(103, 358, 165, 387, 240, 380); c.bezierCurveTo(315, 387, 377, 358, 412, 373); c.lineTo(394, 440); c.bezierCurveTo(359, 423, 310, 451, 240, 443); c.bezierCurveTo(170, 451, 121, 423, 86, 440); c.closePath(); c.fillStyle = ribbon; c.fill(); c.strokeStyle = gold; c.lineWidth = 5; c.stroke()
  c.save(); c.shadowColor = token.kids ? '#9f004e' : '#003e42'; c.shadowBlur = 2; c.shadowOffsetY = 2
  text(label.toUpperCase(), 428, 53, '#ffffff', 310)
  c.restore()
  text(token.kids ? 'KIDS' : 'ADULTS', 468, 25, ink, 270)
  return canvas
}

export async function generateTokenPdf(pages, settings) {
  const { default: PDFDocument } = await import('pdfkit/js/pdfkit.standalone.js')
  const doc = new PDFDocument({ autoFirstPage: false, compress: true, info: { Title: `${settings.society} - Festival tokens` } })
  const chunks = []
  const result = new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(new Blob(chunks, { type: 'application/pdf' })))
    doc.on('error', reject)
  })
  try {
    const canvas = document.createElement('canvas')
    for (let p = 0; p < pages.length; p++) {
      doc.addPage({ size: 'A4', margin: 0 })
      const width = doc.page.width; const height = doc.page.height
      const cellWidth = (width - 40) / 4; const cellHeight = (height - 58) / 4
      pages[p].forEach((token, i) => {
        const x = 20 + (i % 4) * cellWidth; const y = 20 + Math.floor(i / 4) * cellHeight
        doc.save().lineWidth(.3).strokeColor('#d1d5db').dash(2, { space: 3 }).rect(x, y, cellWidth, cellHeight).stroke().restore()
        const imageWidth = cellWidth - 8; const imageHeight = imageWidth * 520 / 480
        drawToken(canvas, token, settings.society, settings.event, settings.label)
        doc.image(canvas.toDataURL('image/png'), x + 4, y + (cellHeight - imageHeight) / 2, { width: imageWidth, height: imageHeight })
      })
      doc.fontSize(8).fillColor('#64748b').text(`Page ${p + 1} of ${pages.length} | Tokens ${pages[p][0].number}-${pages[p].at(-1).number} | A4 - 16 tokens per page`, 20, height - 25, { width: width - 40, align: 'center', lineBreak: false })
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    doc.end()
  } catch (error) { doc.end(); throw error }
  return result
}
