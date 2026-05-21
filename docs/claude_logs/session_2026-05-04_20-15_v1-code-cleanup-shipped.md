# Session Log: v1 cuts finalized in docs and excised from code

**Date:** 2026-05-04, 20:15 → 23:08
**Duration:** ~3 hours
**Focus:** Closed out the doc-only v1-scope-tightening round (commits 4 + 5 + hygiene), drafted the v1-code-cleanup plan, then shipped the full 5-commit cleanup round excising vestigial code.

## What Got Done

**Doc-only v1-scope-tightening round — closed (3 commits this session):**

- `4b35449` — PRD v1 cuts marked across §4.3 (SR queue), §4.4 (speed-ramp + brutal drill modes), §5.1 (timer-toggle UX), §5.3 (NarrowingRamp), §6.5 strategy-gate, §9 cuts-if-behind. §6.2 (Speed ramp drill mode) marked alongside §4.4 as a judgment call (same feature, two specced sections).
- `141bf83` — SPEC v1 cuts marked across §3.2 / §3.4 / §3.5 / §6.2 / §6.3 / §6.6 / §6.12 / §7.3 / §7.4 / §7.5 / §7.8 / §7.15 / §9.2 / §9.5 / §10.x + file-map cut paragraph. On-disk-code-surface notes per cut (vestigial-in-tree vs never-shipped).
- `832f634` — Round-close hygiene commit marking Category C residuals in PRD §7 / §8.1 / §9 build-order steps (six markers).

**v1-code-cleanup plan drafted + redlined:**

- `43228e3` — `docs/plans/phase5-v1-code-cleanup.md` drafted, 351 lines, sequencing-shaped per template `phase3-heartbeats-and-cron.md`.
- Three plan amendments through redline cycles: (1) §12.1 redline flipped `timer_mode` enum recommendation from "keep 3-valued" to "TRUNCATE to `['standard']`"; (2) §12.4 added — same Option-A truncation extended to `session_type` after audit confirmed 8 call sites split cleanly across commits 1 / 2 / 4; (3) §12.5 added recording the audit Outcome 1 + the renumber decision after commit 2 close.

**v1-code-cleanup round — shipped (5 commits this session):**

- `7bc96ea` — Commit 1: `selection.ts` (drop `ErrReviewQueueDeferred`, drop `'review_queue'` strategy + `'review'` session-type from union, drop dispatch + throwing branch, drop brutal/speed-ramp branches in `initialTierFor`, drop `TimerMode` export, drop `SessionContext.timerMode` field) + `start.ts` (narrow `TimerMode` to `'standard'`, drop `ifThenPlan` input, drop review-type branch at line 93, simplify `timerModeForRow` write logic, drop `narrowing_ramp_completed` + `if_then_plan` insert sites) + `queries.ts` (narrow `SessionType`) + `actions.ts` (narrow zod schemas).
- `a32131a` — Commit 2: focus-shell internals — `shell-reducer.ts` (drop `timerPrefs` state + 2 toggle action kinds + 2 reducer fns + dispatch lines), `types.ts` (drop `TimerPrefs` interface + `initialTimerPrefs` + `ifThenPlan` props + `'review'` from `SessionType`), `focus-shell.tsx` (replace `state.timerPrefs.*` reads with static-per-session-type computation, drop `ifThenPlan` pass-through), `triage-prompt.tsx` (drop `ifThenPlan` prop + branch). Caller updates: `diagnostic/run/content.tsx`, `drill/[subTypeId]/run/content.tsx`, `phase3-smoke/page.tsx`.
- `938f771` — Commit 3: bundled plan amendment (renumber from 6 to 5 commits per Outcome 1) + schema column drops via Drizzle migration `0001_true_young_avengers.sql` (DROP `users.timer_prefs_json`, DROP `practice_sessions.{narrowing_ramp_completed, if_then_plan, strategy_review_viewed}`, TRUNCATE `timer_mode` enum 3→1, TRUNCATE `session_type` enum 5→4 — both via rename-swap pattern).
- `37ad762` — Commit 4: schema table drops via Drizzle migration `0002_tranquil_mach_iv.sql` (DROP TABLE `review_queue` CASCADE, DROP TABLE `strategy_views` CASCADE) + barrel cleanup (`src/db/schema.ts`) + schema file deletions + `src/db/schemas/review/` directory removal.
- `74b522c` — Commit 5: SPEC + PRD past-tense reconciliation + plan close (status banner flipped to shipped with all 5 hashes + round-close summary) + adjacent comment cleanups (drill page Phase-5 comment + `deterministic-uuid.ts` strategy_views example) + SPEC §6.14.17 added capturing the doc-only-cut-from-v1 reconciliation pattern + the §6.12 inversion correction.

**Database migrations applied to dev DB:**

- `0001_true_young_avengers.sql` — column drops + enum rename-swaps. Verified non-fresh DB cast safety (every existing row had v2-valid values).
- `0002_tranquil_mach_iv.sql` — table drops with CASCADE. Verified zero FK consumers TO either table before applying.

