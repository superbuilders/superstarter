# Plan — Phase 3, sub-phase 2: the Mastery Map

> **Status: shipped 2026-05-04.** The four-commit sequence below landed on `main` cleanly:
>
>   - Commit 1 — `e615408` — `docs(phase3): add mastery-map sub-phase 2 plan`
>   - Commit 2 — `38f659c` — `feat(mastery-map): empty-state pane for the post-diagnostic race window` (the audit findings folded into this commit's preamble per the plan's `if-clean-fold-in` path)
>   - Commit 3 — `675ecc1` — `test(mastery-map): smoke for empty-state polling and transition`
>   - Commit 4 — *this commit* — `docs: close phase3-mastery-map plan; SPEC §6.14 implementation notes; architecture-plan refresh`
>
> **Production-deploy unlock.** Sub-phase 2's close also closes the deploy-coupling held open by sub-phase 1 (`docs/plans/phase3-diagnostic-flow.md` §1). Sub-phase 1 + 2 are now production-ready: a real user can sign up, take the diagnostic, fill out the onboarding form, and land on a useful Mastery Map — including the empty-state pane during the brief workflow window between `endSession` and `mastery_state` upserts. This is the first real-user-facing milestone of Phase 3; everything before it was internal scaffolding.
>
> This plan was the canonical reference for sub-phase 2 of Phase 3 (the Mastery Map). The diagnostic flow (sub-phase 1) was treated as a stable dependency — its five commits (`468dda6` → `43a8a0d`) shipped 2026-05-04 and were not touched here. Where this plan disagrees with prior phase plans (`docs/plans/phase-3-practice-surface.md`) it wins for the Mastery Map surface.

The Mastery Map is the user's **home**. After the diagnostic, after every session, after sign-in to a returning account — they land on `/`. The route already has substantial scaffolding from a prior round (commit `d722017`, "feat(app): Mastery Map + standard drill flow"): the eleven-icon grid, the near-goal line, the primary CTA, the low-contrast triage adherence, and the supporting pure functions (`deriveNearGoal`, `recommendedNextSubType`, `triageRolling30d`) all exist. **Sub-phase 2's job is not to design and build the Map. It's to make the Map land cleanly under sub-phase 1's just-completed-diagnostic flow, address the empty-state race window that the workflow's async fire opens up, catch any drift introduced by sub-phase 1, and unblock the production deploy.**

## 1. Why this sub-phase, why now

Three forcing functions, in order of weight:

1. **Production deploy of sub-phase 1 is gated on this round.** Sub-phase 1's `/post-session/[sessionId]` form pushes to `/` on save-or-skip. That route currently exists and renders, but its correctness under the just-after-diagnostic data shape (zero `mastery_state` rows for a few seconds while `masteryRecomputeWorkflow` runs) is unverified. Until that race is handled, sub-phase 1 cannot ship to production users.

2. **The Map's existing scaffolding predates sub-phase 1.** Commit `d722017` shipped the Map before sub-phase 1's diagnostic-flow reversal. Specifically: at the time `d722017` landed, the diagnostic was timed (15-min hard cutoff, polish-round framing) and the post-session capture form pushed to `/` on a fully-populated `mastery_state`. Sub-phase 1 reversed that framing back to capacity-measurement; the workflow trigger path is intact (verified end-to-end by `scripts/dev/smoke/diagnostic-mastery-recompute.ts`), but **the timing assumptions that the Map's render path may have baked in need re-verification**. No code change is presumed; the audit may turn up nothing. If it does turn up drift, this round is the place to fix it.

3. **The empty-state race window is real and frequent.** In the dev environment, the `endSession → masteryRecomputeWorkflow → mastery_state populated` chain completes in ~1 second (verified via the §5.2 smoke). In production, Vercel Workflows queues runs through a remote runtime; the chain may take longer, especially under cold-start. A user who finishes the diagnostic, skips through the post-session form quickly, and lands on `/` with a fast network is the **likely** case for the empty-state window, not the edge case. The Map needs to render coherently during that window — not as eleven "not yet attempted" outlined icons that misrepresent the user as having done nothing.

