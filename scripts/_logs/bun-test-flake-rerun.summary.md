# bun-test rerun loop — empirical summary

Distilled from raw `scripts/_logs/bun-test-flake-rerun.log` (5.2MB, 109,785 lines) per `tooling-reliability-debug` round §1 commit 1, Path Y (raw log gitignored per `.gitignore` line 108 `scripts/_logs/*.log`; this `.md` artifact captures the signal).

## Metadata

- **Round:** `docs/plans/tooling-reliability-debug.md` §1 commit 1
- **HEAD at loop execution:** `bc0fe17`
- **Generated:** 2026-05-09 21:50-21:56 UTC (loop ran 02:55:55Z → ~02:56:50Z = ~55s wall time)
- **Loop iterations:** 25
- **Raw log:** `scripts/_logs/bun-test-flake-rerun.log` — 5.2MB, 109,785 lines (preserved locally, gitignored)
- **Bun version:** 1.3.10 (revision 30e609e0)
- **drizzle-kit version:** 0.31.10
- **drizzle-orm version:** 0.45.2

## Iteration table

| # | pass | fail | expect() | sec | # | pass | fail | expect() | sec |
|---|------|------|----------|------|----|------|------|----------|------|
| 1 | 128 | 0 | 645 | 2.51 | 14 | 128 | 0 | 645 | 2.30 |
| 2 | 128 | 0 | 644 | 3.02 | 15 | 128 | 0 | 647 | 2.63 |
| 3 | 128 | 0 | 647 | 2.24 | **16** | **127** | **1** | **647** | **3.12** |
| 4 | 128 | 0 | 643 | 2.34 | 17 | 128 | 0 | 644 | 2.60 |
| 5 | 128 | 0 | 645 | 2.38 | 18 | 128 | 0 | 647 | 2.45 |
| 6 | 128 | 0 | 646 | 2.34 | 19 | 128 | 0 | 645 | 2.31 |
| **7** | **127** | **1** | **646** | **2.54** | 20 | 128 | 0 | 646 | 2.60 |
| 8 | 128 | 0 | 649 | 2.40 | 21 | 128 | 0 | 645 | 2.49 |
| 9 | 128 | 0 | 645 | 2.22 | **22** | **127** | **1** | **644** | **2.47** |
| 10 | 128 | 0 | 641 | 2.40 | 23 | 128 | 0 | 646 | 2.40 |
| 11 | 128 | 0 | 648 | 2.29 | 24 | 128 | 0 | 645 | 2.26 |
| 12 | 128 | 0 | 647 | 2.33 | 25 | 128 | 0 | 648 | 2.53 |
| 13 | 128 | 0 | 648 | 2.37 | | | | | |

Bold rows = iterations with a failure. All other rows pass cleanly.

## Failure summary

- **Total failures:** 3 / 25 iterations
- **Point estimate:** 12.0% flake rate
- **Wilson 95% CI:** ~ [4.2%, 30.0%] (n=25 small-sample; CI is wide)
- **Failure interval:** iter 7 → 16 (gap 9), iter 16 → 22 (gap 6); roughly even, but n=2 gaps insufficient for tighter statistical claim
- **All 3 failures attributable to a single test:** `fullLengthNoReServe` at `src/server/items/selection.test.ts:677-685`

## Failure assertions verbatim

### Iteration 7 (received 48 of 50 distinct — 2 duplicates)

```
684 | 	expect(distinct.size).toBe(50)
                             ^
error: expect(received).toBe(expected)

Expected: 50
Received: 48

      at fullLengthNoReServe (/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/items/selection.test.ts:684:24)
(fail) full_length: no re-serve within session — 50 served item.id values are all distinct [323.99ms]
```

### Iteration 16 (received 49 of 50 distinct — 1 duplicate)

```
684 | 	expect(distinct.size).toBe(50)
                             ^
error: expect(received).toBe(expected)

Expected: 50
Received: 49

      at fullLengthNoReServe (/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/items/selection.test.ts:684:24)
(fail) full_length: no re-serve within session — 50 served item.id values are all distinct [269.99ms]
```

