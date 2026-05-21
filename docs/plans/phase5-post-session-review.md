# Plan — Phase 5, sub-phase 1: post-session review surface

> **Status: shipped 2026-05-04.** The seven-commit sequence below landed on `main` cleanly:
>
>   - Commit 1 (round setup + shell-shape refactor + drill landing flip) — `c1ee435` — `chore(round-setup): run teach-alpha-style; refactor post-session into session-type-aware shell; flip drill landing; lock component render order per plan §10`
>   - Commit 2 (server-side aggregation queries + types) — `0ec6f4f` — `feat(post-session): server-side aggregation queries + derived types`
>   - Commit 3 (`<TriageScoreLine>` + `<AccuracySummary>`) — `a0aa1fd` — `feat(post-session): TriageScoreLine + AccuracySummary`
>   - Commit 4 (`<LatencySummary>`) — `c71770c` — `feat(post-session): LatencySummary`
>   - Commit 5 (`<WrongItemsBrowser>`) — `8d4195e` — `feat(post-session): WrongItemsBrowser`
>   - Commit 6 (`<StrategySurface>` + struggled-sub-type derivation + drill Continue button + full-surface audit + polish) — `eaeb882` — `feat(post-session): StrategySurface + struggled-sub-type derivation + drill Continue button; full-surface audit + polish`
>   - Commit 7 (doc reconciliation + plan close) — *this commit* — `docs(spec+prd+plan): reconcile post-session §6.5/§10.2/§10.7 to past-tense; add §6.14.18; close phase5-post-session-review`
>
> **Round-close summary.** Sub-phase 1 lands the foundation surface for Phase 5: `/post-session/[sessionId]` now renders for every session type with `<TriageScoreLine>` + `<AccuracySummary>` + `<LatencySummary>` + `<WrongItemsBrowser>` + `<StrategySurface>` in a locked nine-slot ordering (§10), with diagnostic mode adding the existing `<OnboardingTargets>` form + conditional pacing-line and drill / full_length / simulation modes adding a single Continue button → `/`. The drill landing flipped from `/` to `/post-session/[sessionId]` at commit 1 so drills now hit the same surface as diagnostics — sub-phase 3's full-length lands on the same route, sub-phase 4's click-to-highlight extends `<WrongItemsBrowser>` in place, and sub-phase 5's dojo belt indicator renders inside this shell. The Alpha Style adoption baseline ran via `teach-alpha-style` at commit 1's round setup; commits 3-5 ran component-scoped incremental audits at close; commit 6 ran the round's first full-surface audit + polish (Audit Health 19/20, one P2 fixed inline — peer single-line statements normalized to `text-foreground/80` to inherit `<TriageScoreLine>`'s WCAG AA rationale; one P3 deferred — `<WrongItemsBrowser>` `space-y-4` vs others `space-y-3`, 4-px gap, arguably matches denser content). The `text-destructive-on-text` systemic-token count holds at 1 across the post-session shell — below the 3-occurrence threshold; no structural-token addition. SPEC §6.14.18 (added in this commit) generalizes the framework-constraint-audit pattern from two load-bearing findings during the round (Next.js client/server module boundary at commit 6; Drizzle `inArray` + prepared-statement parameter binding at commit 2) so future sub-phase plans inherit the discipline. Going into sub-phase 2 (adaptive walker) planning, the codebase is now legibly clean: the post-session route is the canonical landing surface for every session type, the four review aggregations are colocated in the page per `rules/rsc-data-fetching-patterns.md`, the struggled-sub-type derivation + kind-preference selection are server-and-client-safe pure helpers in `src/server/post-session/strategy-selection.ts`, and the Alpha Style operational discipline (audit / polish at commit boundaries) is established as the round-close convention for non-focus-shell UI.

This plan covers Phase 5 sub-phase 1 — the post-session review surface that PRD §6.5 specifies for every session type (minus the strategy-review gate, cut from v1 on 2026-05-04). It is the foundation surface that sub-phases 3 (full-length) and 4 (click-to-highlight) build directly on, and that sub-phase 5 (dojo belt indicator) renders inside.

This plan was drafted audit-first against `main` post-v1-code-cleanup-round (HEAD = `74b522c` at draft time). The master plan's §3 framing is the starting point; where the audit recommends a different shape, the plan recommends that shape with rationale.

The post-session review is the user's first feedback loop after every session completion: it is what tells them how triage-disciplined they were, where they were slow vs. fast, which items they got wrong, and which strategies are worth reviewing for the sub-types they struggled with. Phase 3 sub-phase 1 shipped a diagnostic-only `<OnboardingTargets>` form + derived pacing line at `/post-session/[sessionId]`. Drill sessions currently bypass `/post-session` entirely (`SPEC §10.2` line 5 says so explicitly). Phase 5 sub-phase 1's job is to land the full PRD §6.5 review surface for every session type, fold the existing diagnostic-only onboarding form into it as a diagnostic-only section, flip the drill landing from `/` to `/post-session/[sessionId]`, and run `teach-alpha-style` as the round's one-time setup so subsequent sub-phases inherit the design system.

## 1. Why this sub-phase, why now

This is Phase 5's first sub-phase. Three forcing functions:

- **Foundation for Phase 5.** Master plan §8 carves sub-phase 1 first because three downstream sub-phases depend on the surface this builds. Sub-phase 3 (full-length) lands on this same `/post-session/[sessionId]` route after submit. Sub-phase 4 (click-to-highlight) extends the wrong-items browser this builds. Sub-phase 5 (dojo belt indicator) renders on the post-session summary this builds. Building any of those before this means duplicating part of this surface inside them, then reworking when this lands.

- **`main` is in v1-clean shape.** The v1-code-cleanup round closed on 2026-05-04 (master commit `74b522c`). The vestigial `timer_mode` enum members, the `if_then_plan` column, the `review_queue` and `strategy_views` tables, the `narrowing_ramp_completed` column, the `timerPrefs` reducer state — all dropped. The `<PostSessionShell>` is the diagnostic-only onboarding form + pacing line and nothing else. That's the cleanest possible launch pad: every line of code in `src/components/post-session/` is intentional and current; this sub-phase extends it without first having to disentangle vestigial Phase-3-shipped state.

- **Alpha Style adoption.** Master plan §10 + §11.5 pin Alpha Style as Phase 5's design system for non-focus-shell UI, with sub-phase 1's opening commit running `teach-alpha-style` as the round's one-time setup. The post-session review surface IS Alpha Style territory (master plan §10's "outside the active session" framing) — every component this sub-phase ships is a candidate for Alpha Style's `audit / normalize / polish` operational commands at commit boundaries. Threading the setup here means sub-phases 2-5 inherit the persisted Alpha-Style context without per-sub-phase setup work.

**Sub-phase 1 first.** Master plan §8's recommendation stands: this sub-phase has no Phase 5 dependencies; sub-phases 3, 4, 5 all depend on it; building it second would require building a partial post-session surface inside another sub-phase that this then reworks. Foundation-first is the obvious call.

## 2. Audit findings against `main`

The current state, as of `main` HEAD `74b522c`:

