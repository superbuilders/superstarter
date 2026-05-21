# Plan — Phase 3, sub-phase 1: the diagnostic flow

> **Status: shipped 2026-05-04.** The five-commit sequence below landed on `main` cleanly:
>
>   - Commit 1 — `468dda6` — `refactor(diagnostic): collapse abandonInProgressDiagnosticsAndStart into startSession's idempotency`
>   - Commit 2 — `05bee1d` — `feat(diagnostic): re-establish untimed-diagnostic framing; remove in-flow overtime overlay`
>   - Commit 3 — `5a73364` — `feat(post-session): replace overtime-flag rendering with derived pacing line`
>   - Commit 4 — `f7fae7b` — `test(diagnostic): cover deterministic-permutation, within-cell-salt sampling, and mastery-recompute side-effect`
>   - Commit 5 — *this commit* — `docs: close phase3-diagnostic-flow plan; SPEC §6.10 / §6.14 + architecture-plan diagnostic paragraph`
>
> Production deploy is gated on sub-phase 2 (Mastery Map) per the deploy-coupling note in §1; merge sat on `main` between rounds.
>
> This plan was the canonical reference for sub-phase 1 of Phase 3 (the diagnostic flow). The focus shell (`src/components/focus-shell/focus-shell.tsx`) was treated as a stable dependency — the seven commits of `docs/plans/focus-shell-post-overhaul-fixes.md` shipped on 2026-05-04 and were not touched here. Where this plan disagrees with prior Phase 3 plans (`docs/plans/phase-3-practice-surface.md`, `docs/plans/phase-3-polish-practice-surface-features.md`) it wins for the diagnostic surface; in particular, the polish round's "diagnostic 15-minute hard cutoff" reversal (polish §3.1) is itself reversed back to PRD §4.1 / architecture-plan §"User journey data flow" §2 — **the diagnostic is untimed at the session level, capacity measurement, not triage**. See §4 for the rationale and §11 for the resolved decisions that depend on this call.

The diagnostic is the user's first end-to-end session. It is the first time `(app)/layout.tsx`'s gate fires for a new user, the first time `<FocusShell>` mounts against a real-DB-backed session, and the first time `masteryRecomputeWorkflow` runs with a populated `attempts` window. This sub-phase's job is to make that path land cleanly: explainer page → focus-shell-mounted run → 50 attempts → post-session capture of target percentile + target date → Mastery Map (sub-phase 2). Everything else in Phase 3 — the Mastery Map render itself, the standard drill flow, heartbeats, and the abandon-sweep cron — is later sub-phases.

## 1. Why this sub-phase, why now

The work clusters around a single user-visible flow that has to land in one coherent shape before any later sub-phase makes sense:

- **Sub-phase 1 (this plan): diagnostic flow.** Routing, item materialization, focus-shell config, completion → post-session, target-capture form, abandonment-detection schema only.
- **Sub-phase 2: Mastery Map.** Requires sub-phase 1's `mastery_state` rows to exist. The Map's redirect from `/post-session/[sessionId]` is the diagnostic's only landing surface — if the Map doesn't render, sub-phase 1 is end-to-end-unverifiable but not blocked.
- **Sub-phase 3: standard drill mode.** Requires sub-phase 1's `(app)/layout.tsx` gate (drill routes are gated on a completed diagnostic) and sub-phase 2's near-goal computation (drill recommendation comes from mastery state).
- **Sub-phase 4: heartbeats + abandon-sweep cron.** Requires sub-phase 1's schema flags so the cron's UPDATE writes a column that already exists. Sub-phase 1 does NOT ship the heartbeat client, the heartbeat route handler, or the cron.

Sub-phase 1 first because it is the only sub-phase whose user surface stands alone: a brand-new user can sign in, take the diagnostic, and reach the post-session capture form without sub-phases 2/3/4 existing. Sub-phases 2 and 3 are unreachable from a fresh account until sub-phase 1 ships. The "/diagnostic → /diagnostic/run → /post-session/[sessionId] → /" loop closes on the Mastery Map; until sub-phase 2, the post-session form's "Save and continue" pushes to a 404. That's acceptable for sub-phase 1's verification harness (which exits at the post-session form) and is fixed the moment sub-phase 2 lands.

**Deploy coupling.** Sub-phase 1 lands on `main` independently but does NOT deploy to production users until sub-phase 2 is also ready; the post-session form's "Save and continue" would otherwise hit a 404 Mastery Map. Merge sub-phase 1 to `main`, hold the production promotion until sub-phase 2 lands, then promote both together. Verification harness work and dogfooding can happen on `main` against the local dev stack in the interim.

## 2. Routing — `/diagnostic` (explainer) and `/diagnostic/run` (session)

### What's missing / what should exist

Two routes plus a route-group layout, sitting in a sibling `(diagnostic-flow)` group so they carry the auth gate but NOT the diagnostic-completed gate that the `(app)` group enforces:

```
src/app/
├── (app)/
│   └── layout.tsx               // gate: redirects to /diagnostic if no completed diagnostic
└── (diagnostic-flow)/
    ├── layout.tsx               // gate: auth only
    ├── diagnostic/
    │   ├── page.tsx             // explainer — server component
    │   └── run/
    │       ├── page.tsx         // server component, initiates startSession promise
    │       └── content.tsx      // "use client", consumes promise, mounts <FocusShell>
    └── post-session/[sessionId]/
        ├── page.tsx             // server component, loads session row
        └── content.tsx          // "use client", renders post-session shell + capture form
```

The split between `/diagnostic` (explainer) and `/diagnostic/run` (the actual session) is load-bearing for two reasons:

1. **The `(app)/layout.tsx` redirect target is `/diagnostic`, not `/diagnostic/run`.** Users who haven't completed the diagnostic land on the explainer first, read what the diagnostic measures, and click "Start Diagnostic" to enter the run. Redirecting straight into `/diagnostic/run` would skip the framing AND insert a `practice_sessions` row on every layout-gated navigation — a user who briefly clicks `/` while a prior diagnostic is mid-flight would otherwise create a second row.
2. **The run page's `startSession` promise is initiated at server-component time, not on user click.** The explainer's "Start Diagnostic" link is a `<a href="/diagnostic/run">` (or, once Next typed-routes propagates the new route, a `<Link>`); arriving at the run page is what fires the action. The first item is server-rendered into the page response, matching the architecture-plan's first-paint latency contract.

