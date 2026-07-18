# Animation / badge plans

Commit stamp when written: `1fa9e6e`

Weekly Slack portrait provided by user (source → copy in plan 004):

`…/assets/1720436393584-39feb60e-b77b-458a-8833-5d587505196b.png` → `public/weeks/current.png`

## Status

| # | Title | Severity | Status | Depends on |
| --- | --- | --- | --- | --- |
| 001 | Reframe embedded badge camera so the card is visible | HIGH | DONE | — |
| 002 | Add small idle lanyard sway | HIGH | DONE | 001 |
| 003 | Honor prefers-reduced-motion for the lanyard | HIGH | DONE | 001, 002 |
| 004 | Drive the badge face from a weekly Slack image | MEDIUM | DONE | 001 |

Deferred from audit (not planned yet): designer `:active` press (finding 5), texture crossfade (finding 6).

## Recommended execution order

1. **001** — nothing else is verifiable while the canvas is fully transparent  
2. **004** — put the Slack portrait on the mesh (can parallel with 002 after 001)  
3. **002** — idle sway once the card is visible  
4. **003** — gate sway/drag for reduced motion  

## How to run

Ask the agent: `improve-animations execute plans/001-reframe-embedded-badge-camera.md`  
(or execute 001→004 in order).

Or say: **execute all plans**.
