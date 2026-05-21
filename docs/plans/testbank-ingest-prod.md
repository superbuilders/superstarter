# Testbank Ingest — Production — Plan-Doc

Round: Testbank Ingest Prod.
Round-open hash: `74e6549` (HEAD at this commit-0; verified clean working tree, `origin/main...HEAD = 0 0`).
Round-close hash: this commit (C7).
**Round status: CLOSED-PARTIAL.** Data-side goal achieved (prod items=2150, embeddings=100%). Functional verification of `/diagnostic/run` deferred to a follow-up round (`auth-oidc-restore`) because Vercel OIDC Federation was disabled at the project level mid-round, breaking runtime IAM-auth for any DB-touching route — see §1.6 and §0.11 R-vercel-oidc-disablement-cause-unknown.

> Narrow operational round (9 ledger commits per the schema-divergence
> sub-round expansion — C1, C2, C2.5b, C3, C4, C5, C5.5b, C6, C7; plus
> three doc-patch commits C0/C0.5/C2.5a not counted in the ledger).
> Plan-doc shape is the lightweight scaffold established by
> `docs/plans/user-question-reports.md` — full §0 metadata, condensed
> per-commit ledger, retained per-commit stop-and-report gates.

> **Strategy β confirmed at commit-0 follow-up:** dump preserves embeddings
> (mechanical simplicity at C1/C2/C3), then C4 deliberately wipes prod
> embeddings to NULL so the C5 backfill script exercises against real NULL
> rows. Trade-off: ~$5-10 OpenAI cost and one extra destructive-operation
> gate, in exchange for operational confidence in the backfill path. See
> §0.7 for the second §6.14.31 gate this introduces and §1.4 for the C4
> commit shape.

> **Schema-divergence sub-round triggered at C3 (2026-05-12):** C3
> `pg_restore` failed on `items.rejected_by → users.id` FK violation —
> 7 local rows with `rejected_by = 726e433e-...` (local-Leo UUID) had no
> FK target in prod's `users` table (which holds only prod-Leo at
> `cb54eeab-...`; same human, different OAuth provisionings). Strategy B
> adopted: NULL out `rejected_by` on local at C2.5b, re-dump, restore
> prod, then restore local `rejected_by` at C5.5b from a captured backup
> CSV. C2.5a is this plan-doc patch. The pre-authorized
> `schema-divergence-sub-round` (§0.10) has been REALIZED; see §1.2.5a /
> §1.2.5b / §1.3.A / §1.5.5b for ledger details and §3.4 for the
> candidate pattern this surfaced.

---

## §0 Round metadata

### §0.1 Round name + hashes

- **Name:** Testbank Ingest Prod.
- **Open hash (empirical, verified at commit-0):** `74e6549` — `docs(plans): populate deployment-runbook round-close (follow-up to e44cac9)`.
- **Concurrent rounds:** none open. The deployment-runbook round closed at `e44cac9` + follow-up `74e6549`. The user-question-reports round is paused. This round opens against a quiescent main.
- **Target close hash:** TBD (this plan-doc is commit-0; close commit will populate).

### §0.2 Trigger

Production GET `/diagnostic/run` returns a Vercel runtime 500 (digest `2170494947`). Stack trace via `vercel logs --environment production --no-branch --since 24h --expand --level error`:

```
Error: resumed session '019e19ad-23f4-7918-b585-f49defc54a3c'
  digest: '2170494947',
  [cause]: Error: first item could not be selected
```

Preceded by:

```
{"slot":{"subTypeId":"verbal.sentence_completion","difficulty":"medium"},
 "msg":"getNextFixedCurve: no item available even after full fallback chain"}
```

`startSession` (resumed-session branch, `src/server/sessions/start.ts:188`) and the new-session branch (`:278`) both throw `ErrFirstItemMissing` when `getNextItem` returns undefined. Root cause: the production `items` table is empty. Confirmed by direct probe (§0.5 below): `SELECT COUNT(*) FROM items` returns 0.

The deployment-runbook round shipped sub_types (14) and strategies (42) via `bun db:seed`, but never ran `bun db:seed:items` or any of the OCR-pipeline scripts against prod — see [phase5-testbank-re-extraction round close summary](phase5-testbank-re-extraction.md) for the full bank-ingest tooling. Local Docker postgres has 2,150 rows (448 live) from earlier runs of that pipeline. This round copies that bank to prod.

### §0.3 Scope (in-scope)

Three operations against the production `items` table:

1. **Dump** the full `items` table (all 2,150 rows; data only) from local Docker postgres on port `54320` to a single file under `/tmp/`.
2. **Restore** that file into the production RDS `items` table via `pg_restore` (or raw `psql`, depending on dump format chosen at C2).
3. **Backfill embeddings** on prod via `scripts/backfill-missing-embeddings.ts` — operationally a no-op if the dump preserves the `embedding` column (local has 100% coverage, see §0.5), but run anyway as a cheap idempotent verification step.

### §0.4 Anti-scope (explicit)

- **NOT** dumping `sub_types`, `strategies`, `users`, `accounts`, `sessions`, `practice_sessions`, `attempts`, `item_admin_actions`, `item_user_reports`, or any other table. Items only.
- **NOT** modifying the OCR pipeline (`scripts/import-questions.ts`, `scripts/generate-explanations.ts`). The pipeline ran against local; we do not re-run it in this round. The phase5-testbank-re-extraction round already shipped that work and produced the rows we are about to copy.
- **NOT** authoring new ingest tooling. We use existing `pg_dump` / `pg_restore` (system tooling) plus the existing `scripts/backfill-missing-embeddings.ts`.
- **NOT** adjusting `src/config/diagnostic-mix.ts` based on prod observability. Diagnostic-mix balance changes are out-of-scope; this round is "make `/diagnostic/run` not 500."
- **NOT** addressing the `start.ts:84-89` stale comment about the "future testbank-re-extraction round" (the round already shipped 2026-05-06 at `2f7b2c8`). Banked as drift; cleanup is a separate trivial commit if/when somebody passes by.
- **NOT** addressing the orphaned platform-team `purveyor` ECS/ALB/ECR companion resources in this AWS account. The RDS instance was already deleted by Leo at 2026-05-11 22:53Z; companion resources are Terraform-managed by an external team and out of our IaC's scope.
- **NOT** wiring up cron-ingest, scheduled re-extraction, or admin-portal "import items" UI. Future-rounds.

### §0.5 Empirical audit findings (verbatim)

Audit performed at HEAD = `74e6549`. Findings classified per redirector rubric: **PRESENT / DIVERGENT / ABSENT / DOC-WRONG**.

#### A. Source files in scope

