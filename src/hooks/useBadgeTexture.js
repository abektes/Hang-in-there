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
  ctx.fillText('UX SHOWCASE', W / 2, 920)
}

export function useBadgeTexture(badge) {
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')

    drawMinimalBadge(ctx, badge)

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.flipY = false
    tex.anisotropy = 16
    tex.needsUpdate = true
    setTexture(tex)
  }, [badge.title, badge.weekLabel, badge.name, badge.role])

  return texture
}
