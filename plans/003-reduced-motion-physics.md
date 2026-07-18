# 003 — Honor prefers-reduced-motion for the lanyard

- **Status**: DONE
- **Commit**: 1fa9e6e
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 1–2 files (`PhysicsShowcase.jsx`, optionally `styles.css`), small
- **Depends on**: 001 (visibility), 002 (idle sway — must be disableable)

## Problem

The badge uses continuous physics motion (and plan 002 adds idle sway) with no reduced-motion path. Current CSS only disables smooth scrolling:

```css
/* src/styles.css:412-416 — current */
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

Reduced motion means **fewer / gentler** animations, not a blank badge: keep a readable hung card; drop idle impulses, drag-driven thrashing is optional to keep or soften.

## Target

In `PhysicsShowcase` / `Band`:

```js
const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

Or subscribe once via `useState` + `useEffect` on `matchMedia` so OS toggles update.

When `reduceMotion` is true:

1. Do **not** call the idle `applyImpulse` from plan 002.
2. Set card + joint damping high so motion dies immediately if any: `angularDamping: 8`, `linearDamping: 8`.
3. Prefer a settled pose: after mount, optionally `card.current.setTranslation` / wake once is OK; no periodic nudges.
4. Drag may remain (user control) OR be disabled with `pointer-events` off on the group — pick **disable drag** for clearest a11y: skip `onPointerDown` drag handlers when `reduceMotion`.
5. Keep the card visible with texture (plans 001 + 004).

Listen for changes:

```js
useEffect(() => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const onChange = () => setReduceMotion(mq.matches)
  onChange()
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}, [])
```

## Repo conventions to follow

- Media-query reduced motion already exists in `src/styles.css` — do not remove the scroll rule; physics branching belongs in JS beside the Rapier code.
- No `useReducedMotion` from Framer is available (not in deps) — use `matchMedia`, do not add Motion/Framer.

## Steps

1. Add `reduceMotion` state with `matchMedia` subscription in `Band` (or parent `PhysicsShowcase` passed as prop).
2. Gate plan 002 idle impulse: `if (!reduceMotion && !impulseRef.current) { ... }`.
3. When `reduceMotion`, use higher damping on card (and skip drag handlers).
4. Manually verify OS/DevTools “Emulate CSS media feature prefers-reduced-motion”.

## Boundaries

- Do NOT remove the physics canvas entirely under reduced motion.
- Do NOT add a dependency for reduced-motion hooks.
- Do NOT change designer-grid hover rules here (out of scope; finding 5 deferred).

## Verification

- **Mechanical**: `npm run build` succeeds.
- **Feel check**:
  1. DevTools Rendering → emulate `prefers-reduced-motion: reduce` → reload: card visible, **no** idle sway, drag inactive (or inert).
  2. Disable emulation → reload: idle sway from plan 002 returns.
  3. Opacity/texture still present in both modes.
- **Done when**: Reduced-motion path shows a static hung badge; default path keeps small sway.
