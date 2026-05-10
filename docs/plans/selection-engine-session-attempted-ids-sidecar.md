# Selection-Engine Session-Attempted-IDs Correctness Sidecar

**STATUS: OPEN — sidecar commit 0 (audit-step framework executed; branch NOT yet selected).**

This sidecar addresses a stochastic correctness defect surfaced empirically during the tooling-reliability-debug round (`cf2d147` rerun-loop data). The 49-line forward-anchor stub authored at `df4df7c` is wholesale-replaced by this plan-doc per `docs/plans/playbook.md` §6.14.20 (preserved verbatim as §A below).

## §0 Round-frame

### §0.1 Round-open anchor

Sidecar opens at HEAD `f471e83` ("docs(log,plan,readme): document tooling-reliability-debug round closure; detail drizzle-kit manual-apply procedure"). Redirector specified `f458672` as anchor; HEAD is one commit ahead. `git diff --stat f458672..f471e83` confirms f471e83's only change is adding `docs/logs/2026-05-09_23-00_tooling-reliability-roundclose.md` (65 insertions, no source/SPEC/test changes). Anchor drift is benign; bug-surface line numbers in `selection.ts`, `queries.ts`, `selection.test.ts`, and `SPEC.md` resolve identically at f471e83 and f458672. NOT a PROMOTION CANDIDATE 1 instance.

### §0.2 Sidecar shape

Sidecar-shape per Option II at tooling-reliability-debug §1 round-close. Audit-step framework executed at commit 0 BEFORE branch selection. Branches (α/β/γ/α+γ) enumerated — NOT pre-decided. Commit 1 selects against captured empirical findings. Anticipated 3-6 commits + round-close.

### §0.3 Audit-step findings (concise; full captures in §1-§3)

| Step | Concern | Finding |
|------|---------|---------|
| (a)  | Round-anchor verify | HEAD `f471e83`; one commit ahead of redirector's `f458672`; benign anchor drift (log-only diff). |
| (b)  | Bug-seed re-verify  | `selection.ts:279-338` (`pickWithFallback`); Pass 4 session-soft at `322-336`; falsified comment at `274-278`; queries unchanged at `queries.ts:33-74` + `95-114`. |
| (c)  | SPEC §9.2 verbatim  | Read at `SPEC.md:2332-2356`. §9.2:2355 explicitly authorizes session-soft to serve **recency-excluded** items; does NOT mention within-session re-serve. Redirector heads-up read CONFIRMED. |
| (d)  | Item bank size      | **439 live items** (not 55). Brutal tier: only 6 live items across all 14 sub-types. Smallest cells: `numerical.fractions` 9 total live, `numerical.workrate` hard=1. |
| (e)  | Full-length mechanics | 50 slots × 5 deciles. Decile 5 weighted 45% brutal × 10 = 4.5 brutal slots; bank holds 6 brutal items total — pigeonhole tension. |
| (f)  | Reproducibility approaches | A (rerun-loop at HEAD) + B (deterministic salt) both available; neither executed at commit 0. |
| (g)  | Fix-shape branches  | (α) strengthen Pass 4; (β) increase seed bank; (γ) reframe invariant; (α+γ) combination. Selection criteria documented in §4. |
| (h)  | PROMOTION CANDIDATE 1 watch log | EMPTY at commit 0. Anchor drift (a) not an instance; §9.2 read (c) was correct. |

### §0.4 PROMOTION CANDIDATE 1 forward-watch log

Threshold: 3 → 5 instances promotes. State at commit 0 = 3 (all from tooling-reliability-debug). Append below if a redirector-spec mismatch surfaces during this sidecar.

**Instance 4 (commit 1, this commit):**