| Claim | Status | Notes |
|---|---|---|
| `scripts/backfill-missing-embeddings.ts` | PRESENT | 140 lines. Imports `@/env` at line 23 (so env validation at startup). Calls `createAdminDb()` from `@/db/admin`, calls `embedText` from `@/server/generation/embeddings`. CLI accepts `--limit N` and `--help`. EXEMPT FROM PROJECT RULESET (uses `console.log`). |
| `src/db/admin.ts` | PRESENT | `createAdminDb()` returns an `AsyncDisposable` `{ db: Db }`. Branches on `env.DATABASE_LOCAL_URL`: if set → local Docker pool via `connectionString`; else → RDS pool via `fetchAdminSecret()` + `RDS_CA_BUNDLE` + admin username/password from secret. **This is the env-routing surface that determines whether the script targets local or prod.** |
| `src/db/admin-secret.ts` | PRESENT | `fetchAdminSecret()` requires both `env.DATABASE_ADMIN_SECRET_ARN` and `env.AWS_ROLE_ARN`. Uses `awsCredentialsProvider({ roleArn })` from `@vercel/oidc-aws-credentials-provider`. **For local execution against prod, the executor needs the role-assumption to succeed without an OIDC token — confirm at C5 pre-flight whether iac-admin static creds are sufficient or whether DATABASE_LOCAL_URL needs to be unset and the script invoked under a different mechanism.** |
| `src/db/schemas/catalog/items.ts` | PRESENT | Schema is identical between local and prod (both built from the same drizzle migrations). Required columns: `id` (uuidv7 default), `sub_type_id` (FK → `sub_types.id`), `difficulty` (enum), `source` (enum), `status` (enum, default `candidate`), `body` (jsonb), `options_json` (jsonb), `correct_answer` (varchar(64)), `metadata_json` (jsonb, default `'{}'::jsonb`). Optional: `explanation`, `strategy_id` (FK → `strategies.id`), `embedding` (vector(1536)), `source_folder`, `source_filename`, `rejected_at_ms`, `rejected_by` (FK → `users.id` ON DELETE SET NULL), `rejection_reason`. |
| `pg_dump` | PRESENT | `/usr/bin/pg_dump`, version `18.1` (Ubuntu 18.1-1.pgdg22.04+2). Both source (local Docker) and target (RDS) are postgres 18.3. Client 18.1 against 18.3 server is forward-compatible per PostgreSQL versioning policy. |
| `pg_restore` | PRESENT | `/usr/bin/pg_restore`, version `18.1`. |

#### B. Local DB state (`postgres://postgres:postgres@localhost:54320/postgres`)

| Probe | Value |
|---|---|
| `SELECT COUNT(*) FROM items` | **2150** |
| `SELECT status, COUNT(*) FROM items GROUP BY status` | `live: 448`, `candidate: 1695`, `rejected: 7` |
| `SELECT COUNT(*) FROM items WHERE embedding IS NULL` | **0** (100% coverage) |
| `SELECT version()` | PostgreSQL **18.3** on x86_64-pc-linux-gnu (Debian) |
| `SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector','pgcrypto')` | `vector: 0.8.2`, `pgcrypto: 1.4` |

#### C. Production DB state (`superstarter-main-db.cyhk02a6cfpn.us-east-1.rds.amazonaws.com:5432`)

Probed via the §H.4 admin-secret pattern (iac-admin → SecretsManager → master password → psql).

| Probe | Value |
|---|---|
| `SELECT COUNT(*) FROM items` | **0** ← the target of this round |
| `SELECT COUNT(*) FROM sub_types` | **14** ← matches local; FK targets present |
| `SELECT COUNT(*) FROM strategies` | **42** ← matches local; FK targets present |
| `SELECT version()` | PostgreSQL **18.3** on aarch64-unknown-linux-gnu (RDS) |
| `SELECT extname, extversion FROM pg_extension` (vector, pgcrypto) | `vector: 0.8.1`, `pgcrypto: 1.4` |

#### D. Vector extension version skew — **DIVERGENT (non-blocking)**

Local has `vector 0.8.2`; prod has `vector 0.8.1`. Both are `0.8.x`. The `embedding` column is declared `vector(1536)` (dimension-only); the on-disk text representation of a vector value is `[v1,v2,...]` and is stable across patch versions of pgvector 0.8.x. Dump portability is unaffected. **Banked as a non-blocking divergence; not a C3 gate.**

If a future round upgrades to pgvector 0.9.x or 1.0.x, that would change the on-disk format (HNSW index format, halfvec types, etc.) and would require a coordinated upgrade — but that's not this round's problem.

#### E. `.env.local` shape

`.env.local` exists at repo root (2,113 bytes, modified 2026-05-11 19:04). The grep audit was permission-denied at this commit-0. **Pre-flight check at C5: executor must verify `.env.local` carries DATABASE_HOST + DATABASE_ADMIN_SECRET_ARN + AWS_ROLE_ARN + OPENAI_API_KEY pointing at the prod values, or invoke `bun --bun vercel env pull .env.local` against the production environment to refresh.** Decision deferred to C5.

### §0.6 Doc-vs-empirical reconciliation (handoff drift surfaced at audit)

| # | Handoff claim | Empirical | Action |
|---|---|---|---|
| 1 | §E.2: `purveyor` RDS live with unknown owner, ~$11/month | Already deleted 2026-05-11 22:53Z by iac-admin (Leo). CloudTrail confirms. | None this round. Banked. |
| 2 | §E.3: production items table empty (0 items) | Confirmed 0 rows at 2026-05-12 00:50Z. | This round populates. |
| 3 | `start.ts:84-89` references "future testbank-re-extraction round" | The round shipped 2026-05-06 at `2f7b2c8`. Comment is stale. | None this round. Banked as drift. |
| 4 | §E.2 mentions purveyor companion ECS/ALB/ECR resources | Per CloudTrail, the platform-team's purveyor stack created (root via Terraform 2026-03-13) included ECR repos + ECS cluster + ECS service + ALB + target group alongside the RDS instance. RDS gone; companion resources presumably still up. | None this round. Banked as `R-purveyor-companion-resources-still-up`. |
| 5 | "all 9 expected prod env vars present" | Confirmed at the prior audit; no change at this commit-0. | None. |

### §0.7 Destructive-operation surface

**Three destructive operations** (expanded by the schema-divergence sub-round at C2.5):

1. `pg_restore` against production `items` at C3 [§6.14.31 gate 1]
2. `UPDATE items SET embedding = NULL` against production at C4 [§6.14.31 gate 2 — strategy β]
3. `UPDATE items SET rejected_by = NULL WHERE rejected_by IS NOT NULL` against **local** at C2.5b (NEW — schema-divergence sub-round; **NO §6.14.31 gate** — local-only, captured backup CSV at `/tmp/rejected_by_backup.csv` makes it trivially reversible at C5.5b)

