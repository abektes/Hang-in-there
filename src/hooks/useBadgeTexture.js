import * as THREE from 'three'
import { useEffect, useState } from 'react'

const ELSEVIER_ORANGE = '#FF6C00'
const ELSEVIER_NAVY = '#001E3C'
const ELSEVIER_MUTED = '#5B6B7A'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function coverImage(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

/**
 * tag.glb card UV with flipY=false:
 *   V=0 is the TOP of the image
 *   Front → left half  (U 0–0.5,  V 0–0.755)
 *   Back  → right half (U 0.5–1, V 0–0.755)
 */
function faceRect(side) {
  const W = 1024
  const half = W / 2
  const h = Math.round(W * 0.755)
  return {
    x: side === 'back' ? half : 0,
    y: 0,
    w: half,
    h,
  }
}

function drawFace(ctx, photo, logo, badge, panel) {
  const { name = 'Guest', role = 'Product Design' } = badge
  const { x, y, w, h } = panel

  // Equal inset so logo isn't crushed into the shaded rim
  const padX = 40
  const padY = 40

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x, y, w, h)

  // Logo — top-right, nudged 20px down from the top margin
  let logoBottom = y + padY + 20
  if (logo) {
    const boxW = 200
    const boxH = 108
    const scale = Math.min(boxW / logo.width, boxH / logo.height)
    const dw = logo.width * scale
    const dh = logo.height * scale
    const logoX = x + w - padX - dw + 40
    const logoY = y + padY + 20
    ctx.drawImage(logo, logoX, logoY, dw, dh)
    logoBottom = logoY + dh
  } else {
    ctx.fillStyle = ELSEVIER_ORANGE
    ctx.textAlign = 'right'
    ctx.font = '700 26px Georgia, serif'
    ctx.fillText('ELSEVIER', x + w - padX + 40, y + padY + 52)
    logoBottom = y + padY + 60
  }

  // Photo — square (not circular), 50px lower under the logo band
  const photoSize = 200
  const photoX = x + (w - photoSize) / 2
  const photoY = Math.max(logoBottom + 36, y + Math.round(h * 0.28)) + 50
  coverImage(ctx, photo, photoX, photoY, photoSize, photoSize)

  // Name + role
  const nameY = photoY + photoSize + 52
  ctx.textAlign = 'center'
  ctx.fillStyle = ELSEVIER_NAVY
  ctx.font = '700 44px "Instrument Sans", system-ui, sans-serif'
  ctx.fillText(String(name), x + w / 2, nameY)

  ctx.fillStyle = ELSEVIER_MUTED
  ctx.font = '600 30px "Instrument Sans", system-ui, sans-serif'
  ctx.fillText(String(role), x + w / 2, nameY + 46)
}

function drawElsevierBadge(ctx, photo, logo, badge) {
  const W = 1024
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, W)

  drawFace(ctx, photo, logo, badge, faceRect('front'))
  drawFace(ctx, photo, logo, badge, faceRect('back'))
}

function configureTexture(tex) {
  tex.colorSpace = THREE.SRGBColorSpace
  tex.flipY = false
  tex.anisotropy = 16
  tex.needsUpdate = true
  return tex
}

export function useBadgeTexture(badge) {
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    let cancelled = false
    let tex = null

    async function build() {
      if (!badge?.slackImage) {
        setTexture(null)
        return
      }

      try {
        const [photo, logo] = await Promise.all([
          loadImage(badge.slackImage),
          loadImage(badge.logoImage || '/elsevier-logo.png').catch(() => null),
        ])
        if (cancelled) return
        if (document.fonts?.ready) await document.fonts.ready

        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 1024
        drawElsevierBadge(canvas.getContext('2d'), photo, logo, badge)

        tex = configureTexture(new THREE.CanvasTexture(canvas))
        setTexture(tex)
      } catch {
        if (!cancelled) setTexture(null)
      }
    }

    build()

    return () => {
      cancelled = true
      tex?.dispose()
    }
  }, [badge])

  return texture
}
