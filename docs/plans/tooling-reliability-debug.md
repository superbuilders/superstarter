# Plan — Tooling-Reliability Debug Round

> **Status: round opened 2026-05-09 against `main` at HEAD `b6e180d`** (Score-Based Target Goals Sidecar close commit). Sidecar-shape envelope; sequential §1 (bun-test flake) → §2 (drizzle-kit CLI opaque failure). Both targets are **investigation-shaped**, not implementation-shaped — branch outcomes are NOT pre-decided at commit 0; §1 and §2 bodies enumerate hypothesis space + decision branches, with the empirical work that selects among them deferred to commit 1+. Forward-pin: post-round, Option 1 (diagnostic-timing sidecar) opens.
>
> **Round shape commentary:** this is the second consecutive sidecar-shape round (the first being the score-goals sidecar, 585 lines / 5 commits, closed at `b6e180d`). If a third consecutive sidecar lands afterward (the planned diagnostic-timing sidecar), that hits the SPEC §6.14 promotion threshold (~3 occurrences) for a candidate pattern around "sidecar-as-default-narrow-scope-envelope." Tracked but not pre-promoted at this commit — single-instance reinforcement only.

---

## §0 — Commit-0 audit findings

Eight audit steps per the round-opening redline. Each finding ends with a positional conclusion (scope flag, decision-branch hint, or open question). All file paths are anchored to the repo root.

### §0.1 Round-anchor verify (audit step (a))

`git rev-parse HEAD` → `b6e180d8689483f1458bac81c4fe5f6829753a8a` ✓ matches handoff. `git log --oneline -6` confirms the last six commits match the score-goals sidecar ledger verbatim:

```
b6e180d docs(plan): close score-based target goals sidecar
0b4aee5 refactor(post-session,dashboard): retire dead percentile references (sidecar §3)
822a674 feat(db): drop users.target_percentile column (sidecar §2)
7ee5db9 docs(plan): author sidecar body sections + §5.1 commit-1 ledger entry
729a08e feat(post-session,actions): replace percentile target with score target (sidecar §1)
8ba0780 docs(plan,logs): close Round 2 logs + open score-based-target-goals sidecar
```

**Working-tree finding (deviation from handoff assumption):** tree is **NOT** clean. Nine modified dashboard files (`src/components/dashboard/*.tsx`, `src/server/dashboard/{mission,types}.ts`) + one untracked session log (`docs/claude_logs/session_2026-05-09_18-58_score-based-goals-sidecar.md`). The dashboard WIP appears orthogonal to this round's tooling-reliability scope — the modified file set is a distinct subsystem from drizzle-kit CLI or test-runner concerns. **Decision:** commit 0 will only stage the new plan-doc; the WIP and session log are NOT touched. Open question for redirector at stop-and-report: confirm WIP is intentional carry-forward or needs separate handling.

### §0.2 Residual #10 (bun-test flake) re-read against current state (audit step (b))

Both prior occurrences cited from project history:

- **Round 2 commit 14 (`69ea647`)** — 127/1 → 128/0 on rerun (per Round 2 plan-doc).
- **Score-goals sidecar commit 1 (`729a08e`)** — same shape: a single failure on first invocation, clean pass on rerun, no observable difference between the runs.

Single-run baseline at HEAD `b6e180d`:

```
128 pass / 0 fail / 645 expect() calls / 17 files / 2.09s
```

Matches handoff §10 expected baseline exactly. **No flake on this single audit-step invocation** — but per the established pattern, single-run cleanliness is not evidence of absence; the flake is an intermittent that surfaces on ~10-30% of invocations historically. The 20-30 iteration rerun loop is **deferred to §1 commit 1** per audit-step framework; commit 0 baseline is single-run only.

**Two occurrences = pattern threshold reached.** §1 investigation justified.

### §0.3 Residual #12 (drizzle-kit migrate CLI failure) re-read against current state (audit step (c))

Drizzle journal verified at `drizzle/meta/_journal.json` — last entry is idx=5, tag `0005_amusing_microchip`, timestamp `1778372218819`. Migration file present at `drizzle/0005_amusing_microchip.sql`, single line:

```sql
ALTER TABLE "users" DROP COLUMN "target_percentile";
```

**Manual-apply workaround artifact probe:** `find scripts -name "apply-0005*"` → empty. `scripts/_logs/` listing inspected; no apply-0005-manual artifact present. `git status --ignored scripts/` clean. **Conclusion: the workaround is ABSENT from disk** (not gitignored, not stashed — gone, consistent with handoff §11's "authored as one-shot, NOT committed" claim). If §2 lands on a branch that requires reproducing the manual-apply pattern (Branch 3 in §2.4), the workaround must be reconstructed; it is not recoverable from the working tree.

**`db:migrate` script captured verbatim from `package.json`:**

```
"db:migrate": "bun --bun run src/db/scripts/drizzle-kit-shim.ts migrate && bun run db:push:programs"
```

The migrate path goes through a **shim layer** at `src/db/scripts/drizzle-kit-shim.ts` (61 lines). The shim:

- Loads DATABASE_URL (local docker via `DATABASE_LOCAL_URL` or RDS via `fetchAdminSecret()`)
- Writes RDS CA bundle to a temp file for `NODE_EXTRA_CA_CERTS`
- Spawns `drizzle-kit ${args}` via `Bun.spawn` with `stdio: ["inherit", "inherit", "inherit"]`
- Forwards exit code to parent on non-zero exit (no swallowing)

**Empirical finding for §2 hypothesis space:** the shim does NOT swallow stderr/stdout — drizzle-kit's stdio is inherited end-to-end. The opaque silence observed at sidecar commit 2 came from **drizzle-kit itself** (or its child pg client), NOT the shim wrapper. This narrows §2.2 hypothesis space — the shim is not a candidate for the silence source.

### §0.4 drizzle-kit / drizzle-orm version capture (audit step (d))

`bun pm ls` filtered for drizzle:

```
drizzle-kit@0.31.10
drizzle-orm@0.45.2
@auth/drizzle-adapter@1.11.2
```

§2 investigation will use these versions for upstream issue search (Branch 2 + Branch 4 in §2.4). Versions locked at HEAD `b6e180d`; any §2 fix that requires a version bump must be gated carefully (destructive-operation framing per SPEC §6.14.31).

### §0.5 Pre-existing investigation tooling probe (audit step (e))

`scripts/dev/` exists. Current contents:

```
fmt, fmt-bug-repro.ts, fmt.ts, lint, lint.ts, retag-items.ts,
shared, smoke, style, style.ts, wipe-practice-data.ts
```

The directory is the established home for one-off + reusable dev-side tooling. If §2 selects Branch 3b ("build a reusable manual-migrate tool"), the natural landing path is `scripts/dev/manual-migrate.ts` — directory exists; no creation overhead.

### §0.6 §6.14 reinforcement-or-promotion candidates from setup (audit step (f))

- **§6.14.34 (mid-round narrow-scope sub-round insertion)** — this round itself is a §6.14.34 instance (narrow-scope insertion between sidecar close and Round 3 open). **Reinforcement only**, not promotion (already established-use per handoff §8).
- **§6.14.31 (destructive-operation gate template)** — applies if §2 selects Branch 3b (reusable manual-migrate tool, which writes journal rows + raw SQL = destructive). **Conditional reinforcement candidate**; reinforces only if that branch selects.
- **§6.14.42 (audit-step grep-verify-consumers)** — applies if §2 modifies the `db:migrate` script or replaces drizzle-kit's role in the migrate path. **Conditional candidate**; reinforces only if Branch 1 or Branch 4 lands a project-side fix that touches the shim or script wiring.
- **§6.14.40 (redirector-vs-empirical-state divergence)** — none surfaced at audit step. Both targets remain residual at HEAD; neither was already silently addressed by intervening commits. Tracked.

### §0.7 Test-count baseline for round-close comparison (audit step (g))

128 pass / 0 fail / 17 files / 645 expect() calls. Round-close §3 ledger will compare delta — expectation is **no change** unless §1 commit 1 isolates a specific test and adds a deterministic instrumentation/replacement (Branch 1 in §1.4) or §2 commit 1 adds tests around any project-side fix.

### §0.8 §6.14.40 retraction-context watch (audit step (h))

Both targets verified residual at HEAD (§0.2 + §0.3); no §6.14.40 retraction at audit step. **Forward watch:** if §1's rerun-loop investigation surfaces that the flake was *already* root-caused in some commit between residual authoring and HEAD (e.g., a prior dependency bump quietly fixed it but the residual list wasn't updated), that IS a §6.14.40 instance and should be promoted at round-close. Same applies to §2 if drizzle-kit's behavior at HEAD turns out to be silently corrected vs. the residual's authoring state.

