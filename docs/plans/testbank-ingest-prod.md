# Testbank Ingest — Production — Plan-Doc

Round: Testbank Ingest Prod.
Round-open hash: `74e6549` (HEAD at this commit-0; verified clean working tree, `origin/main...HEAD = 0 0`).
Target close hash: TBD.

> Narrow operational round (5-6 commits). Plan-doc shape is the lightweight
> scaffold established by `docs/plans/user-question-reports.md` — full §0
> metadata, condensed per-commit ledger, retained per-commit stop-and-report
> gates.

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
| `src/db/admin-secret.ts` | PRESENT | `fetchAdminSecret()` requires both `env.DATABASE_ADMIN_SECRET_ARN` and `env.AWS_ROLE_ARN`. Uses `awsCredentialsProvider({ roleArn })` from `@vercel/oidc-aws-credentials-provider`. **For local execution against prod, the executor needs the role-assumption to succeed without an OIDC token — confirm at C4 pre-flight whether iac-admin static creds are sufficient or whether DATABASE_LOCAL_URL needs to be unset and the script invoked under a different mechanism.** |
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

`.env.local` exists at repo root (2,113 bytes, modified 2026-05-11 19:04). The grep audit was permission-denied at this commit-0. **Pre-flight check at C4: executor must verify `.env.local` carries DATABASE_HOST + DATABASE_ADMIN_SECRET_ARN + AWS_ROLE_ARN + OPENAI_API_KEY pointing at the prod values, or invoke `bun --bun vercel env pull .env.local` against the production environment to refresh.** Decision deferred to C4.

### §0.6 Doc-vs-empirical reconciliation (handoff drift surfaced at audit)

| # | Handoff claim | Empirical | Action |
|---|---|---|---|
| 1 | §E.2: `purveyor` RDS live with unknown owner, ~$11/month | Already deleted 2026-05-11 22:53Z by iac-admin (Leo). CloudTrail confirms. | None this round. Banked. |
| 2 | §E.3: production items table empty (0 items) | Confirmed 0 rows at 2026-05-12 00:50Z. | This round populates. |
| 3 | `start.ts:84-89` references "future testbank-re-extraction round" | The round shipped 2026-05-06 at `2f7b2c8`. Comment is stale. | None this round. Banked as drift. |
| 4 | §E.2 mentions purveyor companion ECS/ALB/ECR resources | Per CloudTrail, the platform-team's purveyor stack created (root via Terraform 2026-03-13) included ECR repos + ECS cluster + ECS service + ALB + target group alongside the RDS instance. RDS gone; companion resources presumably still up. | None this round. Banked as `R-purveyor-companion-resources-still-up`. |
| 5 | "all 9 expected prod env vars present" | Confirmed at the prior audit; no change at this commit-0. | None. |

### §0.7 Destructive-operation surface

**One destructive operation:** `pg_restore` (or `psql -f`) against production `items` at C3.

- **Pre-state:** prod `items` table is empty (`COUNT = 0` confirmed at §0.5). INSERTs only; no UPDATE/DELETE/TRUNCATE.
- **Rollback:** `TRUNCATE items` against prod. Safe: no dependent data exists yet (no users have generated `attempts` against items, no `item_admin_actions` rows logged, no `item_user_reports` filed). The only user in prod is Leo's first-sign-in row in `users`; that row has no FK pointing into `items`.
- **§6.14.31 confirmation gate:** REQUIRED before C3. The plan-doc records this gate. Executor must STOP at C3 and obtain Leo's explicit "yes go" before running `pg_restore` against the prod RDS endpoint.
- **C4 (`backfill-missing-embeddings.ts`)**: writes UPDATE `embedding = ...` for any row where `embedding IS NULL`. After C3 with the embedding column preserved by the dump, this should be a 0-row backfill. Even in the worst case (column lost, all 2,150 rows need embeddings), it is INSERT-equivalent on a column that was empty — non-destructive.
- **No other destructive ops anticipated** in this round.

### §0.8 §6.14.31 gate placement summary

Single gate: **before C3 `pg_restore` execution**. Executor must:

1. Show the dump file path + size + line count + estimated row count to Leo.
2. Show the `pg_restore` (or `psql`) command verbatim including the prod hostname.
3. Wait for explicit "yes go" reply.
4. Execute.
5. Immediately re-probe `SELECT COUNT(*) FROM items` against prod and report.

### §0.9 Pre-flight readiness checklist (run at C1 boundary)

- [x] Local Docker postgres reachable at `localhost:54320` ← confirmed §0.5.B
- [x] Prod RDS reachable via admin secret ← confirmed §0.5.C
- [x] `pg_dump` and `pg_restore` present, version 18.1 ← confirmed §0.5.A
- [x] Local items count > 0 (2,150) ← confirmed §0.5.B
- [x] Prod items count = 0 ← confirmed §0.5.C
- [x] Prod sub_types and strategies seeded (FK targets exist) ← confirmed §0.5.C
- [x] Local embedding coverage = 100% ← confirmed §0.5.B (no NULL embeddings; backfill at C4 should be no-op)
- [x] `OPENAI_API_KEY` configured in prod env vars ← per the prior env-var audit (handoff §D.5: all 9 vars present)
- [ ] `.env.local` carries DATABASE_HOST + DATABASE_ADMIN_SECRET_ARN + AWS_ROLE_ARN + OPENAI_API_KEY pointing at prod ← deferred to C4 pre-flight (see §0.5.E)
- [ ] iac-admin AWS creds active in current shell ← already true at commit-0 audit (`aws sts get-caller-identity` returned Account 496780244141 / iac-admin); re-verify at each commit boundary

