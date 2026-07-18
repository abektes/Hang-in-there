# 001 — Reframe embedded badge camera so the card is visible

- **Status**: DONE
- **Commit**: 1fa9e6e
- **Severity**: HIGH
- **Category**: Performance / Physicality
- **Estimated scope**: 1 file (`src/components/PhysicsShowcase.jsx`), small

## Problem

The embedded lanyard world is shifted up by `EMBEDDED_ANCHOR`, but the camera is still aimed near the origin. Live check on `http://localhost:5174` (commit `1fa9e6e`): `.hero-badge` is on-screen (~352×482), yet `canvas.toDataURL` sampling shows **0 opaque pixels** — the swinging card never appears.

```js
/* src/components/PhysicsShowcase.jsx:24 — current */
const EMBEDDED_ANCHOR = [0.5, 4, 0]

/* src/components/PhysicsShowcase.jsx:59-65 — current */
function EmbeddedRig() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(-0.65, -0.55, 13.5)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}
```

Bodies use `shiftPosition(..., embedded)` so the hang point sits near world `(0.5, 4, 0)` while the camera looks at `(0, 0, 0)` with FOV 25 — the badge hangs outside (or at the extreme edge of) the frustum.

## Target

When `embedded` is true, the camera must frame the resting hang pose: lanyard + card readable in `.hero-badge`, with opaque pixels present after load + 1s settle.

Exact camera target for embedded mode:

```js
/* target — EmbeddedRig */
function EmbeddedRig() {
  const { camera } = useThree()
  useEffect(() => {
    // Match EMBEDDED_ANCHOR Y so the hang point sits in frame
    camera.position.set(0, 3.15, 13.5)
    camera.lookAt(0.5, 3.15, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}
```

If after feel-check the card is slightly high/low, adjust **only** the shared Y (`3.15`) in steps of `0.25` — keep X lookAt at `0.5` (anchor X) and Z camera at `13.5`, FOV `25`.

Non-embedded path must stay unchanged (`camera={{ position: [0, 0, 13.5], fov: 25 }}` with no `EmbeddedRig`).

## Repo conventions to follow

- Embedded framing already lives in `EmbeddedRig` inside `src/components/PhysicsShowcase.jsx` — edit there only; do not invent a new camera component.
- `EMBEDDED_ANCHOR` remains the single source for the Y offset; if you change the lookAt Y, keep it conceptually tied to `EMBEDDED_ANCHOR[1]` (e.g. derive `const focusY = EMBEDDED_ANCHOR[1] - 0.85`).

## Steps

1. Open `src/components/PhysicsShowcase.jsx`.
2. Replace `EmbeddedRig` body with the target above (or the derived `focusY = EMBEDDED_ANCHOR[1] - 0.85` form — equivalent to `3.15` when anchor Y is `4`).
3. Ensure `camera.lookAt` runs after `position.set` and before `updateProjectionMatrix`.
4. Do not change gravity, joints, materials, or layout CSS in this plan.

## Boundaries

- Do NOT touch `src/styles.css`, `App.jsx`, texture hooks, or designer cards.
- Do NOT change `EMBEDDED_ANCHOR` values unless framing still fails after Y nudges of ±0.5 — if you must change the anchor, STOP and report.
- Do NOT add dependencies.
- If `EmbeddedRig` or `EMBEDDED_ANCHOR` no longer exist at these lines, STOP and report drift.

## Verification

- **Mechanical**: `npm run build` succeeds.
- **Feel check**:
  1. `npm run dev`, open the app, scroll to hero.
  2. Confirm the lanyard + card are visible in the right-hand badge slot (desktop) / top slot (mobile width).
  3. In console: sample canvas via `toDataURL` → draw to 64×64 → opaque pixel count **> 0**.
  4. Drag the card; it should stay readable in frame while swinging.
- **Done when**: Badge is visibly framed at rest without scrolling/hunting; opaque pixels confirmed.
