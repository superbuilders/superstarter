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

---

## §1 — Round scope (captured from redline; fenced)

### In scope (bands 1+2 only)

- Dashboard top-panel reordering: Mistakes-to-review → Days-to-test → Goal → Previous-score (with horizontal goal-line) → Previous-pace (with horizontal 18s-line)
- Mistakes-to-review: stub → real component (resolved as wire-up-only per §0.2)
- Belt-text → belt-SVG swap using `public/images/belts/GJJ_{White,Blue,Brown,Black}_Belt.svg` (path corrected per §0.12)
- CC BY-SA 3.0 attribution surface for belt SVGs
- Rotating greeting tagline (Claude-style) — corpus captured in §2.1
- Expanded title-quote corpus — corpus captured in §2.2
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

---

## §2 — Captured corpora + attribution requirements (from redline)

### §2.1 Greeting tagline corpus (rotating)

Time-of-day variants (always first-name per Leo's redirect):

- "Good morning, {firstName}"
- "Good afternoon, {firstName}"
- "Good evening, {firstName}"

Test-prep flavored prompts (rotate alongside time-of-day; ~50/50 mix between name-prefixed and not, per Leo's redirect):

- "Ready to drill?" / "Ready to drill, {firstName}?"
- "What's on your mind?" / "What's on your mind, {firstName}?"
- "Pick up where you left off?" / "Pick up where you left off, {firstName}?"
- "18 seconds at a time." / "18 seconds at a time, {firstName}."
- "Today's pattern recognition?" / "Today's pattern recognition, {firstName}?"
- "Time to triage." / "Time to triage, {firstName}."
- "Recognize. Apply. Avoid the trap." / "Recognize. Apply. Avoid the trap, {firstName}."
- "One more rep?" / "One more rep, {firstName}?"
- "Sharpen the pattern." / "Sharpen the pattern, {firstName}."
- "Speed before perfection." / "Speed before perfection, {firstName}."
- "Drill the recognition." / "Drill the recognition, {firstName}."
- "Build the reflex." / "Build the reflex, {firstName}."
- "Where's your pace today?" / "Where's your pace today, {firstName}?"
- "Five minutes, fifteen questions?" / "Five minutes, fifteen questions, {firstName}?"
- "Patterns under pressure." / "Patterns under pressure, {firstName}."

**Selection-logic invariant.** Greeting selection happens once per session, not per render. Time-of-day greeting is always first-name; test-prep prompt is randomly selected per session, with the 50/50 first-name/no-first-name split applying to the prompt only (NOT to the time-of-day). Avoids flicker on navigation. Implementation guidance in §5.5.

### §2.2 Expanded title-quote corpus (replaces single "you're climbing")

- "You're climbing."
- "Pace is patience."
- "Recognize the pattern."
- "Trap-avoidance is technique."
- "18 seconds is enough."
- "Speed compounds."
- "Triage, then solve."
- "The shortcut is the answer."
- "Drill builds reflex."
- "Confidence under clock."
- "Easy isn't easy under time."
- "Brutal is the ceiling, not the floor."

Same per-session selection invariant as §2.1; implementation guidance in §5.6.

### §2.3 Belt SVG attribution (CC BY-SA 3.0)

Source: Wikimedia Commons. License: Creative Commons Attribution-Share Alike 3.0 Unported (CC BY-SA 3.0). Files: `GJJ_White_Belt.svg`, `GJJ_Blue_Belt.svg`, `GJJ_Brown_Belt.svg`, `GJJ_Black_Belt.svg`. **Final repo path: `public/images/belts/` (per §0.12 empirical-state correction).**

Requirements per CC BY-SA 3.0:

1. Attribution to original author(s) — verify Wikimedia source pages for each SVG and capture author + page URL during commit 3 (the attribution doc).
2. Link to license — `https://creativecommons.org/licenses/by-sa/3.0/`.
3. Indication of changes — note the move from `data/images/` (pre-redirect) to `public/images/belts/` (current); note any SVG metadata edits.
4. Downstream-share-alike preservation — anyone modifying the SVGs further inherits the license.

User-facing alt text and tooltips MUST use generic belt names ("white belt", "blue belt", etc.), NOT "GJJ" branding. Internal filenames may stay as-is (`GJJ_White_Belt.svg`).

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

### §5.3 — Commit 3: ATTRIBUTIONS.md at repo root (REORDERED — was commit 4)

**Hash:** `<TBD>`.

**Files touched.**
- `ATTRIBUTIONS.md` (NEW, repo root).

**Audit step.** Pre-flight: (a) re-verify SVG presence at `public/images/belts/` (per §0.12); (b) for each of the four SVGs, fetch the Wikimedia source page and capture original author + page URL + license-version confirmation. The Wikimedia source pages are externally reachable; this is a research step that bounds the commit at network-latency-plus-write rather than code-edit time. (c) confirm no existing `ATTRIBUTIONS.md` (per §0.1); confirm the `LICENSE` file's scope is software-only (so this commit doesn't conflict with existing license content).

**Implementation notes.** Per §2.3 — markdown doc at repo root with one section per asset family. Belt SVG section names each file, attributes its Wikimedia source (author + page URL captured at audit step), links the license (`https://creativecommons.org/licenses/by-sa/3.0/`), notes the move from `data/images/` to `public/images/belts/`, and reaffirms the share-alike preservation requirement. Format: simple markdown headings per asset family, table for files-author-source mapping if four-plus files. The doc is the durable surface; future asset families append new sections.

**Verification.** Render-check `ATTRIBUTIONS.md` in a markdown viewer (GitHub render, or `bunx markdown-it-cli` or equivalent — verify the dev tooling at audit step); confirm all four SVGs cited with author + URL + license link.

**Stop-and-report.** Do not proceed to next commit until redirect.

### §5.4 — Commit 4: belt-text → belt-SVG swap (REORDERED — was commit 3)

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/dashboard/belt-stripe.tsx`.

**Audit step.** Pre-flight: (a) re-verify SVGs at `public/images/belts/` (per §0.12; idempotent re-check before the swap); (b) confirm `BELT_BG` record at `belt-stripe.tsx:25-30` is the only call site for the CSS-class indirection — `grep` the codebase for `bg-belt-` to verify no other consumers; (c) confirm `<BeltStripe>` is rendered only from `<BeltRow>` at `belt-row.tsx:66` (per §0.3 audit B); (d) check `tailwind.config.ts` for any color tokens named `belt-white|blue|brown|black` that may need cleanup or stay for the post-session `<BeltIndicator>` (which already uses SVG; the tokens may remain in use there).

**Implementation notes.** Replace the CSS-class indirection in `<BeltStripe>` with an `<img>` element loading from the public path: `<img src={"/images/belts/GJJ_" + capitalize(beltColor) + "_Belt.svg"} alt={beltColor + " belt"} />` (or via a typed map for the four discrete colors — prefer the map for type-safety per CLAUDE.md `no-as-type-assertion` and `type-safety` rules). Generic alt text per §2.3 (NOT "GJJ" branding). Filenames stay as-is internally. Optionally use Next.js `<Image>` if intrinsic dimensions benefit optimization; plain `<img>` is simpler for SVG and avoids the layout-shift / dimensions-required gymnastics. Pick at commit-time. Drop or repurpose the `BELT_BG` record per audit step (d).

**Verification.** Visual review on `/` for all four belt tiers (white/blue/brown/black) — sign in as dev users with each tier (or seed mastery_state to each tier and verify). Tab through; confirm alt text via DevTools accessibility tree. Sanity: confirm the swap didn't regress post-session `<BeltIndicator>` (separate component; should be untouched).

**Stop-and-report.** Do not proceed to next commit until redirect.

### §5.5 — Commit 5: rotating greeting tagline + selection logic

**Hash:** `<TBD>`.

**Files touched.**
- `src/server/dashboard/helpers.ts` — new `deriveGreeting()` helper.
- `src/components/dashboard/score-strip.tsx` — consume the greeting prop instead of the hardcoded `"Good morning, {firstName}."`.
- `src/server/dashboard/data.ts` — wire `deriveGreeting()` output into the prop construction.
- `src/server/dashboard/types.ts` — add the greeting prop shape to the `<ScoreStrip>` props.

**Audit step.** Pre-flight: (a) confirm `firstName` extraction at `data.ts:156-175` still sources from `session.user.name` and survives the `null`-name edge case (per CLAUDE.md `no-null-undefined-union` discipline — verify the boundary); (b) confirm `score-strip.tsx:69`'s current hardcoded greeting; (c) identify the session-stable seed source: prefer the practice session's `id` if a session is in progress, else hash of `(userId + day-bucket)` for the dashboard-with-no-active-session case. Verify which path the dashboard takes by reading `data.ts`'s session-loading logic.

**Implementation notes.** Per §2.1 — `deriveGreeting(firstName: string, seed: string): { timeOfDay: string; prompt: string }`. Time-of-day computed from server time: `< 12:00` → "Good morning"; `< 17:00` → "Good afternoon"; else "Good evening". Time-of-day always first-name; final string template: `"${timeOfDay}, ${firstName}"`. Prompt selected from the §2.1 corpus via deterministic-from-seed rotation: `corpus[seedHash % corpus.length]`; the selected prompt has a 50% chance (also seed-derived, distinct bit slice) of being the first-name-suffixed variant. Selection is once per `data.ts` invocation — so once per server-rendered page-load — and is stable as long as the seed is stable (per-session for an active session; per-day for a no-active-session dashboard view). Avoid `Math.random()` (per Bun + Next.js RSC discipline; randomness in RSC creates per-render flicker). Use a small deterministic hash (`Bun.hash(seed)` or similar) over the seed string.

**Verification.** Visual review on `/`; reload the page; confirm greeting does NOT change on reload (per-session stability). Mock-advance system time across day-bucket boundaries (or wait + re-test) to confirm rotation does eventually rotate. Manual review across 3+ sessions to spot-check rotation distribution and the 50/50 first-name/no-first-name split.

**Stop-and-report.** Do not proceed to next commit until redirect.

### §5.6 — Commit 6: expanded title-quote corpus

**Hash:** `<TBD>`.

**Files touched.**
- The title-quote rendering component (locate at audit step — likely `score-strip.tsx` or a sibling tile).
- Possibly `src/server/dashboard/helpers.ts` if the rotation logic is shared with §5.5's greeting.
- `src/server/dashboard/data.ts` and `types.ts` if the title-quote prop shape changes.

**Audit step.** Pre-flight: (a) locate the current "you're climbing" rendering — `grep -r "climbing" src/` should surface it quickly; (b) identify the current selection logic (hardcoded? randomized?); (c) decide whether the title-quote rotation reuses §5.5's session-stable seed or uses an independent seed (independent rotation may feel more varied; same seed makes the dashboard's "feel" change as a unit). Pick at audit-step.

**Implementation notes.** Per §2.2 — replace single hardcoded quote with rotation across the 12-quote corpus. Same selection-logic invariant as §5.5: session-stable, not per-render. If reusing §5.5's seed, pull a different bit slice for the rotation index to avoid lockstep with the greeting. If using an independent seed, derive it from the session/user identifiers in a parallel-but-distinct way (e.g., hash with a different salt). Document the choice in the commit body.

**Verification.** Visual review on `/`; confirm title quote rotates across sessions but stays stable within a session. Confirm no first-name interpolation on title quotes (per §2.2 corpus — the title quotes are non-personalized; this is intentional and contrasts with §5.5's greeting prompt).

**Stop-and-report.** Do not proceed to next commit until redirect.

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

### §5.9 — Commit 9: drill warning-sound cadence

**Hash:** `<TBD>`.

**Files touched.**
- `src/components/focus-shell/audio-ticker.ts` — `startUrgencyLoop()` (line 191) + `source.loop` (line 203).

**Audit step.** Pre-flight: (a) confirm current behavior — manually drill an item, let the per-question target elapse, listen: warning buffer should be looping (per §0.6); (b) read the synth-tick scheduling logic at `playTick()` (line 161) and `startUrgencyLoop()` (line 191) to identify how to resume synth-ticks after the warning's one-shot completion. The state transition is: `< target → synth ticks; ≥ target → warning once → ticks for remainder`.

**Implementation notes.** Per §0.6 — drop `source.loop = true` at line 203. After the warning buffer plays once, schedule synth ticks for the remainder of the per-question window. May need a small state machine in `startUrgencyLoop` to track the play-once-then-tick transition: (a) play warning buffer once; (b) on `source.onended`, restart the synth-tick scheduler at a possibly-faster cadence (the redline implies "ticking-sound thereafter" — confirm at audit step whether the post-warning ticks should match the pre-target cadence or a faster "urgency" cadence). Document the choice in the commit body. Be wary of multiple concurrent `AudioBufferSourceNode` instances if the user's per-question window expires while a prior question's tail is still scheduled — clean up on item transition.

**Verification.** Drill an item; let the per-question target elapse; listen for: (1) warning sound plays once, (2) ticking sound takes over, (3) next item starts cleanly with no audio bleed. Repeat 3x. Edge case: ending the question mid-warning (the user submits before warning completes) — confirm clean cancellation.

**Stop-and-report.** Do not proceed to next commit until redirect.

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
