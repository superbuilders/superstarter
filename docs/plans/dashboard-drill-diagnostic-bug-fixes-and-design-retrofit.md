# Plan — Dashboard / Drill / Diagnostic Bug-Fix + Design-Retrofit Round

> **Status: planning, commit-0 audit complete, body authored, awaiting commit 1 redirect.** Plan-doc was renamed from `phase5-round1-dashboard-drill-diagnostic.md` per Leo's 2026-05-08 redirect (option 1: rename only — drop the misleading `phase5-round1` prefix; this round is not a master-plan sub-phase).
>
> **Round opened against `main` at HEAD `e69e56c`** (post phase-4 sub-phase-a close, 2026-05-08). Sub-phase b (validator) is deferred indefinitely; the 1,711 candidates remain at `status='candidate'` and are NOT touched this round. **This round is a UX/feature pivot, not a continuation of the generation pipeline.**

---

## §0 — Commit-0 audit findings

Eight audits per the round-opening redline. Each audit's finding ends with a positional conclusion (one-line fix shape, schema-vs-wire-up classification, or scope flag). All file paths are anchored to the repo root.

### §0.1 Repo convention paths (audit step #1)

**Audit doc path.** Neither `docs/audits/` nor `docs/reviews/` currently exist. `docs/` carries `claude_logs/` (session transcripts), `plans/` (phase plans), and root structural docs (`ALPHA_DESIGN.md`, `SPEC.md`, `PRD.md`, `TODO.md`, `architecture_plan.md`, `CCAT-categories.md`, `design_decisions.md`, `feature-roadmap.md`). No existing audit-style standalone doc convention. **Recommendation:** new directory `docs/audits/` with this round's review-section audit landing at `docs/audits/post-session-review-surface-alpha-design.md`. This creates the precedent; future audit rounds inherit the path. Resolution proposed at §0.10 Q3.

**Third-party attribution.** No `ATTRIBUTIONS.md`, `LICENSE-3RD-PARTY.md`, or similar exists. Repo root carries only `LICENSE` (ISC, software-only). No `/credits` or `/attributions` route under `src/app/`. **Recommendation:** create `ATTRIBUTIONS.md` at repo root for centralized third-party asset credits. Inline section per asset family (belts; future image families). Resolution proposed at §0.10 Q4.

**Static asset path.** Images consistently live under `/data/` (belts at `data/images/GJJ_*_Belt.svg`; example PNGs at `data/example_ccat_formatting/`; testbank screenshots under `data/testbank/`). `public/` carries only `audio/` + `favicon.svg`. `next.config.ts` has no special `data/` static-handling, asset prefix, or unusual public-dir config — `data/` is a non-served data repository, not a Next.js public dir. **Conclusion:** the redline-stated path `/data/images/GJJ_{...}_Belt.svg` is the EXISTING convention but is NOT served by Next.js to the browser. Belt SVGs MUST move to `public/images/belts/` (or similar under `public/`) for the `<BeltStripe>` component to load them via `<img src="/images/belts/...svg">` or Next.js `<Image>`. **This is an audit-surfaced scope clarification — the redline's "swap belt-text → belt-SVG using /data/images/..." cannot work as written; the assets need to move OR the round needs to embed them as inline-imported SVG components.** Flagged at §0.9 SF-1. **(See §0.12 — this finding's pre-mv framing is superseded by empirical state at redirect time; the SVGs were already moved out-of-session.)**

### §0.2 Mistakes-to-review data source (audit step #2)

The mistakes-to-review tile is currently rendered inside `<ScoreStrip>` at `src/components/dashboard/score-strip.tsx:108-113`. It surfaces `mistakesQueue.count` (integer) + `mistakesQueue.href` (hardcoded `"/review"`). The data shape is defined in `src/server/dashboard/types.ts:50+` as `{ count: number; href: string }`. **The schema already exists.** `attempts` table at `src/db/schemas/practice/attempts.ts` carries `sessionId` (FK), `itemId`, `correct` (boolean), `latencyMs`. The real query is already implemented at `src/server/dashboard/mistakes.ts:30-55` — counts distinct items where `attempts.correct = false`, joined through `practice_sessions.user_id`. The orchestrator at `src/server/dashboard/data.ts:79` calls `countMistakes(userId)` and wraps it as `estimatedMinutes = Math.max(1, count * 0.35)`.

**Conclusion: wire-up-only change. NO schema migration required.** The redline's "stub → real component" reduces to surfacing the already-computed count in the tile. Open Q1 (mistakes-to-review schema) is RESOLVED-NO — no migration needed; ship in this round, no Round 2 deferral required.

### §0.3 Belt component (audit step #3)

Two belt-rendering surfaces exist:

1. **Dashboard `<BeltStripe>`** at `src/components/dashboard/belt-stripe.tsx:28-55`. Uses text-based CSS class indirection (`bg-belt-white`, `bg-belt-blue`, `bg-belt-brown`, `bg-belt-black`) keyed off a `BELT_BG` record at lines 25-30. Rendered solely in `<BeltRow>` at `src/components/dashboard/belt-row.tsx:66`. **This is the redline's swap target.**

2. **Post-session `<BeltIndicator>`** at `src/components/post-session/belt-indicator.tsx:1-52`. Already renders an SVG belt body (not text) with CSS-class-driven colors. Architecturally separate from `<BeltStripe>`.

**Conclusion: SVG swap is a one-component change (`<BeltStripe>`) with no cascade.** Post-session `<BeltIndicator>` already uses SVG and is unaffected. **However:** the swap couples to §0.1's static-asset finding (SF-1) — the SVGs must be served from `public/` for the `<BeltStripe>` swap to work. Either (a) move SVGs to `public/images/belts/`, or (b) inline-import the SVGs as React components (Next.js + Bun support `?react` or `?inline` imports; verify locally before pinning). Recommendation: option (a) for path simplicity. Decision belongs in plan-doc body §1 once Leo confirms. **(See §0.12 — option (a) was taken outside this Claude Code session before the body authoring stage.)**

### §0.4 Drill ranking-staleness (audit step #4)

Post-drill submission path: `endSession()` at `src/server/sessions/end.ts:29-60` updates `practiceSessions.endedAtMs` + `completionReason`, then triggers `masteryRecomputeWorkflow` at line 67. The workflow at `src/workflows/mastery-recompute.ts:20-36` chains `loadSessionMetadataStep` → `listDistinctSubTypesStep` → per-sub-type `recomputeStep` (writes `mastery_state`).

Dashboard ranking read path: server component at `src/app/(app)/page.tsx:30-55` calls `loadAllBelts()` from `src/server/dashboard/data.ts:73`. The page uses `React.Suspense` — RSC-streamed. **No `revalidatePath('/')` in the post-drill path.** The `endSession` action at `src/app/(app)/actions.ts:129` only calls `revalidatePath('/post-session/{sessionId}')`, not the dashboard route.

**Root cause hypothesis: missing dashboard cache invalidation.** Likely fix: add `revalidatePath('/')` after the workflow trigger in `endSession` action (or, less surgically, set `dynamic = 'force-dynamic'` on the dashboard page). Surgical fix preferred; the dashboard staying RSC-cached for non-mastery-changing visits is a perf benefit to preserve.

### §0.5 Diagnostic timer/bar absence (audit step #5)

Diagnostic invokes `<FocusShell>` at `src/app/(diagnostic-flow)/diagnostic/run/content.tsx:48-57` with `sessionDurationMs={null}`, `paceTrackVisible={false}`, `targetQuestionCount={50}`. Drill invokes `<FocusShell>` at `src/app/(app)/drill/[subTypeId]/run/content.tsx:43-52` with `sessionDurationMs={drillLength * 18_000}`, `paceTrackVisible={true}`, `targetQuestionCount={init.drillLength}`.

`<FocusShell>` at `src/components/focus-shell/focus-shell.tsx:265-285` short-circuits both the chronometer (MM:SS) and `<SessionTimerBar>` (progress bar) when `sessionDurationMs === null`. The intentional comment at lines 265-267 reads "Hidden entirely when the session has no duration (diagnostic)."

**Root cause: deliberate `sessionDurationMs={null}` on diagnostic, encoding the historical "no session timer for diagnostic" decision that the redline now reverses.** Fix shape: change diagnostic's `sessionDurationMs` from `null` to `50 * 18_000` (= 900_000ms = 15 minutes), matching drill's pattern. The server-side 15-minute cutoff that already gates diagnostic submissions stays unchanged. **One-line fix on the diagnostic side; no FocusShell changes.**

### §0.6 Audio cadence (audit step #6)

Audio playback lives at `src/components/focus-shell/audio-ticker.ts`. The `startUrgencyLoop()` function at line 191 sets `source.loop = true` (line 203), which is the loop that the redline calls out. The `playTick()` function at line 161 fires synth ticks during seconds 10-17 (per the comment at lines 143-148), but the looped warning buffer that starts at the per-question target replaces the pre-target ticks.

**Root cause: `source.loop = true` at audio-ticker.ts:203.** Intended cadence per redline: warning plays once at trigger; ticking takes over for the remainder. Fix shape: (a) drop `source.loop = true` at line 203, (b) schedule the warning buffer to play once, (c) resume synth ticks for the remainder of the per-question window. **Single-file fix; bounded.**

### §0.7 Number-series formatting + drill top whitespace (audit step #6 supplementary)

Item renderer `src/components/item/item-prompt.tsx:1-71` has only a `TextBody` case in `renderBody()` — no special number-series handler. All number-series questions render through the default text path, which causes the legibility issue per the redline (number sequences benefit from monospace tabular-num display + spacing per ALPHA_DESIGN §4 OpenType polish: `font-variant-numeric: tabular-nums`).

Drill top whitespace: `<FocusShell>` outermost div at `src/components/focus-shell/focus-shell.tsx:498` carries `className="...py-8"` (2rem top + bottom padding). Reducing top padding to `pt-4` or `pt-6` is the redline's intent.

**Positional only at this step; fix shapes belong in plan-doc body §1.**

### §0.8 Greeting personalization (audit step #7)