This sub-phase is small relative to sub-phase 1 (which built routing, sampling, timing reversal, post-session derivation, and four streams of test coverage). It is correspondingly easier to scope wrong by under-counting tail items. The audit is the load-bearing piece; if the audit is clean, the round may be as small as one or two commits.

**Sub-phase 3 (drill mode) and sub-phase 4 (cron-runner wiring) come after.** Drill mode also has scaffolding from `d722017`; sub-phase 3 will follow this round's audit-and-polish pattern. Cron-runner wiring is small enough to slot in as a mini-round whenever sub-phase 3 lands.

## 2. Existing scaffolding audit

### What's in `main` today

- **`src/app/(app)/page.tsx`** — server component (non-async per the RSC patterns rule). Initiates four parallel promises (`masteryStatesPromise`, `nearGoalPromise`, `triagePromise`, `recommendedSubTypePromise`), drills them through to `<MasteryMap>` via React.use(). `cacheComponents: true` ordering is handled (the `Date.now()` read sits inside a `.then()` chained off the auth-cookie-dependent userId promise, satisfying the framework's uncached-data ordering).
- **`src/app/(app)/layout.tsx`** — the diagnostic-completed gate. Verified clean by sub-phase 1's verification (commit 1, plan §7 scenario 5). The gate query uses `practice_sessions_user_type_ended_idx` with the three filters `type = 'diagnostic' AND ended_at_ms IS NOT NULL AND completion_reason != 'abandoned'`.
- **`src/components/mastery-map/mastery-map.tsx`** — `"use client"` shell, consumes the four promises, renders header (h1 + NearGoalLine), two `<SubTypeRow>` groups (Verbal × 5 BookOpen + Numerical × 6 Calculator), centered `<StartSessionButton>`, footer `<TriageAdherenceLine>`.
- **`src/components/mastery-map/mastery-icon.tsx`** — `<MasteryIcon>` primitive. Maps `mastery_state.current_state` to a visual: `mastered` filled, `fluent` half-filled (`fill-foreground/50`), `learning` and `decayed` outlined, `undefined` outlined+dimmed (`stroke-foreground/40 opacity-50`). PRD §5.2 enumerates `mastered`/`fluent`/`learning`/`not yet attempted`; the icon's `decayed` mapping ("treat as fallen-back-to-learning visually") is a SPEC-§9.3 addition not in the PRD. **Open question §10.1.**
- **`src/components/mastery-map/near-goal-line.tsx`** — single `<p>` reading `text-foreground/70 text-sm`.
- **`src/components/mastery-map/start-session-button.tsx`** — `<a href={`/drill/${subTypeId}`}>` wrapped in `<Button asChild>`. Routes to drill configure (also pre-existing per `d722017`). Header comment notes "if every sub-type is mastered the alphabetic tie-break picks numerical.averages_ratios" — degenerate but specified.
- **`src/components/mastery-map/triage-adherence-line.tsx`** — small-sample branch handled (renders "small sample — N prompts so far" when `ratio === null` per `triageRolling30d`'s SPEC §9.7 contract).
- **`src/server/mastery/near-goal.ts`** — pure function. Returns `Set a target date to see today's goal.` when `targetDateMs === undefined`; otherwise `${N} session${plural} today to stay on track.` with `N = ceil(remainingNonMastered × 2 / max(1, daysRemaining))`.
- **`src/server/mastery/recommended-next.ts`** — pure function. Picks lowest-mastery sub-type (`undefined < learning < decayed < fluent < mastered`); deterministic alphabetic tie-break.
- **`src/server/triage/score.ts`** — `triageRolling30d(userId)`: indexed scan of attempts joined to practice_sessions, filtered by `attempts.id >= uuidv7LowerBound(NOW - 30d)`. Returns `{fired, taken, ratio}`; `ratio` is null when `fired < 3` (small-sample threshold).

### What works — verified by audit

The data path from sub-phase 1's diagnostic completion to the Map is intact in principle. The `masteryRecomputeWorkflow` upserts `mastery_state` rows for distinct sub-types touched in the finalized session; `loadMasteryStates` reads them; the `<MasteryIcon>` renders the level. **The §5.2 smoke (`scripts/dev/smoke/diagnostic-mastery-recompute.ts`) verifies this chain in ~1 second on the dev DB.** No drift expected; verification confirms.

### What's likely broken or missing — to be confirmed by this round

1. **Empty-state race window.** When `mastery_state` is empty for a user who has just completed the diagnostic, the existing render produces eleven outlined "not yet attempted" icons. That misrepresents the user — they DID attempt all eleven sub-types in the diagnostic; the workflow just hasn't upserted yet. The plan's §3 specifies the fix.

2. **Loading state during the suspense fallback.** The page-level `<React.Suspense>` fallback is a single line of muted text ("Loading…"). The Map's first render is server-driven, so the fallback is brief in normal flows; but on a slow network or after a cold-start, this is what the user sees. **Open question §10.2** — is the "Loading…" string acceptable for sub-phase 2, or should it be a structurally-faithful skeleton (eleven greyed circles in the right grid)?

3. **Decayed-state visual.** As above (§10.1).

4. **The "secondary actions" PRD calls for.** PRD §5.2 lists "Review (3 due)" / "Full-length test" / "Test-day simulation" / "History" as small secondary actions. None of these exist in the current Map. **Open question §10.3** — defer all four to later sub-phases (review queue, full-length, simulation, history all require sub-phase-3+ work)? Or surface a History stub now (history is a viewer, not an engine — it depends only on existing `practice_sessions` and `attempts`)?

5. **Returning-user vs. just-finished-diagnostic.** The Map renders identically in both cases today. PRD §5.2 doesn't differentiate. Sub-phase 2 should keep them visually identical (the data IS the same: the user's mastery state); the only special-casing is the empty-state window.

## 3. Empty state during the post-diagnostic race window

### What's missing / what should exist

A user who finishes the diagnostic, fills (or skips) the onboarding form on `/post-session/[sessionId]`, and lands on `/` may land **before** `masteryRecomputeWorkflow` has finished upserting `mastery_state` rows. In that window:

- `loadMasteryStates(userId)` returns an empty `Map<SubTypeId, MasteryLevel>`.
- The Map renders eleven outlined icons that look identical to "user has never attempted anything."
- `recommendedNextSubType(emptyMap)` returns `numerical.averages_ratios` (the alphabetic tie-break), so the CTA reads "Start drill: Averages & Ratios" — arbitrary and misleading.
- `deriveNearGoal({masteryStates: emptyMap, ...})` reports "11 session(s) today to stay on track" or similar nonsense.

The fix needs to satisfy three constraints:

1. **Distinguish "no diagnostic yet" from "diagnostic done, mastery being computed."** The first case never reaches `/` — the `(app)` gate redirects to `/diagnostic`. So if `loadMasteryStates` returns empty AND we're inside `(app)`, we're definitely in the race window.

2. **Don't poll synchronously on the server.** Server-side polling blocks the response. The empty-state render needs to ship and refresh client-side.

3. **The window is short (≤1s in dev, expected ≤10s in production).** Whatever UX surfaces during the window doesn't need to be elaborate.

### Implementation seam

Two parts:

**Part A — server-side detection.** `(app)/page.tsx`'s `loadMasteryStates` already returns the empty map cleanly. Add a sibling read for the `(app)` gate's same query (a completed-non-abandoned diagnostic exists for this user — already true by gate construction). When `loadMasteryStates` returns empty, the page renders the empty-state shell instead of the populated Map.

The simplest shape: pass an `isComputing: boolean` flag down to the client component, derived as `masteryStates.size === 0 && hasCompletedDiagnostic`. The latter is already true by the `(app)` gate; the former is the empty-map check. So the flag reduces to `masteryStates.size === 0`.

**Part B — client-side refresh.** When the client component receives `isComputing: true`, it renders an empty-state pane (heading: "We're computing your mastery state…"; body: "This usually takes a few seconds. The page will refresh automatically.") and starts a polling loop via `setInterval` that calls `router.refresh()` every 2 seconds for up to 30 seconds. On any non-empty fetch, the polling stops and the populated Map renders.

`router.refresh()` re-runs the server component (the `mastery_state` read), so the polling is a "ping the server" loop, not a separate API call. The Suspense boundary handles the re-render without flicker.

**Why not Suspense alone?** Suspense waits on a promise that resolves when *some* condition is met. The condition here is "mastery_state has been populated by the workflow," which is an external system's async timing — not a promise the page can await. Polling is the appropriate primitive.

**Why 30 seconds?** The §5.2 smoke completes in ~1s on dev. Production cold-start could plausibly stretch to 10–15s. 30s is the same generous ceiling the §5.2 smoke uses; consistent with the established pattern. Past the timeout: render the empty-state pane with a small "Still computing — refresh manually if this takes longer" message and stop polling. The user's `mastery_state` will populate eventually; manual refresh is a safe fallback.

### Files touched

- `src/app/(app)/page.tsx` — derive `isComputing` from `masteryStates.size === 0`; pass through.
- `src/components/mastery-map/mastery-map.tsx` — accept the `isComputing` prop; branch the render.
- `src/components/mastery-map/computing-state.tsx` (NEW) — the empty-state pane + polling effect.

### Schema / state changes

None.

### Verification scenarios

Real-DB harness, playwright-core directly:

1. **Race-window render.** Set up a completed diagnostic + zero `mastery_state` rows (manually delete any rows the workflow may have written, OR insert the session row with `completion_reason='completed'` but skip the workflow trigger). Navigate to `/`. Assert: empty-state pane heading visible; eleven outlined icons NOT visible; polling effect running (DOM check for the message, network check for `router.refresh()` invocations).
2. **Race-window resolution.** From scenario 1's setup, manually upsert three `mastery_state` rows. Within 2–3 seconds, the polling loop should observe the populated state and the Map should render the populated form. Assert: the three sub-types render their assigned levels; the other eight render as outlined.
3. **Race-window timeout.** From scenario 1's setup, do not populate `mastery_state`. After 30 seconds, the polling stops and a "Still computing — refresh manually" message surfaces.
4. **Returning-user (non-empty)** — direct render, no race-window pane, populated icons.

## 4. Visual and interaction polish

### What's missing / what should exist

Three small items that the audit may surface:

1. **Decayed-state visual.** Currently outlined identically to `learning`. PRD §5.2's enumeration doesn't include `decayed`; SPEC §9.3 does. **Resolution per §10.1:** keep `decayed` visually identical to `learning` for sub-phase 2. The Map is a categorical signal; "this sub-type needs work" reads the same whether the underlying state is `learning` or `decayed`. Sub-phase 4 (when the review queue actually populates) will reconsider.

2. **Loading state during the Suspense fallback.** Currently a one-line muted "Loading…". **Resolution per §10.2:** keep it. The fallback is brief in normal flows (server-rendered first paint); a structurally-faithful skeleton is over-engineering for the budget.

3. **CTA degenerate case.** When all 11 sub-types are `mastered`, `recommendedNextSubType` picks `numerical.averages_ratios` (alphabetic). The CTA reads "Start drill: Averages & Ratios" which is fine but implies more work to do than there is. PRD §5.2: "If/when every sub-type is mastered, the spec says the CTA degrades to 'Start full-length test'." Full-length is Phase 5. **Resolution per §10.4:** for sub-phase 2, accept the degenerate label. A user reaching all-mastered through real practice in v1 (Phase 3 only ships drill) is already extreme.

### Files touched

None for the resolved items above. If the audit surfaces other drift, list here.

### Schema / state changes

None.

### Verification scenarios

The render-time correctness of these items is covered by the existing `(app)/page.tsx` smoke at `scripts/dev/smoke/phase3-commit5.ts` (which verifies the eleven-icon render with synthetic mastery_state). Sub-phase 2's audit confirms or refutes drift.

## 5. Triage adherence: schema verification + render

### What's missing / what should exist

The triage adherence indicator on the Map reads `triageRolling30d(userId)` from `src/server/triage/score.ts`. The function reads `attempts.triagePromptFired` and `attempts.triageTaken` directly (not from `metadata_json`). **Audit point:** verify these columns are populated correctly by `submitAttempt` after the focus-shell post-overhaul-fixes round.

The post-overhaul-fixes round (commits `2b3709d`, `5ddcb8f`, etc.) altered the focus-shell's triage-prompt-fired and triage-take detection. The reducer state and the `submitAttempt` call site need to round-trip those bools intact. If they don't, the triage adherence line silently reads zero.

### Implementation seam

This is purely an audit. The expected pattern:
1. Drive a diagnostic with intentionally-slow attempts that fire the triage prompt on, say, 5 of 50 questions.
2. Take the prompt (Space key or click) on 3 of the 5; let the other 2 pass without taking.
3. After completion, query `attempts` for that session: assert `count(triage_prompt_fired) = 5` and `count(triage_taken) = 3`.
4. Wait for the workflow / call `triageRolling30d(userId)` directly: assert `{fired: 5, taken: 3, ratio: 0.6}`.

If the columns aren't populating correctly, this is the place to find out — it's a real bug worth fixing here, not deferring.

### Files touched

If audit clean: none. If a `submitAttempt` plumbing bug surfaces: the fix lands in `src/server/sessions/submit.ts` and/or `src/components/focus-shell/focus-shell.tsx` (whichever side is dropping the bool). Surface as a separate commit if found.

### Schema / state changes

None expected. (The columns exist; we're verifying they populate, not adding them.)

### Verification scenarios

Real-DB harness as above. Smoke shape matches the §5.2 smoke pattern: drive a session with controlled triage events, assert column population, assert `triageRolling30d` returns the expected aggregate.

## 6. Secondary actions (deferred-by-decision)

### What's missing / what should exist

PRD §5.2 lists four secondary actions in low-contrast styling: Review (3 due), Full-length test, Test-day simulation, History. None exist on the current Map. Each maps to a sub-phase that hasn't shipped:

- **Review (X due)** — needs the review queue to populate. Sub-phase 4 (cron-runner wiring) ships heartbeats; sub-phase 5 ships the review session UI. Until at least sub-phase 4, the count is always zero.
- **Full-length test** — Phase 5.
- **Test-day simulation** — Phase 5/6.
- **History** — viewer over `practice_sessions` and `attempts`. Could ship now (no engine work required), but it's a separate UI surface (a list view, click-into-detail navigation) that doesn't share components with the Map.

**Resolution per §10.3:** sub-phase 2 ships none of these. The Map renders the four primary elements (h1, near-goal, eleven-icon grid, primary CTA, triage adherence line) and nothing else. Adding placeholder secondary actions that link to 404s is worse UX than not showing them. They land in the round that ships the underlying engine.

### Files touched

None.

### Verification scenarios

Render the Map. Assert: no secondary actions, no Review/Full-length/Simulation/History links visible.

## 7. Sequencing and commits

Two commits, plus an optional third if the audit surfaces drift. Each commit lints, typechecks, and passes its verification scenarios before the next is started.

1. **`feat(mastery-map): empty-state pane during post-diagnostic race window`.** Per §3. Adds the `isComputing` prop chain through `(app)/page.tsx` → `<MasteryMap>` → new `<ComputingState>` component. Ships the pollign loop. The single largest deliverable in the round.

2. **`docs: close phase3-mastery-map plan; SPEC §10.1 step 7 + §9.6 cross-references`.** SPEC §10.1's step 7 ("After the user saves or skips targets, route back to / which now shows the populated Mastery Map") gets a parenthetical for the race-window case ("…or the empty-state pane during the brief workflow window, see §6.10b"). New SPEC subsection §6.10b (or a paragraph appended to §10.1) documents the empty-state pane. Plan status flips to "shipped" with the commit hashes filled in.

3. **(optional, only-if-audit-finds-drift) `fix(mastery-map): <specific drift>`.** If §2's audit, §4's polish review, or §5's triage column verification surfaces a real bug, fix it here. Lands BEFORE commit 1 (so the fix's effect is visible in commit-1's verification).

## 8. Verification protocol carry-forward

Established discipline from the focus-shell post-overhaul round (`docs/plans/focus-shell-post-overhaul-fixes.md` §7) and sub-phase 1 (`docs/plans/phase3-diagnostic-flow.md` §9) carries forward unchanged:

- `playwright-core` directly with `page.screenshot({ timeout: 30_000 })`.
- `page.mouse.move(10, 10)` before any post-click `getComputedStyle` measurement.
- Real `page.click()` for any user-interaction-gated paths (the primary CTA, any future secondary action; not used in sub-phase 2 since the only interaction the Map ships is the CTA click which routes to a pre-existing drill page).
- Real-DB harness for everything that touches `mastery_state` or `attempts`. The `(app)` gate's database round-trip on every render is verified by the existing layout query — no new harness for it.
- `EXPLAIN ANALYZE` for any new query on a hot route. The race-window detection (§3) is `masteryStates.size === 0` against an already-running query; no new query.
- Throwaway harness scripts under `scripts/_<commit>-harness.ts` are moved out of the project tree before commit so `tsgo` doesn't pick them up.

The "smoke-script directory" pattern from sub-phase 1's commit 5 (SPEC §6.14.8) applies for any verification that requires the dev Next.js server running. The race-window scenarios (§3 verification 1–4) all run under `bun test` against the docker postgres alone — no dev server dependency — so they belong in `src/components/mastery-map/*.test.ts` or `src/app/(app)/page.test.ts`.

## 9. Out of scope

Explicit list — items deliberately not addressed in sub-phase 2:

- **Standard drill mode UI changes** (configure page wording, drill-run behavior). The drill scaffolding exists in `main` (commit `d722017`); sub-phase 3 will audit it the same way this round audits the Map. Sub-phase 2 leaves drill alone.
- **The History tab** (PRD §5.4). A viewer over `practice_sessions` + `attempts`. Could ship in sub-phase 2 mechanically; deferred per §10.3 because it's a separate UI surface and the deploy-coupling unblock doesn't depend on it.
- **Review (X due) secondary action.** Sub-phase 5+ when the review queue populates.
- **Full-length test, simulation.** Phase 5/6.
- **Heartbeats / abandon-sweep cron-runner wiring.** Sub-phase 4. Sub-phase 1's `startSession` synchronous finalization is sufficient for the user-facing path; sub-phase 2's Map renders correctly without heartbeats since the gate query and the mastery_state read are both insensitive to heartbeat freshness.
- **Score-to-target calibration UI changes.** Sub-phase 1 already captures `target_percentile` and `target_date_ms` via `<OnboardingTargets>`. Sub-phase 2's Map reads `target_date_ms` for `deriveNearGoal`; no new UI for editing these (Phase 5/6 ships a settings page).
- **Mastery-icon decayed-distinct visual.** Per §10.1, deferred.
- **Skeleton-shaped Suspense fallback.** Per §10.2, deferred.
- **The `diagnostic_overtime_note_shown_at_ms` column drop.** Sub-phase 1 left it vestigial; sub-phase 2 doesn't touch the schema.

## 10. Open questions / resolutions

Four questions surfaced during plan-writing; all four resolved before implementation.

### 10.1 Decayed-state visual on the Map

**Question:** Should `decayed` mastery render distinctly from `learning` on the Map (e.g., a small dot or a different stroke color) so the user sees that those sub-types need review, not first attempts?

**Resolution: no, treat decayed as visually identical to learning for sub-phase 2.** PRD §5.2's enumeration doesn't include `decayed`; the categorical signal "this sub-type needs work" reads the same regardless of the underlying state. Distinguishing decayed becomes meaningful when the Review (X due) secondary action surfaces (sub-phase 5+) — at that point, decayed sub-types ARE the review queue's drivers and warrant a visual differentiator. Sub-phase 2 keeps the existing `mastery-icon.tsx` mapping (decayed → outlined identical to learning) unchanged.

### 10.2 Loading state during Suspense fallback

**Question:** Should the page-level Suspense fallback be a structural skeleton (eleven greyed circles in the right grid + placeholder lines for header/CTA/footer) or the existing one-line muted "Loading…"?

**Resolution: keep "Loading…".** The Suspense fallback is brief in the normal flow because the page is server-rendered (the fallback is what the browser sees during the navigation, not during data fetch). A structural skeleton would be visible only during cold-start or slow networks — the same scenarios where the empty-state pane (§3) ALSO surfaces. Adding skeleton scaffolding for an edge case that's already covered by a more substantive UX is over-engineering. Revisit in Phase 5/6 if user feedback suggests the brief muted text feels broken.

### 10.3 Secondary actions (Review, Full-length, Simulation, History)

**Question:** Ship any of the four PRD §5.2 secondary actions in sub-phase 2, even as link-to-404 placeholders? History is the only one whose engine doesn't depend on later sub-phases.

**Resolution: ship none.** Placeholder links to 404s are worse UX than not surfacing the option. History as a real surface needs its own design pass (list density, click-into-detail navigation, sub-type filtering); slotting a stub in sub-phase 2 risks shipping something that gets thrown away. Each secondary action lands in the round that ships its engine: Review (X due) in sub-phase 5, Full-length and Simulation in Phase 5/6, History in Phase 6. The Map's clean four-element layout (h1 + near-goal + grid + CTA + triage line) is the v1 surface.

### 10.4 CTA copy when all 11 sub-types are mastered

**Question:** When `recommendedNextSubType` returns a sub-type because of the alphabetic tie-break (all sub-types mastered), the CTA reads "Start drill: <arbitrary sub-type>". Should we detect the all-mastered case and surface different copy?

**Resolution: accept the degenerate label for sub-phase 2.** A user reaching all-mastered through real practice in Phase 3 (drill mode only, no full-length test) is extreme — drilling 11 sub-types to `mastered` requires sustained accuracy AND latency under threshold across all of them. Even if it happens, "Start drill: Averages & Ratios" still routes to a working drill (the user can re-do a sub-type they've mastered). The PRD spec ("If/when every sub-type is mastered, the CTA degrades to 'Start full-length test'") only makes sense once full-length ships in Phase 5. Sub-phase 2 leaves the CTA as-is.

**Future iteration noted.** The all-mastered case may need copy iteration if it ever surfaces in real usage — something neutral like "All sub-types mastered. Drill anything to keep sharp." would read better than the alphabetic tie-break label. **Don't redesign the recommendation logic to hide the case** — the alphabetic tie-break is a deterministic property the test suite depends on (`recommended-next.ts`'s comment explicitly notes this) and changing it ripples into selection.test.ts. A future Phase 5+ commit can add an `if (allMastered) return "All sub-types mastered. …"` short-circuit at the *render* layer (`<StartSessionButton>`) without touching the recommendation function.