### Implementation seam

Two route-group layouts, both following the gate-promise + Suspense pattern from `rules/rsc-data-fetching-patterns.md` (specifically Pattern 1, the layout-Suspense pattern, since both layouts persist across navigations within the group):

- **`src/app/(app)/layout.tsx`**: queries `practice_sessions` for a completed-not-abandoned diagnostic. If absent, `redirect("/diagnostic")`. Reads via the `practice_sessions_user_type_ended_idx` index per SPEC §3.4. Logs the redirect at `info` level keyed by `userId`.
- **`src/app/(diagnostic-flow)/layout.tsx`**: auth-only gate. Wraps both `/diagnostic` and `/post-session/[sessionId]` (the post-session route is mounted under this group because the user reaching it has, by definition, just completed the diagnostic but the `mastery_state` rows aren't yet visible to the `(app)` gate's filter — the post-session route needs to be reachable without the `(app)` gate retriggering and bouncing the user back to `/diagnostic`).

The `(app)` gate's query is the load-bearing one. Concrete shape:

```ts
const completed = await db
    .select({ ok: sql<number>`1` })
    .from(practiceSessions)
    .where(and(
        eq(practiceSessions.userId, userId),
        eq(practiceSessions.type, "diagnostic"),
        isNotNull(practiceSessions.endedAtMs),
        ne(practiceSessions.completionReason, "abandoned")
    ))
    .limit(1)

if (completed.length === 0) redirect("/diagnostic")
```

Three filter clauses, all matter:
- `endedAtMs IS NOT NULL` excludes in-flight diagnostics.
- `completion_reason != 'abandoned'` excludes the cron-finalized rows that sub-phase 4 will write. Today the cron doesn't exist; the filter is correct anyway because `startSession`'s stale-row finalization (already in `src/server/sessions/start.ts`) writes `'abandoned'` when a stale in-progress diagnostic is replaced.
- `type = 'diagnostic'` distinguishes diagnostic-completion from drill-completion. A user who somehow reached `/drill/...` without a diagnostic (impossible under the gate, defensive against future bypasses) would still be redirected.

**Caching strategy.** The user's prompt asked how the gate avoids a database round-trip per route hit. The honest answer for sub-phase 1 is: **it doesn't, and that's correct.** Layout-level checks run on every route in the group; each one is one indexed query against a per-user partial-cardinality table. The `practice_sessions_user_type_ended_idx` index (already exists per SPEC §3.4) makes this an index-only scan returning ≤1 row. At expected per-user QPS this is rounding-error latency. Caching the result via `unstable_cache` or a layout-level memo would introduce staleness against the abandon-sweep cron's writes (sub-phase 4); a stale "completed" cache would let an abandoned user bypass the gate. Recommendation: **no cache; rely on the index.** Re-evaluate in Phase 6 if profile data shows the layout query is hot.

### Files touched

- `src/app/(app)/layout.tsx` — exists; verify the gate query matches the shape above and the `redirect("/diagnostic")` target is correct (not `/diagnostic/run`).
- `src/app/(diagnostic-flow)/layout.tsx` — exists; verify auth-only.
- `src/app/(diagnostic-flow)/diagnostic/page.tsx` — exists as the explainer.
- `src/app/(diagnostic-flow)/diagnostic/run/page.tsx` — exists; verify the abandon-then-start logic for orphan in-progress rows is preserved (see §7).
- `src/app/(diagnostic-flow)/diagnostic/run/content.tsx` — exists; verify the focus-shell config matches §4 (notably `sessionDurationMs: null`).

### Verification scenarios

Real-DB harness, playwright-core directly:

1. **Cold-start redirect.** Sign in as a fresh user. Navigate to `/`. Assert URL becomes `/diagnostic` (the explainer), NOT `/diagnostic/run`. Capture screenshot of the explainer.
2. **Explainer "Start Diagnostic" navigation.** From `/diagnostic`, click "Start Diagnostic". Assert URL becomes `/diagnostic/run` and a `<FocusShell>`-shaped DOM tree mounts.
3. **Direct `/drill/[any]` access pre-diagnostic.** Sign in as fresh user. Navigate to `/drill/verbal.synonyms`. Assert URL becomes `/diagnostic` (the gate fires from the deeper route).
4. **Direct `/diagnostic/run` access pre-diagnostic.** Sign in as fresh user. Navigate to `/diagnostic/run` directly. Assert the `(diagnostic-flow)` layout renders (auth passes), `startSession` fires, and the user lands inside a focus-shell mount. The explainer is skipped — that's fine; the contract is "users without a completed diagnostic CAN reach `/diagnostic/run`," not "they always go via the explainer."
5. **Post-completion gate flip.** After completing all 50 items in a test session (force-finalize the `practice_sessions` row directly to short-circuit the wall-clock), navigate to `/`. Assert the user is NOT redirected (the `(app)` layout body renders).

## 3. Diagnostic-mix sampling and session-engine wiring

### What's missing / what should exist

At session start, `startSession({ type: "diagnostic" })` materializes a deterministic 50-item plan: 5 verbal sub-types × 4 items + 6 numerical sub-types × 5 items, no brutal tier. Sampling is deterministic per session — same `practice_sessions.id` always produces the same item-id sequence. The diagnostic uses `selectionStrategy: "fixed_curve"` per SPEC §7.4.

Two choices about WHERE the materialization happens:

**(A) Materialize-at-start: 50 item-ids written to `practice_sessions.diagnostic_item_sequence: uuid[]` at session-insert time.** `getNextItem` reads slot N from the column.

**(B) Materialize-on-demand: each `getNextItem` call picks slot N's `(subTypeId, difficulty)` from a deterministic shuffle, then queries the bank fresh per call.**

