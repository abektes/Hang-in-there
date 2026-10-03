import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { createBadgeCanvas, loadImage } from '../utils/badgeTexture'

const BADGE_FONTS = [
  '500 30px Newsreader',
  '500 96px Newsreader',
  '500 13px "Instrument Sans"',
  '600 19px "Instrument Sans"',
  '700 42px "Instrument Sans"',
]

export function useBadgeTexture(badge) {
  const [result, setResult] = useState({ badge: null, texture: null, error: '' })
  const images = useRef({ photoSrc: null, logoSrc: null, photo: null, logo: null })

  useEffect(() => {
    let cancelled = false

    async function build() {
      try {
        const logoSrc = badge.companyLogo || null
        const cached = images.current
        const [photo, logo] = await Promise.all([
          cached.photoSrc === badge.slackImage ? cached.photo : loadImage(badge.slackImage),
          !logoSrc ? null : cached.logoSrc === logoSrc ? cached.logo : loadImage(logoSrc).catch(() => null),
        ])
        // Canvas text never triggers webfont loading, so request the faces the
        // artwork uses before drawing or the first texture bakes in a fallback.
        if (document.fonts?.load) {
          await Promise.all(BADGE_FONTS.map((font) => document.fonts.load(font))).catch(() => {})
        }
        if (cancelled) return

        images.current = { photoSrc: badge.slackImage, logoSrc, photo, logo }
        const texture = new THREE.CanvasTexture(createBadgeCanvas(photo, logo, badge))
        texture.colorSpace = THREE.SRGBColorSpace
        texture.flipY = false
        texture.anisotropy = 16
        // The print layer is mostly transparent; premultiplied texels keep
        // mipmapped type edges from picking up dark fringes.
        texture.premultiplyAlpha = true
        setResult({ badge, texture, error: '' })
      } catch {
        if (!cancelled) {
          setResult((previous) => ({
            ...previous,
            badge,
            error: 'Preview could not update. Try another image or reset your badge.',
          }))
        }
      }
    }

    build()
    return () => { cancelled = true }
  }, [badge])

  const texture = result.texture
  useEffect(() => () => { texture?.dispose() }, [texture])

  const status = result.badge !== badge ? 'loading' : result.error ? 'error' : 'ready'
  return { texture, status, error: result.badge === badge ? result.error : '' }
}
