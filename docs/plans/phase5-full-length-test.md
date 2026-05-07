# Plan — Phase 5, sub-phase 3: full-length test (v1, no strategy gate)

> **Status: planning, approved, not yet implemented.** This plan was drafted audit-first against `main` post-phase5-click-to-highlight-round close (HEAD = `ef2f067` at draft time). The master plan's §5 framing is the starting point; where the audit recommends a different shape, the plan recommends that shape with rationale. Closed-plans-immutable per SPEC §6.14.20 once written. Audit-against-actual-artifact per SPEC §6.14.18 binds.

This plan covers Phase 5 sub-phase 3 — the full-length practice test that PRD §4.5 specifies as a 50-question, 15-minute, cross-sub-type-interleaved exam-fidelity practice mode. It is the **fifth-and-final** Phase 5 v1 sub-phase to ship. Predecessors: sub-phase 1 (post-session review surface, shipped 2026-05-04 across `c1ee435` / `0ec6f4f` / `a0aa1fd` / `c71770c` / `8d4195e` / `eaeb882` / `022dbd6`), sub-phase 2 (adaptive walker, shipped 2026-05-06 across `9a522b1` / `88335b5` / `4781ee5` / `58b2b10`), sub-phase 5 (dojo UI rename + belt indicator, shipped 2026-05-06 across `8fc6957` / `b53d2c2` / `b31d8cb` / `c3c5a88` / `c32a7fb` / `047faff`), sub-phase 4 (click-to-highlight in post-session explanation review, shipped 2026-05-07 across `4943f52` / `285fee6` / `2b65d01` / `9fdc893` / `ef2f067`). Operational rounds shipped: taxonomy-restructure → data-wipe → testbank-re-extraction → tagger-improvement → strategy-authoring (closed 2026-05-07 at `9c13d68`).

This sub-phase is **UI-heavy + new-route** per master plan §5's framing. The plan shape sits between sub-phase 1's seven-commit UI-heavy template and sub-phase 5's six-commit UI + post-session-aware template; the new `/full-length/run` route + Mastery Map secondary CTA + an extension to `getNextFixedCurve` for the cross-sub-type-interleaved decile curve are all load-bearing. Alpha Style cadence re-engages at commit boundaries; render-slot locking conventions inherit from sub-phase 1 + sub-phase 5 (the post-session shell needs no new slot — every existing slot is type-agnostic by design or already has the right session-type guards).

Once this sub-phase ships, **Phase 5 v1 is feature-complete** and the no-deploy-until-feature-complete gate per master plan §1 lifts.

## 1. Why this sub-phase, why now

This is Phase 5 v1's last unshipped sub-phase. Three forcing functions:

- **Predecessors all shipped clean.** Sub-phase 1 (post-session review surface — the destination after a full-length submit) closed 2026-05-04. Sub-phase 2 (adaptive walker — irrelevant for full-length, which is fixed-curve) closed 2026-05-06. Sub-phase 5 (dojo + belt indicator — also drill-only, irrelevant for full-length) closed 2026-05-06. Sub-phase 4 (click-to-highlight in `<WrongItemsBrowser>` — type-agnostic, full-length inherits automatically) closed 2026-05-07. Every dependency or dependent surface that full-length will touch is settled.

- **Bank has empirical depth across all 14 × 4 = 56 tier cells.** Per the user's brief: 439 items / 14 sub-types / 50 NULL-`source_folder` seed items / 389 with `structuredExplanation` / 42 strategy entries (3 per sub-type, full Record) / both non-brutal zero cells populated post-tagger-improvement. The 50-question full-length test pulls from `standardCurve` per `src/config/difficulty-curves.ts` — `decile 5` carries 45% brutal items, so the bank's brutal coverage matters. Pre-sub-phase-2 and pre-tagger-improvement the bank had multiple zero cells; post-tagger-improvement it's coherent. The `getNextFixedCurve` fallback chain (recency-soft → tier-degraded → session-soft per SPEC §9.2) handles any lingering thin cells without crashing the session.

- **Phase 5 v1 deploy gate.** Per master plan §1's no-deploy-until-feature-complete framing, Phase 5 v1 is feature-complete only when sub-phase 3 ships. Sub-phases 1, 2, 4, 5 are all shipped; sub-phase 3 is the last hold. Once it lands, the deploy gate lifts and the post-Phase-5 cleanup / dogfood / deploy sequence becomes the next operational round. No other Phase 5 v1 work blocks deploy after sub-phase 3.

The cost of running full-length is bounded — full-length is a 50-question fixed-curve session that uses the same `pickWithFallback` + recency + session-soft + tier-degraded chain as the diagnostic. The shape of `getNextFixedCurve` extends one branch (the "decile-driven cross-sub-type slot generator") rather than introducing a new selection strategy; the existing `'fixed_curve'` strategy enum value covers it. The session-level 15-minute auto-end already exists in `<FocusShell>` for any positive `sessionDurationMs` (verified at `src/components/focus-shell/focus-shell.tsx:367-405`). The post-session shell already routes `'full_length'` through the drill render mode (see `src/components/post-session/post-session-shell.tsx:32` + the existing `SessionTypeForShell` union). Most of full-length's surface area is already wired; this sub-phase's net-new code is concentrated in three places: (a) the per-decile / cross-sub-type slot generator, (b) the `/full-length/{configure,run}` route pair, (c) the Mastery Map secondary CTA.

## 2. Audit findings against `main`

The current state, as of `main` HEAD `ef2f067`:

### 2.1 Master plan §5 + feature-roadmap framing (audit (A))

**Master plan §5 pins the canonical full-length framing:**

> Build `/full-length/run` route (server component initiating `startSession({ type: "full_length" })`), `src/config/full-length-mix.ts` with the 50-item cross-sub-type-interleaved difficulty curve (or sibling structure to `diagnostic-mix.ts` — naming/location decision deferred to sub-phase plan), 15-minute session timer (`sessionDurationMs: 900_000`), real-bank-first selection with generated-fallback (per PRD §4.5 "pulls from the real-items bank when possible"). After a full-length submit, the user lands on the post-session review surface (sub-phase 1) — same render as drill post-session, no full-length-specific gate.

**Feature-roadmap §1 carries the same framing forward and adds:**

> The PRD already specifies this: 50 questions in 15 minutes, real-test difficulty mix and randomized interleaving across the v1 sub-types, pulls from the real-items bank when possible, exits to post-session review on completion or timeout. Full-length tests are independent of skill level — same content distribution as the real CCAT.
>
> The PRD already specifies this as `selectionStrategy: "fixed_curve"` from `src/config/diagnostic-mix.ts` (or a sibling for full-length). The sampling logic is structurally identical to the diagnostic — only the difficulty mix and the session timer differ.

**SPEC §10.3 carries the v1-shape past-tense:**

> v1 `/test/page.tsx` calls `startSession({ type: "full_length" })` directly (no `ifThenPlan`). `getNextItem` selects per the per-decile mix in `src/config/difficulty-curves.ts`, with cross-sub-type interleaving (the ordering of sub-types within a decile is randomized per session). Pulls from `source: "real"` first; only falls back to `generated` when the real-bank set is exhausted for the requested sub-type/difficulty bucket. `<FocusShell>` with `sessionDurationMs: 900000`, `perQuestionTargetMs: 18000`, `paceTrackVisible: true`. After submit-or-timeout, `endSession`. v1 `/post-session/[sessionId]` is dismissible immediately for `full_length` like every other session type.

**Three ambiguities the audit must resolve:**

1. **Mix source.** Master plan says `src/config/full-length-mix.ts` (or sibling to `diagnostic-mix.ts`); SPEC §10.3 names `src/config/difficulty-curves.ts` (which already exists, carries `standardCurve`); feature-roadmap §1 names "the per-decile distribution in `src/config/difficulty-curves.ts`." The audit (D below) settles on `difficulty-curves.ts` — it's already on disk with `standardCurve` documented per SPEC §3 / SPEC §10.3, and naming a new sibling file would duplicate without value.

2. **Route path.** Master plan says `/full-length/run`; SPEC §10.3 names `/test/page.tsx` historically. The audit recommends **`/full-length/run`** — matches the master plan's pinning, matches the verbal cohesion with the dojo metaphor's "Enter dojo" / "Mastery Map" surface naming, and avoids `/test/` which is generic and confusable with developer test routes (e.g., `phase3-smoke`).

3. **"Real-bank-first with generated-fallback"** is a v1-degenerate branch — the bank has zero `source: 'generated'` items in v1 (Phase 4 LLM generation pipeline is post-Phase-5 per `docs/architecture_plan.md` build-sequencing). The fallback shape is theoretical for v1; in practice every served item will be `source: 'real'`. Audit recommendation: do NOT plumb a special `source: 'real' → 'generated'` fallback in v1 — the existing `pickWithFallback` chain (recency-soft → tier-degraded → session-soft) already handles bank-thin cells via the recency or tier degradation paths, and adding a `source` axis without the generated bank to populate it is YAGNI. SPEC §10.3's "real-first then generated" sentence stays past-tense as Phase 4 setup language; v1 honors it trivially because every live item is `source: 'real'`.

