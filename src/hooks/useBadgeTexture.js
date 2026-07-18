import * as THREE from 'three'
import { useEffect, useState } from 'react'

function drawMinimalBadge(ctx, { title, weekLabel, name, role }) {
  const W = 1024

  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, W, W)

  ctx.strokeStyle = '#e8e8e8'
  ctx.lineWidth = 3
  ctx.strokeRect(48, 48, W - 96, W - 96)

  ctx.strokeStyle = '#111111'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(80, 200)
  ctx.lineTo(944, 200)
  ctx.stroke()

  ctx.font = '600 52px "Inter", sans-serif'
  ctx.fillStyle = '#111111'
  ctx.textAlign = 'left'
  ctx.fillText(title, 80, 130)

  ctx.font = '400 28px "Inter", sans-serif'
  ctx.fillStyle = '#6b6b6b'
  ctx.fillText(weekLabel, 80, 175)

  ctx.font = '600 64px "Inter", sans-serif'
  ctx.fillStyle = '#111111'
  ctx.textAlign = 'center'
  ctx.fillText(name, W / 2, 520)

  ctx.font = '400 30px "Inter", sans-serif'
  ctx.fillStyle = '#6b6b6b'
  ctx.fillText(role, W / 2, 575)

  ctx.strokeStyle = '#e8e8e8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(120, 640)
  ctx.lineTo(904, 640)
  ctx.stroke()

  const qrSize = 160
  const qrX = (W - qrSize) / 2
  const qrY = 700
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#e8e8e8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#111111'
  const block = qrSize / 12
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 12; j++) {
      const isCorner = (i < 3 && j < 3) || (i > 8 && j < 3) || (i < 3 && j > 8)
      const show = isCorner
        ? i === 0 || i === 2 || j === 0 || j === 2 || (i === 1 && j === 1)
        : (i * 7 + j * 11) % 5 < 2
      if (show) {
        ctx.fillRect(qrX + i * block, qrY + j * block, block - 1, block - 1)
      }
    }
  }

  ctx.font = '500 22px "Inter", sans-serif'
  ctx.fillStyle = '#6b6b6b'
  ctx.textAlign = 'center'
  ctx.fillText('10 MIN BREAK', W / 2, 920)
}

function coverImage(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

/** Draw into a panel, horizontally mirrored (tag.glb card UVs are mirrored). */
function withMirror(ctx, x, y, w, h, draw) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.translate(x + w, y)
  ctx.scale(-1, 1)
  draw(ctx, w, h)
  ctx.restore()
}

/**
 * tag.glb expects a front|back atlas (left = front, right = back),
 * matching textures like public/elsevier_badge_texture.png.
 */
function drawSlackAtlas(ctx, img, { weekLabel }) {
  const half = 1024

  withMirror(ctx, 0, 0, half, half, (c, w, h) => {
    coverImage(c, img, 0, 0, w, h)
  })

  withMirror(ctx, half, 0, half, half, (c, w, h) => {
    c.fillStyle = '#111111'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#fafafa'
    c.font = '600 48px "Inter", sans-serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText('10 min break', w / 2, h / 2 - 24)
    c.font = '400 32px "Inter", sans-serif'
    c.fillStyle = '#a3a3a3'
    c.fillText(weekLabel || 'AI share-out', w / 2, h / 2 + 28)
  })
}

function configureTexture(tex) {
  tex.colorSpace = THREE.SRGBColorSpace
  tex.flipY = false
  tex.anisotropy = 16
  tex.needsUpdate = true
  return tex
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

export function useBadgeTexture(badge) {
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    let cancelled = false
    let tex = null

    async function build() {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (badge.slackImage) {
        try {
          const img = await loadImage(badge.slackImage)
          if (cancelled) return
          canvas.width = 2048
          canvas.height = 1024
          drawSlackAtlas(ctx, img, badge)
        } catch {
          if (cancelled) return
          canvas.width = 1024
          canvas.height = 1024
          withMirror(ctx, 0, 0, 1024, 1024, (c) => drawMinimalBadge(c, badge))
        }
      } else {
        canvas.width = 1024
        canvas.height = 1024
        withMirror(ctx, 0, 0, 1024, 1024, (c) => drawMinimalBadge(c, badge))
      }

      if (cancelled) return
      tex = configureTexture(new THREE.CanvasTexture(canvas))
      setTexture(tex)
    }

    build()

    return () => {
      cancelled = true
      tex?.dispose()
    }
  }, [badge])

  return texture
}
