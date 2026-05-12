# Deployment

How to get 18 Seconds running in production. This doc is the runbook — start at the top, work down, and you'll have a working preview deployment.

The architecture plan recommends landing the first production deploy as a **Vercel preview** and only flipping to production at launch. Treat the steps below as bringing up the preview-shape first.

---

## Target topology

```
┌────────────────────┐      OIDC federation       ┌──────────────────────────┐
│  Vercel project    │ ─────────────────────────► │  AWS IAM role (us-east-1)│
│  (Next.js + Bun)   │                            │  - rds-db:connect (app)  │
│                    │                            │  - secretsmanager:Get... │
│  /api/cron/*       │                            └──────────┬───────────────┘
│  /api/auth/*       │                                       │
│  workflows         │       RDS IAM auth token              ▼
│                    │ ────────────────────────────► ┌──────────────────────┐
└──────────┬─────────┘                               │ RDS Postgres 18      │
           │                                         │ pgvector + pgcrypto  │
           │   Google OAuth + Anthropic + OpenAI     │ user: app (IAM auth) │
           ▼                                         │ master in Secrets Mgr│
       External APIs                                 └──────────────────────┘
```

Five pieces of infrastructure must exist before the app boots:

1. **AWS account** with a default VPC in `us-east-1`.
2. **RDS Postgres 18** instance (provisioned by the Alchemy IaC).
3. **IAM OIDC provider** federated with `oidc.vercel.com` (provisioned by the IaC).
4. **IAM role** assumable by the Vercel project, with `rds-db:connect` on the `app` DB user and `secretsmanager:GetSecretValue` on the master secret (provisioned by the IaC).
5. **Vercel project** with the right env vars wired up.

The app process never holds a DB password. At runtime it assumes the IAM role via Vercel's OIDC token, asks `@aws-sdk/rds-signer` for a short-lived IAM auth token, and uses that as the `password` field of the `pg` Pool. See `src/db/index.ts`.

---

## Prerequisites

- An **AWS account** in `us-east-1` with a default VPC. If you don't have one: `aws ec2 create-default-vpc --region us-east-1`.
- A **DevFactory AWS credentials dump** at `~/Downloads/credentials.json` (or wherever `DEVFACTORY_CREDS_PATH` points). Only needed by the engineer running `bun run deploy` inside the IaC package — not by the app itself.
- A **Vercel team + project**. You need the team slug (from the dashboard URL) and the project name.
- A **Google Cloud OAuth 2.0 client** with redirect URIs that match your deployment hostnames.
- **Anthropic** and **OpenAI** API keys (required by env validation even in early phases).

---

## 1. Provision AWS infrastructure

The Alchemy workspace at `packages/superstarter-iac` provisions everything. State is committed to git under `packages/superstarter-iac/.alchemy/` — that's the Alchemy team-share model.

One-time per deployer:

```bash
cd packages/superstarter-iac
cp .env.example .env.local
# fill in:
#   VERCEL_TEAM_SLUG=<from the dashboard URL>
#   VERCEL_PROJECT_NAME=<defaults to superstarter; set this if yours differs>
#   ALCHEMY_PASSWORD=<32+ chars; shared via team password manager>
```

`.env.local` is the **only** supported way to supply IaC secrets. CLI overrides like `ALCHEMY_PASSWORD=foo bun run deploy` are rejected — they leak into `ps aux` and shell history.

Deploy:

```bash
cd packages/superstarter-iac
git pull                          # pick up the latest .alchemy/ state
bun run deploy                    # reads .env.local automatically
git add .alchemy && git commit -m "iac: deploy" && git push
```

The deploy logs print the env vars to paste into Vercel:

| Env var | What it is |
| --- | --- |
| `AWS_ROLE_ARN` | The IAM role the Vercel runtime assumes via OIDC. |
| `DATABASE_HOST` | The RDS endpoint hostname. |
| `DATABASE_ADMIN_SECRET_ARN` | ARN of the master-password secret. Safe in env: the role's `secretsmanager:GetSecretValue` is scoped to this ARN. |

Sizing is intentionally minimal: `db.t4g.micro`, single AZ, 20 GB gp3, no backups, no deletion protection. Resize via the IaC when you outgrow it.

For the team workflow, breakglass story, and destroy procedure, see [`packages/superstarter-iac/README.md`](../packages/superstarter-iac/README.md).

---

## 2. Configure the Vercel project

Set the project's framework preset to **Next.js**, install command to `bun install`, and build command to `bun run build`. The repo's `vercel.json` pins `bunVersion: "1.x"` and `regions: ["iad1"]` (US East — colocated with RDS).

### Required environment variables

Set these on the Vercel project (Production + Preview):

