# Plan — Phase 5, sub-phase 2: adaptive difficulty walker

> **Status: planning, not yet implemented.** Drafted audit-first against `main` post-diagnostic-bug-fixes-round close (HEAD = `a9df0f6` at draft time). The master plan's §4 framing is the starting point; where the audit recommends a different shape, the plan recommends that shape with rationale.

This plan covers Phase 5 sub-phase 2 — the adaptive difficulty walker that closes `ErrAdaptiveDeferred` in `src/server/items/selection.ts` and flips drill mode from `uniform_band` to `adaptive`. It is the second sub-phase of Phase 5 and is independent of sub-phase 1 (post-session review surface, shipped 2026-05-04 across `c1ee435` / `0ec6f4f` / `a0aa1fd` / `c71770c` / `8d4195e` / `eaeb882` / `022dbd6`). Sub-phase 5 (dojo belt indicator) depends on this sub-phase to visualize the walk; sub-phases 3 (full-length) and 4 (click-to-highlight) are independent of it.

This sub-phase is **server-side only** per master plan §4 — no UI surface, no Alpha Style work, no new components. The walker is a pure function over an in-session attempt window plus the wiring that reads that window from `attempts` and feeds the function's output back into `pickWithFallback`'s `requestedTier`. The plan shape is correspondingly different from sub-phase 1's seven-commit UI-heavy template: 3-4 commits, no `teach-alpha-style` setup, no `audit / normalize / polish` cadence, no shell-shape refactor.

The dev DB is in single-coherent-state post-three-operational-rounds (taxonomy-restructure → data-wipe → testbank-re-extraction): 14 sub-types under the v1 taxonomy, 439 live items, 50-entry diagnostic mix, Reading B `targetQuestionCountFor` derivation, audio-on-Q1 + line-height-tightening fixes from the just-closed diagnostic-bug-fixes round. The bank now has the empirical depth across all 14 × 4 = 56 tier cells that adaptive-difficulty selection needs to exercise meaningfully — pre-re-extraction the bank was too thin in places (taxonomy round added three sub-types at zero items each; testbank-re-extraction filled them).

## 1. Why this sub-phase, why now

This is Phase 5's second sub-phase. Three forcing functions:

- **Sub-phase 1 closed clean.** The post-session review surface shipped across seven commits 2026-05-04 — the foundation that downstream sub-phases (3, 4, 5) build on is in place. Sub-phase 2 is independent of that foundation; it can run next without further dependency-chain unblocking. Master plan §8's sequencing carved 2 second precisely because it has no Phase 5 dependencies and sub-phase 5 (dojo belt indicator) will visualize its output.

- **Drill currently uses `uniform_band`; adaptive is the contract.** SPEC §9.1 specifies the adaptive stepper shape (the `nextDifficultyTier(ctx)` pure function with the 0.8× / 1.2× latency zones); SPEC §9.2's dispatch table reads `drill → 'adaptive'`. The implementation at `src/server/items/selection.ts` line 100-105 returns `'uniform_band'` for drill and the `'adaptive'` arm of the switch throws `ErrAdaptiveDeferred`. There is observable drift between the SPEC and the shipped engine; sub-phase 2 reconciles it by shipping the walker. The `// Phase 5 sub-phase 2 changes the drill → uniform_band line to drill → adaptive` comment at line 99 is the marker that lifts.

- **Bank has empirical depth post-re-extraction.** Adaptive selection produces meaningful tier-switching only when each sub-type's 4-tier band has live items at every tier the walker can request. Pre-re-extraction the bank was 50 items across the original 11-sub-type taxonomy with no items in three new sub-types. Post-re-extraction the bank is 439 items across the 14-sub-type taxonomy. The testbank-re-extraction round closed with `numerical.workrate.easy = 0` and `numerical.lowest_values.hard = 0` flagged for follow-up; the audit in §2 verifies the current state of all 56 tier cells before sub-phase 2 lands.

The cost of running adaptive against thin tier cells is bounded — the existing `pickWithFallback` chain (recency-soft → tier-degraded → session-soft per SPEC §9.2) is the safety net. Adaptive can request `hard` and the engine will serve `medium` if `hard` is exhausted; the tier-degraded fallback fires; `metadata_json.fallback_level === 'tier-degraded'` records the substitution. Session never throws mid-drill.

## 2. Audit findings against `main`

The current state, as of `main` HEAD `a9df0f6`:

### 2.1 Current `nextDifficultyTier` state in `selection.ts`

- The function does NOT exist on disk. SPEC §9.1's pure-function shape is documented but unbuilt. The closest signal in code is `initialTierFor(state)` at lines 380-405 — a pure function over `mastery_state.current_state` + `was_mastered` returning the SPEC §9.1 initial-tier table (`learning + ¬wm → easy`, `learning + wm → medium`, `fluent → medium`, `mastered → hard`, `decayed → medium`, `undefined → medium`). This is the function the walker uses for the drill's STARTING tier; the walker reads from there and steps based on the in-session attempt window.
- `ErrAdaptiveDeferred` exists at line 49 and is thrown from the `'adaptive'` arm of the dispatch switch at lines 451-455. Removing the throw and wiring the walker is the load-bearing edit.
- `selectionStrategyForSession(type)` at lines 100-106 currently returns `'uniform_band'` for drill. Flipping this to `'adaptive'` is the second load-bearing edit.
- `getNextUniformBand(ctx)` at lines 407-444 is the existing drill arm: it reads `mastery_state` via `readMasteryStateFor(userId, subTypeId)`, derives the initial tier via `initialTierFor`, and feeds that tier as `requestedTier` to `pickWithFallback`. It does NOT read in-session attempts; it does NOT walk the tier across the session. The new `getNextAdaptive(ctx)` needs all of `getNextUniformBand`'s shape PLUS the in-session attempt-window read PLUS the `nextDifficultyTier` call.