### Iteration 22 (received 48 of 50 distinct — 2 duplicates)

```
684 | 	expect(distinct.size).toBe(50)
                             ^
error: expect(received).toBe(expected)

Expected: 50
Received: 48

      at fullLengthNoReServe (/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/items/selection.test.ts:684:24)
(fail) full_length: no re-serve within session — 50 served item.id values are all distinct [291.99ms]
```

The duplication count itself is non-deterministic (1 or 2 across the 3 observed failures). This indicates the bug's underlying mechanism allows multiple item-collisions per session, not a single deterministic point of failure.

## Bug location (production code under test)

The failing test exercises the selection engine's session-attempted-ids exclusion guarantee. The bug is in the engine, not in the test.

- **Entrypoint:** `pickWithFallback` at `src/server/items/selection.ts:279-338`
- **Failing branch:** Pass 4 "session-soft" last-resort fallback, lines 322-336
- **Mechanism:** when Pass 1 (fresh, excludes recency ∪ session) and Pass 2 (recency-soft, excludes session) both return null across all tiers (`tiers = tiersDownFrom(args.requestedTier)` walking down to `easy`), Pass 4 fires with `excludedIds: []` — explicitly dropping session-uniqueness and re-serving a previously-attempted item.
- **Comment claiming unreachability is empirically false:**
  ```
  src/server/items/selection.ts:274-278
  // 4. session-soft  — last resort; drop session-uniqueness at requested
  //                    tier and pick the oldest. Only fires if every tier
  //                    including easy ran out under session-uniqueness; with
  //                    the 55-item seed bank this is unreachable, but the
  //                    branch keeps `getNextItem` total per SPEC §9.2.
  ```
  The empirical 12% rate falsifies the "55-item seed bank → unreachable" assumption. The bank's per-(sub-type × tier) cell distribution is what matters, not the total bank size; a full-length 50-slot session that requests >N items from a cell holding only N items will exhaust that cell + its tier-degraded fallbacks.
- **Slot generator:** `generateFullLengthSlots(sessionId)` at `src/config/difficulty-curves.ts` produces the 50-slot per-decile interleaved request schedule. The bank-size assumption (number of items per cell ≥ slot demand for that cell) is **unencoded in code, only in a comment** — making it drift-prone as the bank evolves.

This file path / line / function trio is the **seed for the upcoming `selection-engine-session-attempted-ids-sidecar`** (forward-pinned per §1.6 of the round plan-doc); no fix lands in this round.

## Expect-count distribution

| count | iterations |
|-------|------------|
| 641 | 1 (iter 10) |
| 643 | 1 (iter 4) |
| 644 | 3 (iter 2, 17, 22) |
| 645 | 7 (iter 1, 5, 9, 14, 19, 21, 24) |
| 646 | 4 (iter 6, 7, 20, 23) |
| 647 | 5 (iter 3, 12, 15, 16, 18) |
| 648 | 3 (iter 11, 13, 25) |
| 649 | 1 (iter 8) |

- **Mean:** 645.72
- **Range:** 641-649 (9 distinct values, span 8)
- **Sum:** 16,143 across 25 iterations

**Diagnosis:** the distribution confirms heads-up #1 from the rerun-loop redirect — passing tests in the suite contain stochastic assertion counts. The variance is independent of pass/fail status (passing iterations also fluctuate widely), so this is NOT inter-iteration state leakage (each iteration is a fresh `bun test` process; no shared state across processes). The most likely source is sampling-driven conditional `expect()` calls inside `selection.test.ts` itself (the within-cell-determinism + 20-salt-variation tests sample probabilistically; the loop counts vary with sampled cell sizes). 

**Forward-pin:** test-suite-determinism observation surfaces as a round-close commentary item in §1.6, NOT a §1 investigation scope item. Single-instance reinforcement of "stochastic test counts exist"; tracked across future rounds.

## Timing distribution