**Routing and existing surface.**
- `/post-session/[sessionId]` exists at `src/app/(diagnostic-flow)/post-session/[sessionId]/{page,content}.tsx`. Lives **inside the `(diagnostic-flow)` route group**, NOT `(app)`. The `(diagnostic-flow)` layout enforces auth-only — no diagnostic-completed gate. This is load-bearing for sub-phase 1: a user finishing their first diagnostic does not yet have `mastery_state` rows populated, so `(app)`'s diagnostic-completed gate must NOT fire on the post-session route. The route group placement stays.
- The page redirects non-diagnostic sessions to `/`. Sub-phase 1 must remove this redirect: drill (and, in sub-phase 3, full-length) sessions need to render the review surface here.
- The `(diagnostic-flow)` group's URL structure does not constrain who can navigate to the route — `/post-session/[sessionId]` is the same URL regardless of group. Drill `onEndSession` can `router.push("/post-session/" + sessionId)` even though drill itself lives under `(app)`.

**Existing components.**
- `src/components/post-session/post-session-shell.tsx` — `"use client"`. Renders heading + `<OnboardingTargets>` + optional pacing-line sentence. Hardcoded for diagnostic.
- `src/components/post-session/onboarding-targets.tsx` — diagnostic-only target-percentile + target-date capture form. Posts to `saveOnboardingTargets`. Stays.
- No `<WrongItemsBrowser>`, `<AccuracySummary>`, `<LatencySummary>`, `<TriageScoreLine>`, `<StrategySurface>` exist. All net-new.
- No `<StructuredExplanation>` exists. Sub-phase 4's territory; sub-phase 1 does not build it. The wrong-items browser this sub-phase builds renders the prose `items.explanation` column directly; click-to-highlight is layered on later.

**Server-side queries available.**
- `triageScoreForSession(sessionId)` at `src/server/triage/score.ts` — returns `{ fired: number; taken: number; ratio: number | null }`. Already covers the small-sample (`null` ratio when `fired < 3`) and zero-fired (positive-rendered "no triage events") branches per SPEC §9.7. **Reusable as-is.**
- `mastery_state` rows readable via Drizzle (`src/db/schemas/practice/mastery-state.ts`). Per-sub-type level + `wasMastered` flag. Sub-phase 1 reads, never writes.
- `sub_types` carries `latencyThresholdMs` per sub-type — needed for the threshold mark on `<LatencySummary>`. Already on disk; no fetch helper exists for "give me the latency threshold for this set of sub-type ids," but a one-shot `db.select()` against `sub_types` is trivial.
- `strategies` has `id`, `subTypeId`, `kind`, `text`. The "surfaced strategies for sub-types where the user struggled" path needs a query that joins struggled-sub-type ids against `strategies.subTypeId`.
- `pickItemRow` at `src/server/items/queries.ts` — for selection, not aggregation. Not relevant here.

**Net-new server-side query work.**
- **Per-sub-type accuracy aggregation per session.** `attempts JOIN items ON attempts.item_id = items.id` grouped by `items.subTypeId`, computing `count(*) FILTER (WHERE correct)` and `count(*)` per sub-type. Net-new.
- **Per-sub-type median latency aggregation per session.** Same join, with `percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)`. PostgreSQL ordered-set aggregate. Net-new.
- **Wrong-items list for the session.** `attempts JOIN items` filtered to `correct = false`, returning `items.id`, `items.body`, `items.optionsJson`, `items.correctAnswer`, `items.explanation`, `attempts.selectedAnswer` (so the renderer can mark which option the user chose vs. correct). Plus `items.subTypeId` so the renderer can group. Net-new.
- **Surfaced-strategies query.** Once "struggled" is resolved (see §9 below), join the resulting struggled-sub-type-ids against `strategies` and return one strategy per struggled sub-type. Net-new.

**Drill landing site.**
- `src/app/(app)/drill/[subTypeId]/run/content.tsx` line 43-47: `onEndSession` calls `endSession(sessionId)` then `router.push("/")`. SPEC §10.2 line 5 documents this explicitly ("drills land on the Mastery Map directly, NOT through `/post-session/[sessionId]`. Drill post-session UI is Phase 5"). Sub-phase 1 flips this to `router.push("/post-session/" + sessionId)`. Diagnostic's `content.tsx` already pushes to `/post-session/[sessionId]`; no change there.

**Drift between PRD §6.5 and shipped behavior.**
- PRD §6.5: review surface fires "after every session (drill, full-length test, simulation, diagnostic)." Shipped: only diagnostic.
- PRD §6.5: review contains accuracy summary by sub-type, median latency by sub-type with threshold marked, triage score, wrong items browser, surfaced strategies. Shipped: none of those — only the diagnostic onboarding form + pacing line.
- SPEC §10.7 ("Post-session review composition") describes a `<PostSessionReview>` composer over `<WrongItemsList>`, accuracy/latency summary, triage score, surfaced strategies. None of that is on disk. The current shell renders `<OnboardingTargets>` only.
- SPEC §10.2 ("Drills land on the Mastery Map directly, NOT through `/post-session/[sessionId]`. Drill post-session UI is Phase 5") is the explicit drill-bypass marker. This sub-phase is the "Phase 5" referenced in that line; the SPEC update is part of this sub-phase's close-out.

**Schema readiness.**
- `practice_sessions`: has `type`, `subTypeId`, `userId`, `startedAtMs`, `endedAtMs`. Sufficient.
- `attempts`: has `correct`, `latencyMs`, `triagePromptFired`, `triageTaken`, `selectedAnswer`, `metadataJson`. Sufficient.
- `items`: has `correctAnswer`, `optionsJson`, `explanation`, `metadataJson.structuredExplanation`, `subTypeId`. Sufficient. The `metadata_json.structuredExplanation` shape is on every live item per Phase 2's invariant; sub-phase 4 will consume it. Sub-phase 1 renders `items.explanation` (the prose column) directly; the structured form is unused this sub-phase.
- `sub_types`: has `latencyThresholdMs`, `name`. Sufficient.
- `strategies`: has `subTypeId`, `kind`, `text`. Sufficient.
- `mastery_state`: has `currentState`, `wasMastered`. Sufficient (read-only here).

**No schema migrations required.** All data is on disk; this sub-phase is purely a derivation + render layer over existing tables. Master plan §3 said "no schema migrations expected" — confirmed.

**Vestigial column note.** `practice_sessions.diagnostic_overtime_note_shown_at_ms` remains on disk per Phase 3 sub-phase 1 commit 5's explicit no-DROP-COLUMN deferral. This sub-phase does not consume it and does not drop it. The next code-cleanup round (post-Phase-5) is the right place.

## 3. Foundation refactor: session-type-aware shell and drill landing flip

### What's missing / what should exist

Today's `<PostSessionShell>` is hardcoded for the diagnostic — it renders heading + `<OnboardingTargets>` + optional pacing-line sentence. The new shell must:

- Be session-type-aware: dispatches to a render mode based on `practice_sessions.type`.
- For diagnostic: render the new review elements (accuracy/latency/triage/wrong-items/strategies) AND `<OnboardingTargets>` as a diagnostic-only section.
- For drill: render the new review elements only.
- For full-length (sub-phase 3): same render mode as drill — sub-phase 3 will land its sessions on this same shell with no full-length-specific copy in this sub-phase. The session-type-aware dispatch is designed to absorb full-length without rework.
- For simulation: not exercised in v1 (simulation is out of scope for sub-phase 1), but the dispatch's default branch routes simulation to the same render as drill so a future simulation session does not crash.

The drill route's `onEndSession` flips from `router.push("/")` to `router.push("/post-session/" + sessionId)`. The diagnostic route's push to `/post-session/[sessionId]` is unchanged.

### Recommendation