### §0.10 Forward-watch entries

- **Sub-type 6 promotion candidate 2** (per `docs/plans/deployment-runbook.md` §0.10): held at 3/5 entering this round. Track deviations during this round; round-close updates the count.
- **Pre-authorized §6.14.34 sub-rounds:**
  - `schema-divergence-sub-round` — triggers if local rows have non-default `source_folder` or `metadata_json` shapes that the prod schema rejects.
  - `script-env-routing-sub-round` — triggers if `scripts/backfill-missing-embeddings.ts` fails because of an env-var routing issue (R-iac-env-local-contamination is a precedent).
  - `vector-extension-skew-sub-round` — triggers ONLY if pg_restore fails to load embedding values due to the 0.8.2-vs-0.8.1 patch-version difference (judgment: should not happen — see §0.5.D — but pre-authorize the sub-round so we can act immediately).
- **R-purveyor-companion-resources-still-up** — banked, not promoted. Future round may decide whether to chase the platform team for a teardown.

### §0.11 Forward-pin index

Empty at round-open. Populated at round-close.

---

## §1 Commit ledger skeleton

Five-to-six commits planned. Each commit gates on a stop-and-report.

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

### §1.3 C3 — Restore dump to prod RDS [§6.14.31 gate]

**§6.14.31 confirmation REQUIRED before execution.** See §0.8.

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
- `SELECT COUNT(*) FROM items WHERE embedding IS NULL` against prod returns 0 (or, if not 0, document the count and explain at C4)

**Commit message shape:** `docs(plans): testbank-ingest-prod C3 — restore items to prod RDS (2150 rows)`.

### §1.4 C4 — Backfill embeddings on prod (no-op if dump preserved them)

**Pre-flight (this commit's first action):** verify `.env.local` carries DATABASE_HOST + DATABASE_ADMIN_SECRET_ARN + AWS_ROLE_ARN + OPENAI_API_KEY pointing at production. If any are missing or local-pointing, refresh via `bun --bun vercel env pull .env.local --environment=production` and confirm `DATABASE_LOCAL_URL` is **unset** in `.env.local` (the `createAdminDb()` branch in `src/db/admin.ts` keys on this).

**Operation:** `bun run scripts/backfill-missing-embeddings.ts`.

**Expected behavior:** the script logs `backfill-missing-embeddings: starting`, queries items where `embedding IS NULL`, finds zero rows (because the dump preserved embeddings), exits cleanly with "no items to backfill."

**Worst case behavior:** dump did not preserve embeddings cleanly, all 2,150 rows need embeddings. Script processes them sequentially via OpenAI's `text-embedding-3-small`. At ~$0.00002/1k tokens and ~200 tokens/item, expect ~$0.01 total cost — negligible.

**Verification (in C4's stop-and-report):**
- Script exit code 0
- Final `SELECT COUNT(*) FROM items WHERE embedding IS NULL` against prod returns 0
- Script's log output (count of items processed)

**Commit message shape:** `docs(plans): testbank-ingest-prod C4 — backfill embeddings on prod (N items)`.

### §1.5 C5 — Verification (functional smoke against prod)

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

**Verification (in C5's stop-and-report):** all four checks above pass.

**Commit message shape:** `docs(plans): testbank-ingest-prod C5 — verification (prod items=2150, /diagnostic/run returns 200)`.

### §1.6 C6 — Round-close

**Operations:**
1. Populate §0.11 forward-pin index with anything surfaced during C1-C5 that needs forward-tracking.
2. Populate this section's "ROUND-CLOSE STATUS" block.
3. Promote any §10 candidate patterns that hit promotion threshold.
4. Update sub-type 6 promotion candidate count if applicable.
5. `git push origin main` — first push of this round (per deployment-runbook convention: push only at round-close).

**Commit message shape:** `docs(plans): close testbank-ingest-prod round`.

---

## §2 Anti-scope reminders for executor

- **DO NOT** `pg_dump` without `--data-only --table=items`. A schema-bearing dump will conflict with prod's existing schema and risk DROP TABLE statements.
- **DO NOT** `pg_dump` other tables. The dump file should contain ONLY `items` data.
- **DO NOT** run `pg_restore` against prod without first showing the command + dump-file fingerprint to Leo and waiting for "yes go." This is the §0.8 §6.14.31 gate.
- **DO NOT** use `--clean` or `--if-exists` with `pg_restore`. Prod items table is empty at C3; a `--clean` flag would emit a DROP TABLE and break FK references.
- **DO NOT** modify the dump file by hand. If the dump is malformed, regenerate at C1, do not patch.
- **DO NOT** push commits to `origin/main` between C1 and C5. Push only at C6 round-close.

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

## §5 Round-close stop-and-report shape (populated at C6)

Required entries in the round-close stop-and-report:

1. All commit SHAs (C1 through C6) with one-line summary each.
2. Final prod items count + status distribution (must match local 2,150 / 448-1695-7).
3. Final prod embedding coverage (must be 100% / 0 NULL rows).
4. C5 functional smoke result (`/diagnostic/run` returns 200, first item renders, attempt submission succeeds).
5. Final Vercel logs `--level error --since 1h --no-branch` against `/diagnostic/run`: expect zero new errors after C3.
6. §3 candidate patterns: which (if any) promoted? Which banked?
7. Sub-type 6 promotion candidate 2 final count after this round.
8. §0.11 forward-pin index entries (any new R-* entries to track).
9. Round-close commit SHA.
10. `git push origin main` confirmation.

---

## §6 ROUND-CLOSE STATUS — populated at C6

(Empty at commit-0. Populated when C6 lands.)