### 2.2 Mastery state shape — corrects the user's framing

The user's brief described mastery enum as `'unknown' | 'learning' | 'approaching' | 'mastery'`. **That's not the v1 contract.** Per SPEC §9.3 + `src/db/schemas/practice/mastery-state.ts` (verified in `selection.ts:357-363`), the enum is:

```
'learning' | 'fluent' | 'mastered' | 'decayed'
```

Plus a separate `was_mastered: boolean` flag that `initialTierFor` already reads to disambiguate `learning + wm` (medium) from `learning + ¬wm` (easy). The walker inherits this enum through `initialTierFor`'s output (it consumes the initial tier the table-lookup produces — it does NOT switch on the mastery state directly). This means the §3 walker design is straightforward: the walker is a pure function over the IN-SESSION attempt window only, with the initial tier derived from `mastery_state` once at session start. The walker does not re-read `mastery_state` mid-session — that's `masteryRecomputeWorkflow`'s job, fired async post-`endSession`.

The user's framing also mentioned probabilistic-vs-deterministic as an open question for §3. **SPEC §9.1 has already settled this — the walker is deterministic with the 0.8×/1.2× zone widths matching PRD §4.2's "comfortably under" / "well above" framing.** The §9 open question on this resolves as "settled by SPEC §9.1; no §3 decision to make." If sub-phase 2's plan wants to deviate, it has to argue against the SPEC pin rather than picking up an undefined design.

### 2.3 Test surface: `selection.test.ts` baseline

- Three tests in `src/server/items/selection.test.ts` (211 lines): `withinCellDeterminism`, `withinCellVariationAcrossSessions`, `noReServeInSession`. The first two exercise `pickItemRow` directly; the third drives a full diagnostic to completion via `startSession` + `submitAttempt`. None touch `getNextUniformBand` or `nextDifficultyTier`.
- Project-wide `bun test` baseline is 38/38 (carried from the diagnostic-bug-fixes round close). The walker work is expected to grow this count via new pure-function unit tests on `nextDifficultyTier` + new integration tests on `getNextAdaptive`'s tier-walk behavior.
- No existing test asserts `selectionStrategyForSession("drill") === "uniform_band"`. The flip to `"adaptive"` does NOT break any existing test by name. Existing tests that exercise drill via `startSession({ userId, type: "drill", subTypeId })` will instead exercise the adaptive arm — the engine surface is the same (`getNextItem(sessionId)` returns `ItemForRender | undefined`) so they continue to pass through. (No such drill-side tests exist in `selection.test.ts` currently; the test file is diagnostic-focused.)

### 2.4 Drill route: sub-type-aware in a way the walker can leverage

- `src/app/(app)/drill/[subTypeId]/run/{page,content}.tsx`. The route's `[subTypeId]` param drives `startSession({ userId, type: "drill", subTypeId })`; `practice_sessions.subTypeId` is populated; `loadSessionContext` reads it back via `asSubTypeId`. The walker plugs in at `getNextItem` time — the route does NOT need to change.
- Drill `onEndSession` flips to `router.push("/post-session/" + sessionId)` post-sub-phase-1 (commit `c1ee435` 2026-05-04). The walker does not affect this; the post-session render layer is independent.
- No drill-side state is held in the route; the walker reads everything it needs from the DB on each `getNextItem` call. Serverless-state-derivation rule from `selection.ts:14-17` carries forward unchanged.

### 2.5 Bank depth: per-sub-type per-tier item counts

The testbank-re-extraction round close (commit `2f7b2c8`-era) flagged two zero-items cells: `numerical.workrate.easy = 0`, `numerical.lowest_values.hard = 0`. These are tracked for the tagger-improvement round, NOT in scope for sub-phase 2. The walker handles zero-cell cases via the existing `pickWithFallback` chain — requesting `hard` on `lowest_values` falls through to `medium`; requesting `easy` on `workrate` falls through to `medium` then `easy` (wait, easy is the floor — falls through to `tier-degraded` from the next tier up actually — verify the `tiersDownFrom` direction at audit time).

**The audit must verify all 56 tier cells before commit 2** to confirm the current state of the bank and identify any cells that have gone to zero since the testbank-re-extraction round. Procedure: one-shot `db.select({ subTypeId, difficulty, n: count() }).from(items).where(eq(items.status, 'live')).groupBy(items.subTypeId, items.difficulty)`; assert no cell has fewer than 1 item OR document each zero-cell as a known fallback target. The 14 × 4 = 56 cells × at-least-1-item-each is NOT a hard precondition for the walker (the fallback chain handles zero cells); the verification is a state-snapshot for commit-message capture per SPEC §6.14.7.

### 2.6 SPEC drift summary

Two SPEC sections to reconcile at sub-phase close:

- **SPEC §9.1.** Already specifies the walker; no prose change at close, but the existing line "Phase 5 sub-phase 2 closes the adaptive deferral" in `selection.ts:8` reframes past-tense.
- **SPEC §9.2.** Strategy dispatch table already reads `drill → 'adaptive'`. The "Code-cleanup landed 2026-05-04" parenthetical that mentions "the adaptive walker (§9.1) can still serve Brutal-tier *items* inside a Standard drill via the next-harder-tier step" stays accurate — the walker can step up from `hard` to `brutal` per `stepUp(currentTier)` in SPEC §9.1's reference implementation.