---

## §1 — Target 1: bun-test flake (residual #10)

### §1.1 Pattern history

Two occurrences:

- **Round 2 commit 14 (`69ea647`)** — 127/1 on first invocation, 128/0 on rerun.
- **Score-goals sidecar commit 1 (`729a08e`)** — same shape.

Both: rerun produced clean pass with no source change between runs. The intermittent's identity (which test, which assertion, which timing window) was not captured in either prior occurrence's ledger entry. **§1 commit 1's first job: capture that identity empirically before any fix attempt.**

### §1.2 Hypothesis space

Investigation must distinguish among (non-exhaustive):

1. **Timing-sensitive test** — race in setup/teardown across test files, async cleanup leak, or shared-resource contention.
2. **Port conflict** — test DB / dev server overlap; tests assume a port is free that occasionally isn't.
3. **Snapshot ordering non-determinism** — a test that depends on Map/Set/object-key iteration order, or floating-point comparison sensitivity.
4. **Shared mutable state** — module-level state that bleeds between test files (especially given the codebase's preference for ESM modules over classes per SPEC, with module-level state).
5. **Bun test runner version-specific issue** — runner-side bug producing the spurious failure under specific scheduling conditions.
6. **Filesystem race** — temp file / fixture write-then-read race in a hot path.

### §1.3 Investigation shape — DO NOT pre-decide outcome

Audit-step-framed investigation across 1-N sub-commits:

- **Step A — rerun-loop capture:** invoke `bun test` 20-30 times consecutively in a tee'd loop (per SPEC §6.14.38 long-running command capture pattern), recording each run's pass/fail count, failed test name (if any), and elapsed time. Goal: estimate flake rate + identify whether a single test is responsible or the failure rotates across tests.
- **Step B — isolation:** if a specific test surfaces from Step A, run that test file in isolation across N invocations. If it still flakes in isolation, the cause is intra-file (timing inside the test or its setup). If it does NOT flake in isolation, the cause is cross-file (state bleed or shared resource).
- **Step C — instrument:** depending on Step B's narrowing, add targeted instrumentation (timing logs, resource handles, ordering assertions) to the suspect surface — without yet fixing.
- **Step D — branch decision:** Step A-C findings select among §1.4 branches.

### §1.4 Decision branches — enumerated, not selected at commit 0

- **Branch 1 — specific test isolated, deterministic root cause:** §1 commit 1 = focused fix to the test or the code-under-test (whichever owns the race / ordering / state issue). Audit framework per §1.5. Test count delta: typically 0 (fix changes assertion semantics, not test count) or +1 (regression test added).
- **Branch 2 — diffuse, not reproducibly isolatable in 20-30 iterations:** §1 commit 1 = README documentation of the rerun-loop empirical evidence + flake characterization, surfaced as a known-issue with mitigation guidance ("rerun before treating as regression"). No source change. Test count delta: 0.
- **Branch 3 — bun runner upstream issue:** §1 commit 1 = README docs + linked upstream Bun GitHub issue (or new issue file with reproduction). Possibly `package.json` engines pin if a specific Bun version stabilizes. Test count delta: 0.
- **Branch 4 — empirical evidence of silent prior fix:** if Step A produces 30/30 clean runs with no flake at all, that is a §6.14.40 retraction instance — residual #10 was silently resolved by some intervening commit. §1 commit 1 = round-close note + residual list update; no source change.

Branches are NOT mutually exclusive at the framing level — Step A's empirical data may select two (e.g., Branch 1 + Branch 4 for partial silent resolution).

### §1.5 Audit-step framework for §1 commit 1

- **(a) Round-anchor verify** — `git rev-parse HEAD` against §1's working anchor (`b6e180d` if §1 commit 1 is the first §1 commit; otherwise prior §1 commit hash).
- **(b) Rerun-loop output sanity** — re-confirm Step A's flake characterization is reproducible; capture which test (if any), how often, with what timing.
- **(c) Test-count delta** — should be 0 or +1 (regression test); any other delta requires explicit justification at commit message.
- **(d) Lefthook gate** — full lint/format/type-check passes before commit; per project's standing convention, no `--no-verify` shortcuts.

---

## §2 — Target 2: drizzle-kit migrate CLI opaque failure (residual #12)

> **Sequenced AFTER §1 fully resolves**, per round-opening directive. §2 investigation does NOT begin while §1 commits are unresolved.

### §2.1 Pattern history

Single occurrence at sidecar commit 2 (`822a674`):

- `bun db:migrate` exited with code 1 attempting to apply migration `0005_amusing_microchip.sql`.
- Stdio inherited (per §0.3); no SQL trace, no Drizzle parse error, no pg error message reached the user terminal.
- Workaround applied inline: `db.execute(sql\`ALTER TABLE ...\`)` directly + manual journal row insert with SHA-256 hash matching the migration file. Workaround artifact NOT committed (confirmed absent at audit §0.3).

One occurrence — **single-instance investigation**. Pattern threshold not yet reached, but Leo's directive treats the opacity itself as the residual (regardless of recurrence frequency).

### §2.2 Hypothesis space

- **drizzle-kit version-specific bug** — `drizzle-kit@0.31.10` may have a known opaque-failure mode for `ALTER TABLE DROP COLUMN` migrations, or a child-process error-handling regression.
- **Drizzle config / connection issue** — config loading or pg client construction fails before the SQL phase, surfacing only as exit-1 with no stderr.
- **Migration SQL parser interaction** — drizzle-kit's internal parser rejects or mishandles the migration SQL silently.
- **Underlying error swallowed by drizzle-kit's error handling** — drizzle-kit catches pg errors but logs only at a level not reaching stdio, OR routes them to a pino-style sink that's not configured.
- **Environment / RDS auth surface** — `NODE_EXTRA_CA_CERTS` path is correct (per shim), but a TLS handshake or auth failure exits without reaching the migration log path.

The shim itself is **NOT** a candidate (per §0.3 — stdio is inherited end-to-end, exit code is forwarded directly).

### §2.3 Investigation shape — DO NOT pre-decide outcome

- **Step A — verbose-flag retry:** invoke `bun db:migrate` with `DRIZZLE_DEBUG=1`, `NODE_DEBUG=*`, `DEBUG=*`, and any drizzle-kit verbose flag in current scope, individually and in combination. Capture full output. Goal: surface the swallowed error if it exists.
- **Step B — upstream issue search:** search `drizzle-team/drizzle-orm` GitHub issues for `0.31.10` opaque failures, `ALTER TABLE DROP COLUMN` regressions, and child-process exit-1 reports. Capture issue URLs and reproduction notes.
- **Step C — reproducibility probe:** the failing migration (0005) is **already applied** at HEAD. Reproducing the original failure requires either (i) rolling back via raw SQL on a scratch DB and re-running migrate, or (ii) authoring a no-op test migration (e.g., `ALTER TABLE x ADD COLUMN test_col_$pid; ALTER TABLE x DROP COLUMN test_col_$pid;`) and observing whether the same opacity surfaces. **Repro effort is non-trivial and gated on availability of a scratch DB or local docker reset.** If repro is infeasible in-round, Branch 3 selects.
- **Step D — branch decision:** Steps A-C findings select among §2.4 branches.

### §2.4 Decision branches — enumerated, not selected at commit 0

- **Branch 1 — verbose flags surface real error:** §2 commit 1 = upstream issue file with reproduction case (or PR if scoped to an obvious project-side misconfiguration). May involve a config or shim adjustment to surface the error in normal-mode. Test count delta: 0 typically.
- **Branch 2 — known upstream bug:** §2 commit 1 = README docs section ("Known issue: drizzle-kit migrate exits silently on X") + linked upstream issue + workaround pattern. Possibly version pin in `package.json` if a specific drizzle-kit version is known-good. Test count delta: 0.
- **Branch 3 — not reproducible without fresh DB / out-of-round repro effort:**
  - **Branch 3a:** §2 commit 1 = README docs of the manual-apply pattern observed at sidecar commit 2 (capturing the workaround mechanically: `db.execute(sql\`...\`)` + journal row construction with SHA-256 hash). No reusable tool. Test count delta: 0.
  - **Branch 3b:** §2 commit 1 = `scripts/dev/manual-migrate.ts` reusable tool that: (i) reads a target migration file, (ii) applies its SQL via `db.execute`, (iii) inserts the journal row with computed hash. Selected only if the pattern is judged likely to recur (≥2 occurrences anticipated). §6.14.31 destructive-operation-gate template applies — tool writes journal rows + raw SQL = destructive. §2 commit 1's audit-step framework MUST include destructive-gate (see §2.5).
- **Branch 4 — project-side fix surfaces:** §2 commit 1 = focused fix (config, shim adjustment, env var, version bump) that restores normal-mode visibility. No README needed (residual closes via fix). Test count delta: 0 or +1 (regression test for the fixed surface).

Branches are NOT mutually exclusive — Branch 3a + Branch 4 may both land if a partial fix surfaces but doesn't cover all originally-opaque cases.

### §2.5 Audit-step framework for §2 commit(s)

- **(a) Round-anchor verify** — `git rev-parse HEAD` against §2's working anchor (post-§1-close hash).
- **(b) drizzle-kit / drizzle-orm version verify** — confirm `0.31.10` / `0.45.2` unchanged. If Branch 4 bumps version, the bump is a destructive operation requiring §6.14.31 gate.
- **(c) §6.14.31 destructive-operation gate IF Branch 3b selects** — tool writes journal rows; reusable form means it can be invoked accidentally. Gate: explicit `--apply` flag default-off, dry-run default, journal-row preview before write, hash verification before journal insert.
- **(d) §6.14.42 grep-verify-consumers IF `db:migrate` script or shim modified** — confirm no other script or doc references the prior wiring shape. CI scripts, README, deployment docs all in scope.
- **(e) Lefthook gate** — full pass before commit; no `--no-verify`.

---

## §3 — Commit ledger

Populated as commits land. Anticipated shape: 0-2 implementation commits across §1 + §2 + 1 docs/round-close commit. May collapse to a single docs-only commit if both targets resolve to README-only branches (§1 Branch 2/3 + §2 Branch 2/3a). May expand to 4+ commits if both targets land project-side fixes (§1 Branch 1 + §2 Branch 4) plus docs.

| # | Hash | Subject | Target | Branch |
|---|------|---------|--------|--------|
| 0 | `<this commit>` | docs(plan): open tooling-reliability debug round | — | — |

---

## §4 — Round-close residuals (forward-pinned to next round)

Populated at round-close. Expected shape: any §1 or §2 sub-residuals that surface during investigation but are out-of-scope for this round (e.g., a related but distinct flake captured during §1 Step A, or a config-loading robustness gap surfaced during §2 Step A). Forward-pin destination: the diagnostic-timing sidecar (Option 1 per round-opening directive) or Round 3 review-section architecture, depending on residual subject.

---

## §5 — §6.14 promotion / reinforcement candidates

Conditional on §1 + §2 outcomes — populated at round-close. Pre-round candidates (per §0.6):

- §6.14.34 reinforcement (round structure itself).
- §6.14.31 conditional reinforcement (Branch 3b in §2 only).
- §6.14.42 conditional reinforcement (Branch 1/4 in §2 if shim or script wiring touched).
- §6.14.40 conditional reinforcement (Branch 4 in §1 if silent prior fix surfaces).
- **Sidecar-as-default-narrow-scope-envelope** — single-instance reinforcement at this commit (second consecutive sidecar). Promotion gate: third consecutive sidecar (planned diagnostic-timing sidecar post-round). Track at round-close; do not pre-promote.