**Keep `/post-session/[sessionId]` in the `(diagnostic-flow)` route group; do NOT move it to `(app)`.** The `(app)` group's diagnostic-completed gate is exactly the gate the post-session must NOT trip on first diagnostic completion (mastery_state rows are async-populated by `masteryRecomputeWorkflow`). The `(diagnostic-flow)` group's auth-only gate is the right gate for every session type's post-session render. A drill user navigating to `/post-session/[sessionId]` passes through `(diagnostic-flow)`'s layout — auth check only — and renders, even though their drill itself ran under `(app)`. Route groups affect layout composition, not URL structure; this is safe.

**Split the shell into a session-type-aware top-level dispatcher and per-mode child components.** The shell's job becomes "dispatch to the right render given session type"; the actual review elements live in their own components (`<AccuracySummary>`, `<LatencySummary>`, etc.) so sub-phase 4 (click-to-highlight) and sub-phase 5 (belt indicator) can extend the right-sized seam without modifying the dispatcher.

### Implementation seam

- `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` — extended to load all the new data (per-sub-type accuracy + latency, triage score, wrong items, strategies, mastery state for the touched sub-types). Promises drilled to `content.tsx` per the RSC data-fetching pattern (`rules/rsc-data-fetching-patterns.md` Pattern 2 — per-page Suspense, no ViewTransition layout above this). The non-diagnostic redirect (current `if (row.type !== "diagnostic") redirect("/")`) is removed.
- `src/app/(diagnostic-flow)/post-session/[sessionId]/content.tsx` — `"use client"`, consumes the bundle of promises via `React.use()`, passes resolved values to `<PostSessionShell>`.
- `src/components/post-session/post-session-shell.tsx` — extended to accept the full review data bundle; dispatches on session type. Diagnostic mode renders review + `<OnboardingTargets>`; drill (and sub-phase 3 full-length) mode renders review only.
- `src/app/(app)/drill/[subTypeId]/run/content.tsx` line 44 — flip `router.push("/")` to `router.push("/post-session/" + init.sessionId)`. One-line change.

### Schema / state changes

**None.**

### Verification scenarios