**Canonical full-length framing per master plan + roadmap + SPEC convergence:**

- 50 questions / 15 minutes / cross-sub-type-interleaved deciles per `standardCurve`.
- Session-level time-boxed (15 min); per-question untimed at the chronometer level (the 18-second target still drives the in-shell triage prompt).
- Selection strategy: `'fixed_curve'` (already in `SelectionStrategy` union); engine source: per-decile distribution in `src/config/difficulty-curves.ts`.
- Independent of the user's mastery state — no `mastery_state` reads at selection time (unlike drill's `'adaptive'` arm).
- Recurring practice mode (any number of full-length sessions per user; not gated, not one-shot).
- Lands on existing `/post-session/[sessionId]` review surface; no full-length-specific gate, no full-length-specific copy beyond the heading branch decision.

### 2.2 Schema readiness for full_length sessions (audit (B))

The session-type union already includes `'full_length'` end-to-end:

- `practice_sessions.type` enum at `src/db/schemas/practice/practice-sessions.ts:9` — `["diagnostic", "drill", "full_length", "simulation"]`. **No migration needed.**
- `startSession` at `src/server/sessions/start.ts:97` — `if (input.type === "full_length" || input.type === "simulation") return 50` already wired for `targetQuestionCount`.
- `selectionStrategyForSession` at `src/server/items/selection.ts:105` — `if (type === "full_length") return "fixed_curve"` already wired.
- Action surface `startSession` zod enum at `src/app/(app)/actions.ts:36` — `["diagnostic", "drill", "full_length", "simulation"]` already wired.
- `<FocusShell>` `sessionType: SessionType` at `src/components/focus-shell/types.ts:12` — accepts `'full_length'`. The `sessionDurationMs: number | null` prop already supports the 15-minute time box.
- `<PostSessionShell>` `SessionTypeForShell` at `src/components/post-session/post-session-shell.tsx:57` — accepts `'full_length'`; the existing `isDiagnostic ? "Diagnostic complete" : "Session complete"` heading branch routes full-length through the generic "Session complete" copy; the existing `endSessionTier` belt-indicator gate (`sessionType === "drill"`) keeps the belt off; the existing trailing-section gate (`isDiagnostic` → onboarding form, else → Continue button) routes full-length to the Continue button per slot 9 of the locked nine-slot ordering.

**No schema migrations required.** The data surface is fully primed. Sub-phase 3 is a render + selection + route layer over the already-wired session type.

**One follow-up note on `practice_sessions.subTypeId`:** for full-length the column is NULL (the session is cross-sub-type-interleaved). This is already handled — `validateInputShape` at `src/server/sessions/start.ts:98-106` only requires `subTypeId` for drill; the column is left NULL for diagnostic / full_length / simulation per existing code at `src/server/sessions/start.ts:164-170`.

### 2.3 Per-surface session-type-aware audit (audit (C))

Every UI surface that dispatches on `session.type` (or that the new full-length flow will touch), enumerated:

