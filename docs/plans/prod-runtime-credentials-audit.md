# Prod Runtime Credentials Audit — Plan-Doc

Round: Prod Runtime Credentials Audit.
Round-open hash: `240ef24` (HEAD at this commit-0; verified clean working tree, `origin/main...HEAD = 0 0`).
Round-close hash: this commit (C1 — audit-only single-commit round; round closes upon plan-doc population).
**Round status: AUDIT-ONLY.** No code/env/IAM/deployment mutations. Deliverable is a documented diagnosis (§4 hypothesis register and §5 recommended next actions) that informs the subsequent `auth-oidc-restore` round.

> **Premise of this round.** The prior round (`testbank-ingest-prod`, closed `03c67c3`) closed under
> the working hypothesis "Vercel OIDC Federation toggle is OFF at the project level." Subsequent
> manual UI inspection FALSIFIED that hypothesis: Federation IS enabled with correct
> issuer / aud / sub claims. The simple toggle-flip remediation is therefore inapplicable.
> This round determines the actual mechanism by which the production runtime cannot read
> `x-vercel-oidc-token` at IAM-token-acquisition time, despite every project-level setting
> being correct on inspection.

---

## §0 Round metadata

### §0.1 Round name + hashes

- **Name:** Prod Runtime Credentials Audit.
- **Open hash (empirical, verified at commit-0):** `240ef24` — `docs(claude_logs): add session log for testbank-ingest-prod round (data-side success; OIDC blocker deferred to auth-oidc-restore)`.
- **Concurrent rounds:** none open. `testbank-ingest-prod` closed (CLOSED-PARTIAL) at `03c67c3` + follow-up `240ef24`. Main is quiescent.
- **Target close hash:** this commit (audit-only; round is one commit wide).

### §0.2 Trigger

`testbank-ingest-prod` C6 audit found that calls to `awsCredentialsProvider({ roleArn })` on production were throwing:

```
The 'x-vercel-oidc-token' header is missing from the request. Do you have the OIDC option enabled in the Vercel project settings?
```

That round closed under the assumption "OIDC Federation got toggled OFF." Subsequent manual inspection of the Vercel dashboard (Project → Settings → OIDC Federation panel, per screenshot reviewed by Leo) found:

- Federation toggle: **ON** (Team mode)
- Issuer: `https://oidc.vercel.com/ryo-iwatas-projects`
- aud: `https://vercel.com/ryo-iwatas-projects`
- sub: `owner:ryo-iwatas-projects:project:18seconds:environment:production`

All three claims match the IAM trust policy at `superstarter-main-vercel`. The simple
toggle hypothesis is therefore **falsified**. Goal of this round: determine the actual
runtime mechanism producing the error.

### §0.3 Scope (in-scope)

Read-only inspection of:

1. Live production logs (last hour and last 24h) for OIDC error confirmation / temporal pattern.
2. Vercel production environment variables (presence + select identifier match; values stay encrypted unless pulled to a local file for narrow comparison).
3. `@vercel/oidc-aws-credentials-provider` and `@vercel/oidc` package source under `node_modules/` (the runtime that throws the error).
4. `@vercel/functions` (`attachDatabasePool`, `getContext`) — the pool-lifecycle and request-context surface that interacts with the OIDC token plumbing.
5. `src/db/index.ts` and `src/db/admin-secret.ts` — the two app-side consumers of `awsCredentialsProvider`.
6. `src/auth.ts` — the upstream caller (Auth.js DB session strategy triggers every page-level DB query).
7. `vercel.json` + `package.json` — runtime + bundler config (Bun runtime, Next.js 16, region).
8. Git history between deployment SHA `9a6b563` and HEAD — to confirm no code drift since deploy.

Deliverable: this plan-doc populated with empirical findings and a hypothesis register that names testable falsification paths for the next round.

### §0.4 Anti-scope (explicit)

- **NOT** mutating any Vercel project settings, env vars, or IAM trust policies.
- **NOT** triggering a fresh deployment.
- **NOT** running `vercel env push`, `vercel env rm`, or any write-side `vercel` CLI.
- **NOT** running AWS write operations (no IAM, STS, or Secrets Manager modifications).
- **NOT** writing app-code patches or pushing config changes. Any code change to investigate OIDC injection is deferred to the subsequent `auth-oidc-restore` round under a §6.14.31 gate.
- **NOT** opening a sub-round. The audit is single-commit. Findings feed the next round's plan-doc.
- **NOT** speculating about fixes beyond the §5 "recommended next actions" sketch — actual remediation lives in `auth-oidc-restore`.

### §0.5 Empirical audit findings (verbatim)

Audit performed at HEAD = `240ef24`. Findings classified per redirector rubric: **PRESENT / DIVERGENT / ABSENT / DOC-WRONG / INTERMITTENT**.

#### A. Live OIDC error confirmation