1. **Drill landing.** Complete a 5-item drill via real-DB harness. Assert URL becomes `/post-session/[sessionId]`, NOT `/`. Assert the page renders without redirecting back to `/`.
2. **Diagnostic landing unchanged.** Complete a 50-item diagnostic. Assert URL becomes `/post-session/[sessionId]`. Assert `<OnboardingTargets>` form is present (diagnostic-only section). Assert the new review elements are also present.
3. **Drill mode renders review without onboarding form.** From scenario 1, assert no `<OnboardingTargets>` form on the drill post-session render.
4. **Cross-user redirect.** User A completes a session; user B (signed in) navigates to `/post-session/[sessionA-sessionId]`. Assert redirect to `/` (the existing owner check fires unchanged).
5. **`(app)` gate non-trigger.** A user with no completed diagnostic completes their first diagnostic; route lands on `/post-session/[sessionId]`. Assert no redirect loop to `/diagnostic` (the `(diagnostic-flow)` group's auth-only gate is what fires).

## 4. Server-side aggregation queries

### What's missing / what should exist

Three new queries plus one query-helper colocated in the post-session `page.tsx`. Per `rules/rsc-data-fetching-patterns.md`, all Drizzle prepared statements colocated in the page that initiates them.

1. **`getPerSubTypeAccuracy(sessionId)`** — `attempts JOIN items` grouped by `items.subTypeId`, returns `{ subTypeId, correct: number, total: number }[]`. Drives `<AccuracySummary>`'s ✓/✗ rendering.
2. **`getPerSubTypeLatency(sessionId)`** — `attempts JOIN items` grouped by `items.subTypeId`, returns `{ subTypeId, medianLatencyMs: number }[]`. Uses PostgreSQL `percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)`. Drives `<LatencySummary>`'s threshold-marked rendering.
3. **`getWrongItemsForSession(sessionId)`** — `attempts JOIN items` filtered to `correct = false`, returns `{ attemptId, itemId, subTypeId, body, optionsJson, correctAnswer, selectedAnswer, explanation }[]`, ordered by `attempt.id ASC` (UUIDv7 → chronological order in the session). Drives `<WrongItemsBrowser>`.
4. **`getStrategiesForSubTypes(subTypeIds: string[])`** — selects from `strategies WHERE subTypeId IN (...)`, returns `{ subTypeId, id, kind, text }[]`. Drives `<StrategySurface>`. The set of "struggled" sub-type ids is derived in-page (see §9 for the "struggled" definition); this query consumes that set.

### Recommendation

**Place these queries in `page.tsx`, NOT in `src/server/items/queries.ts`.** `rules/rsc-data-fetching-patterns.md` mandates colocation: "Drizzle prepared statements **must** be colocated in the same file as the page or layout component that initiates the fetch." `src/server/items/queries.ts` is selection-engine query plumbing (`pickItemRow`, `countAttemptsInSession`); these are render-layer aggregations. Different concern, different home.

Sub-phase 3's full-length lands on the same `page.tsx` (the same route absorbs all session types), so the colocation here is reused without duplication. There is no reason to extract into `src/server/post-session/queries.ts` — the page is the only consumer.

**Use `prepare()` for the three per-session aggregations**; the wrong-items query and the strategies query are also prepared. All read against the existing indexes:

- `attempts JOIN items` filtered by `attempts.session_id`: `attempts_session_id_idx` (already exists; carried Phase 1).
- `strategies WHERE sub_type_id = ANY(...)`: `strategies_sub_type_idx` (already exists; carried Phase 1).

Per SPEC §6.14.7 (EXPLAIN ANALYZE convention for hot-route queries), capture each query's plan during commit verification and log the cost in the commit message. Specifically watch for the per-sub-type aggregates' plan choice on the dev DB vs. production scale per SPEC §6.14.13 (dev-vs-prod planner choice) — at v1 attempt-table scale the planner may pick Seq Scan; that's not a verification failure.

### Implementation seam

- `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` — extend with the four new prepared statements and the derived-types exports (`PerSubTypeAccuracy`, `PerSubTypeLatency`, `WrongItem`, `SurfacedStrategy`) per the RSC pattern's "Export Derived Types" rule.
- The page initiates all four queries (plus the existing pacing-line and triage-score reads) as parallel promises off the resolved `sessionIdPromise`. Sub-phase 1's render is a `Promise.all` of independent reads against the same session id — the only sequential dependency is "struggled-sub-type ids must resolve before the strategies query fires," which uses promise chaining.

### Schema / state changes

**None.**

### Verification scenarios

1. **Per-sub-type accuracy correctness.** Insert a fixed-fixture session with 10 attempts across 3 sub-types, mix of correct/incorrect. Assert `getPerSubTypeAccuracy(sessionId)` returns three rows with the expected `correct` / `total` per sub-type.
2. **Per-sub-type median latency correctness.** Same fixture, attempts with known latencies (e.g., 5, 10, 15, 20, 25 ms for a sub-type). Assert `getPerSubTypeLatency(sessionId)` returns 15 ms (true median) for that sub-type. Verify the SQL `percentile_cont(0.5)` shape produces the expected value, not a `percentile_disc` or AVG variant.
3. **Wrong-items ordering.** Insert a fixture with 5 attempts (3 wrong, 2 correct) interleaved. Assert `getWrongItemsForSession(sessionId)` returns the 3 wrong rows in chronological order matching `attempt.id ASC`.
4. **Strategies query.** Insert fixture: 3 strategies for `verbal.synonyms`, 0 for `verbal.antonyms`. Call `getStrategiesForSubTypes(['verbal.synonyms', 'verbal.antonyms'])`. Assert 3 rows for `verbal.synonyms`, 0 for `verbal.antonyms`. Empty-set input returns empty array (no crash).
5. **EXPLAIN ANALYZE captured for each.** Per SPEC §6.14.7, capture and log the plan in the commit message for each of the four queries. Index Scan on `attempts_session_id_idx` for the per-session aggregates expected at production scale; dev DB may show Seq Scan and that's acceptable per §6.14.13.

## 5. `<AccuracySummary>` — ✓/✗ per sub-type, no percentages

### What's missing / what should exist

PRD §6.5 specifies "categorical: ✓ / ✗ counts, no percentages on this screen." A renderer that takes `PerSubTypeAccuracy[]` and renders one row per sub-type with `displayName`, the count of correct, and the count of incorrect. The `displayName` comes from `src/config/sub-types.ts`.

The "no percentages" constraint is load-bearing — PRD §1's framing is that triage-rate matters more than raw accuracy at v1, and percentages prime the user to fixate on accuracy rather than triage. The renderer reflects this in the typography hierarchy: counts are the primary signal; the latency summary (§6) and triage score (§7) carry equal weight; nothing on this screen is a percentage.

### Recommendation

**Component lives at `src/components/post-session/accuracy-summary.tsx`.** Pure presentational client component: `function AccuracySummary({ rows }: { rows: PerSubTypeAccuracy[] })`. No data fetching; the parent shell drills the rows in.

**Sort order: by section (verbal first), then by display name within section.** Stable; matches the Mastery Map's sort. Matches the way users think about the test layout.

**Empty-sub-type rows.** Sessions that don't touch a given sub-type don't render that row. The accuracy summary shows only sub-types the user actually answered in this session. This makes drills (single-sub-type, will show one row) and diagnostics (potentially all 11 sub-types) coherent in the same component.

### Implementation seam

- New file: `src/components/post-session/accuracy-summary.tsx`.
- New type: `PerSubTypeAccuracy = { subTypeId: SubTypeId; correct: number; total: number }`. Exported from `page.tsx` per the RSC-data-fetching-patterns export-derived-types rule.

### Schema / state changes

**None.**

### Verification scenarios

1. **Render single sub-type drill.** Drill of 5 items in `verbal.synonyms`, 4 correct. Assert one row reading "Synonyms — ✓ 4 / ✗ 1" (or the Alpha-Style-normalized equivalent typography). Assert no percentage anywhere on the row.
2. **Render diagnostic across many sub-types.** Diagnostic of 50 items spanning all 11 sub-types. Assert 11 rows. Assert all rows render counts, no percentages.
3. **Section ordering.** Diagnostic with both verbal and numerical sub-types. Assert verbal rows render before numerical rows. Assert intra-section order is by display name.
4. **Sub-type with all-correct.** A drill where the user gets every item correct. Assert the row renders "✓ N / ✗ 0" (no zero suppression).
5. **Sub-type with all-wrong.** A drill where the user gets every item wrong. Assert the row renders "✓ 0 / ✗ N".

## 6. `<LatencySummary>` — median per sub-type, threshold marked

### What's missing / what should exist

PRD §6.5: "Median latency by sub-type, with the threshold marked." Renderer takes `PerSubTypeLatency[]` plus the latency-threshold-per-sub-type map (from `src/config/sub-types.ts` — already an in-memory constant per audit; no DB call needed). Each row shows the sub-type name, the median latency, and a visual mark (line, tick, or color split) at the threshold position. Median above threshold renders distinctly from median at-or-below.

### Recommendation

**Component lives at `src/components/post-session/latency-summary.tsx`.** Pure presentational. Takes `rows: PerSubTypeLatency[]` and reads thresholds from the imported `subTypes` config — no prop-drilled threshold map needed.

**Visual treatment: a horizontal mini-track per row** with a tick at the sub-type's threshold (12s / 15s / 18s per `src/config/sub-types.ts`) and a marker at the user's median. Above-threshold markers render in the focus-shell's red-equivalent in Alpha Style's palette; at-or-below markers render in the OK-equivalent. The rationale: the threshold is the diagnostic signal; absolute milliseconds matter less than "are you above or below."

**The threshold mark is not optional.** Without it, the user sees a number devoid of context. PRD §6.5's "with the threshold marked" wording is specifically what makes this row useful vs. a generic stats line.

**Sort order.** Same as `<AccuracySummary>` (verbal first, then by display name) so the two summaries align visually row-for-row when both are on screen.

### Implementation seam

- New file: `src/components/post-session/latency-summary.tsx`.
- New type: `PerSubTypeLatency = { subTypeId: SubTypeId; medianLatencyMs: number }`. Exported from `page.tsx`.
- Reads `latencyThresholdMs` from the in-memory `subTypes` config in `src/config/sub-types.ts` (already imported elsewhere; no new dep).

### Schema / state changes

**None.**

### Verification scenarios

1. **Above-threshold rendering.** Drill in `verbal.synonyms` (12s threshold) with median latency of 16s. Assert the median-marker visual is on the above-threshold side of the threshold tick. Assert the row's color-state is the above-threshold variant.
2. **Below-threshold rendering.** Drill in `verbal.synonyms` with median latency of 9s. Assert below-threshold rendering.
3. **At-threshold edge.** Median exactly 12000ms. Assert at-or-below rendering (the contract is "median > threshold renders above"; equality lands at-or-below).
4. **Threshold per-sub-type.** Diagnostic spanning recognition (12s), quick structured reasoning (15s), and complex (18s) sub-types. Assert each row's threshold tick is at its own sub-type's value, not a shared global value.
5. **No percentages.** Assert no percentage anywhere in the rendered output (the latency summary is absolute milliseconds + threshold; the no-percentage constraint from PRD §6.5 covers this surface too).

## 7. `<TriageScoreLine>` — reuses `triageScoreForSession`, render shape new

### What's missing / what should exist

`triageScoreForSession(sessionId)` returns `{ fired, taken, ratio | null }` per SPEC §9.7. Render shape per §9.7:

- `fired === 0`: positive rendering — "no triage events: you stayed under 18s on every question."
- `fired < 3` AND `fired > 0`: small-sample branch — "small sample — N triage events" (no ratio).
- `fired >= 3`: ratio rendering — "triage adherence: M / N (P%)" — note the percentage is allowed here per SPEC §9.7's render contract; the no-percentage rule from PRD §6.5 applies to the accuracy summary specifically, NOT the triage score (the triage score's whole point is "did you take the prompt's offered exit when you were spinning"). This is the one percentage on the screen, and the small-sample/zero-fired branches mean it doesn't render in noisy contexts.

### Recommendation

**Component lives at `src/components/post-session/triage-score-line.tsx`.** Takes `score: TriageScore` (the existing `TriageScore` type from `src/server/triage/score.ts`).

**Reuse `triageScoreForSession` as-is.** No new server-side work; the function already covers all three branches per SPEC §9.7 audit. Sub-phase 1 just adds the render component.

**The percentage on this row is intentional and contractual.** SPEC §9.7's render shape predates Phase 5; the post-session review surfaces it for the first time here, but the shape is settled.

### Implementation seam

- New file: `src/components/post-session/triage-score-line.tsx`.
- Imports `TriageScore` from `src/server/triage/score.ts`.
- Page: add `triageScoreForSession(sessionId)` to the bundle of parallel promises.

### Schema / state changes

**None.**

### Verification scenarios

