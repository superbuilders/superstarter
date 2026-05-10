# Selection-Engine Session-Attempted-IDs Correctness Sidecar

**STATUS: STUB — NOT YET OPEN**

This file is a forward-anchor stub authored at the close of §1 of the tooling-reliability-debug round (commit `cf2d147` surfaced the empirical bug seed; this stub lands at §1 round-close). It exists to resolve the path reference at `src/server/items/selection.test.ts` (interim mitigation comment block above the `fullLengthNoReServe` test) which would otherwise be a dead reference until the sidecar opens.

The sidecar opens AFTER the tooling-reliability-debug round fully closes (currently mid-round at §1 close; §2 still pending). At sidecar-open, this stub is replaced wholesale by the actual sidecar plan-doc.

## Gate-statement

Do NOT begin sidecar implementation work against this stub. The stub contains framework only — branches are enumerated, NOT pre-decided. Empirical investigation in the sidecar's commit 0 selects among them.

## Scope (provisional, sidecar-open will refine)

Address the stochastic correctness defect surfaced empirically during the tooling-reliability-debug round: 25 rerun-loop iterations of `bun test` produced 3 failures, all on a single test exercising the selection engine's session-uniqueness invariant. Empirical flake rate: 12% (Wilson 95% CI ~ [4.2%, 30.0%]; n=25 small-sample).

## Bug seed

Audit step (d) of tooling-reliability-debug §1 commit 1 surfaced a complete seed: production entrypoint, failing branch, falsified comment, underlying queries, and the exposing test.

See: [`docs/plans/tooling-reliability-debug.md`](tooling-reliability-debug.md) §1.6.

Sidecar commit-0 audit re-verifies the seed against then-current HEAD (`selection.ts` and `queries.ts` may have moved by the time the sidecar opens; tooling-reliability-debug round still has §2 to land + close).

## SPEC §9.2 implication

Pass 4 session-soft fallback's design rationale (per the `selection.ts:274-278` comment) is "keep `getNextItem` total per SPEC §9.2." Branch (α) below requires a SPEC §9.2 amendment because removing the fallback's escape valve makes `getNextItem` non-total for the (recency ∪ session)-exhausted case. Sidecar commit-0 audit MUST read SPEC §9.2 verbatim before fix-shape selection — note that §9.2's existing language on session-soft (`docs/SPEC.md:2355`) frames Pass 4 as serving "recency-excluded" items, leaving open whether within-session re-serves were ever in-contract.

## Fix-shape branches (enumerated; sidecar commit-0 selects)

- **(α) Strengthen Pass 4** — change `excludedIds: []` to keep session-uniqueness; if exhausted, return null. Behavior change + SPEC §9.2 amendment required (or contract reframing if §9.2 was always meant to forbid within-session re-serves).
- **(β) Increase the seed bank** — add items so Pass 4's "unreachable with N items" assumption becomes empirically true at the desired confidence interval. Content/data change. Doesn't fix design drift-proneness — the bank-size assumption stays unencoded in code.
- **(γ) Reframe the invariant** — accept session-uniqueness as best-effort under fallback; amend the failing test + SPEC to reflect relaxed contract. Test-and-spec change.

Branches are NOT mutually exclusive in principle (a real fix could combine α + γ, or β as an interim while α lands, etc.). Sidecar commit-0 audit selects + justifies.

## Audit-step framework template (sidecar commit-0)

- **(a)** Round-anchor verify against then-current HEAD.
- **(b)** Re-verify §1.6 seed against then-current `selection.ts` / `queries.ts` (may have shifted between this stub's authoring and sidecar-open).
- **(c)** Read SPEC §9.2 verbatim. Capture totality contract + the "recency-excluded vs session-attempted" framing distinction.
- **(d)** Probe item bank size at then-current state (`select count(*) from items` grouped by sub_type × tier; the per-cell distribution is what matters, not the total).
- **(e)** Probe the unlucky-permutation surface: replicate the bug deterministically by seeding a known-bad sessionId/salt combination if possible (sidecar may need its own targeted rerun loop with smaller-N high-confidence reproduction).
- **(f)** Branch selection (α / β / γ / combination) with empirical + spec-citation justification.
- **(g)** Forward-pin: this sidecar opens before Option 1 (diagnostic-timing sidecar). Confirm ordering at then-current redirector handoff.

## Forward-pin

Sidecar opens after the tooling-reliability-debug round fully closes (currently §1 closing in this gate; §2 drizzle-kit CLI investigation still pending). Slots in front of Option 1 (diagnostic-timing sidecar) per redirector decision (Option II) at tooling-reliability-debug §1 round-close.
