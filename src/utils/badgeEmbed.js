import { LANYARDS, SURFACES } from '../data/badgeStyles.js'
import { featuredBadge } from '../data/showcase.js'
import { badgeFileName, EXPORT_SIZE } from './badgeTexture.js'

// Hash keys for the embed link. Only fields that differ from the featured badge
// are written, so an untouched badge embeds with a short URL.
const TEXT_FIELDS = [
  { key: 'event', field: 'title', max: 40 },
  { key: 'tagline', field: 'weekLabel', max: 32 },
  { key: 'number', field: 'badgeId', max: 4 },
  { key: 'name', field: 'name', max: 50 },
  { key: 'role', field: 'role', max: 70 },
  { key: 'company', field: 'companyName', max: 40 },
]
const IMAGE_FIELDS = [
  { key: 'photo', field: 'slackImage' },
  { key: 'logo', field: 'companyLogo' },
]
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/

export const EMBED_FRAME = { width: 380, height: 560 }
const IMAGE_DISPLAY_WIDTH = 280

export function isEmbedRequest(search) {
  return new URLSearchParams(search).has('embed')
}

export function encodeBadge(badge) {
  const pairs = []
  for (const { key, field } of [...TEXT_FIELDS, ...IMAGE_FIELDS]) {
    const value = badge[field] ?? ''
    if (value !== featuredBadge[field]) pairs.push([key, value])
  }
  if (badge.surface !== featuredBadge.surface) pairs.push(['surface', badge.surface])
  if (badge.lanyard !== featuredBadge.lanyard) pairs.push(['lanyard', badge.lanyard])
  return pairs.map(([key, value]) => `${key}=${encodeHashValue(value)}`).join('&')
}

// Base64 punctuation is legal in a fragment, and decoding uses
// decodeURIComponent (which keeps "+"), so leave it raw to keep links short.
function encodeHashValue(value) {
  return encodeURIComponent(value).replace(/%(2B|2F|3D|3A|3B|2C)/g, (match) => decodeURIComponent(match))
}

// The hash comes from whoever wrote the embed link, so every value is checked:
// text is clipped to the editor limits and images must be inline data URLs
// (a remote URL would taint the WebGL texture or leak the viewer's request).
export function decodeBadge(hash) {
  const values = new Map()
  for (const part of hash.replace(/^#/, '').split('&')) {
    const split = part.indexOf('=')
    if (split < 1) continue
    try {
      values.set(part.slice(0, split), decodeURIComponent(part.slice(split + 1)))
    } catch {
      // Ignore a malformed pair instead of dropping the whole badge.
    }
  }

  const badge = { ...featuredBadge }
  for (const { key, field, max } of TEXT_FIELDS) {
    if (values.has(key)) badge[field] = values.get(key).slice(0, max)
  }
  for (const { key, field } of IMAGE_FIELDS) {
    const value = values.get(key)
    if (value === '' && field === 'companyLogo') badge[field] = ''
    else if (value && IMAGE_DATA_URL.test(value)) badge[field] = value
  }
  const surface = values.get('surface')
  if (SURFACES.some(({ id }) => id === surface)) badge.surface = surface
  const lanyard = values.get('lanyard')
  if (LANYARDS.some(({ id }) => id === lanyard)) badge.lanyard = lanyard
  return badge
}

export function embedUrl(base, badge) {
  const hash = encodeBadge(badge)
  return `${base}?embed${hash ? `#${hash}` : ''}`
}

export function isLocalOrigin(hostname) {
  return /^(localhost|127(\.\d+){3}|\[::1\]|0\.0\.0\.0)$/.test(hostname) || hostname.endsWith('.local')
}

function escapeAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

export function describeBadge(badge) {
  const event = badge.title?.trim() || featuredBadge.title
  const name = badge.name.trim() || 'a speaker'
  const role = badge.role.trim()
  return `${event} badge for ${name}${role ? `, ${role}` : ''}`
}

export function liveSnippet(url, badge) {
  return [
    '<iframe',
    `  src="${escapeAttribute(url)}"`,
    `  title="${escapeAttribute(describeBadge(badge))}"`,
    `  width="${EMBED_FRAME.width}"`,
    `  height="${EMBED_FRAME.height}"`,
    '  loading="lazy"',
    // Matching color schemes keeps the iframe see-through, so the badge hangs
    // over the host page instead of on a white box.
    '  style="border: 0; color-scheme: normal"',
    '></iframe>',
  ].join('\n')
}

export function imageSnippet(badge) {
  const height = Math.round(IMAGE_DISPLAY_WIDTH * (EXPORT_SIZE.height / EXPORT_SIZE.width))
  return [
    '<img',
    `  src="${escapeAttribute(badgeFileName(badge.name))}"`,
    `  alt="${escapeAttribute(describeBadge(badge))}"`,
    `  width="${IMAGE_DISPLAY_WIDTH}"`,
    `  height="${height}"`,
    '>',
  ].join('\n')
}

const shrunk = new Map()

function loadDataImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be loaded.'))
    image.src = src
  })
}

// Uploads are full-size data URLs; the embed link carries a copy sized to what
// the badge actually prints. Portraits are cropped square like the print frame.
export async function shrinkForEmbed(src, kind) {
  if (!src?.startsWith('data:')) return src
  const cacheKey = `${kind}:${src}`
  if (shrunk.has(cacheKey)) return shrunk.get(cacheKey)

  const image = await loadDataImage(src)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  let result
  if (kind === 'photo') {
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    const size = Math.min(side, 420)
    canvas.width = size
    canvas.height = size
    ctx.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, size, size)
    result = canvas.toDataURL('image/jpeg', 0.82)
  } else {
    const scale = Math.min(1, 320 / Math.max(image.naturalWidth, image.naturalHeight))
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    result = canvas.toDataURL(src.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png', 0.9)
  }
  if (result.length >= src.length) result = src

  if (shrunk.size > 8) shrunk.clear()
  shrunk.set(cacheKey, result)
  return result
}