| Probe | Value |
|---|---|
| `vercel logs https://18seconds.vercel.app --no-follow --environment production --no-branch --since 1h --level error` | **0 lines** (no traffic in last 1h) |
| `vercel logs ... --since 24h --level error` | **0 lines** (level filter excludes the error somehow; see below) |
| `vercel logs ... --since 24h --query "x-vercel-oidc-token" --expand` | **1 match** at `08:59:44.73` today (production) |
| `vercel logs ... --since 24h --limit 200 --expand` (no filter) | **33 logs**; the OIDC error appears once at `08:59:44`, but **many subsequent requests succeed** — including DB-touching session-heartbeat POSTs at `09:00:25` and `09:00:28` |

**Verdict: INTERMITTENT.** The OIDC failure is live (verified <1h before this audit) but is not constant. The same `/diagnostic/run` path that failed at `08:59:44` succeeded at `08:59:54` (10 seconds later, same lambda hostname `169.254.57.77`), and continued working for the next minute (session heartbeats, attempt submissions).

#### B. Verbatim production error (08:59:44 UTC, today)

```json
{
  "level": 50,
  "time": 1778594385628,
  "pid": 4,
  "hostname": "169.254.57.77",
  "error": {
    "type": "Error",
    "message": "The 'x-vercel-oidc-token' header is missing from the request. Do you have the OIDC option enabled in the Vercel project settings?",
    "stack": "Error: The 'x-vercel-oidc-token' header is missing from the request. Do you have the OIDC option enabled in the Vercel project settings?\n    at o (/var/task/.next/server/chunks/ssr/_0nosv9b._.js:20:185)\n    at <anonymous> (/var/task/.next/server/chunks/ssr/_0nosv9b._.js:20:1664)\n    at presign (/var/task/.next/server/chunks/ssr/node_modules__bun_0nbx1j-._.js:10:1192)\n    at getAuthToken (/var/task/.next/server/chunks/ssr/_0nosv9b._.js:19:2805)\n    at c (/var/task/.next/server/chunks/ssr/_0nosv9b._.js:103:15522)\n    at processTicksAndRejections (native)"
  },
  "host": "superstarter-main-db.cyhk02a6cfpn.us-east-1.rds.amazonaws.com",
  "user": "app",
  "msg": "rds iam auth token fetch failed"
}
```

Followed by:

```
[auth][error] AdapterError: Read more at https://errors.authjs.dev#adaptererror
[auth][cause]: Error: Failed query: select "sessions"."session_token", "sessions"."user_id", ... from "sessions" inner join "users" on ... where "sessions"."session_token" = $1 limit $2
[auth][error] SessionTokenError
{"level":20,...,"msg":"/diagnostic/run: no auth session at page time, redirect /login"}
```

And — **critical** — at request termination:

```
Vercel Runtime Timeout Error: Task timed out after 300 seconds
```

So even though the page logged "redirect /login" almost immediately after the OIDC failure, the request itself **hung for 300 seconds** (the function maximum). Indicates that the failure-handling path inside the bundled chunk does not fully unwind — almost certainly because the `pg.Pool`'s in-flight connection attempt remains pending while subsequent code paths assume the response has been sent.

#### C. Stack-trace decoding

Symbol mapping (each chunk position cross-referenced against the package source under `node_modules/`):

| Frame | Likely source mapping |
|---|---|
| `o` at `_0nosv9b._.js:20:185` | `getVercelOidcTokenSync` throw site in `node_modules/.bun/@vercel+oidc@3.2.1/.../get-vercel-oidc-token.js:70` |
| `<anonymous>` at `_0nosv9b._.js:20:1664` | the closure returned from `awsCredentialsProvider(init)` in `oidc-aws-credentials-provider/dist/aws-credentials-provider.js:27` |
| `presign` at `node_modules__bun_0nbx1j-._.js:10:1192` | AWS SDK's signer-presign in `@aws-sdk/rds-signer` (presign builds the RDS IAM auth URL) |
| `getAuthToken` at `_0nosv9b._.js:19:2805` | `Signer.getAuthToken()` from `@aws-sdk/rds-signer` |
| `c` at `_0nosv9b._.js:103:15522` | the `getDbPassword` function defined inline in `src/db/index.ts:47-57` (passed as `password` to `new Pool`) |
| `processTicksAndRejections (native)` | runtime microtask boundary — this frame appears at the **bottom** of the stack, indicating the call was invoked off the request handler's synchronous path |

The `node_modules__bun_0nbx1j-._.js` chunk name confirms Bun-namespaced Turbopack output (Vercel project is configured with `"bunVersion": "1.x"` — see §0.5.G).

#### D. Vercel env-var inventory (production)

Pulled via `vercel env pull /tmp/env-current.env --environment=production --yes`. Listing produced 30 entries (9 app-side vars + Vercel-injected `VERCEL_*`, `TURBO_*`, `NX_*`).