## Issues & Troubleshooting

- **Problem:** Linter (`no-inline-ternary`) flagged `const timerModeForRow: TimerMode | null = input.type === "drill" ? "standard" : null` in `start.ts` despite the rule explicitly allowing `const x = a ? b : c`.
  - **Cause:** The lint rule's AST parser appeared to misparse the type annotation's colon as part of the ternary, or a similar parser gap.
  - **Fix:** Restructured to an explicit `let` + `if` block. Same semantics, cleaner under the linter.

- **Problem:** Typecheck error in `queries.ts` after narrowing `SessionType` to drop `'review'` — `return row` failed because TypeScript narrows `row.type` at the guard but doesn't narrow the whole `row` object.
  - **Cause:** Discriminated narrowing only applies to the discriminator property, not the parent object.
  - **Fix:** Constructed an explicit return object instead of `return row`, using the post-narrowing `rowType` constant.

- **Problem:** Typecheck errors `TS2367: This comparison appears to be unintentional` at the runtime guards in `selection.ts:135` and `queries.ts:55` after commit 3's schema enum truncation.
  - **Cause:** Commit 1 added defensive guards (`if (row.type === "review") throw ...`) to defend against the unwritten-but-still-in-enum value. Commit 3 truncated the schema enum so `'review'` is gone from the schema-derived type; comparison is now unreachable.
  - **Fix:** Dropped both guards. The defensive intent was satisfied by the truncation itself. (This was an "unreachable code becomes typecheck failure" case — distinct from "while we're in here, here's another small thing." User flagged the discipline-line afterward as a process note for commits 4 + 5.)

- **Problem:** Linter (`no-unnecessary-condition`) flagged `questionTimerNode !== null` check in `focus-shell.tsx:465` after commit 2 made the node unconditional.
  - **Cause:** `questionTimerNode` was previously conditionally assigned; now always assigned a non-null `Element`. The null check became dead.
  - **Fix:** Dropped the check; just render `<div className="mt-2">{questionTimerNode}</div>` directly.

- **Problem:** Drizzle Kit's auto-generator emitted a text-bounce pattern (`ALTER COLUMN TYPE text → DROP TYPE → CREATE TYPE → ALTER COLUMN TYPE enum`) for the enum truncations in commit 3, instead of the rename-swap pattern the plan §5 specified.
  - **Cause:** Drizzle Kit's standard pattern for enum value removal is text-bounce.
  - **Fix:** Hand-wrote the migration in the rename-swap shape per the user directive. Both patterns are functionally equivalent, but rename-swap keeps the v2-type-then-rename intent visible in the SQL without leaving the column in a transient text-typed state.

- **Problem:** SPEC §6.12 marker (added in the doc-only round) said "all focus-shell audio is silent in v1" — but Phase 3 shipped with `questionTimerVisible: true` as the default, so audio was on by default.
  - **Cause:** The doc-only round's cut marker was a forward-projection of post-cut behavior that inverted relative to shipped reality. Audio was gated on `questionTimerVisible`, and the marker projected that flag as static-`false` in v1 — but the actual default was `true`.
  - **Fix:** Commit 2 corrected the SPEC §6.12 prose alongside removing the `questionTimerVisible` gate (audio always on once unlocked). Commit 5 added §6.14.17 generalizing the inversion-correction pattern.

- **Problem:** Doc-only-round file-map cut paragraph said `strategy_views` was "never shipped" — but the actual on-disk path was `src/db/schemas/ops/strategy-views.ts` (which WAS shipped during Phase 3); the doc-only round's "never shipped" claim referenced the SPEC's planned path `src/db/schemas/practice/strategy_views.ts` (which never existed).
  - **Cause:** Path-naming discrepancy between SPEC's planned location and the actual on-disk location.
  - **Fix:** Commit 4 corrected the SPEC §3.4 marker + the file-map cut paragraph to record the on-disk-path correction inline. Table dropped via DROP TABLE migration alongside `review_queue`.

## Decisions Made

- **timer_mode enum: TRUNCATE to `['standard']`** (not "keep, vestigial"). Original plan-draft recommended keep; user redlined to truncate per the codebase-cleanliness-compounds principle (§12.1 of the plan). Postgres-can't-drop-enum-values is true but v2 reintroduction cost is trivial; permanent schema-vs-application drift is the worse failure mode.

- **session_type enum: TRUNCATE to four values (drop `'review'`)** parallel to timer_mode. Decision pinned in plan §12.4 after audit confirmed 8 call sites split cleanly across commits 1 / 2 / 3 (commit 3 absorbing the schema rename-swap). Option B's "higher-altitude session_type" framing considered and rejected on the grounds that the structural-importance argument doesn't change the mechanics.

- **start.ts:93 review-type branch: INCLUDE in commit 1.** Audit-finding-beyond-prompt-scope; surfaced in plan §12.2 and confirmed in scope. Audit-first opening exists exactly to catch these.