| Variable | Source | Notes |
| --- | --- | --- |
| `AWS_ROLE_ARN` | IaC deploy output | Must start with `arn:aws:iam::`. |
| `DATABASE_HOST` | IaC deploy output | RDS endpoint, e.g. `superstarter-main.xxxx.us-east-1.rds.amazonaws.com`. |
| `DATABASE_ADMIN_SECRET_ARN` | IaC deploy output | Must start with `arn:aws:secretsmanager:`. |
| `AUTH_SECRET` | `openssl rand -base64 32` | ≥ 32 chars. Auth.js v5 session encryption key. |
| `AUTH_GOOGLE_ID` | Google Cloud Console | OAuth 2.0 Web Application Client ID. |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console | OAuth 2.0 Web Application Client Secret. |
| `ANTHROPIC_API_KEY` | Anthropic console | Must start with `sk-ant-`. Validated by `src/env.ts` at boot — placeholder values fail. |
| `OPENAI_API_KEY` | OpenAI dashboard | Must start with `sk-`. |
| `CRON_SECRET` | `openssl rand -base64 32` | Bearer token guarding `/api/cron/*` routes. |

**Do not set** `DATABASE_LOCAL_URL` in Vercel — its presence flips the DB pool to plain-password mode and skips the RDS IAM signer (see `src/db/index.ts:75`). It's a local-only escape hatch.

`VERCEL_OIDC_TOKEN`, `VERCEL_PROJECT_PRODUCTION_URL`, and `VERCEL_GIT_COMMIT_SHA` are auto-injected by the Vercel runtime — don't set them manually.

### Google OAuth redirect URIs

In Google Cloud Console → APIs & Services → Credentials, edit your OAuth client and add (one per deployment target):

- `https://<your-production-domain>/api/auth/callback/google`
- `https://<your-preview-domain>/api/auth/callback/google` (one per stable preview URL you use)
- `http://localhost:3000/api/auth/callback/google` (for local dev)

Add the same hostnames to Authorized JavaScript origins. If the OAuth consent screen is still in testing mode, add the relevant developer accounts under **Test users**.

### Pull env vars locally for admin scripts

Once the Vercel env is populated, any developer can authenticate to AWS through the same Vercel OIDC token — no DevFactory dump required for day-to-day DB work:

```bash
vercel link                                # one-time
vercel env pull --environment=development  # writes .env.local
```

`VERCEL_OIDC_TOKEN` lands in `.env.local`, and the admin scripts (`db:push:programs`, `db:migrate`, `db:studio`) use it to mint AWS credentials and Secrets Manager calls. Tokens are short-lived (12h), so re-run `vercel env pull` periodically.

---

## 3. Bootstrap the database (one-time)

Run from your machine, with `.env.local` populated via `vercel env pull`:

```bash
bun db:push:programs    # creates the `app` user, GRANTs rds_iam, installs pgcrypto + pgvector
bun db:migrate          # applies drizzle/0000_*.sql and subsequent migrations
bun db:seed             # 14 sub_types + 42 strategies (3 per sub-type: recognition / technique / trap) (idempotent)
```

`db:push:programs` connects as the RDS **master** user (via Secrets Manager) and is the only path that creates the `app` role. The runtime app connects as `app` and has no privilege to create roles or extensions — that separation is by design.

Once bootstrap is done, normal schema evolution is:

```bash
# edit src/db/schemas/<domain>/<table>.ts
bun db:generate         # human-reviewed SQL into drizzle/
# review the SQL
bun db:migrate          # apply to the connected database
```

`bun db:generate` is **human-led only** — never automate it. See the migrations note in `README.md`.

---

## 4. Deploy the app

Push to the branch that Vercel watches. The build runs `bun --bun next build`. Bun is pinned to `1.x` via `vercel.json`.

Three things to know about the build:

- `src/env.ts` runs at build time (via `import "@/env"` in `next.config.ts`) and fails the build if any required env var is missing or fails its zod check. The error messages from T3 Env include the offending key name.
- `next.config.ts` enables `cacheComponents: true` and `typedRoutes: true`. Routes you import via `<Link href=...>` must be statically resolvable.
- `serverExternalPackages: ["pg", "pino", "pino-pretty"]` keeps the native `pg` driver and Pino transports out of Next's bundler — required for IAM auth to work.

If you need to bypass env validation for an incident-recovery build, set `SKIP_ENV_VALIDATION=1` on the deployment. Don't make this a habit.

---

## 5. Cron + workflows

### Cron

`vercel.json` registers one cron:

```json
{ "path": "/api/cron/abandon-sweep", "schedule": "* * * * *" }
```

Vercel hits the route every minute. The route at `src/app/api/cron/abandon-sweep/route.ts` requires `Authorization: Bearer ${CRON_SECRET}` — Vercel's cron infrastructure includes this header automatically when `CRON_SECRET` is set on the project. If you rotate `CRON_SECRET`, redeploy so the new value lands; the running route checks `env.CRON_SECRET` per request.