No PRD edits this sub-phase. PRD §4.2's drill-mode framing already describes adaptive-difficulty behavior; the v1-code-cleanup round (`docs/plans/phase5-v1-code-cleanup.md`) cut speed-ramp + brutal drill modes from the timer_mode enum but the adaptive walker on standard drills was always v1-scope.

### 2.7 Schema readiness

- `attempts`: has `correct: boolean`, `latencyMs: integer`, `servedAtTier: difficulty enum`, `sessionId`, `id` (UUIDv7 → chronological ordering via `ORDER BY id DESC LIMIT 10`). Sufficient.
- `practice_sessions`: has `subTypeId: text` (per-drill — populated for drill type). Sufficient.
- `mastery_state`: read once at session start via `readMasteryStateFor` in `getNextUniformBand` (carried forward unchanged into `getNextAdaptive`). Sufficient.
- `sub_types` config: has `latencyThresholdMs` per sub-type (in `src/config/sub-types.ts`). Sufficient — the walker reads the threshold for the current drill's sub-type and uses it as the comparand for the latency zone widths.

**No schema migrations required.** The walker is purely a derivation + branching layer over existing tables. Master plan §4 said "no schema changes"; confirmed.

## 3. Walker design

### 3.1 Pure-function shape (matches SPEC §9.1)

The walker is `nextDifficultyTier(ctx: AdaptiveContext): Tier`, a pure function with no I/O, exported from `src/server/items/selection.ts` (or a sibling `src/server/items/adaptive.ts` — see §4 for the placement decision). Signature per SPEC §9.1:

```ts
type Tier = "easy" | "medium" | "hard" | "brutal"

interface AdaptiveContext {
    last10Correct: boolean[]
    last10LatencyMs: number[]
    currentTier: Tier
    latencyThresholdMs: number
}

function nextDifficultyTier(ctx: AdaptiveContext): Tier
```

Behavior per SPEC §9.1's reference implementation:

- **Floor: `last10Correct.length < 10` → return `currentTier`.** No walking until the in-session window has 10 attempts. The drill starts at `initialTierFor(masteryState)` and holds for the first 10 attempts before any step.
- **Step up: `accuracy ≥ 0.9 AND medianLatency < threshold × 0.8` → `stepUp(currentTier)`.** Both conditions required.
- **Step down: `accuracy ≤ 0.6 OR medianLatency > threshold × 1.2` → `stepDown(currentTier)`.** Either condition triggers step-down.
- **Hold: otherwise → return `currentTier`.**

### 3.2 `stepUp` / `stepDown` semantics