1. **Zero-fired rendering.** Session with 0 triage events. Assert positive copy: "no triage events: you stayed under 18s on every question."
2. **Small-sample rendering.** Session with 2 triage events. Assert "small sample — 2 triage events" (or §9.7's exact copy). Assert no ratio.
3. **Full-sample rendering.** Session with 10 fired, 7 taken. Assert "triage adherence: 7 / 10 (70%)" or §9.7's exact copy.
4. **Cross-check with rolling indicator.** The Mastery Map's `triageRolling30d` and the post-session's `triageScoreForSession` both come from the same `score.ts`; assert per-session render and rolling render don't share copy templates (they're different time windows; the post-session is "this session" not "last 30 days").

## 8. `<WrongItemsBrowser>` — display-only this sub-phase, prop boundary designed for sub-phase 4

### What's missing / what should exist

PRD §6.5: "Any wrong items, browsable. Each shows the prompt, options, correct answer, explanation." For each wrong attempt, render: the item prompt (from `items.body`), all options with the user's selected option marked (✗) and the correct option marked (✓), and the prose explanation (`items.explanation`). Items grouped by sub-type, ordered chronologically within the sub-type.

Sub-phase 1's `<WrongItemsBrowser>` is **display-only**. The structured-explanation parts and the click-to-highlight interaction land in sub-phase 4. The wrong-items browser must be designed so sub-phase 4 layers click-to-highlight on top with a permissive (small, well-scoped) edit — that's the master plan's "design the boundary, don't implement the interaction" instruction. The instruction is about prop *shape* permissiveness, not pre-loading sub-phase 4's data.

### Recommendation

**Component lives at `src/components/post-session/wrong-items-browser.tsx`.** Takes `items: WrongItem[]` where `WrongItem = { attemptId, itemId, subTypeId, body, optionsJson, correctAnswer, selectedAnswer, explanation }`. Sub-phase 1's `WrongItem` carries **only the fields its components render** — no forward-compat fields, no pre-loaded `structuredExplanation`. Sub-phase 4 extends `WrongItem` with `structuredExplanation`, extends the page query to read `items.metadata_json.structuredExplanation`, and swaps the prose render for a `<StructuredExplanation>` component — atomically, in its own commit. The boundary is permissive in the architectural sense (a single component edit + a single page-query addition), not in the data sense.

**Sub-phase 1's render of the explanation section uses `items.explanation` (the prose column) directly.** No structured form, no pre-fetched structured field.

**Browseability shape.** "Browsable" per PRD §6.5 doesn't mandate a specific UX; recommendation is **all wrong items render in a vertical list, grouped by sub-type, with sub-type headings**. No prev/next paging, no expanding accordions in v1. The list shape:

- Trivial to implement.
- Fits naturally inside the post-session shell's vertical scroll.
- Doesn't introduce a navigation state that complicates Alpha Style audit/normalize/polish at commit boundaries.
- Allows the user to skim quickly — most sessions have ≤ 10 wrong items; full-length tests have ≤ 50 of which a typical user gets 15-25 wrong.

If sub-phase plans later determine paging is needed, a paging shell can be added without changing the per-item render boundary.

**Option marking.** The user's selected option (from `attempts.selectedAnswer`, an opaque option id per SPEC §3.3.2) is marked with ✗; the correct option (from `items.correctAnswer`) is marked with ✓. Both render at their A/B/C/D/E display position computed from the item's `optionsJson` array order at render time per SPEC §3.3.2 — display labels are NOT stored.

### Implementation seam

- New file: `src/components/post-session/wrong-items-browser.tsx`.
- New type: `WrongItem` exported from `page.tsx` per the RSC-data-fetching-patterns export-derived-types rule. Carries only the fields rendered in this sub-phase — no `structuredExplanation`.

### Schema / state changes

**None.**

### Verification scenarios

1. **Wrong-items list renders prose explanation.** Drill with 3 wrong items. Assert 3 wrong-item entries. Assert each entry renders the prose `items.explanation` text.
2. **Option marking.** For one wrong item, assert the user's `selectedAnswer` option renders with ✗ and the `correctAnswer` option renders with ✓. Assert all other options render unmarked.
3. **No-wrong-items render.** Drill with 0 wrong items (perfect score). Assert the wrong-items section renders an empty-state line ("No wrong items in this session.") rather than crashing or rendering an empty container.
4. **Sub-type grouping.** Diagnostic with wrong items across multiple sub-types. Assert sub-type headings appear; wrong items group under their sub-type heading.
5. **Prose-only render.** Assert the wrong-item entry renders the prose `items.explanation` text and nothing structured. (Sub-phase 4 will introduce structured-form rendering atomically with click-to-highlight.)

## 9. `<StrategySurface>` — surfaced strategies for struggled sub-types

### What's missing / what should exist

PRD §6.5: "Surfaced strategies for sub-types where the user struggled." The renderer takes `SurfacedStrategy[]` (the strategies the page resolved for the struggled sub-types) and renders one strategy per struggled sub-type, prefixed with the sub-type's `displayName`.

The "struggled" definition is undefined in PRD §6.5 — it's a v1-product call this sub-phase has to make.

### Recommendation — definition of "struggled"

**A sub-type is "struggled" in this session if EITHER:**

1. **Accuracy below 70%** in this session's attempts on that sub-type (matches `computeMastery`'s `accuracy < 0.7 → learning` floor in SPEC §9.3 — uses the same numeric anchor that the mastery model uses for "below the floor").

OR

2. **Median latency above the sub-type's threshold** (matches the threshold `<LatencySummary>` already marks; same anchor surfaces twice — visually in the latency summary, semantically as the "struggled" trigger here).

