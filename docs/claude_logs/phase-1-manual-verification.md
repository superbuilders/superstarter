# Phase 1 — Manual Verification Checklist

Phase 1 is autonomously complete: code paths verified, lint/typecheck/tests green, dependencies pinned, schemas + seeds + migration committed. The remaining verification requires real OAuth credentials, a reachable Postgres, and a browser flow — none of which an autonomous agent can do.

Work top-to-bottom. Stop and report at the first failure; the diagnostic notes at the bottom of this file cover the most common ones.

---

## 0. Pick your database path

The architecture plan (`docs/architecture_plan.md`) says local development uses a `pgvector/pgvector:pg16` Docker container. **The codebase as it stands does not yet have a local Docker override** — `src/db/index.ts` always uses AWS RDS Signer (IAM auth), and `src/db/admin.ts` / `src/db/scripts/drizzle-kit-shim.ts` always pull admin credentials from AWS Secrets Manager. The `db:push:programs` step also runs `GRANT rds_iam`, which only exists on AWS RDS.

You have two choices:

**Path A — AWS RDS now (recommended for Phase 1).** You already have the RDS instance, the OIDC role, and the admin secret in Secrets Manager (per `docs/SPEC.md` IaC notes). Use that, and the code runs unchanged.

**Path B — Local Docker first.** Then a small local-override layer needs to be added to `src/db/admin.ts`, `src/db/index.ts`, and `src/db/scripts/drizzle-kit-shim.ts` to fall back to a password connection string when an env flag (e.g. `DATABASE_LOCAL_URL`) is set, and the `GRANT rds_iam` line in `src/db/programs/index.ts` needs to be conditionalized. **This is not yet implemented and is out of scope for Phase 1's autonomous verification.** If you want this path, treat it as a Phase 1.5 task and surface it before Phase 2 starts.

Pick a path before continuing.

---

## 1. Google Cloud Console — OAuth client

- [ ] Open the Google Cloud Console for the project you'll use for 18 Seconds.
- [ ] Navigate to **APIs & Services → Credentials**.
- [ ] Create a new **OAuth 2.0 Client ID**, type **Web application**.
- [ ] **Authorized JavaScript origins**: `http://localhost:3000`
- [ ] **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
- [ ] Save. Copy the Client ID and Client Secret — you'll paste them into `.env` next.

---

## 2. `.env` — required variables

Create `.env` in the repo root (it is gitignored). The schema is defined in `src/env.ts`.

```dotenv
# AWS / RDS — Path A only
AWS_ROLE_ARN=arn:aws:iam::<account>:role/<role-name>
DATABASE_HOST=<your-rds-endpoint>.us-east-1.rds.amazonaws.com
DATABASE_ADMIN_SECRET_ARN=arn:aws:secretsmanager:us-east-1:<account>:secret:<secret-name>

# Auth.js
AUTH_SECRET=<generate via: openssl rand -base64 32>
AUTH_GOOGLE_ID=<from step 1>
AUTH_GOOGLE_SECRET=<from step 1>

# LLM — placeholders are fine for Phase 1, real keys needed in Phase 4
ANTHROPIC_API_KEY=sk-ant-placeholder
OPENAI_API_KEY=sk-placeholder

# Cron — used by Phase 6, but env validation requires it now
CRON_SECRET=<generate via: openssl rand -base64 32>
```