The **existing implementation is (B)**: `shuffledDiagnosticOrder(sessionId)` (in `src/config/diagnostic-mix.ts`) produces a permutation of the 50 mix entries seeded by `sessionId`; `getNextFixedCurve` (in `src/server/items/selection.ts`) indexes that permutation by `attemptIndex` and calls `pickWithFallback` against the bank. There is no `diagnostic_item_sequence` column.

**Recommendation: keep (B) — do NOT add `diagnostic_item_sequence`.** Reasons:

1. **The user prompt's framing of (A) was hypothetical** ("written into `practice_sessions.diagnostic_item_sequence: uuid[]` (or wherever the existing schema stores it — verify against `src/db/schema.ts`)"). The verification result: the schema does not have such a column. Adding one would be a Phase-1-shaped migration for a Phase-3 sub-phase, against the user's "don't propose schema migrations beyond what's strictly required" working principle.
2. **(B) does not preclude resume.** The user prompt asks that "a session abandoned and resumed picks the same items." (B) achieves this for free: `shuffledDiagnosticOrder` is a pure function of `sessionId`, and `pickWithFallback` is parameterized by `sessionAttemptedIds` (the in-session attempts so far) plus `recencyExcludedIds` (frozen at session start in `recency_excluded_item_ids`). A resumed session re-derives slot N's `(subTypeId, difficulty)` identically and re-runs the bank query against the same exclusion sets — same item back, modulo bank changes between abandonment and resume (which Phase 5 has to think about anyway).
3. **(A) introduces a new failure mode.** If an item is hard-deleted (or goes `retired`) between session-start and serve, slot N points at a tombstone. The plan would then need a "fallback when the materialized id is unservable" branch, recreating most of `pickWithFallback`'s logic but on the read path. (B) sidesteps this by querying the bank live each call.
4. **(B) costs one extra index-only query per call.** Real cost; rounding-error latency at the bank sizes the diagnostic targets.

Resume itself ships in Phase 5; this plan does not implement resume, only confirms (B) does not preclude it.

### Implementation seam — sampling determinism

`shuffledDiagnosticOrder(sessionId)` exists. Its hash → permutation derivation must be:
- **Pure**: same sessionId → same permutation. Unit-tested.
- **Stable**: identical between Bun and Node runtimes (relevant when scripts seed the harness from raw Bun while Next runs in node).
- **Permutation-only**: the multiset of `(subTypeId, difficulty)` tuples is unchanged from `diagnosticMix`; only the order varies. The 5/4/6/5 distribution is preserved exactly.

Within-cell sampling — once a `(subTypeId, difficulty)` slot is requested, `pickWithFallback` queries the bank. The "deterministic per session" property must hold at this layer too: the same session asking for the same `(subTypeId, difficulty)` slot at the same `attemptIndex` should return the same `items.id`. The existing `pickItemRow` accepts a `sessionIdSalt` parameter for this purpose. Verify it is wired and the underlying SQL ordering uses the salt (typically `ORDER BY md5(items.id || $sessionIdSalt)` or equivalent — verify against `src/server/items/queries.ts`).

### Files touched

- `src/config/diagnostic-mix.ts` — exists, includes `shuffledDiagnosticOrder`. Verify the shuffle is pure and tested (`src/config/diagnostic-mix.test.ts` exists; verify it covers determinism + multiset preservation).
- `src/server/items/selection.ts` — exists, `getNextFixedCurve` reads `shuffledDiagnosticOrder(ctx.id)[attemptIndex]`. No change.
- `src/server/items/queries.ts` — verify `pickItemRow` honors `sessionIdSalt` so within-cell pick is also deterministic.
- `src/server/sessions/start.ts` — exists. The `recency_excluded_item_ids` materialization at session-insert time is the only "pre-compute at start" the diagnostic needs. No `diagnostic_item_sequence` write.

### Schema / state changes

**None.** The diagnostic uses existing columns: `practice_sessions.id` (seed for the shuffle), `practice_sessions.recency_excluded_item_ids` (frozen exclusion set), and the standard `attempts` join for in-session uniqueness.

### Verification scenarios

1. **Deterministic permutation.** Call `shuffledDiagnosticOrder(sessionIdA)` twice; assert byte-equal output. Call with `sessionIdA` and `sessionIdB`; assert outputs differ.
2. **Multiset preservation.** Sort the output of `shuffledDiagnosticOrder(sessionIdA)` and the sorted `diagnosticMix`; assert structural equality.
3. **Within-cell determinism (one cell, two calls, same session).** Force-cycle through to attempt index 0, capture `firstItem.id`. Reset attempts table for the session; reset to attempt index 0. Capture `firstItem.id` again. Assert equal.
4. **Within-cell variation across sessions.** Two sessions with the same `(subTypeId, difficulty)` in slot 0 but different `sessionId`. Assert `firstItem.id` differs across the pair on average — exact equality is not required (bank-size collisions exist) but two independent sessions hitting the same id every time would indicate the salt isn't wired.
5. **No re-serve within a session.** Drive a full 50-item session. Assert all 50 `attempts.item_id` values are distinct.

## 4. Focus-shell mount config and the diagnostic-overtime-note decision

### What's missing / what should exist

The diagnostic mounts `<FocusShell>` with these props:

```tsx
<FocusShell
    sessionId={sessionId}
    sessionType="diagnostic"
    sessionDurationMs={null}                           // load-bearing — see decision below
    perQuestionTargetMs={18_000}                       // same as drills; triage prompt fires
    targetQuestionCount={50}
    paceTrackVisible={false}                           // diagnostic has no pace concept
    initialTimerPrefs={{ sessionTimerVisible: true, questionTimerVisible: true }}
    initialItem={firstItem}
    strictMode={false}
    onSubmitAttempt={onSubmitAttempt}
    onEndSession={onEndSession}
/>
```

**`sessionDurationMs: null`** is the signal the focus shell uses to skip:
- The session-timer auto-redirect from focus-shell-overhaul commit 7 (verified at `focus-shell.tsx:327`: `if (sessionDurationMs === null) return`). The diagnostic measures capacity, not triage; it does not auto-end at any wall-clock boundary.
- The `<SessionTimerBar>` render and the chronometer (verified at `focus-shell.tsx:392`: `if (sessionDurationMs !== null && state.timerPrefs.sessionTimerVisible)` gates both).
- The `<QuestionProgressionBar>`'s pace-deficit color flip (verified at `focus-shell.tsx:358`: the `behindPace` computation short-circuits to `false` when `sessionDurationMs === null`).