The definition is intentionally an OR: a fast-but-wrong sub-type (low accuracy, fast latency) is struggled; a right-but-slow sub-type (high accuracy, above-threshold latency) is also struggled. Both modes deserve a strategy surface — a recognition-flavored strategy for the slow case, an elimination-flavored strategy for the fast-wrong case. The strategy library (per `src/db/schemas/catalog/strategies.ts`'s `kind` enum) already supports both.

**Numeric anchors live in `src/components/post-session/strategy-surface.tsx`** — not in a config file. v1 only has one consumer; pulling them into config is premature. If sub-phase 5's dojo work surfaces a different anchor for "struggled," that's a sub-phase 5 decision that can refactor the constant out at that time.

### Recommendation — selection of the strategy to surface

For each struggled sub-type, pick **one** strategy. The schema's `strategy_kind` enum is `'recognition' | 'technique' | 'trap'` (per `src/db/schemas/catalog/strategies.ts`); the kind preference maps from the user's per-sub-type failure mode:

| Failure mode | Definition | Preferred kind | Fallback |
|---|---|---|---|
| Fast-wrong | accuracy < 70% AND median ≤ threshold | `'trap'` | `'technique'` |
| Slow-wrong | accuracy < 70% AND median > threshold | `'recognition'` | `'technique'` |
| Slow-but-right | accuracy ≥ 70% AND median > threshold | `'recognition'` | `'technique'` |

If only one strategy exists for the sub-type, use it regardless of kind. If zero strategies exist for the sub-type, do not render a row for that sub-type.

The selection happens in `page.tsx`'s server component (after the strategies query returns), not in the rendering component. The renderer takes a flat `SurfacedStrategy[]` and renders one row per item.

### Recommendation — empty struggled-set handling

If the user struggled on zero sub-types, the `<StrategySurface>` renders an empty-state line ("No sub-types flagged this session — keep going.") rather than rendering an empty container. Same shape as `<WrongItemsBrowser>`'s empty state (§8 scenario 3).

### Implementation seam

- New file: `src/components/post-session/strategy-surface.tsx`.
- Page-level helper (in `page.tsx`): given the per-sub-type accuracy + latency data, compute `struggledSubTypeIds: SubTypeId[]`, then call `getStrategiesForSubTypes(struggledSubTypeIds)`, then apply the kind-preference selection rule, then expose `SurfacedStrategy[]` to `content.tsx`.
- New type: `SurfacedStrategy = { subTypeId: SubTypeId; strategyId: string; kind: StrategyKind; text: string }` exported from `page.tsx`.

### Schema / state changes

**None.**

### Verification scenarios

1. **Struggled trigger — low accuracy.** Drill in `verbal.synonyms` with 30% accuracy + median 8s (below threshold). Assert `verbal.synonyms` is in struggled set. Assert one strategy surfaces.
2. **Struggled trigger — slow latency.** Drill in `verbal.synonyms` with 90% accuracy + median 16s (above threshold). Assert `verbal.synonyms` is in struggled set. Assert one strategy surfaces (preferring `recognition` kind).
3. **Not struggled.** Drill in `verbal.synonyms` with 90% accuracy + median 8s. Assert `verbal.synonyms` NOT in struggled set. Assert no row for it.
4. **Multiple struggled sub-types.** Diagnostic touches all 11 sub-types; user struggles on 4. Assert 4 rows render in `<StrategySurface>`.
5. **Empty struggled set.** Drill where the user does well on every sub-type touched. Assert empty-state line ("No sub-types flagged this session — keep going.") renders.
6. **Zero strategies for a struggled sub-type.** Test fixture with no strategies for a struggled sub-type. Assert no row for that sub-type (struggled but unsurfaceable).

## 10. `<OnboardingTargets>` placement inside the new shell

### What's missing / what should exist

The existing `<OnboardingTargets>` component continues to render on the diagnostic post-session as a diagnostic-only section. The question is **where** in the shell, relative to the new review elements.

### Recommendation

**Render order (top to bottom):**

1. Heading + brief one-line summary (e.g., "Diagnostic complete" / "Drill complete").
2. `<TriageScoreLine>`.
3. `<AccuracySummary>`.
4. `<LatencySummary>`.
5. `<WrongItemsBrowser>`.
6. `<StrategySurface>`.
7. `<OnboardingTargets>` (diagnostic-only).
8. Pacing-line sentence (existing, diagnostic-only, conditional on > 15min).
9. Footer dismiss/CTA: "Save and continue" / "Continue" (the buttons already inside `<OnboardingTargets>` for diagnostic mode; a single "Continue" → `router.push('/')` for drill mode).

**Rationale:**

- **Triage score first** matches PRD §1's framing — triage discipline is the product's core differentiation; it should be the first thing the user sees post-session.
- **Accuracy then latency** — counts before milliseconds; the categorical signal lands first, the threshold-relative latency second.
- **Wrong items in the middle, strategies after** — strategies reference the sub-types where the user struggled, and the wrong items are the concrete artifacts of that struggle. Reading "here are the items you got wrong" before "here is a strategy for that sub-type" is the right pedagogical ordering.
- **Onboarding targets last on diagnostic** — the user has just finished their first session of the product and seen what calibration looks like; capturing target percentile + target date is most meaningful after they've seen the calibration data, not before. The form is NOT collapsible; it renders inline. The pacing line stays as a tail sentence per the existing Phase 3 placement.
- **Drill mode does not render `<OnboardingTargets>`** — the form is diagnostic-only. The drill CTA is a single "Continue" button → `/`.

**The form is not collapsible.** Phase 3 sub-phase 1 shipped it as inline; v1 keeps it inline. Collapsibility adds state surface for marginal value.

### Implementation seam

- `src/components/post-session/post-session-shell.tsx` — extend to dispatch by session type. Diagnostic mode renders the full sequence above. Drill mode renders 1-6 + the single Continue button. Sub-phase 3's full-length will render the same as drill mode.
- `<OnboardingTargets>` itself is unchanged — same component, same form, same `saveOnboardingTargets` action.

### Schema / state changes

**None.**

### Verification scenarios

1. **Diagnostic order.** Complete a diagnostic. Assert the rendered DOM order top-to-bottom is: heading → TriageScoreLine → AccuracySummary → LatencySummary → WrongItemsBrowser → StrategySurface → OnboardingTargets → optional pacing line.
2. **Drill order.** Complete a drill. Assert order is: heading → TriageScoreLine → AccuracySummary → LatencySummary → WrongItemsBrowser → StrategySurface → Continue button. Assert no `<OnboardingTargets>`. Assert no pacing line.
3. **Save-and-continue still works.** From the diagnostic post-session, fill the form and click Save. Assert `users.target_percentile` + `users.target_date_ms` are set. Assert `router.push("/")` fires.
4. **Skip-for-now still works.** From the diagnostic post-session, click Skip. Assert columns remain null. Assert `router.push("/")` fires.
5. **Drill Continue button.** From the drill post-session, click Continue. Assert `router.push("/")` fires.

## 11. Alpha Style: `teach-alpha-style` setup + `audit / normalize / polish` at commit boundaries

### What's missing / what should exist

Master plan §10 + §11.5: Phase 5 adopts Alpha Style as the design system for non-focus-shell UI; sub-phase 1 runs `teach-alpha-style` as the round's one-time setup. The post-session review surface (every component this sub-phase ships) IS Alpha Style territory. The `<FocusShell>` and its in-question rendering are explicitly excluded; this sub-phase touches none of it.

### Recommendation — setup posture

**Run `teach-alpha-style` as the very first action of commit 1.** Per master plan §10, `teach-alpha-style` "gathers Alpha-specific product context and persists it for subsequent passes." The setup is one-time-per-environment and inherited by every subsequent Alpha Style operation in this round and downstream sub-phases.

**Capture the `teach-alpha-style` output as part of commit 1's verification trail.** This is the durable record that the round's Alpha Style baseline was established; sub-phases 2-5 will reference it without re-running setup.

### Recommendation — operational commands at commit boundaries

Cadence: **incremental audits at commits 3-5, full-surface audit + polish at commit 6.**

- **Incremental `audit` at commits 3, 4, 5.** Each commit's audit is component-scoped — only the component(s) that just landed in that commit. Faster, easier to action, focused on what just changed.
- **Full-surface `audit` at commit 6.** Once every component has landed in its locked slot, run `audit` across the entire post-session shell. Catches drift between components and inter-component composition issues that incremental audits cannot see.
- **`normalize`** runs after `audit` if `audit` flags drift. It realigns the component (or, at commit 6, the full surface) to Alpha Style spacing, tokens, and patterns. Not every commit will need normalize; run on demand based on audit findings.
- **`polish`** runs immediately after the full-surface audit at commit 6 — it is the final quality pass for alignment, spacing, and micro-detail across the now-complete shell.

Three incremental + one full-surface + one polish is the right cadence for a five-component round: incremental keeps each commit focused, full-surface catches inter-component drift, polish closes.

The output of each `audit / normalize / polish` invocation is captured in the commit message of the commit it ran inside.

### Schema / state changes

**None.** Alpha Style is presentation-layer only.

### Verification scenarios

1. **`teach-alpha-style` ran.** Assert the setup's persisted artifact is in place after commit 1 (location per Alpha Style's documentation; verify at first invocation of `audit` in commit 3).
2. **Incremental audit at commits 3, 4, 5.** Each commit's audit is scoped to the component(s) that just landed; output captured in the commit message. No P0 issues; P1-P3 either fixed in-commit via `normalize` or filed as commit-body notes.
3. **Full-surface audit at commit 6.** Audit run across the entire post-session shell; captures inter-component drift that incremental audits cannot see. Output captured in commit 6's message. No P0 issues outstanding.
4. **`polish` final pass.** Commit 6's commit message captures `polish` output, run after the full-surface audit. No P0 / P1 issues outstanding at sub-phase close.