- **PRD §4.2 borderline residual: LEAVE AS-IS.** Same reasoning as architecture-plan body-text drift seeds in the doc-only round (Option 5): PRD §4.2 describes durable product shape; SR is cut-from-v1, not cut-permanent; tightening would be compounding-amendments creep.

- **Outcome 1 (Empty) for original commit 3 application-layer slot.** Audit at commit-2-close confirmed commits 1 + 2 rippled cleanly. Round renumbered from 6 to 5 commits atomically with commit 3's migration work. Heading-numbering gap §7 → §9 preserved per strict redline scope.

- **timer_mode column kept (nullable, always `'standard'` for drill or NULL).** Plan §12.1 resolution. Dropping the column entirely would require backfill in a v2 reintroduction; keeping it nullable preserves additive-only v2 migration shape.

- **Question-timer ALWAYS-ON in v1.** Preserves Phase 3 visual language (`<FocusShell>` callers all passed `questionTimerVisible: true`). Doc-only round's §6.6 cut marker had said "question timer OFF everywhere" — that was the inversion (see §6.14.17). Commit 2 removed the toggle mechanism + corrected §6.12; the visual stays exactly as Phase 3 shipped.

- **Migration shape: hand-written rename-swap over Drizzle's auto-emitted text-bounce.** Per the user directive in commit 3's prompt. Functional equivalence; the rename-swap keeps v2-type-then-rename intent visible in the SQL.

- **Adjacent comment cleanups deferred to commit 5.** Two findings surfaced during commits 3+4 audits (drill page Phase-5 forward reference, deterministic-uuid strategy_views example). Both surfaced rather than bundled silently per the process-note discipline established after commit 3.

- **Plan amendment + commit 3 migration bundled into one commit (`938f771`).** User offered discretion ("your call on what fits cleanest"); chose bundle to keep round at 5 commits and avoid an amendment-only commit that would re-inflate the count.

## Current State

- **All 5 v1-code-cleanup commits landed on `main`.** Tests 37/37 throughout. Lint + typecheck clean.
- **Plan status:** flipped to "shipped 2026-05-04" with all 5 hashes + a round-close summary paragraph.
- **Source code is v1-clean:**
  - `selection.ts` carries no vestigial throwing stubs or dead `timer_mode` branches.
  - Focus shell's reducer state shape matches its v1 visual contract (no `timerPrefs`, no toggle actions).
  - No `ifThenPlan` prop chain anywhere in tree.
  - Database schema reflects only what v1 writes: no `timer_prefs_json` / `narrowing_ramp_completed` / `if_then_plan` / `strategy_review_viewed` columns; no `review_queue` or `strategy_views` tables; `timer_mode` enum truncated to `['standard']`; `session_type` enum truncated to four values.
  - Schema barrel cleaned up (two imports + spread registrations removed); `src/db/schemas/review/` directory removed.
- **Database migrations applied to dev DB:** `0001_true_young_avengers.sql` (column drops + enum truncations) and `0002_tranquil_mach_iv.sql` (table drops). Both verified end-to-end with explicit value-set checks + insert happy/negative-path tests.
- **PRD + SPEC reconciled:** All cut-from-v1 markers in past-tense for surfaces dropped this round. Three remaining "future cleanup" hits are out-of-scope (the `diagnostic_overtime_note_shown_at_ms` vestigial column from a prior polish round, queued for separate future cleanup) or referential pattern-language inside §6.14.17 itself.
- **SPEC §6.14.17 captures the convention:** Two failure modes documented (vestigial-state projection — low-risk, falsifiable; behavior projection — higher-risk, can invert). Convention going forward: cut markers should describe what the cut authorizes (the deletion), not project what the post-cut state will be.
- **Adjacent comment cleanups landed in commit 5:** drill page comment now references the cleanup commit hash; `deterministic-uuid.ts` header example updated to a still-shipped use case (`items.strategy_id` references stable strategy ids).

## Next Steps

1. **Phase 5 sub-phase 1 planning** — post-session review surface (PRD §6.5 minus the strategy gate). Per `phase5-master-plan.md`, this is the next round. Sub-phase 1 plan is drafted at sub-phase open against then-current state, the way Phase 3's four sub-phase plans were.
2. **Phase 5 sub-phase 2** — adaptive walker (closes the `ErrAdaptiveDeferred` placeholder in `selection.ts`). Foundation for sub-phase 5's belt indicator.
3. **Future cleanup candidates (not blocking Phase 5):**
   - `practice_sessions.diagnostic_overtime_note_shown_at_ms` vestigial column (separate from this round's scope, queued).
   - `session_type` enum's `'review'` value re-truncation symmetry — wait, this was done in commit 3. (Already clean.)
   - The `phase3-smoke/page.tsx` `?qt=` query-string flag was removed in commit 2; if a similar debug surface is wanted post-cleanup, that's a Phase 5 decision.