Tier order ascending: `easy < medium < hard < brutal`. (`selection.ts:148` defines `TIER_ORDER_DESCENDING = ['brutal', 'hard', 'medium', 'easy']` for the tier-degraded fallback; the walker's stepUp/stepDown can reuse the same constant.)

- `stepUp("easy") = "medium"`, `stepUp("medium") = "hard"`, `stepUp("hard") = "brutal"`, `stepUp("brutal") = "brutal"` (clamps at top).
- `stepDown("brutal") = "hard"`, `stepDown("hard") = "medium"`, `stepDown("medium") = "easy"`, `stepDown("easy") = "easy"` (clamps at bottom).

Clamps are deliberate: the walker never returns out-of-range tiers. The existing `pickWithFallback` chain handles "this tier has no live items" via tier-degradation — the walker doesn't need to know about bank depth.

### 3.3 Decision: probabilistic vs deterministic

**Resolution: deterministic per SPEC §9.1.** The user's brief named this as an open question; the SPEC has already settled it. The 0.8×/1.2× zone widths match PRD §4.2's "comfortably under" / "well above" framing. If a future round wants probabilistic biases (e.g., "step up with 70% probability"), that's a SPEC §9.1 amendment — not a sub-phase-2-time decision.

The deterministic shape has two operational benefits the probabilistic shape doesn't:

- **Reproducible verification.** A test fixture with a fixed `(last10Correct, last10LatencyMs)` produces a deterministic next tier. The §5 unit tests can assert exact step-up / step-down / hold outputs.
- **No RNG to seed.** The engine has no other RNG-dependent paths in the drill arm (`pickItemRow`'s salt is the `sessionId`); introducing one for the walker would add an RNG-determinism plane of testing surface for marginal pedagogical value.

### 3.4 Edge cases

**Tier exhausted in a sub-type (mid-session).** The walker decides `requestedTier`; `pickWithFallback` handles "this tier is exhausted under (recency ∪ session) exclusion" via the existing chain (recency-soft → tier-degraded down → session-soft). The walker does NOT need to know whether the tier is exhausted. `metadata_json.fallback_level` records the substitution. Behavior: walker requests `hard`; bank serves `medium` with `fallback_level === 'tier-degraded'`; the next walker iteration reads `served_at_tier = medium` from `attempts` (per SPEC §9.1 last paragraph: "the recompute window for adaptive uses `served_at_tier`, not `items.difficulty`, so fallback-served items affect adaptive walking based on what the user actually experienced").

**Sub-type with insufficient bank depth (zero in a tier the walker requests).** Same path as tier-exhausted; the fallback chain catches it. Verification scenario in §5 covers this with the `lowest_values.hard = 0` / `workrate.easy = 0` cells.

**`'unknown'` mastery state edge case.** The user's brief named `'unknown'` as a state to handle for first-attempts-pre-3-attempt-floor. The v1 mastery enum has no `'unknown'` (per §2.2); a user with no `mastery_state` row returns `undefined` from `readMasteryStateFor`, which `initialTierFor` maps to `medium`. The walker starts at `medium`; the first 10 attempts hold there per the floor; from attempt 11 onward the walker steps. No special handling needed.

**First-attempts pre-10-attempt floor.** The walker's floor at `last10Correct.length < 10` ensures the walker holds the initial tier until 10 in-session attempts have landed. For drills where the user never reaches 10 attempts (e.g., a 5-item drill), the walker holds the initial tier across the entire session. This is correct: a 5-item drill is too short to walk; the initial tier from `mastery_state` is the right decision for all 5 items. The `targetQuestionCount` for drill mode is configured per-route — verify at audit time what the v1 default is and whether short drills are common enough to surface concern (likely not: drill mode currently configures meaningful question counts).

**Walker scope: drill ONLY, not diagnostic.** Diagnostic uses `'fixed_curve'` strategy → `getNextFixedCurve` → `shuffledDiagnosticOrder` → `slot.difficulty` from `diagnostic-mix.ts`. The diagnostic mix has fixed tier per slot (the rebalance round shipped this); the walker would conflict with diagnostic-mix's pre-set tiers. Sub-phase 2 does NOT change diagnostic; only drill flips from `uniform_band` to `adaptive`. Full-length and simulation also use `'fixed_curve'` (pre-set tier per slot) and are unaffected.

### 3.5 Walker decides ONLY tier, not sub-type

Drill is sub-type-locked per the route param `[subTypeId]`. The walker reads `ctx.subTypeId` from the session row (via `loadSessionContext`) and walks tier WITHIN that sub-type. There is no sub-type-walking logic — that would be a different feature (cross-sub-type drills, recommended-next-sub-type) which v1 does not ship. PRD §6.3's `recommendedNextSubType` is a Mastery Map navigation aid, not a within-drill walker.

## 4. Selection engine integration

### 4.1 Where `nextDifficultyTier` plugs in

The walker is a pure function; it produces a `Tier`. The wiring is:

1. `selectionStrategyForSession(type)` line 102 — flip `if (type === "drill") return "uniform_band"` to `if (type === "drill") return "adaptive"`.
2. `getNextItem(sessionId)` arm at lines 451-455 — replace the `throw ErrAdaptiveDeferred` with `return getNextAdaptive(ctx)`.
3. New function `getNextAdaptive(ctx: SessionContext): Promise<ItemForRender | undefined>` — the drill arm of the dispatch.

`getNextAdaptive`'s shape mirrors `getNextUniformBand`'s with one addition: the in-session attempt-window read.

### 4.2 In-session attempt-window read

The walker reads the most recent 10 in-session attempts on the current sub-type. The query:

```ts
db.select({
    correct: attempts.correct,
    latencyMs: attempts.latencyMs,
    servedAtTier: attempts.servedAtTier
})
.from(attempts)
.where(eq(attempts.sessionId, ctx.id))
.orderBy(desc(attempts.id))
.limit(10)
```

(Drill is sub-type-locked, so all in-session attempts are on `ctx.subTypeId` by construction — no `subTypeId` filter needed in the query. The `attempts_session_id_idx` index covers it.)

The query returns 0-10 rows in reverse chronological order. The walker's `currentTier` is derived as: if 0 rows, `initialTierFor(masteryState)`; otherwise, the `servedAtTier` of the most-recent row. (This is the natural read of "what tier am I currently at?": the most recent attempt's served tier.) The `last10Correct` and `last10LatencyMs` arrays are mapped from the rows directly.

**Why `servedAtTier`, not `fallbackFromTier`?** Per SPEC §9.1 last paragraph: "The recompute window for adaptive uses `served_at_tier`, not `items.difficulty`, so fallback-served items affect adaptive walking based on what the user actually experienced." If the engine intended `hard` but served `medium` (tier-degraded fallback), the walker treats that attempt as a `medium` attempt — because that's what the user saw. This is the contract.

### 4.3 New file vs. extending `selection.ts`

**Recommendation: extend `selection.ts` in place; do NOT create `src/server/items/adaptive.ts`.**

Rationale:

- `selection.ts` is already 484 lines; the walker adds ~80-120 lines (the pure function, `stepUp` / `stepDown`, the in-session-window query, `getNextAdaptive`). Total post-sub-phase-2 around 600 lines — within the comfortable single-file range for this codebase.
- The walker is tightly coupled to `selection.ts`'s existing types (`SessionContext`, `ItemForRender`, `Tier` aliasing as `Difficulty`). Extracting to a sibling forces re-exporting types or duplicating them; both paths add friction.
- The pure `nextDifficultyTier` function is the only piece sub-phase 5 (dojo belt indicator) might want to import. Exporting it from `selection.ts` is fine; sub-phase 5 imports `nextDifficultyTier` and `Tier` from `@/server/items/selection`.

### 4.4 `uniform_band` removal vs. fallback

**Recommendation: REMOVE `uniform_band` and `getNextUniformBand` in commit 3.** Once drill flips to `adaptive`, `uniform_band` has zero call sites. Keeping it as "operational defense-in-depth" would introduce a strategy that no `practice_sessions.type` can ever produce; the type-checker's exhaustiveness check at `selectionStrategyForSession` line 105 (the `_exhaustive: never` arm) would still pass, but the dispatch arm at `getNextItem` would carry dead code.

The cleanup:

- Remove `'uniform_band'` from the `SelectionStrategy` type union at line 75.
- Remove the `if (strategy === "uniform_band") return getNextUniformBand(ctx)` arm at line 450.
- Remove `getNextUniformBand` (lines 407-444).
- Remove the export of `getNextUniformBand` if it's exported (verify at audit time; if not exported, just remove).

The remaining strategies are `'fixed_curve' | 'adaptive'`. The exhaustiveness check still fires on the `selectionStrategyForSession` arm.

This is the right call because:

- **Less code to maintain.** Drill is the only consumer of `uniform_band`; removing it deletes ~40 lines of dead code.
- **No defense-in-depth value.** The walker plus the existing fallback chain is more conservative than `uniform_band` (the walker can step DOWN from the initial tier on bad accuracy/latency; `uniform_band` cannot). If the walker has a bug, the right fix is the walker's bug, not falling back to a strategy that intentionally doesn't walk.
- **The `'adaptive'` arm is the only drill arm.** SPEC §9.2 already shows `drill → 'adaptive'`; keeping `uniform_band` is implementation-vs-SPEC drift in the opposite direction from what we're closing.

If sub-phase 2's plan revision determines that keeping `uniform_band` is desirable (e.g., for an admin-toggleable fallback), that's a §9 redline conversation. The recommendation stands: remove.

### 4.5 SPEC §9.2 dispatch table integrity

Post-sub-phase-2 the dispatch table reads:

| `practice_sessions.type` | `selectionStrategy` |
|---|---|
| `diagnostic` | `'fixed_curve'` |
| `drill`      | `'adaptive'` |
| `full_length` | `'fixed_curve'` |
| `simulation`  | `'fixed_curve'` |

This is what SPEC §9.2 already specifies. No SPEC table edit required; the SPEC was ahead of the implementation.

## 5. Test surface

### 5.1 New: pure-function unit tests on `nextDifficultyTier`

Eight scenarios at minimum — exhaustive state-table coverage of step-up / step-down / hold. The existing `selection.test.ts` is DB-driven; adding pure-function unit tests there is consistent with the file's "tests for the selection engine" framing. Alternative: separate `next-difficulty-tier.test.ts` for the pure tests; the audit at commit 1 time picks the placement based on what reads cleaner.

Scenarios (each is a fixed `AdaptiveContext` fixture asserting an exact returned tier):

1. **Floor — fewer than 10 attempts → hold.** `last10Correct.length === 5; currentTier === "medium"` → returns `"medium"`. Assert no walking before the 10-attempt floor.
2. **Step up — 9/10 correct AND median latency at 0.5× threshold → stepUp.** `last10Correct = [9 trues, 1 false]; last10LatencyMs = [10 entries averaging 5000]; currentTier === "medium"; latencyThresholdMs === 12000` → returns `"hard"`. Both conditions met.
3. **Step up clamps at brutal.** Same accuracy/latency as scenario 2, `currentTier === "brutal"` → returns `"brutal"` (clamp).
4. **Step down — accuracy 5/10 → stepDown.** `last10Correct = [5 trues, 5 falses]; last10LatencyMs = [10 entries averaging 5000]; currentTier === "medium"; threshold === 12000` → returns `"easy"`. Latency is fine but accuracy ≤ 0.6 fires the OR.
5. **Step down — median latency 1.5× threshold → stepDown.** `last10Correct = [9 trues, 1 false]; last10LatencyMs = [10 entries averaging 18000]; currentTier === "medium"; threshold === 12000` → returns `"easy"`. Accuracy is fine but latency > 1.2× threshold fires the OR.
6. **Step down clamps at easy.** Same accuracy as scenario 4, `currentTier === "easy"` → returns `"easy"` (clamp).
7. **Hold — accuracy 0.7, latency at threshold → hold.** Neither step-up condition (≥0.9 accuracy AND <0.8× latency) nor step-down condition (≤0.6 accuracy OR >1.2× latency) fires. Returns `currentTier`.
8. **Step-up boundary — accuracy exactly 0.9 with latency exactly 0.8× → hold (not step-up).** SPEC §9.1's `accuracy >= 0.9 && medianLatency < ctx.latencyThresholdMs * 0.8` is strict `<` on latency. Verify exact-boundary edge.

### 5.2 New: integration tests on `getNextAdaptive`

Three scenarios via `selection.test.ts` extension, each driving a real drill via `startSession({ type: "drill", subTypeId })` + `submitAttempt` loop:

1. **Initial tier from `mastery_state`.** Insert a `mastery_state` row with `currentState: 'fluent'`, `wasMastered: false`. Start a drill. Assert the first item's `selection.servedAtTier === 'medium'` (from `initialTierFor`'s table).
2. **Walker holds across first 10 attempts.** Drive 10 attempts at high accuracy + low latency; assert all 10 items are served at the initial tier (no step-up before the 10-attempt floor).
3. **Walker steps up after 10 attempts at high performance.** Drive 10 attempts with 9/10 correct + median latency < 0.8× threshold. Assert the 11th item's `selection.servedAtTier` is one tier higher than the initial. (May be tier-degraded if the higher tier is exhausted; assert against `(fallbackFromTier ?? servedAtTier)` per SPEC §9.2's "no-walking contract is on REQUESTED tier, not served tier" clarification.)

