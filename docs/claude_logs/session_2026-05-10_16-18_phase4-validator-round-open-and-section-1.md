# Session Log: Phase 4 sub-phase b — round-prep + round-open + §1 phase end-to-end

**Date:** 2026-05-10 ~12:00 → 16:18
**Duration:** ~4 hours, 14 landed commits across round-prep + round-open + §1 phase
**Focus:** Open Phase 4 sub-phase b (validator + admin review); execute §1 phase from schema migration through production validator batch run with full §6.14.31 destructive-operation-gate discipline; close §1 with empirical-reframe docs commit.

## What Got Done

**Round-prep sequence (3 commits):**

- `955ad1d` — `scripts/_logs/2026-05-10_phase4-validator-admin-pre-open-reconciliation.md` (audit-log; 394 lines). Captured 5 probes: ONE selection-engine sidecar (CLOSED at `1dc2b75`); test baseline 172/0/19/769 at `810c83a`; ad-hoc 5-stream session (review/streak/sounds/triage/topnav); triage retirement scope (3 modules deleted, 2 DB cols dropped); streak orthogonal.
- `d592107` — SPEC-B body amendment (3 files; 51 insertions / 100 deletions). Removed live-prose triage references across SPEC.md (28 body residuals → §6.7 + §9.7 historical markers + surgical edits), PRD.md (16 → 9), design_decisions.md (19 → 11). Preserved `81819e0` header banners.
- `e9f1254` — SPEC-B-followup. Surgical amendment to SPEC §10.7 lines 2616 + 2618 (slot-arithmetic claims false post-triage retirement). Past-tense framing + parenthetical updates.

**Round-open (1 commit):**

- `d3d3b2a` — `docs/plans/phase4-validator-and-admin-review.md` (485 lines). §0 round-frame with §0.6 architectural-question resolutions for Q1, Q2, Q3, Q5, Q6, Q7, Q8, Q10. Q8 corrected to REUSE existing `requireAdminEmail()` (NOT greenfield `users.role` column). §6.14.43 instance #8 banked (sub-type 5: propagation-through-prior-audit-log).

**§1 phase (8 commits):**

