# drizzle-kit migrate CLI investigation — empirical summary

Distilled from raw `scripts/_logs/drizzle-kit-investigation.log` per `tooling-reliability-debug` round §2 commit 0. Raw log preserved locally, gitignored per `.gitignore` line 108 (`scripts/_logs/*.log`).

## Metadata

- **Round:** `docs/plans/tooling-reliability-debug.md` §2 commit 0
- **HEAD at probe execution:** `df4df7c`
- **Generated:** 2026-05-09 22:41 UTC (probe wall time ~600ms)
- **drizzle-kit version:** 0.31.10
- **drizzle-orm version:** 0.45.2
- **Bun version:** 1.3.10
- **Reproduction path:** no-op migration (loose `drizzle/0006_test_noop.sql` containing `SELECT 1;`), per redirector Option II
- **Reproduction outcome:** **NOT reproduced** — and the probe surfaced a methodology finding that explains why (see § Findings)

## Plain invocation

- **Command:** `bun db:migrate`
- **Exit code:** 0 (clean exit; both shim subcommand AND chained `db:push:programs` succeeded)
- **DB target:** local docker (shim selected `DATABASE_LOCAL_URL`-derived path; loaded from `.env`)
- **Stdio:** inherited end-to-end per `src/db/scripts/drizzle-kit-shim.ts:53-56` (`stdio: ["inherit", "inherit", "inherit"]`)

Output excerpts (verbatim, redacted to local user paths):

```
$ bun --bun run src/db/scripts/drizzle-kit-shim.ts migrate && bun run db:push:programs
[INFO] drizzle-kit-shim starting (local docker, DATABASE_LOCAL_URL set)
    args: [ "migrate" ]
No config path provided, using default 'drizzle.config.ts'
Reading config file '.../drizzle.config.ts'
Using 'pg' driver for database querying
[⣷] applying migrations...
[✓] migrations applied successfully!
$ bun --bun run src/db/scripts/push-programs.ts
[INFO] creating local docker admin pool
[INFO] applying database programs (count: 9)
[INFO] done
EXITCODE=0
```

## Verbose-flag probe matrix

**NOT iterated.** Per redirector heads-up: "If plain invocation SUCCEEDED (exit zero), DO NOT iterate verbose-flag probes; one success is the load-bearing finding." Plain invocation exited 0; no failing path to surface additional signal against. Verbose-flag iteration would have produced nothing because drizzle-kit had no work to do (see § Findings — methodology).

Verbose-flag landscape capture (audit step (e), capture-only):

| Mechanism | Available | Resolved |
|-----------|-----------|----------|
| `drizzle-kit --verbose` / `--debug` | **NO** — `drizzle-kit migrate --help` lists only `--config`, `--help`, `--version` | n/a |
| `NODE_DEBUG=*` env var | yes (Node.js standard) | not invoked |
| `DRIZZLE_LOGGER` env var | unverified at this gate (would require `grep -r` in node_modules) | not invoked |
| `NODE_OPTIONS=--trace-warnings` | yes (Node.js standard) | not invoked |
| Raw stderr capture | yes (already done via `2>&1` redirect) | invoked; no new signal |

The lack of any drizzle-kit-native verbose flag (`drizzle-kit migrate --help` exposes only `--config`) is itself a finding: the failure-mode opacity at `822a674` cannot be debugged via flag-only invocation. The sidecar's investigation will need different leverage (env-var probes, pg-side query log, or source-level instrumentation of drizzle-kit itself).

## Journal integrity (§6.14.31 destructive-operation-gate cycle)

| Phase | Hash |
|-------|------|
| Pre-probe (audit step (b)) | `5385521d609b6ad76a78a3460e3ccfe6ef9cba3af5236541099547b3707e53f3` |
| Post-probe (after `bun db:migrate`) | `5385521d609b6ad76a78a3460e3ccfe6ef9cba3af5236541099547b3707e53f3` |
| Post-cleanup (after `0006_test_noop.sql` removed) | `5385521d609b6ad76a78a3460e3ccfe6ef9cba3af5236541099547b3707e53f3` |

**Match: yes (all three identical).** Rollback Case **B variant** — drizzle-kit did not modify the journal at all (Case B was framed as "drizzle-kit failed, journal unmodified"; this is the success-but-no-engagement counterpart). No `drizzle/meta/0006_snapshot.json` was auto-generated either; `drizzle/meta/` listing is byte-identical pre/post-probe.

`git diff HEAD -- drizzle/meta/_journal.json` returns empty post-cleanup. Working tree clean.

## Findings

### Methodology finding (load-bearing)

**The no-op probe as designed could not exercise the failing code path from sidecar commit `822a674`.** Empirical observation:

- A loose `drizzle/0006_test_noop.sql` file is **silently ignored** by `drizzle-kit migrate`.
- `drizzle-kit migrate` is **journal-driven**, not file-system-driven: it reads `drizzle/meta/_journal.json` to determine which migrations to apply, then applies any not yet recorded in the DB's `__drizzle_migrations` table.
- The redirector spec's expectation (audit step (f)) — "drizzle-kit will (try to) update [`_journal.json`] during migrate" — is **empirically false**. `drizzle-kit migrate` only READS the journal; it does NOT write it. Journal-write is a `drizzle-kit generate` responsibility.
- A loose SQL file outside the journal is invisible to `migrate`. The "[✓] migrations applied successfully!" output is misleading: nothing was applied; everything was already at the journal's idx=5 head.

### Why the original `822a674` failure was not reproduced

The original failure was at applying `0005_amusing_microchip.sql`, which IS in the journal (idx=5, tag `0005_amusing_microchip`, when=`1778372218819`). The failure path engaged drizzle-kit's actual SQL-application logic against a journal-registered migration. The no-op probe never engaged that path because the no-op was not journal-registered.

### What the probe did and did not establish

- **Established:** drizzle-kit migrate's discovery path is journal-only; loose .sql files are silently ignored.
- **Established:** at HEAD `df4df7c`, the local DB is at the journal's head (idx=5). No backlog of unapplied migrations to expose drizzle-kit's per-migration SQL-application path.
- **NOT established:** whether the original `822a674` failure mode (`bun db:migrate` exit 1, opaque silence on `0005_amusing_microchip.sql`) is still reproducible at HEAD. Reproducing it requires either (i) a scratch DB rolled back to a state earlier than idx=5 (then re-migrating forward), or (ii) a properly-shaped journal entry for a new migration (which the redirector explicitly forbade authoring by hand at this gate).

### Branch 5 candidate status

Branch 5 (NEW per redirector heads-up — "drizzle-kit works against no-op; original failure was conditions-specific") is **technically supported** by exit-0 outcome but with a major caveat: the probe didn't exercise the failing path. The empirical claim is narrower than Branch 5's framing — it is "drizzle-kit doesn't fail on no-op observed-from-outside" not "drizzle-kit's SQL-application engine doesn't fail."

## Branch selection candidate

**Branch 3a + Branch 5 (intersection — narrower than either alone)** with explicit caveat:

- **Branch 3a (not reproducible without specific conditions; doc-only workaround):** the journal-driven discovery path means the original failure can only be reproduced from a DB state that has unapplied journal entries. Reproducibility requires scratch-DB setup outside the loose-SQL probe. Doc-only outcome is appropriate at this round.
- **Branch 5 (no-op succeeds; original failure was conditions-specific):** technically true (exit 0 observed) but tempered by the methodology finding — the probe didn't actually engage drizzle-kit's SQL-application path against a new migration.

**Not Branch 1** (verbose flags surfaced real error): drizzle-kit exposes no verbose flags; verbose-flag iteration was not run.

**Not Branch 2** (known upstream bug): no upstream issue search executed (would have been the next step if Branch 1 had iterated and surfaced something).

**Not Branch 3b** (build `scripts/dev/manual-migrate.ts`): the empirical evidence does not support reusable-tool effort. The original failure is one-occurrence; the no-op probe didn't reproduce; the manual-apply workaround at `822a674` was already a one-shot; no second occurrence has surfaced. Building the tool now would be premature per redirector Option Y (declined ride-along).

**Not Branch 4** (project-side fix surfaces directly): no error to fix at the project level; the shim is clean (stdio inherited, exit code forwarded, no swallowing).

## §6.14 reinforcements

- **§6.14.31 destructive-operation-gate template (second instance):** first instance was sidecar `822a674`'s manual-apply (the historical failure that motivated this residual). This gate's pre-state-hash + probe + post-state-hash + match-verify cycle is the second documented application. Template advances; pattern stable across two instances.
- **§6.14.18/21/22 reinforcement at redirector→executor boundary:** redirector spec's audit step (f) said "drizzle-kit will (try to) update [`_journal.json`] during migrate" — empirically false. Executor caught at probe-result-inspection step (not a stop-and-report; the spec explicitly framed both outcomes as diagnostic findings, so executing forward and surfacing the actual behavior was within-spec). Adds to the round's audit-first cohort (now: §0.9 reconciliation, §1 commit 1 gitignore catch, §1 commit 1 dead-reference catch, this gate's drizzle-kit-write-behavior catch).
- **NEW observation — methodology surfacing as primary finding:** when a reproduction probe doesn't reproduce the target bug, the probe's methodological learning IS the finding. This pattern surfaced at this gate; if it recurs, candidate for its own §6.14 entry around "investigation-shape probes that produce methodology findings instead of reproduction." Single-instance, forward-watch, no promotion.