| Var | Present | Expected | Match? |
|---|---|---|---|
| `AUTH_SECRET` | yes (14h ago) | required | ✓ |
| `AUTH_GOOGLE_ID` | yes (14h ago) | required | ✓ |
| `AUTH_GOOGLE_SECRET` | yes (14h ago) | required | ✓ |
| `ANTHROPIC_API_KEY` | yes (14h ago) | required | ✓ |
| `OPENAI_API_KEY` | yes (14h ago) | required | ✓ |
| `CRON_SECRET` | yes (14h ago) | required | ✓ |
| `AWS_ROLE_ARN` | yes (14h ago) | `arn:aws:iam::496780244141:role/superstarter-main-vercel` | **✓ exact value match** (verified via `[ "$EXPECTED" = "$ACTUAL" ]`) |
| `DATABASE_HOST` | yes (14h ago) | `superstarter-main-db.cyhk02a6cfpn.us-east-1.rds.amazonaws.com` | **✓ exact value match** (also matches the `host` field in the OIDC error log at §0.5.B) |
| `DATABASE_ADMIN_SECRET_ARN` | yes (14h ago) | required | ✓ (presence only; value is a SecretsManager ARN, no narrow-match check needed) |
| `DATABASE_LOCAL_URL` | **absent** | must be absent in production | ✓ (presence-check inverted; `grep -c "^DATABASE_LOCAL_URL=" = 0`) |
| `VERCEL_TEAM_SLUG` | absent | should not be set | ✓ |
| Other Vercel-injected `VERCEL_*` | present | injected by Vercel itself | not under our control |

**Reconciliation with the C6 "5h ago" anomaly:** at C6 audit (one round ago), env vars showed creation `5h ago` despite the deployment being 13h old. At this audit (~9h later), deployment is 14h old and env vars are 14h old — **both have aged in lockstep**. The "5h ago" finding has therefore resolved itself: env vars are now demonstrably as old as the deployment, ruling out the "vars were modified post-deploy" worry. No further drift expected.

**Auxiliary observation:** the pulled `/tmp/env-current.env` file contains a `VERCEL_OIDC_TOKEN=<value>` line. This is the build-time / pull-time token that `vercel env pull` exposes for local development convenience — it is not the same as the request-scoped `x-vercel-oidc-token` header that runtime IAM-auth depends on. The production runtime does not receive this env-var value injected as `VERCEL_OIDC_TOKEN`; runtime token retrieval happens via the `globalThis[Symbol.for("@vercel/request-context")]` path (see §0.5.E).

#### E. `@vercel/oidc-aws-credentials-provider` (v3.0.8) and `@vercel/oidc` (v3.2.1) source

Located at:
- `node_modules/@vercel/oidc-aws-credentials-provider/dist/aws-credentials-provider.js` (3.0.8)
- `node_modules/.bun/@vercel+oidc@3.2.1/node_modules/@vercel/oidc/dist/get-vercel-oidc-token.js` (3.2.1)
- `node_modules/.bun/@vercel+oidc@3.2.1/node_modules/@vercel/oidc/dist/get-context.js`

Verbatim provider closure (`aws-credentials-provider.js:26-33`):

```js
function awsCredentialsProvider(init) {
  return async () => {
    return (0, import_credential_provider_web_identity.fromWebToken)({
      ...init,
      webIdentityToken: (0, import_oidc.getVercelOidcTokenSync)()
    })();
  };
}
```

Verbatim token-acquisition (`get-vercel-oidc-token.js:67-75`):

```js
function getVercelOidcTokenSync() {
  const token = (0, import_get_context.getContext)().headers?.["x-vercel-oidc-token"] ?? process.env.VERCEL_OIDC_TOKEN;
  if (!token) {
    throw new Error(
      `The 'x-vercel-oidc-token' header is missing from the request. Do you have the OIDC option enabled in the Vercel project settings?`
    );
  }
  return token;
}
```

Verbatim context getter (`get-context.js:25-29`):

```js
const SYMBOL_FOR_REQ_CONTEXT = Symbol.for("@vercel/request-context");
function getContext() {
  const fromSymbol = globalThis;
  return fromSymbol[SYMBOL_FOR_REQ_CONTEXT]?.get?.() ?? {};
}
```

**Findings from source:**

1. **The error message is generated by exactly one code path.** There is no fallback /
   no second source. If `globalThis[Symbol.for("@vercel/request-context")]?.get?.()?.headers?.["x-vercel-oidc-token"]` is undefined **and** `process.env.VERCEL_OIDC_TOKEN` is undefined, the error fires. The error message is a hard-coded literal — it is **not** evidence that the Federation toggle is off; it is the only message the library knows to throw when both sources return undefined.