The sweep finalizes practice sessions whose `last_heartbeat_ms` is older than 5 minutes and fires `masteryRecomputeWorkflow` per finalized session.

### Vercel Workflows

The app uses [Vercel Workflows](https://useworkflow.dev/) for async work (mastery recompute, generation pipeline, etc.). Workflow files live under `src/workflows/` and use the `"use workflow"` / `"use step"` directives. `next.config.ts` wraps the config in `withWorkflow(...)` — the workflow runtime ships with the deployment and needs no separate configuration.

---

## 6. Verify the deployment

After the first deploy:

1. **Health probe** — `GET https://<your-deploy>/api/health` should return `{"ok":true}`. This route bypasses the auth proxy (`src/proxy.ts` `PUBLIC_PREFIXES`).
2. **OAuth round-trip** — visit `/`, get redirected to `/login`, sign in with Google, land on the practice surface.
3. **Database connectivity** — sign-in writes to `auth.users`; if it works, the RDS IAM auth path is healthy. Inspect via `bun db:studio`.
4. **Cron** — wait one minute after deploy, then check the Vercel logs for `abandon-sweep: finalized` (count will be 0 in a fresh environment, which is fine).
5. **Phase-1 manual checklist** — [`docs/phase-1-manual-verification.md`](phase-1-manual-verification.md) covers schema spot-checks, sign-out and re-sign-in, and the health endpoint. About 15 minutes if everything works on the first try.

---

## Operations

### Rotating secrets

| Secret | Rotation procedure |
| --- | --- |
| `AUTH_SECRET` | Set the new value in Vercel and redeploy. Active sessions are invalidated. |
| `CRON_SECRET` | Set the new value in Vercel and redeploy. The next cron tick uses it. |
| `AUTH_GOOGLE_*` | Rotate in Google Cloud Console, paste new values into Vercel, redeploy. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Rotate in the provider's console, paste into Vercel, redeploy. |
| RDS master password | The IaC stores the master password in Secrets Manager and never exposes it in env. Rotation is via Secrets Manager + an IaC re-deploy if needed. |

Note: there is **no static DB password** to rotate for the runtime app. IAM auth tokens are minted per connection and expire in 15 minutes.

### Resizing the database

Edit `packages/superstarter-iac/modules/database.ts`, re-run `bun run deploy` inside the IaC package, commit the new `.alchemy/` state. The default `db.t4g.micro` / single-AZ / no-backup sizing is intentional for the cost profile of the early phases — bump it before launch.

### Tearing down

```bash
cd packages/superstarter-iac
bun run destroy
git add .alchemy && git commit -m "iac: destroy" && git push
```

The RDS instance has no deletion protection and no final snapshot. The destroy is permanent.

### Logs

Pino is the only logger. In Vercel, logs land in the **Logs** tab — structured JSON in production, pretty-printed locally. Cron and route handlers log with consistent context keys (`sessionId`, `userId`, `count`, `error`).

---

## Troubleshooting

**Build fails with a zod error about an env var.** `src/env.ts` rejected the value. Read the error: it names the variable and the expected shape (e.g., must start with `arn:aws:iam::`). Fix the value in Vercel and redeploy.

**Runtime error: `db pool: AWS_ROLE_ARN and DATABASE_HOST required when DATABASE_LOCAL_URL is unset`.** One of the AWS env vars is missing. Confirm the IaC deploy succeeded and that the printed values are pasted into Vercel for the deployment's environment (Production vs Preview are separate).

**RDS IAM auth fails (`PAM authentication failed` or similar in Postgres logs).** The `app` user exists but lacks `rds_iam`. Re-run `bun db:push:programs` against the same RDS instance — it's idempotent and re-issues `GRANT rds_iam TO app`.

**OAuth callback returns `redirect_uri_mismatch`.** The deployment's hostname isn't in the Google OAuth client's Authorized redirect URIs. Add `https://<host>/api/auth/callback/google` and try again.

**Cron returns 401 in the Vercel logs.** `CRON_SECRET` is unset or mismatched. Set it on the project, redeploy.

**`drizzle-kit migrate` fails opaquely.** See the Drizzle-Kit recovery section in [`../README.md`](../README.md#drizzle-kit-migrate--recovery-from-opaque-failures) for the manual-apply procedure.

---

## Cross-references

- [`../packages/superstarter-iac/README.md`](../packages/superstarter-iac/README.md) — full IaC team workflow, breakglass story, destroy.
- [`architecture_plan.md`](architecture_plan.md) — system-level view; production-deployment topology rationale.
- [`SPEC.md`](SPEC.md) — engineering spec for the routes, server actions, and workflows the deployment serves.
- [`phase-1-manual-verification.md`](phase-1-manual-verification.md) — post-deploy smoke test.