- **C3 pre-state:** prod `items` table is empty (`COUNT = 0` confirmed at §0.5). INSERTs only; no UPDATE/DELETE/TRUNCATE.
- **C3 §6.14.31 confirmation gate (gate 1):** REQUIRED before C3. The plan-doc records this gate. Executor must STOP at C3 and obtain Leo's explicit "yes go" before running `pg_restore` against the prod RDS endpoint.
- **C4 destructive op (per strategy β):** `UPDATE items SET embedding = NULL` against prod. Fully reversible — the dump file at `/tmp/items.dump` (post-C2.5b regeneration) is retained through round-close as the rollback source. The embeddings will be re-populated at C5 by `scripts/backfill-missing-embeddings.ts`.
- **C4 §6.14.31 confirmation gate (gate 2):** REQUIRED before C4. Executor must STOP and obtain Leo's explicit "yes go" before running the UPDATE statement against prod.
- **C2.5b destructive op (per schema-divergence sub-round):** `UPDATE items SET rejected_by = NULL` against **local** Docker postgres. Reversible at C5.5b from `/tmp/rejected_by_backup.csv` (captured immediately before the wipe). Local-only mutation — no prod surface area, no §6.14.31 gate required (local DB is the executor's dev sandbox and the backup CSV is a deterministic restore source).
- **C5.5b restoration op (per schema-divergence sub-round close):** `UPDATE items SET rejected_by = <backup-uuid>` against **local** from the backup CSV. Returns local DB to its pre-C2.5b state for ongoing dev work.
- **Rollback (any failure point):** If C4 fails partway, no recovery needed (NULL is the intended state for any row touched). If C5 backfill fails partway, re-running it picks up remaining NULL rows. If full round must roll back: `TRUNCATE items` on prod, then re-restore from `/tmp/items.dump` (post-C2.5b — still carries the original embeddings) — no users have generated dependent data (no `attempts`, no `item_admin_actions`, no `item_user_reports`; the only prod user is Leo's first-sign-in row in `users`, which has no FK pointing into `items`). Local rollback is independent: `\copy` from `/tmp/rejected_by_backup.csv` (see §1.5.5b) recovers the 7 `rejected_by` UUIDs regardless of prod outcome.
- **C5 (`backfill-missing-embeddings.ts`)**: writes UPDATE `embedding = <vec>` for every row where `embedding IS NULL` (i.e., all 2,150 rows after C4 wipe). Recovery from the C4 wipe. Not itself destructive — populates a previously-NULLed column.
- **Round-spanning artifacts:** `/tmp/items.dump` (rollback source for prod) and `/tmp/rejected_by_backup.csv` (rollback source for local). Both retained through round-close.
- **No other destructive ops anticipated** in this round.

### §0.8 §6.14.31 gate placement summary

**Two gates (per strategy β).**

**Gate 1 — before C3 `pg_restore` execution.** Executor must:

1. Show the dump file path + size + line count + estimated row count to Leo.
2. Show the `pg_restore` (or `psql`) command verbatim including the prod hostname.
3. Wait for explicit "yes go" reply.
4. Execute.
5. Immediately re-probe `SELECT COUNT(*) FROM items` against prod and report.

**Gate 2 — before C4 `UPDATE items SET embedding = NULL` execution.** Executor must:

1. Confirm the `/tmp/items.dump` file is still present and intact (rollback source).
2. Show the UPDATE command verbatim including the prod hostname.
3. Wait for explicit "yes go" reply.
4. Execute.
5. Immediately re-probe `SELECT COUNT(*) FROM items WHERE embedding IS NULL` (expect 2150) and `SELECT COUNT(*) FROM items` (expect 2150 — no rows deleted) against prod and report.

### §0.9 Pre-flight readiness checklist (run at C1 boundary)

- [x] Local Docker postgres reachable at `localhost:54320` ← confirmed §0.5.B
- [x] Prod RDS reachable via admin secret ← confirmed §0.5.C
- [x] `pg_dump` and `pg_restore` present, version 18.1 ← confirmed §0.5.A
- [x] Local items count > 0 (2,150) ← confirmed §0.5.B
- [x] Prod items count = 0 ← confirmed §0.5.C
- [x] Prod sub_types and strategies seeded (FK targets exist) ← confirmed §0.5.C
- [x] Local embedding coverage = 100% ← confirmed §0.5.B (no NULL embeddings; under strategy β, C4 wipes prod embeddings to NULL so C5 backfill exercises against the full 2,150-row NULL set)
- [x] `OPENAI_API_KEY` configured in prod env vars ← per the prior env-var audit (handoff §D.5: all 9 vars present)
- [ ] `.env.local` carries DATABASE_HOST + DATABASE_ADMIN_SECRET_ARN + AWS_ROLE_ARN + OPENAI_API_KEY pointing at prod ← deferred to C5 pre-flight (see §0.5.E)
- [ ] iac-admin AWS creds active in current shell ← already true at commit-0 audit (`aws sts get-caller-identity` returned Account 496780244141 / iac-admin); re-verify at each commit boundary

### §0.10 Forward-watch entries

- **Sub-type 6 promotion candidate 2** (per `docs/plans/deployment-runbook.md` §0.10): held at 3/5 entering this round. The C3 FK miss is **NOT** a sub-type-6 deviation (sub-type 6 = redirector authoring against remembered-rather-than-verified conventions); it's a C2-audit-completeness gap, banked separately as §3.4 candidate. **No change to the 3/5 count.**
- **Pre-authorized §6.14.34 sub-rounds:**
  - `schema-divergence-sub-round` — **TRIGGERED at C3 (2026-05-12)** on `items.rejected_by → users.id` FK violation. Realized commits: §1.2.5a (this plan-doc patch — strategy B adoption), §1.2.5b (data-side: NULL out local `rejected_by`, capture backup CSV, re-dump), §1.5.5b (data-side: restore local `rejected_by` from CSV after prod restore success). Original trigger condition in commit-0 ("local rows have non-default `source_folder` or `metadata_json` shapes that the prod schema rejects") was incomplete — the actual FK-target-mismatch trigger generalizes the original.
  - `script-env-routing-sub-round` — triggers if `scripts/backfill-missing-embeddings.ts` fails at C5 because of an env-var routing issue (R-iac-env-local-contamination is a precedent). C-number reference shifted from C4 to C5 per strategy β ledger renumber.
  - `vector-extension-skew-sub-round` — triggers ONLY if pg_restore fails to load embedding values due to the 0.8.2-vs-0.8.1 patch-version difference (judgment: should not happen — see §0.5.D — but pre-authorize the sub-round so we can act immediately).
- **R-purveyor-companion-resources-still-up** — banked, not promoted. Future round may decide whether to chase the platform team for a teardown.

### §0.11 Forward-pin index

Populated at round-close (C7). Six R-* entries:

- **R-purveyor-companion-resources-still-up** — inherited from deployment-runbook handoff §E.2. Platform-team's Terraform-managed `purveyor` stack: ECR repos + ECS cluster + ECS service + ALB + target group still up in account 496780244141 even though the RDS instance was deleted 2026-05-11. Out-of-scope to chase; flag for any future cost-optimization or account-cleanup round.
- **R-strategy-linkage-unused** — surfaced at C2 audit. All 2,150 items have `strategy_id IS NULL` on local AND on prod. Prod's 42 strategies (seeded by `bun db:seed`) are unreferenced. Future round decides whether to populate strategy linkage or remove the strategies table entirely.
- **R-local-prod-rejected_by-divergence** — created at C2.5b (wipe) + C5.5b (restore-local-only). Local has 7 rows with `rejected_by = 726e433e-...` (local-Leo UUID); prod has 0 rows with non-null `rejected_by`. Intentional end-state per strategy B. Documents the local/prod asymmetry for any future user-merge round or schema-diff audit. Backup CSV at `/tmp/rejected_by_backup.csv` is no longer load-bearing post-C5.5b but stayed on disk through round-close.
- **R-vercel-oidc-disablement-cause-unknown** — NEW from C6 audit. Between C5 completion (~23:24Z) and Leo's C6 sign-in attempt (~23:38Z), Vercel OIDC Federation transitioned from enabled→disabled at the project level. Symptom: `awsCredentialsProvider` throws `"The 'x-vercel-oidc-token' header is missing from the request"` on any runtime path that calls IAM-authed RDS (which is every DB-touching route since `src/db/index.ts` uses RDS Signer). Cause unknown — possibly Vercel project recreation (project "Created 5h ago" but ID matches); possibly a Vercel platform-side toggle; possibly Leo manually disabling. Symptom-fix is "re-enable Federation in project settings"; root-cause investigation lives in `auth-oidc-restore` round.
- **R-script-log-verbosity** — banked from C5. `scripts/backfill-missing-embeddings.ts` emits ~5 Pino debug lines per row (10,758 lines for 2,150 items). Future runs at `LOG_LEVEL=info` would produce cleaner output. Minor; one-line CLI override at runtime suffices.
- **R-script-no-concurrency** — banked from C5. Backfill ran sequentially at ~437ms/row (15m39s wall-clock for 2,150 rows). For >10k future ingest, batched `embeddings.create({ input: [text1, text2, ...] })` would cut wall-clock ~10x. Minor for current scale; relevant if testbank grows substantially.

---

## §1 Commit ledger skeleton

Seven commits planned (per strategy β adopted at commit-0 follow-up — see top-of-doc note). Each commit gates on a stop-and-report.

### §1.1 C1 — Dump local items to /tmp/items.dump

**Operation:** `pg_dump --format=custom --data-only --table=items postgres://postgres:postgres@localhost:54320/postgres > /tmp/items.dump` (exact form to be finalized at C1; flags subject to verification of pg_dump 18.1 syntax for `--table` matching).

**Why custom format:** binary format preserves binary-encoded vector values cleanly; pg_restore lets us re-target the prod database without re-parsing SQL. Plain SQL format works too but requires careful handling of the `vector` type's text representation. Decision deferred to C1; document choice + rationale in C1's stop-and-report.

**Idempotency:** dumping local is read-only. Re-runnable.

**Verification (in C1's stop-and-report):**
- File exists at `/tmp/items.dump`
- File size > 0 (expected ~tens of MB given 2,150 rows × 1536-dim embeddings)
- `pg_restore --list /tmp/items.dump` shows TOC entries for `items` table data only (no `sub_types`, `strategies`, `users`, etc.)

**Commit message shape:** `docs(plans): testbank-ingest-prod C1 — dump local items table to /tmp/items.dump`. (The plan-doc records the operation; the dump file itself is in /tmp and not checked in.)

### §1.2 C2 — Verify dump file integrity

**Operation:** Inspect the dump file:
- Row count: `pg_restore --list /tmp/items.dump | grep -c 'TABLE DATA public items'` (expect 1) and total entries.
- For custom-format dumps, `pg_restore -f - /tmp/items.dump | wc -l` to count the SQL lines that would be emitted.
- Spot-check: extract first row, confirm `embedding` column is present and well-formed.
- Confirm absence of FK references to other tables (the dump is `--data-only --table=items`, so there should be no `INSERT INTO sub_types` or similar).

**Verification (in C2's stop-and-report):**
- 2,150 rows confirmed in dump
- No cross-table data
- Embedding column populated for all 2,150 rows in the dump

**Commit message shape:** `docs(plans): testbank-ingest-prod C2 — verify items dump integrity (2150 rows, embeddings preserved)`.

### §1.2.5a — Schema-divergence sub-round plan-doc patch [this commit]

**Trigger:** C3's first attempt failed on `items.rejected_by` FK violation (see §1.3.A). Strategy B adopted: NULL out local `rejected_by` pre-dump, restore post-prod-success.

**Operations (this commit):**
1. Patch top-of-doc with the schema-divergence sub-round blockquote.
2. Patch §0.7 to enumerate three destructive operations (added: local `UPDATE rejected_by = NULL` at C2.5b).
3. Patch §0.10 forward-watch: `schema-divergence-sub-round` flipped from "pre-authorized" to "TRIGGERED at C3 (2026-05-12)" with realized-commit cross-references.
4. Insert §1.2.5a (this section) and §1.2.5b (data-side wipe) into the ledger.
5. Insert §1.3.A failure-history into §1.3.
6. Insert §1.5.5b (restore local) into the ledger.
7. Bank §3.4 candidate pattern for the C2-audit-completeness gap.

**Verification (in C2.5a's commit message + stop-and-report):**
- Plan-doc diff shows localized changes only.
- `git diff` shows no unrelated file modifications.
- New ledger structure visible via `grep -nE "^### §1\." docs/plans/testbank-ingest-prod.md`.

**Commit message shape:** `docs(plans): testbank-ingest-prod schema-divergence sub-round — adopt strategy B (NULL rejected_by, restore local post-success)`.

### §1.2.5b — Wipe local rejected_by + re-dump + exhaustive FK re-audit [no git commit]

**§6.14.31 confirmation:** NOT REQUIRED (local-only mutation; backup CSV makes it trivially reversible).

**Operations:**
```bash
# 1. Capture pre-wipe state to a durable file (round-spanning rollback artifact)
psql postgres://postgres:postgres@localhost:54320/postgres -c "
  COPY (SELECT id, rejected_by FROM items WHERE rejected_by IS NOT NULL)
  TO STDOUT WITH CSV HEADER
" > /tmp/rejected_by_backup.csv

# 2. Verify backup captured all 7 rows (8 lines including header)
wc -l /tmp/rejected_by_backup.csv

# 3. Apply the wipe
psql postgres://postgres:postgres@localhost:54320/postgres -c "
  UPDATE items SET rejected_by = NULL WHERE rejected_by IS NOT NULL;
"

# 4. Confirm wipe complete
psql postgres://postgres:postgres@localhost:54320/postgres -c "
  SELECT COUNT(*) FROM items WHERE rejected_by IS NOT NULL;
"
# Expect: 0

# 5. Re-dump (overwrites prior /tmp/items.dump from C1)
pg_dump --format=custom --data-only --table=items --no-owner --no-privileges \
  -f /tmp/items.dump postgres://postgres:postgres@localhost:54320/postgres
```

**Exhaustive FK re-audit** (the C2 gap that produced this sub-round):

```bash
psql postgres://postgres:postgres@localhost:54320/postgres -c "
  SELECT
    tc.constraint_name,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'items' AND tc.constraint_type = 'FOREIGN KEY'
  ORDER BY tc.constraint_name;
"
```

For each FK row returned, verify `SELECT DISTINCT <source_column> FROM items WHERE <source_column> IS NOT NULL` ⊆ `SELECT id FROM <target_table>` against **prod**. Document the full FK list in C2.5b's stop-and-report (no hand-listed subset this time).

**Verification (in C2.5b's stop-and-report):**
- `/tmp/rejected_by_backup.csv` exists, 8 lines (1 header + 7 data rows).
- `SELECT COUNT(*) FROM items WHERE rejected_by IS NOT NULL` returns 0 on local.
- `pg_restore --list /tmp/items.dump | grep "TABLE DATA"` returns exactly one line for `public.items`.
- New `/tmp/items.dump` file size (will differ from 15,206,136 — 7 NULL fields take less space than 7 UUIDs; expect a few hundred bytes smaller).
- Exhaustive FK audit table: every FK on `items` listed, every per-FK source⊆prod check passes.

**No git commit:** the artifact is the regenerated `/tmp/items.dump` and the new `/tmp/rejected_by_backup.csv`. Both live in `/tmp` and are not checked in (per the dump-file convention from §1.1).

### §1.3 C3 — Restore dump to prod RDS [§6.14.31 gate 1]

**§6.14.31 confirmation REQUIRED before execution.** See §0.8 (gate 1).

#### §1.3.A First-attempt failure (2026-05-12)

The first C3 attempt **failed inside `--single-transaction`** with the FK violation:

```
pg_restore: error: COPY failed for table "items": ERROR:  insert or update on table "items" violates foreign key constraint "items_rejected_by_users_id_fk"
DETAIL:  Key (rejected_by)=(726e433e-6f44-4f9f-b661-6875f1d888e8) is not present in table "users".
```

The transaction rolled back cleanly; **prod items count remained 0** (no partial state). Wall clock: ~21s (network roundtrip + server-side rollback). Root cause and remediation are documented at the top-of-doc schema-divergence sub-round blockquote and §1.2.5a / §1.2.5b. After C2.5b regenerates `/tmp/items.dump` with `rejected_by = NULL` on the affected 7 rows, the C3 retry should succeed — the rejected-by FK constraint is now satisfied (NULL is permitted on that column).

The `--single-transaction` choice was load-bearing: without it, partial COPY rows would have been committed before the FK error fired, leaving prod in an indeterminate partial state requiring a manual `TRUNCATE items` to recover. Recommendation: keep `--single-transaction` on the retry as well.

**Operation:**
```bash
set +H
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id 'arn:aws:secretsmanager:us-east-1:496780244141:secret:rds!db-cdcdd9e3-3f74-43fa-9e11-42292f4fd2ed-HMVNfo' \
  --query SecretString --output text)
DB_PASS=$(echo "$SECRET_JSON" | jq -r .password)
PGPASSWORD="$DB_PASS" pg_restore \
  --host=superstarter-main-db.cyhk02a6cfpn.us-east-1.rds.amazonaws.com \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-owner \
  --no-acl \
  --data-only \
  /tmp/items.dump
```
(Exact flag set finalized at C3 after C1/C2 nail down the dump format.)

**Verification (in C3's stop-and-report):**
- `SELECT COUNT(*) FROM items` against prod returns 2,150
- `SELECT status, COUNT(*) FROM items GROUP BY status` matches local distribution exactly
- `SELECT COUNT(*) FROM items WHERE embedding IS NULL` against prod returns 0 (or, if not 0, document the count — under strategy β, C4 will null all rows anyway, so a partial-NULL state from C3 is observationally interesting but not a blocker; explain at C5).

**Commit message shape:** `docs(plans): testbank-ingest-prod C3 — restore items to prod RDS (2150 rows)`.

### §1.4 C4 — Wipe prod embeddings to NULL [§6.14.31 gate 2 — strategy β]

**§6.14.31 confirmation REQUIRED before execution.** See §0.8 (gate 2).

**Rationale:** strategy β. The dump preserves embeddings for mechanical simplicity through C1/C2/C3, then C4 deliberately wipes prod embeddings so the C5 backfill script exercises against real NULL rows. This trades ~$5-10 OpenAI cost and one extra destructive-operation gate for operational confidence in the backfill path — we want to know `scripts/backfill-missing-embeddings.ts` actually works in prod before relying on it for any future round.

**Operation:**
```bash
set +H
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id 'arn:aws:secretsmanager:us-east-1:496780244141:secret:rds!db-cdcdd9e3-3f74-43fa-9e11-42292f4fd2ed-HMVNfo' \
  --query SecretString --output text)
DB_PASS=$(echo "$SECRET_JSON" | jq -r .password)
PGPASSWORD="$DB_PASS" psql \
  "host=superstarter-main-db.cyhk02a6cfpn.us-east-1.rds.amazonaws.com port=5432 user=postgres dbname=postgres sslmode=require" \
  -c "UPDATE items SET embedding = NULL;"
```

**Verification (in C4's stop-and-report):**
- `SELECT COUNT(*) FROM items WHERE embedding IS NULL` against prod returns **2150** (the full row count).
- `SELECT COUNT(*) FROM items` against prod still returns **2150** (no rows deleted).
- The dump file at `/tmp/items.dump` is still present and intact (rollback source for the round).

**Commit message shape:** `docs(plans): testbank-ingest-prod C4 — wipe prod embeddings to NULL (strategy β setup for backfill)`.

### §1.5 C5 — Backfill embeddings on prod

**Pre-flight (this commit's first action):** verify `.env.local` carries DATABASE_HOST + DATABASE_ADMIN_SECRET_ARN + AWS_ROLE_ARN + OPENAI_API_KEY pointing at production. If any are missing or local-pointing, refresh via `bun --bun vercel env pull .env.local --environment=production` and confirm `DATABASE_LOCAL_URL` is **unset** in `.env.local` (the `createAdminDb()` branch in `src/db/admin.ts` keys on this).

**Operation:** `bun run scripts/backfill-missing-embeddings.ts`.

**Expected behavior:** the script logs `backfill-missing-embeddings: starting`, queries items where `embedding IS NULL`, finds **2,150 rows** (per strategy β — C4 wiped them all), processes them sequentially via OpenAI's `text-embedding-3-small`, exits cleanly. Expected cost per the strategy-β trade-off note: ~$5-10. **Actual cost (C7 round-close note): ~$0.0007.** The original ~$5-10 figure was off by ~4 orders of magnitude — the text-embedding-3-small model ($0.02/1M input tokens) plus short body text (~17 tokens/item average) made the round's embedding cost negligible. Wall-clock landed at 15m39s (vs 5-15min estimated).

**Verification (in C5's stop-and-report):**
- Script exit code 0
- Final `SELECT COUNT(*) FROM items WHERE embedding IS NULL` against prod returns 0
- Script's log output (count of items processed; expect 2150)

**Commit message shape:** `docs(plans): testbank-ingest-prod C5 — backfill embeddings on prod (2150 items)`.

### §1.5.5b — Restore local rejected_by from backup CSV [no git commit]

**Trigger:** schema-divergence sub-round close. C2.5b mutated local for prod-compat reasons; this returns local DB to its pre-C2.5b state for ongoing dev work.

**§6.14.31 confirmation:** NOT REQUIRED (local-only mutation, restoring from a deterministic backup file).

**Operations:**
```bash
# Apply the restore from backup CSV via a temp staging table
psql postgres://postgres:postgres@localhost:54320/postgres <<'SQL'
CREATE TEMP TABLE rejected_by_restore (id uuid, rejected_by uuid);
\copy rejected_by_restore FROM '/tmp/rejected_by_backup.csv' WITH CSV HEADER;
UPDATE items i
  SET rejected_by = r.rejected_by
  FROM rejected_by_restore r
  WHERE i.id = r.id;
SELECT COUNT(*) AS restored_count FROM rejected_by_restore;
SQL
```

**Verification (in C5.5b's stop-and-report):**
- `psql -c "SELECT COUNT(*) FROM items WHERE rejected_by IS NOT NULL;"` returns **7** (matches pre-C2.5b count).
- Spot-check: `SELECT id, rejected_by FROM items WHERE rejected_by IS NOT NULL ORDER BY id` matches `/tmp/rejected_by_backup.csv` row-for-row (or use a checksum: `md5sum` over both data sets).
- The 7 restored rows still carry `status = 'rejected'`, `rejection_reason IS NOT NULL`, `rejected_at_ms IS NOT NULL` — only `rejected_by` was wiped, so the rest of the rejection record stays intact through the round.

**No git commit:** the artifact is the restored local DB state. `/tmp/rejected_by_backup.csv` may be left in place or deleted at executor discretion after this step (it's no longer load-bearing).

### §1.6 C6 — Verification (functional smoke against prod)

**Operations:**
1. Re-probe prod `items`:
   - `SELECT COUNT(*)` — expect 2,150
   - `SELECT sub_type_id, difficulty, status, COUNT(*) FROM items GROUP BY 1,2,3 ORDER BY 1,2,3` — expect distribution matching local exactly (cross-check against the local distribution captured in §0.5.B)
   - `SELECT COUNT(*) FROM items WHERE status = 'live'` — expect 448
   - Spot-check the two slot configurations that produced the 500: `verbal.sentence_completion / medium` (expect 31 live) and `verbal.critical_reasoning / hard` (expect 11 live).
2. Functional smoke against `https://18seconds.vercel.app/diagnostic/run`:
   - Authenticate as Leo via Google OAuth.
   - Hit `/diagnostic/run`. Expect 200, expect first item to render, expect no Vercel runtime error page.
   - Submit one attempt. Expect submission to succeed.
3. Re-pull production logs:
   - `vercel logs --environment production --no-branch --since 30m --no-follow --level error` — expect zero new error events on `/diagnostic/run`.
4. Verify the original failing user's session can resume:
   - The session id from the original 500 (`019e19ad-23f4-7918-b585-f49defc54a3c`) belongs to user `cb54eeab-5132-458b-8d25-046ae20d2e9e` (Leo). After C3, that session's `getNextItem` lookup should find a row for the `verbal.sentence_completion / medium` slot. Confirm by manual `/diagnostic/run` hit (step 2).

**Verification (in C6's stop-and-report):** all four checks above pass.

**Commit message shape:** `docs(plans): testbank-ingest-prod C6 — verification (prod items=2150, /diagnostic/run returns 200)`.

#### §1.6.A C6 outcome (recorded at C7 round-close)

**Data-side checks (steps 1, 3): PASS.** Prod items=2150 ✓, embedding coverage=100% ✓, 14 sub_types populated ✓, status distribution matches local exactly (live=448 / candidate=1695 / rejected=7) ✓, `verbal.sentence_completion` live=61 + `verbal.critical_reasoning` live=59 — both original 500-blocking slots have ample coverage. `/api/health` 200, anonymous `/diagnostic/run` 302→/login.

**Functional smoke (step 2): BLOCKED.** Leo signed in via Google OAuth and was redirected to `https://18seconds.vercel.app/api/auth/error?error=Configuration` ("There is a problem with the server configuration. Check the server logs for more information."). The `/diagnostic/run` route was never reached because the auth callback failed first.

**Root cause (verbatim from prod logs at 23:38:54.86):**

```
{"level":50,"error":{"type":"Error","message":"The 'x-vercel-oidc-token' header is missing from the request. Do you have the OIDC option enabled in the Vercel project settings?",...},"host":"superstarter-main-db.cyhk02a6cfpn.us-east-1.rds.amazonaws.com","user":"app","msg":"rds iam auth token fetch failed"}
[auth][error] AdapterError: Read more at https://errors.authjs.dev#adaptererror
[auth][cause]: Error: Failed query: select "users"."id", ... from "users" inner join "accounts" on "accounts"."user_id" = "users"."id" where ("accounts"."provider" = $1 and "accounts"."provider_account_id" = $2) limit $3 params: google,111305886159585245443,1
```

The IAM-authed RDS pool in `src/db/index.ts` calls `awsCredentialsProvider({ roleArn })` from `@vercel/oidc-aws-credentials-provider`, which reads `x-vercel-oidc-token` from the runtime request context. That header is missing because Vercel OIDC Federation is not currently enabled at the project level. The AWS IAM trust policy on `superstarter-main-vercel` is correct (verified at C6 audit); the failure is on the Vercel side delivering the token. **Fix is a Vercel project-settings toggle, not a code or env change** — see R-vercel-oidc-disablement-cause-unknown in §0.11.

**Functional verification of `/diagnostic/run` is therefore deferred to a follow-up round (`auth-oidc-restore`).** The data-side proof-of-fix for the original 500 (digest 2170494947) is complete: prod has the 2,150 items the route's `getNextFixedCurve` lookup needs. The remaining smoke test (load route, render question, verify no Vercel error page) requires the OIDC issue to be resolved first.

**Step 4 (verify original failing user's session can resume): N/A** — same blocker.

### §1.7 C7 — Round-close

**Operations:**
1. Populate §0.11 forward-pin index with anything surfaced during C1-C6 that needs forward-tracking.
2. Populate this section's "ROUND-CLOSE STATUS" block.
3. Promote any §3 candidate patterns that hit promotion threshold.
4. Update sub-type 6 promotion candidate count if applicable.
5. `git push origin main` — first push of this round (per deployment-runbook convention: push only at round-close).

**Commit message shape:** `docs(plans): close testbank-ingest-prod round`.

---

## §2 Anti-scope reminders for executor

- **DO NOT** `pg_dump` without `--data-only --table=items`. A schema-bearing dump will conflict with prod's existing schema and risk DROP TABLE statements.
- **DO NOT** `pg_dump` other tables. The dump file should contain ONLY `items` data.
- **DO NOT** run `pg_restore` against prod without first showing the command + dump-file fingerprint to Leo and waiting for "yes go." This is §0.8 gate 1. Same applies for the C4 `UPDATE items SET embedding = NULL` (gate 2).
- **DO NOT** use `--clean` or `--if-exists` with `pg_restore`. Prod items table is empty at C3; a `--clean` flag would emit a DROP TABLE and break FK references.
- **DO NOT** modify the dump file by hand. If the dump is malformed, regenerate at C1, do not patch.
- **DO NOT** push commits to `origin/main` between C1 and C6. Push only at C7 round-close.

---

## §3 Candidate §6.14 patterns surfaced at commit-0

These are CANDIDATES, not promoted. Promotion to a numbered §6.14 entry happens at round-close if the pattern surfaces a second instance during this round, or if a round-close audit determines the pattern is general enough to merit pre-emptive promotion.

### §3.1 Candidate: "audit-prompts-should-include-resource-existence-preflight"

**Surface:** purveyor RDS audit. The handoff §E.2 listed purveyor as a live unknown-owner instance worth ~$11/month. The prior audit prompt had the auditor describe purveyor's attributes (engine, instance class, VPC, tags, creator) — but the instance had already been deleted ~3 hours before the audit ran. The audit had to discover this from a `DBInstanceNotFound` error, then pivot to CloudTrail to reconstruct what purveyor had been.

**Generalization:** when an audit prompt names a specific resource that may have changed state since the handoff was written, the prompt should open with a one-line existence check (`describe-X` for AWS, `kubectl get X` for k8s, `SELECT 1 FROM table` for DB rows) and branch on the result before surveying attributes.

**Distinct from existing §6.14:** §6.14.40 captures redirector-vs-empirical state divergence at the project state surface; this captures it specifically at the named-resource-existence surface, which is a sub-axis.

**Status:** instance #1. Not promoted.

### §3.2 Candidate: "post-deploy-data-seed-dependency-canary"

**Surface:** the deployment-runbook round shipped clean — schema migrated, env vars verified, OAuth working, `/api/health` returning 200, IAM-auth confirmed via the runtime DB connection. But the first content-dependent route (`/diagnostic/run`) 500'd because the data-ingest pipeline had never been run against prod. Verification at deploy-close was infrastructure-shaped (does it boot? does the DB respond? does auth work?), not data-shaped (does the bank have items? does a representative read query return rows?).

**Generalization:** post-deploy verification checklists should include a "first-content-fetch canary" that exercises the application's data dependencies, not just its infrastructure dependencies. For 18seconds specifically, "GET /diagnostic/run after auth" would have caught this immediately.

**Distinct from existing §6.14:** §6.14.10 (env-var pattern) covers env-shaped omissions; this covers data-seed-shaped omissions, which are a different category. Both deploy-time omissions, but different mitigation surface (env-var pre-flight vs. seed-pre-flight).

**Status:** instance #1. Not promoted.

### §3.3 Candidate: "pgvector-patch-version-skew-tolerance"

**Surface:** local has pgvector 0.8.2; prod has 0.8.1. Both 0.8.x patch versions; on-disk format is stable across the patch boundary. Banked as non-blocking at §0.5.D.

**Generalization:** when shipping data that depends on an extension's binary format, audit both ends's extension version and document the skew. For PostgreSQL extensions following semver discipline (which pgvector 0.8.x does), patch-version skews should be portable. Major-version skews require coordinated upgrade.

**Status:** documented at §0.5.D; banked. May or may not promote.

### §3.4 Candidate: "FK audits must be exhaustive over the source table's full FK set, derived from information_schema, not hand-listed by the redirector"

**Surface:** C2's prompt hand-listed `sub_type_id` and `strategy_id` as the FK columns to verify (per the prompt's step 6/7). C3 then failed on `items.rejected_by → users.id` — a FK that exists in the schema but was missing from C2's audit checklist. Recovery required the schema-divergence sub-round (§1.2.5a / §1.2.5b / §1.5.5b), expanding the round from 7 → 9 ledger commits.

**Generalization:** hand-listing FKs is brittle in two failure modes:
1. **Redirector-omission**: any FK not enumerated in the audit prompt is invisible to the audit, regardless of whether it would FK-violate at restore time.
2. **Silent drift on schema evolution**: when a new FK is added to the source table later, audits written against the old FK set are silently incomplete — typecheck/lint don't catch it because the audit lives in shell prompts, not code.

**The fix:** derive the FK list from `information_schema.referential_constraints` JOINed with `key_column_usage` and `constraint_column_usage`, then verify each FK programmatically. The query is small enough to embed in the prompt body:

```sql
SELECT tc.constraint_name, kcu.column_name AS source_column,
       ccu.table_name AS target_table, ccu.column_name AS target_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu USING (constraint_name)
JOIN information_schema.constraint_column_usage ccu USING (constraint_name)
WHERE tc.table_name = '<table>' AND tc.constraint_type = 'FOREIGN KEY';
```

This produces a stronger invariant — "all FKs verified" rather than "the FKs the redirector remembered."

**Distinct from existing §6.14:** §6.14.43 sub-type 6 covers redirector-vs-remembered-conventions. §3.4 covers redirector-vs-derivable-truth (the FK list is derivable from the schema; remembering it is the wrong tool). Different surface, different mitigation.

**Status:** instance #1 (the C3 FK miss in this round). **Banked at 1/5.** Promotion threshold to a numbered §6.14 entry is 3 instances or a round-close decision to pre-emptively promote based on the depth of the round-disrupting consequence (this round added 2 ledger commits + 1 doc patch + ~30 minutes of executor time, which is on the high-cost end of "audit gap" outcomes). **C7 round-close decision: HOLD AT 1/5** — round impact is consequential but not yet a 3-instance pattern; let the next round's audit work either reproduce or fail to reproduce before promotion.

### §3.5 Candidate: "local-CLI OIDC token in .env.local is independent of runtime OIDC Federation; local working ≠ runtime working"

**Surface:** C5 phase 5a audit verified that `VERCEL_OIDC_TOKEN` was set in `.env.local` (via `vercel env pull`), and concluded that `scripts/backfill-missing-embeddings.ts` would route correctly to prod RDS via the OIDC-based AWS credentials provider. The script then ran successfully end-to-end at C5 (15m39s, 2,150/2,150 backfilled). At C6, the same OIDC machinery failed inside Vercel runtime — the runtime never receives `x-vercel-oidc-token` because Federation is not enabled at the project level.

**Generalization:** Vercel issues OIDC tokens via two independent paths:
1. **Local-CLI path:** `vercel env pull` ships an OIDC token into `.env.local` for use by local scripts. Works regardless of project-level Federation setting.
2. **Runtime injection path:** Vercel injects per-request `x-vercel-oidc-token` headers into function invocations only when Federation is enabled at the project level.

These paths are independent. A local script can authenticate to AWS via OIDC successfully even when runtime OIDC is broken in prod. C5's success therefore did NOT prove C6 would work — they exercise different OIDC delivery mechanisms. Future rounds that use the "if local works, prod works" heuristic for OIDC-dependent code paths will have the same blind spot.

**Distinct from existing §6.14:** §6.14.10 covers env-var pattern errors (the wrong var or the right var with wrong value). §3.5 covers infrastructure-vs-runtime delivery-mechanism asymmetry where the same logical credential has two physically distinct delivery paths. Different surface; different mitigation (need to verify Federation toggle, not just env-var presence).

**Distinct from §3.1 (audit-prompts-resource-existence-preflight):** §3.1 addresses missing existence checks for named resources. §3.5 addresses non-equivalent execution contexts for the same code path (local Bun vs Vercel function runtime).

**Status:** instance #1 (the C5→C6 misleading-success). **Banked at 1/5.** Hold pending second instance.

---

## §4 Commit-0 stop-and-report shape

Required entries in the commit-0 stop-and-report:

1. Plan-doc path + line count (the file just written).
2. §0.5 audit summary by status: PRESENT / DIVERGENT / ABSENT / DOC-WRONG counts.
3. Local items count + status distribution.
4. Prod items count (must be 0).
5. Local embedding coverage (count of `embedding IS NULL` rows).
6. Tooling versions (pg_dump, pg_restore, source PG, target PG, pgvector source, pgvector target).
7. §0.6 reconciliation rows (verbatim).
8. §0.10 forward-watch entries (verbatim).
9. Commit SHA of this commit-0 plan-doc commit.
10. Modified anything besides the plan-doc? (must be "no")
11. Anything unexpected to flag for the redirector before C1?

## §5 Round-close stop-and-report shape (populated at C7)

Required entries in the round-close stop-and-report:

1. All commit SHAs (C1 through C7) with one-line summary each.
2. Final prod items count + status distribution (must match local 2,150 / 448-1695-7).
3. Final prod embedding coverage (must be 100% / 0 NULL rows).
4. C6 functional smoke result (`/diagnostic/run` returns 200, first item renders, attempt submission succeeds).
5. Final Vercel logs `--level error --since 1h --no-branch` against `/diagnostic/run`: expect zero new errors after C3.
6. §3 candidate patterns: which (if any) promoted? Which banked?
7. Sub-type 6 promotion candidate 2 final count after this round.
8. §0.11 forward-pin index entries (any new R-* entries to track).
9. Round-close commit SHA.
10. `git push origin main` confirmation.

---

## §6 ROUND-CLOSE STATUS — populated at C7

**Status: CLOSED-PARTIAL.** Data-side success; functional verification deferred to `auth-oidc-restore` round.

### §6.1 Commit ledger (actual)

| C# | SHA | Description | Type |
|---|---|---|---|
| C0 | `8e2f67f` | open testbank-ingest-prod plan-doc with commit-0 empirical audit | doc patch (not in 9-commit ledger) |
| C0.5 | `9c405ea` | adopt strategy β — wipe prod embeddings before backfill | doc patch (not in 9-commit ledger) |
| C1 | (no git) | dump local items to `/tmp/items.dump` (15,206,136 bytes, 2150 rows, embeddings preserved) | data op |
| C2 | (no git) | verify dump integrity + schema parity local↔prod (17 cols, 14 sub_types, 4 indexes match) | read-only audit |
| C2.5a | `8a74165` | schema-divergence sub-round plan-doc patch — adopt strategy B (NULL rejected_by, restore local post-success) | doc patch + ledger entry |
| C2.5b | (no git) | wipe local `rejected_by` (7 rows) → re-dump (15,205,540 bytes) → exhaustive 3-FK re-audit | data op |
| C3 first | (no git) | pg_restore — FAILED on `items_rejected_by_users_id_fk`; --single-transaction rolled back cleanly; prod unchanged at 0 rows | data op (rolled back) |
| C3 retry | (no git) | pg_restore (post-C2.5b dump) — SUCCESS, 27.270s, 2150 rows inserted with embeddings | data op |
| C4 | (no git) | UPDATE prod `items SET embedding = NULL` — SUCCESS, 5.987s, UPDATE 2150 | data op |
| C5 phase 5a | (no git) | audit script + .env.local routing — verdict GREEN | read-only audit |
| C5 phase 5b | (no git) | execute `bun run scripts/backfill-missing-embeddings.ts` — SUCCESS, 15m39s, 2150/0 backfilled/failed | data op |
| C5.5b | (no git) | restore local `rejected_by` from `/tmp/rejected_by_backup.csv` — SUCCESS, BEGIN/COPY 7/UPDATE 7/COMMIT | data op |
| C6 | (no git) | functional verification — data-side PASS; functional smoke BLOCKED by Vercel OIDC Federation disablement (see §1.6.A) | read-only audit (partial) |
| C7 | this commit | round-close: populate §0.11 forward-pin index, §6 ROUND-CLOSE STATUS, §3.4/3.5 candidate decisions, fix §1.5 cost estimate, mark §1.6 deferred | doc patch |

### §6.2 Data outcomes (final state)

| Metric | Pre-round | Post-C5 | Final |
|---|---|---|---|
| Prod `items` row count | 0 | 2150 | **2150** ✓ |
| Prod embedding coverage | n/a | 100% (2150/2150) | **100%** ✓ |
| Prod sub_types referenced | n/a | 14/14 | **14/14** ✓ |
| Prod `rejected_by` non-null | 0 | 0 | **0** (intended per strategy B) |
| Prod `users` count | 1 (cb54eeab — ryoi360@gmail.com) | 2 (added 24802ad9 — leonardiwata@gmail.com mid-round) | **2** |
| Local `items` row count | 2150 | 2150 | **2150** (unchanged) |
| Local embedding coverage | 100% | 100% | **100%** (unchanged) |
| Local `rejected_by` non-null | 7 | 0 (post-C2.5b) | **7** (restored at C5.5b) |

### §6.3 Functional outcomes

- `/diagnostic/run` data prerequisite **MET** — the route's `getNextFixedCurve` lookup now finds rows for every diagnostic-mix slot, including the two original 500-blocking slots (`verbal.sentence_completion`, `verbal.critical_reasoning`).
- `/diagnostic/run` functional smoke **BLOCKED** — Vercel OIDC Federation disablement breaks any DB-touching auth path. See §1.6.A and R-vercel-oidc-disablement-cause-unknown.
- Original Vercel error digest `2170494947` (data-side: ErrFirstItemMissing): **resolved** — data-side prerequisites for the failing code path are now in place. Empirical re-verification awaits OIDC restoration.

### §6.4 §6.14.31 gates fired

3 gate confirmations during this round:

1. **Gate 1, first fire:** before C3 first attempt (pg_restore against prod). Confirmed by Leo. Restore failed on FK violation, rolled back cleanly.
2. **Gate 1, re-fire:** before C3 retry (pg_restore post-C2.5b regeneration). Confirmed by Leo. Restore succeeded.
3. **Gate 2:** before C4 (UPDATE prod `embedding = NULL`). Confirmed by Leo. UPDATE 2150 succeeded.

### §6.5 Sub-rounds fired

1. **schema-divergence-sub-round** — pre-authorized in §0.10; FIRED at C3 first-attempt failure; CLOSED at C5.5b. Realized cost: 1 git commit (C2.5a) + 2 data ops (C2.5b, C5.5b) + 1 forensic subsection (§1.3.A). Trigger generalized from "non-default `source_folder` / `metadata_json` shapes" to "any FK-target mismatch" — see §0.10 update.

The two other pre-authorized sub-rounds (`script-env-routing-sub-round`, `vector-extension-skew-sub-round`) did NOT fire.

### §6.6 Cost ledger

| Item | Cost |
|---|---|
| OpenAI text-embedding-3-small (2,150 items × ~17 input tokens avg) | ~$0.0007 |
| RDS billing during round (~5h × ~$0.50/day) | ~$0.10-0.15 |
| Vercel function invocations (4-5 hits during audits) | ~$0.00 (within free tier) |
| **Total** | **<$0.20** |

The plan-doc's pre-round estimate of "~$5-10" (top-of-doc strategy β note + §1.5) was off by ~4 orders of magnitude. §1.5 is updated with the actual figure.

### §6.7 §6.14.43 sub-type 6 deviation count

- Entering round: **3/5** (held from deployment-runbook close per §0.10).
- Deviations during this round:
  - **Dev-1 at C2.5a:** redirector hand-listed candidate-pattern section as `§10.8` while plan-doc uses `§3.x` numbering. Re-mapped to §3.4 in the actual edit. Surfaced at C2.5a stop-and-report flag #1. Sub-type-6 instance: redirector authoring against remembered-rather-than-verified plan-doc shape.
- **Cumulative: 4/5.** Promotion candidate 2 HOLDS at 4/5. **One more sub-type-6 deviation in any future round triggers promotion at that round's close.**

### §6.8 §3 candidate-pattern decisions

| § | Title | Status |
|---|---|---|
| §3.1 | audit-prompts-should-include-resource-existence-preflight | Banked at 1/5 (purveyor audit). HOLD. |
| §3.2 | post-deploy-data-seed-dependency-canary | Banked at 1/5 (the original 500). HOLD. |
| §3.3 | pgvector-patch-version-skew-tolerance | Banked at §0.5.D as non-blocking. HOLD. |
| §3.4 | FK audits must be exhaustive over the source table's full FK set, derived from information_schema | Banked at 1/5 (C3 first-attempt failure). HOLD. |
| §3.5 | local-CLI OIDC token in .env.local is independent of runtime OIDC Federation; local working ≠ runtime working | Banked at 1/5 (C5→C6 misleading-success). HOLD. |

No promotions. Five distinct candidates banked across 1-instance evidence. Promotion threshold remains 3 instances or pre-emptive round-close decision based on consequence depth.

### §6.9 Wall-clock + working-time

- Round opened at C0 (`8e2f67f`) at ~2026-05-12 00:13 UTC (timestamp from commit metadata).
- Round closes at C7 at ~2026-05-12 04:50 UTC (this commit).
- Total elapsed: ~4h 37min.
- Net executor work-time (excluding stop-and-report human-loop pauses): ~3h.

### §6.10 Push status

`git push origin main` executed at C7 round-close per the deployment-runbook convention (push-once-at-round-close, not per-commit). Post-push `git rev-list --left-right --count origin/main...HEAD` returns `0 0`.

### §6.11 Successor round

**`auth-oidc-restore`** — open against this commit's HEAD when the redirector authors it. Scope: re-enable Vercel OIDC Federation at the project level, root-cause the disablement event (R-vercel-oidc-disablement-cause-unknown), then re-run the C6 functional smoke from this round to close the proof-of-fix loop on the original `2170494947` digest.
