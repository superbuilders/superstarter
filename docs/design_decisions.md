# 18 Seconds — Design Decisions

> **Triage feature removed 2026-05-10.** §3 ("Focus shell, timers,
> triage"), §3.1 ("No auto-submit"), §3.2 ("Triage shortcut is the T
> key"), §3.3 ("Triage score denominator…"), §5.6 ("NarrowingRamp
> obstacle algorithm: top-2-by-weakness + reserved triage slot"), and
> any other entry describing triage as a live feature now describe
> historical decisions for a feature that no longer ships. The
> in-flow popup, the `triage_take` reducer action, the
> `attempts.triage_*` columns, and the post-session adherence line
> are all gone. The per-question 18-second target still drives the
> timer bar and warning sound; it just no longer fires a popup.

This document is the audit trail of every product and engineering decision made while shaping the build. Each entry records the question that came up, the options considered, the option chosen, and the rationale. New contributors should be able to read this end-to-end and understand why the system has the shape it has, without having to reconstruct any of the reasoning from the SPEC.

Decisions are grouped by topic. Within a topic they are ordered roughly in the order the decision affects the build.

---

## 1. Item bank and content model

### 1.1 Visual sub-types are real-only for v1

**Question.** The generation pipeline only produces text items. Without a separate strategy, the four `abstract.*` sub-types and `attention_to_detail.visual_duplicates` can never grow past their seed bank.

**Options.**
1. Visual sub-types stay real-only for v1.
2. Multimodal generator (Anthropic image output / DALL·E / Imagen).
3. Programmatic SVG templates per visual sub-type.
4. Hybrid: programmatic for `abstract.*`, real-only for `visual_duplicates`.

**Chosen.** Option 1 — visual sub-types stay real-only.

**Rationale.** The text-generation pipeline is already the centerpiece engineering deliverable; a second image-generation pipeline would dilute the signal of the first rather than strengthen it. Real-only is a deliberate scoping decision, not a known limitation. The per-cell bank target for visual sub-types is set in decision 1.8 below (30 items per cell, against the default 50 for non-visual cells). The PRD scope section (and SPEC §10/§4) record this as out-of-scope for v1.

### 1.2 Item body is a typed discriminated union, decoupled from sub-type

**Question.** Real CCAT items contain charts (data interpretation), side-by-side image pairs (visual duplicates), tabular columns (column matching), and grids of shapes (matrix). The original SPEC schema (single `prompt` text + optional `image_url`) is too thin.

**Options.**
1. Replace `prompt` + `image_url` with a typed `body` JSON column discriminated by `body.kind`.
2. Keep simple schema and render every non-trivial item as one composed image.
3. Add discrete columns for each known shape (`image_url_b`, `table_json`, `chart_url`).

**Chosen.** Option 1 — typed `body` JSON discriminated by `body.kind`.

**Rationale.** Discriminating on `body.kind` rather than on `sub_type_id` keeps the variant catalog open-ended — sub-type and body shape are not 1:1 (a numerical word problem may include a chart; a verbal analogy never does). The body is validated with a Zod `discriminatedUnion` at ingest and at the generation pipeline boundary; the renderer dispatches via `switch` with TypeScript exhaustiveness checking. Variants ship as: `text`, `text_with_image`, `image_pair`, `image_pair_grid` (visual duplicates), `column_matching`, `chart`, `grid`. (Decision 1.7 records why `image_pair_grid` and `column_matching` exist rather than a single generic `table` variant.) The generation pipeline emits `body: { kind: "text", ... }` for text items so the wire format is uniform regardless of source.

### 1.3 Options shape stays uniform across all body kinds

**Question.** Should `options[]` also be discriminated per `body.kind`, or stay one shape?

**Options.**
1. Uniform options: `{ id; text?; imageUrl? }` across every body kind.
2. Per-`body.kind` options shape.

**Chosen.** Option 1 — uniform options.

**Rationale.** The body discriminator does real work because prompt rendering varies materially across kinds. The answer-space shape, however, doesn't vary: every CCAT sub-type collapses to text-only or small-image options that fit `{ id; text?; imageUrl? }`. Option-layout choice is **data-driven, not body-kind-driven**: if `options.every(o => !o.imageUrl)`, render as a vertical radio list; otherwise render as a horizontal row of image cards with letter labels.

### 1.4 Image storage on S3 with proxied, signed URLs

**Question.** Where do item images live, and how are they served?

**Options.**
1. Vercel Blob.
2. AWS S3 via the IaC's existing OIDC federation.
3. Filesystem committed to `public/items/`.

**Chosen.** Option 2 — AWS S3.

**Rationale.** OIDC federation for RDS already exists; adding an S3 bucket to the IaC is incremental, not new. Keys live as `items/<item_id>/<filename>`. The bucket is **never public-read** — CCAT screenshots include proctored material; public-read leaks the bank. Images are served via a Next.js route handler at `/api/items/[itemId]/image/[key]` which (a) auth-checks the request, (b) signs an S3 URL with a short (5-minute) TTL, (c) fetches and streams the bytes back through Vercel's edge cache. Response sets `Cache-Control: private, max-age=86400, immutable` — `private` because the route URL embeds the auth check; `immutable` because items are keyed by id and never change.

### 1.5 Image keys are validated against the body's referenced set

**Question.** How does the route handler know whether a requested key is legitimate?

**Options.**
1. Regex check on the key only.
2. Regex + verify the key is referenced by the item's body.

**Chosen.** Option 2 — regex plus body-set membership check.

**Rationale.** Without the body-set check, the keyspace is per-bucket; an attacker who knows an item id could enumerate keys looking for debug uploads or admin-only assets in the same S3 path. Keyspace-per-item is what we actually want. The Zod body schema enforces `z.string().regex(/^[a-z0-9-]+\.(png|jpg|webp)$/)` on every key field as defense-in-depth at the data boundary; the route handler's regex is the second line.

### 1.6 Image MIME types: PNG, JPEG, WebP

**Question.** Which formats does ingest accept?

**Options.**
1. PNG, JPEG, WebP.
2. Convert all uploads to WebP at ingest.
3. PNG only.

**Chosen.** Option 1 — three formats.

**Rationale.** Covers screenshot real-items (PNG-source), photo/3D-render images (JPEG/WebP), and modern compression. Server validates content type via file magic bytes, not extension. No re-encoding at ingest — original fidelity preserved.

### 1.7 Visual duplicates and column matching get their own body kinds

**Question.** Do `visual_duplicates` and `column_matching` fit existing body kinds, or need their own?

**Chosen.** New body kinds:
- `image_pair_grid` for visual duplicates: `{ kind: 'image_pair_grid', text, rows: { leftKey, rightKey }[] }`.
- `column_matching` for column matching: `{ kind: 'column_matching', text, rows: { left: string; right: string }[] }` with `rows.min(3).max(15)`.

**Rationale.** The CCAT visual-duplicates format is "how many of N pairs are duplicates?" — multiple stacked pairs, not one. Column-matching has rendering rules that genuinely differ from a generic table (monospace font for digit visibility, equal column widths, no header row, tight row spacing for laddering). A generic `table` kind with config flags would accumulate so many overrides it'd effectively be a separate kind anyway.

### 1.8 Per-(sub_type, difficulty) bank targets

**Question.** What's the target bank depth per cell of the 18 × 4 grid, and how does an admin know it's time to top up?

**Chosen.** Per-cell target stored in `src/config/sub-types.ts`. Default 50; `abstract.*` and `attention_to_detail.visual_duplicates` target 30 (real-only seed bank). Admin `/generate` page renders the 18 × 4 grid; each cell shows three numbers: **live / candidate / target**. A "generate to target" button per cell enqueues N item-generation workflow invocations. Confirmation dialog when count ≥ 10 names the cell, count, and estimated cost.

**Rationale.** v1 wants bank management to be visible — silent automation is a v2 feature. The three-number breakdown is load-bearing because `25 live + 13 candidate vs 50 target` is operationally different from `50 live + 0 candidate vs 50 target`: the first means "wait or generate more"; the second means "all confirmed working."

### 1.9 Item recency floor of 7 wall-clock days

**Question.** How does the system avoid re-serving the same item back-to-back?

**Options.**
1. Recency floor measured in **sessions**.
2. Recency floor measured in **wall-clock days**.

**Chosen.** Option 2 — 7 wall-clock days.

**Rationale.** Sessions-as-unit produces wildly different actual recency for users with different practice intensities, which is the wrong behavior. 7 days aligns with the SR ladder's first cadence (1 / 3 / 7 / 21). The floor softens rather than hard-blocks: try `eligible-and-not-served-in-7-days` first; fall back to `eligible-and-not-served-this-session`; final fallback is any eligible item ordered by oldest-served-first. `getNextItem` always returns something rather than throwing "out of items" mid-drill.

### 1.10 Recency excluded set materialized on the session row

**Question.** Where does the per-session recency-excluded set live so `getNextItem` can filter against it?

**Options.**
1. In-memory per-session map (rejected — Vercel serverless drops it across invocations).
2. Materialized on a `practice_sessions.recency_excluded_item_ids: uuid[]` column at session start.
3. Live subquery on every `getNextItem` call.

**Chosen.** Option 2 — `recency_excluded_item_ids: uuid[]` (Postgres array) on `practice_sessions`, populated at `startSession` time.

**Rationale.** The session row is already loaded for other reasons; filtering via `NOT (items.id = ANY(session.recency_excluded_item_ids))` costs nothing extra. The 7-day window is captured at session start; items served just before the session begins remain eligible mid-session, which is acceptable. GIN index on the array column is added defensively for heavy users. The query at session start uses the existing `uuidv7LowerBound(now - 7d)` helper.

### 1.11 Bank-empty fallback chains

**Question.** When a brutal drill exhausts brutal items, what should happen?

**Chosen.**
- **Brutal drills**: fallback chain is `brutal → hard → end`. Falling further (to medium) defeats the brutal mode's purpose. End-early surfaces a user-positive message: "All brutal items mastered for this set — continuing at hard."
- **Standard drills**: full fallback ladder. Falling back fires a peripheral note framed as user achievement: "All hard items mastered for this set — continuing at medium."

**Rationale.** End-early in a brutal drill is the one place where ending a session early is the right behavior, because the alternative (medium items in a brutal drill) is worse than no drill. The achievement-framing of the peripheral note (rather than system-error language) is structurally accurate — the user has by definition seen every higher-tier item available.

### 1.12 Attempts row records served tier and fallback level

**Question.** When fallback fires, the user encountered an item at a lower tier than the engine intended. How is this captured?

**Chosen.** Two columns on `attempts` plus a metadata field:
- `served_at_tier` (`pgEnum item_difficulty`, notNull) — what the engine intended.
- `fallback_from_tier` (`pgEnum item_difficulty`, nullable) — populated only on tier degradation.
- `fallback_level` in `metadata_json`: `'fresh' | 'session-soft' | 'recency-soft' | 'tier-degraded'`.

**Rationale.** Adaptive difficulty computes from `served_at_tier`, not from `items.difficulty`, because it must base the next step on what the user actually experienced. `fallback_from_tier` is for post-session review and bank-tuning analysis. The four `fallback_level` values let us distinguish between recency-only fallbacks (still fresh tier-wise) and tier degradation, both of which the system needs to reason about separately.

---

## 2. Mastery, adaptive difficulty, and selection strategy

### 2.1 Diagnostic mastery uses different rules from ongoing mastery

**Question.** With ~3 attempts per sub-type from a 50-question diagnostic, the standard `<5 attempts → learning` rule produces a screen of all-`learning` icons, which strips the diagnostic of its UI signal.

**Chosen.** `computeMastery({ source: 'diagnostic' | 'ongoing' })` parameterized by `minAttempts`, `latencyMultiplier`, and `allowMastered`:

| source | minAttempts | latencyMultiplier | allowMastered |
|---|---|---|---|
| `diagnostic` | 3 | 1.5 | false |
| `ongoing` | 5 | 1.0 | true |

**Rationale.** 3 attempts (matching the diagnostic's actual ~3.57-per-sub-type sample) is the lowest defensible threshold. `allowMastered: false` prevents three correct attempts at unknown latencies from inflating to "mastered" — `mastered` must be earned through ongoing practice or the icon loses its meaning. The 1.5× latency relaxation absorbs first-time-interface unfamiliarity that would otherwise be confused with skill gaps.

### 2.2 Diagnostic is untimed at the session level

**Question.** Should the diagnostic mirror the real CCAT's 15-minute cap?

**Options.**
1. Untimed at the session level; per-question 18s target visible.
2. 15-minute session timer.
3. 25-minute soft cap.

**Chosen.** Option 1 — untimed.

**Rationale.** The diagnostic measures **capacity**. Two refinements:
- The pace track is hidden for `sessionType: 'diagnostic'` because there's no session budget to compare against.
- A one-time, non-blocking peripheral note appears at the 15-minute mark: "you're at the real-test time limit; keep going to finish the calibration." Note duration is 15s, then auto-dismisses. The substantive feedback on overrun lives in the post-session review.

### 2.3 Diagnostic composition is a hand-tuned 50-row config

**Question.** What's the deterministic mix of (sub_type, difficulty) the diagnostic samples?

**Options.**
1. Algorithmic round-robin with rules.
2. Largest-remainder weighted rounding.
3. Hand-tuned 50-row config in `src/config/diagnostic-mix.ts`.

**Chosen.** Option 3 — hand-tuned config.

**Rationale.** The diagnostic is calibration-critical and the desired mix isn't a function of any inputs — it's a curated choice — so a small data file is more honest than an algorithm. **Brutal-tier items don't appear** (nobody can be in a "ready for brutal" state during calibration; brutal items just produce a 0%-accuracy band that contaminates mastery computation). **Numerical sub-types are over-weighted** because the section is the most heterogeneous (7 distinct skills, each with its own latency profile). Distribution: 5 verbal × 3 = 15; 7 numerical × 4 = 28; 4 abstract × 1 = 4; column_matching × 2 + visual_duplicates × 1 = 3. Total 50.

### 2.4 Adaptive difficulty fires only in drills

**Question.** Where does adaptive difficulty apply: drills only, every session, or somewhere in between?

**Chosen.** Adaptive **only in drills**. Diagnostic, full-length test, simulation, and review use fixed-tier curves or queue-driven selection.

**Rationale.** Diagnostic uses a fixed mix because adaptive partway through contaminates the calibration signal for later sub-types based on first cross-sub-type attempts. Full-length and simulation use a fixed-progression curve because they're meant to mirror the real CCAT (which is non-adaptive at the user level). Review serves whatever's queued. Implementation: a `selectionStrategy: 'adaptive' | 'fixed_curve' | 'review_queue'` field per session-type config; `getNextItem` dispatches on it.

### 2.5 Initial difficulty tier is mastery-derived

**Question.** Where does the starting difficulty tier come from before adaptive's 10-attempt window fills?

**Chosen.** Mapping from `mastery_state` (with a `was_mastered` flag refinement):

| mastery state | starting tier (true new learner) | starting tier (was_mastered = true) |
|---|---|---|
| `learning` | `easy` | `medium` |
| `fluent` | `medium` | `medium` |
| `mastered` | `hard` | `hard` |
| `decayed` | `medium` | `medium` |

Speed-ramp drills shift the tier down by one (`mastered → medium`, `fluent → easy`, `learning → easy`). Brutal drills override to `brutal` regardless. New users (no mastery row): `medium`.

**Rationale.** The `was_mastered` flag distinguishes users who were once mastered but have re-entered `learning` from true new learners — both currently land on `learning` but they need different starting tiers. Once true, never reset. Set the first time `current_state` becomes `mastered` OR `decayed`.

### 2.6 Mastery recompute is scoped to sub-types touched in the session

**Question.** Which sub-types get recomputed when a session ends?

**Chosen.** Only sub-types touched in this session, computed via `SELECT DISTINCT i.sub_type_id FROM attempts a JOIN items i ON a.item_id = i.id WHERE a.session_id = $1`. Loop is sequential, not parallelized. The workflow takes the session type as input so it knows whether to use diagnostic-source or ongoing-source rules.

**Rationale.** Recomputing untouched sub-types is provably wasted work. Sequential is the right tradeoff: with at most 18 sub-types in a full-length test (1–3 in a typical drill), parallelization saves a few hundred milliseconds at the cost of partial-failure complexity. The workflow runs async after `endSession` returns, so the user isn't waiting.

### 2.7 Adaptive state is recomputed per `getNextItem` call

**Question.** Where does adaptive's "next tier" state live across `submitAttempt` invocations on a serverless platform?

**Options.**
1. Recompute from `attempts` on every `getNextItem`.
2. Persist `current_tier` in a `practice_sessions.adaptive_state_json` column.
3. Persist a per-attempt `served_difficulty` column and recompute from that.

**Chosen.** Option 1 — recompute every call. The `served_difficulty` column from option 3 is added independently for fallback tracking (decision 1.12). The recompute query filters by `served_at_tier`, not by `items.difficulty`, so adaptive bases its step on what the user actually experienced.

**Rationale.** The adaptive signal is derivable from `attempts`. Persisting it is over-engineering: write amplification on every `submitAttempt` costs more than the recompute query saves. One indexed query per `getNextItem` is acceptable.

---

## 3. Focus shell and timers

### 3.1 Question timer never auto-submits

**Question.** When the per-question timer hits zero, does the question auto-submit?

**Chosen.** **No auto-submit.** The session timer is the only hard cutoff.

**Rationale (historical — original triage-pedagogy framing retired 2026-05-10).** The CCAT has exactly one timer (15 min session-level); per-question pacing is a self-coaching skill, not a system rule. The original justification (preserving triage-score meaning) no longer applies post-triage retirement; the no-auto-submit decision is preserved on the simpler ground that the per-question target is a pacing reference, not a deadline. In code, the per-question 18s target continues to drive the timer-bar color change and warning sound at zero-remaining; submission still requires explicit user action.

### 3.2 Triage shortcut — REMOVED 2026-05-10 (historical only)

> **Removed 2026-05-10.** The `T` keyboard shortcut and the triage prompt it dismissed are gone. Section number preserved as a gap.

### 3.3 Triage score denominator — REMOVED 2026-05-10 (historical only)

> **Removed 2026-05-10.** The triage adherence percentage, its denominator semantics, the small-sample / N/A branches, and the rolling 30-day Mastery Map aggregate are all gone. Section number preserved as a gap.

### 3.4 Difficulty progression curve is hand-tuned per decile

**Question.** Full-length and simulation need a per-question difficulty distribution that mirrors the real CCAT's "harder later." What curve?

**Chosen.** Per-decile config in `src/config/difficulty-curves.ts`:

| decile | easy | medium | hard | brutal |
|---|---|---|---|---|
| 1 | 70% | 25% | 5% | 0% |
| 2 | 35% | 45% | 20% | 0% |
| 3 | 15% | 40% | 35% | 10% |
| 4 | 5% | 25% | 45% | 25% |
| 5 | 0% | 15% | 40% | 45% |

Largest-remainder rounding within each 10-item decile, ties broken by lower-tier preference (so `7.0 easy + 2.5 medium + 0.5 hard` rounds to `7 + 3 + 0`, not `7 + 2 + 1`). Same curve assigned to both `full_length` and `simulation` keys today; structured to allow future divergence by changing one assignment.

**Rationale.** Same logic as the diagnostic-mix decision: the distribution isn't a function of inputs, so a flat data file is more honest than an algorithm. Full-length and simulation will likely diverge once observational data accumulates; the structure prepares for that.

### 3.5 Latency thresholds are banded into three tiers

**Question.** What's the per-sub-type latency threshold?

**Chosen.** Three bands per cognitive operation type:

- **12s (recognition):** `verbal.synonyms`, `verbal.antonyms`, `attention_to_detail.column_matching`, `numerical.number_series`, `numerical.letter_series`.
- **15s (quick structured reasoning):** `verbal.analogies`, `verbal.sentence_completion`, `numerical.fractions`, `numerical.percentages`, `numerical.averages_ratios`, `numerical.word_problems`, `attention_to_detail.visual_duplicates`.
- **18s (sustained multi-constraint reasoning):** `verbal.logic`, `numerical.data_interpretation`, `abstract.shape_series`, `abstract.matrix`, `abstract.next_in_series`, `abstract.odd_one_out`.

**Rationale.** Number/letter series are pattern-recognition once the user spots the rule (per CCAT-categories.md "test differences first"); 18s sets the mastery bar too low. `odd_one_out` requires identifying a shared property across most options — a small visual-search problem that benefits from time. The mapping reflects three different cognitive operation classes, not arbitrary numbers.

### 3.6 Pace track is hidden for the diagnostic

**Question.** What does the pace track do during a diagnostic, which has no session budget?

**Chosen.** Hidden entirely. The session timer bar is also hidden; only the per-question timer (if user has it on) remains. Hiding is per-session-type config, not a runtime degenerate-value path.

**Rationale.** The pace track's job is "blocks remaining vs time remaining"; without a session budget there's nothing to compare. Rendering it with degenerate values would be UI lying.

### 3.7 Timer prefs persist immediately, not via revalidatePath

**Question.** What's the cadence of writing `users.timer_prefs_json` when the user toggles a timer?

**Chosen.** Immediate fire-and-forget server action on every toggle. Local UI state flips synchronously on click before the server action even dispatches; the user's interaction never depends on network state. The server action does **not** call `revalidatePath` — this is a deliberate exception to the standard mutation pattern.

**Rationale.** Timer toggles are sparse, so debouncing solves a non-problem. Skipping `revalidatePath` is load-bearing: the timer-prefs write doesn't affect any rendered page (the focus shell reads `timer_prefs_json` on session start), so revalidating `/` would invalidate the Mastery Map cache for no reason. This is one of the few places where the linter convention pushes the wrong direction.

---

## 4. Sessions, abandons, and scheduling

### 4.1 Session abandons via `sendBeacon` heartbeats + cron sweep

**Question.** A user closes the tab during a drill or test. What happens to the partial session?

**Chosen.** Heartbeat-and-sweep:
- Client posts a heartbeat every **30s** during a session via `navigator.sendBeacon` (not `fetch` — `setInterval` gets throttled by tab-backgrounding and would falsely abandon when the user switches tabs).
- Client also fires a `sendBeacon` "I'm leaving" signal on the `pagehide` event for clean tab close.
- A cron-driven sweep runs every minute (`* * * * *`), finds sessions with `last_heartbeat_ms < now - 120000` and `ended_at_ms IS NULL`, sets `ended_at_ms = last_heartbeat_ms + 30000`, sets `completion_reason = 'abandoned'`, and triggers `masteryRecomputeWorkflow`.
- Submitted attempts count toward mastery; missing items don't.

**Rationale.** 30s heartbeat resolution / 120s staleness threshold tolerates network blips without false-abandonment; 5s/60s buys nothing. The sweep query is idempotent (`WHERE ... AND ended_at_ms IS NULL`), so duplicate cron runs are no-ops. The mastery-recompute workflow's idempotency is already a requirement from earlier decisions.

### 4.2 Vercel Cron Jobs is the v1 scheduler

**Question.** What's the trigger mechanism for periodic workflows (abandon sweep, candidate promotion)?

**Options.**
1. Vercel Cron Jobs (vercel.json).
2. Self-perpetuating workflow with `'use step'` sleeps.
3. Client-side polling.

**Chosen.** Option 1 — Vercel Cron Jobs.

**Rationale.** Vercel Cron is the primitive built for scheduled tasks. `vercel.json` consolidates both v1 cron needs:
- `* * * * *` → `/api/cron/abandon-sweep`.
- `0 4 * * *` → `/api/cron/candidate-promotion`.

Authenticated by the Vercel `CRON_SECRET` header. Free-tier limits at minute granularity; finer resolution doesn't buy much.

### 4.3 Partial diagnostic abandons require a fresh attempt

**Question.** A user starts the diagnostic, answers 12, abandons. On next login?

**Chosen.** Treat as not-completed; redirect to `/diagnostic` for a fresh 50 items. The first-run gate is `completed AND completion_reason != 'abandoned'`. Abandoned attempts remain in the table (count toward future bank-recency tracking) but don't drive mastery.

**Rationale.** A 12-item partial sample produces a thin, biased mastery signal — the user missed entire sub-types. Re-running fresh respects the calibration's purpose; the sunk-cost framing isn't worth the wrong signal.

### 4.4 First-run detection lives in `(app)/layout.tsx`, queries completed sessions

**Question.** Where and how is "user has completed the diagnostic" checked?

**Chosen.** In `(app)/layout.tsx` (not `(app)/page.tsx`), the existence query:
```
SELECT 1 FROM practice_sessions
WHERE user_id = $1 AND type = 'diagnostic'
  AND ended_at_ms IS NOT NULL AND completion_reason != 'abandoned'
LIMIT 1
```
If absent, redirect to `/diagnostic`. Layout-level protection covers every route under `(app)`; page-level protection only covered `/`.

**Rationale.** Querying the canonical fact (a completed diagnostic session row) rather than a derived state (mastery_state) or a denormalized boolean avoids a race condition where the mastery-recompute workflow hasn't finished yet. Querying via `LIMIT 1` is a single indexed lookup.

### 4.5 Diagnostic can be retaken manually

**Question.** Can a user re-run the diagnostic?

**Chosen.** A "Retake diagnostic" link on the History tab. User-initiated only. Running it overwrites `mastery_state` rows for that user (capped per the `diagnostic` source rules; never grants `mastered`). Preserves attempts, sessions history, and `was_mastered` flags.

**Rationale.** Manual control gives stale users a path back to fresh calibration without surprising anyone with auto-redirects.

---

## 5. Auth, admin, and operations

### 5.1 Auth.js bigint adapter shim, with tests

**Question.** Does `@auth/drizzle-adapter` work directly against `bigint(_ms)` columns, or do we need a shim?

**Options.**
1. Custom shim wrapping the adapter, converting `Date ↔ ms` at the boundary.
2. Drizzle column-level transformer (per-column `Date ↔ ms`).
3. Fork the adapter package.

**Chosen.** Option 1 — custom shim at `src/auth/drizzle-adapter-shim.ts`.

**Rationale.** Column-level transformers (option 2) put Auth.js's type assumptions into the schema definitions; application code reading `users.email_verified_ms` directly would get `Date` objects and violate the codebase's `bigint` convention everywhere downstream. The shim isolates Auth.js's type assumptions to a single file (~50 lines). A small test file (~30 lines) covers round-trip conversions for each adapter method (`createSession`, `updateSession`, `createUser`, `getSessionAndUser`, `deleteSession`, `deleteUser`) including null-value cases.

### 5.2 Strategy library: 3 strategies per sub-type, by failure mode

**Question.** How many strategies per sub-type ship in v1?

**Chosen.** **3 strategies per sub-type, 54 total.** Each per-sub-type triplet differs in **kind**, not just wording: one **recognition tip**, one **technique tip**, one **trap-avoidance tip**. Each strategy is 1–2 sentences. Stored in `src/config/strategies.ts` as `Record<SubTypeId, { kind: 'recognition' | 'technique' | 'trap'; text: string }[]>`.

**Rationale.** Three is the threshold where the rotation logic actually does work — with one strategy the `strategy_views` table holds zero useful information; with two the rotation is just A-B-A; with three the variety is genuine across a typical prep cycle. Three rephrasings of the same insight wastes the rotation. The 30-second strategy-review gate is a pause where the user reads one tip; longer pedagogical context belongs in the Mastery Map's strategy library tab.

### 5.3 Validator output: structured 1–5 confidence per check, AND-of-checks pass

**Question.** Does the validator return binary pass/fail, or richer structured confidence?

**Chosen.** Validator returns a 1–5 confidence on each of four checks: correctness, ambiguity, difficulty match, novelty. Plus the embedding-derived nearest-neighbor cosine similarity. **Pass = all four scores ≥ 4 AND `nearest_neighbor_similarity < 0.92`.** Quality score = weighted sum (correctness 0.4, ambiguity 0.3, difficulty 0.2, novelty 0.1) for downstream sort/pick. `failure_reasons` captures **all four scores plus textual explanations**, not a filtered subset.

**Rationale.** The pass/fail gate should be the AND of independent checks, not an average — averaging treats four different yes/no questions as fungible signals. The 4/5 threshold lands on the right side of validator calibration (5/5 over-rejects; 3/5 under-rejects). The richer failure log makes regressions debuggable: `{ correctness: 5, ambiguity: 2, difficulty: 4, novelty: 5, reasons: { ambiguity: "prompt admits multiple defensible answers" } }` is far more useful than "ambiguity failed."

### 5.4 Generator pipeline drops per-option distractor scoring

**Question.** Does `scoreItem` keep the per-option distractor-distance computation (5 embedding calls per validate)?

**Chosen.** No — drop it. **Single embedding per item**, computed at insert time, used only for the uniqueness check.

**Rationale.** The cost is negligible (the entire 2,700-item bank is ~$0.014 in embedding fees); the reason to drop is that distractor distance is **redundant with the validator's ambiguity check**, which already answers the important question. The validator's structured 1–5 confidence per check (decision 5.3) replaces the missing quality signal at zero extra LLM cost.

### 5.5 Candidate promotion runs in shadow mode for 30 days

**Question.** When the candidate-promotion workflow lands, do its decisions enforce immediately?

**Chosen.** **Shadow mode** for the first 30 days: the cron workflow runs nightly, computes promote/retire decisions, writes them to a new `candidate_promotion_log` table, but does **not** flip `items.status`. After 30 days, hand-review the log; flip the workflow to enforcement mode only after that calibration. Bands ship **wide**, not tight (easy 60–98%, medium 40–85%, hard 25–70%, brutal 10–50%); overlapping is fine, latency is the tiebreaker. `retired` is a soft archive — the row stays, items are filtered from queries — so wrong retirements are recoverable with an `UPDATE`.

**Rationale.** v1 bands are uncalibrated guesses for the highest-stakes period of the bank's life. Tight bands retire correct items. Tighter bands are easy to apply later when data exists; reversing wrong retirements is harder.

### 5.6 NarrowingRamp obstacle algorithm — historical (NarrowingRamp cut from v1; reserved triage slot removed 2026-05-10)

> **NarrowingRamp protocol cut from v1 2026-05-04** per PRD §5.3. The component, the server-side `suggestObstacleOptions(userId)` helper, and the reserved triage slot are all unreachable in v1. The triage-specific portion is additionally retired 2026-05-10. The decision below is preserved as historical reference for the cut feature's design.

**Question.** How are the three obstacle options computed?

**Chosen (historical).** Slot 1 and 2: top 2 sub-types by composite weakness score `(1 - rolling_30d_accuracy) * (median_latency / threshold)`. Filter requires ≥ 5 attempts in the rolling 30-day window. Slot 3 originally reserved for a triage-related obstacle (since removed); the as-designed fallback was the third weakest sub-type. Each slot mapped to an **observable trigger → bounded action** template (Gollwitzer implementation-intentions form).

**Rationale (historical).** Templates with bounded actions ("If I see a matrix problem, I will skip it") are unactionable; observable trigger → bounded action templates are.

### 5.7 LLM cost telemetry via Pino logs + admin dashboard

**Question.** How is LLM spend monitored in v1?

**Chosen.** Every generator/validator call logs `{ tokens_in, tokens_out, model, cost_estimate_usd }` via Pino. The admin `/generate` page shows today's spend, this-week's spend, per-sub-type cost. Today's rate is compared against the trailing-7-day average for the same hour-of-day; a soft warning surfaces when today's rate exceeds 2× the trailing baseline (no auto-pause). Per-model unit pricing lives in `src/server/generation/pricing.ts` with a comment flagging "update when provider pricing changes."

**Rationale.** Comparison-against-baseline is what tells the admin something actionable. Cost data lives in logs (not a separate table) for v1; rejected generations consume tokens but don't produce `items` rows. If cost analysis becomes routine post-launch, add a `generation_attempts` table then. Don't add it speculatively.

### 5.8 Account deletion with hashed-id audit logs

**Question.** What's the v1 privacy posture?

**Chosen.** Indefinite retention by default. User-initiated "Delete account" wipes all user-scoped rows in a single transaction via `ON DELETE CASCADE` from `users.id`. `items` is shared content and **does not** cascade. The deletion server action logs the event with anonymized identifiers (hashed `user_id`, `deleted_at_ms`, `rows_affected` count) — no PII. `docs/privacy.md` documents this. No GDPR data export in v1 (out of scope per PRD §10).

**Rationale.** Privacy posture follows the PRD's pattern of cutting compliance features for v1: ship the minimum honest capability, document it, defer formal compliance to v2 if demand surfaces.

---

## 6. UX flows

### 6.1 Pre-session controls: dedicated configure page per drill

**Question.** Where do timer mode, drill length, and (any) pre-session toggles live?

**Chosen.** A dedicated `/drill/[subTypeId]` configure page that precedes the NarrowingRamp. Lists timer mode (`standard / speed-ramp / brutal`), drill length (`5 / 10 / 20`), and a "Start" button (or "Skip protocol" link to bypass NarrowingRamp). Defaults to the user's previous-session choice for that sub-type. The session-timer toggle does **not** belong on this page.

**Rationale.** The Mastery Map's visual restraint is load-bearing; adding 54 timer-mode buttons (3 modes × 18 sub-types) on the home screen breaks that register. Defaulting to last-time makes the common case one click. Timer toggles live in the focus shell's periphery only — toggling on the configure page implies per-session granularity, which is the wrong mental model.

### 6.2 Onboarding targets are captured at end of post-diagnostic review

**Question.** When does the user set target percentile and target date?

**Chosen.** Inline at the end of the post-diagnostic review screen, before the redirect to the Mastery Map. Two-question form: "Target percentile?" (top 50/30/20/10/5) + "Target date?" (date picker). The screen surfaces a percentile estimate first ("your diagnostic accuracy was 65% — average CCAT score is around 48%") so the user has a starting-point reference. Primary "Save and continue" button + smaller "Skip for now" text link.

**Rationale.** Post-diagnostic is the moment of maximum information-asymmetry reduction — the user has just calibrated against 50 real items and has a felt sense of the test's difficulty. Targets set at this moment are calibrated commitments; targets set before the diagnostic are uncalibrated guesses. Default-to-action gets high capture rates; equally-prominent options default to skip.

### 6.3 Strategy review pick is deterministic with explicit tiebreakers

**Question.** How does the strategy-review gate (full-length only) pick the strategy?

**Chosen.** Lowest accuracy in this session → highest median latency → lexicographic sub-type id. Within the chosen sub-type, pick **least-recently-viewed** strategy via a `strategy_views(user_id, strategy_id, viewed_at_ms)` append-only table.

**Rationale.** Determinism is load-bearing — randomness in user-facing recommendations corrodes trust in a mastery-based system. The accuracy → median latency → id tiebreak chain has a non-obvious property: `low-accuracy + high-latency` means "trying but stuck" (amenable to strategy intervention), while `low-accuracy + low-latency` means "guessing fast" (less amenable). Latency-as-second-tiebreaker naturally surfaces the user state where a strategy will help most.

### 6.4 Mastery Map icons: per-section shape + universal fill semantics

**Question.** What does the 18-icon Mastery Map look like?

**Chosen.** Per-section icon shape with all sub-types under a section sharing the icon shape, plus a small text label underneath each icon (always visible, not hover-only):
- verbal → `BookOpen`
- numerical → `Calculator` (NOT `Hash` — `Hash` reads as "hashtag" to most users)
- abstract → `Shapes`
- attention_to_detail → `ListChecks` (NOT `ScanEye` — too literal of the user's action rather than the content tested)

Fill semantics:
- `mastered` → filled solid
- `fluent` → half-filled (left half solid)
- `learning` → outlined only
- `not_attempted` → outlined + low-opacity
- `decayed` → filled + small `AlertCircle` overlay

**Rationale.** Icon should evoke the **content being tested**, not the cognitive action being taken. Tooltips fail on mobile and require multiple hover actions to scan the grid; a small label keeps the grid scannable without interaction. The grid's purpose — letting the user perceive their progress at a glance — depends on labels being visible by default.

### 6.5 First item server-rendered; subsequent items via server-action response

**Question.** Is the first question's HTML server-rendered or fetched after hydration?

**Chosen.** Server-rendered. `(app)/[type]/page.tsx` initiates fetches and passes promises (per the RSC patterns rule). The `<FocusShell>` client component consumes via `React.use()` and renders. First paint is the server-rendered HTML. Subsequent items come via the `submitAttempt` server action's return value. `Cache-Control: private, no-cache` on the page response so a user starting a new drill never sees the previous session's first item flash.

**Rationale.** Latency measurement anchors on the `<ItemSlot>` mount effect at first paint. With server-rendered HTML, "first paint" is "the moment the question is visible." With a skeleton + client-fetch, first paint is the skeleton; the question appears after a network round trip and the latency baseline becomes inflated by network time. Server-rendering keeps the latency measurement consistent across all 50 questions because the data flow is identical for every item. Image bytes load asynchronously via the route handler — latency anchors on the **text paint**, not the image paint, so visual sub-types aren't systematically penalized.

---

## 7. Deployment

### 7.1 Local Docker for week 1; Vercel + RDS late week 2

**Question.** Production-shape from day 1, or local-Docker first?

**Chosen.** Local Docker for week 1 (auth, schema, diagnostic, drill loop). Vercel + AWS RDS connected in late week 2 before the LLM generation work. **Preview deployment first**, not production — promote to production only at launch. Local Postgres uses `pgvector/pgvector:pg16` (the standard `postgres:16` image doesn't include pgvector); same major version, same extensions (`pgcrypto`, `pgvector`), same default collation as the IaC RDS spec.

**Rationale.** Schema iteration and infrastructure iteration are different activities that fight each other when combined. Week 1 is schema-iteration-heavy where Docker's fast feedback loop dominates; week 2's generation pipeline benefits from real-shape deployment because of S3, LLM keys, and the embedding pipeline. Preview-first reserves the production URL for actual launch rather than burning it on a "kinda-working MVP" stage. Pinning Docker to match RDS minimizes works-locally-fails-in-prod surprises that are otherwise easy to skip and produce subtle debugging waste.