- **`<PostSessionShell>` heading branch** (`post-session-shell.tsx:80`): `isDiagnostic ? "Diagnostic complete" : "Session complete"`. Full-length routes through "Session complete". **§5 decision below**: stay with "Session complete" (no full-length-specific heading text).
- **`<PostSessionShell>` slot 1 belt-indicator** (`post-session-shell.tsx:130-138`): explicit guard `props.sessionType === "drill" && props.endSessionTier !== null`. Full-length never renders the belt — the walker isn't running on `'fixed_curve'`. **§6 decision below**: leave as-is.
- **`<PostSessionShell>` slot 7 `<OnboardingTargets>`** (`post-session-shell.tsx:113-121`): `isDiagnostic`-only. Full-length skips. **§6 decision below**: leave as-is.
- **`<PostSessionShell>` slot 8 pacing-line sentence** (`post-session-shell.tsx:99-110`): `isDiagnostic && props.pacingMinutes !== undefined`. Full-length skips. **§6 decision below**: leave as-is.
- **`<PostSessionShell>` slot 9 Continue CTA** (`post-session-shell.tsx:122-124`): non-diagnostic only. Full-length renders. **§6 decision below**: leave as-is.
- **`<MasteryMap>`** (`src/components/mastery-map/mastery-map.tsx`): primary CTA is `<StartSessionButton>` ("Enter dojo: {sub-type}"), drill-only entry. **No secondary CTAs exist** — PRD §5.2's "Full-length test", "Test-day simulation", "History" secondary actions are unbuilt. **§5 decision below**: add a single full-length secondary CTA to Mastery Map; do NOT add a "Test-day simulation" or "History" secondary CTA (both out of v1 scope per master plan §11).
- **Drill route `/drill/[subTypeId]`** (`src/app/(app)/drill/[subTypeId]/{page,run/page,run/content}.tsx`): drill-specific. Full-length uses a separate route. **§5 decision below**: new route `/full-length/run`; configure step deferred to §5.
- **Focus shell** (`src/components/focus-shell/focus-shell.tsx`): already type-aware via `sessionType` prop. The session-timer auto-end effect at line 376-405 already fires when `state.elapsedSessionMs >= sessionDurationMs` and `sessionDurationMs !== null`. Full-length passes `sessionDurationMs: 900_000` and inherits the auto-end behavior bit-for-bit unchanged. **§4 decision below**: no new timer mode; existing 'standard' timer-mode + session-level auto-end suffices.
- **Audio cues** (focus-shell-internal): the audio state machine reads `sessionType` already (the chrome row's audio-tied animations don't currently dispatch differently per type — confirmed in audit (E) of the dojo plan). Full-length inherits drill's audio behavior unchanged. **§5 decision below**: no audio changes.
- **Strategies surface** (`<StrategySurface>` in `<PostSessionShell>` slot 6): type-agnostic. Reads from the post-session aggregations colocated in `page.tsx`. Full-length wrong items map to sub-types; the struggled-sub-type derivation at `src/server/post-session/strategy-selection.ts` is type-agnostic (per sub-phase 1's plan §9 — the "struggled" definition is per-session, accuracy < 70% OR median > threshold). **§6 decision below**: leave as-is — full-length inherits.
- **Wrong-items browser + click-to-highlight** (`<WrongItemsBrowser>` slot 5 + `<StructuredExplanation>` per sub-phase 4): type-agnostic. Full-length inherits automatically because the page-level `getWrongItemsForSession` query reads from `attempts JOIN items` filtered to the session — no type filter. **§6 decision below**: leave as-is.
- **`<OnboardingTargets>` form**: diagnostic-only. Full-length skips. Leave as-is.
- **Mastery Map URL state**: the dojo CTA pushes to `/drill/[subTypeId]`. Full-length CTA pushes to `/full-length/configure` or `/full-length/run` per §5 decision.

**The post-session shell needs zero new slots and zero new gating logic for full-length.** Every guard is already in place from sub-phase 1 + sub-phase 5. This is a load-bearing finding — it confirms master plan §5's "same render as drill post-session, no full-length-specific gate" framing against actual artifact (SPEC §6.14.18).

### 2.4 Question selection design constraints (audit (D))

`getNextFixedCurve` at `src/server/items/selection.ts:349-417` is currently hardcoded:

```ts
async function getNextFixedCurve(
    ctx: SessionContext,
    attemptIndex: number
): Promise<ItemForRender | undefined> {
    if (ctx.type !== "diagnostic") {
        // Phase 3 only ships diagnostic on the fixed_curve path — full_length
        // and simulation reuse this branch in Phase 5 against
        // difficulty-curves.ts. Throwing here is deliberate.
        logger.error(...)
        throw errors.new("fixed_curve only supports diagnostic in phase 3")
    }
    const order = shuffledDiagnosticOrder(ctx.id)
    const slot = order[attemptIndex]
    ...
}
```

The "throw on non-diagnostic" branch is the marker that lifts when sub-phase 3 ships. The dispatch table at `selection.ts:99-106` (`selectionStrategyForSession`) already routes `full_length → 'fixed_curve'` — only the `getNextFixedCurve` body needs to grow a second branch for `type === 'full_length'`.

**The cross-sub-type-interleaved decile generator: net-new design.** Per SPEC §10.3 + `src/config/difficulty-curves.ts`'s `standardCurve` (5 deciles × 10 items per decile), each decile carries a difficulty distribution (e.g., decile 1 → 70% easy / 25% medium / 5% hard / 0% brutal). The decile contributes `roundDecile(distribution, 10)` integer counts (e.g., decile 1 → `{easy: 7, medium: 3, hard: 0, brutal: 0}`). The generator must produce a 50-tuple ordered slot sequence that:

1. **Honors the per-decile difficulty count exactly.** Across the 50-slot sequence, decile k (slots `10*(k-1)+1` through `10*k`) contains exactly the rounded integer counts per tier from `standardCurve[k-1]`.
2. **Cross-interleaves sub-types.** Within each decile, the 10 slots draw across sub-types — no decile is dominated by a single sub-type.
3. **Is per-session deterministic.** Like `shuffledDiagnosticOrder` (`src/config/diagnostic-mix.ts:164-181`), the generator is seeded by `sessionId` so the same session always replays the same slot order; different sessions see independently shuffled orders.

**Design recommendation (settled in §3):** A pure function `generateFullLengthSlots(sessionId, totalCount = 50): ReadonlyArray<{subTypeId, difficulty}>` colocated in `src/config/difficulty-curves.ts` (next to `standardCurve` and `roundDecile`). For each decile, the function computes per-tier integer counts via `roundDecile`, then for each tier draws sub-types (with replacement) from a deterministically-shuffled queue seeded by `(sessionId, decileIndex, tier)`. The within-decile slot order is then shuffled deterministically again (Fisher-Yates seeded by `(sessionId, decileIndex)`) so sub-types interleave inside each 10-block.

**Sub-type pool**: all 14 v1 sub-types (`subTypeIds` from `src/config/sub-types.ts`). No section breaks per PRD §4.5 ("randomized interleaving across the v1 sub-types, verbal and numerical, no section breaks").

**Repeat semantics within a session**: full-length permits the same sub-type to appear multiple times across deciles — that's the empirical CCAT shape. The existing `pickWithFallback`'s `sessionAttemptedIds` exclusion prevents the same `item.id` from being re-served (matching the no-re-serve-in-session test in `selection.test.ts`); but the same `(subTypeId, difficulty)` tuple can appear across slots, and the engine just picks a different live item.

**Difficulty curve correctness**: the engine consumes `(subTypeId, difficulty)` tuples per-slot and feeds them to `pickWithFallback`. Tier-degraded fallback (per SPEC §9.2) handles bank-thin cells without crashing — e.g., if `numerical.workrate.brutal` is empty and decile 5 requested it, the engine serves `hard` instead and records `fallback_level: 'tier-degraded'`. This is the existing diagnostic engine's behavior; nothing new for full-length.

**Why colocate in `difficulty-curves.ts` and not a new `full-length-mix.ts`:** master plan §5's "(or sibling structure to `diagnostic-mix.ts` — naming/location decision deferred to sub-phase plan)" leaves the choice open. Per audit (A), `difficulty-curves.ts` already carries `standardCurve` + `roundDecile`; the slot generator is a thin function over those primitives. Naming a separate `full-length-mix.ts` to hold the slot generator would duplicate file-organization overhead for a 30-line function. SPEC §10.3 already references `difficulty-curves.ts` as the canonical config for the full-length curve.

### 2.5 Timer / pacing model constraints (audit (E))

- **Session-level timer**: `sessionDurationMs: 900_000` (15 minutes) per SPEC §10.3 + master plan §5. Already supported by `<FocusShell>` (`focus-shell.tsx:367+`). The auto-end effect at line 378-405 fires when `state.elapsedSessionMs >= sessionDurationMs` and triggers `onEndSession()` → `router.push('/post-session/[sessionId]')` automatically. Full-length inherits unchanged.
- **Per-question target**: `perQuestionTargetMs: 18_000` per SPEC §10.3 (the same 18-second triage anchor as drill / diagnostic). The triage prompt (`<TriagePrompt>`) fires when the per-question elapsed exceeds the target — type-agnostic.
- **Pace track**: `paceTrackVisible: true` per SPEC §10.3. The track shrinks from the left edge inward as questions are submitted; on full-length it has 50 blocks (matching `targetQuestionCount`).
- **Focus shell timer-mode parameter**: the focus shell has no `timerMode` prop. The drill route's `timerMode: "standard"` write is a server-side `practice_sessions.timer_mode` column write (see `src/server/sessions/start.ts:144-148`); for non-drill types the column is NULL. Full-length writes NULL — no new mode needed.
- **Behavior on timer expiry**: existing auto-end behavior fires when `elapsedSessionMs >= 900_000`. The auto-end calls `endSession` (which idempotently sets `ended_at_ms`, `completion_reason: 'completed'`) then navigates to `/post-session/[sessionId]`. The unanswered remainder of the 50-question quota stays unanswered — they don't appear as attempts, and `getPerSubTypeAccuracy` simply doesn't render rows for sub-types that received zero attempts. This is the correct shape for full-length: a user who submits 25/50 in 15 minutes has 25 attempts of data; the post-session render shows accuracy + latency for those 25 attempts and renders sub-types touched only.
- **`completion_reason`**: SPEC §3 (`practice_sessions.completion_reason`) carries `'completed' | 'abandoned'` (and possibly `'expired'` per the v1-cleanup round close — verify). Full-length on auto-end uses `'completed'` — the user finished what they could in the time box; this matches the existing drill auto-end behavior and avoids introducing a third completion-reason value.

### 2.6 Entry point design constraints (audit (F))

- **Mastery Map secondary CTAs**: PRD §5.2 names "Review (N due)", "Full-length test", "Test-day simulation", "History" — none built. Review is cut from v1, simulation is Phase 6, History is post-Phase-5. The Mastery Map is post-cut clean per the dojo-belt-indicator round audit (G).
- **No existing `/full-length/`, `/test/`, or `/simulation/` routes.** Greenfield.
- **No timer-mode selector on full-length.** Drill has none either (`'standard'` only); full-length matches.
- **Configure step**: master plan §5 does not mandate one. SPEC §10.3 reads "v1 `/test/page.tsx` calls `startSession({ type: "full_length" })` directly" — implying no configure step. Full-length is a fixed 50q × 15min cross-sub-type test; there's nothing to configure (no length picker, no sub-type picker, no timer mode). **§5 decision below**: ship a minimal configure page that renders a one-screen primer (what the test is, how long it'll take, an "Enter test" submit button) — this prevents the user from accidentally launching a 15-minute test by misclicking, matches the drill's configure → run shape, and gives the route a stable home for future expansion (length variants, sub-type subsets) without retrofitting a new layer mid-feature.

### 2.7 Post-session shell behavior expectations (audit (G))

Per audit (C)'s enumeration: every existing slot-level guard already routes full-length correctly:

- Heading: "Session complete" (generic, shared with drill).
- Belt indicator (slot 1 expansion): drill-only, NOT rendered for full-length.
- TriageScoreLine (slot 2): rendered for full-length. The triage score is per-session and type-agnostic.
- AccuracySummary (slot 3): rendered. Sub-types touched in the full-length show up.
- LatencySummary (slot 4): rendered. Per-sub-type median latency with threshold marked.
- WrongItemsBrowser (slot 5): rendered. Inherits click-to-highlight from sub-phase 4 (`<StructuredExplanation>` for items with `metadata_json.structuredExplanation`, prose fallback for the 50 NULL-`source_folder` seed items).
- StrategySurface (slot 6): rendered. Struggled-sub-type derivation runs.
- OnboardingTargets (slot 7): NOT rendered (diagnostic-only).
- Pacing-line (slot 8): NOT rendered (diagnostic-only AND `>15min`-conditional). For full-length specifically, the session is exactly 15 minutes (or shorter on auto-submit) — so the pacing line wouldn't even be informative if it did render. Diagnostic-only stays the right gate.
- Continue CTA (slot 9): rendered. `router.push('/')` matches drill behavior.

**Heading text decision**: stay with "Session complete". Adding a third heading branch ("Full-length test complete") for one render variant doesn't earn its weight — the surface below the heading is rich enough that "Session complete" reads as informative context, not generic filler. The drill heading is also "Session complete" today (per `post-session-shell.tsx:80` — `isDiagnostic ? "Diagnostic complete" : "Session complete"`); full-length matches drill bit-for-bit. No copy refactor required.

### 2.8 SPEC + PRD drift summary

Two SPEC sections to reconcile at sub-phase close:

- **SPEC §10.3 (Full-length test).** Already documents the v1 shape (post-cuts, 2026-05-04 markers in place); narrative reframes past-tense with the actual route paths shipped (`/full-length/configure` + `/full-length/run` per §5), the slot generator's home (`difficulty-curves.ts`), and any sub-phase-3-specific details that emerge during commit verification. The "real-bank-first then generated-fallback" sentence stays as-is — v1's `source` distribution is real-only (no Phase 4 generated bank), so the fallback sentence is forward-compat narrative, not a v1-shipped behavior.
- **SPEC §6.5 (Post-session review composition).** Add a one-sentence note that full-length lands on the same surface as drill, no full-length-specific copy, no full-length-specific gate. Past-tense reconciliation pattern matches sub-phase 1's close-out commit.

