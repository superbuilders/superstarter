# Session Log: Selection-engine session-attempted-ids sidecar — open through close

**Date:** 2026-05-09 23:00 → 2026-05-10 00:20
**Duration:** ~3 hours, 4 landed commits (2 stop-and-report gates exercised)
**Focus:** Open and fully close the selection-engine sidecar that addresses the stochastic 12% failure on `fullLengthNoReServe`; SPEC §9.2 amendment + test relaxation + round-close fold.

## What Got Done

- **Commit 0 (`ccb3aab`):** Wholesale-replaced the 49-line forward-anchor stub at `docs/plans/selection-engine-session-attempted-ids-sidecar.md` with a 297-line plan-doc body (§0–§5 + §A quote-block preservation per playbook §6.14.20). Executed audit steps (a)–(j) including:
  - Empirical item-bank probe via a one-shot Drizzle script (`scripts/dev/_probe-item-bank.ts`, deleted post-probe). Result: **2150 total items**, **439 live**, **brutal tier holds only 6 items across 3 of 14 sub-types**. Falsified the `selection.ts:274-278` "55-item seed bank" comment (8× out of date).
  - SPEC §9.2:2332-2356 captured verbatim; confirmed §9.2:2355 authorizes session-soft to serve recency-excluded items, NOT within-session re-serves.
  - Bug seed re-verified: `pickWithFallback` Pass 4 at `selection.ts:322-336` drops both exclusions (`excludedIds: []`).
- **Commit 1 (`d59f86d`):** SPEC §9.2:2355 targeted patch — amended the bullet to authorize within-session re-serves under session-soft fallback and codify the marker-aware invariant `(distinct items served) + (session-soft fallback rows) === (session length)`. Plan-doc additive: §0.4 watch-log instance #4, §4.6 branch-selection record (γ SELECTED, α REJECTED, β EMPIRICALLY FALSIFIED, δ REFRAMED). NO code changes.
- **Commit 2a (`6db9ca8`):** Structural prerequisite. Extended `readFullLengthAttempts` SELECT + `FullLengthAttemptRow` type + `noReServeInSession`'s inline SELECT to project `metadata_json->>'fallback_level'` as `fallbackLevel`. Imported `sql` from drizzle-orm. JSONB projection syntax discovered via grep audit (project convention `sql<string>\`...\`` with no `.as()`). NO behavior change; assertions unchanged.
- **Commit 2b (`1dc2b75`, sidecar CLOSE):** Added `countSessionSoftFallbacks` helper (top-of-file helper area). Replaced the 18-line interim mitigation block above `fullLengthNoReServe` with a 3-line SPEC-reference comment. Added the same comment above `noReServeInSession`. Relaxed both assertions to `expect(distinct.size + countSessionSoftFallbacks(rows)).toBe(N)`. Plan-doc round-close fold: §5 ledger row, §6 residuals (5 forward-pins), §7 §6.14 candidates (3 reinforcements + 2 promotion candidates in DEFER + 3 forward-watch). Final plan-doc 411 lines.
- **Test verification:** Single-run on `selection.test.ts` 9/0/192; full-suite 128/0/649 post-2b. Lefthook lint+typecheck passed all four commits.

## Issues & Troubleshooting

- **Problem:** Round-anchor mismatch at commit-0 — redirector specified HEAD `f458672` but actual HEAD was `f471e83`.
  - **Cause:** f471e83 landed after the redirector authored the commit-0 redirect; one commit log-only drift.
  - **Fix:** `git diff --stat f458672..f471e83` confirmed log-only diff (no source/SPEC/test changes). Documented as benign anchor drift in plan-doc §0.1; explicitly NOT logged as a PROMOTION CANDIDATE 1 instance.

- **Problem:** Commit 1 attempt 1 — redirector's `AMENDMENT TEXT — VERBATIM TO APPLY` pre-state did not match `docs/SPEC.md:2355` byte-for-byte (4 differences: missing `-` bullet, missing `**bold**` lead heading, missing backticks around `null`, missing backticks around the marker expression).
  - **Cause:** Redirector worked from a prior round's audit capture that used `▎` markdown-quote prefixes; stripped the `▎` prefixes for the AMENDMENT TEXT but inadvertently stripped the underlying markdown formatting at the same time (cite-without-verify mechanism).
  - **Fix:** Executor STOPPED per heads-up #1 ("don't silently reconcile") and reported all 4 byte-level differences with three resolution options. Redirector supplied REVISED AMENDMENT TEXT with formatting preserved verbatim in the next gate. Logged as PROMOTION CANDIDATE 1 instance #4 in plan-doc §0.4 (state advance 3 → 4).

- **Problem:** Commit 2 attempt 1 — neither failing test's row shape exposed the `fallbackLevel` marker, so the relaxed marker-aware assertion couldn't be expressed against current types.
  - **Cause:** `fallback_level` is stored only inside `attempts.metadata_json` JSONB (no dedicated column). `readFullLengthAttempts` projected 5 fields without it; `noReServeInSession`'s inline SELECT projected only `itemId`.
  - **Fix:** Executor STOPPED per heads-up #2 (structural prerequisite — "different commit shape") and recommended splitting commit 2 into 2a (helper extension) + 2b (assertion relaxation). Redirector accepted the split. NOT a PROMOTION CANDIDATE 1 instance — heads-up #2 explicitly designed the boundary the audit caught.