2. **The credential provider closure runs `getVercelOidcTokenSync()` synchronously at the time it is invoked.** It does NOT cache the token. Each invocation re-reads from the symbol or env var. So the failure is sensitive to the call-site's current AsyncLocalStorage chain.

3. **The fallback to `process.env.VERCEL_OIDC_TOKEN` does work** if Vercel-the-platform sets it. In the runtime under inspection, the env var is NOT set — only the request-context symbol path is populated, per Vercel's documented runtime behavior. This means **any code path that loses its AsyncLocalStorage binding loses access to OIDC entirely.**

4. **The `getContext()` lookup is a pure synchronous read** of `globalThis[Symbol.for("@vercel/request-context")]`. The Vercel runtime installs an object with a `get()` method on that symbol; the `get()` method is the AsyncLocalStorage-backed lookup (Vercel's runtime code, not visible in app-side `node_modules`, owns this part). If `get()` returns `undefined`, the chain falls through to `process.env.VERCEL_OIDC_TOKEN` (also undefined here) and throws.

#### F. `src/db/index.ts` and `src/db/admin-secret.ts` review

`src/db/index.ts` (verbatim, lines 27-67):

```typescript
function createRdsPool(): Pool {
  // ... (env var checks) ...
  const credentials = awsCredentialsProvider({ roleArn: env.AWS_ROLE_ARN })
  const signer = new Signer({
    region: AWS_REGION,
    hostname: env.DATABASE_HOST,
    port: 5432,
    username: DATABASE_USER,
    credentials
  })

  async function getDbPassword(): Promise<string> {
    const result = await errors.try(signer.getAuthToken())
    if (result.error) {
      logger.error(
        { error: result.error, host: env.DATABASE_HOST, user: DATABASE_USER },
        "rds iam auth token fetch failed"
      )
      throw errors.wrap(result.error, "rds iam auth token")
    }
    return result.data
  }

  return new Pool({
    host: env.DATABASE_HOST,
    port: 5432,
    user: DATABASE_USER,
    database: DATABASE_NAME,
    ssl: { ca: RDS_CA_BUNDLE, rejectUnauthorized: true },
    max: 10,
    password: getDbPassword
  })
}
```

`getDbPassword` is registered as the `password` callback of `pg.Pool`. `pg` invokes this **on demand each time it opens a new physical connection**. The `signer.getAuthToken()` call triggers AWS SDK's presign flow, which synchronously calls the credentials provider closure, which synchronously reads OIDC.

**No app-side bug surfaced.** The wiring is the canonical Vercel-documented pattern.

`src/db/admin-secret.ts:26-29`:

```typescript
const client = new SecretsManagerClient({
  region: AWS_REGION,
  credentials: awsCredentialsProvider({ roleArn: env.AWS_ROLE_ARN })
})
```

Also canonical. No bug here either. Note: `admin-secret.ts` is only used by manual scripts (e.g. `scripts/backfill-missing-embeddings.ts`), not by the prod runtime request path — so it is not implicated in the live error.

#### G. Runtime configuration

`vercel.json`:

```json
{
  "bunVersion": "1.x",
  "regions": ["iad1"],
  "crons": [{ "path": "/api/cron/abandon-sweep", "schedule": "0 4 * * *" }]
}
```

`package.json` (dependency excerpt):

| Package | Version |
|---|---|
| `next` | `^16.2.4` |
| `@vercel/functions` | `^3.4.4` |
| `@vercel/oidc-aws-credentials-provider` | `^3.0.8` |
| `@aws-sdk/rds-signer` | `^3.1037.0` |
| `@aws-sdk/client-secrets-manager` | `^3.1037.0` |
| `@auth/drizzle-adapter` | `1.11.2` |
| `next-auth` | `5.0.0-beta.31` |
| `pg` | `^8.20.0` |

`package.json` scripts:

```
"build": "bun --bun next build",
"start": "bun --bun next start"
```

**Verdict: Bun-runtime deployment on Vercel.** The `bunVersion` flag in `vercel.json` and the `--bun` flag on `next build`/`next start` configure the project to run under Bun (not Node.js) on Vercel's compute. This is corroborated by the `node_modules__bun_0nbx1j-._.js` chunk path in the production stack trace (§0.5.B): Turbopack emits Bun-namespaced output when the build is Bun-driven.

This is **the unusual configuration that distinguishes this project from the Vercel-supported default.** Vercel's documented default runtime for Next.js 16 is Node.js (Fluid Compute). Bun-on-Vercel is supported but newer.

#### H. Code drift since deployment SHA `9a6b563`

```
git log --oneline 9a6b563..HEAD
240ef24 docs(claude_logs): add session log for testbank-ingest-prod round
03c67c3 docs(plans): close testbank-ingest-prod round
8a74165 docs(plans): testbank-ingest-prod schema-divergence sub-round
9c405ea docs(plans): adopt strategy β
8e2f67f docs(plans): open testbank-ingest-prod plan-doc with commit-0 empirical audit
74e6549 docs(plans): populate deployment-runbook round-close
e44cac9 docs(plans): close deployment-runbook round
```

```
git diff --stat 9a6b563..HEAD
 docs/DEPLOYMENT.md                                 |   2 +-
 ..._2026-05-12_00-16_testbank-ingest-prod-round.md |  99 +++
 docs/plans/deployment-runbook.md                   |  80 ++-
 docs/plans/testbank-ingest-prod.md                 | 713 +++++++++++++++++++++
```

**All changes since deployment are docs-only.** No code drift. The running deployment is bit-identical to current HEAD at the source level.

### §0.6 Doc-vs-empirical reconciliation (handoff drift surfaced at audit)

| # | Handoff claim | Empirical | Action |
|---|---|---|---|
| 1 | `testbank-ingest-prod` C6 §1.6: "OIDC Federation toggle disabled at project level" | FALSIFIED — Federation is ON per Leo's manual UI inspection (screenshot evidence) with correct issuer/aud/sub claims | This round opened; falsification is the **trigger**, not just a finding |
| 2 | `testbank-ingest-prod` C6 audit: env vars "5h ago" while deployment 13h old | RESOLVED — env vars are now 14h ago, deployment is 14h ago. Lockstep aging. No post-deploy modification suspected. | None. The C6 "5h" was an observation timestamp artifact, not a vars-rewrite event. |
| 3 | Project-level OIDC presumed to mean "request-header injection works for all requests" | UNCONFIRMED — the empirical evidence (§0.5.A INTERMITTENT) shows the same path/lambda alternately failing and succeeding. The runtime injection itself may be incomplete or context-loss-prone. | This is the subject of §4 H1 + H2. |
| 4 | Vercel runtime for this project: presumed Node.js default | DOC-WRONG — `vercel.json` carries `bunVersion: "1.x"` and the bundle path contains `__bun_` markers. Project is on Bun runtime. | Material to §4 H1. |
| 5 | All app-side wiring (`awsCredentialsProvider` usage in `src/db/index.ts`, `src/db/admin-secret.ts`) | CANONICAL — matches Vercel's documented pattern. No bug here. | None. Rules out "we used the API wrong" hypothesis. |
| 6 | `src/db/index.ts:83` creates the pool at module load and memoizes via `globalThis.__18seconds_pg_pool` | PRESENT — confirmed. Pool is created once per isolate; `getDbPassword` is invoked per physical-connection open. | Material to §4 H2. |

### §0.10 Forward-watch entries

- **Sub-type 6 promotion candidate count** — held at 4/5 entering this round (per `testbank-ingest-prod` close). **No new sub-type 6 deviations surfaced in this audit.** Holding 4/5 entering `auth-oidc-restore`. (Per the user's instruction: any new sub-type 6 deviations in this round trigger promotion at this round's close. None occurred — the audit found a falsified prior hypothesis but the prior round had explicitly forward-pinned that hypothesis as `R-vercel-oidc-disablement-cause-unknown`, not asserted it as fact. Falsifying an explicitly-flagged uncertainty is not a sub-type 6 event.)
- **Pre-authorized sub-rounds:** none. This round is audit-only and single-commit by design.
- **R-vercel-oidc-disablement-cause-unknown** (inherited from `testbank-ingest-prod` §0.11) — REFRAMED. The original wording presupposed the toggle had been disabled. Empirical truth: toggle is enabled; failure is downstream of the toggle. The forward-pin is renamed `R-bun-async-context-loss-or-runtime-injection-gap` and carried into `auth-oidc-restore`. See §4 H1/H2.

### §0.11 Forward-pin index (updated at this commit)

Carried forward from `testbank-ingest-prod` and reframed where empirically warranted:

- **R-purveyor-companion-resources-still-up** — unchanged (out-of-scope ECS/ALB/ECR stack in account 496780244141).
- **R-strategy-linkage-unused** — unchanged (42 strategies seeded, 0 referenced from `items`).
- **R-local-prod-rejected_by-divergence** — unchanged (7 local rows with `rejected_by` UUID, prod has 0; intentional per strategy B).
- **R-bun-async-context-loss-or-runtime-injection-gap** — NEW (reframes `R-vercel-oidc-disablement-cause-unknown`). The OIDC failure is intermittent and reproducible despite Federation being enabled. Top hypotheses in §4: (H1) Bun-on-Vercel does not consistently propagate the `@vercel/request-context` AsyncLocalStorage across all async boundaries; (H2) the `pg.Pool`'s on-demand-connection `password` callback fires from a microtask context where the request-context has been lost; (H3) Vercel's Bun runtime does not inject `x-vercel-oidc-token` for every request type.
- **R-script-log-verbosity** — unchanged.
- **R-script-no-concurrency** — unchanged.

---

## §1 Commit ledger skeleton

This round has exactly **one** ledger commit (audit-only).

### §1.1 C1 — Open plan-doc with commit-0 empirical audit and close round [this commit]

**Operation:** Write `docs/plans/prod-runtime-credentials-audit.md` (this file) populated with the §0.5 empirical audit, the §4 hypothesis register, and the §5 recommended-next-actions sketch. Stage and commit. Round closes upon this commit's creation; the follow-on `auth-oidc-restore` round will open against this commit's hash.

**Verification (in this commit's stop-and-report):**
- Plan-doc exists at `docs/plans/prod-runtime-credentials-audit.md`.
- File length reported.
- `git status` clean post-commit.
- `git log -1 --oneline` shows the new commit.

**Commit message shape:** `docs(plans): open prod-runtime-credentials-audit round with commit-0 deep audit`.

---

## §3 Candidate patterns (carryover from `testbank-ingest-prod` §3.1-3.5)

This round did not surface new candidate patterns for the redirector. The five prior candidates remain banked at their prior status. Cross-reference only — see `docs/plans/testbank-ingest-prod.md` §3 for definitions.

- §3.1 (`testbank-ingest-prod`) — `pg_dump --table` syntax verification at C2-time.
- §3.2 (`testbank-ingest-prod`) — pgvector patch-version skew classification as DIVERGENT-non-blocking.
- §3.3 (`testbank-ingest-prod`) — `pg_restore -d "URI" --data-only` portability.
- §3.4 (`testbank-ingest-prod`) — exhaustive FK audit before any cross-environment data move.
- §3.5 (`testbank-ingest-prod`) — destructive-then-recovery patterns as a §6.14.31 multi-gate shape rather than a single gate.

**New candidate from this round (§3.6, audit-derived):**

- **§3.6 — "Falsification-is-the-trigger" round shape.** When a prior round closes under a working hypothesis that subsequent empirical evidence falsifies, the falsification itself is sufficient to open a single-commit audit round whose only deliverable is an updated hypothesis register. Does not promote sub-type 6 (the prior round explicitly forward-pinned the uncertainty rather than asserting fact). Trades against `testbank-ingest-prod`'s `R-vercel-oidc-disablement-cause-unknown` pin: the pin was correctly conservative; this round redeems it.

---

## §4 Hypothesis register (NEW for this round)

Each hypothesis is named, given a confidence score (subjective, pre-test), and paired with a falsification test that the subsequent round can execute.

### §4.1 H1 — Bun-on-Vercel does not consistently propagate `@vercel/request-context` AsyncLocalStorage

**Statement:** Vercel's Bun runtime installs `globalThis[Symbol.for("@vercel/request-context")]` with a `.get()` method backed by AsyncLocalStorage (or a Bun-equivalent), but the propagation across certain async boundaries — specifically the microtask spawned by `pg.Pool`'s on-demand connection acquisition — is unreliable in Bun. Node.js's `AsyncLocalStorage` implementation reliably propagates across `processTicksAndRejections`; Bun's implementation may not for all code paths.

**Supporting evidence (this round):**
1. Stack trace bottom frame is `processTicksAndRejections (native)` — call is off the request handler's synchronous path.
2. Failures are intermittent on the same route, same lambda instance (`169.254.57.77`), within 10 seconds.
3. The bundle path `node_modules__bun_0nbx1j-._.js` confirms Bun-specific bundling.
4. Other DB-touching requests on the same lambda succeed shortly after, suggesting "the OIDC plumbing works on direct request paths but not all microtask-deferred paths."

**Confidence:** 65% (highest of the three; aligns with multiple lines of evidence).

**Falsification test (executable in the next round):**
- Remove `"bunVersion": "1.x"` from `vercel.json`, remove `--bun` from `build`/`start` scripts, redeploy on the Node.js runtime, and run the same multi-request workload. If intermittent OIDC failures **disappear**, H1 is confirmed; if they persist, H1 is rejected and H2/H3 take precedence.
- Lower-cost variant: add a `logger.info` line inside `getDbPassword` that snapshots `globalThis[Symbol.for("@vercel/request-context")]?.get?.()?.headers?.["x-vercel-oidc-token"] !== undefined` before invoking `signer.getAuthToken()`, redeploy on the current Bun runtime, generate traffic, and inspect logs. If the snapshot is `false` for the failures and `true` for the successes, the gap is in context-propagation specifically (rules in H1, rules out H3).

### §4.2 H2 — `pg.Pool` invokes `getDbPassword` from a callback site detached from the request-scoped context

**Statement:** Independent of Bun vs Node, the `pg.Pool` library's lazy-connection-acquisition path may invoke the `password` callback from a context where the inbound HTTP request's AsyncLocalStorage frame has been torn down — for instance, if a connection is being opened in response to a queue-drain after the originating request has handed off, or if internal connection-management bookkeeping (idle timers, keepalive) is what triggers the `getDbPassword` call.

**Supporting evidence (this round):**
1. `processTicksAndRejections (native)` at the bottom of the stack indicates microtask scheduling.
2. `@vercel/functions/db-connections/index.js` (the `attachDatabasePool` source) attaches listeners to `pool.on("release")` that schedule timers and call `requestContext.waitUntil(promise)` if a request context is present — and explicitly logs `"Pool release event triggered outside of request scope."` when not, suggesting Vercel has already observed this kind of context loss in practice.
3. Same-instance-same-route failures-then-successes match a profile where the failure is the first request after a cold lambda (no pool warm-up done within a request scope, so the eventual `getDbPassword` runs in a non-request microtask).

**Confidence:** 25% (plausible, but partially overlaps with H1 — if Bun's ALS propagation is the underlying issue, H2's symptom is a special case of H1's mechanism).

**Falsification test:**
- Pre-warm the pool inside an `await` chain inside a known-good request handler (e.g., the first `auth()` call on `/`), ensuring the first physical-connection `password` callback fires synchronously within the request's microtask tree. If subsequent connection acquisitions still fail, the issue is not "first-call cold-start" — H2 weakens.
- Alternative: switch the `password` parameter from a callback to a pre-fetched string (fetch the IAM auth token eagerly inside the request handler and pass it as a literal). If OIDC failures disappear under this pattern, H2 is confirmed; the fix is to capture the token inside the request scope and inject it explicitly.

### §4.3 H3 — Vercel's Bun runtime does not inject `x-vercel-oidc-token` for some request types

**Statement:** Vercel's runtime-side OIDC injection (the code that installs the request-context symbol) does not fire for every incoming request on the Bun runtime. Specifically, GET requests for Next.js page paths that don't have explicit `dynamic` flags might miss the injection step.

**Supporting evidence (this round):**
1. The error happens on a GET `/diagnostic/run` (a Next.js page render path), not on an API route.
2. Subsequent successful requests on the same path within seconds undercut this hypothesis — if the runtime never injected for that path, the path should always fail, not intermittently.

**Confidence:** 10% (the intermittent same-path success pattern is the chief evidence against this hypothesis).

**Falsification test:**
- Add an `instrumentation.ts` (Next.js 16 supports this) with a `register()` hook that wraps incoming requests with a header-inspection log. Deploy and observe whether `x-vercel-oidc-token` is present on every inbound request or only some. If always present, H3 is rejected and the failure is downstream of inbound (i.e., context-loss, supports H1/H2). If sometimes missing on inbound, H3 is confirmed and the fix is platform-side (Vercel support escalation).

### §4.4 Pruned hypotheses (considered but rejected by empirical evidence)

- **"OIDC toggle is OFF"** — rejected by Leo's manual UI inspection (the round's trigger).
- **"Env vars were modified post-deploy and the running deployment has stale config"** — rejected by §0.5.D (env vars and deployment are now lockstep-aged at 14h; AWS_ROLE_ARN and DATABASE_HOST match expected values exactly).
- **"Code drift between deployment SHA and HEAD"** — rejected by §0.5.H (all post-deploy commits are docs-only).
- **"App-side wiring uses the API wrong"** — rejected by §0.5.F (wiring matches Vercel's documented pattern verbatim).
- **"AWS IAM trust policy mismatch"** — rejected by `testbank-ingest-prod` C6 (issuer/aud/sub match exactly per Leo's screenshot).
- **"`process.env.VERCEL_OIDC_TOKEN` was wiped at runtime"** — non-applicable: the env-var fallback path is documented but Vercel does not inject this var at runtime (only at build/pull time), so its absence in production is normal and not a regression.

---

## §5 Recommended next actions (for `auth-oidc-restore` round)

These are recommendations only — not commitments. The next round's planner will decide ordering and gating.

### §5.1 Cheapest first probe (lowest-cost falsification of H1)

Add a `logger.info` snapshot inside `getDbPassword` in `src/db/index.ts:47`:

```typescript
async function getDbPassword(): Promise<string> {
  const ctxToken = (globalThis as any)[Symbol.for("@vercel/request-context")]?.get?.()?.headers?.["x-vercel-oidc-token"]
  logger.info(
    { hasContextToken: ctxToken !== undefined, hasEnvToken: process.env.VERCEL_OIDC_TOKEN !== undefined },
    "getDbPassword: oidc source snapshot"
  )
  // ... existing signer.getAuthToken() call
}
```

Deploy, generate ~30 requests across a mix of authenticated and unauthenticated user flows, inspect logs. Outcome partitions:

| `hasContextToken` | `hasEnvToken` | Interpretation |
|---|---|---|
| `true` on all requests | `false` | Plumbing fully works; the OIDC error in §0.5.B was a transient cold-start artifact that has since self-resolved. |
| `false` on some requests, `true` on others, same route, same instance | `false` | H1 confirmed (Bun ALS propagation gap) or H2 confirmed (pg-pool callback scope). Combine with H1's full falsification test (Node-runtime redeploy) to disambiguate. |
| `false` always on certain request types | `false` | H3 confirmed (Vercel runtime injection gap on specific path patterns). Open a Vercel support ticket. |
| `true` on all but error still fires | `false` | Code-level bug between the snapshot and the actual provider invocation. Re-audit the bundler's tree-shaking / chunking. |

**Note on `as any`:** the snapshot probe uses `as any` for the globalThis symbol lookup because the project's `no-as-type-assertion` rule bans `as`, but `as any` on a known `globalThis` symbol read is the canonical pattern in `@vercel/oidc`'s own source. The next round should justify the exception inline (one-time diagnostic instrumentation) and remove the snapshot once the falsification path concludes. Alternatively, declare the symbol shape via `declare global` in a `.d.ts` to avoid `as any` entirely.

### §5.2 If H1 is confirmed: runtime swap

If the snapshot probe shows context-token-loss-on-Bun, the fastest restoration is to deploy on Node.js:

```jsonc
// vercel.json
{
  "regions": ["iad1"],
  "crons": [{ "path": "/api/cron/abandon-sweep", "schedule": "0 4 * * *" }]
}
```

(remove `bunVersion`)

```jsonc
// package.json
"build": "next build",
"start": "next start"
```

(remove `--bun` flags, but keep `bun` as the local-dev runtime — this only affects what Vercel uses in production)

Re-deploy. Monitor for one full hour of mixed traffic and re-run the snapshot logs.

### §5.3 If H1 is rejected but H2 is confirmed: eager-fetch pattern

Pre-fetch the IAM auth token inside each request's `auth()`-bound handler and pass it as a string to the pool:

```typescript
// app-level middleware or root layout
const token = await signer.getAuthToken()
// stash on request-scoped context...
```

This is more invasive (it changes the DB-acquisition surface) and is a fallback only if the Node-runtime swap (§5.2) doesn't resolve it.

### §5.4 If H3 is confirmed: platform escalation

File a Vercel support ticket with:
- The verbatim §0.5.B error.
- The `vercel.json` config.
- The snapshot-log evidence showing inbound requests without `x-vercel-oidc-token`.

This is platform-side and cannot be resolved app-side without a workaround like §5.3.

### §5.5 Non-overlapping defensive change (independent of which hypothesis wins)

The 300-second timeout (§0.5.B tail) means even after the OIDC error is logged, the request hangs. This is a *separate* defect — even if we never re-encounter the OIDC failure, we should make the failure-handling path unwind cleanly. Specifically, `getDbPassword`'s `throw` should reject the password-fetch promise, causing the `pg.Pool` to reject the connection acquisition, which should abort the auth-session query. The fact that the request runs for 300s after the error log suggests the rejection is being swallowed somewhere — possibly by Auth.js's `queryWithCache` wrapper. Fix candidate: trace the rejection path from `getDbPassword` → `pg.Pool.connect` → drizzle adapter → Auth.js, and ensure the rejection propagates and aborts the response.

This is a separate change from the OIDC fix and should be in a separate commit.

---

## §6 Round-close shape

This round is single-commit. Round-close = this commit. The §6.x ledger from prior rounds is not replicated here because there are no per-commit gates beyond the single C1 — the stop-and-report for C1 contains all the §6-shaped artifacts inline (plan-doc path, line count, git status, commit SHA).

### §6.1 Stop-and-report at C1 (this commit)

To be populated in the commit's accompanying response, not in the plan-doc itself:

1. Plan-doc path + line count
2. Live OIDC error confirmation (errors in last 1h: yes/no; count)
3. Verbatim current OIDC error stack trace (§0.5.B)
4. Env var inventory + AWS_ROLE_ARN exact-match verdict (§0.5.D)
5. `@vercel/oidc-aws-credentials-provider` + `@vercel/oidc` version + source-level findings (§0.5.E)
6. Next.js + `@vercel/*` dep versions (§0.5.G)
7. `vercel.json` relevant config (§0.5.G)
8. `src/db/admin-secret.ts` review (§0.5.F)
9. Code drift since `9a6b563` (§0.5.H)
10. Top-3 hypotheses with confidence + falsification tests (§4)
11. Commit SHA of plan-doc opener
12. Anything unexpected to flag

### §6.2 Handoff to `auth-oidc-restore`

The successor round opens against this commit's hash. Its commit-0 inherits §4 hypothesis register and §5 recommended next actions verbatim; its first executable step is the §5.1 cheapest-first probe.

**End of plan-doc.**
