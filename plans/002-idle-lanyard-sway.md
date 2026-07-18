# 002 — Add small idle lanyard sway (keep physics alive)

- **Status**: DONE
- **Commit**: 1fa9e6e
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file (`src/components/PhysicsShowcase.jsx`), small
- **Depends on**: 001 (card must be visible first)

## Problem

The badge is meant to read as a gently swinging break-entry card. Current physics settles hard into a dead pose:

```js
/* src/components/PhysicsShowcase.jsx:81 — current */
const segmentProps = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 }
```

`canSleep: true` plus high damping means after the initial drop (or after a drag), the card becomes a static image. For an internal 10‑min break surface seen occasionally, a **small continuous sway** is the point — not a frozen mesh.

## Target

- Card rigid body: `canSleep: false` (joints `j1`/`j2`/`j3` may keep `canSleep: true`).
- After mount, once refs are ready, apply **one** gentle lateral impulse so it settles into a soft pendulum, then rely on physics (no looping keyframe animation).
- Optional very light periodic nudge only if sway dies within ~3s — prefer tuning damping first.

Exact values:

```js
/* card RigidBody segment overrides */
const cardProps = {
  type: 'dynamic',
  canSleep: false,
  colliders: false,
  angularDamping: 2.2,
  linearDamping: 2.2,
}

/* joints keep */
const segmentProps = {
  type: 'dynamic',
  canSleep: true,
  colliders: false,
  angularDamping: 4,
  linearDamping: 4,
}

/* once after first physics frame when card.current exists */
card.current.applyImpulse({ x: 0.35, y: 0, z: 0.15 }, true)
```

Keep existing yaw settle:

```js
card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z })
```

Do **not** add CSS rotation on the canvas. Motion stays Rapier-driven.

## Repo conventions to follow

- All band physics live in `Band` inside `src/components/PhysicsShowcase.jsx` — extend that component.
- Drag path already wakes bodies and uses kinematic drag; preserve `onPointerDown` / `onPointerUp` behavior.

## Steps

1. In `Band`, split props: `segmentProps` for joints/fixed; `cardProps` for the card (`canSleep: false`, damping `2.2`).
2. Apply `cardProps` on the card `RigidBody`; leave joints on `segmentProps`.
3. Add a `useEffect` (or a one-shot flag inside `useFrame`) that fires `applyImpulse({ x: 0.35, y: 0, z: 0.15 }, true)` once when `card.current` is ready. Guard with a `useRef(false)` so it never re-fires on texture changes.
4. If sway is too wild after feel-check, reduce impulse to `{ x: 0.2, y: 0, z: 0.08 }` before touching gravity.
5. Do not change gravity (`[0, -40, 0]`) in this plan.

## Boundaries

- Do NOT implement reduced-motion here (plan 003).
- Do NOT change camera framing (plan 001).
- Do NOT add GSAP/Framer/CSS keyframe swing.
- Do NOT add new dependencies.
- If `applyImpulse` API differs in the installed `@react-three/rapier` version, use the project’s existing rigid-body API (`wakeUp` is already used) and the package’s impulse helper — do not invent a rAF rotate hack.

## Verification

- **Mechanical**: `npm run build` succeeds.
- **Feel check**:
  1. Reload hero — card should enter with a soft sway and keep a subtle pendulum for several seconds without user input.
  2. Drag and release — returns to gentle sway, does not freeze instantly.
  3. Sway amplitude should feel like a badge on a lanyard, not a windshield wiper. If it spins, lower impulse / raise `angularDamping` toward `3`.
  4. DevTools Animations panel is N/A (physics); judge at full speed, then mentally “slow-mo” by watching settle after drag.
- **Done when**: At rest (no pointer), the card is clearly alive with small motion for ≥3s after load.
