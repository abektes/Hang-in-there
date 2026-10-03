import { getSurface } from '../data/badgeStyles.js'
import { featuredBadge } from '../data/showcase.js'
import { paintSurface, surfaceClock } from './badgeSurface.js'

const PAPER = '#F6F2EA'
const PAPER_MUTED = 'rgba(246, 242, 234, 0.72)'
const PAPER_FAINT = 'rgba(246, 242, 234, 0.56)'
const SANS = '"Instrument Sans", system-ui, sans-serif'
const SERIF = 'Newsreader, Georgia, serif'

export const TEXTURE_SIZE = 2048
// tag.glb maps the front to u 0–0.5 and the back to u 0.5–1, both over v 0–0.755.
// The printed face is 0.716 × 1 in model units, so artwork is drawn in a design
// space with that true aspect and squeezed into the atlas cell; otherwise every
// square on the badge renders about 8% too wide.
export const DESIGN_W = 553
export const DESIGN_H = 773
const FACE_W = TEXTURE_SIZE / 2
const FACE_H = Math.round(TEXTURE_SIZE * 0.755)
const MARGIN = 40

// Where the hook crosses the card plane, measured from the model.
const SLOT = { y: 51, w: 74, h: 15 }
const BRAND_ROW = { y: 84, h: 52, logoW: 150 }

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be loaded.'))
    image.src = src
  })
}

const preparedLogos = new WeakMap()

// Company logos arrive in any color. Transparent marks print as a white
// silhouette so they read on the dark stock; opaque files (JPG, logos on a
// white box) sit on a white tag instead of being recolored.
function prepareLogo(logo) {
  if (preparedLogos.has(logo)) return preparedLogos.get(logo)
  const width = logo.naturalWidth || logo.width
  const height = logo.naturalHeight || logo.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(logo, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)
  let transparent = 0
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) transparent += 1
    if (data[i + 3] > 24) {
      const pixel = i / 4
      const x = pixel % width
      const y = (pixel - x) / width
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  let mark
  if (transparent / (width * height) > 0.04 && maxX >= minX) {
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, width, height)
    mark = { mode: 'silhouette', image: canvas, sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 }
  } else {
    mark = { mode: 'tag', image: logo, sx: 0, sy: 0, sw: width, sh: height }
  }
  preparedLogos.set(logo, mark)
  return mark
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0)
  ctx.lineTo(x + w, y + h - r)
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2)
  ctx.lineTo(x + r, y + h)
  ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI)
  ctx.lineTo(x, y + r)
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
  ctx.closePath()
}

// Returns the drawn width so the company name can sit beside the mark.
function drawLogo(ctx, logo, x, y, maxW, maxH) {
  if (!logo) return 0
  const mark = prepareLogo(logo)
  if (mark.mode === 'silhouette') {
    const scale = Math.min(maxW / mark.sw, maxH / mark.sh)
    const w = mark.sw * scale
    const h = mark.sh * scale
    ctx.drawImage(mark.image, mark.sx, mark.sy, mark.sw, mark.sh, x, y + (maxH - h) / 2, w, h)
    return w
  }
  const pad = 8
  const scale = Math.min((maxW - pad * 2) / mark.sw, (maxH - pad * 2) / mark.sh)
  const w = mark.sw * scale
  const h = mark.sh * scale
  ctx.save()
  roundedRect(ctx, x, y, w + pad * 2, maxH, 8)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.clip()
  ctx.drawImage(mark.image, x + pad, y + (maxH - h) / 2, w, h)
  ctx.restore()
  return w + pad * 2
}