The per-question timer (`<QuestionTimerBarStack>` — primary + overflow) renders unchanged. The triage prompt fires at 18s. The pre-target audio ticks fire at seconds 10–17; the post-target urgency loop starts at 18s. All the focus-shell-overhaul behavior survives the `null`-duration case.

### The diagnostic-overtime-note decision

SPEC §6.10 specifies a peripheral element that fires when `elapsedSessionMs` first crosses 900_000 (15 minutes) on a diagnostic, displaying "you're at the real-test time limit; keep going to finish the calibration." for 15 seconds. The post-overhaul plan flagged §6.10 as describing removed machinery (the polish round's §3.1 reversal replaced the soft note with a hard 15-min cutoff; the post-overhaul round didn't restore the soft note). Three options for sub-phase 1:

**(a) Restore the SPEC §6.10 overtime-note flow as written.** Re-introduce the `<DiagnosticOvertimeNote>` overlay, the `diagnostic_overtime_note_shown` reducer action, the `diagnosticOvertimeNoteShown`/`diagnosticOvertimeNoteVisibleUntilMs` shell-state fields, the `recordDiagnosticOvertimeNote` server action, and the writes to `practice_sessions.diagnostic_overtime_note_shown_at_ms`. The post-session review reads the column and shows a substantive "you went over 15 minutes" paragraph if it's set.

**(b) Ship without an in-flow overtime signal; surface pacing context in the post-session review only; document SPEC drift.** No overlay during the diagnostic. The post-session review reads `attempts` for the session, computes total elapsed (`max(attempts.created_at_ms) - practice_sessions.started_at_ms` or equivalent), and renders one informational sentence ("you took X minutes; the real CCAT is 15 minutes.") if elapsed exceeded 15 minutes. SPEC §6.10 is updated to reflect the new shape.

**(c) Reframe what overtime looks like in Phase 3.** Replace the overlay with something different — e.g., a non-disruptive footer line that appears at 15 min and stays until session end. Reducer state and schema column unchanged from (a); only the visual element changes.

**Recommendation: (b) — ship without an in-flow overtime signal.** Reasons:

1. **The diagnostic measures capacity. Showing a 15-min note inside the flow primes the user to think "I'm running out of time" — that's the triage frame, not the capacity frame.** The reframing of the diagnostic away from "capacity baseline" toward "first triage exposure" was the polish round's §3.1 reversal; this plan reverses that reversal back to the PRD §4.1 framing. The overtime overlay is the piece of machinery that bridges between the two framings: under "first triage exposure" it primes the user to switch into triage mode at 15:00; under "capacity baseline" it is mood music against the pedagogical contract.
2. **The post-session review is where pacing context belongs.** Once the user has finished, "you took X minutes" is informational, not pressure-applying. The user can absorb it without it changing how they answered the items they just answered. This puts the cognitive-load-relevant feedback in a load-bearing-relevant place.
3. **The mechanical surface area is smaller.** No reducer state additions, no server-action surface, no new overlay component. The schema column `diagnostic_overtime_note_shown_at_ms` becomes vestigial-and-unread; sub-phase 1 does not migrate it (no DROP COLUMN), and a future cleanup commit can drop it once the SPEC is settled. The post-session pacing line is one query (`SELECT MAX(created_at_ms) - started_at_ms FROM ...`) and one conditional sentence in `<PostSessionShell>`.
4. **The post-overhaul plan already accepted SPEC §6.10 drift.** This plan formalizes the resolution: SPEC §6.10 is rewritten as part of the same commit that lands the diagnostic-content config. The §6.7 cross-reference (also flagged by post-overhaul §8) is updated in lockstep. Doc drift becomes doc fix.

The chosen route does require a single specific edit in `<PostSessionShell>` — see §6 below for the placement.

### Files touched

- `src/app/(diagnostic-flow)/diagnostic/run/content.tsx` — exists. Verify the focus-shell config above. The current implementation passes `sessionDurationMs: null`; that stays.
- `src/components/post-session/post-session-shell.tsx` — modified to render the post-session pacing line per §6.
- `docs/SPEC.md` §6.10 — rewritten in the doc commit at the end of the round to describe "post-session pacing line" instead of "in-flow overtime overlay." §6.7 cross-reference updated. The schema column comment in §3.4 gets a "vestigial; deprecated for sub-phase 1" annotation.
- **Files explicitly NOT modified:** `src/components/focus-shell/shell-reducer.ts` (no `diagnostic_overtime_note_shown` action), `src/components/focus-shell/focus-shell.tsx` (no overtime overlay), `src/app/(app)/actions.ts` (no `recordDiagnosticOvertimeNote`).

### Reducer / state changes

**None.** The shell-reducer's existing `diagnosticOvertimeNoteShown` / `diagnosticOvertimeNoteVisibleUntilMs` fields (if any are still present from SPEC §6.2) are dead state. Verify they were deleted in the polish round (post-overhaul `<TriagePrompt>` and `<InterQuestionCard>` are the only overlays in the shell post-overhaul); if they survived the deletion, leave them — sub-phase 1 doesn't touch reducer shape.

### Verification scenarios

