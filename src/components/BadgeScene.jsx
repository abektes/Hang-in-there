import { Component, Suspense } from 'react'
import PhysicsShowcase from './PhysicsShowcase'
import { getSurface, lanyardColor } from '../data/badgeStyles'

class PreviewBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export default function BadgeScene({ badge, badgeTexture, embedded = false }) {
  const surface = getSurface(badge.surface)
  const fallback = (
    <div className="badge-fallback">
      <div
        className="flat-badge"
        style={{ '--flat-ink': surface.flat[0], '--flat-glow': surface.flat[1] }}
      >
        {(badge.companyLogo || badge.companyName.trim()) && (
          <div className="flat-badge-brand">
            {badge.companyLogo && <img className="flat-badge-logo" src={badge.companyLogo} alt={badge.companyName.trim() || 'Company logo'} />}
            {badge.companyName.trim() && <span>{badge.companyName.trim()}</span>}
          </div>
        )}
        <img className="flat-badge-portrait" src={badge.slackImage} alt="" />
        <strong>{badge.name.trim() || 'Your name'}</strong>
        <span>{badge.role.trim() || 'Your role'}</span>
      </div>
      {!embedded && <p>Flat preview. You can still customize and download your badge.</p>}
    </div>
  )

  return (
    <div className="badge-scene" role="img" aria-label={`Badge preview for ${badge.name || 'your name'}, ${badge.role || 'your role'}. Drag to swing the 3D badge.`}>
      <PreviewBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          {badgeTexture ? <PhysicsShowcase
              badgeTexture={badgeTexture}
              surface={surface.id}
              lanyard={lanyardColor(badge.lanyard, surface.id)}
              fallback={fallback}
            /> : fallback}
        </Suspense>
      </PreviewBoundary>
    </div>
  )
}
