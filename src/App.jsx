import { useState } from 'react'
import DesignerCard from './components/DesignerCard'
import WeeklyProgram from './components/WeeklyProgram'
import BadgeScene from './components/BadgeScene'
import { useBadgeTexture } from './hooks/useBadgeTexture'
import { designers, weekProgram, featuredBadge } from './data/showcase'

export default function App() {
  const [activeBadge, setActiveBadge] = useState(featuredBadge)
  const badgeTexture = useBadgeTexture(activeBadge)

  function selectDesigner(designer) {
    setActiveBadge({
      title: featuredBadge.title,
      weekLabel: featuredBadge.weekLabel,
      name: designer.name,
      role: designer.role,
      slackImage: featuredBadge.slackImage,
    })
  }

  return (
    <div className="page">
      <header className="site-header">
        <p className="site-label">10 min break</p>
        <nav className="site-nav" aria-label="Page sections">
          <a href="#badge">Badge</a>
          <a href="#designers">Designers</a>
          <a href="#program">Weekly program</a>
        </nav>
      </header>

      <main>
        <section id="badge" className="hero">
          <div className="hero-stage">
            <h1 className="hero-title">10 min break</h1>
            <p className="hero-lead">
              This week&apos;s share-out — what we made with AI. Grab the badge,
              browse the roster, and follow the program day by day.
            </p>

            <div className="hero-badge" aria-label="Interactive 3D weekly badge">
              <BadgeScene badgeTexture={badgeTexture} />
            </div>
          </div>
        </section>

        <section id="designers" className="section">
          <div className="section-header">
            <h2>Designers</h2>
            <p>Click a designer to update the badge above.</p>
          </div>
          <div className="designer-grid">
            {designers.map((designer) => (
              <DesignerCard
                key={designer.id}
                {...designer}
                selected={activeBadge.name === designer.name}
                onSelect={() => selectDesigner(designer)}
              />
            ))}
          </div>
        </section>

        <section id="program" className="section section-program">
          <div className="section-header">
            <h2>Weekly program</h2>
            <p>Jun 9 – 13 · Five days of sessions, critiques, and share-outs.</p>
          </div>
          <WeeklyProgram days={weekProgram} />
        </section>
      </main>

      <footer className="site-footer">
        <p>10 min break · Updated weekly</p>
      </footer>
    </div>
  )
}