Optional fourth scenario if dev DB depth permits: **walker steps down after bad performance.** Drive 10 attempts at low accuracy; assert the 11th item's requested tier is one lower than the initial.

### 5.3 Existing tests that need updates

Audit per `selection.test.ts`'s three current tests:

- `withinCellDeterminism` — exercises `pickItemRow` directly. NOT affected by the walker. Pass-through.
- `withinCellVariationAcrossSessions` — exercises `pickItemRow` directly. NOT affected. Pass-through.
- `noReServeInSession` — drives a diagnostic to completion via `startSession + submitAttempt`. Diagnostic uses `fixed_curve`, not the walker. NOT affected. Pass-through.

**No existing test updates required.** The walker work is purely additive on the test surface. New count post-sub-phase-2: 38 (baseline) + 8 (pure-function) + 3 (integration) = 49 tests, give or take, depending on how the test fixtures are factored. Final count captured at sub-phase close.

### 5.4 Mastery-state fixtures

For the integration tests in §5.2, fixtures are set via `db.insert(masteryState).values({ ... })` keyed by `(userId, subTypeId)`. The four `currentState` values × two `wasMastered` values = eight initial-tier permutations; §5.2 scenario 1 covers one of them. Additional fixtures only as needed — the pure-function tests in §5.1 already cover the walker's tier-mapping logic; the integration tests only need to verify the initial tier flows correctly through `getNextAdaptive`.