Auth setup at `src/auth.ts:1-17` uses NextAuth with Google OAuth + database session strategy. The `users` schema at `src/db/schemas/auth/users.ts` carries a `name` column (varchar, not-null enforced via code in `data.ts:159`). The dashboard data orchestrator at `src/server/dashboard/data.ts:156-175` already extracts `firstName` from `row.name` via `firstNameFor()` (split-on-space, first token). The greeting is hardcoded at `src/components/dashboard/score-strip.tsx:69` as `"Good morning, {firstName}."`.

**Conclusion: `session.user.name` is available; `firstName` already extracted and passed to `<ScoreStrip>`.** Personalization is wire-up-ready. The redline's rotating-greeting logic injects variants into the existing `deriveHeadline()` helper at `src/server/dashboard/helpers.ts:8-18` (or a new sibling `deriveGreeting()`). **No schema changes; no auth changes.** Open Q2 (greeting personalization) is RESOLVED-YES — first-name personalization is supported; rotating tagline corpus from the redline can pair with the time-of-day greeting per the redline's selection logic (rotate per-session, not per-page-render).

### §0.9 ALPHA_DESIGN.md audit-doc scope verification (audit step #8)

**Review-section location.** Post-session review surface lives at:
- Route: `src/app/(diagnostic-flow)/post-session/[sessionId]/{page.tsx, content.tsx}`
- Components: `src/components/post-session/{accuracy-summary, belt-indicator, latency-summary, onboarding-targets, post-session-shell, strategy-surface, structured-explanation, triage-score-line, wrong-items-browser}.tsx` (9 components, 2 with co-located `.test.ts` files)
- Server: `src/server/post-session/{end-session-tier, strategy-selection}.ts`

**ALPHA_DESIGN.md scope.** 662 lines covering 13 sections (§1 Purpose & Brand Core; §2 Three Surface Types; §3 Color & Theme; §4 Typography; §5 Layout & Space; §6 Motion; §7 Interaction; §8 Responsive; §9 UX Writing; §10 Anti-Patterns; §11 Slop Test; §12 Implementation Heuristics; §13 Quick Reference Checklist with 16 checklist items). Sections most likely to surface findings on the review surface: §3 (Color), §4 (Typography — number-series adjacent finding from §0.7), §5 (Layout, hierarchy, cards), §7 (Interaction, focus rings, forms), §9 (UX Writing, button labels, error formula), §10 (Anti-Patterns).

**Audit complexity estimate: medium.** ~9 components × 13 sections = 117 cells, but ~30-40% will be N/A per cell (e.g., §8 Responsive may not apply uniformly to every component; §6 Motion only applies where animation is present). Effective surface ~70 cells. Realistic written-audit time: 90-120 minutes. **Doc structure proposal — hybrid:** the audit-doc opens with §A "per-component sweep" (one section per of the 9 components, each running the §13 Quick Reference checklist) and closes with §B "cross-component findings" (system-level violations spanning multiple components, e.g., color-token drift, motion-easing inconsistency, copy-voice drift). The §13 checklist is the canonical traversal axis because it's already the doc's pre-ship gate. Per-violation entries inside each component section, each entry tagged with severity (P0/P1/P2/P3 per the `audit` skill convention).

**Audit-doc deliverable: written audit only, no fixes (per redline; fixes scheduled to Round 2).**

### §0.10 Open Qs — resolution proposals → final resolutions

The redline named four Open Qs to be resolved before commit 1. Resolutions logged here; final state moved to §7 Resolutions log:

| Q  | Question                            | Resolution                                                                                                                                                                                                                                          |
|----|-------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Q1 | Mistakes-to-review schema           | **RESOLVED-NO migration needed** (commit-0 audit, §0.2). Schema + query already exist; commit 1 is wire-up-only.                                                                                                                                  |
| Q2 | Greeting personalization            | **RESOLVED-YES first-name available** (commit-0 audit, §0.8). `firstName` already extracted; rotating corpus + 50/50 first-name mix per Leo's redirect (see §2.1 + §5.5).                                                                          |
| Q3 | Audit-doc path                      | **RESOLVED — `docs/audits/post-session-review-surface-alpha-design.md`** (Leo redirect, 2026-05-08). New `docs/audits/` directory established with this round's commit 12.                                                                          |
| Q4 | Attribution surface path            | **RESOLVED — `ATTRIBUTIONS.md` at repo root** (Leo redirect, 2026-05-08). Authored at this round's commit 3, sequenced before the belt swap per CC BY-SA 3.0 distribution requirement (see §5.3).                                                  |

### §0.11 Audit-surfaced scope-change flags → final resolutions

**SF-1 (static-asset path mismatch).** **RESOLVED — SVGs already moved.** Per §0.12: belt SVGs were manually moved to `public/images/belts/` outside this Claude Code session before Leo's redirect. The audit's pre-mv framing in §0.1 audit C and §0.3 audit B is now superseded; commit 4 (belt swap) consumes the public-path directly. Net commit-envelope cost: **zero** — the file-relocation commit the audit anticipated did not need to be authored by this session.

