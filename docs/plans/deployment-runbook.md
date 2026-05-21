# Deployment Runbook — Plan-Doc

Round: Deployment.
Round-open hash: redirector named `d21b52d`; working-tree HEAD at this commit-0 is `65d37a1` (d21b52d IS ancestor of HEAD by ~30 feature commits, none of which touched deploy infra — see §0.5 git-log audit).
Target close hash: TBD.

> The plan-doc references `docs/deployment.md` (redirector's lowercase form). The actual filename on disk is `docs/DEPLOYMENT.md` (uppercase). Linux fs is case-sensitive. **All references in this plan-doc resolve to `docs/DEPLOYMENT.md`.** This is divergence-signal #0 surfaced by the audit before any commit-1 work.

---

## §0 Round metadata

### §0.1 Round name + hashes

- **Name:** Deployment Round.
- **Open hash (redirector-stated):** `d21b52d` — "docs(plan): §3 commit-2 — Phase 4 sub-phase b full-round-close".
- **HEAD at commit-0:** `65d37a1` — "feat(session-log): document session on anchor drill redesign, strategy bubbles, and WOOP primer".
- **Hash-mismatch note:** redirector prompt was authored against `d21b52d`; lessons + dashboard + post-session work has shipped on top of it (30 feature commits). None of those commits touch `docs/DEPLOYMENT.md`, `packages/superstarter-iac/`, `src/env.ts`, `src/db/index.ts`, `src/proxy.ts`, `next.config.ts`, `vercel.json`, `src/app/api/health`, or `src/app/api/cron/abandon-sweep`. **Net effect: the deployment surface is identical at d21b52d and 65d37a1, so the audit is valid against HEAD.**
- **Target close hash:** TBD (this plan-doc is commit-0; close will populate).

### §0.2 Scope (in-scope)

Whole runbook per `docs/DEPLOYMENT.md` §1–§6:

- §1 Provision AWS infrastructure via `packages/superstarter-iac` (Alchemy + RDS Postgres + IAM OIDC + IAM role).
- §2 Configure Vercel project (framework preset, env vars, OAuth redirect URIs, `vercel env pull` locally).
- §3 Bootstrap the database (`bun db:push:programs`, `bun db:migrate`, `bun db:seed`).
- §4 Deploy the app (first preview).
- §5 Cron + Workflows boot.
- §6 Verify the deployment (health, OAuth, DB, cron, phase-1 manual checklist).

### §0.3 Anti-scope (explicit)

- **NOT** production cutover. Target shape is Vercel **preview** per `architecture_plan.md`'s recommendation, framed by `DEPLOYMENT.md` line 5.
- **NOT** custom domain provisioning.
- **NOT** cron-schedule tuning beyond the existing `abandon-sweep` every-minute cron.
- **NOT** new app features.
- **NOT** the 791-flagged-candidate admin-review queue work (separate residual #2 / #4 future rounds).
- **NOT** authoring the missing `docs/phase-1-manual-verification.md` from scratch — see §0.6 (treatment decision deferred to round-close).

### §0.4 Sequencing rationale recap

- This is the deployment round; not a sidecar.
- PROMOTION CANDIDATE 2 (sub-type 6) remains at 3/5 entering this round; commit-0 is read-only audit + plan-doc, so no increment yet.

### §0.5 Empirical audit findings (verbatim)

Audit performed at HEAD = `65d37a1` against `docs/DEPLOYMENT.md`. Findings classified per redirector rubric: **PRESENT / DIVERGENT / ABSENT / DOC-WRONG**.

#### A. File presence

| Claim | Status | Notes |
|---|---|---|
| `vercel.json` | PRESENT | `{ bunVersion: "1.x", regions: ["iad1"], crons: [{ path: "/api/cron/abandon-sweep", schedule: "* * * * *" }] }`. Exact match with doc §2/§5. |
| `src/env.ts` | PRESENT | Uses `@t3-oss/env-nextjs` (line 2). Validates all 9 doc-listed required vars plus 4 optional VERCEL_* and 1 DATABASE_LOCAL_URL. See §E for shape mismatches. |
| `src/db/index.ts` | PRESENT | Imports `@aws-sdk/rds-signer` (line 1). IAM signer branch at lines 27–68 (`createRdsPool`). Local-pool branch at lines 19–25. Doc cites `:75` for the `DATABASE_LOCAL_URL` escape hatch — actual line is `:75` `const created = env.DATABASE_LOCAL_URL ? createLocalPool(...) : createRdsPool()`. **VERIFIED — exact line match.** |
| `src/proxy.ts` | PRESENT | `PUBLIC_PREFIXES = ["/api/auth", "/login", "/api/health", "/api/cron", "/api/admin"]`. Doc names only `/api/health` (§6 line 199). Other prefixes correct per `src/proxy.ts` comments. |
| `next.config.ts` | PRESENT | Imports `"@/env"` (line 3). Sets `typedRoutes: true` (line 7), `cacheComponents: true` (line 8), `serverExternalPackages: ["pg", "pino", "pino-pretty"]` (line 9). Wraps in `withWorkflow(config)` (line 20) from `workflow/next`. **All doc §4 claims match.** |
| `packages/superstarter-iac/` | PRESENT | Contents: `alchemy.run.ts`, `bootstrap.ts`, `env.ts`, `lib/`, `logger.ts`, `modules/{database,identity,network,types}.ts`, `node_modules/`, `package.json`, `README.md`, `scripts/with-aws.ts`, `tsconfig.json`, `.env.example`, `.gitignore` (only ignores `node_modules/`). |
| `packages/superstarter-iac/.alchemy/` | **ABSENT** | Critical: state directory does not exist. IaC has **never been deployed from this clone**. Doc §1 line 51 says state is committed under `.alchemy/`. **Empirically: there is no committed state.** This is the pivotal fact that determines this round is FULL-RUNBOOK shape. |
| `src/app/api/cron/abandon-sweep/route.ts` | PRESENT, **DIVERGENT** | Route exports `POST` only (line 38: `async function POST(req: Request)`, line 103: `export { POST }`). Vercel Cron Jobs send **HTTP GET** by default (Vercel docs). **A `GET` request to this route returns 405 Method Not Allowed.** Either the cron never worked, OR Vercel's cron behavior differs from documented, OR the route needs a `GET` export aliased to `POST`. **Verify before C10.** |
| `src/app/api/health/route.ts` | PRESENT | `function GET() { return Response.json({ ok: true }) }`. Matches doc §6 line 199 exactly. |
| `drizzle/0000_*.sql` through `drizzle/0007_*.sql` | PRESENT | 8 migrations (idx 0–7), matches handoff record. |
| `docs/phase-1-manual-verification.md` | **ABSENT** | Doc references it twice: §6 line 203 ("Phase-1 manual checklist") and §Cross-references line 262. **File does not exist.** Decision deferred to round-close (§0.6 row 4): patch doc, author file, or pin as residual. |
| `docs/architecture_plan.md` | PRESENT | Doc cross-reference line 260 resolves. |
| `README.md` `## Drizzle-Kit Migrate — Recovery from Opaque Failures` anchor | PRESENT | At `README.md:367`. Doc cross-ref §Troubleshooting line 253 resolves correctly. |

#### B. `package.json` scripts

| Script | Status | Actual command |
|---|---|---|
| `db:push:programs` | PRESENT | `bun --bun run src/db/scripts/push-programs.ts` |
| `db:migrate` | PRESENT | `bun --bun run src/db/scripts/drizzle-kit-shim.ts migrate && bun run db:push:programs` (chains programs after migrate) |
| `db:seed` | PRESENT | `bun --bun run src/db/scripts/seed-sub-types.ts && bun --bun run src/db/scripts/seed-strategies.ts` |
| `db:generate` | PRESENT | `bun --bun run src/db/scripts/drizzle-kit-shim.ts generate` |
| `db:studio` | PRESENT | `bun --bun run src/db/scripts/drizzle-kit-shim.ts studio` |
| `db:push` | PRESENT | `bun --bun run src/db/scripts/drizzle-kit-shim.ts push && bun run db:push:programs` |
| `db:drop:schema` | PRESENT | `bun --bun run src/db/scripts/drop-schema.ts` (destructive; §6.14.31 gate applies) |
| `db:wipe:practice-data` | PRESENT | `bun --bun run scripts/dev/wipe-practice-data.ts` (destructive) |

#### C. Dependencies in `package.json`

| Package | Status | Version |
|---|---|---|
| `@aws-sdk/rds-signer` | PRESENT | `^3.1037.0` |
| `@aws-sdk/client-secrets-manager` | PRESENT | `^3.1037.0` |
| `@t3-oss/env-nextjs` | PRESENT | `^0.13.11` |
| `pg` | PRESENT | `^8.20.0` |
| `drizzle-orm` | PRESENT | `^0.45.2` |
| `drizzle-kit` (devDep) | PRESENT | `^0.31.10` |
| `next-auth` | PRESENT | `5.0.0-beta.31` (Auth.js v5 beta) |
| `@auth/drizzle-adapter` | PRESENT | `1.11.2` |
| `workflow` | PRESENT | `^4.2.4` (provides `withWorkflow` from `workflow/next`) |
| `@vercel/oidc-aws-credentials-provider` | PRESENT | `^3.0.8` (consumed in `src/db/index.ts:4`) |
| `@vercel/functions` | PRESENT | `^3.4.4` (consumed in `src/db/index.ts:3` for `attachDatabasePool`) |
| `next` | PRESENT | `^16.2.4` |
| `pino` | PRESENT | `^10.3.1` |

#### D. Schema reality check — **DOC-WRONG**

`docs/DEPLOYMENT.md` line 143 says:

```
bun db:seed             # 11 sub_types + 33 strategies (idempotent)
```

Empirically (`src/config/sub-types.ts` + `src/config/strategies.ts`):

- **Sub-types: 14** (counted distinct `id: "..."` entries in `src/config/sub-types.ts`; confirmed by the comment in `src/config/strategies.ts:11` `"// All 14 sub-types authored per the strategy-authoring round"`).
- **Strategies: 42** (3 per sub-type × 14 sub-types; each entry has `{ kind: "recognition" | "technique" | "trap", text: "..." }`).

The seed scripts (`seed-sub-types.ts`, `seed-strategies.ts`) iterate over the config files; whatever the config holds is what gets seeded. So actual seed = **14 sub_types + 42 strategies**, not the doc's "11 + 33".

**This is a confirmed cross-pollination signal** flagged by the redirector heads-up (§6.14.28 / §6.14.40). The other heads-up-flagged signals (`packages/superstarter-iac` path, `superstarter-main` hostname example, `VERCEL_PROJECT_NAME=superstarter` default) are **NOT cross-pollination** — they reflect this repo's actual identity (`package.json:name == "superstarter"`, `alchemy.run.ts:STAGE = "main"` → endpoint contains `superstarter-main`, IaC package name `@superstarter/iac`). Only the sub-type / strategy counts are doc-vs-empirical drift.

#### E. Env-var validation reality

`src/env.ts` validates (zod):

| Var | Schema | Doc §2 says |
|---|---|---|
| `AWS_ROLE_ARN` | `z.string().startsWith("arn:aws:iam::").optional()` | Required (set in Vercel). |
| `DATABASE_HOST` | `z.string().min(1).optional()` | Required. |
| `DATABASE_ADMIN_SECRET_ARN` | `z.string().startsWith("arn:aws:secretsmanager:").optional()` | Required. |
| `DATABASE_LOCAL_URL` | `z.string().regex(/^postgres(ql)?:\/\//).optional()` | Local-only escape hatch (don't set in Vercel). |
| `VERCEL_PROJECT_PRODUCTION_URL` | `.optional()` | Auto-injected by Vercel. |
| `VERCEL_GIT_COMMIT_SHA` | `.optional()` | Auto-injected. |
| `VERCEL_OIDC_TOKEN` | `.optional()` | Auto-injected. |
| `NODE_ENV` | `z.enum([dev,test,prod]).default("development")` | n/a |
| `AUTH_SECRET` | `z.string().min(32)` REQUIRED | Required, ≥ 32 chars. |
| `AUTH_GOOGLE_ID` | `z.string().min(1)` REQUIRED | Required. |
| `AUTH_GOOGLE_SECRET` | `z.string().min(1)` REQUIRED | Required. |
| `ANTHROPIC_API_KEY` | `z.string().startsWith("sk-ant-")` REQUIRED | Required, prefix `sk-ant-`. |
| `OPENAI_API_KEY` | `z.string().startsWith("sk-")` REQUIRED | Required, prefix `sk-`. |
| `CRON_SECRET` | `z.string().min(32)` REQUIRED | Required, ≥ 32 chars. |

**Divergence (soft):** `AWS_ROLE_ARN`, `DATABASE_HOST`, `DATABASE_ADMIN_SECRET_ARN` are `.optional()` in zod — build does NOT fail if they're missing. But `src/db/index.ts:33` throws at runtime if `DATABASE_LOCAL_URL` is unset AND `AWS_ROLE_ARN`/`DATABASE_HOST` are missing. So they're "soft-required at runtime, not at build". The doc's table treats them as required-in-Vercel, which is operationally correct.

#### F. Existing deploy artifacts

| Artifact | Status |
|---|---|
| `.vercel/` | ABSENT — no `vercel link` has been run from this clone. |
| `.github/workflows/` | ABSENT — no CI deploy automation. |
| `.alchemy/` (repo root) | ABSENT |
| `packages/superstarter-iac/.alchemy/` | ABSENT — IaC has never been deployed (see §A). |
| `packages/superstarter-iac/.env.local` | UNKNOWN (cannot read — directory restricted on .env.* files). Required to exist before `bun run deploy`. |

#### G. README anchor cross-references

- `README.md:367` `## Drizzle-Kit Migrate — Recovery from Opaque Failures` — **PRESENT**. Cross-ref from `DEPLOYMENT.md:253` resolves.

#### H. Git log spot-check (last 50 commits, keywords: iac/alchemy/vercel/deploy/oidc/rds/secrets-manager/env/auth-google/workflow)

Only matches:

- `fbfa169` `docs: deployment runbook for Vercel + AWS RDS topology` (the commit that introduced `docs/DEPLOYMENT.md`)
- `736b8e0` `feat(post-session/strategies): per-strategy cards with section pill` (matched on "strategies", false positive — UI work)

**No commits in the last 50 touch deploy infra.** The IaC + env.ts + db/index.ts + proxy.ts + next.config.ts work was completed before commit-0's audit window and has been stable since.

---

### §0.6 Doc-vs-empirical reconciliation

For each DIVERGENT or DOC-WRONG finding, canonical-source decision for this round:

| # | Doc claim | Empirical state | Canonical | Disposition |
|---|---|---|---|---|
| 1 | `bun db:seed` produces "11 sub_types + 33 strategies" (§3 line 143) | 14 sub_types + 42 strategies | **Repo** | Drift-commit pre-close to patch `DEPLOYMENT.md:143` to "14 sub_types + 42 strategies (3 per sub-type)". §6.14.28. |
| 2 | `docs/phase-1-manual-verification.md` exists (§6 line 203, §X-refs line 262) | File absent | **Repo** | **Round-close decision: (c) pin as residual.** Phase-1 verification substituted in this round by ad-hoc C7 (`/api/health` = 200 `{ok:true}`) + C8 (OAuth round-trip + Auth.js DB write confirmed via psql audit of `users`/`accounts`/`sessions`). Authoring the markdown checklist deferred to a future docs-cleanup round (R-phase1-manual-checklist-absent in §0.11). |
| 3 | abandon-sweep route handles cron tick (§5 line 179–185) | Route exports `POST` only; Vercel cron sends GET | **Empirical (needs runtime verify)** | Block C10: probe whether Vercel-cron→POST actually fires this route. If 405, code-fix is required → spawn mid-round sub-round (§6.14.34) to add `GET` handler that delegates to `POST`. |
| 4 | `AWS_ROLE_ARN`/`DATABASE_HOST`/`DATABASE_ADMIN_SECRET_ARN` are "Required environment variables" (§2 table) | Marked `.optional()` in `src/env.ts` | **Both correct in context** | No change. Doc is operationally correct (must be set in Vercel for runtime). Zod is `.optional()` to permit local-dev (DATABASE_LOCAL_URL path). Note in plan-doc for future readers; no action. |
| 5 | Filename `docs/deployment.md` per redirector | Actual filename `docs/DEPLOYMENT.md` | **Empirical** | Plan-doc references use uppercase form; redirector's lowercase form is a normalized-token artifact. No code change. |
| 6 | Round-open hash `d21b52d` | HEAD `65d37a1` (d21b52d is ancestor, 30 feature commits since) | **Empirical** | Audit + plan-doc at HEAD = 65d37a1; deployment-surface unchanged across the interval, so semantically equivalent. |

### §0.7 Build-vs-execute classification

This round uses three commit classifications:

- **BUILD** — app/IaC code change committed to repo (diff-bearing).
- **EXECUTE** — external action (AWS Console / CLI / Vercel dashboard / Google Cloud Console). Produces evidence (CLI output, screenshots, pasted env-var values), not necessarily a git commit. EXECUTE commits that *also* commit state (e.g. `packages/superstarter-iac/.alchemy/` after `bun run deploy`) are BUILD+EXECUTE hybrids.
- **VERIFY** — probe + record (HTTP request, db query, log inspection). Produces a transcript line in this plan-doc + the response captured.

Contiguous EXECUTE actions group under a single plan-doc §N section. Not every external action gets its own git commit.

### §0.8 Per-commit stop-and-report shape

- **BUILD:** standard (hash + diff summary + audit + `bun typecheck` + `bun lint` + (where applicable) feature smoke).
- **EXECUTE:** action taken + command run + console-output snapshot (paste verbatim) + new env-vars pasted into Vercel listed by name (not value) + any error encountered + state-files committed if any (e.g. `.alchemy/`).
- **VERIFY:** probe target + response captured verbatim + pass/fail + log lines (if applicable).

### §0.9 External-dependency readiness checklist

Per redirector requirement: front-load blockers. **All items below are flagged `needs-leo-confirmation`** because the plan-doc author has no visibility into Leo's local accounts/secrets at commit-0.

| Item | Have-it / Need-to-acquire | Blocker for |
|---|---|---|
| AWS account in `us-east-1` with default VPC | needs-leo-confirmation | C1 |
| DevFactory credentials JSON at `~/Downloads/credentials.json` (or path under `DEVFACTORY_CREDS_PATH`) | needs-leo-confirmation | C1 |
| Vercel team slug + project name | needs-leo-confirmation | C1 (`.env.local` fill), C2 (vercel link) |
| Google Cloud project with OAuth consent screen + Web OAuth 2.0 client | needs-leo-confirmation | C3 |
| Anthropic API key (prefix `sk-ant-`) | needs-leo-confirmation | C2 (env vars) |
| OpenAI API key (prefix `sk-`) | needs-leo-confirmation | C2 (env vars) |
| `openssl` CLI for `AUTH_SECRET` + `CRON_SECRET` generation | available (linux) | C2 |
| `vercel` CLI installed + logged in | needs-leo-confirmation | C2, C4 |
| `bun` installed | available (CLAUDE.md confirms, repo default) | C1, C3, C5, C6 |
| `ALCHEMY_PASSWORD` (≥32 chars) generated + team-shared | needs-leo-confirmation | C1 |

### §0.10 §6.14 forward-watch

- **§6.14.43 sub-type 6 cumulative-deviation count:** start of round = ~33+ inherited (per heads-up). At commit-0 = **0 in-round** (no code drafted; audit + plan-doc only). Track per-commit delta in stop-and-report.
- **§6.14.28 / §6.14.40** (redirector-vs-empirical divergence): already surfaced — see §0.6 rows 1, 5, 6. Future commits must not re-introduce sibling-project terminology (e.g. "11 sub_types", `superstarter-iac` ≠ this repo path-claim — note this one *is* correct, see §D).
- **§6.14.31** (destructive-operation-gate): applies to `bun run destroy` (IaC teardown), `bun db:drop:schema`, `bun db:wipe:practice-data`, RDS `deletion-protection: off` (per IaC sizing). C1 must NOT run destroy by mistake.
- **§6.14.34** (mid-round narrow-scope sub-round): pre-authorized triggers for this round —
  - Discovery that the abandon-sweep `POST`-only export is incompatible with Vercel cron's `GET` → spawn `abandon-sweep-method-fix` sub-round, land code-fix BUILD commit, rejoin C10.
  - Discovery that `docs/phase-1-manual-verification.md` is required and must be authored → spawn `phase-1-checklist-author` sub-round.
  - Discovery that `src/env.ts` `.optional()` allows a missing-AWS-var deploy to build but crash at runtime, and Leo prefers build-time failure → spawn `env-required-tighten` sub-round.

- **Round-close: §6.14.43 sub-type 6 final count** = **3 in-round deviations**. Per-deviation:
  - **Dev-1** (helper-script `~/bin/refresh-aws-creds.sh`): timestamp format `+00:00` vs `Z`. Zod's `z.iso.datetime()` strict-Z validator rejected `2026-05-12T10:17:39+00:00` produced by `aws sts get-session-token`. Recovery: helper script patched to `sub("\\+00:00$"; "Z")` via jq. Blocked initial deploy at cred-validation step; no AWS resources created. Single line of pseudo-code in redirector helper-script draft was wrong.
  - **Dev-2** (Vercel env var dashboard configuration): redirector's C2 prompt listed 9 vars to add but did not explicitly enumerate what NOT to add. User uploaded `packages/superstarter-iac/.env.local` (4 IaC vars) + manually added `DATABASE_LOCAL_URL` = 5 wrong vars on Vercel. Recovery: 5x `vercel env rm` per environment (deletes succeeded), then Development environment added to 9 legitimate vars. `DATABASE_LOCAL_URL` value was `postgres:postgres@localhost:54320/postgres` — universal-default, not a real credential leak. Prompt-design issue: the implicit exclusion list (IaC-only vars, local-only vars) should have been explicit.
  - **Dev-3** (Secrets Manager probe in C5 diagnostic): redirector provided `aws secretsmanager get-secret-value --secret-id "arn:...rds!db-...-HMVNfo"` without anticipating bash history expansion. Bash interpreted `!db` as a history command, errored with `bash: !db: event not found`, downstream `jq` failed on empty input. Recovery: `set +H` (disable history expansion) before the command, plus single-quoted ARN. Diagnostic was non-blocking but added 2 minutes of confusion.
- **Round-close: §6.14.34 (mid-round narrow-scope sub-round) — what actually fired:**
  - **Sub-round `oidc-cloudcontrol-bypass`** (commit `4a17294`): triggered by CloudControl `InternalFailure` on AWS::IAM::OIDCProvider. Three-file BUILD commit (env.ts + identity.ts + alchemy.run.ts). Lint + typecheck clean on first run. Not pre-authorized in §0.10; surfaced empirically.
  - **Sub-round `cron-hobby-compat`** (commit `9a6b563`): triggered by Vercel Hobby cron-frequency rejection (`* * * * *` not allowed). Bundled with the pre-authorized `abandon-sweep-method-fix` trigger from §0.10 since both edits to `route.ts` happen together. Two-file BUILD commit (vercel.json + route.ts). Lint + typecheck clean.
  - **Sub-round `phase-1-checklist-author`** (pre-authorized in §0.10): **did NOT fire**. Decision: defer per §0.6 row 2 (c).
  - **Sub-round `env-required-tighten`** (pre-authorized in §0.10): **did NOT fire**. No env-var divergence observed at runtime; deferred to a future round if Leo prefers build-time failure for missing AWS_ROLE_ARN/DATABASE_HOST.
- **Round-close: PROMOTION CANDIDATE 2 (§6.14.43 sub-type 6) status:** **HOLDS at 3/5** — 3 in-round deviations triggered correction, so no increment per §9 step 7. Inherited cumulative count moves to ~36+.

### §0.11 Forward-pin index

Cross-round bookmarks surfaced during this round, to be consulted by future rounds:

- **R-cloudcontrol-oidc-internal-failure** — AWS CloudControl `InternalFailure` for `AWS::IAM::OIDCProvider` creation in `us-east-1` against account `496780244141` (observed 2026-05-11, two distinct RequestTokens `6173a493` + `588607cb`, identical error). Bypass committed at `4a17294`: `env.ts` adds optional `EXISTING_OIDC_PROVIDER_ARN`; `modules/identity.ts` conditional branch; `alchemy.run.ts` wires through. OIDC provider created out-of-band via `aws iam create-open-id-connect-provider`. Revert path when AWS fixes: drop env var + delete provider via direct IAM API + revert `identity.ts`. **Periodically re-test** vanilla `bun run deploy` with `EXISTING_OIDC_PROVIDER_ARN` unset on a throwaway stage to detect AWS-side fix.

- **R-sts-session-token-iam-write-restriction** — STS `get-session-token` credentials from MFA-less IAM users (i.e., personal AWS accounts) fail IAM write operations with `InvalidClientTokenId` / `"security token is invalid"` (HTTP 403). The `packages/superstarter-iac/scripts/with-aws.ts` shim assumes DevFactory-style session tokens that don't have this restriction. Workaround used this round: invoke alchemy directly with long-term creds — `bun --bun run alchemy.run.ts` (skip the shim wrapper). Same path needed for teardown: `bun --bun run alchemy.run.ts --destroy`. **Future task**: either add MFA to `iac-admin` user (cleaner), or patch `package.json` scripts + `with-aws.ts` to fall back to long-term creds, or document the bypass in IaC `README.md`.

- **R-drizzle-migrate-ordering-fresh-rds** — `db:migrate` script in `package.json` chains `drizzle-kit-shim migrate && db:push:programs`. Migration `drizzle/0000_typical_golden_guardian.sql` uses `vector(1536)` requiring `pgvector` extension, but pgvector is only installed by `db:push:programs` which runs **after** migrations. On fresh AWS RDS, `bun db:migrate` fails opaquely (drizzle-kit code 1, no SQL trace). Workaround used: manual `CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pgcrypto;` via psql before re-running `bun db:migrate`. **Permanent fix candidate**: swap order in `package.json` `db:migrate` script — `db:push:programs && drizzle-kit-shim migrate`. Verify with a fresh DB first (the swap may have its own ordering dependency).

- **R-iac-env-local-contamination** — `packages/superstarter-iac/.env.local` accumulated repo-root `.env` template content (AWS_ROLE_ARN, DATABASE_HOST, ANTHROPIC_API_KEY, etc.) during the C1 deploy back-and-forth. The 4 IaC-required vars at the top (VERCEL_TEAM_SLUG, VERCEL_PROJECT_NAME, ALCHEMY_PASSWORD, EXISTING_OIDC_PROVIDER_ARN) remain valid; zod `safeParse` ignores extras so deploy works. **Cleanup task**: rewrite `packages/superstarter-iac/.env.local` to only the 4 IaC vars; the contamination is cosmetic but invites confusion.

- **R-purveyor-rds-prexisting** — Pre-existing RDS instance `purveyor` (`db.t3.micro`, created 2026-03-13, endpoint `purveyor.cyhk02a6cfpn.us-east-1.rds.amazonaws.com`) discovered in account `496780244141` during C1 recovery survey. Unrelated to 18seconds (different name, class, creation date). Billing ~$0.40/day = ~$11/month, has accumulated ~$22 over 2 months unobserved. **Leo to investigate ownership** — if abandoned, teardown via `aws rds delete-db-instance --db-instance-identifier purveyor --skip-final-snapshot`. Outside this round's scope.

- **R-vercel-hobby-cron-tradeoff** — Vercel Hobby plan caps cron at once-per-day. Schedule changed from `* * * * *` (every minute) to `0 4 * * *` (daily 4 AM UTC) in commit `9a6b563`. `abandon-sweep` now finalizes abandoned sessions up to ~24h late vs ~1min previously. Acceptable for preview; **revisit if upgrading to Pro plan** (~$20/month unlocks sub-daily crons).

- **R-cron-method-post-to-get** — `src/app/api/cron/abandon-sweep/route.ts` was `POST`-only; Vercel Cron sends HTTP GET (not configurable). Pre-this-round, cron would have silently 405'd on every fire. Renamed to `GET` in commit `9a6b563`. Other `/api/cron/*` routes (none currently exist) should follow the GET-with-bearer-auth convention.

- **R-cache-components-settimeout-warning** — Next.js 16 build warning during deploy: "Next.js cannot guarantee that Cache Components will run as expected due to the current runtime's implementation of `setTimeout()`." No observed runtime impact at C7/C8. **Revisit if Cache Components misbehave** (stale cache, unexpected invalidation, partial-prerender artifacts). Currently `next.config.ts` has `cacheComponents: true`.

- **R-github-vercel-connect-deferred** — `vercel link` attempted GitHub repo connection (`ryoiwata/18seconds`) and failed: "Failed to connect ... Make sure there aren't any typos and that you have access". Manual `vercel --prod` works fine. **Future task**: install/authorize Vercel's GitHub app at https://vercel.com/account/integrations, then re-connect via project's Settings → Git → Connect Git Repository. Once connected, push-to-main auto-deploys to production; preview branches auto-deploy on push.

- **R-phase1-manual-checklist-absent** — `docs/phase-1-manual-verification.md` referenced by `docs/DEPLOYMENT.md` §6 line 203 and §X-refs line 262 but does not exist. Per §0.6 row 2 decision, deferred to a future docs-cleanup round. Phase-1 verification this round was: C7 `/api/health` = 200 `{ok:true}`; C8 Google OAuth round-trip with confirmed `users`/`accounts`/`sessions` writes via psql audit; C10 cron (daily schedule means first fire is ~4 AM UTC, not verified in this round).

- **R-deploy-package-json-scripts-need-bypass** — Both `bun run deploy` and `bun run destroy` in `packages/superstarter-iac/package.json` route through `scripts/with-aws.ts` which is broken for this account (per R-sts-session-token-iam-write-restriction). **Document in `packages/superstarter-iac/README.md`** that the working invocations are `bun --bun run alchemy.run.ts` and `bun --bun run alchemy.run.ts --destroy` (with long-term AWS creds in environment), pending a permanent fix to either the shim or the IaC auth path.

- **R-deployment-md-references-bun-run-deploy** — `docs/DEPLOYMENT.md` likely references `bun run deploy` as the IaC invocation. With the bypass workaround now permanent until R-sts-session-token-iam-write-restriction resolves, the doc should be updated to reflect the bypass path or note the conditions under which the shim works. Not patched in this round-close drift commit; pin for docs-cleanup.

---

## §1 Pre-flight: external-dependency readiness verification

### §1.0 Pre-flight commit (plan-doc annotation; not a git commit)

**Goal:** convert every `needs-leo-confirmation` row in §0.9 into either `have-it` or `acquired-on-DATE`. Block C1 until cleared.

**Stop-and-report shape:** EXECUTE-class. List each §0.9 row with final state. If any row remains `need-to-acquire` and Leo cannot acquire it in this round, **stop the round and redirect** — do not synthesize a workaround.

**Specific probe commands Leo can run to self-verify:**

- AWS default VPC: `aws ec2 describe-vpcs --region us-east-1 --filters Name=is-default,Values=true` → must return at least one VPC.
- DevFactory creds freshness: `jq -r .expiration ~/Downloads/credentials.json` → must be at least 60 s in the future (`scripts/with-aws.ts` enforces this).
- Vercel CLI: `vercel whoami` → must return logged-in user/team.
- `bun --version` → must report `1.x`.
- `openssl version` → any recent.
- Vercel team slug + project name → from `https://vercel.com/<team-slug>/<project-name>` dashboard URL.

---

## §2 C1 — Provision AWS infrastructure (IaC deploy)

**Classification:** EXECUTE + BUILD (commits `packages/superstarter-iac/.alchemy/` state files as side-effect).

**Pre-action:**

1. `cd packages/superstarter-iac`
2. `cp .env.example .env.local`
3. Edit `.env.local`, fill in (per `packages/superstarter-iac/README.md`):
   - `VERCEL_TEAM_SLUG=<from-dashboard-URL>`
   - `VERCEL_PROJECT_NAME=<defaults-to-superstarter-if-omitted>`
   - `ALCHEMY_PASSWORD=<≥32-chars-from-team-password-manager>`
4. Confirm `~/Downloads/credentials.json` exists and `.expiration` is fresh (per `scripts/with-aws.ts`).

**Action:**

```bash
cd packages/superstarter-iac
git pull
bun run deploy
```

**Expected output:**

- `alchemy run starting` log line with `stage: "main"`, `region: "us-east-1"`.
- `provisionNetwork`, `provisionIdentity`, `provisionDatabase` steps execute in order (per `alchemy.run.ts`).
- Final stdout names three env-var values to paste into Vercel:
  - `AWS_ROLE_ARN` (prefix `arn:aws:iam::`)
  - `DATABASE_HOST` (hostname `superstarter-main.*.us-east-1.rds.amazonaws.com`)
  - `DATABASE_ADMIN_SECRET_ARN` (prefix `arn:aws:secretsmanager:`)

**Post-action:**

```bash
git add packages/superstarter-iac/.alchemy
git commit -m "iac: deploy"
git push
```

**Evidence to capture:**

- Three env-var values (transcribe value lengths + prefixes; do **NOT** paste the secret-ARN raw value into the plan-doc — paste only the prefix and a redacted form).
- Hash of the `iac: deploy` commit.
- `ls packages/superstarter-iac/.alchemy/` should be non-empty.

**Stop-and-report (per §0.8 EXECUTE shape):**

- Command run: `bun run deploy`.
- Console-output snapshot: paste the final 30 lines.
- New env-var names produced: AWS_ROLE_ARN, DATABASE_HOST, DATABASE_ADMIN_SECRET_ARN.
- Any error: report verbatim. Common: DevFactory creds expired (re-download), default VPC absent (run `aws ec2 create-default-vpc --region us-east-1`).
- State-files committed: `packages/superstarter-iac/.alchemy/*` (count).
- §6.14.43 sub-type 6 delta this commit: 0 (no app-code authored).

**Dependency:** §1.0 cleared.

---

## §3 C2 — Configure Vercel project + env vars

**Classification:** EXECUTE (no git diff).

**Pre-action:**

- `vercel link` (one-time, from repo root). Writes `.vercel/project.json`. Do **NOT** commit `.vercel/`.

**Action — Framework + build settings (Vercel dashboard or `vercel project`):**

- Framework preset: **Next.js**.
- Install command: `bun install`.
- Build command: `bun run build`.
- (Bun version + region pinned in `vercel.json` — no dashboard setting needed.)

**Action — Env vars (Production + Preview):**

Generate locally first:

```bash
openssl rand -base64 32  # AUTH_SECRET (paste)
openssl rand -base64 32  # CRON_SECRET (paste)
```

Then paste these 9 keys into Vercel project settings (Production + Preview both):

| Key | Source |
|---|---|
| `AWS_ROLE_ARN` | C1 output |
| `DATABASE_HOST` | C1 output |
| `DATABASE_ADMIN_SECRET_ARN` | C1 output |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | C3 output (Google Cloud) |
| `AUTH_GOOGLE_SECRET` | C3 output (Google Cloud) |
| `ANTHROPIC_API_KEY` | Anthropic console |
| `OPENAI_API_KEY` | OpenAI dashboard |
| `CRON_SECRET` | `openssl rand -base64 32` |

**Do NOT set:** `DATABASE_LOCAL_URL`. Doc §2 line 109 explicit: presence flips DB pool to plain-password mode. Confirmed in `src/db/index.ts:75`.

**Stop-and-report:**

- Each env-var key set, by name (NEVER paste values into plan-doc).
- Confirmation `vercel link` succeeded (presence of `.vercel/project.json` locally, but uncommitted).
- §6.14.43 sub-type 6 delta: 0.

**Dependency:** C1 complete (provides 3 vars). C3 must happen interleaved or before (provides 2 vars). Anthropic / OpenAI keys per §0.9.

---

## §4 C3 — Configure Google OAuth client redirect URIs

**Classification:** EXECUTE.

**Pre-action:**

- Google Cloud project + OAuth consent screen configured (§0.9).

**Action (Google Cloud Console → APIs & Services → Credentials):**

For an existing OAuth 2.0 Web Application client (or create one):

- **Authorized redirect URIs** — add:
  - `https://<production-domain>/api/auth/callback/google`
  - `https://<preview-domain>/api/auth/callback/google` (one per stable preview URL)
  - `http://localhost:3000/api/auth/callback/google`
- **Authorized JavaScript origins** — add the same hostnames (without the `/api/auth/callback/google` suffix).
- If consent screen is in **Testing** mode, add Leo's Google account under **Test users**.

**Evidence to capture:**

- Client ID (paste into `AUTH_GOOGLE_ID` in §3 C2).
- Client secret (paste into `AUTH_GOOGLE_SECRET` in §3 C2).
- Screenshot of the Authorized redirect URIs list (path under `docs/claude_logs/`).

**Stop-and-report:**

- Redirect-URI list confirmed.
- Client-ID + client-secret captured into Vercel env (per §3).
- §6.14.43 sub-type 6 delta: 0.

---

## §5 C4 — Pull Vercel env locally for admin scripts

**Classification:** EXECUTE.

**Action:**

```bash
vercel env pull --environment=development
# writes .env.local in repo root (gitignored)
```

`.env.local` will contain (per Vercel + per doc §2 line 132):

- `AWS_ROLE_ARN`, `DATABASE_HOST`, `DATABASE_ADMIN_SECRET_ARN` (mirrored from Vercel project env).
- `VERCEL_OIDC_TOKEN` (Vercel-issued, 12-hour TTL).
- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`.

**Verify:**

- `grep -E "^VERCEL_OIDC_TOKEN=" .env.local` → present.
- `.env.local` is in `.gitignore` (verify — do not commit).

**Stop-and-report:**

- Confirmed `.env.local` exists with `VERCEL_OIDC_TOKEN` populated.
- Note token TTL — re-run `vercel env pull` if 12 h elapse before C5.
- §6.14.43 sub-type 6 delta: 0.

---

## §6 C5 — Bootstrap the database (one-time)

**Classification:** EXECUTE (against RDS — destructive-adjacent; §6.14.31 gate applies for any teardown later, but seed/migrate are idempotent).

**Pre-action:**

- C4 complete (`.env.local` populated, `VERCEL_OIDC_TOKEN` fresh).

**Action (in order):**

```bash
bun db:push:programs    # creates `app` user, grants rds_iam, installs pgcrypto + pgvector
bun db:migrate          # applies drizzle/0000_*.sql through 0007_*.sql (8 files)
bun db:seed             # seeds 14 sub_types + 42 strategies (idempotent; onConflictDoUpdate)
```

> **Doc-correction note:** `DEPLOYMENT.md:143` claims `db:seed` produces "11 sub_types + 33 strategies". Empirical: **14 + 42**. This commit verifies the actual count produced and records it. Drift-commit per §0.6 row 1 lands at round-close.

**Verify:**

- `bun db:push:programs` runs `programs` array from `src/db/programs/index.ts`: pgcrypto + pgvector extensions + 8 grants (CREATE USER, GRANT rds_iam, GRANT CONNECT, GRANT USAGE+CREATE ON SCHEMA, GRANT ALL ON TABLES, GRANT ALL ON SEQUENCES, ALTER DEFAULT PRIVILEGES × 2). Confirmed via `src/db/programs/grants/app-user.ts:12-43`.
- `bun db:migrate` chains `db:push:programs` after migrate (per package.json) — so this is run twice across the bootstrap; second run is no-op (idempotent).
- `bun db:seed` final log line should print `{ count: 14 }` (sub_types) and `{ total: 42 }` (strategies). **If counts differ, STOP** and flag.

**Stop-and-report:**

- `bun db:push:programs` log: paste final "done" line.
- `bun db:migrate` log: paste migrations-applied count.
- `bun db:seed` log: paste exact counts. **Record empirical count vs doc claim**.
- §6.14.43 sub-type 6 delta: 0.

---

## §7 C6 — First app deploy

**Classification:** EXECUTE.

**Pre-action:** C1–C5 complete.

**Action:**

- Push to the branch Vercel watches (or whichever branch maps to a **preview** environment per the round's anti-scope §0.3).
- Vercel runs `bun --bun next build` per `vercel.json` `bunVersion: "1.x"`.

**Build-time expectations (per doc §4):**

- `src/env.ts` runs at build (via `import "@/env"` in `next.config.ts:3`). **Build fails** if `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CRON_SECRET` are missing/invalid (zod required). `AWS_*` vars are `.optional()` in zod (§0.5 E) — build will NOT fail on those, but runtime will.
- `cacheComponents: true` + `typedRoutes: true` per `next.config.ts:7-8`.
- `serverExternalPackages: ["pg", "pino", "pino-pretty"]` keeps `pg` native binding out of bundler.
- `withWorkflow(config)` wraps next config (workflow runtime ships with deploy).

**If build fails:**

- Zod error names the var → fix in Vercel, redeploy.
- Last-resort: `SKIP_ENV_VALIDATION=1` (not for steady state; per doc §4 line 171).

**Stop-and-report:**

- Vercel build URL + status.
- Build log final "Compiled successfully" line.
- Deployment URL (preview).
- §6.14.43 sub-type 6 delta: 0.

---

## §8 Verification commit ledger (mirrors `DEPLOYMENT.md` §6)

### §8.1 C7 — Health probe

**Classification:** VERIFY.

```bash
curl -sS https://<preview-url>/api/health
# expected: {"ok":true}
```

Route is `src/app/api/health/route.ts:1-3` (`GET` only). `src/proxy.ts:6` lists `/api/health` in `PUBLIC_PREFIXES`, so no auth required.

**Pass/fail:** body == `{"ok":true}`, status 200.

### §8.2 C8 — OAuth round-trip

**Classification:** VERIFY.

**Action:** browser-navigate to `https://<preview-url>/`. Expected: 302 → `/login`. Click Google sign-in → Google consent → back to `/api/auth/callback/google?code=...` → land on practice surface.

**Underlying:** `src/proxy.ts:22-26` redirects unauthenticated to `/login`. NextAuth callback writes to `auth.users` (Auth.js v5 + `@auth/drizzle-adapter`).

**Pass/fail:** successful sign-in + a user row in `auth.users` after sign-in.

### §8.3 C9 — DB connectivity via studio

**Classification:** VERIFY.

```bash
bun db:studio   # opens drizzle-kit studio against the RDS instance via OIDC
```

Verify: `auth.users` contains the row written by C8.

### §8.4 C10 — Cron tick

**Classification:** VERIFY — **with blocker risk per §0.6 row 3.**

**Action:**

1. Wait ≥ 60 s after first deploy.
2. Inspect Vercel logs (Vercel dashboard → Logs tab → filter by `/api/cron/abandon-sweep`).
3. Look for the log line `abandon-sweep: finalized` with `{ count: 0, cutoffMs, thresholdMs }` (from `src/app/api/cron/abandon-sweep/route.ts:73-76`).

**Risk:** route exports `POST` only. Vercel Cron Jobs historically send `GET` requests. If logs show a 405 or no incoming request, this is the blocker described in §0.6 row 3 / §0.10 §6.14.34 trigger #1. **Spawn `abandon-sweep-method-fix` sub-round:**

- BUILD commit adding `function GET(req: Request) { return POST(req) }` + `export { GET, POST }`.
- Re-deploy.
- Re-verify C10.
- Rejoin main ledger.

**Pass/fail:** at least one `abandon-sweep: finalized` log entry within the first 2 minutes post-deploy.

### §8.5 C11 — Phase-1 manual checklist

**Classification:** VERIFY — **blocked on missing doc (per §0.6 row 2).**

The doc references `docs/phase-1-manual-verification.md` for schema spot-checks, sign-out / re-sign-in, and health endpoint. **File does not exist** at commit-0.

**Three options, decision at round-close:**

- (a) Patch `DEPLOYMENT.md` to remove the references; pin "author phase-1 checklist" as residual.
- (b) Author `docs/phase-1-manual-verification.md` from doc §6 + redirector PRD context as part of round-close drift commit.
- (c) Author it now (mid-round sub-round per §0.10 §6.14.34) and execute against it.

Default at commit-0 = **(a) for now**, pin as residual, revisit at round-close.

---

## §9 C12 — Round-close commit

**Classification:** BUILD (docs only) — drift commit to reconcile §0.6 findings.

**Includes:**

1. Patch `docs/DEPLOYMENT.md:143` "11 sub_types + 33 strategies" → "14 sub_types + 42 strategies (3 per sub-type: recognition / technique / trap)". §0.6 row 1.
2. Decide on phase-1 checklist (§0.6 row 2 / §8.5).
3. If C10 forced the abandon-sweep code-fix sub-round, capture the sub-round's commit hash + delta count in this plan-doc.
4. SPEC additions (if any): if any new sub-type-5 / sub-type-6 instances surfaced this round, propose §6.14.X amendments. At commit-0 read-only audit: candidate noted in §10 below.
5. Populate `§0.11 Forward-pin index`.
6. Final §6.14.43 sub-type 6 cumulative-deviation count + per-commit delta table.
7. PROMOTION CANDIDATE 2 (sub-type 6): increment to 4/5 if no deviations in-round (delta stays at 0); hold at 3/5 if any deviation triggered correction.

---

## §10 Candidate §6.14 patterns surfaced by commit-0 audit

The audit surfaced two candidate patterns worth banking:

### §10.1 Candidate: "selective cross-pollination" — redirector heads-up over-flags

Round-prompt flagged 4 cross-pollination signals; empirically only 1 (sub-type count) is genuine cross-pollination. The other 3 (`packages/superstarter-iac` path, `superstarter-main` hostname, `VERCEL_PROJECT_NAME=superstarter` default) are correct for this repo's actual identity because **the repo is literally named `superstarter`** at the package level (`package.json:name` and `@superstarter/iac`). This is a pattern where redirector pattern-matches on tokens that *look* like sibling-project leakage but are in fact load-bearing repo-identity terms. Sub-type candidate for §6.14.43: **"redirector-token-pattern-match false positive vs repo-identity"**. Track at 1/5.

### §10.2 Candidate: "build-passes / runtime-fails env-var pattern"

`src/env.ts` marks `AWS_ROLE_ARN`, `DATABASE_HOST`, `DATABASE_ADMIN_SECRET_ARN` as `.optional()` (to permit DATABASE_LOCAL_URL local-dev path). Result: a Vercel build with these unset will succeed; the first runtime DB call will throw. Operationally surprising. Candidate: **"validation-shape vs operational-requirement mismatch — soft-required-at-runtime, soft-optional-at-build"**. Worth a SPEC §6.14.X note that env-var validation should fail at the layer (build vs runtime) closest to the failure mode of the missing var. Track at 1/5.

---

### §10.3 Candidate: "CloudControl-vs-direct-IAM-API trade-off for IAM resources"

AWS CloudControl is the abstraction layer Alchemy uses for `AWS.IAM.OIDCProvider` (and other IAM resource types). This round surfaced that CloudControl returns `InternalFailure` for OIDCProvider creation in `us-east-1` against this account, while the equivalent direct IAM API (`aws iam create-open-id-connect-provider`) succeeds immediately. Two retries via CloudControl, two failures with different RequestTokens. The InternalFailure is AWS-side; bypass code is permanent until AWS fixes. **Pattern candidate**: IaC frameworks that abstract over CloudControl inherit its reliability gaps. For IAM resources specifically, direct service APIs are more reliable than CloudControl. **§6.14.X candidate**: "abstraction-vs-direct-API reliability gap — when the abstraction layer has lower reliability than the underlying service API, the abstraction's promise of universality breaks." Track at 1/5.

### §10.4 Candidate: "DevFactory-shape-credentials assumption breaks for personal-account-without-MFA"

The `packages/superstarter-iac/scripts/with-aws.ts` shim was designed around DevFactory's session-token-based AWS credential flow. The shim assumes STS `get-session-token` credentials work universally for all AWS operations. **Empirically**: STS session credentials from MFA-less IAM users fail IAM write operations with `InvalidClientTokenId`. This is a vendored-pattern divergence: a script designed against one environment's auth shape doesn't work in a different environment's auth shape. **Pattern candidate**: "credential-shape-assumption divergence — when a vendored auth pattern hard-codes assumptions about the source environment's credentials (MFA, federation, session-vs-long-term), portability breaks at the operations that the source environment never exercised." Track at 1/5.

### §10.5 Candidate: "fresh-database migration ordering with extension dependencies"

`bun db:migrate` chains `drizzle-kit-shim migrate && db:push:programs`. Migration `0000` references `vector(1536)` requiring pgvector extension. pgvector is installed only by `db:push:programs`, which runs AFTER migrations. The chained order works on databases where extensions already exist (local Docker postgres pre-built with extensions, OR a previously-bootstrapped RDS); **it fails opaquely on fresh AWS RDS** because the first migration references a type from an uninstalled extension. **Pattern candidate**: "chained-script ordering assumption — when `script-A && script-B` works, the assumption is dependency-order-correct; on a fresh environment, the assumption inverts and `B`'s outputs are required by `A`'s inputs." Track at 1/5.

---

## §11 Commit-0 stop-and-report shape

Per redirector STEP 4:

1. **Commit hash + diff summary:** TBD (this commit) — plan-doc only, ~XXX lines added.
2. **Audit findings classification counts:**
   - PRESENT: 11 (all core files + scripts + deps).
   - DIVERGENT: 2 (abandon-sweep POST-only export; env.ts .optional() vs doc-required).
   - ABSENT: 3 (`packages/superstarter-iac/.alchemy/`, `.vercel/`, `docs/phase-1-manual-verification.md`).
   - DOC-WRONG: 1 (sub-type / strategy counts: 11/33 in doc vs 14/42 in code).
3. **Round-shape determination:** **FULL-RUNBOOK**. Infra is fully present in code; nothing built. Pure EXECUTE + VERIFY ledger (C1–C11) plus one BUILD drift-commit at close (C12). One potential mid-round BUILD sub-round (abandon-sweep method fix) gated on C10 outcome.
4. **External-dependency status:** all 10 items in §0.9 flagged `needs-leo-confirmation`; only `bun` and `openssl` self-confirm-able from the audit context. Leo must clear §1.0 before C1.
5. **§6.14.43 sub-type 6 cumulative-deviation count at commit-0:** 0 in-round delta (commit-0 is read-only audit + plan-doc; no app code drafted).
6. **New §6.14 candidate patterns:** 2 (§10.1 redirector-token-pattern-match false positive; §10.2 build-passes / runtime-fails env-var). Both track at 1/5.
7. **Recommended next redirect:** **§1.0 pre-flight commit** — Leo runs the §0.9 probe commands and reports back which items are `have-it` vs `need-to-acquire`. Once §1.0 clears, proceed to §2 C1 (IaC deploy). Do NOT auto-proceed.


---

## §12 Round-close stop-and-report shape

1. **Commit hash + diff summary:** `e44cac9` (drift patch only, 1 line) + this commit (plan-doc round-close populate, ~250 lines). The two-commit split is due to a redirector script anchor mismatch on first attempt; content equivalence preserved.
2. **Round outcome:** **CLOSED-SUCCESS**. Full runbook executed C1 through C8 with two surfaced mid-round BUILD sub-rounds (`oidc-cloudcontrol-bypass`, `cron-hobby-compat`). Infrastructure live and verified: RDS Postgres 18.3 instance `superstarter-main-db` provisioned, 9 migrations applied, 14 sub_types + 42 strategies seeded, Vercel deploy `https://18seconds.vercel.app` serving 200 on `/api/health`, OAuth round-trip succeeded with Auth.js DB writes confirmed via psql audit.
3. **§6.14.43 sub-type 6 final count this round:** 3 in-round deviations (Dev-1 timestamp format, Dev-2 Vercel env var prompt ambiguity, Dev-3 bash history expansion in ARN probe). Inherited ~33+ → ~36+ cumulative.
4. **PROMOTION CANDIDATE 2 status:** HOLDS at 3/5 (3 deviations triggered correction; no increment per §9 step 7).
5. **§6.14.34 sub-rounds fired:** 2 (`oidc-cloudcontrol-bypass` `4a17294`; `cron-hobby-compat` `9a6b563`). 2 pre-authorized triggers did NOT fire (`phase-1-checklist-author`, `env-required-tighten`).
6. **New §6.14 candidate patterns added:** 3 (§10.3 CloudControl-vs-direct-API reliability gap; §10.4 DevFactory-shape-credentials assumption; §10.5 fresh-database migration ordering). Each tracks at 1/5.
7. **Residuals pinned:** 11 entries in §0.11 forward-pin index — see that section.
8. **Verification not completed in this round:**
   - C9 (DB studio via OIDC) — optional, not exercised.
   - C10 (cron tick) — schedule is now daily at 4 AM UTC; next fire will be the morning after this commit. Verification deferred to a follow-up check.
   - C11 (phase-1 manual checklist) — deferred per §0.6 row 2 (c).
9. **Live infrastructure cost clock:**
   - RDS `db.t4g.micro`: ~$0.016/hr = ~$11/month.
   - 20GB gp3 storage: ~$2.30/month.
   - Secrets Manager (1 secret): ~$0.40/month.
   - **Total: ~$14/month** while live. Teardown via `cd packages/superstarter-iac && unset AWS_SESSION_TOKEN AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY && export AWS_REGION=us-east-1 && bun --bun run alchemy.run.ts --destroy`. (Note the bypass invocation per R-deploy-package-json-scripts-need-bypass.)
10. **Recommended next redirect:**
    - **Option A (preferred): pause and resume user-question-reports round** at `4cfb3b9`, which is the active paused round with §1.1 + §1.2 complete and §2 next.
    - **Option B**: open a new docs-cleanup round to author `docs/phase-1-manual-verification.md` + patch `docs/DEPLOYMENT.md` references to `bun run deploy` (R-deploy-package-json-scripts-need-bypass + R-deployment-md-references-bun-run-deploy + R-phase1-manual-checklist-absent).
    - **Option C**: open a permanent-fix round for R-sts-session-token-iam-write-restriction (add MFA to iac-admin, OR patch with-aws.ts to fall back to long-term creds).
    - **Option D**: investigate R-purveyor-rds-prexisting and decide teardown.