- [ ] `AUTH_SECRET` is at least 32 chars (env schema enforces this).
- [ ] `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set.
- [ ] `ANTHROPIC_API_KEY` starts with `sk-ant-` (placeholder is fine).
- [ ] `OPENAI_API_KEY` starts with `sk-` (placeholder is fine).
- [ ] `CRON_SECRET` is at least 32 chars.
- [ ] `AWS_ROLE_ARN` starts with `arn:aws:iam::` (Path A) or omit if you're not using AWS yet — but note `bun dev` will fail validation if unset.

---

## 3. Database — apply programs, migrations, seeds

- [ ] `bun run db:push:programs` — creates the `app` Postgres user, grants `rds_iam`, installs `pgcrypto` and `vector` extensions. Logs end with `done`.
- [ ] `bun run db:migrate` — applies `drizzle/0000_typical_golden_guardian.sql` and re-runs programs (idempotent).
- [ ] `bun run db:seed` — inserts 11 sub-types and 33 strategies (upsert semantics).

Connect to the database (`bun run db:studio` or any Postgres client) and confirm:

- [ ] `SELECT COUNT(*) FROM sub_types;` → `11`
- [ ] `SELECT COUNT(*) FROM strategies;` → `33`
- [ ] `users` table exists with `email_verified_ms bigint`, `created_at_ms bigint`, `timer_prefs_json jsonb DEFAULT '{}'::jsonb`. **No** `created_at` `timestamp` column.
- [ ] `accounts` table has unique index `accounts_provider_provider_account_id_unique_idx` on `(provider, provider_account_id)` and `id uuid PRIMARY KEY`.
- [ ] `sessions` (Auth.js) has `expires_ms bigint NOT NULL`. **No** `expires` `timestamp`.
- [ ] `practice_sessions` exists with `recency_excluded_item_ids uuid[]` (defaulting to `'{}'::uuid[]`).
- [ ] `items.embedding` is `vector(1536)`.

---

## 4. OAuth flow

- [ ] `bun dev` starts on `http://localhost:3000` with no errors.
- [ ] Navigate to `http://localhost:3000`. Middleware should redirect to `/login`.
- [ ] On `/login`, click **Continue with Google**. Complete the Google consent screen.
- [ ] Browser lands back at `/` (still empty for now — `src/app/page.tsx` is the default scaffold).
- [ ] Re-connect to the database and confirm:
  - [ ] One row in `users` with your Google email.
  - [ ] `users.email_verified_ms` is a bigint epoch-ms value (e.g. `1714512345000`), **not** null and **not** a Postgres `timestamp`.
  - [ ] `users.timer_prefs_json` equals `{}` (jsonb empty object).
  - [ ] One row in `accounts` with `provider = 'google'` and `provider_account_id` matching your Google account ID.
  - [ ] `accounts.expires_at_ms` is a bigint roughly `now_in_ms + ~3600000` (the Google access token's ~1-hour TTL **in milliseconds**, not seconds — the shim multiplies by 1000 on write).
  - [ ] One row in `sessions` (the Auth.js table) with `expires_ms` ~30 days in the future.

---

## 5. Edge cases

- [ ] **Sign out.** Add a temporary client component or run `signOut()` from the browser devtools (or just delete the `authjs.session-token` cookie). Reload `/`. Middleware should redirect to `/login`.
- [ ] **Health endpoint.** `curl http://localhost:3000/api/health` → `{"ok":true}`, no auth required.
- [ ] **Public routes.** Confirm `/api/auth/*`, `/login`, `/api/health`, and `/api/cron/*` are not redirected by middleware.

---

## Diagnostics — most common failures

If something fails, start here.

**`bun dev` fails with `Invalid environment variables`.** One of the `.env` values is missing or doesn't match its zod schema. The error log lists every offending key. Fix `.env` and re-run.

**`db:push:programs` fails on `GRANT rds_iam`.** The target Postgres isn't AWS RDS — there is no `rds_iam` role on a vanilla Postgres install. You're on Path A but pointed at the wrong host, or you actually want Path B and need to add the local override layer.

**`db:migrate` succeeds but tables are missing.** Drizzle-kit may have written to a different database. Verify `DATABASE_HOST` and `DATABASE_NAME` (currently hardcoded to `postgres` in `src/db/constants.ts`) match what you're inspecting.

**OAuth redirect fails with `redirect_uri_mismatch`.** The redirect URI in Google Cloud Console must be exactly `http://localhost:3000/api/auth/callback/google` — no trailing slash, exact case.

**OAuth login completes but session expires immediately.** Likely the bigint shim's `expires_at` conversion is wrong. The shim's contract: write seconds × 1000 → ms in DB, read ms ÷ 1000 → seconds for Auth.js. Verify against `src/auth/drizzle-adapter-shim.ts` `linkAccount` and `rowToAdapterAccount`. The Bun test suite covers this — re-run `bun test` if in doubt.

**Auth flow throws `useVerificationToken is not a function` (or similar).** The Adapter interface contract isn't satisfied. The current shim implements the full Adapter interface from `@auth/core/adapters@0.41.x`. If you upgrade `next-auth` and it breaks, diff against `node_modules/.bun/@auth+core@*/node_modules/@auth/core/adapters.d.ts`.

**Middleware throws `cannot find module 'pg'` (or similar Node-only module).** The middleware is somehow importing the full `src/auth.ts` (which pulls in the Drizzle adapter and `pg`) instead of the edge-safe `src/auth.config.ts`. Edge runtime cannot load `pg`. Verify `src/middleware.ts` only imports `@/auth.config`, not `@/auth`.

---

## What to report back

When done, reply with:

- Path A or B chosen, and (if A) which AWS account / RDS instance.
- Counts for `sub_types` (should be 11) and `strategies` (should be 33).
- The first row in `users` (email, `email_verified_ms`, `created_at_ms`).
- Pass/fail for each section.
- Any unexpected behavior, with stack traces if applicable.