### 5.5 Bank-depth fixtures for tier-exhaustion edge cases

The §5.2 integration tests run against the dev DB's existing 439-item bank. If the bank's per-tier depth is insufficient for a specific scenario (e.g., scenario 3 wants the walker to step from `hard` to `brutal` but the sub-type has only 1 brutal item and the test loop drives 11 attempts), the tier-degraded fallback fires and the integration test asserts against `(fallbackFromTier ?? servedAtTier)` per the SPEC §9.2 clarification.

If the audit at commit 2 surfaces a tier cell that systematically prevents the integration tests from running, the fix is to insert test-only items via the test setup (the existing `createTestUser` + `db.insert(items).values(...)` pattern from `selection.test.ts`'s fixtures), NOT to weaken the walker's contract. Test setup is the right place to ensure determinism.

## 6. Sequencing and commits

**Three commits, in order.** Sub-phase 2 is server-side only with no Alpha Style cadence; the commit count is correspondingly tighter than sub-phase 1's seven. A fourth commit (the doc reconciliation + plan close) lands at sub-phase close.

1. **`feat(selection): adaptive walker — nextDifficultyTier pure function + unit tests`.** Adds `nextDifficultyTier(ctx)`, `stepUp(tier)`, `stepDown(tier)` pure functions per §3 to `selection.ts` (or sibling per §4.3 audit). Exports `nextDifficultyTier`, `AdaptiveContext`, `Tier` for downstream consumers (sub-phase 5's belt indicator). Adds the eight pure-function unit tests per §5.1. NO behavior change in drill mode yet — `selectionStrategyForSession("drill")` still returns `"uniform_band"`; the dispatch's `'adaptive'` arm still throws `ErrAdaptiveDeferred`. The walker is dormant code at end of commit 1; commit 2 wires it into the drill arm.

   Verification: §5.1 scenarios + `bun typecheck` clean + `bun test` count grows by 8.

2. **`feat(selection): wire walker into drill arm; flip drill from uniform_band to adaptive`.** Adds `getNextAdaptive(ctx)` per §4.1-§4.2 (mirrors `getNextUniformBand`'s shape with the in-session attempt-window read added). Flips `selectionStrategyForSession("drill")` to return `"adaptive"`. Replaces the `'adaptive'` arm of the dispatch in `getNextItem` from `throw ErrAdaptiveDeferred` to `return getNextAdaptive(ctx)`. Adds the three integration tests per §5.2 to `selection.test.ts`. **Drill mode now uses the adaptive walker.**

   Verification: §5.2 scenarios + a real-DB harness (per §7) that drives a drill end-to-end with varying mastery states and asserts tier transitions match the walker's contract + EXPLAIN ANALYZE on the new in-session attempt-window query per SPEC §6.14.7 + §2.5 56-tier-cell snapshot captured in the commit message.

3. **`chore(selection): remove vestigial uniform_band strategy and getNextUniformBand`.** Per §4.4 recommendation: removes `'uniform_band'` from the `SelectionStrategy` type union, removes the `getNextUniformBand` function (lines 407-444), removes its dispatch arm (line 450). The exhaustiveness check at `selectionStrategyForSession` line 105 still passes (the type union shrinks to `'fixed_curve' | 'adaptive'` and the `_exhaustive: never` arm is unreachable as before). The `ErrAdaptiveDeferred` constant is also removed since it has no remaining call site post-commit-2.

   Verification: `bun lint` + `bun typecheck` + `bun test` clean. No behavior change vs. commit 2 — drill still uses adaptive; this is a dead-code cleanup.

   **Conditional on §9.2's redline confirming the removal recommendation.** If §9.2 redlines as "keep `uniform_band` as fallback," commit 3 is dropped from the sequence and the plan's commit count is 2 + the doc-close commit = 3 total.

4. **`docs(spec+plan): reconcile §9.1 + §9.2 to past-tense; close phase5-adaptive-walker round`.** SPEC §9.1's "Phase 5 sub-phase 2 closes the adaptive deferral" reframes past-tense. SPEC §9.2's commentary on Phase 5's `drill → adaptive` flip reframes past-tense (the dispatch table itself is unchanged). The `// Phase 5 sub-phase 2 changes the drill → uniform_band line to drill → adaptive` comment in `selection.ts:99` is removed (the change has happened). This plan's status flips to "shipped" with commit hashes captured. No PRD edits — PRD §4.2 is already canonical.

   Verification: closed-plans-immutable check; `git diff` against prior-shipped plan files returns zero lines.

**Commit count: 3 (with §4.4 removal) or 2 (without) + 1 doc-close = 4 or 3 total.** The user's brief projected 3-4; this matches the lower bound on the conditional removal path and the upper bound otherwise.

## 7. Verification protocol carry-forward

Established discipline carries forward unchanged:

- **`bun lint` clean, `bun typecheck` clean** at every commit.
- **`bun test`** at every commit: count grows from 38 (baseline) to 38 + 8 (commit 1) = 46, to 46 + 3 (commit 2) = 49, holds at 49 across commit 3 (commit 3 is dead-code removal; no test surface changes), holds at 49 across commit 4 (doc-only).
- **Real-DB harness for end-to-end drill flow.** A throwaway `scripts/_walker-harness.ts`-style script (moved to `/tmp/` before commit per the existing convention) drives multiple drills with seeded `mastery_state` rows at varying initial tiers and asserts the expected tier-walk sequences. Captures the harness output in commit 2's message; the harness itself is not committed.
- **EXPLAIN ANALYZE on the new in-session attempt-window query.** The query reads the 10 most recent attempts per session ordered by `attempts.id DESC LIMIT 10`. The `attempts_session_id_idx` (already exists) covers the WHERE clause; sort uses the PK index for the ORDER BY. Per SPEC §6.14.7, capture the plan in commit 2's message. SPEC §6.14.13 (dev-vs-prod planner choice) applies — at v1 attempts-table scale the dev DB may pick Index Scan or Bitmap Heap Scan; either is acceptable.
- **No new DB queries in commit 1** (commit 1 is pure-function only). No new queries in commit 3 (dead-code removal) or commit 4 (doc-only).
- **Pino structured-log capture** for the walker's debug output. `getNextAdaptive` should log the input window + decided tier per `getNextUniformBand`'s `logger.debug({ ... }, "getNextUniformBand: served")` precedent. Sub-phase 5's belt indicator may want to consume the log shape downstream; the log is the operational observable for "what tier did the walker decide?".

**SPEC §6.14 conventions inherited.** The relevant ones for this sub-phase:

- **§6.14.7 EXPLAIN ANALYZE for hot-route queries** — the in-session attempt-window query in commit 2.
- **§6.14.13 dev-vs-prod planner choice** — applies to the in-session-window query at v1 scale.
- **§6.14.18 audit against actual artifact, not assumed shape** — the audit in §2.2 corrected the user's brief about mastery enum (`'unknown' | 'learning' | 'approaching' | 'mastery'` is not the v1 contract; the actual enum is `'learning' | 'fluent' | 'mastered' | 'decayed'` plus `was_mastered`). The discipline of citing the actual SPEC + schema before designing flagged the drift.
- **§6.14.19 type-error-as-audit cascade pattern** — most likely to surface in commit 1 or commit 3. Adding `nextDifficultyTier`'s exports to `selection.ts` may trigger downstream import resolution in test files; removing `'uniform_band'` from the type union in commit 3 may trigger compile errors anywhere a string literal `"uniform_band"` is referenced (likely zero call sites outside `selection.ts` itself, but verify at commit 3 audit time). The pattern: type-narrowing produces a compile-error cascade through tests + harnesses + downstream consumers; the resolution path is to update each consumer to the narrowed type, NOT to suppress the error or widen the type back.
- **§6.14.20 / .21 / .22** — DB-row-state audit, consuming-code audit. May surface if commit 2's audit reveals `served_at_tier` data in `attempts` is inconsistent with the walker's expectation (e.g., legacy rows with NULL or with values outside the `Difficulty` enum). The audit verifies before the walker reads.
- **§6.14.23 verification-gap pattern (UI side-effect)** — does NOT bind directly here because sub-phase 2 is server-side only (no UI side-effect to verify at runtime). The convention is recorded in case of audit-time decisions about test infrastructure that wants to extend the verification approach for downstream UI work (e.g., sub-phase 5's belt indicator).

## 8. Out of scope

Explicit list — items deliberately not addressed in sub-phase 2:

- **UI surface for the walker's output.** Sub-phase 5's territory (dojo belt indicator visualizes the walker's current tier on the post-session summary). Sub-phase 2 ships the walker; sub-phase 5 visualizes it.
- **Full-length test selection.** Sub-phase 3's territory. Full-length uses `'fixed_curve'`; the walker does not apply.
- **Click-to-highlight in post-session explanation review.** Sub-phase 4's territory. Independent of the walker.
- **Dojo UI rename + belt indicator.** Sub-phase 5's territory. Depends on this sub-phase but does not extend it.
- **Strategy authoring for new sub-types (workrate, speed_distance_time, lowest_values).** Independent round per the testbank-re-extraction round close. The walker reads `mastery_state` + `attempts`, NOT `strategies`; missing strategy entries do not affect the walker.
- **Tagger improvement round** (covers `12min_ratios` 45% miss + `workrate.easy = 0` / `lowest_values.hard = 0` gaps). Separate round per the testbank-re-extraction round close. The walker handles zero-cell sub-types via the existing `pickWithFallback` fallback chain.
- **`isTextOnly` filter relaxation.** Separate round per the testbank-re-extraction round close.
- **Probabilistic walker variants.** SPEC §9.1 specifies deterministic; a probabilistic variant is a SPEC amendment, not a sub-phase 2 design decision.
- **Cross-sub-type walking within a drill.** Drill is sub-type-locked per the route param; the walker decides only tier within that sub-type.
- **Mid-session `mastery_state` recompute.** `masteryRecomputeWorkflow` fires async post-`endSession` per SPEC §9.4. The walker does NOT re-read `mastery_state` mid-session — it reads `mastery_state` once at session start (via `initialTierFor`) and walks based on the in-session attempt window thereafter.
- **Schema migrations.** None required.
- **PRD edits.** PRD §4.2 already describes adaptive-difficulty drill mode as the v1 contract. No PRD edits this sub-phase.
- **Production deploy.** Same gating as predecessor rounds (Leo's no-deploy-until-feature-complete decision).

## 9. Open questions / resolutions

Five questions surfaced during drafting; recommendations recorded for redline. The user's brief named the first five; one additional question (§9.6) surfaced during the §2 audit and is recorded for completeness.

### 9.1 Probabilistic vs deterministic tier selection

**Question.** The user's brief framed this as an open choice. Should the walker be probabilistic ('learning' = 70% easy / 25% medium / 5% hard biases) or deterministic (always step per the threshold zones)?

**Recommendation: deterministic per SPEC §9.1.** The SPEC has already settled this; the 0.8×/1.2× zone widths match PRD §4.2's "comfortably under" / "well above" framing. Operational benefits: reproducible verification (fixed fixtures produce exact outputs) and no RNG-determinism plane to seed. If a future round wants probabilistic biases, that's a SPEC §9.1 amendment, not a sub-phase 2 decision. The user's brief mistakenly framed mastery enum as `'unknown' | 'learning' | 'approaching' | 'mastery'`; the v1 enum is different (see §2.2 + §9.6). Probabilistic-by-mastery-state is a non-starter regardless because the walker reads the in-session attempt window, NOT the mastery state directly (mastery state only sets the initial tier).

### 9.2 `uniform_band` removal vs. fallback retention

**Question.** Once drill flips to `adaptive`, should `uniform_band` and `getNextUniformBand` be removed (cleaner code) or kept as defense-in-depth (operational fallback)?

**Recommendation: remove (commit 3 of the plan).** Drill is the only consumer of `uniform_band`; once the dispatch flips, `uniform_band` has zero call sites. Defense-in-depth value is illusory: if the walker has a bug, the fix is the walker's bug, not falling back to a strategy that intentionally doesn't walk. The walker plus the existing `pickWithFallback` chain is more conservative than `uniform_band` (the walker can step DOWN from the initial tier on bad accuracy/latency; `uniform_band` cannot). Removing deletes ~40 lines of dead code. The exhaustiveness check at `selectionStrategyForSession` line 105 still fires post-removal; the type-checker continues to enforce that no `practice_sessions.type` value can produce an unhandled strategy.

### 9.3 Tier-exhaustion fallback ordering

**Question.** When the walker requests a tier and the bank can't serve at that tier, what's the fallback order?

**Recommendation: reuse the existing `pickWithFallback` chain (recency-soft → tier-degraded → session-soft).** The walker decides REQUESTED tier; `pickWithFallback` handles the rest. The walker does NOT need to know about bank depth; that's `pickWithFallback`'s job per SPEC §9.2. The next walker iteration reads `served_at_tier` from `attempts` (per SPEC §9.1 last paragraph) — fallback-served items affect the walk based on what the user actually experienced, not what the walker requested. This is the contract.

### 9.4 'unknown' / pre-floor mastery state edge case

**Question.** The user's brief named `'unknown'` as a state to handle for first-attempts pre-3-attempt-floor. What's the walker's behavior?

**Recommendation: there is no `'unknown'` state in the v1 mastery enum. A user with no `mastery_state` row returns `undefined` from `readMasteryStateFor`, which `initialTierFor` maps to `medium`.** The walker starts at `medium`; the first 10 attempts hold there per the `last10Correct.length < 10` floor; from attempt 11 onward the walker steps based on accuracy + latency. No special handling needed. The user's brief conflated the SPEC §9.3 mastery enum with a different framing; the audit in §2.2 corrected the framing before designing.

### 9.5 Walker scope: drill only, or also diagnostic?

**Question.** Does the adaptive walker apply to diagnostic, or only drill?

**Recommendation: drill only.** Diagnostic uses `'fixed_curve'` strategy → `getNextFixedCurve` → `shuffledDiagnosticOrder` → `slot.difficulty` from `diagnostic-mix.ts`. The diagnostic mix has fixed tier per slot (the rebalance round shipped this); the walker would conflict with the mix's pre-set tiers — they're mutually exclusive design choices. Diagnostic stays diagnostic-mix-driven; the walker applies to drill only. Full-length and simulation also use `'fixed_curve'` (pre-set tier per slot) and are unaffected. SPEC §9.1's "(drills only)" parenthetical in the section heading is the contract; this resolves the question without ambiguity.

### 9.6 In-session window: most-recent N or most-recent-N-on-current-sub-type? (audit-surfaced)

**Question.** Drill is sub-type-locked, so all in-session attempts ARE on the current sub-type. The query `WHERE sessionId = ctx.id ORDER BY id DESC LIMIT 10` is sufficient. But what if a future round adds cross-sub-type drills? Should the query pre-emptively filter on sub-type?

**Recommendation: keep the query session-scoped only (no sub-type filter) for v1.** Drill's sub-type-locking is a current contract; pre-emptive filtering for a hypothetical future feature is YAGNI. If a future round adds cross-sub-type drills, that round's plan re-derives the walker's window contract — likely "most-recent-10 on the current sub-type within the session" — and adds the filter at that time. This sub-phase ships against the current contract.

This question is recorded so a future cross-sub-type-drill round starts from the pinned position rather than re-deriving "what's the walker's attempt window?".

---

> **No code was written.** This is a plan document only. Implementation begins at commit 1 once the plan is approved.