1. **No session-timer chrome.** Mount the diagnostic. Assert no `[data-testid="session-timer-bar"]` element. Assert no chronometer (the MM:SS readout). Sample at t=0s and t=30s.
2. **Per-question timer renders.** Assert `[data-testid="question-timer-stack"]` (or whichever testid the focus-shell uses for the dual-bar) is mounted. Assert the primary fill flips blue→red at half-target (t=9s ± 20ms).
3. **Triage prompt fires at 18s.** Set up the harness to wait. Assert the triage prompt overlay appears at elapsed-question ≥ 18s and stays until advance.
4. **No auto-end at wall-clock.** Drive a session past 15 minutes elapsed without clicking through 50 items (e.g., sit on item 1 for 20 minutes via a test harness that doesn't submit). Assert the page does not navigate to `/post-session/[sessionId]`. Assert no `<DiagnosticOvertimeNote>` overlay element exists.
5. **Post-session pacing line.** Force-finalize a diagnostic with `started_at_ms` 16 minutes ago. Land on the post-session route. Assert one sentence "Your diagnostic took 16 minutes. The real CCAT is 15 minutes for 50 questions." (or copy approximation per §11 resolution 2) is present. Repeat with a 12-minute session; assert the sentence is absent.

## 5. Completion → endSession → masteryRecomputeWorkflow → /post-session redirect

### What's missing / what should exist

After the 50th `submitAttempt` returns `{ nextItem: undefined }`, the focus shell calls `onEndSession()` (the prop passed from `content.tsx`). The chain:

1. `submitAttempt(attempt-50)` writes the attempt row, `getNextItem` returns `undefined` (session quota reached), the FocusShell observes the `undefined` next-item and dispatches its end-of-session flow.
2. `onEndSession()` calls the `endSession(sessionId)` server action.
3. The action sets `practice_sessions.ended_at_ms = Date.now()`, `completion_reason = 'completed'`, guarded by `WHERE ended_at_ms IS NULL` (idempotent — the abandon-sweep cron from sub-phase 4 cannot double-write).
4. The action triggers `masteryRecomputeWorkflow(sessionId)` via Vercel Workflows' `start()`. The workflow reads attempts for the session, computes per-sub-type mastery via `computeMastery({ source: 'diagnostic' })`, and upserts `mastery_state` rows. The workflow is fire-and-forget from the server-action's perspective.
5. `revalidatePath('/post-session/' + sessionId)`.
6. The client (`content.tsx`) does `router.push(\`/post-session/\${sessionId}\`)` after `onEndSession()` resolves.

### Implementation seam

All of this exists and works (see `src/server/sessions/end.ts`, `src/workflows/mastery-recompute.ts`). Sub-phase 1's job is to verify the end-to-end path is wired and the diagnostic's specific source-parameterization (`source: 'diagnostic'`) is honored.

`computeMastery`'s diagnostic-source params (per SPEC §9.3): `{ minAttempts: 3, latencyMultiplier: 1.5, allowMastered: false }`. The 1.5× latency relaxation reflects the untimed framing — capacity-measurement conditions, not triage conditions. **This reversal of the polish round's `1.2` value is part of this sub-phase**, in the same commit that re-establishes `sessionDurationMs: null` as the diagnostic's session-level contract. Both edits move together; partial flip would be incoherent.

The `allowMastered: false` clause is unchanged — diagnostic is single-noisy-run regardless of timing framing.

### Files touched

- `src/server/sessions/end.ts` — exists. Verify the workflow trigger fires unconditionally for the production action path (the `skipWorkflowTrigger` flag is dev/test only; the server-action wrapper passes `false` always).
- `src/server/mastery/compute.ts` — verify `sourceParams('diagnostic')` returns `{ minAttempts: 3, latencyMultiplier: 1.5, allowMastered: false }`. If the polish round set it to `1.2`, revert to `1.5`.
- `src/server/mastery/compute.test.ts` — exists. Update the test fixture for diagnostic-source latency to assert 1.5×.
- `src/workflows/mastery-recompute.ts` and `mastery-recompute-steps.ts` — exist. No change.

### Schema / state changes

**None.**

### Verification scenarios

1. **End-to-end completion.** Drive a 50-item session via real-DB harness. Assert `practice_sessions.ended_at_ms IS NOT NULL` and `completion_reason = 'completed'` after the 50th submit. Assert the URL becomes `/post-session/[sessionId]`.
2. **Mastery recompute fires.** Capture the workflow log (Pino structured output keyed by `sessionId`). Assert one `masteryRecomputeWorkflow.start` event per completion. Assert N `mastery_state` row upserts where N is the number of distinct sub-types touched in the diagnostic (≤ 11).
3. **Source = 'diagnostic'.** Inspect a resulting `mastery_state` row. For a sub-type where session accuracy was 90% and median latency was 14s (against an 18s threshold), assert `current_state` is `fluent` (not `mastered`, since `allowMastered: false`). For a sub-type with 3 attempts and 60% accuracy at 13s, assert `learning` (the 1.5× threshold relaxation pushes the latency-pass at 13s × 1.5 = within 27s, so accuracy decides; 60% is below the 70% fluent floor → `learning`).
4. **Idempotent end.** Call `endSession` twice for the same `sessionId`. Assert the row's `ended_at_ms` reflects only the first call (the second is a no-op due to the `WHERE ended_at_ms IS NULL` guard). Assert only one `masteryRecomputeWorkflow.start` event fires across both calls. (The current implementation may fire the workflow on the second call too if it doesn't gate on the update's RETURNING; verify and fix if needed — SPEC §7.3's idempotency contract requires single-fire.)

## 6. Post-session capture: target percentile + target date

### What's missing / what should exist

`/post-session/[sessionId]` is the only post-session surface in sub-phase 1. (Drill post-session reviews ship in Phase 5; sub-phase 1 covers the diagnostic exclusively.) The route renders `<PostSessionShell>`, which composes:

- A heading and a one-paragraph summary of the diagnostic.
- The post-session pacing line (per §4 decision (b)) — conditional on elapsed > 15:00.
- `<OnboardingTargets>` — the form that captures `target_percentile` (one of 50, 30, 20, 10, 5) and `target_date_ms` (a date input; parses to epoch-ms).
- "Save and continue" → calls `saveOnboardingTargets` → `router.push('/')`.
- "Skip for now" → `router.push('/')` directly. Both `users.target_percentile` and `users.target_date_ms` stay null.

The form's button labels and validation rules are in PRD §3 ("post-session captures target percentile and target date inline before redirecting to the Mastery Map"). PRD §6.3 specifies the discrete percentile set ("top 20%") and the role of the target date (drives "today's near goal" line on the Mastery Map).

### Implementation seam

All of this exists (`src/components/post-session/onboarding-targets.tsx`, `src/components/post-session/post-session-shell.tsx`, `saveOnboardingTargets` in `src/app/(app)/actions.ts`). Sub-phase 1's modifications:

