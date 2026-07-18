import BadgeScene from './components/BadgeScene'
import { useBadgeTexture } from './hooks/useBadgeTexture'
import { featuredBadge } from './data/showcase'

export default function App() {
  const badgeTexture = useBadgeTexture(featuredBadge)

  return (
    <div className="page">
      <header className="site-header">
        <div className="site-brand">
          <span className="site-mark" aria-hidden="true" />
          <p className="site-label">10 min break</p>
        </div>
        <p className="site-meta">Drag to inspect · Updates weekly</p>
      </header>

      <main className="badge-main">
        <section className="badge-hero" aria-label="Interactive work badge">
          <div className="badge-hero-copy">
            <p className="hero-kicker">Elsevier · Design</p>
            <h1 className="hero-title">10 min break</h1>
            <p className="hero-lead">
              Weekly AI share-out badge — drag to inspect, flip for details.
            </p>
          </div>
          <div className="badge-hero-stage">
            <BadgeScene badgeTexture={badgeTexture} />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>Elsevier Design · Work badge of the week</p>
        <p className="site-footer-hint">Swap portrait in public/weeks/current.png</p>
      </footer>
    </div>
  )
}