**SF-2 (audit-doc complexity envelope).** **ACCEPTED.** The Alpha-Design audit doc is sequenced as commit 12 (last in the round, per Leo's reordered envelope), which preserves the redline's spirit ("late in the round so its findings don't pre-empt Round 2 scope decisions"). No expansion.

**SF-3 (no other scope expansions).** Confirmed; audits §0.4-§0.8 returned single-file or single-prop fix shapes consistent with the redline's commit envelope.

### §0.12 Empirical-state correction — belt SVG location (small §6.14.28 instance, benign direction)

Per Leo's 2026-05-08 redirect: belt SVGs were manually moved to `public/images/belts/` outside this Claude Code session, between the commit-0 audit (where the audits §0.1 audit C and §0.3 audit B captured the pre-mv state of `data/images/GJJ_*_Belt.svg`) and the body-authoring stage (this commit). Verification at body-authoring time:

```
$ ls public/images/belts/
GJJ_Black_Belt.svg
GJJ_Blue_Belt.svg
GJJ_Brown_Belt.svg
GJJ_White_Belt.svg

$ ls data/images/
(empty)
```

All four files present at the expected new path; the old `data/images/` location is clear. The audit's SF-1 framing (in §0.1 audit C and §0.3 audit B) now reads as a record of the pre-mv state at audit time rather than an outstanding scope concern. No edits to §0.1 or §0.3 themselves — preserving the audit-trail integrity is the right disposition for an in-flight plan-doc. SF-1 final state captured in §0.11 + §7.

This is a small instance of SPEC §6.14.28 (Plan-prose-vs-empirical-truth divergence): the plan-doc's pre-mv prose diverged from the empirical state by the time the body was authored. The direction is benign (the scope flag the audit raised was resolved more cheaply than the audit anticipated, not the reverse), and the divergence was caught at the body-authoring stage rather than at commit 4 execution time. The §0.12 note records the divergence rather than rewriting the audit prose, per the closed-plans-immutable spirit of §6.14.20 carried into the in-flight plan-doc.

### §0.13 Mid-round redirect — drop Wikimedia SVGs, adopt first-party `<BeltGraphic>` (2026-05-08)

Per Leo's mid-round redirect on 2026-05-08, the round drops the Wikimedia Commons CC BY-SA 3.0 SVG approach for the dashboard belt graphic and adopts a first-party inline SVG component (`<BeltGraphic>`) rendering the BJJ belt structure (rectangular body + offset tip block) using `<rect>` elements with project-tokenized colors.

**Reasoning.**

1. **Attribution surface simplification.** No third-party assets in the round → no `ATTRIBUTIONS.md` required → no per-asset author/source/license-link maintenance burden carried forward.
2. **Theming + responsive control.** First-party SVG built with project tokens (`bg-belt-{white,blue,brown,black}` family + new `belt-tip-{black,red}` + `belt-stroke` tokens) inherits the dark-theme overrides at `globals.css:135+` automatically; rendered at any aspect ratio via `viewBox` + `preserveAspectRatio="none"` for the `<BeltStripe>` consumer.
3. **External-license maintenance burden removed.** CC BY-SA 3.0 share-alike preservation is a forever obligation on any downstream modification of the SVGs; eliminating the third-party origin removes that obligation entirely.

**Empirical state at redirect time.** `public/images/belts/GJJ_*_Belt.svg` (untracked, 4 files) and `data/images/GJJ_*_Belt.svg` (staged-deletions, 4 files) are both becoming orphaned — the public-path files were never consumed (commit 4 had not yet executed); the staged-deletions reflect the out-of-session move from §0.12. Commit 4 (revised per §5.4) cleans up both: `git rm` the staged-deletions; `rm` the untracked public-path files. Neither set ever enters the rendering path.

**Cross-references.**

- SPEC §6.14.34 (mid-round narrow-scope sub-round insertion) — the redirect inserts a sub-round-equivalent revision into the in-flight plan-doc rather than spawning a separate plan-doc.
- SPEC §6.14.20 (in-flight plan-doc revision discipline) — the §1 / §2.3 / §5.3 / §5.4 revisions below quote-preserve the original content rather than silently rewriting; the round-close discipline lifts these revisions to immutable status.
- §0.12 — the SF-1 empirical-state correction recorded the `data/images/` → `public/images/belts/` move; that move is now itself superseded by this §0.13 redirect. §0.12 stays as the audit-trail record of the pre-redirect state; §0.13 supersedes its forward-looking implication (the `public/images/belts/` files are no longer the consumption target).

**Sections revised under this redirect.** §1 (in-scope list), §2.3 (REMOVED — no third-party assets), §5.3 (repurposed to plan-doc revision commit — this commit), §5.4 (first-party `<BeltGraphic>` implementation). Audit-trail-of-superseded-state in §0.10 Q4, §5 intro paragraph, and §7 Q4 are flagged here for round-close revision; left in place mid-flight per §6.14.20 quote-preservation spirit (these are forward-looking resolutions referencing the now-superseded ATTRIBUTIONS.md path; an in-flight rewrite would erase the audit trail of the pre-redirect plan).

### §0.14 Mid-round redirect — retire rotating greeting + title-quote corpora (2026-05-08)

Per Leo's mid-round redirect on 2026-05-08, the round retires the rotating greeting tagline corpus (§2.1 + §5.5) and the expanded title-quote corpus (§2.2 + §5.6) entirely. The existing `deriveHeadline()` editorial-signal system at `src/server/dashboard/helpers.ts:7-13` is preserved as-is.

**Trigger.** Commit-5 audit step (a) surfaced **State C** — the existing dashboard greeting block at `src/components/dashboard/score-strip.tsx:73-77` already renders `"Good morning, {firstName}. {headline}"` where `{headline}` is interpolated from `greeting.headline` (an existing data-driven prop). Source: `deriveHeadline()` at `helpers.ts:7-13`, a 4-state sim-delta-driven editorial line:

- `!hasSim` → `"Let's begin."`
- `delta === undefined` → `"Steady today."`
- `delta > 0` → `"You're climbing."`
- `delta < 0` → `"Reset and reload."`
- (else, `delta === 0`) → `"Steady today."`

The §2.1 + §5.5 rotating greeting corpus would have silently replaced this sim-state editorial signal with non-personalized motivational taglines ("Sharpen the pattern.", "Ready to drill?", etc.), losing real product information. Same logic applies to §2.2 + §5.6: the corpus's framing — "replaces single 'you're climbing'" — was based on the misreading that "You're climbing." was a single hardcoded surface; in fact it is the `delta > 0` branch of `deriveHeadline()`. Replacing the title quote with a rotated 12-quote corpus would have silently displaced the same 4-state sim-state signal.

**Reasoning.** The existing `deriveHeadline()` system carries product information (sim-delta editorial signal) that the rotating corpora would have eliminated. Three resolutions were considered at the audit-step (a) halt:

- **Resolution 1: REPLACE** — new corpus takes over the italic cobalt slot; `deriveHeadline()` retired. Rejected: discards real product information for motivational filler.
- **Resolution 2: COEXIST** — both render via layout expansion. Rejected: visual clutter; no clean place in the existing 22pt serif H2 layout for two italic-cobalt lines.
- **Resolution 3: ALTERNATING SOURCE** — session-stable signal picks which line displays. Rejected: complex; loses rotation across sim-having users.

**Resolution 4 (selected): RETIRE.** Both corpora retired entirely. `deriveHeadline()` system preserved as-is. No code changes ship from this redirect.

**Empirical state.** No code changes ship from §0.14 itself; this is a plan-doc-only revision. The implementation files originally targeted by §5.5 (`helpers.ts`, `score-strip.tsx`, `data.ts`, `types.ts`) and §5.6 (TBD title-quote rendering site) are untouched.

**Commit envelope impact.** Round commit ledger reduces from 13 → 12 commits. Commits 5 and 6 are **RETIRED-not-renumbered** per SPEC §6.14.20 in-flight quote-preservation discipline; commits 7-13 keep their existing slot numbers. The commit-3 plan-doc-revision precedent (§5.3 was REPURPOSED — kept its slot, content swapped) carries forward conceptually: §5.5 + §5.6 are RETIRED — kept their slots, content swapped to a RETIRED-marker block with quote-preservation. This commit (the §0.14 plan-doc revision itself) consumes the "commit 5" slot in the round's commit history; the original §5.5 implementation it replaces is the very thing being retired.

**Sub-pattern observation (§6.14.28 instance tracking).** This is the **third** §6.14.28-style empirical-state divergence in this round:

- §0.12 — first instance, explicit (the `data/images/` → `public/images/belts/` SVG move was discovered out-of-session at body-authoring time).
- §0.13 — second instance, primarily a SPEC §6.14.34 mid-round redirect (Wikimedia → first-party `<BeltGraphic>`) with §6.14.28 undertones (the Wikimedia approach was abandoned mid-flight).
- §0.14 — third instance, explicit (audit-step (a) State-C finding revealed plan-doc prose diverged from empirical truth: the existing `deriveHeadline()` system already occupies the JSX slot that §5.5 + §5.6 proposed to populate).

Multi-instance pattern strong; round-close §6.14 entry candidate per the second-instance-discipline (Leo's call at round-close whether to promote a new §6.14.{n} entry codifying the audit-step-surfaced-empirical-divergence pattern, or to leave the three instances as in-round prose).

**Cross-references.**

- SPEC §6.14.20 (in-flight wholesale-replacement-with-quote-preservation) — §1, §2.1, §2.2, §5.5, §5.6 all revised below with original content quote-preserved as `>` blocks; §5 intro takes a one-line addendum.
- SPEC §6.14.28 (plan-prose-vs-empirical-truth divergence) — explicit instance trigger above.
- SPEC §6.14.34 (mid-round narrow-scope sub-round insertion) — paralleled the §0.13 redirect; this redirect is narrower (no implementation; pure retirement).
- §0.13 — precedent for stacking quote-preservation blocks within a section (§1 here gets a second stacked quote-preservation block alongside §0.13's existing one).

**Sections revised under this redirect.** §1 (in-scope list — drop two bullets, stack a second quote-preservation block), §2.1 (REMOVED — corpus retired), §2.2 (REMOVED — corpus retired), §5.5 (RETIRED — implementation discontinued), §5.6 (RETIRED — implementation discontinued), §5 intro paragraph (one-line addendum noting §5.5+§5.6 retirement). Audit-trail-of-superseded-state in §0.8 audit prose, §0.10 Q2 resolution, and §7 Q2 resolution are flagged here for round-close revision; left in place mid-flight per §6.14.20 quote-preservation spirit (mirrors §0.13's collateral-handling decision for §0.10 Q4 / §5 intro / §7 Q4).

---

## §1 — Round scope (captured from redline; fenced)

### In scope (bands 1+2 only)

- Dashboard top-panel reordering: Mistakes-to-review → Days-to-test → Goal → Previous-score (with horizontal goal-line) → Previous-pace (with horizontal 18s-line)
- Mistakes-to-review: stub → real component (resolved as wire-up-only per §0.2)
- Belt-text → first-party `<BeltGraphic>` inline SVG component swap (per §0.13; supersedes the original Wikimedia-SVG-from-`public/images/belts/` approach captured below as quote-preserved record)
- Drill: rankings refresh after completion (currently stale; root cause per §0.4)
- Drill: number-series question formatting legibility fix (per §0.7)
- Drill: warning sound plays once, ticking-sound thereafter (per §0.6)
- Drill: remove extra top whitespace (per §0.7)
- Diagnostic: session timer + progress bar render (per §0.5; one-line fix)
- Review section audit against `docs/ALPHA_DESIGN.md` — written audit only, no fixes (per §0.9; fixes scheduled to Round 2)

### Explicitly deferred out of scope

- Admin portal (→ Round 3)
- Question-report mechanism in review (→ Round 2)
- Full-exam review vs wrong-only (→ Round 2)
- Combined accuracy+latency row in review (→ Round 2)
- Triage explainer + earlier triage option (→ Round 4)
- Belt-ranking algorithm change (→ Round 4; cross-references deferred sub-phase b validator)
- All review-section fixes (→ Round 2; Round 1 ships audit only)

> **Original §1 in-scope list (pre-§0.13 redirect, preserved per SPEC §6.14.20).** The bullet "Belt-text → belt-SVG swap using `public/images/belts/GJJ_{White,Blue,Brown,Black}_Belt.svg` (path corrected per §0.12)" and the bullet "CC BY-SA 3.0 attribution surface for belt SVGs" were the original in-scope items for the belt-graphic work. Both are superseded by the §0.13 redirect: the former replaced by a first-party `<BeltGraphic>` component (no public-path consumption); the latter dropped entirely (no third-party assets in the round → no attribution surface required). Quote-preserved here for audit-trail integrity; the live in-scope list above reflects the post-redirect state.

> **Original §1 in-scope list (post-§0.13, pre-§0.14 — additional bullets retired per SPEC §6.14.20).** Two bullets were dropped by the §0.14 redirect: "Rotating greeting tagline (Claude-style) — corpus captured in §2.1" and "Expanded title-quote corpus — corpus captured in §2.2". Both are superseded by the §0.14 retirement: the existing `deriveHeadline()` editorial-signal system at `src/server/dashboard/helpers.ts:7-13` is preserved as-is, and the rotating corpora that would have replaced its slot are dropped entirely. Quote-preserved here for audit-trail integrity; the live in-scope list above reflects the post-§0.14 state.

---

## §2 — Captured corpora + attribution requirements (from redline)

### §2.1 Greeting tagline corpus (rotating) — REMOVED per §0.14 redirect

REMOVED per §0.14 mid-round redirect — rotating greeting tagline retired; existing `deriveHeadline()` editorial-signal system at `src/server/dashboard/helpers.ts:7-13` preserved as-is. Original corpus preserved below as historical record per SPEC §6.14.20.

> **Original §2.1 (pre-§0.14 retirement, preserved per SPEC §6.14.20).**
>
> ### §2.1 Greeting tagline corpus (rotating)
>
> Time-of-day variants (always first-name per Leo's redirect):
>
> - "Good morning, {firstName}"
> - "Good afternoon, {firstName}"
> - "Good evening, {firstName}"
>
> Test-prep flavored prompts (rotate alongside time-of-day; ~50/50 mix between name-prefixed and not, per Leo's redirect):
>
> - "Ready to drill?" / "Ready to drill, {firstName}?"
> - "What's on your mind?" / "What's on your mind, {firstName}?"
> - "Pick up where you left off?" / "Pick up where you left off, {firstName}?"
> - "18 seconds at a time." / "18 seconds at a time, {firstName}."
> - "Today's pattern recognition?" / "Today's pattern recognition, {firstName}?"
> - "Time to triage." / "Time to triage, {firstName}."
> - "Recognize. Apply. Avoid the trap." / "Recognize. Apply. Avoid the trap, {firstName}."
> - "One more rep?" / "One more rep, {firstName}?"
> - "Sharpen the pattern." / "Sharpen the pattern, {firstName}."
> - "Speed before perfection." / "Speed before perfection, {firstName}."
> - "Drill the recognition." / "Drill the recognition, {firstName}."
> - "Build the reflex." / "Build the reflex, {firstName}."
> - "Where's your pace today?" / "Where's your pace today, {firstName}?"
> - "Five minutes, fifteen questions?" / "Five minutes, fifteen questions, {firstName}?"
> - "Patterns under pressure." / "Patterns under pressure, {firstName}."
>
> **Selection-logic invariant.** Greeting selection happens once per session, not per render. Time-of-day greeting is always first-name; test-prep prompt is randomly selected per session, with the 50/50 first-name/no-first-name split applying to the prompt only (NOT to the time-of-day). Avoids flicker on navigation. Implementation guidance in §5.5.

### §2.2 Expanded title-quote corpus (replaces single "you're climbing") — REMOVED per §0.14 redirect

REMOVED per §0.14 mid-round redirect — expanded title-quote corpus retired; the "single 'you're climbing'" framing was incorrect (it's one of four `deriveHeadline()` outputs at `helpers.ts:7-13`, not a single hardcoded surface — specifically the `delta > 0` branch). Original corpus preserved below as historical record per SPEC §6.14.20.

> **Original §2.2 (pre-§0.14 retirement, preserved per SPEC §6.14.20).**
>
> ### §2.2 Expanded title-quote corpus (replaces single "you're climbing")
>
> - "You're climbing."
> - "Pace is patience."
> - "Recognize the pattern."
> - "Trap-avoidance is technique."
> - "18 seconds is enough."
> - "Speed compounds."
> - "Triage, then solve."
> - "The shortcut is the answer."
> - "Drill builds reflex."
> - "Confidence under clock."
> - "Easy isn't easy under time."
> - "Brutal is the ceiling, not the floor."
>
> Same per-session selection invariant as §2.1; implementation guidance in §5.6.

### §2.3 Belt SVG attribution (CC BY-SA 3.0) — REMOVED per §0.13 redirect

REMOVED per §0.13 mid-round redirect — no third-party assets in this round. The belt graphic is now a first-party inline SVG component (`<BeltGraphic>`) per §5.4 (revised); no Wikimedia source, no CC BY-SA 3.0 obligations, no `ATTRIBUTIONS.md` surface required. Original requirements preserved below as historical record per SPEC §6.14.20.

The generic-naming convention from the original §2.3 (user-facing names use "white belt" / "blue belt" / etc., NOT "GJJ" branding) is **carried forward** into §5.4's `<BeltGraphic>` `aria-label` design even though §2.3 is otherwise removed; the convention is good UX hygiene independent of the attribution context that originally motivated it.

> **Original §2.3 (pre-§0.13 redirect, preserved per SPEC §6.14.20).**
>
> Source: Wikimedia Commons. License: Creative Commons Attribution-Share Alike 3.0 Unported (CC BY-SA 3.0). Files: `GJJ_White_Belt.svg`, `GJJ_Blue_Belt.svg`, `GJJ_Brown_Belt.svg`, `GJJ_Black_Belt.svg`. **Final repo path: `public/images/belts/` (per §0.12 empirical-state correction).**
>
> Requirements per CC BY-SA 3.0:
>
> 1. Attribution to original author(s) — verify Wikimedia source pages for each SVG and capture author + page URL during commit 3 (the attribution doc).
> 2. Link to license — `https://creativecommons.org/licenses/by-sa/3.0/`.
> 3. Indication of changes — note the move from `data/images/` (pre-redirect) to `public/images/belts/` (current); note any SVG metadata edits.
> 4. Downstream-share-alike preservation — anyone modifying the SVGs further inherits the license.
>
> User-facing alt text and tooltips MUST use generic belt names ("white belt", "blue belt", etc.), NOT "GJJ" branding. Internal filenames may stay as-is (`GJJ_White_Belt.svg`).

---

## §3 — Cross-references to SPEC §6.14 (audit-first checkpoint canon)

This round inherits discipline patterns from sub-phase a:

- §6.14.18, §6.14.21, §6.14.22 — audit-first checkpoint discipline applies per-commit (every §5.{n} entry below has an explicit audit step).
- §6.14.20 — wholesale-replacement-with-quote-preservation for plan-doc revisions (in-flight; round-close discipline lifts to closed-plans-immutable).
- §6.14.28 — Plan-prose-vs-empirical-truth divergence (invoked at §0.12 for the SF-1 empirical-state correction).
- §6.14.30 — additive-feature-cascade-undercount; §1's deferred-out-of-scope list above is the explicit defense.
- §6.14.31 — destructive-operation-gate template; if any commit deletes data (it shouldn't — this round is wire-up + UX), follow the canonical 5-step pattern.
- §6.14.34 — mid-round narrow-scope sub-round insertion; if any in-scope item discovers it needs sub-round expansion, document explicitly.
- §6.14.38 — tee-captured stdout for any long-running build/test verification.

---

## §4 — Cost envelope

No LLM cost this round (no generation/validation work). Round cost is engineer-time only.

---

## §5 — Commit ledger

Commit envelope per Leo's reorder (2026-05-08 redirect): attribution (commit 3) precedes the belt SVG swap (commit 4) because CC BY-SA 3.0 requires attribution whenever the licensed work is distributed; SVGs are already in the repo, so attribution is owed at the next commit boundary regardless of the swap commit.

**Commit-envelope addendum (§0.14 retirement, 2026-05-08):** §5.5 + §5.6 are RETIRED-not-renumbered (commit-5 audit-step (a) State-C finding; rotating greeting + title-quote corpora dropped). Round commit count drops from 13 → 12; commits 7-13 keep their existing slot numbers.

Each commit follows the `phase4-similar-item-generator.md` + `phase5-data-wipe.md` shape: hash placeholder, files touched, audit step (cheap pre-flight per §6.14.18 / §6.14.21 / §6.14.22), implementation notes, verification step, stop-and-report contract.

### §5.1 — Commit 1: dashboard top-panel reorder + Mistakes-to-review wire-up

**Hash:** `<TBD>` (filled at round-close).

**Files touched.**
- `src/components/dashboard/score-strip.tsx` — panel order reorder; mistakes-to-review tile renders `mistakesQueue.count` from prop.
- `src/server/dashboard/data.ts` (read-only verification — no edit expected; the orchestrator already wires `countMistakes(userId)`).

**Audit step.** Pre-flight: (a) confirm current panel order in `score-strip.tsx`; (b) verify `mistakesQueue.count` prop is non-stub at runtime by reading the dev DB — query `SELECT COUNT(DISTINCT item_id) FROM attempts a JOIN practice_sessions ps ON a.session_id = ps.id WHERE ps.user_id = $1 AND a.correct = false` and confirm a non-zero count for the dev user; (c) sanity-check `<ScoreStrip>` consumers — only `<Dashboard>` uses it.

**Implementation notes.** Reorder panels to: Mistakes-to-review → Days-to-test → Goal → Previous-score → Previous-pace. Mistakes-to-review tile's content shifts from any current placeholder/stub framing to live `mistakesQueue.count` (already populated upstream per §0.2). Tile retains existing `href="/review"` link target. The `estimatedMinutes = Math.max(1, count * 0.35)` derivation at `data.ts:79` stays unchanged. No new server queries; no schema work.

**Verification.** Visual review on `/` in dev (`bun --hot ./src/server.ts` or equivalent dev command — confirm at audit step). Confirm panel order matches; confirm Mistakes count renders the live count (cross-check with the SQL probe from the audit step).

**Stop-and-report.** Do not proceed to next commit until redirect.


> **§6.14.28 audit-surfaced empirical correction (commit-time addendum, 2026-05-08).** Audit step (d) — added to §5.1 per Leo's commit-1 redirect, executed before (a/b/c) per the redirect's ordering directive — read `src/components/dashboard/score-strip.tsx` lines 122-135 verbatim and confirmed **State A**: the Mistakes tile's render block already binds `{mistakesQueue.count}` (live data, inside `<StatTile value={...}>`), with `href={mistakesQueue.href}` on the wrapping `<a>`. The redline's "stub→real component" framing was based on visual/UX incompleteness (the tile's position in the strip — last instead of first), not data-incompleteness. **Wire-up is null; commit reduces to panel reorder only.** Audit step (b)'s runtime SQL probe is OBE (overcome by events) — code-level wire-up is intact end-to-end (per §0.2: `data.ts:79` calls `countMistakes()`; the tile renders the count). Audit step (c) confirmed `<ScoreStrip>` has exactly one render callsite (`src/components/dashboard/dashboard.tsx:42`) — no cascade. Audit step (a) captured the current panel order (Previous-score → Goal → Days-to-test → Previous-pace → Mistakes); target order (Mistakes → Days-to-test → Goal → Previous-score → Previous-pace) is the reorder operation. Implementation: reorder five JSX blocks within `<ScoreStrip>`'s render section + update the file's header comment block (lines 4-21) to reflect the new numbering (per CLAUDE.md `no-stale-comments` discipline + SPEC §6.14.26). Commit message suffix `reorder-only` per the redline's `{wire-up | reorder-only}` template. Original §5.1 prose preserved above per §6.14.20 closed-plans-immutable spirit; this addendum records the correction.

### §5.2 — Commit 2: horizontal goal-line + 18s-line

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/dashboard/score-strip.tsx` (or sibling tile component — confirm at audit step).

**Audit step.** Pre-flight: (a) locate the Previous-score tile and Previous-pace tile rendering inside `<ScoreStrip>`; (b) identify whether each tile already carries an SVG/sparkline render surface or only numeric content; (c) read the tile-prop shape — does it carry the user's goal-score and the 18s-target as data? If not, trace upstream to confirm the values are in `data.ts`'s prop construction.

**Implementation notes.** Goal-line: horizontal reference line on the Previous-score tile drawn at the user's goal-score value. 18s-line: horizontal reference line on the Previous-pace tile drawn at the 18s/question target. Implementation choice — inline SVG `<line>` element within the tile's existing render block, CSS pseudo-element with `::before` + absolute positioning, or absolute-positioned div. Prefer inline SVG for sub-pixel positioning + accessibility (can carry `aria-label` for the line's semantic meaning). Pick at commit-time per the existing tile rendering architecture; document the choice in the commit body.

**Verification.** Visual review on `/`; confirm both lines render at correct values for the dev user. Edge case: confirm rendering when the user has no prior score (render the line; the user's score is just absent).

**Stop-and-report.** Do not proceed to next commit until redirect.

### §5.3 — Commit 3: plan-doc revision (REPURPOSED per §0.13 — was ATTRIBUTIONS.md)

**Hash:** `<TBD>` (filled at round-close).

**Files touched.**
- `docs/plans/dashboard-drill-diagnostic-bug-fixes-and-design-retrofit.md` (this plan-doc) — adds §0.13; revises §1 in-scope list; removes §2.3 body (with quote-preservation); repurposes §5.3 (this commit, with quote-preservation); revises §5.4 to first-party `<BeltGraphic>` (with quote-preservation).

**Audit step.** Pre-flight: (a) re-verify the four §0.13-named sections (§1, §2.3, §5.3, §5.4) are the entire revision surface — `grep` the plan-doc for `ATTRIBUTIONS.md`, `Wikimedia`, `CC BY-SA`, `/data/images/`, `share-alike`, `attribution` and report any collateral references for redirect at round-close (do NOT silently rewrite mid-flight per SPEC §6.14.20 quote-preservation discipline); (b) confirm the empirical state of belt asset files matches §0.13's statement: 4 staged-deletions under `data/images/GJJ_*_Belt.svg` + 4 untracked under `public/images/belts/GJJ_*_Belt.svg`; (c) confirm `src/components/dashboard/belt-graphic.tsx` does NOT yet exist (commit 4 creates it); (d) pre-verify the project's Tailwind v4 CSS-based config carries existing `--belt-{white,blue,brown,black}` + `--belt-white-line` tokens at `src/styles/unstyled/globals.css` for commit 4's reference (note: there is NO `tailwind.config.ts` file — the audit-step instruction in the original §5.4 incorrectly assumed JS-based Tailwind config; commit 4's audit step inherits this empirical correction).

**Implementation notes.** Documents the §0.13 + §1 + §2.3 + §5.3 + §5.4 revisions per SPEC §6.14.20 (in-flight wholesale-replacement-with-quote-preservation). The commit body's WHY is license simplification (no CC BY-SA 3.0 share-alike forever-obligation) + theming/responsive control (project tokens + dark-theme inheritance + `viewBox`/`preserveAspectRatio="none"` consumer flexibility); the WHAT is the four-section revision. No code touched in this commit; commit 4 carries the actual `<BeltGraphic>` implementation + asset cleanup.

**Verification.** Render-check the plan-doc; confirm all quote-preservation `>` blocks are intact and verbatim against the originals (start-of-block phrasing must match the pre-edit text exactly); confirm no broken cross-references (`§0.13`, `§5.4`, `§6.14.20`, `§6.14.34`, `§0.12` all resolve to existing sections); confirm staged file set is exactly the plan-doc and nothing else (`git diff --cached --name-only` must show only the plan-doc path); confirm the working-tree staged-deletions + untracked belt-asset files are unchanged from pre-commit (those belong to commit 4).

**Stop-and-report.** Do not proceed to next commit until redirect. Reports include collateral-reference grep findings, working-tree pre/post verification, plan-doc final line count, and quote-preservation block sanity-check.

> **Original §5.3 (pre-§0.13 redirect, preserved per SPEC §6.14.20).**
>
> ### §5.3 — Commit 3: ATTRIBUTIONS.md at repo root (REORDERED — was commit 4)
>
> **Hash:** `<TBD>`.
>
> **Files touched.**
> - `ATTRIBUTIONS.md` (NEW, repo root).
>
> **Audit step.** Pre-flight: (a) re-verify SVG presence at `public/images/belts/` (per §0.12); (b) for each of the four SVGs, fetch the Wikimedia source page and capture original author + page URL + license-version confirmation. The Wikimedia source pages are externally reachable; this is a research step that bounds the commit at network-latency-plus-write rather than code-edit time. (c) confirm no existing `ATTRIBUTIONS.md` (per §0.1); confirm the `LICENSE` file's scope is software-only (so this commit doesn't conflict with existing license content).
>
> **Implementation notes.** Per §2.3 — markdown doc at repo root with one section per asset family. Belt SVG section names each file, attributes its Wikimedia source (author + page URL captured at audit step), links the license (`https://creativecommons.org/licenses/by-sa/3.0/`), notes the move from `data/images/` to `public/images/belts/`, and reaffirms the share-alike preservation requirement. Format: simple markdown headings per asset family, table for files-author-source mapping if four-plus files. The doc is the durable surface; future asset families append new sections.
>
> **Verification.** Render-check `ATTRIBUTIONS.md` in a markdown viewer (GitHub render, or `bunx markdown-it-cli` or equivalent — verify the dev tooling at audit step); confirm all four SVGs cited with author + URL + license link.
>
> **Stop-and-report.** Do not proceed to next commit until redirect.

### §5.4 — Commit 4: first-party `<BeltGraphic>` implementation (REVISED per §0.13 — was Wikimedia-SVG swap)

**Hash:** `<TBD>` (filled at round-close).

**Files touched.**

- `src/components/dashboard/belt-graphic.tsx` (NEW) — first-party inline SVG component.
- `src/components/dashboard/belt-stripe.tsx` — replace CSS-class indirection (`BELT_BG` record) with `<BeltGraphic beltColor={...} />` consumer.
- `src/styles/unstyled/globals.css` — add `--belt-tip-black`, `--belt-tip-red`, `--belt-stroke` CSS custom properties + corresponding `--color-belt-tip-black` / `--color-belt-tip-red` / `--color-belt-stroke` Tailwind v4 aliases (project uses Tailwind v4 CSS-based config — there is NO `tailwind.config.ts`; existing belt-color tokens live at `globals.css:41-72` for `:root` and `globals.css:135-154` for the dark theme override). Add dark-theme overrides for the new tokens if visual review surfaces a need; otherwise the `:root` values inherit.
- `data/images/GJJ_*_Belt.svg` (4 files) — `git rm` of the staged-deletions already in working tree (per §0.13 cleanup).
- `public/images/belts/GJJ_*_Belt.svg` (4 files) — `rm` from disk; never enters git history (untracked at commit time per §0.13).

**Audit step.** Pre-flight: (a) re-verify `belt-graphic.tsx` does NOT already exist under `src/components/dashboard/` (idempotent guard); (b) re-verify the four-color belt token VALUES in `src/styles/unstyled/globals.css` — capture verbatim for any color-correction decisions (existing values from §5.3 audit step (d): `--belt-white: oklch(94% 0.005 270)`; `--belt-blue: oklch(0.55 0.16 245)`; `--belt-brown: oklch(0.4 0.07 50)`; `--belt-black: oklch(22% 0.020 270)`; `--belt-white-line: oklch(82% 0.012 270)` is the existing lavender-line border that the new `--belt-stroke` token can mirror or replace); (c) re-confirm `<BeltStripe>` consumer count is exactly one (`<BeltRow>` at `belt-row.tsx:66`, per §0.3 audit B) — no cascade; (d) verify file states: `data/images/GJJ_*_Belt.svg` are staged-deletions; `public/images/belts/GJJ_*_Belt.svg` are untracked; `belt-graphic.tsx` does not exist; (e) confirm `<BeltStripe>` props shape (`beltColor: 'white' | 'blue' | 'brown' | 'black'`) — `<BeltGraphic>` should accept the same prop signature for drop-in substitution.

**Implementation notes.** `<BeltGraphic>` accepts a single `beltColor: 'white' | 'blue' | 'brown' | 'black'` prop (matching `<BeltStripe>`). Renders `<svg viewBox="0 0 100 22" preserveAspectRatio="none">` with three `<rect>` elements per the BJJ canonical structure observed in the four reference PNGs:

1. **Body:** full width (`x=0 y=0 width=100 height=22`); `fill` = body color per `beltColor` lookup (white = `var(--color-belt-white)`; blue = `var(--color-belt-blue)`; brown = `var(--color-belt-brown)`; black = `#000000` per BJJ canonical recognition — see exception note below); `stroke` = `var(--color-belt-stroke)`; `stroke-width="0.5"`; `vector-effect="non-scaling-stroke"` so the stroke doesn't distort under non-uniform scaling.
2. **Tip:** `x=80 y=0 width=14 height=22`; `fill` = `var(--color-belt-tip-red)` if `beltColor === 'black'`, else `var(--color-belt-tip-black)`. (Tip extents are tunable at commit-time per visual review against the four reference PNGs; the spec target is tip block at ~78-92% of length with a small body-color sliver from ~92-100%.)
3. **(Optional sliver — implicit.)** The body `<rect>` already covers `92-100%`; the tip `<rect>` is offset to leave the sliver visible. No third `<rect>` needed if the body fills the full width and the tip layers on top with the offset.

Generic `aria-label="${beltColor} belt"` per the §2.3 spirit (preserved as carried-forward UX hygiene per §2.3 revised).

**Black-belt body color exception.** Black-belt body uses pure `#000000` (NOT a `--color-belt-black` token resolving to an OKLCH near-black). Rationale: BJJ canonical black-belt recognition depends on the saturation reading as unambiguous black; the OKLCH(22%) token used elsewhere reads as dark-charcoal in practice. ALPHA_DESIGN.md §3 anti-pattern "no pure black for large areas" is a UI-chrome rule (cards, surfaces, type), NOT a representational-iconography rule; the belt graphic depicts a physical object with a culturally-specific canonical color. Document this exception inline in the component as a one-line code comment with a cross-ref to ALPHA_DESIGN.md §3.

**Color values reference (audit-step capture / commit-time tunable).** Approximate target values, to be reconciled against existing tokens at audit step (b):

- `belt-white` ≈ `#FFFFFF` (existing token uses `oklch(94% 0.005 270)` — slightly off-white; visual review at commit time decides whether to tighten to pure white for the belt body or keep the existing token value).
- `belt-blue` ≈ `#1E5BD9` (true BJJ blue, deliberately NOT Alpha cobalt `#1E00FF`).
- `belt-brown` ≈ `#5C3A1E` (warm leather).
- `belt-black` (body) = `#000000` (per exception above).
- `belt-tip-black` = `#000000` (NEW token).
- `belt-tip-red` = `#DC2626` (NEW token).
- `belt-stroke` = `#E5E3F5` (existing lavender border — may alias `--belt-white-line` or be a NEW distinct token; decide at commit time per visual review).

The audit step (b)'s verbatim-token capture is the input; only add net-new tokens or correct mismatches at implementation time.

**Verification.** Visual review across all four belt tiers (white / blue / brown / black). Spec the dev-server seed approach for switching between tiers at audit step (e) (mock `mastery_state` per tier? or 4 dev users? — pick the lower-friction path). Tab through; confirm `aria-label` announces correctly. Spot-check rendered widths at multiple `<BeltStripe>` parent sizes (since `preserveAspectRatio="none"` stretches non-uniformly — the `vector-effect="non-scaling-stroke"` should keep the stroke crisp, but verify). Confirm the post-session `<BeltIndicator>` is unaffected (separate component at `src/components/post-session/belt-indicator.tsx` — already SVG; `<BeltGraphic>` is dashboard-only). Confirm `git status` post-commit shows: belt-graphic.tsx ADDED; belt-stripe.tsx MODIFIED; globals.css MODIFIED; 4 `data/images/GJJ_*_Belt.svg` DELETED (formerly staged-deletions, now committed); `public/images/belts/` empty or removed (untracked-file cleanup is filesystem-only, not git-visible).

**Stop-and-report.** Do not proceed to next commit until redirect.

> **Original §5.4 (pre-§0.13 redirect, preserved per SPEC §6.14.20).**
>
> ### §5.4 — Commit 4: belt-text → belt-SVG swap (REORDERED — was commit 3)
>
> **Hash:** `<TBD>`.
>
> **Files touched.**
> - `src/components/dashboard/belt-stripe.tsx`.
>
> **Audit step.** Pre-flight: (a) re-verify SVGs at `public/images/belts/` (per §0.12; idempotent re-check before the swap); (b) confirm `BELT_BG` record at `belt-stripe.tsx:25-30` is the only call site for the CSS-class indirection — `grep` the codebase for `bg-belt-` to verify no other consumers; (c) confirm `<BeltStripe>` is rendered only from `<BeltRow>` at `belt-row.tsx:66` (per §0.3 audit B); (d) check `tailwind.config.ts` for any color tokens named `belt-white|blue|brown|black` that may need cleanup or stay for the post-session `<BeltIndicator>` (which already uses SVG; the tokens may remain in use there).
>
> **Implementation notes.** Replace the CSS-class indirection in `<BeltStripe>` with an `<img>` element loading from the public path: `<img src={"/images/belts/GJJ_" + capitalize(beltColor) + "_Belt.svg"} alt={beltColor + " belt"} />` (or via a typed map for the four discrete colors — prefer the map for type-safety per CLAUDE.md `no-as-type-assertion` and `type-safety` rules). Generic alt text per §2.3 (NOT "GJJ" branding). Filenames stay as-is internally. Optionally use Next.js `<Image>` if intrinsic dimensions benefit optimization; plain `<img>` is simpler for SVG and avoids the layout-shift / dimensions-required gymnastics. Pick at commit-time. Drop or repurpose the `BELT_BG` record per audit step (d).
>
> **Verification.** Visual review on `/` for all four belt tiers (white/blue/brown/black) — sign in as dev users with each tier (or seed mastery_state to each tier and verify). Tab through; confirm alt text via DevTools accessibility tree. Sanity: confirm the swap didn't regress post-session `<BeltIndicator>` (separate component; should be untouched).
>
> **Stop-and-report.** Do not proceed to next commit until redirect.

### §5.5 — Commit 5: rotating greeting tagline + selection logic — RETIRED per §0.14

RETIRED per §0.14 mid-round redirect. Commit 5 in the ledger is now the plan-doc revision commit that authored §0.14 and the §1 / §2.1 / §2.2 / §5.5 / §5.6 / §5 intro revisions documenting this retirement (i.e., this very commit). The audit-step (a) State-C finding from the prior commit-5 attempt IS the empirical justification for retirement: the existing `deriveHeadline()` system at `src/server/dashboard/helpers.ts:7-13` already populates the italic-cobalt H2 slot at `score-strip.tsx:73-77` with sim-state-driven editorial lines ("Let's begin." / "Steady today." / "You're climbing." / "Reset and reload."), and the rotating greeting tagline corpus would have silently displaced that real product information. No rotating-greeting code shipped; no `deriveGreeting()` helper exists; no implementation files touched. Commit slot 5 is RETIRED-not-renumbered per SPEC §6.14.20 in-flight discipline (commits 7-13 keep their existing slot numbers).

> **Original §5.5 (pre-§0.14 retirement, preserved per SPEC §6.14.20).**
>
> ### §5.5 — Commit 5: rotating greeting tagline + selection logic
>
> **Hash:** `<TBD>`.
>
> **Files touched.**
> - `src/server/dashboard/helpers.ts` — new `deriveGreeting()` helper.
> - `src/components/dashboard/score-strip.tsx` — consume the greeting prop instead of the hardcoded `"Good morning, {firstName}."`.
> - `src/server/dashboard/data.ts` — wire `deriveGreeting()` output into the prop construction.
> - `src/server/dashboard/types.ts` — add the greeting prop shape to the `<ScoreStrip>` props.
>
> **Audit step.** Pre-flight: (a) confirm `firstName` extraction at `data.ts:156-175` still sources from `session.user.name` and survives the `null`-name edge case (per CLAUDE.md `no-null-undefined-union` discipline — verify the boundary); (b) confirm `score-strip.tsx:69`'s current hardcoded greeting; (c) identify the session-stable seed source: prefer the practice session's `id` if a session is in progress, else hash of `(userId + day-bucket)` for the dashboard-with-no-active-session case. Verify which path the dashboard takes by reading `data.ts`'s session-loading logic.
>
> **Implementation notes.** Per §2.1 — `deriveGreeting(firstName: string, seed: string): { timeOfDay: string; prompt: string }`. Time-of-day computed from server time: `< 12:00` → "Good morning"; `< 17:00` → "Good afternoon"; else "Good evening". Time-of-day always first-name; final string template: `"${timeOfDay}, ${firstName}"`. Prompt selected from the §2.1 corpus via deterministic-from-seed rotation: `corpus[seedHash % corpus.length]`; the selected prompt has a 50% chance (also seed-derived, distinct bit slice) of being the first-name-suffixed variant. Selection is once per `data.ts` invocation — so once per server-rendered page-load — and is stable as long as the seed is stable (per-session for an active session; per-day for a no-active-session dashboard view). Avoid `Math.random()` (per Bun + Next.js RSC discipline; randomness in RSC creates per-render flicker). Use a small deterministic hash (`Bun.hash(seed)` or similar) over the seed string.
>
> **Verification.** Visual review on `/`; reload the page; confirm greeting does NOT change on reload (per-session stability). Mock-advance system time across day-bucket boundaries (or wait + re-test) to confirm rotation does eventually rotate. Manual review across 3+ sessions to spot-check rotation distribution and the 50/50 first-name/no-first-name split.
>
> **Stop-and-report.** Do not proceed to next commit until redirect.

### §5.6 — Commit 6: expanded title-quote corpus — RETIRED per §0.14

RETIRED per §0.14 mid-round redirect — bundled with §5.5 retirement. The "single 'you're climbing'" premise was based on a misreading of the existing `deriveHeadline()` system at `src/server/dashboard/helpers.ts:7-13`: "You're climbing." is the `delta > 0` branch of a 4-state sim-state-driven editorial line, not a single hardcoded surface. Replacing it with a rotated 12-quote corpus would have silently displaced the same sim-state signal that §5.5's retirement was designed to preserve. Corpus preservation captured in §2.2 (also REMOVED per §0.14, with quote-preservation). Commit slot 6 is RETIRED-not-renumbered per SPEC §6.14.20 in-flight discipline; no title-quote-rotation code shipped.

> **Original §5.6 (pre-§0.14 retirement, preserved per SPEC §6.14.20).**
>
> ### §5.6 — Commit 6: expanded title-quote corpus
>
> **Hash:** `<TBD>`.
>
> **Files touched.**
> - The title-quote rendering component (locate at audit step — likely `score-strip.tsx` or a sibling tile).
> - Possibly `src/server/dashboard/helpers.ts` if the rotation logic is shared with §5.5's greeting.
> - `src/server/dashboard/data.ts` and `types.ts` if the title-quote prop shape changes.
>
> **Audit step.** Pre-flight: (a) locate the current "you're climbing" rendering — `grep -r "climbing" src/` should surface it quickly; (b) identify the current selection logic (hardcoded? randomized?); (c) decide whether the title-quote rotation reuses §5.5's session-stable seed or uses an independent seed (independent rotation may feel more varied; same seed makes the dashboard's "feel" change as a unit). Pick at audit-step.
>
> **Implementation notes.** Per §2.2 — replace single hardcoded quote with rotation across the 12-quote corpus. Same selection-logic invariant as §5.5: session-stable, not per-render. If reusing §5.5's seed, pull a different bit slice for the rotation index to avoid lockstep with the greeting. If using an independent seed, derive it from the session/user identifiers in a parallel-but-distinct way (e.g., hash with a different salt). Document the choice in the commit body.
>
> **Verification.** Visual review on `/`; confirm title quote rotates across sessions but stays stable within a session. Confirm no first-name interpolation on title quotes (per §2.2 corpus — the title quotes are non-personalized; this is intentional and contrasts with §5.5's greeting prompt).
>
> **Stop-and-report.** Do not proceed to next commit until redirect.

### §5.7 — Commit 7: drill ranking refresh

**Hash:** `<TBD>`.

**Files touched.**
- `src/app/(app)/actions.ts` — `endSession` action (around line 129).
- Possibly `src/server/sessions/end.ts` if the workflow trigger needs to be awaited rather than fire-and-forget.

**Audit step.** Pre-flight: (a) re-verify the post-drill flow per §0.4 — read `endSession` action and confirm the call ordering (workflow trigger → revalidate); (b) determine whether `masteryRecomputeWorkflow` is awaited or fire-and-forget. If fire-and-forget, the `revalidatePath('/')` may execute before the workflow's `recomputeStep` writes complete, causing the dashboard to still serve stale data on the next render. Probe via reading `end.ts:67` and the workflow definition.

**Implementation notes.** Per §0.4 — add `revalidatePath('/')` after the workflow completes. If the workflow is currently fire-and-forget, restructure to await completion before calling `revalidatePath`. If awaiting introduces latency the user notices on submit, alternative: keep fire-and-forget but call `revalidatePath('/')` from the post-session page itself (which the user lands on immediately) once the page-load query reads the recomputed `mastery_state`. Pick at commit-time per the existing workflow shape. Surgical fix preferred over `dynamic = 'force-dynamic'` on the dashboard page (per §0.4).

**Verification.** Complete a drill, navigate to `/`, confirm belt + ranking reflects post-drill state. Repeat 2x to spot-check. Edge case: drill that ends via timer cutoff (not user submit) — confirm rankings still refresh.

**Stop-and-report.** Do not proceed to next commit until redirect.

### §5.8 — Commit 8: drill number-series formatting fix

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/item/item-prompt.tsx` — extend `renderBody()` with a number-series-aware case.

**Audit step.** Pre-flight: (a) locate sample number-series items in the dev DB (query `SELECT prompt FROM items WHERE sub_type_id = '12min_number_series' LIMIT 5`); (b) capture the prompt-text shape — newlines preserved? sequence delimiters (commas, spaces)? final blank/underscore for the answer? (c) check ALPHA_DESIGN §4 OpenType polish for tabular-nums + monospace digit guidance — already noted in §0.7.

**Implementation notes.** Extend `renderBody()` in `item-prompt.tsx` with a number-series case selected via `item.subType.id === 'number_series'` (or whatever the canonical id is — confirm at audit step). Wrap the prompt content in a styled block: `font-variant-numeric: tabular-nums`; possibly larger font-size for digit clarity; possibly explicit `font-mono` if the sequence benefits from monospace digit grouping (depends on the prompt-text shape from audit step). The fix is the legibility minimum; full Alpha Style polish on the item shell is OUT of scope (§1; that's Round 2 territory).

**Verification.** Drill a number-series item in dev; visual review on focus shell. Confirm digits align in tabular-num spacing. Cross-check 2-3 different number-series items to confirm the formatting works across prompt-text shapes.

**Stop-and-report.** Do not proceed to next commit until redirect.

> **§6.14.28 audit-surfaced empirical correction (commit-time addendum, 2026-05-08).** Audit step (b) — added during implementation per the §0.7 framing's `item.subType.id === 'number_series'` assumption — read `src/components/focus-shell/types.ts` and confirmed **State C-equivalent**: `ItemForRender` carries `id`, `body`, `options`, `selection` only; **sub-type id is NOT a property of the item shape**. Items are sub-type-opaque at the focus-shell layer. The §0.7 framing's `item.subType.id` reachability assumption is empirically incorrect. **Fix shape revised**: instead of dispatching on `item.subType.id` from inside `renderBody`, the `subTypeId` is plumbed as an optional prop through the focus-shell prop chain — drill route `/drill/[subTypeId]/run/content.tsx` already has `init.subTypeId` from `RunInit`, passes it to `<FocusShell subTypeId>`, which forwards to `<ItemSlot subTypeId>`, which forwards to `<ItemPrompt subTypeId>`, which dispatches inside `renderBody(body, subTypeId)`. Files touched expand from 1 → 6: (1) NEW `src/components/item/body-renderers/number-series.tsx` (per-paragraph `isSequenceText` heuristic + tabular-nums + `text-3xl`); (2) `src/components/item/item-prompt.tsx` (subTypeId prop + dispatch); (3) `src/components/focus-shell/item-slot.tsx` (subTypeId prop pass-through); (4) `src/components/focus-shell/types.ts` (`FocusShellProps.subTypeId?`); (5) `src/components/focus-shell/focus-shell.tsx` (subTypeId pass-through to ItemSlot); (6) `src/app/(app)/drill/[subTypeId]/run/content.tsx` (pass `init.subTypeId` to FocusShell). Canonical sub-type id at audit step (d) confirmed as `"numerical.number_series"` (per `src/config/sub-types.ts:9 + :54`), NOT `number_series` or `12min_number_series` as the §5.8 audit-step (a) sample query string assumed. **Drill-only scope per §1**: diagnostic + full_length items mix sub-types per-item; per-item dispatch would require adding `subTypeId` to `ItemForRender` (a schema-of-the-rendered-item change), out of scope for this round. This is the third explicit §6.14.28 instance in this round (§0.12 = explicit, §0.14 = explicit, §5.8 = explicit; §0.13 = §6.14.34 with §6.14.28 undertones), bringing the round's `§6.14.28-style` divergence count to four total per the §0.14 instance-tracking note. Original §5.8 prose preserved above per §6.14.20 closed-plans-immutable spirit; this addendum records the correction.

### §5.9 — Commit 9: drill warning-sound cadence

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/focus-shell/audio-ticker.ts` — `startUrgencyLoop()` (line 191) + `source.loop` (line 203).

**Audit step.** Pre-flight: (a) confirm current behavior — manually drill an item, let the per-question target elapse, listen: warning buffer should be looping (per §0.6); (b) read the synth-tick scheduling logic at `playTick()` (line 161) and `startUrgencyLoop()` (line 191) to identify how to resume synth-ticks after the warning's one-shot completion. The state transition is: `< target → synth ticks; ≥ target → warning once → ticks for remainder`.

**Implementation notes.** Per §0.6 — drop `source.loop = true` at line 203. After the warning buffer plays once, schedule synth ticks for the remainder of the per-question window. May need a small state machine in `startUrgencyLoop` to track the play-once-then-tick transition: (a) play warning buffer once; (b) on `source.onended`, restart the synth-tick scheduler at a possibly-faster cadence (the redline implies "ticking-sound thereafter" — confirm at audit step whether the post-warning ticks should match the pre-target cadence or a faster "urgency" cadence). Document the choice in the commit body. Be wary of multiple concurrent `AudioBufferSourceNode` instances if the user's per-question window expires while a prior question's tail is still scheduled — clean up on item transition.

**Verification.** Drill an item; let the per-question target elapse; listen for: (1) warning sound plays once, (2) ticking sound takes over, (3) next item starts cleanly with no audio bleed. Repeat 3x. Edge case: ending the question mid-warning (the user submits before warning completes) — confirm clean cancellation.

**Stop-and-report.** Do not proceed to next commit until redirect.

> **§6.14.28 audit-surfaced empirical correction (commit-time addendum, 2026-05-09).** Audit step (a) — added during commit-9 implementation per the §0.6 framing's "single-file fix; bounded" claim — re-read `src/components/focus-shell/audio-ticker.ts` end-to-end and SPEC §6.12 verbatim; surfaced **two compounding divergences** that triggered a halt-for-redirect on 2026-05-08 and resolution to **Path C** (drop loop + post-target ticks + SPEC §6.12 amendment) on Leo's 2026-05-08 redirect. **Divergence 1 — audit-vs-empirical scope.** §0.6 framed the fix as "Single-file fix; bounded" touching only `audio-ticker.ts`. Empirical reality: there is NO synth-tick scheduler inside `audio-ticker.ts`. Both `playTick()` and `startUrgencyLoop()` are one-shot functions invoked by external callers; the actual scheduler lives in `focus-shell.tsx:320-336` (`maybePlayPreTargetTicks` useEffect) with a strict `s < targetSec` guard that prevents post-target tick firing by design. To "schedule synth ticks for the remainder of the per-question window" (per §5.9 implementation notes) requires extending the focus-shell scheduler with a sibling `maybePlayPostTargetTicks` useEffect — NOT modifying audio-ticker. **Divergence 2 — audit-vs-SPEC reconciliation (NEW SUB-PATTERN).** §0.6 characterized `source.loop = true` as the bug to fix; SPEC §6.12 (line 1063 verbatim, pre-amendment) explicitly documented it as the design ("that buffer starts playing in a loop (`source.loop = true`) at peak gain ~0.8"). The redline's UX preference required a SPEC §6.12 **amendment** (light, scoped to the post-target paragraph + intro hybrid-model description), not a bug fix. This is a **new §6.14.28 sub-pattern** distinct from the prior in-round instances (§0.12, §0.13, §0.14, §5.8 all involved redirector-state-vs-empirical-state divergence; this one is redline-UX-framing-vs-SPEC-documented-design divergence). **Path C selected per Leo's 2026-05-08 redirect** (after considering Path A retire / Path B silence-after-warning / Path D quieten-the-loop). Design decisions: same cadence post-target as pre-target (1 tick/sec at integer seconds via `playTick`), no upper bound on post-target ticks (cleanup-on-advance is the terminator), warning sample plays once at target crossing, light SPEC §6.12 amendment with audit-trail blockquote. **Audit step (e) decision: option (ii) — keep `startUrgencyLoop`/`stopUrgencyLoop` exported names** to avoid cascading rename into the reducer-side `urgencyLoopStartedForCurrentQuestion` flag + `urgency_loop_started` action; names become slight misnomers but every concrete behavior they describe is the warning-once-then-cancel-on-advance contract. Header comment in audio-ticker + SPEC §6.12 + this addendum carry the canonical language. **Files touched expand from 1 → 4**: (1) `src/components/focus-shell/audio-ticker.ts` (drop `source.loop = true` at line 201; update header comment to match SPEC amendment language); (2) `src/components/focus-shell/focus-shell.tsx` (new `prevPostTargetSecondRef`; extend `resetTickTrackingOnAdvance` useEffect; new `maybePlayPostTargetTicks` sibling useEffect after `maybeStartUrgencyLoop`); (3) `docs/SPEC.md` §6.12 (light amendment: new audit-trail blockquote + intro paragraph reword + post-target paragraph split into "warning sample" + "post-target ticks" + final paragraph reducer-flag note); (4) this addendum. **§6.14.28 instance count update**: this is the **fifth** §6.14.28-style empirical-state divergence in this round (§0.12 = explicit; §0.13 = §6.14.34 with §6.14.28 undertones; §0.14 = explicit; §5.8 = explicit; §5.9 = explicit + new sub-pattern). The new redline-vs-SPEC sub-pattern is single-instance so far; round-close decides whether to articulate as a separate SPEC §6.14.{n} entry or fold into the broader §6.14.28 sub-pattern. Multi-instance pattern is now firmly established. Original §5.9 prose preserved above per §6.14.20 closed-plans-immutable spirit; this addendum records the correction.

### §5.10 — Commit 10: drill top-whitespace removal

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/focus-shell/focus-shell.tsx` — outermost div at line 498 (currently `className="...py-8"`).

**Audit step.** Pre-flight: (a) confirm `py-8` is the source of the extra top whitespace (visual diff in dev — `py-8` = 2rem = 32px top + bottom); (b) check whether the focus shell is reused by diagnostic + drill + (future) full-length, and confirm the top-whitespace adjustment doesn't regress any of those surfaces; (c) verify Tailwind class is the only top-padding contributor at this DOM level — no parent layout adding extra top padding.

**Implementation notes.** Per §0.7 — change `py-8` to `pt-4 pb-8` (asymmetric: reduce top, preserve bottom) or `pt-2 pb-8` (more aggressive top reduction). Pick at commit-time per visual review. Document the choice in the commit body.

**Verification.** Visual review of drill view + diagnostic view (both consume `<FocusShell>`); confirm tightened top spacing on both; confirm bottom spacing unchanged.

**Stop-and-report.** Do not proceed to next commit until redirect.

### §5.11 — Commit 11: diagnostic timer/bar fix

**Hash:** `<TBD>`.

**Files touched.**
- `src/app/(diagnostic-flow)/diagnostic/run/content.tsx` (lines 48-57).

**Audit step.** Pre-flight: (a) re-confirm diagnostic FocusShell prop set: `sessionDurationMs={null}` is the explicit short-circuit per `focus-shell.tsx:265-285`; (b) re-confirm the server-side 15-minute cutoff that gates diagnostic submissions still exists and matches the new client-side timer (so the timer doesn't drift out of sync with submission gating); (c) decide whether `paceTrackVisible` should also flip from `false` to `true` — the redline mentions "session timer + progress bar" but is silent on pace track. Probe at audit step; default is conservative (only what the redline names — keep `paceTrackVisible={false}`).

**Implementation notes.** Per §0.5 — change `sessionDurationMs` from `null` to `50 * 18_000` (= 900_000ms = 15 minutes), matching the existing server-side cutoff. `<FocusShell>` unchanged. Server-side 15-minute cutoff stays as the authoritative submission gate. `paceTrackVisible` stays `false` unless audit step finds otherwise. The chronometer (MM:SS) and `<SessionTimerBar>` (progress bar) will both render via the existing FocusShell logic at `focus-shell.tsx:265-285`.

**Verification.** Start a diagnostic in dev; confirm chronometer (MM:SS) and SessionTimerBar both render in the focus shell chrome row. Watch the timer count down; confirm it matches wall-clock and aligns with the server-side 15-minute cutoff (i.e., the timer hits zero around the same time the server cuts off). Edge case: page-load mid-diagnostic — confirm the timer accurately reflects remaining time, not full duration.

**Stop-and-report.** Do not proceed to next commit until redirect.

### §5.12 — Commit 12: review-surface ALPHA_DESIGN audit doc

**Hash:** `<TBD>`.

**Files touched.**
- `docs/audits/post-session-review-surface-alpha-design.md` (NEW).
- `docs/audits/` directory created with this commit (per §0.10 Q3).

**Audit step.** Pre-flight: (a) re-confirm review-surface component inventory per §0.9 (9 components under `src/components/post-session/`); (b) read `docs/ALPHA_DESIGN.md` end-to-end to refresh the §13 Quick Reference checklist's 16 items; (c) hash-pin the ALPHA_DESIGN.md commit (read recent commit hash for stable reference in the audit doc).

**Implementation notes.** Written audit only — per §1 OOS, no fixes (those land in Round 2). Structure: hybrid per §0.9 — §A per-component sweep (9 components, each running the §13 Quick Reference checklist), §B cross-component findings (system-level violations spanning multiple components, e.g., color-token drift, motion-easing inconsistency, copy-voice drift). Each violation tagged with severity (P0/P1/P2/P3 per the `audit` skill convention). Audit-doc sections cross-referenced to ALPHA_DESIGN.md section numbers (§3 Color, §4 Typography, §5 Layout, §6 Motion, §7 Interaction, §9 UX Writing, §10 Anti-Patterns, §13 Checklist) for rapid Round 2 resolution. The audit doc's frontmatter pins (a) the commit hash this round closes at, (b) the ALPHA_DESIGN.md commit hash referenced, (c) the date.

**Verification.** Read-through of the audit doc; sanity-check a sample of findings against ALPHA_DESIGN.md citations. No code change, no test run. The audit-doc itself is the deliverable; no behavioral verification.

**Stop-and-report.** Do not proceed to round-close until redirect.

### §5.13 — Round-close commit (administrative)

**Hash:** `<TBD>`.

**Files touched.**
- `docs/plans/dashboard-drill-diagnostic-bug-fixes-and-design-retrofit.md` — status flip from "planning" to "shipped 2026-MM-DD"; hash placeholders in §5.1-§5.12 backfilled with actual commit hashes; §7 resolutions log finalized.
- `docs/SPEC.md` — IF this round earns a new §6.14 entry (candidates: audit-doc convention establishment; SVG-out-of-session relocation pattern; the §0.12 §6.14.28 instance worth quoting). Per the second-instance discipline: only promote if the pattern recurs or the redline explicitly names a SPEC reconciliation. Default: no SPEC delta for this round.

**Audit step.** Pre-flight: (a) `git log` to capture all 12 commit hashes; (b) verify no unintended file changes since the last commit (`git status` clean); (c) run `bun test` (or equivalent) one more time to confirm green; (d) verify closed-plans-immutable per §6.14.20 — no edits to any prior closed plan-doc.

**Implementation notes.** Plan-doc status flip; hash backfill; §7 resolutions log finalized with all final states. SPEC reconciliation deferred unless a candidate pattern surfaced empirically during the round (in which case it earns a §6.14 slot per the second-instance discipline).

**Verification.** Render-check the plan-doc; confirm all hash placeholders resolved; confirm §7 has all eight resolution entries (Q1-Q4 + SF-1-SF-3 + plan-doc placement).

**Stop-and-report.** Round complete. Plan-doc shipped.

---

## §6 — Verification protocol carry-forward

Per the precedent of `phase4-similar-item-generator.md` + prior rounds:

- **Per-commit verification.** Each §5.{n} entry above has its own verification step. Visual reviews on `/` and `/drill/...` and `/diagnostic/...` are the canonical signals for UI-touching commits. `bun test` is the canonical signal for test-touching commits — none anticipated this round, but if any commit's audit step surfaces a test that needs adjustment, that gets called out explicitly per §6.14.34 (mid-round narrow-scope sub-round if expansion is needed).
- **Real-DB harness.** All audit-step probes that read DB state (e.g., §5.1's mistakes-count probe, §5.8's number-series sample fetch) run against the dev DB, not mocked, per the project's discipline.
- **No new smokes.** This round doesn't add smoke scripts. Existing smokes under `scripts/dev/smoke/` continue unchanged.
- **`tee` for any long-running stdout** per §6.14.38; not anticipated this round (no long-running pipelines).

---

## §7 — Resolutions log

Final state for each Open Q + scope flag:

- **Q1 mistakes-to-review schema:** RESOLVED-NO migration needed (per §0.2).
- **Q2 greeting personalization:** RESOLVED-YES first-name available + 50/50 first-name/no-first-name mix per Leo's redirect (per §0.8 + §2.1 + §5.5).
- **Q3 audit-doc path:** RESOLVED — `docs/audits/post-session-review-surface-alpha-design.md` (Leo redirect 2026-05-08). Establishes new `docs/audits/` directory at commit 12.
- **Q4 attribution path:** RESOLVED — `ATTRIBUTIONS.md` at repo root (Leo redirect 2026-05-08). Authored at commit 3, sequenced before commit 4 belt swap per CC BY-SA 3.0 distribution requirement.
- **SF-1 static-asset path mismatch:** RESOLVED — SVGs were moved to `public/images/belts/` outside this Claude Code session before body authoring; verified empirically at body-authoring time (per §0.12). Net commit-envelope cost: zero. Small §6.14.28 (Plan-prose-vs-empirical-truth divergence) instance in benign direction.
- **SF-2 audit-doc commit isolation:** ACCEPTED — commit 12 is the audit doc, sequenced last per the redline's commit envelope.
- **SF-3 no other scope expansions:** confirmed; audits §0.4-§0.8 returned single-file or single-prop fix shapes consistent with the redline's commit envelope.
- **Plan-doc placement:** option 1 (rename only) per Leo's redirect 2026-05-08. New filename: `docs/plans/dashboard-drill-diagnostic-bug-fixes-and-design-retrofit.md`. Cross-reference paragraph in header dropped per option 1.

---

## §8 — Out-of-round flags (none anticipated)

No out-of-round flags surfaced during commit-0 audit or body authoring. If the per-commit audit steps in §5.{n} surface anything that doesn't fit the round's scope, capture as out-of-round flags here at round close (per `phase5-data-wipe.md` §10.7 precedent).