## 12. Sequencing and commits

**Six commits, in order.** Per master plan §3's rough estimate of 4-6 commits, this sub-phase lands at the upper end because the surface area is broad (4 net-new components + 1 net-new query module + 1 shell-shape refactor). Each commit lints, typechecks, and passes its own verification scenarios before the next is started.

1. **`chore(round-setup): run teach-alpha-style; refactor /post-session into a session-type-aware shell with locked render order; flip drill landing to /post-session/[sessionId]`.** First commit — establishes the round's Alpha Style baseline and reshapes the existing post-session to absorb the new components in their final positions. The diagnostic branch render-order is locked at commit 1 per §10; commits 3-6 add components in the locked slots (no late re-ordering). Sub-actions:
   - Run `teach-alpha-style`. Capture output.
   - Extend `<PostSessionShell>` from "diagnostic-only render" to "session-type-aware dispatch with diagnostic / drill / future-full-length branches." Lock the diagnostic and drill render-order per §10's nine-slot ordering — the slots are present in commit 1 (as empty `null`-rendering placeholders for components that haven't landed yet), so commits 3-6 swap their components into the predetermined slots without restructuring the shell. The diagnostic branch still renders `<OnboardingTargets>` + pacing line in their final slots; the drill branch is a placeholder shell until commits 3-6 fill the upper slots.
   - Remove the "non-diagnostic redirect" in `page.tsx`.
   - Flip drill `onEndSession` from `router.push("/")` to `router.push("/post-session/" + sessionId)`.
   - Commit body explicitly documents the SPEC §10.2 line-5 marker that flips at sub-phase close (the "drills land on the Mastery Map directly" sentence rewrites at commit 7).

   Verification: §3 scenarios + DOM render order matches §10's nine-slot ordering for the diagnostic branch (placeholder slots assert as empty containers in their predetermined positions).

2. **`feat(post-session): server-side aggregation queries + types`.** Adds `getPerSubTypeAccuracy`, `getPerSubTypeLatency`, `getWrongItemsForSession`, `getStrategiesForSubTypes` to `page.tsx` per §4. Exports the four derived types (`PerSubTypeAccuracy`, `PerSubTypeLatency`, `WrongItem`, `SurfacedStrategy`) for downstream commits to consume. No render changes — the data flows from the page through to `content.tsx` but `<PostSessionShell>` does not yet render it. Per §4 verification, includes EXPLAIN ANALYZE plans for each query in the commit message per SPEC §6.14.7.

   Verification: §4 scenarios + the page renders unchanged from commit 1's behavior.

3. **`feat(post-session): TriageScoreLine + AccuracySummary`.** Adds `<TriageScoreLine>` and `<AccuracySummary>` per §5 + §7 into their locked slots from commit 1. The page wires `triageScoreForSession(sessionId)` into the bundle of parallel promises. Sub-phase 1's first net-new visible behavior. Runs incremental (component-scoped) Alpha Style `audit` at commit close; `normalize` on demand.

   Verification: §5 scenarios + §7 scenarios + incremental audit clean for the two components.

4. **`feat(post-session): LatencySummary`.** Adds `<LatencySummary>` per §6 into its locked slot. Runs incremental (component-scoped) Alpha Style `audit` at commit close; `normalize` on demand.

   Verification: §6 scenarios + incremental audit clean for `<LatencySummary>`.

5. **`feat(post-session): WrongItemsBrowser`.** Adds `<WrongItemsBrowser>` per §8 into its locked slot. Renders prose `items.explanation` only; no `structuredExplanation` prop or page-query read in this sub-phase (sub-phase 4 adds both atomically). Runs incremental (component-scoped) Alpha Style `audit` at commit close; `normalize` on demand.

   Verification: §8 scenarios + incremental audit clean for `<WrongItemsBrowser>`.

6. **`feat(post-session): StrategySurface + struggled-sub-type derivation; drill Continue button; full-surface audit + polish`.** Adds `<StrategySurface>` per §9; folds in the page-level "struggled-sub-type" derivation that drives the strategies query; wires the drill "Continue" button. Render ordering is unchanged from commit 1 (the slots were locked there). Runs Alpha Style `audit` full-surface across the now-complete post-session shell, then `polish` as the final quality pass before the doc commit.

   Verification: §9 scenarios + §10 scenarios (final-state ordering re-verification) + Alpha Style full-surface audit clean + `polish` clean.

7. **`docs: SPEC §6.5 + §10.2 + §10.7 update; close phase5-post-session-review plan`.** Doc-only. SPEC §6.5 prose updated to reflect what shipped (the strategy-review-gate cut marker stays past-tense per the PRD §6.5 cut-from-v1 marker). SPEC §10.2 line 5 ("drills land on the Mastery Map directly, NOT through `/post-session/[sessionId]`. Drill post-session UI is Phase 5") rewrites past-tense — drills now land on `/post-session/[sessionId]`. SPEC §10.7 ("Post-session review composition") rewrites to describe the actual shipped composition (`<TriageScoreLine>` + `<AccuracySummary>` + `<LatencySummary>` + `<WrongItemsBrowser>` + `<StrategySurface>` + diagnostic-only `<OnboardingTargets>` + diagnostic-only pacing line). This plan's status flips to "shipped." No PRD edits — PRD §6.5 is already canonical and doesn't require amendment for this sub-phase.

## 13. Verification protocol carry-forward

Established discipline from Phase 3's four sub-phases (and especially Phase 3 sub-phase 1's §9) carries forward unchanged:

- **`playwright-core` directly** with `page.screenshot({ timeout: 30_000 })`. No MCP `browser_take_screenshot`.
- **`page.mouse.move(10, 10)`** before any post-click `getComputedStyle` measurement.
- **Real `page.click()`** for any user-interaction-gated paths — specifically the diagnostic post-session "Save and continue" / "Skip for now" / drill post-session "Continue" buttons.
- **Real-DB harness** for any verification touching `practice_sessions` / `attempts` / `mastery_state` / `strategies`. The smoke route at `src/app/phase3-smoke/page.tsx` is NOT used — sub-phase 1's verification depends on the real session-engine and aggregation-query plumbing.
- **EXPLAIN ANALYZE plans captured in commit messages** for the four new queries in commit 2 per SPEC §6.14.7.
- **Pino structured-log capture** for any error-state assertions (e.g., the cross-user redirect path firing an `info`-level log).
- **Throwaway harness scripts** under `scripts/_<commit>-harness.ts` are moved to `/tmp/` before commit so `tsgo` doesn't pick them up.
- **Smoke scripts** under `scripts/dev/smoke/` for any race-window verification — none anticipated this sub-phase, but the directory pattern is the right home if one surfaces.

**SPEC §6.14 conventions inherited.** The relevant ones for this sub-phase:

- **§6.14.7 EXPLAIN ANALYZE for hot-route queries** — the post-session route is hit on every session completion; the four new queries are captured in commit 2's message.
- **§6.14.13 dev-vs-prod planner choice** — at v1 attempts-table scale the dev DB may pick Seq Scan for the per-session aggregates; that's not a verification failure. Document the dev plan in commit 2; production will use the indexed path.
- **§6.14.11 audit-tighter-than-contract pattern** — for the per-sub-type accuracy / latency / triage / strategy contracts, when verification fails on first run, inspect SPEC §9.7 / §9.3 / PRD §6.5 contracts before rewriting code. The "struggled" definition in §9 is sub-phase 1's contract; if downstream sub-phase verification fails against this definition, the right move is to confirm the definition matches v1 product intent before coercing the engine.

