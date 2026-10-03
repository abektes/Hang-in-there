import { useState } from 'react'
import BadgeScene from './components/BadgeScene'
import BadgeCustomizer from './components/BadgeCustomizer'
import BadgeEmbed from './components/BadgeEmbed'
import { useBadgeTexture } from './hooks/useBadgeTexture'
import { featuredBadge } from './data/showcase'
import { decodeBadge, isEmbedRequest } from './utils/badgeEmbed'

function EmbeddedBadge() {
  const [badge] = useState(() => decodeBadge(window.location.hash))
  const { texture } = useBadgeTexture(badge)

  return (
    <main className="embed-page">
      <BadgeScene badge={badge} badgeTexture={texture} embedded />
    </main>
  )
}

function BadgeMaker() {
  const [badge, setBadge] = useState(featuredBadge)
  const { texture, status, error } = useBadgeTexture(badge)

  return (
    <div className="page">
      <header className="site-header">
        <div className="site-brand">
          <span className="site-mark" aria-hidden="true" />
          <p className="site-label">Hang In There</p>
        </div>
        <p className="site-meta">Badges for the weekly AI share-out</p>
      </header>

      <main className="badge-main">
        <section className="badge-hero" aria-label="Badge maker">
          <div className="badge-hero-copy">
            <h1 className="hero-title">Hang In There</h1>
            <p className="hero-lead">
              The badge maker that is just hanging around. Make yours, give it a swing, then hang it on any page.
            </p>
          </div>
          <div className="badge-tools">
            <BadgeCustomizer
              badge={badge}
              onChange={setBadge}
              texture={texture}
              textureStatus={status}
              textureError={error}
            />
            <BadgeEmbed badge={badge} />
          </div>
          <div className="badge-hero-stage">
            <p className="preview-label">Your badge, live</p>
            <BadgeScene badge={badge} badgeTexture={texture} />
            <p className="preview-hint">Grab the badge. Give it a little swing.</p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>No lanyards were tangled in the making of this badge.</p>
        <p className="site-footer-hint">Your photo and logo stay in your browser, unless you share a live embed link.</p>
      </footer>
    </div>
  )
}

export default function App() {
  return isEmbedRequest(window.location.search) ? <EmbeddedBadge /> : <BadgeMaker />
}