1. **The post-session pacing line** — new sentence in `<PostSessionShell>`. Conditional on elapsed > 15:00. Server-component computation in `page.tsx`: `const elapsedMs = (lastAttemptCreatedAtMs ?? row.startedAtMs) - row.startedAtMs`; pass to `content.tsx` as a `pacingMinutes: number | null` prop (null when elapsedMs ≤ 900_000). The shell renders the sentence only when non-null. Copy: "Your diagnostic took {N} minutes. The real CCAT is 15 minutes for 50 questions." (per §11 resolution 2 — strictly informational; the user draws the comparison themselves).
2. **Remove the `overtimeNoteShown` prop chain.** The current implementation passes `overtimeNoteShown: boolean` from `loadSession` to `PostSessionContent` to `PostSessionShell`. Per the §4 decision (b), the column-backed flag is no longer the trigger; the trigger becomes "elapsed > 15:00 derived live from attempts." Replace `overtimeNoteShown` with `pacingMinutes` end-to-end in this commit.

### Files touched

- `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` — modify `loadSession` to compute `pacingMinutes` from `MAX(attempts.created_at_ms) - practice_sessions.started_at_ms`. The query joins `attempts` (one extra index-only read per post-session render).
- `src/app/(diagnostic-flow)/post-session/[sessionId]/content.tsx` — replace `overtimeNoteShown` prop with `pacingMinutes`.
- `src/components/post-session/post-session-shell.tsx` — replace `overtimeNoteShown` prop with `pacingMinutes`; render the conditional sentence.
- `src/components/post-session/onboarding-targets.tsx` — exists; verify the form posts to `saveOnboardingTargets` with the right shape and pushes `/` on success.
- `src/app/(app)/actions.ts` — exists; verify `saveOnboardingTargets` accepts the discrete percentile set + the date-ms shape. Already does per the inspection.

### Schema / state changes

**`users.target_percentile` and `users.target_date_ms`** — nullable `integer` and nullable `bigint(_ms)` respectively, both Phase 1 columns. No migration. The action's input validation enforces the discrete percentile set (`50 | 30 | 20 | 10 | 5`) at the boundary via Zod.

### Verification scenarios