- **Problem:** JSONB projection syntax mismatch between redirector default (`sql<string>\`…\`.as('fallbackLevel')`) and project convention.
  - **Cause:** Audit (d) probe found 8+ instances of `sql<T>\`…\`` typed projections in `src/`, none using `.as()`; project consistently lets Drizzle infer the alias from the object key.
  - **Fix:** Applied project convention (no `.as()`) per redirector's "audit caught the divergence and resolved" instruction at point (5). Documented in plan-doc §4.6 split note.

- **Problem:** Test-suite baseline at 2a-pre-edit reported 1 fail in `structured-explanation.test.ts:152` (ZodError trace).
  - **Cause:** Either (i) the trace is expected stderr from a passing Zod-rejection assertion test (misread of expected output) or (ii) a second stochastic flake source distinct from `fullLengthNoReServe`. Cleared on rerun and across all subsequent runs through 2b.
  - **Fix:** Forward-pinned to next tooling round as round-close residual #5. NOT investigated this sidecar.

## Decisions Made

- **Branch (γ) over (α) / (β) / (α+γ).** (α) strict tightening rejected because pigeonhole pressure (decile-5 wants 4-5 brutal slots, bank holds 6 brutal items) makes null-returns structurally inevitable without companion infrastructure. (β) bank-growth empirically falsified by 8× growth (55 → 439) without fixing the bug. (γ) makes the implementation honest by codifying spec-authorized behavior and adding a marker-aware invariant.
- **(δ) reframed as validator round un-defer.** Targeted bank-growth in pressure cells is the actual fix to make session-soft fallback rarely fire; vehicle is un-deferring Phase 4 sub-phase b. Not this sidecar's commit work; forward-pinned at round-close §6 residual #1.
- **Production code untouched across all 4 commits.** γ branch keeps `selection.ts` / `queries.ts` / `submit.ts` byte-identical pre/post; only SPEC text and test code change.
- **Commit 2 split into 2a + 2b.** Structural prerequisite (helper extension) lands in 2a as a no-behavior-change refactor; assertion relaxation lands in 2b. Both audit gates fire cleanly.
- **STOP-and-report on both redirector-spec discrepancies.** Both gates exercised the audit-first discipline rather than silently reconciling.
- **JSONB projection follows project convention.** Synthesized from `${table.metadataJson}->>'key'` (4 WHERE-clause instances) + `sql<T>\`…\`` typed projection (8+ SELECT instances) without `.as()`.

## Current State

- **Sidecar CLOSED at `1dc2b75`.** 4 commits ahead of `origin/main` (no auto-push performed; user has not requested push).
- **Working tree clean.**
- **`drizzle/meta/_journal.json`** sha256 = `5385521d609b6ad76a78a3460e3ccfe6ef9cba3af5236541099547b3707e53f3` — unchanged across all 4 commits.
- **Full-suite test:** 128/0/649 (clean).
- **SPEC §9.2:2355** carries the marker-aware invariant; consumers of `metadata.fallback_level` audit complete (producer at `submit.ts:118`, two assertion-bearing tests both relaxed).
- **Plan-doc** at 411 lines; §6/§7 fully populated; §A quote-block preserved.
- **PROMOTION CANDIDATE 1 watch state:** 4 instances banked, threshold proximity (+1 → 5 → promote) flagged for handoff.
- **PROMOTION CANDIDATE 2:** 3 instances banked; threshold +2 cycles of explicit round-shape reasoning → 5 → promote-or-refine.
- **`fullLengthNoReServe` / `noReServeInSession`:** both pass deterministically against the marker-aware invariant.

## Next Steps

Per round-close §6 forward-pins (Leo's continuity call to choose):

1. **Diagnostic-timing sidecar (Option 1)** opens after this sidecar closes per Option II at tooling-reliability-debug §1 round-close. Its plan-doc §0 must carry forward the PROMOTION CANDIDATE 1 watch state (4/5).
2. **Validator round (Phase 4 sub-phase b un-deferral)** for δ-branch targeted bank-growth in pressure cells (brutal tier; `numerical.fractions:hard=1`, `numerical.workrate:hard=1`, `numerical.averages:hard=1`). 1,711 candidates await promotion. Sequencing relative to diagnostic-timing sidecar deferred to next round-shape decision.
3. **`structured-explanation.test.ts:152` stochastic suspect probe** — rerun-loop investigation similar to tooling-reliability-debug §1 to distinguish "expected stderr trace" from "second stochastic flake source." Forward-pinned; not urgent.
4. **Push 4 commits to `origin/main`** when ready (`ccb3aab` → `d59f86d` → `6db9ca8` → `1dc2b75`).
5. **Handoff doc for new conversation** if Leo prefers continuity break over inline next-round opening.