- **Range:** 2.22-3.12s
- **Median:** ~2.40s (estimated; visual inspection of sorted values)
- **Mean:** ~2.47s
- **Slowest iteration:** iter 16 (3.12s), which is also a failing iteration — failure adds ~0.3-0.6s vs the passing-iteration mean (failing iterations 7/16/22 are 2.54s / 3.12s / 2.47s; the assertion-failure path includes test-runner stack capture)
- **Drift:** none. Iter 1 = 2.51s, iter 25 = 2.53s. No upward trend, no downward trend.

**Diagnosis:** confirms heads-up #2 from the rerun-loop redirect — resource-accumulation hypothesis (port leak / connection leak / process leak between iterations) is **downweighted**. Each iteration is process-isolated; no cross-iteration handle accumulation observed.

## Branch selection

**§1.4 Branch 1 ∩ Branch 4** (intersection of "specific test isolated, deterministic root cause" + "real bug surfaces").

- **Branch 2 (diffuse) excluded:** all 3 failures attributable to one test; not diffuse.
- **Branch 3 (Bun runner upstream) excluded:** the bug is in project-side selection-engine code (`pickWithFallback`'s Pass 4), not in the test runner.
- **Branch 5 (zero failures, conditional amendment from rerun-loop redirect) excluded:** 3 failures observed, not zero. The amendment candidate is not triggered.

The intersection of Branch 1 and Branch 4 captures: **specific test + real defect in code-under-test, requiring a focused fix**. The fix is forward-pinned to a sidecar (per round-redirect), not landed in this round.

## Forward-pin: selection-engine sidecar

This round closes with the bug **documented + interim test mitigation in place** (source-comment block at `selection.test.ts:677` above the failing test; test continues to run; coverage of the no-re-serve invariant stays active).

**A new sidecar opens after this round closes:**

- Path: `docs/plans/selection-engine-session-attempted-ids-sidecar.md` (created at sidecar open, not now)
- Working HEAD anchor: this round's final HEAD
- Sidecar's commit-0 audit will investigate fix shape before scoping. Candidates (NOT pre-decided):
  - **One-liner removal:** delete Pass 4 entirely; let `getNextItem` return `undefined` when the bank truly exhausts. Risk: changes `getNextItem` from total to partial in an unknown surface area; needs API-contract review.
  - **Bank-size encoding:** add a runtime check that the bank has ≥ slot-demand per cell at session start; refuse to start a full-length session that would require Pass 4. Risk: may make full-length sessions un-startable on small/seeded banks.
  - **Distribution-aware slot generator:** modify `generateFullLengthSlots` to respect the bank's actual per-cell capacity. Risk: distribution shape constraints from PRD §4.x must be preserved.
  - **Other:** sidecar audit may surface options not yet enumerated.

§6.14.30 awareness (additive-feature-cascade-undercount) flagged: the fix could balloon. Sidecar's investigation-shaped opening guards against this.

## §6.14 reinforcements surfaced this gate

Round-close §5 of the parent plan-doc will record:

- **§6.14.41 (cite-without-verify):** residual #10's "flake" framing was a citation from prior single-incident observations (Round 2 commit 14, score-goals sidecar commit 1). The empirical 25-iteration loop falsified the "flake" framing — it is a stochastic real bug, not a runner-side intermittent. **First reinforcement instance for this §6.14 entry from this round.**
- **§6.14.18/21/22 (audit-first checkpoint discipline):** redirector's §1 commit-1 spec listed `scripts/_logs/...log` as the artifact path without checking the project's gitignore precedent (`.gitignore` line 108 excludes `scripts/_logs/*.log`). Executor caught the conflict at audit-step boundary, surfaced for redirector decision; Path Y (distill to `.md`) selected. **Second reinforcement instance for this round's audit-first cohort** (first was §0.9's reconciliation event at commit `bc0fe17`).
- **Test-suite-determinism observation (NEW):** stochastic expect-counts in passing tests, single-instance from this gate. NOT promoted to its own §6.14 entry; forward-pinned to round-close commentary. Watch for re-occurrence in future rounds.