**PRD §4.5 (Full-length practice test).** Already canonical; sub-phase 3 ships per existing PRD spec. No PRD edit at sub-phase open; the "full-length test stays in v1, gate cut from v1" markers from the v1-cuts pass on 2026-05-04 are durable. The optional one-paragraph addition for the commit-1 "open round" doc-update — if any — would be a Mastery Map secondary-CTA framing for full-length. The PRD already names "Full-length test" as a Mastery Map secondary CTA at §5.2; sub-phase 3 lights up the existing PRD framing without amendment.

### 2.9 Live-DB row-state snapshot (audit (I))

Per the user's brief (re-verified by the round-open audit at commit 1):

- 439 live items / 14 sub-types / 42 strategies (3 per sub-type, full Record) / 50 NULL-`source_folder` seed items / 389 items with `structuredExplanation`.
- Both non-brutal zero cells (`numerical.workrate.easy`, `numerical.lowest_values.hard`) populated post-tagger-improvement round (closed 2026-05-06).
- 56-tier-cell snapshot expected at commit-1 audit time: 14 × 4 = 56 cells; ≥ 1 item in every cell except possibly some brutal-tier cells — verify against the actual snapshot at audit. Brutal-tier thinness handled by `pickWithFallback`'s tier-degraded fallback; the slot generator does NOT need to gate on cell depth.
- `practice_sessions.type = 'full_length'` row count: **0** (this is the first sub-phase to ship the type — verify zero rows at commit-1 audit; if non-zero, investigate).
- Test count: 69 / 69 (from sub-phase 4 close).

The `getNextFixedCurve` extension's per-decile per-tier draw must produce slot sequences that the bank can serve; the audit at commit 1 captures the full 56-cell snapshot to validate against the slot generator's draw distribution.

## 3. Question selection design

### What's missing / what should exist

`getNextFixedCurve` currently throws on non-diagnostic. Sub-phase 3 extends the function to handle `type === "full_length"` by reading from a per-session deterministic 50-slot ordered sequence sourced from `standardCurve` + a cross-sub-type interleaver.

### Recommendation

**Extend `src/config/difficulty-curves.ts`** with a single new exported pure function:

```ts
function generateFullLengthSlots(sessionId: string): ReadonlyArray<FullLengthSlot>
type FullLengthSlot = { subTypeId: SubTypeId; difficulty: Difficulty }
```

Where `generateFullLengthSlots`:

1. For each decile `k ∈ [0..4]`, computes per-tier integer counts via `roundDecile(standardCurve[k], 10)` — already shipped, deterministic, well-tested by inspection.
2. For each `(decileIndex, tier)` pair with count `n`, deterministically picks `n` sub-type-ids from the 14-sub-type pool. Sub-types may repeat across decile-tier pairs (they will — the test must hit all 14 sub-types reasonably often across 50 slots; per-decile draws-with-replacement against a shuffled 14-pool achieves this).
3. Within each decile's 10-slot block, shuffles the (subTypeId, difficulty) tuples deterministically (Fisher-Yates seeded by `(sessionId, decileIndex)`) so the in-decile order interleaves sub-types and tiers.
4. Concatenates the 5 deciles' 10-slot blocks into a 50-slot sequence.

**Seeding**: same xmur3 + mulberry32 PRNG pair used by `shuffledDiagnosticOrder` (`src/config/diagnostic-mix.ts:144-152`). Different decile / tier combinations get distinct seed strings (e.g., `${sessionId}:d0:easy`, `${sessionId}:d0:medium`, ..., `${sessionId}:d0:order`) so picks within a decile are independent yet reproducible.

**Sub-type pool**: `subTypeIds` from `src/config/sub-types.ts` — all 14 v1 sub-types. No section breaks (verbal + numerical interleave freely per PRD §4.5).

**Sub-type draws-with-replacement** (not without-replacement): the 50-slot test should over-represent the most-prevalent CCAT sub-types (number_series, antonyms, etc. — the same empirical-anchor sub-types the diagnostic over-represents). Without-replacement against the 14-pool would force ≤ 4 occurrences per sub-type across 50 slots and an artificially flat distribution; with-replacement against an unweighted shuffle produces an empirically-sampled distribution that approaches the 14-uniform mean over many sessions but allows session-to-session variance.

**Optional weighting** (resolved as deferred — Q12.3): weighting the sub-type draws by the empirical CCAT-prep distribution (the same anchor `diagnostic-mix.ts` uses) would tune the mix toward exam fidelity. v1 ships the unweighted version: simpler, deterministic, easier to verify, and the per-decile tier curve is already the load-bearing exam-fidelity signal. If post-deploy dogfood signal indicates the mix should weight by sub-type prevalence, that's a follow-up round's edit (one config addition) — not a v1 dependency.

**Extend `getNextFixedCurve`** in `src/server/items/selection.ts` to dispatch on `ctx.type`:

```ts
async function getNextFixedCurve(ctx, attemptIndex) {
    let slot
    if (ctx.type === "diagnostic") {
        slot = shuffledDiagnosticOrder(ctx.id)[attemptIndex]
    } else if (ctx.type === "full_length") {
        slot = generateFullLengthSlots(ctx.id)[attemptIndex]
    } else {
        // simulation is Phase 6; the existing throw stays as defensive guard
        throw errors.new(`fixed_curve does not support type '${ctx.type}'`)
    }
    if (!slot) throw errors.wrap(ErrDiagnosticMixOutOfRange, ...)
    // pickWithFallback against (slot.subTypeId, slot.difficulty) — unchanged
}
```

The dispatch keeps the existing `ErrDiagnosticMixOutOfRange` (rename optional — if renamed, do it atomically; recommendation: leave as-is — the error is shaped around the "fixed-curve mix out of range" concept and full-length is also a fixed-curve mix; rename adds churn without value).

