# 004 — Drive the badge face from a weekly Slack image

- **Status**: DONE
- **Commit**: 1fa9e6e
- **Severity**: MEDIUM
- **Category**: Cohesion / product
- **Estimated scope**: 3–4 files (`public/weeks/…`, `src/data/showcase.js`, `src/hooks/useBadgeTexture.js` or replacement, `App.jsx`), medium
- **Depends on**: 001 (otherwise you cannot verify the image on the mesh)

## Problem

The card face is a procedural canvas “conference badge” (title / week / name / QR), not the Slack-format portrait designers will drop in each week:

```js
/* src/hooks/useBadgeTexture.js:4-75 — current */
function drawMinimalBadge(ctx, { title, weekLabel, name, role }) {
  const W = 1024
  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, W, W)
  // ... draws typography + fake QR ...
}
```

The user supplied the first weekly image (Slack-style square portrait, 200×200 JPEG data, `.png` filename):

`/Users/ahmetbektes/.cursor/projects/Users-ahmetbektes-WDesignspace-Badge-design/assets/1720436393584-39feb60e-b77b-458a-8833-5d587505196b.png`

That file must be copied into the app’s `public/` tree and used as the badge `map`.

## Target

1. **Asset**

```text
public/weeks/current.png
```

Copy from the path above (keep bytes as-is even if the container is JPEG). Each week, replace `current.png` (or add `public/weeks/YYYY-WW.png` and point data at it).

2. **Data** — extend featured week in `src/data/showcase.js`:

```js
export const featuredBadge = {
  title: '10 min break',
  weekLabel: 'AI share-out',
  name: 'Weekly designer',
  role: 'What I made with AI',
  slackImage: '/weeks/current.png',
}
```

Keep `designers` array if the page still lists people, but **the 3D card texture reads `slackImage`**, not canvas text fields. Selecting a designer may stay as a roster UI without re-baking typography (or can be no-ops for texture until more weekly images exist).

3. **Texture hook** — replace canvas drawing with image load when `slackImage` is present:

```js
/* target behavior for useBadgeTexture(badge) */
// If badge.slackImage:
//   load via new THREE.TextureLoader().load(badge.slackImage, ...)
//   tex.colorSpace = THREE.SRGBColorSpace
//   tex.flipY = false
//   tex.anisotropy = 16
//   // Vercel tag.glb UVs are often mirrored — if text/photo reads backwards on mesh,
//   set: tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1
// If no slackImage, fall back to current canvas drawer (do not delete fallback yet).
```

Because the source is **200×200**, do not stretch-think in CSS; Three will map it to the card UVs. If the face looks too soft, that is acceptable for v1; do not upscale with a fake sharpen pass.

4. **App** — pass `featuredBadge` (with `slackImage`) into `useBadgeTexture`. Dependency array must include `badge.slackImage`.

5. **Copy tone (minimal)** — only if you already touch `App.jsx` hero strings in this plan, set lead to something like: “This week’s 10‑min break — what we made with AI.” Do not redesign the whole page.

## Repo conventions to follow

- Static files are served from `public/` (see existing `public/badge_texture.jpg`).
- Texture configuration already sets `flipY = false` and `anisotropy = 16` in `useBadgeTexture.js` and again in `PhysicsShowcase.jsx` — keep that pattern.
- Exemplar asset placement: `public/badge_texture.jpg` → same idea for `public/weeks/current.png`.

## Steps

1. `mkdir -p public/weeks` and copy the provided asset to `public/weeks/current.png`.
2. Update `featuredBadge` in `src/data/showcase.js` with `slackImage: '/weeks/current.png'` and the break-oriented labels above.
3. Change `useBadgeTexture` to load `badge.slackImage` via `THREE.TextureLoader`, dispose previous texture on change/unmount (`tex.dispose()`), keep canvas fallback if `slackImage` missing.
4. Wire `App.jsx` so the active badge still has `slackImage` (if `selectDesigner` currently strips it, preserve `slackImage: featuredBadge.slackImage` on the new object).
5. Run the app; if the portrait is mirrored on the mesh, apply `repeat.x = -1` + `offset.x = 1` as noted.
6. Confirm drag + sway (plans 001–002) still work with the photo map.

## Boundaries

- Do NOT require a backend; weekly update = replace file or change the string path in `showcase.js`.
- Do NOT add Cloudinary/imgcdn pipelines.
- Do NOT rebuild the whole marketing page / remove Weekly program unless asked.
- Do NOT invent additional weekly portraits; one image is enough.
- If the source asset path is missing, STOP and report — do not substitute Unsplash faces.

## Verification

- **Mechanical**: `npm run build` succeeds; `/weeks/current.png` returns 200 in preview/dev.
- **Feel check**:
  1. Hero badge shows the provided portrait (sunglasses, white tee, blue sky / travertine background) on the 3D card face.
  2. Photo is right-reading (not mirrored). If mirrored, apply the repeat/offset fix and recheck.
  3. Changing `featuredBadge.slackImage` to another file under `public/weeks/` updates the card after reload.
  4. With plan 002, the photo gently sways on the lanyard.
- **Done when**: The swinging card face is the Slack portrait, not the procedural QR badge.