**§6.14.14 / §6.14.15 NOT applicable this sub-phase.** No new ownership-scoped routes, no new server actions on auth-scoped routes. The existing `saveOnboardingTargets` is unchanged. If a future sub-phase plan in this round determines a new server action is needed (e.g., a hypothetical "mark this strategy as helpful"), §6.14.14's uniform-response-code convention and §6.14.15's hermetic-smoke pattern apply — but neither is exercised here.

**Alpha Style audit/normalize/polish trail.** Per §11, commits 3-5 capture incremental (component-scoped) `audit` output; commit 6 captures full-surface `audit` + `polish` output. The sub-phase close-out commit (7) does not run Alpha Style operations — it is doc-only.

## 14. Out of scope

Explicit list — items deliberately not addressed in sub-phase 1:

- **Click-to-highlight in the wrong-items browser.** Sub-phase 4's territory. Sub-phase 1's `<WrongItemsBrowser>` renders prose only; the `WrongItem` prop type carries no `structuredExplanation` field and the page query does not pre-fetch the structured form. Sub-phase 4 atomically extends `WrongItem`, the page query, and the explanation render in its own commit (single component edit + single page-query addition).
- **Strategy-review gate / `<StrategyReviewGate>` / `dismissPostSession` server action.** Cut from v1 per the PRD §6.5 + SPEC §7.5 + SPEC §10.3 cut-from-v1 markers. Past-tense everywhere; no v1 amendments needed.
- **Adaptive walker (`nextDifficultyTier`).** Sub-phase 2's territory. The post-session render does not visualize tier transitions in this sub-phase; sub-phase 5's belt indicator does.
- **Full-length test post-session render-specific copy.** Sub-phase 3's territory. The session-type-aware shell built here absorbs full-length when sub-phase 3 lands — the dispatch already routes full-length sessions through the same render mode as drill — but this sub-phase does not design full-length-specific copy or icons.
- **Dojo UI rename + belt indicator.** Sub-phase 5's territory. The post-session summary built here is a Phase-3-vocabulary "drill" summary; the rename and the `<BeltIndicator>` land in sub-phase 5.
- **Schema migrations.** None this sub-phase. The `practice_sessions.diagnostic_overtime_note_shown_at_ms` vestigial column stays on disk per Phase 3 sub-phase 1 commit 5's deferral.
- **PRD edits.** PRD §6.5 is already canonical for v1 (the strategy-gate cut marker is in place from the v1-cuts pass). No PRD edits this sub-phase.
- **Mastery state visualization on the post-session.** v1 reads `mastery_state` only insofar as `<StrategySurface>` reads `wasMastered` if needed (it doesn't this sub-phase — "struggled" is per-session, not lifetime). No "your mastery state changed" element on this surface; that's Mastery Map's job. The post-session and the Mastery Map are different surfaces with different jobs.
- **Per-session option shuffling.** Phase 5/6. Opaque option ids (Phase 2 deliverable) unlock it; sub-phase 1 does not consume the structure for shuffling.
- **Paging in the wrong-items browser.** v1 renders all wrong items in a flat list. If a future sub-phase plan determines paging is needed, it can be added without changing the per-item render boundary.

## 15. Open questions / resolutions

Four questions surfaced during drafting; all four resolved before implementation. The answers are folded into §3-§10 above; recorded here for traceability.

### 15.1 Server-side aggregation query placement

**Question.** Extend `src/server/items/queries.ts` (which carries existing selection-engine queries) with the four post-session aggregations, or place them in a new `src/server/post-session/queries.ts`, or colocate in `page.tsx`?

**Resolution: colocate in `page.tsx`.** Per `rules/rsc-data-fetching-patterns.md`'s explicit "Drizzle prepared statements **must** be colocated in the same file as the page or layout component that initiates the fetch." The post-session page is the only consumer; sub-phase 3's full-length lands on the same page so colocation is reused without duplication. `src/server/items/queries.ts` is selection-engine query plumbing — a different concern, wrong home. A new `src/server/post-session/queries.ts` would violate the colocation rule for marginal organizational benefit.

### 15.2 `<WrongItemsBrowser>` prop boundary for sub-phase 4 click-to-highlight

**Question.** What shape does the `WrongItem` prop type take in sub-phase 1, and what does sub-phase 4 inherit?

**Resolution.** Sub-phase 1's `WrongItem` carries only the fields its renders consume — no forward-compat fields. Sub-phase 4 will extend `WrongItem` with `structuredExplanation` atomically with the click-to-highlight UI; the prop boundary is permissive (a single component edit + a single page-query addition), not pre-populated. "Design the boundary, don't implement the interaction" applies to the architectural shape of the seam (one component file, one page-query line — sub-phase 4 edits both atomically) rather than to pre-loading sub-phase 4's data into sub-phase 1's render.

### 15.3 "Struggled" definition for `<StrategySurface>`

**Question.** PRD §6.5 says "surfaced strategies for sub-types where the user struggled" but does not define "struggled." What's the v1 definition?

**Resolution: a sub-type is "struggled" if EITHER accuracy < 70% (matches `computeMastery`'s SPEC §9.3 `accuracy < 0.7 → learning` floor) OR median latency > the sub-type's threshold (matches what `<LatencySummary>` already marks).** The OR is intentional: it catches both fast-wrong and slow-but-right failure modes. Numeric anchors live as constants in `src/server/post-session/strategy-selection.ts` (not a config file) — pulling to config is premature with one consumer; sub-phase 5's dojo work can refactor if needed. **Implementation revision (commit 6, `eaeb882`):** the original phrasing said anchors live "inside `<StrategySurface>`"; the helpers + anchors had to be extracted to a server-safe module because Next.js disallows server components from importing functions exported by `"use client"` modules. SPEC §6.14.18 generalizes the framework-constraint-audit pattern from this revision.

### 15.4 `<OnboardingTargets>` placement inside the new shell

**Question.** Where does the diagnostic-only `<OnboardingTargets>` form sit relative to the new review elements?

**Resolution: after the review elements (item 7 in the §10 ordering), before the pacing line, not collapsible.** Rationale: the user has just seen what calibration looks like; capturing target percentile + target date is most meaningful after the calibration data is on screen, not before. Inline (not collapsible) keeps the shape simple — collapsibility adds state surface for marginal value. The drill mode does not render `<OnboardingTargets>` at all; its CTA is a single "Continue" button → `/`.

### 15.5 Async-workflow race window

**Question.** Does sub-phase 1's post-session render need a `<ComputingState>`-style empty-state pane for the brief async window between `endSession`'s `masteryRecomputeWorkflow` trigger and the page's first render?

**Resolution.** No. Sub-phase 1's render does not read `mastery_state`. The four queries (per-sub-type accuracy, per-sub-type latency, wrong items, surfaced strategies) all read directly from `attempts` + `items` + `strategies` + `practice_sessions` — all of which are written synchronously by `endSession` (or earlier in the session). The post-session page sees consistent data on first render. Sub-phase 5's belt indicator (which reads `mastery_state`) will need to address the race; sub-phase 1 does not.

**Action required from Leo.** None — race-window non-bite confirmed via §2 audit + §9 'struggled' definition's per-session-only shape.