- **Date:** 2026-05-09.
- **Redirector spec:** AMENDMENT TEXT pre-state authored as plain prose — no `-` bullet, no lead-clause `**bold**`, no backticks around `null` or marker expression.
- **Empirical state at audit (b) of prior gate (commit-1-attempt-1):** disk has `-` bullet + `**bold**` lead clause + backticks around `null` and marker expression, matching adjacent §9.2 conventions (line 2354's `- **Verification reads REQUESTED tier, not served tier.**`).
- **Reconciliation:** redirector revised AMENDMENT TEXT this commit with formatting preserved verbatim. Executor STOPPED per heads-up #1 at prior gate; no silent reconciliation occurred.
- **Mechanism:** cite-without-verify at quote-prefix-stripping step. Redirector worked from tooling-reliability-debug §2 commit 0 audit capture which used `▎` markdown-quote prefixes; stripped `▎` prefixes for the AMENDMENT TEXT but stripped the underlying markdown formatting (bullet, bold, backticks) at the same time without recognizing them as formatting rather than quote machinery.
- **State after this entry:** 4 instances banked. Threshold +1 → 5 → promote. Diagnostic-timing sidecar (Option 1, opens after this sidecar closes) is the immediate exposure surface.

### §0.5 Forward-pin

Sidecar opens BEFORE the diagnostic-timing sidecar (Option 1) per Option II at tooling-reliability-debug §1 round-close. Diagnostic-timing remains pinned-deferred until this sidecar closes.

## §1 SPEC §9.2 contract reading

### §1.1 Verbatim §9.2 text (`docs/SPEC.md:2332-2356`, captured at audit step (c))

> ### 9.2 Selection strategy and bank-empty fallback
>
> `getNextItem` dispatches over the per-session-type `selectionStrategy`:
>
> | `practice_sessions.type` | `selectionStrategy` |
> |---|---|
> | `diagnostic` | `'fixed_curve'` (sourced from `src/config/diagnostic-mix.ts`) |
> | `drill`      | `'adaptive'` |
> | `full_length` | `'fixed_curve'` (sourced from `difficulty-curves.ts`) |
> | `simulation`  | `'fixed_curve'` (same curve as full_length) |
>
> [code-cleanup callout block — non-load-bearing, omitted for clarity]
>
> Fallback chains within `getNextItem`:
>
> - **Recency floor (soft):** Try eligible items not served in the last 7 days first. If none, fall back to eligible-and-not-served-this-session. If still none, any eligible item ordered by oldest-served-first. This guarantees `getNextItem` always returns something rather than throwing mid-drill.
> - **Tier fallback (drill mode):** [...]
>
> Each `attempts` row records both `served_at_tier` (what the engine intended) and `fallback_from_tier` [...]. `metadata_json.fallback_level` captures which fallback path fired: `'fresh' | 'session-soft' | 'recency-soft' | 'tier-degraded'`.
>
> **Two contract clarifications [...]:**
>
> - **Verification reads REQUESTED tier, not served tier.** [...]
> - **The recency-excluded set is a SOFT preference, not a hard guarantee.** When the fresh + recency-soft passes both exhaust under the per-session bank size, the session-soft fallback CAN serve a **recency-excluded** item at the requested tier rather than force the engine to throw `null`. `metadata_json.fallback_level === 'session-soft'` is the observable marker. Verification scenarios that assert "no recency-excluded item is served" must either (a) ensure the bank is large enough that fresh/recency-soft never exhaust, or (b) only assert against the FIRST item served (where session-soft fallback is structurally extreme).

### §1.2 Interpretive notes

§9.2 contains a tension that the sidecar must adjudicate:

- **Totality clause (line 2347, last sentence of recency-floor bullet):** *"This guarantees `getNextItem` always returns something rather than throwing mid-drill."* Interpreted by the implementation as license to drop session-uniqueness as the last-resort fallback.
- **Specific-permission clause (line 2355):** *"the session-soft fallback CAN serve a **recency-excluded** item at the requested tier rather than force the engine to throw `null`."* This clause names ONE thing the session-soft pass is permitted to do: serve a recency-excluded item. It does NOT name within-session re-serves.

The implementation at `selection.ts:322-336` resolves the tension by making session-soft drop **both** exclusions (`excludedIds: []`). The specific-permission clause's silence on within-session re-serves is the empirical contradiction: the implementation reads the totality clause as authorizing more than §9.2:2355 explicitly mentions.

A defensible reading of §9.2 is that "always returns something" is a design goal subject to the explicit permission in §9.2:2355 — i.e., session-soft fallback may relax recency-uniqueness but not session-uniqueness. Under this reading, the correct return when (recency ∪ session) is exhausted across all tiers is `null`, propagated up through `getNextItem`'s `undefined` return, surfaced to the caller as session-quota termination.

### §1.3 Redirector-read reconciliation

Redirector heads-up read (commit 0 prompt §HEADS-UP, item 2) anticipated: *"§9.2:2355 discusses recency-excluded items specifically; the within-session re-serve is NOT mentioned."* Verbatim §9.2 text confirms this read. No reconciliation needed; PROMOTION CANDIDATE 1 watch log stays empty.

## §2 Bug seed re-verified at f471e83

### §2.1 Production entrypoint — `pickWithFallback` (`selection.ts:269-338`)

Resolves an item under the recency-floor + tier-degraded + session-soft fallback chain documented in `selection.ts:269-278`. Top-of-function builds `sessionExcl = args.sessionAttemptedIds` and `allExcl = [recencyExcludedIds ∪ sessionAttemptedIds]`. Per-tier loop runs Pass 1 (fresh, `excludedIds: allExcl`) then Pass 2 (recency-soft, `excludedIds: sessionExcl`). After the loop exits without a hit, falls through to Pass 4.

### §2.2 Failing branch — Pass 4 session-soft (`selection.ts:322-336`)

```ts
// Pass 4: last resort — session-soft at requested tier (allow repeat).
const sessionSoft = await pickItemRow({
    subTypeId: args.subTypeId,
    tier: args.requestedTier,
    excludedIds: [],
    sessionIdSalt: args.sessionIdSalt
})
if (sessionSoft) {
    return {
        row: sessionSoft,
        servedAtTier: args.requestedTier,
        fallbackLevel: "session-soft"
    }
}
return null
```

`excludedIds: []` means BOTH recency AND session exclusions are dropped. The comment at the top of the function (`selection.ts:274-278`) says "drop session-uniqueness at requested tier and pick the oldest" — i.e., the implementation explicitly aims to allow within-session re-serves. The `pickItemRow` ORDER BY uses `md5(items.id::text || sessionIdSalt)` (`queries.ts:56`), so "pick the oldest" is misleading prose — actual selection is hash-deterministic, not time-ordered.

### §2.3 Falsified comment (`selection.ts:274-278`)

```ts
//   4. session-soft  — last resort; drop session-uniqueness at requested
//                      tier and pick the oldest. Only fires if every tier
//                      including easy ran out under session-uniqueness; with
//                      the 55-item seed bank this is unreachable, but the
//                      branch keeps `getNextItem` total per SPEC §9.2.
```

Three falsehoods:

1. *"with the 55-item seed bank this is unreachable"* — bank is **439 live items** (audit step (d)). Comment was authored when bank was 55 and never updated.
2. *"this is unreachable"* — empirically reached at 12% rate over 25-iteration `bun test` rerun loop (`scripts/_logs/bun-test-flake-rerun.summary.md`).
3. *"keeps `getNextItem` total per SPEC §9.2"* — §9.2:2355 authorizes session-soft to serve **recency-excluded** items. Authorization for within-session re-serve is the totality clause's general phrasing; §1.2 above documents that the implementation reads more from §9.2 than §9.2:2355 explicitly grants.

### §2.4 Underlying queries (`queries.ts`)

- `pickItemRow` (`queries.ts:33-74`): SQL exclusion clause `${items.id} <> ALL(${excludedLiteral}::uuid[])` with array literal built by `pgUuidArrayLiteral`. Empty array becomes `'{}'::uuid[]` per the comment at `queries.ts:26-31`.
- `readSessionAttemptedItemIds` (`queries.ts:95-114`): `SELECT DISTINCT item_id FROM attempts WHERE session_id = ?`. Read by `getNextFixedCurve` (`selection.ts:394`) and `getNextAdaptive` (`selection.ts:577`) on every `getNextItem` call.

### §2.5 Failing test — `fullLengthNoReServe` (`selection.test.ts:695-703`)

Post-mitigation comment block at lines 680-694 documents the empirical failure rate (3/25 = 12%, all on the `expect(distinct.size).toBe(50)` assertion) and the explicit DO NOT `.skip()` directive. Test body:

```ts
test("full_length: no re-serve within session — 50 served item.id values are all distinct", async function fullLengthNoReServe() {
    const { rows } = await runFullLengthSession("fl-no-reserve")
    const itemIds = rows.map(function pickItemId(r) { return r.itemId })
    expect(itemIds.length).toBe(50)
    const distinct = new Set(itemIds)
    expect(distinct.size).toBe(50)
}, 120_000)
```

Failure surface: `distinct.size < 50` whenever at least one item id was served twice within the session.

## §3 Empirical findings

### §3.1 Item bank size at f471e83 (audit step (d), captured via Drizzle probe)

- **Total items:** 2150 (1711 candidate, **439 live**).
- **Live by tier:** easy=139, medium=225, hard=69, **brutal=6**.
- **Live by sub-type (smallest first):** `numerical.fractions` 9, `numerical.workrate` 15, `numerical.ratios` 16, `verbal.letter_series` 16, `numerical.speed_distance_time` 17, `numerical.averages` 18, `numerical.word_problems` 29, `verbal.antonyms` 35, `numerical.percentages` 34, `numerical.lowest_values` 40, `verbal.analogies` 43, `numerical.number_series` 49, `verbal.critical_reasoning` 59, `verbal.sentence_completion` 59.
- **Brutal-tier presence (only 3 of 14 sub-types have ANY):** `numerical.number_series` 2, `verbal.antonyms` 1, `verbal.sentence_completion` 3.
- **Smallest (sub-type, tier) live cells:** numerous tier=1 cells (e.g., `numerical.fractions:hard=1`, `numerical.workrate:hard=1`, `numerical.averages:hard=1`).

### §3.2 Full-length session mechanics (audit step (e))

`generateFullLengthSlots(sessionId)` returns 50 slots, deterministic per sessionId. `standardCurve` (`difficulty-curves.ts:10-16`) weights each decile:

| Decile | easy | medium | hard | brutal |
|--------|------|--------|------|--------|
| 1 (q01-10) | 0.70 | 0.25 | 0.05 | 0.00 |
| 2 (q11-20) | 0.35 | 0.45 | 0.20 | 0.00 |
| 3 (q21-30) | 0.15 | 0.40 | 0.35 | 0.10 |
| 4 (q31-40) | 0.05 | 0.25 | 0.45 | 0.25 |
| 5 (q41-50) | 0.00 | 0.15 | 0.40 | 0.45 |

`pickSubTypesWithReplacement` draws sub-types uniformly (`Math.floor(rand() * 14)`) per (decile, tier) cell. Per session expected per-sub-type draws ≈ 50/14 ≈ 3.6.

Test helper `runFullLengthSession` (`selection.test.ts:523-584`) creates a fresh user, starts a `full_length` session, then submits 50 attempts — each `submitAttempt` triggers `getNextItem`, which dispatches into `getNextFixedCurve` → `pickWithFallback`.

### §3.3 Reproducibility approaches available (NOT executed at commit 0)

- **Approach A (rerun-loop at HEAD):** `for i in $(seq 1 50); do bun test src/server/items/selection.test.ts -t fullLengthNoReServe 2>&1 | tee -a scripts/_logs/_sidecar-rerun.log; done`. Confirms the 12% rate generalizes to f471e83; tightens the Wilson 95% CI from n=25 → n=50.
- **Approach B (deterministic salt):** `runFullLengthSession("fl-no-reserve")` constructs sessionId deterministically from suffix via `createTestUser`. If the failure is salt-deterministic at the (sessionId, bank) level, identifying a known-bad sessionId would give zero-flake reproduction. Investigative — requires probing whether failure is per-test-invocation random (unlikely; `submitAttempt` and `pickItemRow` are deterministic given fixed inputs) or salt-determined.

Both deferred to commit 1; selection branch-dependent.

### §3.4 Bank-shape vs 12% rate (informal)

Pigeonhole pressure points:

- Decile 5 expects ~4-5 brutal slots; bank has 6 brutal items total across 3 sub-types. Sub-types without brutal items fall back to `hard` via tier-degraded; `hard` itself has 69 items but with cells as small as 1.
- Smallest sub-type cells (`numerical.fractions:hard=1`, `numerical.workrate:hard=1`) exhaust on first served item; subsequent draws into the same (sub-type, hard) cell fall back to medium → easy → if all four exhaust → Pass 4 fires.
- Sessions drawing the same sub-type 4+ times across deciles where bank holds <4 distinct items at the requested tier increase Pass-4 probability.

12% over n=50 attempts is consistent with this bank shape and weighting curve. The rate is not load-bearing for branch selection; what matters is that Pass 4 is empirically reachable, which is already established.

## §4 Fix-shape branches

### §4.1 (α) Strengthen Pass 4

**Change:** `selection.ts:327` from `excludedIds: []` to `excludedIds: args.sessionAttemptedIds`. Pass 4 then drops only recency exclusion (matching §9.2:2355's explicit permission); session-uniqueness is preserved. If session-attempted set exhausts all eligible items, `pickItemRow` returns `null` → `pickWithFallback` returns `null` → `getNextFixedCurve` returns `undefined` → `getNextItem` returns `undefined` → caller terminates the session (existing path; `selection.ts:402-409` already handles this case via `logger.warn`).

**SPEC implications:** §9.2:2347's totality claim ("always returns something") becomes false in the (recency ∪ session)-exhaust case. Either:
- Update §9.2:2347 to read "always returns something OR signals session termination" (one-line edit), OR
- Update §9.2:2355's specific-permission clause to clarify session-soft preserves session-uniqueness, with `null` return as the contract when exhausted.

**Selection criterion:** SPEC §9.2 already sets up "session-soft serves recency-excluded items" as the operative permission; the totality claim was implementation-level prose, not an invariant. (α) is the smallest behavior-change consistent with §9.2's explicit permission.

### §4.2 (β) Increase the seed bank

**Change:** Add live items to under-served (sub-type, tier) cells, especially brutal. Phase 4 sub-phase a candidate bank (1711 items) gives raw material; bottleneck is the validator (Phase 4 sub-phase b, indefinitely deferred per `docs/plans/phase4-testbank.md`).

**Selection criterion:** EMPIRICALLY MOOT. Bank already grew from 55 (when the falsified comment was authored) to 439 (8× growth); 12% bug rate persists. Growing further may reduce rate but doesn't encode the invariant in code — drift remains. Defer to deferred-OOS list; not this sidecar's work.

### §4.3 (γ) Reframe the invariant

**Change:** Amend `fullLengthNoReServe` test to assert `expect(distinct.size).toBeGreaterThanOrEqual(N)` for some N < 50 reflecting bank-shape constraints. Amend SPEC §9.2 to declare session-uniqueness best-effort, with session-soft re-serves named explicitly as in-contract.

**Selection criterion:** Loosens the contract to fit the implementation. Defensible if SPEC's design intent was always "best-effort uniqueness" and the test was over-strict, or if (α) is structurally untenable. Not the redirector's read of §9.2:2355.

### §4.4 (α+γ) Combination

**Change:** Apply (α) — Pass 4 preserves session-uniqueness, returns `null` on exhaust. Apply (γ) lite — amend SPEC §9.2:2347 totality claim and §9.2:2355 to explicitly document the `null`-on-exhaust contract; amend `fullLengthNoReServe` test only if the SPEC change clarifies session-completion semantics under exhaustion.

**Selection criterion:** Most-correct most-scope. Encodes the invariant in code (α) AND in SPEC (γ-lite); leaves test asserting strict 50-distinct uniqueness because the contract becomes "either 50 distinct OR session terminates early" — and session termination would manifest as `rows.length < 50`, caught by the existing `expect(itemIds.length).toBe(50)` assertion.

### §4.5 Decision criteria summary

| Branch | Code change | SPEC change | Test change | Bank change |
|--------|-------------|-------------|-------------|-------------|
| α      | yes (one-line) | yes (one-line)   | no            | no          |
| β      | no             | no               | no            | yes (large) |
| γ      | no             | yes (substantive)| yes           | no          |
| α+γ    | yes (one-line) | yes (substantive)| no            | no          |

**Provisional candidate (commit-1 gate decides):** (α) or (α+γ). Empirical findings disfavor (β) (bank already grew 8× without fixing the bug). (γ) loses the invariant the test was authored to protect. Final selection happens against captured facts at commit 1.

### §4.6 Branch-selection decision (γ standalone; δ reframed)

Per redirector decision after commit-0 audit findings:

**(α) REJECTED.** Audit step (e) at commit 0 surfaced that decile-5 full-length sessions need 4-5 brutal-tier items per session, but the bank has only 6 brutal items total distributed across 3 of 14 sub-types. Strict tightening (`excludedIds: args.sessionAttemptedIds`) would push failure to null-returns from `pickWithFallback`, which the caller chain (`getNextFixedCurve` → session orchestration) is not currently architected to handle. Strict (α) creates a worse failure mode (sessions running short of 50 attempts or returning errors mid-drill) than the current bug (silent re-serves under fallback).

**(β) EMPIRICALLY FALSIFIED.** Audit step (d) showed the bank grew 8× from comment-claimed "55 items" to 439 live items, yet bug rate persists at 12%. Non-targeted bank growth is not the fix.

**(γ) SELECTED.** Acknowledge implementation behavior is structurally necessary given current bank. SPEC §9.2:2355 amendment makes implementation honest. Failing tests relax to marker-aware invariant per amendment's clause (b). Closes bug surface; unblocks downstream rounds (diagnostic-timing sidecar, Round 3).

**(δ) REFRAMED.** Targeted bank-growth in pressure cells (especially brutal tier; smallest hard-tier cells: `numerical.fractions:hard=1`, `numerical.workrate:hard=1`, `numerical.averages:hard=1`) is the actual fix to make the SPEC §9.2:2355 escape-hatch rarely fire. Vehicle: un-defer Phase 4 sub-phase b (validator round) — the 1,711 candidates awaiting promotion include items in the pressure cells. Validator round forward-pinned at sidecar round-close (§6).

**(α+γ) NOT PURSUED.** The combination was attractive when the null-handling semantics question seemed manageable; once audit step (e)'s pigeonhole finding surfaced, strict (α) became structurally infeasible for full-length sessions without companion infrastructure (placeholder items, early-termination orchestration, etc.) that exceeds sidecar scope.

**Commit ladder (revised from commit-0 framing):**

- **Commit 1 (this commit):** SPEC §9.2 targeted patch + plan-doc §4.6 branch-selection record + §0.4 watch-log instance #4. NO code changes. NO test changes.
- **Commit 2:** Test amendment — RELAX BOTH tests per audit (c) consumer list captured at the prior commit-1-attempt-1 gate report:
  - `fullLengthNoReServe` at `selection.test.ts:702`
  - `noReServeInSession` at `selection.test.ts:227`

  Both relaxed to marker-aware invariant per SPEC clause (b): `(distinct) + (session-soft fallback rows) === (session length)`. Interim mitigation comment block (authored at tooling-reliability-debug §1 commit 1) removed since the bug is now spec-authorized. Round-close folded into this commit (Q-pattern from tooling-reliability-debug §2): §5/§6/§7 sections close the sidecar atomically with the test fix.

  No empirical probe on `noReServeInSession` before relaxing per redirector (Q) decision; SPEC-derived posture, not empirical-data-derived.

**Anticipated round-close residuals (forward-pinned to §6):**

- **VALIDATOR ROUND UN-DEFERRED.** Phase 4 sub-phase b moves from "indefinitely deferred" (handoff §9 residual #5; forensics in `convergence-audit.md`) to active forward-pin. Sequencing relative to diagnostic-timing sidecar deferred to that round-close decision.
- **Marker-aware-assertion sub-pattern** (2 instances surfaced this sidecar: `fullLengthNoReServe` + `noReServeInSession`). Forward-watch only; no §6.14 promotion this round (single-sidecar observation; if a 3rd surfaces in a future round, candidate escalates).
- **PROMOTION CANDIDATE 1 instance #4 logged.** Threshold proximity flagged at round-close commentary (1 more instance promotes).

## §5 Commit ledger

| # | Hash | Description |
|---|------|-------------|
| 0 | ccb3aab | Wholesale-replace stub at f471e83; author plan-doc body §0-§4 + §A quote block; PROMOTION CANDIDATE 1 watch log initialized empty. |
| 1 | <this commit> | SPEC §9.2 targeted patch (γ branch selection) — within-session-attempted authorized under session-soft fallback. Plan-doc §4.6 branch-selection decision; §0.4 watch-log instance #4 logged (cite-without-verify at quote-prefix-stripping). NO code changes. |

## §6 Round-close residuals

*(placeholder — populated at round-close)*

## §7 §6.14 candidates

*(placeholder — populated at round-close per `docs/plans/playbook.md` §6.14)*

## §A Original stub content as of df4df7c (wholesale-replacement preservation)

> # Selection-Engine Session-Attempted-IDs Correctness Sidecar
>
> **STATUS: STUB — NOT YET OPEN**
>
> This file is a forward-anchor stub authored at the close of §1 of the tooling-reliability-debug round (commit `cf2d147` surfaced the empirical bug seed; this stub lands at §1 round-close). It exists to resolve the path reference at `src/server/items/selection.test.ts` (interim mitigation comment block above the `fullLengthNoReServe` test) which would otherwise be a dead reference until the sidecar opens.
>
> The sidecar opens AFTER the tooling-reliability-debug round fully closes (currently mid-round at §1 close; §2 still pending). At sidecar-open, this stub is replaced wholesale by the actual sidecar plan-doc.
>
> ## Gate-statement
>
> Do NOT begin sidecar implementation work against this stub. The stub contains framework only — branches are enumerated, NOT pre-decided. Empirical investigation in the sidecar's commit 0 selects among them.
>
> ## Scope (provisional, sidecar-open will refine)
>
> Address the stochastic correctness defect surfaced empirically during the tooling-reliability-debug round: 25 rerun-loop iterations of `bun test` produced 3 failures, all on a single test exercising the selection engine's session-uniqueness invariant. Empirical flake rate: 12% (Wilson 95% CI ~ [4.2%, 30.0%]; n=25 small-sample).
>
> ## Bug seed
>
> Audit step (d) of tooling-reliability-debug §1 commit 1 surfaced a complete seed: production entrypoint, failing branch, falsified comment, underlying queries, and the exposing test.
>
> See: [`docs/plans/tooling-reliability-debug.md`](tooling-reliability-debug.md) §1.6.
>
> Sidecar commit-0 audit re-verifies the seed against then-current HEAD (`selection.ts` and `queries.ts` may have moved by the time the sidecar opens; tooling-reliability-debug round still has §2 to land + close).
>
> ## SPEC §9.2 implication
>
> Pass 4 session-soft fallback's design rationale (per the `selection.ts:274-278` comment) is "keep `getNextItem` total per SPEC §9.2." Branch (α) below requires a SPEC §9.2 amendment because removing the fallback's escape valve makes `getNextItem` non-total for the (recency ∪ session)-exhausted case. Sidecar commit-0 audit MUST read SPEC §9.2 verbatim before fix-shape selection — note that §9.2's existing language on session-soft (`docs/SPEC.md:2355`) frames Pass 4 as serving "recency-excluded" items, leaving open whether within-session re-serves were ever in-contract.
>
> ## Fix-shape branches (enumerated; sidecar commit-0 selects)
>
> - **(α) Strengthen Pass 4** — change `excludedIds: []` to keep session-uniqueness; if exhausted, return null. Behavior change + SPEC §9.2 amendment required (or contract reframing if §9.2 was always meant to forbid within-session re-serves).
> - **(β) Increase the seed bank** — add items so Pass 4's "unreachable with N items" assumption becomes empirically true at the desired confidence interval. Content/data change. Doesn't fix design drift-proneness — the bank-size assumption stays unencoded in code.
> - **(γ) Reframe the invariant** — accept session-uniqueness as best-effort under fallback; amend the failing test + SPEC to reflect relaxed contract. Test-and-spec change.
>
> Branches are NOT mutually exclusive in principle (a real fix could combine α + γ, or β as an interim while α lands, etc.). Sidecar commit-0 audit selects + justifies.
>
> ## Audit-step framework template (sidecar commit-0)
>
> - **(a)** Round-anchor verify against then-current HEAD.
> - **(b)** Re-verify §1.6 seed against then-current `selection.ts` / `queries.ts` (may have shifted between this stub's authoring and sidecar-open).
> - **(c)** Read SPEC §9.2 verbatim. Capture totality contract + the "recency-excluded vs session-attempted" framing distinction.
> - **(d)** Probe item bank size at then-current state (`select count(*) from items` grouped by sub_type × tier; the per-cell distribution is what matters, not the total).
> - **(e)** Probe the unlucky-permutation surface: replicate the bug deterministically by seeding a known-bad sessionId/salt combination if possible (sidecar may need its own targeted rerun loop with smaller-N high-confidence reproduction).
> - **(f)** Branch selection (α / β / γ / combination) with empirical + spec-citation justification.
> - **(g)** Forward-pin: this sidecar opens before Option 1 (diagnostic-timing sidecar). Confirm ordering at then-current redirector handoff.
>
> ## Forward-pin
>
> Sidecar opens after the tooling-reliability-debug round fully closes (currently §1 closing in this gate; §2 drizzle-kit CLI investigation still pending). Slots in front of Option 1 (diagnostic-timing sidecar) per redirector decision (Option II) at tooling-reliability-debug §1 round-close.