1. **Capture happy path.** Complete a diagnostic. Land on `/post-session/[sessionId]`. Select "top 20%" + 21-day-out date. Click "Save and continue". Assert `users.target_percentile = 20` AND `users.target_date_ms = <expected ms>`. Assert URL becomes `/`.
2. **Skip path.** Complete a diagnostic. Click "Skip for now". Assert both columns remain `NULL`. Assert URL becomes `/`.
3. **Validation: invalid percentile.** Force-post `target_percentile: 25` to the action (via the harness's direct action call, not the form). Assert the action throws `ErrInvalidActionInput` and neither column updates.
4. **Pacing-line render.** Complete a diagnostic where `started_at_ms` is 14 minutes ago. Assert the pacing-line sentence is absent. Repeat with `started_at_ms` 17 minutes ago. Assert the pacing-line sentence renders with the integer minutes value.
5. **Non-owner redirect.** Log in as user A; complete a diagnostic for user B; navigate to `/post-session/[sessionB-sessionId]` while signed in as A. Assert redirect to `/`. (The page-level owner check exists; verify it still fires.)

## 7. Abandonment-detection schema (sub-phase 4 carve-out)

### What's missing / what should exist

A user who closes the tab mid-diagnostic must be detectable as "abandoned" so a subsequent visit triggers a fresh diagnostic, not a resume into the orphan. The detection mechanism is heartbeats every 30 seconds + a minute-cadence cron sweep that finalizes stale rows. **Correction (folded in at commit 5):** the cron *route* already exists at `src/app/api/cron/abandon-sweep/route.ts` (Phase 3 commit C). What sub-phase 4 still needs is the heartbeat client, the `/api/sessions/[sessionId]/heartbeat` route handler, and the `vercel.json` schedule wiring — *the cron-runner wiring*, not the cron itself. **Sub-phase 1's only job here: ensure every column the cron writes already exists, and ensure `startSession`'s synchronous stale-row finalization (which is the only "abandon detection" the user-facing path needs in sub-phases 1-3) writes the cron-compatible row shape.**

Schema audit (verified against `src/db/schemas/practice/practice-sessions.ts`):
- `last_heartbeat_ms: bigint, NOT NULL, default (extract(epoch from now()) * 1000)::bigint` — Phase 1, exists.
- `ended_at_ms: bigint, nullable` — Phase 1, exists.
- `completion_reason: pgEnum('completed','abandoned'), nullable until set` — Phase 1, exists.
- `practice_sessions_abandon_sweep_idx ON (last_heartbeat_ms) WHERE ended_at_ms IS NULL` — Phase 1, exists.

**No schema migration needed.** Sub-phase 1's contract is that `startSession`'s stale-row finalization (in `src/server/sessions/start.ts`) writes the same UPDATE shape sub-phase 4's cron will write:

```sql
UPDATE practice_sessions
SET ended_at_ms = last_heartbeat_ms + 30000,
    completion_reason = 'abandoned'
WHERE ...
```

Both share the `HEARTBEAT_GRACE_MS = 30_000` constant from `src/server/sessions/abandon-threshold.ts`. When sub-phase 4 lands the cron, it imports the same constant and writes the same shape. No row written by `startSession` will be distinguishable from a row written by the cron.

### Why this matters for sub-phase 1

The user reaches `/diagnostic` in two states:
1. **Fresh user** (no prior diagnostic row). `startSession` inserts a new row.
2. **Returning user with an in-progress diagnostic** (closed the tab last time, came back). `startSession`'s `findExistingInProgress` returns the orphan. If `last_heartbeat_ms` is within `ABANDON_THRESHOLD_MS` (5 minutes), `startSession` returns the existing sessionId — fresh-resume path. If outside the threshold, `startSession` finalizes the orphan as `'abandoned'` (synchronously, in a transaction) and inserts a fresh row.

The fresh-resume path matters for the user-facing flow even without sub-phase 4. A user who briefly switches tabs and comes back within 5 minutes resumes their session; a user who closes the laptop and comes back the next day starts fresh. The 5-minute threshold is the contract.

The `abandon-then-restart` path in `/diagnostic/run/page.tsx` (the `abandonInProgressDiagnosticsAndStart` helper that exists today) is **redundant with `startSession`'s internal finalization** and should be removed — `startSession` is now the single point of abandonment-on-start. Removing the page-level helper closes a minor double-write race (page-level UPDATE + transaction-internal UPDATE could in theory both target the same row and one would no-op). **Recommendation: remove `abandonInProgressDiagnosticsAndStart`; rely on `startSession`'s built-in idempotency.**

### Files touched

- `src/app/(diagnostic-flow)/diagnostic/run/page.tsx` — remove `abandonInProgressDiagnosticsAndStart`. Reduce the page to: resolve userId from auth, call `startSession({ userId, type: "diagnostic" })`, pass the promise to `<DiagnosticContent>`. Trust `startSession`'s internal stale-row handling.

### Schema / state changes

**None.**

### Verification scenarios

1. **Cold start.** Sign in as fresh user. Click "Start Diagnostic" from the explainer. Assert one new `practice_sessions` row with `type='diagnostic'`, `ended_at_ms IS NULL`, `last_heartbeat_ms` within 1s of now.
2. **Fresh-resume within 5 min.** Sign in. Start diagnostic. Reach question 5. Reload the page (simulating a brief absence; `last_heartbeat_ms` was set 0s ago at insert and stays at insert-time without sub-phase 4's heartbeat client). Re-navigate to `/diagnostic/run`. **Note:** without the heartbeat client, `last_heartbeat_ms` doesn't advance during the session. The 5-minute threshold is measured from session-insert, so a user reaching question 5 within 5 minutes resumes. Assert `startSession` returns the same sessionId. Assert no second row is inserted.
3. **Stale-after-5-min.** Same setup; manipulate the row directly to set `last_heartbeat_ms` to 6 minutes ago. Re-navigate. Assert the orphan row is finalized as `completion_reason='abandoned'` AND a new row is inserted. Assert both rows are visible in the DB (the abandoned row stays for audit, with `ended_at_ms = old_last_heartbeat_ms + 30_000`).
4. **Cron-compatibility.** After scenario 3, manually run the SQL the sub-phase-4 cron will run (`UPDATE practice_sessions SET ended_at_ms = last_heartbeat_ms + 30000, completion_reason = 'abandoned' WHERE last_heartbeat_ms < $cutoff AND ended_at_ms IS NULL RETURNING id`). Assert it returns zero rows (the orphan is already finalized; the new row is fresh). This confirms `startSession` writes a cron-compatible shape.
5. **`(app)` gate post-abandonment.** After scenario 3, navigate to `/`. Assert redirect to `/diagnostic` (the abandoned row's `completion_reason='abandoned'` filter excludes it from the gate's "completed diagnostic" check).

## 8. Sequencing and commits

Five commits, in order. The bug-fix commit comes first (so subsequent commits verify against a clean redirect path); decision-driven commits land in the order their decisions were made; the doc commit closes the round.

1. **`refactor(diagnostic): collapse abandonInProgressDiagnosticsAndStart into startSession's idempotency`.** Per §7. Removes the page-level helper in `/diagnostic/run/page.tsx`; trusts `startSession`'s transaction-internal stale-row finalization. Smallest change in the round; lands first so subsequent commits verify against a single-source-of-truth abandonment path. Verification: the four §7 scenarios.

2. **`feat(diagnostic): re-establish untimed-diagnostic framing; remove in-flow overtime overlay`.** Per §4 decision (b). Confirms `sessionDurationMs: null` in `content.tsx`; deletes any vestigial `<DiagnosticOvertimeNote>` overlay component, reducer-state fields (`diagnosticOvertimeNoteShown`, `diagnosticOvertimeNoteVisibleUntilMs`), reducer action variant (`diagnostic_overtime_note_shown`), and the `recordDiagnosticOvertimeNote` server action if any survived the polish round. Reverts `sourceParams('diagnostic').latencyMultiplier` from `1.2` to `1.5` (per §5). Updates `compute.test.ts`. Reverts the polish-round 15-min cutoff in `submitAttempt` if still present. Single coherent reversal.

   **Commit body must explicitly call out the product-framing reversal.** A future reader running `git blame` on `content.tsx`, `submit.ts`, `compute.ts`, or `shell-reducer.ts` should see the full context — that this commit reverses the polish round's "first triage exposure" framing (15-minute hard cutoff + 1.2× latency multiplier + in-flow overtime overlay) back to PRD §4.1's "capacity measurement" framing. The technical changes (delete overlay, flip multiplier, drop server-side cutoff) are mechanical; the product decision behind them is the load-bearing piece, and it must live in the commit body — not just in this plan — so it survives the document churn that always follows multi-round reversals.

3. **`feat(post-session): replace overtime-flag rendering with derived pacing line`.** Per §6. `loadSession` adds the `MAX(attempts.created_at_ms) - started_at_ms` query; `pacingMinutes: number | null` flows through `content.tsx` to `<PostSessionShell>`. Conditional sentence renders only when elapsedMs > 900_000. Removes the `overtimeNoteShown` prop chain. Verification: §6 scenarios 1, 2, 4.

4. **`test(diagnostic): cover deterministic-permutation + within-cell-salt sampling`.** Per §3. The work is test coverage for behavior already in production; no production code changes. The verification scenarios from §3 become assertions in `src/server/items/selection.test.ts` and `src/server/items/queries.test.ts` (and extensions to the existing `src/config/diagnostic-mix.test.ts` if multiset-preservation isn't already covered). Conventional-commit type is `test:` because the round adds tests — relabeling as `refactor:` would mis-describe it. Verification: §3 scenarios 1–5.

5. **`docs: update SPEC §6.10, §6.7, architecture-plan diagnostic paragraph; close phase3-diagnostic-flow plan`.** SPEC §6.10 rewritten from "in-flow overtime overlay" to "post-session pacing line." §6.7 cross-reference updated. The vestigial `diagnostic_overtime_note_shown_at_ms` column annotated as deprecated (no DROP this round). Architecture-plan §"User journey data flow" §2 reaffirmed (untimed at session level). This plan's status flipped to "shipped." Doc-only.

Each commit lints, typechecks, and passes the relevant verification scenarios before the next is started.

## 9. Verification protocol carry-forward

Established discipline from the focus-shell post-overhaul round (`docs/plans/focus-shell-post-overhaul-fixes.md` §7) carries forward unchanged:

- `playwright-core` directly with `page.screenshot({ timeout: 30_000 })`. No MCP `browser_take_screenshot`.
- `page.mouse.move(10, 10)` before any post-click `getComputedStyle` measurement.
- Real `page.click()` for any user-interaction-gated paths (specifically: the explainer's "Start Diagnostic" link, the post-session form's "Save and continue" / "Skip for now" buttons, and the focus-shell's option/Submit clicks during the harness-driven 50-item drive).
- Real-DB harness for everything that touches `practice_sessions` or `attempts`. The smoke route (`src/app/phase3-smoke/page.tsx`) is NOT used in this round — its `onSubmitAttempt` stub bypasses the actual session engine, and sub-phase 1's verification depends on the real engine.
- Pino structured-log capture for the `masteryRecomputeWorkflow.start` event (commit 2's verification scenario 2).
- Throwaway harness scripts under `scripts/_<commit>-harness.ts` are moved out of the project tree before commit so `tsgo` doesn't pick them up.

Animation-time anchoring (post-overhaul §6.14.3) and headless-Chromium autoplay policy (§6.14.4) carry forward; the per-question timer's half-target color flip and the urgency-loop's audio events both surface in the diagnostic per §4 verification scenario 2.

## 10. Out of scope

Explicit list — items deliberately not addressed in sub-phase 1:

- **The Mastery Map (`/`).** Sub-phase 2. Sub-phase 1's post-session form pushes to `/`; until sub-phase 2, that route 404s or renders a placeholder. Acceptable for sub-phase 1's verification harness, which exits at the post-session form.
- **Standard drill mode (`/drill/[subTypeId]`, `/drill/[subTypeId]/run`).** Sub-phase 3. The `(app)` gate is correct for sub-phase 1 even though the routes it gates against don't exist yet — adding them is purely additive.
- **Speed-ramp and brutal drill modes, full-length test, simulation, review session, NarrowingRamp, strategy library.** Phase 5+.
- **Heartbeats** (`<Heartbeat>` client component, `/api/sessions/[sessionId]/heartbeat` route handler, `recordHeartbeat`). Sub-phase 4. Sub-phase 1 leaves `last_heartbeat_ms` at its insert-time default and relies on `startSession`'s 5-min threshold for fresh-resume vs. stale finalization. The heartbeat absence means a session left mid-flight for 6+ minutes is detectable as stale; any shorter absence resumes. That's correct behavior — the heartbeat client tightens the resume window (any tab that's been backgrounded for 5+ minutes counts as stale even if the user returns within the window the heartbeat would have refreshed), it doesn't change the abandonment contract.
- **Abandon-sweep cron-runner wiring** (the `vercel.json` schedule + production verification of the existing `/api/cron/abandon-sweep` route). Sub-phase 4. The route itself already exists; what's missing is the schedule entry that fires it on cadence in production, plus end-to-end verification once heartbeats land. Sub-phase 1's `startSession` synchronous finalization is sufficient for the user-facing path; the cron's role is finalizing rows for users who never come back, which doesn't matter to sub-phase 1's verification. **The §5.2 mastery-recompute side-effect smoke (`scripts/dev/smoke/diagnostic-mastery-recompute.ts`, added in commit 4) already exercises the existing cron route end-to-end against the dev server** — sub-phase 4 reuses that smoke pattern when verifying production wiring.
- **Resume-into-orphan UI** (a banner that says "you have a diagnostic in progress, continue or restart?"). Phase 5+. Sub-phase 1's behavior is "silently resume if fresh, silently start fresh if stale" — the user is never asked.
- **Per-session option shuffling.** Phase 5/6. Opaque option ids (Phase 2 deliverable) unlock it; sub-phase 1 does not consume the structure.
- **Click-to-highlight in post-session review.** Phase 5/6. Sub-phase 1's only post-session is the diagnostic onboarding capture, which renders no per-item explanation.
- **The `diagnostic_overtime_note_shown_at_ms` column drop.** No DROP COLUMN in sub-phase 1. Column stays unread; a future cleanup commit drops it.
- **Mastery-state recomputation timing** (e.g., a "your mastery is being computed" loading state on `/`). Sub-phase 2's problem. Sub-phase 1's `endSession` triggers the workflow fire-and-forget; the post-session form's "Save and continue" pushes to `/` immediately; if the workflow hasn't finished by the time sub-phase 2's Mastery Map renders, that's sub-phase 2's race-condition surface to handle.

## 11. Resolutions of open questions

Three questions surfaced during drafting; all three resolved before implementation. The answers are folded into §2–§7 above; recorded here for traceability.

1. **Latency multiplier for `sourceParams('diagnostic')`.** **Resolution: 1.5×** (revert from polish-round `1.2`). The capacity-measurement framing wins. The polish-round `1.2` rationale was specific to timed diagnostics (pressure-induced speed-up risks over-crediting fast-but-careless attempts); under the untimed framing that risk is gone, and 1.5× restores the original "first-day novelty padding" signal. Lands in commit 2 alongside the framing reversal.

2. **Post-session pacing-line copy.** **Resolution: strictly informational, neutral phrasing.** Final copy: "Your diagnostic took {N} minutes. The real CCAT is 15 minutes for 50 questions." The earlier draft ("you took X minutes; the real CCAT is 15 minutes") read slightly judgmental — the user can draw the comparison themselves without the prompt nudging them. No forward-pointer ("drills will train you toward that pace"); forward-pointers belong in the Mastery Map's near-goal line and duplicating them here dilutes the signal. Lands in commit 3.

3. **`(app)` gate redirect-target query param.** **Resolution: no query param.** Single redirect target (`/diagnostic`). The explainer's copy is robust to either entry path (cold-start vs. app-bypass-attempt); query-param-driven copy variants add a configuration surface for marginal value. Lands in commit 1.