**Repeat-allowed semantics**: same as diagnostic per the no-re-serve-in-session test (`selection.test.ts`'s `noReServeInSession`) — the same `item.id` is never served twice in a session, but the same `(subTypeId, difficulty)` tuple can appear in multiple slots. The existing `pickWithFallback` chain handles this via `sessionAttemptedIds` exclusion. v1 keeps it.

### Implementation seam

- `src/config/difficulty-curves.ts` — add `generateFullLengthSlots(sessionId)` + `FullLengthSlot` type. Plus the xmur3 / mulberry32 helpers (or import them from `src/config/diagnostic-mix.ts` — preferred: the helpers are pure-function PRNG primitives and centralizing them in one config file with named exports is cleaner than re-defining).
- `src/server/items/selection.ts` — `getNextFixedCurve` body extends with the `type === "full_length"` branch; the existing throw becomes the `else` defensive guard (covers `simulation` and any future fixed-curve type that isn't yet implemented).
- The `'simulation'` arm of `selectionStrategyForSession` still returns `'fixed_curve'` (already wired). Until simulation ships in Phase 6, the new `getNextFixedCurve` defensive `else` throws on it — same shape as the current diagnostic-only guard.

### Schema / state changes

**None.**

### Verification scenarios

1. **Decile distribution exactness.** Call `generateFullLengthSlots(sessionId)` for a fixed sessionId. Group slots into 5 deciles of 10. Per decile, count `(easy, medium, hard, brutal)` occurrences. Assert each matches `roundDecile(standardCurve[decileIndex], 10)` exactly.
2. **Per-session determinism.** `generateFullLengthSlots("seed-A")` called twice returns identical 50-slot sequences (deep-equal).
3. **Cross-session variation.** `generateFullLengthSlots("seed-A")` and `generateFullLengthSlots("seed-B")` differ on slot order (probability of identical 50-slot sequence ≈ 2^-100; assert at least one slot differs).
4. **All 14 sub-types reachable across multiple sessions.** Sample 100 distinct sessionIds, union all sub-type-ids that appeared in any slot; assert the union covers all 14. (Strict per-session full coverage is NOT enforced — with-replacement sampling means a single 50-slot session may legally miss 1-2 sub-types entirely; this is acceptable per the empirical CCAT distribution.)
5. **No-section-break interleaving.** Within each decile, count consecutive same-section runs (verbal-then-verbal, numerical-then-numerical). Assert the within-decile shuffle produces interleaving (no decile is 10 slots of one section).
6. **End-to-end engine integration.** Real-DB harness: insert a full-length session, drive `submitAttempt` 50 times against the engine, assert each `getNextItem` returns a non-undefined item, assert the served-tier distribution per decile matches the curve (allowing for `tier-degraded` fallback in thin cells).
7. **Bank-thin cell graceful degradation.** Force a sub-type-tier cell to zero via test-fixture `WHERE NOT EXISTS`; drive a full-length that requests that cell at one or more slots; assert the engine serves a degraded item (records `fallback_level: 'tier-degraded'`) rather than crashing.
8. **No-re-serve-in-session.** Drive a full-length to completion; assert the served `item.id` set has 50 distinct ids (no item served twice).

## 4. Timer / pacing design

### What's missing / what should exist

Full-length needs a 15-minute session-level time-box. Per audit (E), `<FocusShell>`'s existing auto-end behavior covers this without code changes. The flow is:

1. `/full-length/run/page.tsx` → `startSession({ type: "full_length" })` → returns `sessionId` + `firstItem`.
2. `<FullLengthRunContent>` mounts `<FocusShell>` with `sessionDurationMs: 900_000`, `perQuestionTargetMs: 18_000`, `paceTrackVisible: true`, `targetQuestionCount: 50`, `strictMode: false`, `sessionType: "full_length"`.
3. The focus shell drives `submitAttempt` per question. `getNextItem`'s `getNextFixedCurve` branch reads the next slot per `attemptIndex`.
4. Either:
   - The user submits 50 attempts before 15 minutes elapse → `submitAttempt` returns `nextItem: undefined` → focus shell calls `onEndSession()` → `router.push('/post-session/' + sessionId)`.
   - The 15-minute timer expires → focus shell auto-end effect fires → `onEndSession()` → `router.push('/post-session/' + sessionId)` with whatever attempts the user had submitted by then.

### Recommendation

**No new timer mode.** `'standard'` covers the 18-second-per-question anchor; the session-level 15-minute time-box is `sessionDurationMs`-driven, not timer-mode-driven. `practice_sessions.timer_mode` stays NULL for full-length (it's drill-only — see audit (E)).

**No mid-session UI changes**: full-length renders the same chrome row as drill — session bar + pace track + chronometer + question timer underneath the per-question prompt. The focus-shell exclusion from Alpha Style stays; the chrome row's tuned visual language carries over unchanged.

**No new completion-reason value**: `'completed'` covers both "user finished 50 of 50" and "timer expired with N < 50 submitted." The post-session render reflects the actual attempt count via the type-agnostic aggregations; no UI cue distinguishes "I ran out of time" from "I finished all 50" beyond the surfaced numbers themselves.

**Strategy gate**: cut from v1 per master plan §1 + PRD §6.5. Full-length lands on the post-session shell directly with no gate.

### Implementation seam

- `<FullLengthRunContent>` (new `"use client"` component at `src/app/(app)/full-length/run/content.tsx`) — accepts `initPromise: Promise<RunInit>`, mounts `<FocusShell>` with the full-length config block per the recommendation above. Mirrors `<DrillRunContent>` shape bit-for-bit modulo `sessionType` and `sessionDurationMs`.
- No edits to `<FocusShell>` or its peripherals.

### Schema / state changes

**None.**

### Verification scenarios

1. **15-minute auto-end.** Real-DB harness: start a full-length, advance the focus-shell elapsed-time clock past 900_000ms (via the existing test instrumentation hooks) without submitting all 50, assert `onEndSession()` fires and navigation lands on `/post-session/[sessionId]`. Assert `practice_sessions.ended_at_ms` is non-NULL and `completion_reason = 'completed'`.
2. **Submit-all-50 termination.** Drive 50 submits in under 15 minutes, assert `submitAttempt` returns `nextItem: undefined` on the 50th, assert `onEndSession()` fires, assert navigation lands on `/post-session/[sessionId]`.
3. **Per-question 18-second triage prompt.** Submit a question with elapsed > 18000ms, assert `<TriagePrompt>` rendered before submission. (Inherits from existing focus-shell test discipline; this is a regression check.)
4. **Pace track 50-block render.** Snapshot the pace track on full-length first-render: assert 50 blocks. As attempts submit, blocks shrink from the left edge.
5. **Chronometer at 15:00 → 0:00 countdown.** Snapshot `<SessionTimerBar>` chronometer at session start (15:00) and again 5 minutes in (10:00 visible); assert the readout matches.
6. **No belt indicator on full-length post-session.** After auto-end or 50-completion, the post-session shell renders WITHOUT the belt indicator (slot 1 expansion stays empty per the existing `sessionType === "drill"` guard).

## 5. Entry point + flow design

### What's missing / what should exist

Full-length needs a stable entry point on Mastery Map plus a configure → run route pair.

### Recommendation

**Mastery Map secondary CTA**: add a single small, low-contrast `<a href="/full-length/configure">Take a full-length test</a>` link below the primary `<StartSessionButton>`. Visual treatment matches PRD §5.2's "small, low-contrast" framing. Renders unconditionally for users past the diagnostic-completed gate (Mastery Map already gates on this via the `(app)` layout). Does NOT include "Test-day simulation" or "History" — out of v1 scope.

**Routes**:

- `/full-length/configure/page.tsx` — server component, brief landing page that explains the test (one paragraph: "50 questions, 15 minutes, no breaks, real-test difficulty mix") plus a single `<form action="/full-length/run" method="get">` with submit button "Start full-length test." No pickers.
- `/full-length/run/page.tsx` — server component, kicks off `startSession({ type: "full_length" })` (via the action wrapper at `src/app/(app)/actions.ts`), returns `RunInit = { sessionId, firstItem }`. Mounts `<FullLengthRunContent>` with the init promise.
- `/full-length/run/content.tsx` — `"use client"`, consumes `initPromise` via `React.use()`, mounts `<FocusShell>` with the full-length config block per §4.

**Route group**: `/full-length/` lives in the `(app)` group (sibling to `/drill/`). Carries the `(app)` layout's diagnostic-completed gate — full-length is post-onboarding by definition, never reachable before the diagnostic completes. Same gate-shape as drill.

**Configure step rationale**: master plan §5 doesn't mandate a configure step; SPEC §10.3 reads "calls `startSession({ type: "full_length" })` directly," implying no configure step. The audit recommendation differs: a one-screen primer prevents misclick-launch of a 15-minute commitment, mirrors drill's configure → run shape (the user's mental model is "I clicked something on Mastery Map; now I'm on a configure page; now I start"), and gives the route a stable home for any future expansion (e.g., an optional length-shorter variant) without retrofitting. The configure page is intentionally bare — no pickers, no toggles, just confirmation framing — so this isn't gold-plating, it's a thin commitment-confirmation layer.

**Full-length CTA labeling**: "Take a full-length test" on Mastery Map; "Start full-length test" on configure page submit. Both phrasings match PRD §5.2 + §4.5's existing user-facing language. NOT renamed to dojo / belt metaphor — full-length is not a dojo session (the dojo metaphor maps to drill mode with adaptive walking). Keeping the metaphor boundary clean: dojo = drill, exam = full-length.

### Implementation seam

- `src/app/(app)/full-length/configure/page.tsx` — server component; renders configure pane.
- `src/app/(app)/full-length/run/{page,content}.tsx` — mirrors `/drill/[subTypeId]/run/{page,content}.tsx` modulo session type + duration.
- `src/components/mastery-map/mastery-map.tsx` — adds a single secondary CTA (anchor link) below `<StartSessionButton>`. Layout: `<div className="flex flex-col items-center gap-3">` already wraps the start button; the secondary CTA goes inside that div, below the button, with low-contrast text styling per Alpha Style normalize.
- No new component for the secondary CTA — it's a one-line `<a href="/full-length/configure">` styled inline. If sub-phase plans later add other secondary CTAs (history, etc.), refactor to a `<SecondaryCTA>` component then; YAGNI for one.

### Schema / state changes

**None.**

### Verification scenarios

1. **Mastery Map secondary CTA renders.** Real-DB harness: load Mastery Map, assert the secondary CTA anchor is present with `href="/full-length/configure"`. Snapshot text: "Take a full-length test".
2. **Configure page renders unauthenticated → /login redirect.** Sign out, navigate to `/full-length/configure`, assert redirect to `/login`.
3. **Configure page renders pre-diagnostic → /diagnostic redirect.** Auth as a user with no completed diagnostic, navigate to `/full-length/configure`, assert redirect to `/diagnostic`.
4. **Configure → run flow.** From configure page, click the submit button; assert navigation to `/full-length/run`. Run page kicks off `startSession`, mounts `<FocusShell>`, renders the first item.
5. **`startSession` writes correct row.** After run page mount, assert `practice_sessions` row exists with `type = 'full_length'`, `target_question_count = 50`, `sub_type_id IS NULL`, `timer_mode IS NULL`.
6. **Auto-end behavior end-to-end.** Real-DB harness: start a full-length, fast-forward time, assert `endSession` lands the user on `/post-session/[sessionId]`; assert post-session render shows the partial-completion accuracy + latency aggregations.

## 6. Post-session shell behavior for full_length

### What's missing / what should exist

Per audit (C) + (G), every existing post-session slot guard already routes full-length correctly. **No new slots, no new guards, no new copy.**

### Recommendation

**Heading**: "Session complete" (shared with drill via `isDiagnostic ? "Diagnostic complete" : "Session complete"`). No full-length-specific text.

**Slot rendering (final-state per session type, full enumeration)**:

| Slot | Contents | Diagnostic | Drill | Full-length |
|---|---|---|---|---|
| 1 (heading) | "Session complete" | "Diagnostic complete" | "Session complete" + belt indicator | "Session complete" |
| 2 | `<TriageScoreLine>` | ✓ | ✓ | ✓ |
| 3 | `<AccuracySummary>` | ✓ | ✓ | ✓ |
| 4 | `<LatencySummary>` | ✓ | ✓ | ✓ |
| 5 | `<WrongItemsBrowser>` (with sub-phase 4 click-to-highlight) | ✓ | ✓ | ✓ |
| 6 | `<StrategySurface>` | ✓ | ✓ | ✓ |
| 7 | `<OnboardingTargets>` | ✓ | — | — |
| 8 | Pacing-line sentence | conditional > 15min | — | — |
| 9 | Continue CTA | — (form has Save/Skip) | ✓ | ✓ |

**No edits to `<PostSessionShell>`** beyond the existing session-type-aware dispatch. The rule "diagnostic vs not-diagnostic" already correctly partitions the 9-slot ordering for full-length. The belt-indicator slot-1 expansion's existing guard (`sessionType === "drill"`) already correctly excludes full-length.

**Post-session aggregations**: `getPerSubTypeAccuracy`, `getPerSubTypeLatency`, `getWrongItemsForSession`, `getStrategiesForSubTypes`, `triageScoreForSession`, `getEndSessionTierForDrill` — every query is type-agnostic except `getEndSessionTierForDrill` which already early-returns `null` on non-drill sessions per its existing guard (verify at audit; if the guard is implicit, make explicit during commit). Sub-phase 3 changes none of these.

### Implementation seam

**None.** The post-session shell is full-length-ready as of sub-phase 5's close.

### Schema / state changes

**None.**

### Verification scenarios

1. **Full-length post-session DOM order.** Drive a full-length to completion; assert `<PostSessionShell>` renders slots in order 1 → 9 with: "Session complete" heading, NO belt indicator, TriageScoreLine, AccuracySummary, LatencySummary, WrongItemsBrowser, StrategySurface, NO OnboardingTargets, NO pacing line, Continue CTA.
2. **Click-to-highlight inheritance.** From the full-length post-session, find a wrong item with `metadata_json.structuredExplanation`; click an elimination part; assert the corresponding option(s) gain `line-through + text-foreground/60` styling.
3. **No belt indicator regression.** Drive a full-length AND a drill in the same harness run; assert the full-length post-session has no belt indicator while the drill post-session does.
4. **StrategySurface struggled-sub-type derivation.** Drive a full-length where the user gets > 30% wrong on `verbal.synonyms`; assert `<StrategySurface>` renders a strategy for that sub-type.
5. **Continue button → Mastery Map.** Click Continue from full-length post-session; assert `router.push("/")` fires and the user lands back on Mastery Map.

## 7. Component shape design

### What's missing / what should exist

New components needed:

- `<FullLengthRunContent>` — `"use client"`, consumes `initPromise`, mounts `<FocusShell>`. Mirrors `<DrillRunContent>` shape.
- `<FullLengthConfigureSkeleton>` — skeleton fallback for the configure page's Suspense boundary (if the page does any async work — likely none; if so, a tiny skeleton suffices).
- (Optional) `<FullLengthCTA>` — Mastery Map secondary CTA. Recommendation: inline anchor element, no dedicated component (per §5).

Existing components extended:

- `<MasteryMap>` — adds the secondary CTA anchor below the primary `<StartSessionButton>`.

No edits to `<PostSessionShell>`, `<FocusShell>`, `<TriageScoreLine>`, `<AccuracySummary>`, `<LatencySummary>`, `<WrongItemsBrowser>`, `<StrategySurface>`, `<OnboardingTargets>`, `<BeltIndicator>`, `<StructuredExplanation>`. All inherit unchanged.

### Recommendation

**Composition with existing slot-locking**: the post-session shell's locked nine-slot ordering is preserved bit-for-bit. No new slot, no slot reordering, no new gating logic. The slot-locking convention from sub-phases 1 + 5 is honored without further commitment — sub-phase 3 inherits the surface as-is.

**Alpha Style cadence at commit boundaries**:

- Component-scoped `audit` at commits 4 + 5 (`<FullLengthConfigure>` + `<FullLengthRun>` + Mastery Map secondary CTA).
- Full-surface `audit` + `polish` at commit 6 across the configure page + Mastery Map + post-session shell (as full-length now exercises the shell's non-diagnostic non-drill render path for the first time).
- The `/full-length/run` route's `<FocusShell>` is excluded from Alpha Style per the focus-shell-exclusion convention; sub-phase 3 does NOT audit/normalize the focus shell.

The `teach-alpha-style` setup ran at sub-phase 1 commit 1 and is durable; sub-phase 3 reuses the persisted context. No re-run.

### Implementation seam

- `src/app/(app)/full-length/configure/page.tsx` — net-new server component.
- `src/app/(app)/full-length/run/page.tsx` — net-new server component.
- `src/app/(app)/full-length/run/content.tsx` — net-new client component.
- `src/components/mastery-map/mastery-map.tsx` — small additive edit (one anchor inside the existing CTA wrapper div).

### Schema / state changes

**None.**

### Verification scenarios

1. **Component composition assertion.** From `/full-length/run` post-mount, assert the DOM tree contains `<FocusShell>` with `data-session-type="full_length"` (or equivalent type-tagged marker — extend if not present); the focus-shell tree itself is unchanged from drill.
2. **Mastery Map secondary CTA placement.** Snapshot the Mastery Map: assert the secondary CTA anchor renders below the primary `<StartSessionButton>` with low-contrast styling matching PRD §5.2 + Alpha Style conventions.
3. **Alpha Style audit clean.** Per §11 commits 4-6, capture the audit output in commit messages; assert no P0 / P1 issues outstanding at sub-phase close.

## 8. Test surface

### What's missing / what should exist

New tests for:

- **Pure-function tests on `generateFullLengthSlots`.** Per §3 verification scenarios 1-5: per-decile distribution exactness, per-session determinism, cross-session variation, all-14-sub-types union coverage across many sessions, no-section-break interleaving sanity check. ~5-7 unit tests in `src/config/difficulty-curves.test.ts` (net-new file) or alongside `selection.test.ts` (consumer-side).
- **Integration test on `getNextFixedCurve` with `type: "full_length"`.** End-to-end through `startSession` + `submitAttempt` × 50 against a fixture session — drives the full slot generator + selection + fallback chain. ~2-3 tests in `src/server/items/selection.test.ts`.
- **Real-DB harness for end-to-end full-length flow.** Throwaway `/tmp/full-length-harness.ts` per the established pattern (per sub-phase 2 + sub-phase 4 + sub-phase 5 precedents). Drives: configure-page render, configure → run navigation, 50-question completion, post-session render verification (heading, slot ordering, no-belt, click-to-highlight on wrong items).
- **Real-DB harness for time-expiry path.** Same throwaway harness. Drives: full-length started, time advanced past 900_000ms, assert auto-end fires, assert post-session render shows partial-completion data.

Test count growth target: 69 → 76-80. Bun test discipline: net-new tests live in `src/.../*.test.ts` (committed, run by `bun test`); throwaway harnesses live in `/tmp/` per the convention.

### Recommendation

**Pure-function tests in a new file** `src/config/difficulty-curves.test.ts` (vs adding to `selection.test.ts`). The slot generator is a config-layer pure function; isolating its tests from the selection-engine tests keeps each file's job clean. Pattern matches the existing per-module test isolation (e.g., `src/server/items/next-difficulty-tier.test.ts` for the walker pure function).

**Real-DB harness pattern**: throwaway `/tmp/full-length-harness.ts`, as established in sub-phases 2 + 4 + 5. The harness verifies: (a) full-length completion happy path, (b) time-expiry partial-completion path, (c) post-session render visual verification via Playwright headless screenshots, (d) DB row state assertions (practice_sessions row shape, attempts row count).

**Visual-regression test infrastructure**: still **out of scope** per master plan §11 + the standing candidate convention. Sub-phase 3 uses Playwright headless for spot-check screenshots only; no regression baseline is established or maintained.

**Component-test infrastructure**: still **out of scope** (per the dojo-belt-indicator round audit — "the codebase has no component-test infrastructure"). Sub-phase 3 verifies component rendering via the real-DB harness + Playwright, not via component-isolation tests.

### Implementation seam

- `src/config/difficulty-curves.test.ts` — new file with the pure-function slot-generator tests.
- `src/server/items/selection.test.ts` — extends with full-length integration tests against `getNextFixedCurve`.
- `/tmp/full-length-harness.ts` — throwaway, not committed, per the established pattern.

### Schema / state changes

**None.**

### Verification scenarios

1. **Test count grows.** Baseline 69 tests; target 76-80 at sub-phase close. Verified by `bun test` output.
2. **Bun lint + bun typecheck clean** at every commit boundary.
3. **EXPLAIN ANALYZE captured.** No new DB queries this sub-phase (the post-session aggregations are unchanged; the selection engine reuses `pickWithFallback`'s existing query plumbing). If any net-new query surfaces during commit verification (e.g., a Mastery Map secondary-CTA gate read), capture EXPLAIN ANALYZE per SPEC §6.14.7.

## 9. Sequencing and commits

**Six commits, in order.** Per master plan §5's rough estimate of 3-4 commits + audit-surfaced UI work, this sub-phase lands at six commits because it bundles: (a) the pure-function slot generator + tests, (b) the engine extension, (c) the route pair (configure + run), (d) the Mastery Map secondary CTA, (e) full-surface Alpha Style audit + polish, (f) docs reconciliation + plan close.

1. **`docs(prd+spec+plan): open phase5-full-length-test round`.** First commit — establishes the round's documentation baseline. Sub-actions:
   - `docs/plans/phase5-full-length-test.md` lands with status "in flight."
   - SPEC §10.3 prose adjusted to past-tense the v1 shape with the actual route paths shipping (`/full-length/configure` + `/full-length/run`); the canonical "real-bank-first then generated-fallback" framing stays as forward-compat narrative.
   - Optional PRD touch: §4.5 already canonical; no PRD edit unless the audit during round-open uncovers drift.
   - Round-open audit: capture the 56-tier-cell snapshot (commit-message body), confirm zero `practice_sessions.type = 'full_length'` rows, confirm bank totals invariant 439 / 14 / 42 / 50 NULL / 389 structured.

   Verification: docs render cleanly; no code change.

2. **`feat(config): full-length-slot generator + per-session deterministic interleaving`.** Adds `generateFullLengthSlots(sessionId)` to `src/config/difficulty-curves.ts` per §3. Adds `src/config/difficulty-curves.test.ts` with the pure-function tests (decile-distribution exactness, per-session determinism, cross-session variation, all-14-sub-types coverage, within-decile interleaving). Centralizes the xmur3 + mulberry32 PRNG helpers (or imports from `diagnostic-mix.ts`) per §3 implementation seam. Dormant — no consumer yet.

   Verification: §3 scenarios 1-5 pass. `bun test` count grows by 5-7. `bun lint` + `bun typecheck` clean.

3. **`feat(selection): wire full-length into getNextFixedCurve`.** Extends `getNextFixedCurve` in `src/server/items/selection.ts` to dispatch on `ctx.type` — diagnostic uses `shuffledDiagnosticOrder`, full_length uses `generateFullLengthSlots`, simulation throws (defensive — phase 6 work). Updates `src/server/items/selection.test.ts` with 2-3 full-length integration tests (engine completes 50 attempts; per-decile served-tier distribution matches; tier-degraded fallback fires when bank-thin). Server-side; no UI surface changes.

   Verification: §3 scenarios 6-8 pass. `bun test` count grows by 2-3. EXPLAIN ANALYZE on selection queries unchanged (same `pickWithFallback` plumbing); capture in commit message if the planner shape differs from the diagnostic baseline.

4. **`feat(app): /full-length/configure + /full-length/run routes; Mastery Map secondary CTA`.** Adds:
   - `src/app/(app)/full-length/configure/page.tsx` — configure pane.
   - `src/app/(app)/full-length/run/page.tsx` — server component, kicks off `startSession`.
   - `src/app/(app)/full-length/run/content.tsx` — `"use client"`, mounts `<FocusShell>` with full-length config block.
   - `src/components/mastery-map/mastery-map.tsx` — adds the secondary CTA anchor below `<StartSessionButton>`.

   First commit where end-to-end is reachable in browser. Runs component-scoped Alpha Style `audit` at commit close on the configure page + Mastery Map secondary CTA; `normalize` on demand.

   Verification: §5 scenarios 1-6 + §4 scenarios 1-6. Real-DB harness `/tmp/full-length-harness.ts` runs: 50-question completion + auto-end paths.

5. **`feat(post-session): full-surface audit + polish across full-length post-session render path`.** No code change to `<PostSessionShell>` (full-length is fully covered by existing dispatch). The commit captures the full-surface Alpha Style `audit` across the post-session shell as it now renders for full-length for the first time, plus `polish` as the final quality pass. Captures EXPLAIN ANALYZE re-runs on the post-session aggregations against a full-length fixture session (per SPEC §6.14.7); these queries are unchanged but the verification is captured for the v1-feature-complete record.

   Verification: §6 scenarios 1-5. Alpha Style audit + polish clean across the post-session shell.

6. **`docs(spec+prd+plan): reconcile §10.3 + §6.5 to past-tense; close phase5-full-length-test round`.** Doc-only. SPEC §10.3 prose rewrites past-tense to reflect what shipped (route paths, slot-generator location, configure-page presence). SPEC §6.5 adds a one-sentence note that full-length lands on the same surface as drill. PRD §4.5 unchanged. This plan's status flips to "shipped." **Phase 5 v1 is feature-complete after this commit.**

The audit at round open determines whether commit count grows to 7 (e.g., if the slot generator's PRNG centralization warrants a separate atomic edit) or stays at 6.

## 10. Verification protocol carry-forward

Established discipline from sub-phases 1, 2, 4, 5 carries forward unchanged:

- **`playwright-core` directly** with `page.screenshot({ timeout: 30_000 })`. No MCP `browser_take_screenshot`.
- **`page.mouse.move(10, 10)`** before any post-click `getComputedStyle` measurement.
- **Real `page.click()`** for any user-interaction-gated paths — specifically the configure-page submit button, the post-session Continue button, and the click-to-highlight elimination / tie-breaker buttons (sub-phase 4 inherited).
- **Real-DB harness** for any verification touching `practice_sessions` / `attempts` / `mastery_state` / `strategies`. The smoke route at `src/app/phase3-smoke/page.tsx` is NOT used.
- **EXPLAIN ANALYZE plans captured in commit messages** for any new DB queries (none anticipated this sub-phase; if any surface, capture per SPEC §6.14.7).
- **Pino structured-log capture** for any error-state assertions.
- **Throwaway harness scripts** under `/tmp/full-length-harness.ts` so `tsgo` doesn't pick them up.
- **Alpha Style operational commands** at commit boundaries: component-scoped `audit` at commit 4; full-surface `audit` + `polish` at commit 5.
- **Closed-plans-immutable convention** post-write per SPEC §6.14.20.
- **Audit-against-actual-artifact** per SPEC §6.14.18 binds — every plan-time framing in §2-§9 above must be re-verified against actual commit-time artifact at each commit boundary; the audit-vs-plan-drift pattern that surfaced in sub-phases 4 + 5 is expected to surface here too.

**SPEC §6.14 conventions inherited.** The relevant ones for this sub-phase:

- **§6.14.7 EXPLAIN ANALYZE for hot-route queries** — full-length adds no new queries; the existing `pickWithFallback` plumbing is the hot path.
- **§6.14.13 dev-vs-prod planner choice** — the per-session aggregations and the recency-excluded set computation are unchanged from sub-phase 1 + the diagnostic.
- **§6.14.18 audit-against-actual-artifact** — strongly applicable; sub-phase 3's audit notes for `<PostSessionShell>` unchanged-ness, `<FocusShell>` type-readiness, and `selectionStrategyForSession` already-wired-ness are all claims about existing code that must be reverified at commit time. If the actual artifact diverges (e.g., a slot guard turns out to need adjustment), the plan §2 finding is stale and the commit message documents the divergence.
- **§6.14.20 closed-plans-immutable** — this plan is closed-immutable post-write.

## 11. Out of scope

Explicit list — items deliberately not addressed in sub-phase 3:

- **Test-day simulation (PRD §4.6).** Phase 6 per `docs/architecture_plan.md` build-sequencing. The `'simulation'` session-type stays in the enum and reuses the `'fixed_curve'` strategy; sub-phase 3's `getNextFixedCurve` extension defensively throws on `type === 'simulation'` (covered by the existing `else` clause). When Phase 6 ships simulation, that round adds the `else` branch.
- **Visual-regression test infrastructure.** Standing candidate per master plan §11; not graduated this sub-phase.
- **isTextOnly filter relaxation.** Independent feature; not touched.
- **Walker behavior changes.** Settled in sub-phase 2; full-length is fixed-curve, not adaptive — no walker work.
- **Tagger / classifier changes.** Settled in tagger-improvement round; bank state is durable.
- **New strategy entries.** Settled in strategy-authoring round (closed 2026-05-07 at `9c13d68`); 42 strategies stays the v1 count.
- **`structuredExplanation` backfill for the 50 NULL-`source_folder` seed items.** Standing candidate per sub-phase 4 plan §11.3 + the click-to-highlight round close; not graduated this sub-phase. Full-length wrong items that happen to draw from these 50 seed items render the prose fallback in `<WrongItemsBrowser>` per the sub-phase-4-shipped behavior.
- **Mastery Map secondary CTAs beyond full-length.** "Test-day simulation" (Phase 6), "History" (post-Phase-5), "Review (N due)" (cut from v1) all stay unbuilt.
- **Length variants for full-length.** v1 is fixed at 50 questions × 15 minutes. No length picker, no sub-type subset picker. Future-round work if dogfood signal demands.
- **Sub-type weighting in `generateFullLengthSlots`.** v1 ships unweighted random sub-type draws within each (decile, tier) slot. Empirical-anchor weighting is a follow-up round's edit (one config addition); v1 ships the simpler unweighted shape.
- **Mobile-specific interaction patterns beyond tap=click.** Click-to-highlight (sub-phase 4) inherits tap=click; no long-press / swipe / double-tap added by sub-phase 3.
- **Production deploy.** Phase 5 v1 feature-complete after this sub-phase; deploy is the post-Phase-5 operational round.
- **Post-deploy operational hardening.** Out of scope; standing candidate for the post-Phase-5 cleanup / dogfood / deploy sequence.
- **`<StrategyReviewGate>` and the 30-second post-full-length strategy review.** Cut from v1 per master plan §1 + PRD §6.5 + SPEC §10.3 cut-from-v1 markers; never shipped to tree; sub-phase 3 honors the cut.
- **Per-session option shuffling.** Phase 5 / 6 work; orthogonal to this sub-phase.
- **PRD edits.** §4.5 already canonical for v1; the §6.5 strategy-gate cut marker is in place from the v1-cuts pass on 2026-05-04. No PRD edits this sub-phase.

## 12. Open questions / resolutions

Open questions surfaced during drafting. Recommendations attached; final resolutions captured at commit-1 round-open.

### 12.1 Mix source — `difficulty-curves.ts` vs new `full-length-mix.ts`

**Question.** Master plan §5 says `src/config/full-length-mix.ts` (or sibling); SPEC §10.3 + feature-roadmap §1 name the existing `src/config/difficulty-curves.ts` (which carries `standardCurve` + `roundDecile`). Where does the slot generator live?

**Recommendation: extend `difficulty-curves.ts`.** The slot generator is a pure function over `standardCurve` + `roundDecile` + `subTypeIds` + a deterministic PRNG seed. Naming a separate `full-length-mix.ts` would duplicate the file-organization overhead for a 30-line function; SPEC §10.3 + feature-roadmap §1 already name `difficulty-curves.ts` as the canonical config. Rationale matches sub-phase 1's "colocate where it belongs" pattern. **Final resolution: `difficulty-curves.ts`.**

### 12.2 Timer behavior — time-boxed at session level vs untimed

**Question.** Is the full-length 15-minute time-box load-bearing for the v1 shape, or could the session be untimed (50 questions however long they take)?

**Recommendation: time-boxed at 15 minutes.** PRD §4.5 specifies "50 questions in 15 minutes" — the time-box is the exam-fidelity signal that distinguishes full-length from drill. Untimed is what diagnostic does (because diagnostic is calibration, not exam-fidelity); full-length's whole product purpose is exam-fidelity, so the time-box stays. Existing `<FocusShell>` auto-end behavior covers this without code changes. **Final resolution: time-boxed (15 min).**

### 12.3 Sub-type weighting in slot generator — empirical-anchor weighting vs uniform

**Question.** Should `generateFullLengthSlots` weight sub-type draws by the empirical CCAT-prep distribution (the same anchor `diagnostic-mix.ts` uses), or draw uniformly from the 14-pool?

**Recommendation: uniform draws in v1.** The per-decile difficulty curve is the load-bearing exam-fidelity signal; sub-type weighting is a finer adjustment whose value is not yet validated against dogfood signal. Uniform is simpler, deterministic, easier to verify, and bypasses a "is the empirical anchor exactly right?" debate. If post-deploy dogfood signal indicates the mix should weight by sub-type prevalence, that's a follow-up round's edit (one config addition). **Final resolution: uniform v1; weighting deferred.**

### 12.4 Per-question timer — standard 18-second-anchor vs different

**Question.** Does full-length use the standard 18-second per-question target, or a different anchor (e.g., 15 min / 50 q = 18 s exactly, but the per-question chronometer/triage prompt anchor could in principle differ)?

**Recommendation: standard 18 seconds.** PRD §1's whole framing of the product is the 18-second triage discipline; full-length should inherit the same anchor so the user's drill-trained discipline transfers cleanly. The math (15 min / 50 q = 18 s) coincides with the standard target by design — this is part of why CCAT picked these numbers. **Final resolution: 18 s standard.**

### 12.5 Entry point — Mastery Map secondary CTA vs separate page vs other

**Question.** Where does the user start a full-length test?

**Recommendation: small low-contrast secondary CTA on Mastery Map below the primary `<StartSessionButton>`.** Matches PRD §5.2's "small, low-contrast" framing for secondary actions. No new page (Mastery Map → configure → run is already two hops; adding a separate "select session type" page would be a third hop with no value). **Final resolution: Mastery Map secondary CTA → `/full-length/configure`.**

### 12.6 Configure step — length picker vs sub-type picker vs none vs primer-only

**Question.** Does `/full-length/configure` carry pickers (length, sub-type subset) or is it bare?

**Recommendation: bare primer page with a single submit button.** Master plan §5 + SPEC §10.3 don't mandate a configure step at all; the audit recommendation (§5) adds a one-screen primer to prevent misclick-launch and mirror drill's configure → run shape, but with NO pickers. v1 ships fixed 50q × 15min cross-sub-type — there's nothing to configure. The page exists as a thin commitment-confirmation layer, not as a settings panel. **Final resolution: bare primer page; no pickers.**

### 12.7 Heading text — "Full-length test complete" vs generic "Session complete"

**Question.** Does the post-session shell add a third heading branch for full-length, or stay with the existing "Session complete" generic for non-diagnostic types?

**Recommendation: stay with "Session complete".** Adding a third heading branch for one render variant doesn't earn its weight. The slots below the heading carry the full session-type-specific content (StrategySurface, etc.); the heading is a small piece of context that "Session complete" handles without sacrificing clarity. Drill also uses "Session complete" today (slot-1 expansion adds the belt indicator below); full-length matches drill modulo the belt. **Final resolution: "Session complete"; no new branch.**

### 12.8 Per-surface session-type-aware decisions (full enumeration)

**Question.** Per audit (C)'s 11-surface enumeration: which surfaces need session-type-aware edits for full-length?

**Recommendation: zero edits.** Every existing guard already routes full-length correctly — `<PostSessionShell>` heading branch (already routes full-length to "Session complete"), slot 1 belt indicator (already drill-only), slots 7-8 OnboardingTargets + pacing-line (already diagnostic-only), slot 9 Continue CTA (already non-diagnostic). The Mastery Map gets a one-line secondary CTA (per Q12.5); the `<FocusShell>` is type-aware via existing props; audio cues inherit. **Final resolution: zero session-type-aware edits to existing components; one CTA addition to Mastery Map.**

### 12.9 Test surface posture — throwaway-harness + Playwright spot-check vs graduating component-test infrastructure

**Question.** Does sub-phase 3 graduate the standing candidate "component-test infrastructure" (raised in sub-phase 5's audit)?

**Recommendation: stay with throwaway-harness + Playwright spot-check.** Component-test infrastructure remains a standing candidate; sub-phase 3 doesn't graduate it because (a) the per-component verification needs are bounded (one new component `<FullLengthRunContent>` plus minor edits to `<MasteryMap>`), (b) the throwaway-harness pattern is established and works, (c) graduating infrastructure mid-sub-phase risks distraction from the v1-feature-complete deploy gate. The harness covers full-length's verification surface adequately. **Final resolution: throwaway-harness + Playwright; component-test infrastructure stays a standing candidate.**

### 12.10 Repeat-allowed semantics within a single full-length session

**Question.** Within a 50-question full-length, can the same `(subTypeId, difficulty)` tuple appear in multiple slots? Can the same `item.id` appear twice?

**Recommendation: same as diagnostic.** The same `(subTypeId, difficulty)` tuple CAN appear in multiple slots (the per-decile distribution at 50 slots × 4 tiers / 14 sub-types means many tuples will repeat). The same `item.id` is NEVER served twice in a session — `pickWithFallback`'s `sessionAttemptedIds` exclusion prevents re-serve, matching the diagnostic's no-re-serve-in-session test. **Final resolution: tuples may repeat; item ids never repeat in-session.**

### 12.11 Audit-surfaced additions (placeholder)

**Question.** Will the round-open audit at commit 1 surface additional open questions not anticipated in §2.1-§2.9?

**Recommendation: capture inline as Q12.12+ at commit-1 close if surfaced.** The plan stays closed-immutable post-write per SPEC §6.14.20; new audit-surfaced questions get captured in the commit message of the commit that surfaced them, not retroactively edited into the plan. If a question warrants plan-level treatment, the next-round plan inherits it. **Final resolution: per-commit-message capture for audit-surfaced additions.**
