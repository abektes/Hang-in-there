import { Suspense } from 'react'
import PhysicsShowcase from './PhysicsShowcase'

export default function BadgeScene({ badgeTexture }) {
  return (
    <div className="badge-scene">
      <Suspense fallback={<div className="badge-loading" aria-hidden="true" />}>
        <PhysicsShowcase badgeTexture={badgeTexture} />
      </Suspense>
    </div>
  )
}