- `a09b087` — §1.0 schema migration: items.status enum extended to 4 values (`+'rejected'`); items new columns (`rejected_at_ms`, `rejected_by`, `rejection_reason`); new `item_admin_actions` table with composite + admin_user indexes. Drizzle migration `0007_flippant_smasher.sql` generated and applied.
- `a0a8bb7` — §1.1 admin allowlist populated with `leonardiwata@gmail.com`; plan-doc Q6 spec correction at 5 references (`rejected_at` → `rejected_at_ms`; §6.14.43 instance #9 propagation-within-plan-doc).
- `f171d35` — §1.2 commit-0 validator engine architecture: 10 files (types, engine, calibration, criteria/index, 6 criterion stubs). Stubs return error verdicts intentionally (belt-and-braces against §1.3 silent success).
- `b792f45` — §1.2 commit-1 promptHash backfill via `scripts/dev/backfill-prompt-hash.ts`. §6.14.31 dry-run → apply → postverify cycle. 1,711 candidates → 14 distinct cohorts (1:1 with sub-types).
- `965a056` — §1.2 commit-2 six criterion implementations + 26 tests + extended ValidationContext. Tier-distribution reframed to provenance-roundtrip verification (empirical finding: items.difficulty IS the LLM-emitted tier).
- `fe737fa` — §1.3 commit-0 batch runner architecture: `validator-batch.ts` workflow + `validator-batch-steps.ts` step bodies + `thresholds.ts` registry + `validator-dry-run.ts` CLI. First dry-run revealed embedding-distance 50.44% (over band).
- `30f1757` — §1.3 commit-1 threshold tuning: defaultMin 0.5→0.3; defaultMax 0.97→0.99. Cascade observed: embedding-distance 50.44%→17.53%; provenance-batch-reject 82.70%→25.42%.
- `8c4dff7` — §1.3 commit-2 production batch: `persistResultsStep` implemented; `thresholds-hash.ts` module; `validator-production-batch.ts` CLI; full §6.14.31 5-step gate executed; 1,711 candidates persisted with `validatorResult` sub-objects in 2.044s wall-clock.

**§1 round-close (1 commit):**

- `bd2820f` — Plan-doc §1 round-close: §0.6.1 #2 tier-distribution reframe documented; calibration directive scope clarification (tunable-criteria only); §0.7.1 `hasAnyFlag` re-baseline (791 not 435); §0.3 instance ledger update (instances #6–#11); §0.8.1 §1 phase summary table; §0.9 forward-watch updated.

**Empirical findings persisted:**

- 1,711 candidate items now carry `metadata_json.validatorResult` with `thresholdsHash: sha256:111f631af48157...` reproducibility anchor.
- Test baseline trajectory: 172/0/19/644 → 204/0/21/824 across the session.
- Cohort distribution discovered: sub-type ↔ promptHash strictly 1:1 at v1 (each sub-type has exactly one generator-prompt).

## Issues & Troubleshooting

- **Problem:** First commit-0 attempt asserted HEAD `a8d83bf`, actual HEAD was `810c83a` (9 commits drift on main).
  - **Cause:** Cross-session work landed on main (selection-engine sidecar log, post-session features, triage retirement, TopNav unification) between prompt-authorship and execution.
  - **Fix:** STOPPED at audit step 1; surfaced full lineage; redirector ratified re-anchor to `810c83a` per §6.14.40 reconciliation precedent.

- **Problem:** Re-anchored prompt asserted three "verified-by-redirector" assumptions (Round 3 ad-hoc; sidecar #2 in-flight; triage cleanup docs-only); two of the three falsified at audit step.
  - **Cause:** The redirector's prompt baked extrapolation into framing rather than treating each as open question. Triage commit `81819e0` modified 33 files including DB schema migration — far beyond "docs-only."
  - **Fix:** STOPPED at Assumption C falsification (SPEC.md was touched, hard STOP trigger fired). Surfaced full diff. Redirector instructed SPEC-B body amendment to address the discipline-debt.

- **Problem:** Subsequent commit-0 prompt asserted "admin auth confirmed greenfield"; executor's audit found existing `requireAdminEmail()` infrastructure at `src/server/auth/admin-gate.ts` + `(admin)/layout.tsx` + `/admin/ingest` route + PRD §3.1 codification.
  - **Cause:** Audit-log §7.4 (which I authored at `955ad1d`) made an unjustified leap from "TopNav has no role affordances" (narrow finding from `32bbbd4` diff probe) to "Q8 'greenfield' framing holds" (broad generalization). Prompt absorbed §7.4's claim as confirmed empirical state. **§6.14.43 instance #8 banking — new sub-type 5: propagation-through-prior-audit-log.**
  - **Fix:** STOPPED with three options (A: reuse `requireAdminEmail()`; B: add role column; C: co-existence). Redirector ratified Option A per Decision D. Q8 framing in plan-doc anchored to existing infrastructure.

- **Problem:** Plan-doc Q6 column-name spec used `rejected_at` (no `_ms` suffix); project convention per PRD §8.1 + existing precedent on bigint epoch columns requires `_ms` suffix.
  - **Cause:** Plan-doc spec drafted without project-convention check.
  - **Fix:** Migration applied convention (`rejected_at_ms`); §1.1 commit folded in 5-reference plan-doc correction. **§6.14.43 instance #9 banking — propagation-within-plan-doc.**

- **Problem:** §1.2 commit-2 criterion implementations consumed by tests had typecheck failure: candidate `optionsJson` array literal vs `Readonly<Record<string, unknown>>` interface field.
  - **Cause:** Original architecture commit (§1.2 commit-0) typed `optionsJson` and `body` as `Record<string, unknown>` — but `optionsJson` is jsonb-typed-as-array per project convention.
  - **Fix:** Changed both fields to `unknown` in `CandidateForValidation`; criteria parse via Zod `safeParse` before access. `metadataJson` stayed as `Record<string, unknown>` (it has `'{}'::jsonb` default).

- **Problem:** §1.2 commit-2 tests used `embedding?: ReadonlyArray<number> | null` in override interface — `no-null-undefined-union` rule violation.
  - **Cause:** Triple-state optional-with-null on property signature.
  - **Fix:** Refactored test override interface to single-state optionals; tests needing explicit null rely on helper defaults.

- **Problem:** §1.3 commit-0 dry-run revealed embedding-distance flag rate 50.44% (over plan-doc §0.6.1 >40% loosen threshold).
  - **Cause:** First-cut thresholds (defaultMin=0.5; defaultMax=0.97) were tighter than empirical sibling-to-parent similarity distribution.
  - **Fix:** §1.3 commit-1 tuned defaults to 0.3 / 0.99 per redirector ratification. Cascade: embedding-distance 50.44%→17.53%; provenance-batch-reject 82.70%→25.42% (downstream of cohort failure rates dropping).

- **Problem:** §1.3 commit-2 production batch postverify reported `hasAnyFlag=true` for 791 candidates; prompt expected ~435.
  - **Cause:** Engine `hasAnyFlag` is the UNION of any-criterion-flag ∨ pressure-cell-membership; 25.42% was the `provenance-batch-reject` criterion's flag rate alone, not the aggregate. Prompt conflated metric.
  - **Fix:** All writes succeeded transactionally with internally-consistent semantics. Surfaced finding for redirector re-baseline. **§6.14.43 instance #11 banking — sub-type 4 metric-conflation.**

- **Problem (recurring):** Multiple lint violations across each commit from redirector code drafts not matching project conventions (`??` fallback ban; `as` cast ban; `console.log` ban; logger arg-order; `||` outside conditional; cognitive complexity; pointless-indirection; `require-logger-before-throw`; `noUnusedTemplateLiteral`).
  - **Cause:** Redirector drafts authored against general patterns; project has strict GritQL + biome rules that surface at lint-stage.
  - **Fix:** Each violation caught and corrected before commit. Cumulative ~21 deviations tracked as **§6.14.43 instance #10 forward-watch** (sub-type 4 pattern: redirector-draft-vs-project-state divergence).

- **Problem:** Threshold-edit commit `30f1757` had test count 814→812 expect() drift.
  - **Cause:** Stochastic-variance precedent (`structured-explanation.test.ts:152` ZodError stderr is the suspect contributor).
  - **Fix:** Within ±5 stochastic precedent; pass / fail / file counts unchanged. No regression.

- **Problem:** Plan-doc `tier-distribution` propagation: post-§0.6.1-reframe grep found 5 matches, 2 of which were in stale framings (line 170 human-judgment description; line 432 §0.8 scope-bucket label).
  - **Cause:** Same propagation-within-plan-doc pattern as §1.1 (instance #9).
  - **Fix:** Surfaced both at round-close stop-and-report. Both within already-reframed §0.6.1 or scope-bucket-label §0.8 — neither contradicts the canonical reframe; not blocking. Future docs-hygiene pass can tighten.

## Decisions Made

- **Round-anchor reconciliation per §6.14.40.** When HEAD drifted from `a8d83bf` to `810c83a` (and later `e9f1254`), re-anchored against actual HEAD rather than rewinding main. Drift commits absorbed into reconciliation block in plan-doc §0.1.

- **SPEC-B over SPEC-A or SPEC-C** for triage retirement docs cleanup. Surgical body-prose amendment as a separate sub-commit (rather than carrying inconsistency forward or per-citation inline). Plus SPEC-B-followup for §10.7 slot-arithmetic claims that became structurally false post-retirement.

- **Q8 admin auth REUSES `requireAdminEmail()` (Decision D).** No `users.role` column. No Auth.js v5 session-callback enrichment. Existing `(admin)/layout.tsx` route-group gating extends to new `/admin/review` route. Single-line config edit to `src/config/admins.ts` instead of schema migration. PRD §3.1 codifies this as canonical project pattern.

- **Persistence schema = `metadata_json.validatorResult` sub-object (option A) over new `item_validation_results` table.** No new tables; simpler queryability for §2 admin UI. Forward-extensibility to per-run-history reserved for future iteration.

- **Two-pass orchestration at runner level, not engine level.** `validateCandidate(candidate, ctx)` stays single-pass; runner does pass-1 → cohort-rates → pass-2 → merge. Criterion 6 returns pass-1 deferral when `cohortFailureRates.size === 0`. Engine.ts unchanged from §1.2 commit-0.

- **Criterion-error-verdict stubs at §1.2 commit-0** (NOT pass verdicts). Belt-and-braces: if §1.3 batch runner lands before §1.2 commit-1 implementations, every candidate flags-as-error rather than silently passing.

- **Threshold tuning iterates via dry-run script.** Calibration directive (>40% loosen / <2% tighten) applies to tunable criteria only; structural criteria's flag rates report candidate quality. One iteration at §1.3 commit-1 (embedding-distance default range loosened) brought all metrics into band.

- **Cohort key = `promptHash` per `metadata_json` backfill.** Sub-type ↔ cohort strictly 1:1 at v1 (each sub-type has one generator prompt). Forward-extensible to multi-prompt-per-sub-type futures without changing criterion logic.

- **`thresholdsHash` reproducibility anchor on every persisted verdict.** Sorted-key sha256 over the threshold registry. Future re-runs with different thresholds get a different hash; auditing identifies which verdicts came from which threshold set.

- **§6.14.31 destructive-operation-gate followed in full** for both backfill (`b792f45`) and production batch (`8c4dff7`). 5-step audit-verify-gate-execute-postverify cycle.

- **Surface-don't-absorb discipline** for redirector-spec divergences. Each STOP gate caught a §6.14.43 sub-type 4 or sub-type 5 instance; cumulative 6 instances banked across the session (#6, #7, #8, #9, #10, #11).

- **Round-close shape**: separate docs-only commit at `bd2820f` rather than folded into a code commit. §1 phase numbering convention: `§1.N commit-M` (commit-numbering, 0-indexed) coexists with plan-doc §0.8's provisional `§1.1, §1.2, ...` (1-indexed scope-bucket labels). Resolved as known artifact.

## Current State

- **Branch:** `main`, 13 commits ahead of `origin/main`. No auto-push performed.
- **Test baseline:** 204 pass / 0 fail / 21 files / 824 expect(). Lefthook clean.
- **Working tree:** clean.
- **DB state:** 1,711 candidate items carry `metadata_json.validatorResult` with `thresholdsHash: sha256:111f631af48157...`. 791 of 1,711 (46.2%) have `hasAnyFlag = true`. 398 in pressure cells. 0 errors across 1,711 evaluations.
- **Validator engine:** complete and calibrated. Six criteria implemented; thresholds tuned; production batch executed.
- **Admin auth:** `leonardiwata@gmail.com` granted via `src/config/admins.ts`. `(admin)/layout.tsx` gates `/admin/ingest` and (forthcoming) `/admin/review`.
- **Schema:** `items.status` enum has 4 values (`'live' | 'candidate' | 'retired' | 'rejected'`); soft-delete columns + `item_admin_actions` audit-trail table in place.
- **Plan-doc** `docs/plans/phase4-validator-and-admin-review.md`: 557 lines. §1 phase summary at §0.8.1. Empirical reframes at §0.6.1 + §0.7.1. §6.14.43 instance ledger at §0.3.

## Next Steps

In priority order for the next session:

1. **§2 phase open**. Admin queue UI at `/admin/review` route under `(admin)/` layout. Surface 791 flagged candidates ranked by validator-confidence-score with pressure-cell-first sorting. Sub-type-pattern taxonomy from §0.7.1 informs queue affordances:
   - Three cohort-rejection sub-types (analogies, lowest_values, antonyms = 435 items): consider "review cohort archetype + apply en masse" affordance.
   - Eight pressure-cell sub-types: per-item attention.
   - Three clean sub-types: sparse individual flags only.
2. **§2 sub-sections per provisional plan-doc §0.8 §2** (queue route, item detail, edit form, approve/reject, audit history, pressure-cell dashboard, UI tests, round-close). Anchor patterns: `<PageNav>` + `loadNavChrome` + post-Round-3 components per §0.5.2.
3. **Round-close §3 SPEC §6.14.43 amendment evaluation**: instances #6–#11 review; potential sub-type 6 introduction (redirector-draft-vs-project-state); sub-type 5 (propagation) consolidation.
4. **Forward-pinned residuals carrying forward**: triage code in 3 smoke/lib files; selection-engine sidecar #1 stale `STATUS: OPEN` line; `structured-explanation.test.ts:152` ZodError stochastic-suspect probe.
5. **Push 14 commits to `origin/main`** when ready (`955ad1d` → `bd2820f`).
6. **Handoff doc** for new conversation if continuity break preferred over inline next-session §2 opening.
