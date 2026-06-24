# @superstarter/iac

Minimum-viable AWS infrastructure for superstarter:

- One **RDS Postgres** instance in the AWS account's default VPC, smallest sizing (`db.t4g.micro`, single AZ, 20 GB gp3, no backups, no deletion protection).
- One **IAM OIDC provider** federated with Vercel.
- One **IAM role** assumable by the Vercel project via OIDC, granted `rds-db:connect` for the `app` database user **and** `secretsmanager:GetSecretValue` on the master secret.
- Master password is auto-generated and stored in **AWS Secrets Manager**. The runtime app never reads it (it uses RDS IAM auth as `app`); admin scripts (`db:push:programs`, `db:migrate`, `db:studio`) read it via the same Vercel OIDC role — no DevFactory creds needed for day-to-day db work.

The app itself connects as the `app` user with **RDS IAM authentication** — no DB password ever lives in env vars or Vercel. DevFactory credentials are only required to run `bun run deploy` / `destroy` inside this iac package.

## Team model — no per-user lockdown

Any AWS principal in the org with the right IAM permissions can run `bun run deploy` to mutate this stack. There is no breakglass user, no resource-policy denial, no role-shape requirement on the deployer (it just calls `sts:GetCallerIdentity` to learn the account ID).

State is shared via **git**, the idiomatic Alchemy way: `packages/superstarter-iac/.alchemy/` is committed to the repo. Each deployer:

1. `git pull` first to pick up the latest state.
2. Runs `bun run deploy`.
3. `git commit` + `git push` the updated `.alchemy/` so teammates inherit the new state on their next pull.

`ALCHEMY_PASSWORD` (which decrypts secrets in the state files) lives in a shared password manager — share it the same way you'd share any other team secret.

## Prerequisites

- A fresh **DevFactory AWS credentials dump** at `~/Downloads/credentials.json` (or wherever `DEVFACTORY_CREDS_PATH` points). The `bun run deploy` wrapper auto-loads this — you don't need to set `AWS_*` env vars yourself.
- The AWS account must have a **default VPC** in `us-east-1`. If it doesn't, run `aws ec2 create-default-vpc --region us-east-1` once before deploying.
- Vercel project created (note its team slug and project name).

## Required env vars

| Variable | Notes |
|---|---|
| `VERCEL_TEAM_SLUG` | Slug of your Vercel team (e.g. from the dashboard URL). |
| `VERCEL_PROJECT_NAME` | Project name (defaults to `superstarter`). |
| `ALCHEMY_PASSWORD` | ≥ 32 chars; encrypts secrets inside the committed `.alchemy/` state files. Shared across the team via password manager. |

(AWS credentials and `AWS_REGION=us-east-1` are injected automatically by `scripts/with-aws.ts` from the DevFactory dump — don't set them yourself.)

## One-time setup (per developer)

```bash
cd packages/superstarter-iac
cp .env.example .env.local
# fill in VERCEL_TEAM_SLUG and ALCHEMY_PASSWORD (gitignored — never committed)
```

`.env.local` is the **only** supported way to supply IaC secrets. The
wrapper refuses to run if it's missing or if `ALCHEMY_PASSWORD` /
`VERCEL_TEAM_SLUG` aren't defined inside it. CLI overrides like
`ALCHEMY_PASSWORD=foo bun run deploy` are explicitly rejected — that
pattern leaks secrets into `ps aux`, shell history, and terminal
scrollback. Use the file.

## Deploy

```bash
cd packages/superstarter-iac
git pull
bun run deploy   # reads .env.local automatically (Bun auto-loads it)
git add .alchemy && git commit -m "iac: deploy" && git push
```

If you need to re-download a fresh credentials dump, the wrapper will tell you (it checks the `expiration` field and refuses to spawn alchemy if creds expire in under 60 seconds).

The deploy logs print the env vars to paste into your Vercel project:

- `AWS_ROLE_ARN` — the IAM role the Vercel runtime assumes via OIDC
- `DATABASE_HOST` — the RDS endpoint
- `DATABASE_ADMIN_SECRET_ARN` — the master secret ARN. Safe to put in Vercel env: the runtime role has `secretsmanager:GetSecretValue` on this ARN, so admin scripts authenticate via OIDC. The simplest workflow is to set all three in Vercel once, then `vercel env pull --environment=development` to populate `.env.local` for every dev.

`VERCEL_OIDC_TOKEN` is auto-injected by Vercel and pulled into `.env.local` by `vercel env pull` — no manual paste needed.

## Bootstrap the database

After the IaC deploy, with `.env.local` populated via `vercel env pull`:

```bash
bun db:push:programs   # creates the `app` user, grants rds_iam, installs pgcrypto
bun db:push            # pushes the table schema (core_todos, …)
```

Both commands authenticate to AWS via the Vercel OIDC token in `.env.local` — no DevFactory dump required.

## Destroy

```bash
bun run destroy
git add .alchemy && git commit -m "iac: destroy" && git push
```

This deletes everything provisioned. The RDS instance has no deletion protection and no final snapshot — use with care.