function drawPortrait(ctx, image, x, y, size, radius) {
  const scale = Math.max(size / image.width, size / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  ctx.save()
  roundedRect(ctx, x, y, size, size, radius)
  ctx.clip()
  ctx.drawImage(image, x + (size - drawWidth) / 2, y + (size - drawHeight) / 2, drawWidth, drawHeight)
  ctx.restore()
  roundedRect(ctx, x + 0.75, y + 0.75, size - 1.5, size - 1.5, radius)
  ctx.strokeStyle = 'rgba(246, 242, 234, 0.22)'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function fitText(ctx, text, x, y, width, size, weight, family = SANS) {
  let fontSize = size
  ctx.font = `${weight} ${fontSize}px ${family}`
  while (ctx.measureText(text).width > width && fontSize > 12) {
    fontSize -= 1
    ctx.font = `${weight} ${fontSize}px ${family}`
  }
  ctx.fillText(text, x, y, width)
}

function wrapTitle(ctx, text, width, size) {
  const words = text.trim().split(/\s+/)
  for (let fontSize = size; fontSize >= 40; fontSize -= 4) {
    ctx.font = `500 ${fontSize}px ${SERIF}`
    if (words.some((word) => ctx.measureText(word).width > width)) continue
    const lines = []
    for (const word of words) {
      const last = lines[lines.length - 1]
      if (last && ctx.measureText(`${last} ${word}`).width <= width) lines[lines.length - 1] = `${last} ${word}`
      else lines.push(word)
    }
    if (lines.length <= 3) return { lines, fontSize }
  }
  return { lines: [text], fontSize: 40 }
}

function drawSlot(ctx) {
  const x = (DESIGN_W - SLOT.w) / 2
  roundedRect(ctx, x, SLOT.y, SLOT.w, SLOT.h, SLOT.h / 2)
  const depth = ctx.createLinearGradient(0, SLOT.y, 0, SLOT.y + SLOT.h)
  depth.addColorStop(0, '#000000')
  depth.addColorStop(1, '#1d1b22')
  ctx.fillStyle = depth
  ctx.fill()
  ctx.strokeStyle = 'rgba(246, 242, 234, 0.2)'
  ctx.lineWidth = 1.2
  ctx.stroke()
}

// Company mark and name share one row; either may be missing, and an empty
// row simply leaves the stock clean.
function drawBrandRow(ctx, logo, companyName) {
  const name = companyName?.trim()
  const logoW = drawLogo(ctx, logo, MARGIN, BRAND_ROW.y, BRAND_ROW.logoW, BRAND_ROW.h)
  if (!name) return
  ctx.fillStyle = PAPER_MUTED
  const baseline = BRAND_ROW.y + BRAND_ROW.h / 2 + 7
  if (logoW) {
    ctx.textAlign = 'right'
    fitText(ctx, name, DESIGN_W - MARGIN, baseline, DESIGN_W - MARGIN * 2 - logoW - 20, 19, 600)
  } else {
    ctx.textAlign = 'left'
    fitText(ctx, name, MARGIN, baseline, DESIGN_W - MARGIN * 2, 21, 600)
  }
}

function drawBadgeNumber(ctx, badge, labelY, numberY) {
  const number = String(badge.badgeId ?? '').trim()
  if (!number) return
  ctx.textAlign = 'right'
  ctx.fillStyle = PAPER_FAINT
  ctx.font = `500 13px ${SANS}`
  ctx.fillText('No.', DESIGN_W - MARGIN, labelY)
  ctx.fillStyle = PAPER
  fitText(ctx, number, DESIGN_W - MARGIN, numberY, 120, 28, 700)
}

function drawFront(ctx, photo, logo, badge) {
  drawSlot(ctx)
  drawBrandRow(ctx, logo, badge.companyName)

  const photoSize = 268
  drawPortrait(ctx, photo, (DESIGN_W - photoSize) / 2, 176, photoSize, 22)

  ctx.textAlign = 'center'
  ctx.fillStyle = PAPER
  fitText(ctx, badge.name.trim() || 'Your name', DESIGN_W / 2, 522, DESIGN_W - MARGIN * 2, 42, 700)
  ctx.fillStyle = PAPER_MUTED
  fitText(ctx, badge.role.trim() || 'Your role', DESIGN_W / 2, 560, DESIGN_W - MARGIN * 2, 22, 500)

  ctx.fillStyle = 'rgba(246, 242, 234, 0.14)'
  ctx.fillRect(MARGIN, 652, DESIGN_W - MARGIN * 2, 1)
  ctx.textAlign = 'left'
  ctx.fillStyle = PAPER
  fitText(ctx, eventTitle(badge), MARGIN, 708, 330, 30, 500, SERIF)
  ctx.fillStyle = getSurface(badge.surface).accent
  const tagline = eventTagline(badge)
  if (tagline) fitText(ctx, tagline, MARGIN, 738, 330, 17, 600)
  drawBadgeNumber(ctx, badge, 706, 738)
}

function eventTitle(badge) {
  return badge.title?.trim() || featuredBadge.title
}

// Unlike the event name, a cleared tagline stays empty so the line can be dropped.
function eventTagline(badge) {
  return (badge.weekLabel ?? featuredBadge.weekLabel).trim()
}

function drawBack(ctx, logo, badge) {
  drawSlot(ctx)
  drawBrandRow(ctx, logo, badge.companyName)

  const { lines, fontSize } = wrapTitle(ctx, eventTitle(badge), DESIGN_W - MARGIN * 2, 96)
  ctx.textAlign = 'left'
  ctx.fillStyle = PAPER
  ctx.font = `500 ${fontSize}px ${SERIF}`
  const lineHeight = fontSize * 0.98
  const firstBaseline = 300
  lines.forEach((line, index) => ctx.fillText(line, MARGIN, firstBaseline + index * lineHeight))
  const afterTitle = firstBaseline + (lines.length - 1) * lineHeight

  ctx.fillStyle = getSurface(badge.surface).accent
  ctx.fillRect(MARGIN, afterTitle + 34, 56, 4)
  const tagline = eventTagline(badge)
  if (tagline) fitText(ctx, tagline, MARGIN, afterTitle + 80, DESIGN_W - MARGIN * 2, 24, 600)

  ctx.fillStyle = 'rgba(246, 242, 234, 0.14)'
  ctx.fillRect(MARGIN, 652, DESIGN_W - MARGIN * 2, 1)
  ctx.fillStyle = PAPER
  fitText(ctx, badge.name.trim() || 'Your name', MARGIN, 706, 320, 24, 700)
  ctx.fillStyle = PAPER_MUTED
  fitText(ctx, badge.role.trim() || 'Your role', MARGIN, 736, 320, 17, 500)
  drawBadgeNumber(ctx, badge, 706, 738)
}

function paintFace(ctx, side, draw) {
  ctx.save()
  ctx.setTransform(FACE_W / DESIGN_W, 0, 0, FACE_H / DESIGN_H, side === 'back' ? FACE_W : 0, 0)
  ctx.beginPath()
  ctx.rect(0, 0, DESIGN_W, DESIGN_H)
  ctx.clip()
  draw()
  ctx.restore()
}

// A transparent print layer: the card material composites it over the live
// surface shader, so only the slot, logo, portrait, and type live here.
export function createBadgeCanvas(photo, logo, badge) {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext('2d')
  paintFace(ctx, 'front', () => drawFront(ctx, photo, logo, badge))
  paintFace(ctx, 'back', () => drawBack(ctx, logo, badge))
  return canvas
}

export const EXPORT_SIZE = { width: Math.round(FACE_H * (DESIGN_W / DESIGN_H)), height: FACE_H }

export function badgeFileName(name) {
  return `${name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'my'}-badge.png`
}

export async function downloadBadge(texture, name, { surface, time = surfaceClock.time } = {}) {
  if (!texture?.image) throw new Error('Badge is not ready.')
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_SIZE.width
  canvas.height = EXPORT_SIZE.height
  const ctx = canvas.getContext('2d')
  paintSurface(ctx, 'front', canvas.width, canvas.height, { surface, time })
  ctx.drawImage(texture.image, 0, 0, FACE_W, FACE_H, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Badge export failed.')
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = badgeFileName(name)
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Give the browser time to start reading the download before releasing its URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
