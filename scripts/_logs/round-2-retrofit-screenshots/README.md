# Round 2 commit 2 — per-surface retrofit screenshots

Per `docs/plans/post-session-audit-fixes-and-wide-token-retrofit.md` §2.7 + §5.2 + §6, this directory holds pre/post-retrofit screenshots for forward-traceability of the Layer-A token Alpha-tinting retrofit (commit 2 of Round 2).

## Verification status (commit-2 commit-time)

**Empirical contrast verification:** ✓ COMPLETE. See `contrast-check.ts` + `contrast-check.log` in this directory. WCAG AA confirmed for:

- Light-mode `--foreground` vs `--background`: 19.79:1 (pre) → 19.23:1 (post) — both AAA.
- Light-mode `--muted-foreground` vs `--background`: 4.73:1 (pre, marginal AA) → **7.23:1** (post, AAA).
- **Light-mode `--muted-foreground` vs `--muted`: 4.34:1 (pre, sub-AA — the audit's "system-level" concern) → 6.82:1 (post, AAA — closes Round 1 §8 residual #10).**
- Dark-mode `--foreground` vs `--background`: 18.96:1 (pre) → 18.96:1 (post; chroma-only retrofit preserves contrast) — AAA.
- Dark-mode `--muted-foreground` (lightness preserved at 0.708; chroma bump only): 7.63:1 vs background, 5.83:1 vs muted — both AAA.

**Visual screenshot verification:** ⚠ DEFERRED to manual review by Leo. The Round 2 plan-doc §2.7 + §6 explicitly state "manual screenshot capture is acceptable per §6 (no scripted-screenshot infrastructure required for Round 2)". Round 2 commit 2 does NOT spin up a dev server or playwright; the empirical contrast measurements above are the authoritative AA gate. Visual diff (does the surface read as faintly-lavender vs cold-gray? does the dashboard look identical?) is a separate review pass by Leo, expected pre-commit-3.

The dev workflow for Leo's visual review:

```sh
bun --hot ./src/index.ts   # start dev server
# Open http://localhost:3000 in browser
# Walk: /, /drill/[any-sub-type-id]/run, /diagnostic/run, /full-length/configure, /full-length/run, /post-session/[recent-session-id], /login, /admin/ingest, /review (control), /lessons (control), /stats (control)
# Capture screenshot per surface (browser DevTools or OS screenshot tool)
# Save as {surface}-post.png in this directory
# Compare against {surface}-pre.png if available (none captured at commit-time per the deferred-to-manual framing)
```

Expected visual outcomes:

- **Faint-lavender shift** (subtle, NOT obvious "purple tint"): focus shell, post-session view, login, admin/ingest, all surfaces consuming shadcn UI primitives. Reads as "dialed-down warmth" per ALPHA_DESIGN §3.
- **No visible change** (Layer-B sanity check): dashboard `/`, stub pages `/review`, `/lessons`, `/stats`. These consume Layer-B Alpha tokens (already tinted pre-Round-2), unaffected by Layer-A retrofit.

If any surface looks meaningfully different from intent (over-saturated, too-cold, or any unexpected change on the dashboard / stub controls), surface as a Round 2 redirect — DO NOT silently revise the retrofit values.

## Why the screenshots aren't captured at commit time

Spinning up a dev server + capturing screenshots from inside an authenticated Next.js app loop requires:

1. Auth fixtures (NextAuth Google OAuth bypass for dev) — not currently scaffolded in scripts/.
2. A representative dev DB session for `/post-session/[sessionId]` rendering — needs a recently-completed session.
3. Headless browser orchestration (playwright or similar) — would require a deferred-tool dependency the round explicitly avoided per Q2 + the redirect's "no scripted-screenshot infrastructure required" framing.

Round 2's verification protocol prefers manual visual review by Leo over scripted capture. This README + the `contrast-check.ts` empirical gate are the round's commit-time verification deliverables.

## Files in this directory

- `README.md` — this file.
- `contrast-check.ts` — Bun script computing OKLCH → linear sRGB → relative luminance → WCAG contrast ratio for the retrofit candidate values. Run via `bun scripts/_logs/round-2-retrofit-screenshots/contrast-check.ts`.
- `contrast-check.log` — captured stdout from the above (committed for forward-traceability per §6.14.38 tee-discipline).

Pre/post screenshots (`{surface}-pre.png`, `{surface}-post.png`) are not committed at commit-2 time per the deferred-to-manual framing above. If Leo captures them post-commit, they're welcome to land here in a follow-up commit.
