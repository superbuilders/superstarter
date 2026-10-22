# @superstarter/infrastructure

Superstarter's AWS infrastructure, declared with [Alchemy 2](https://alchemy.run) on Effect.

`alchemy.run.ts` is the stack. Its stage is the environment (`src/environment.ts`), and it runs that
environment's composition from `src/compose/`. `src/modules/` declares the resource groups, and
`namesOf` in `src/names.ts` derives every physical name from the environment. Only `production`
exists; adding `staging` means adding it to `ENVIRONMENTS` and adding `src/compose/staging.ts`.

## What it creates

- A VPC (`10.0.0.0/16`) with public subnets in `us-east-1a` and `us-east-1b`, an internet gateway and
  a default route.
- RDS PostgreSQL 18.3 on `db.t4g.micro`: 20 GB of encrypted gp3 storage, single-AZ and publicly
  accessible. Port 5432 is open to `0.0.0.0/0`, guarded by IAM database authentication and a
  parameter group that requires TLS 1.3. RDS manages the `postgres` master password in Secrets
  Manager. There is no deletion protection, no backups and no final snapshot.
- The role Vercel deployments assume through OIDC (production, preview and development). It may
  `rds-db:connect` as `app` and read the master secret.

Every resource is tagged `Project` and `Stage`.

## Credentials and state

Every command runs through `scripts/with-aws.ts`. It reads the DevFactory credential dump
(`~/Downloads/credentials.json`, or the file `DEVFACTORY_CREDS_PATH` names), refuses a session that
expires within 60 seconds, and runs the command with that session in its environment. The AWS
SDK's Node provider chain picks it up, and STS reports the account, so no account ID is configured.
It refuses to run while `AWS_PROFILE` is set: the SDK prefers a named profile to environment
credentials, so every call would run as that profile instead. Unset it first.

Alchemy's state lives in the S3 bucket `superstarter-state-<account>-us-east-1-an`, encrypted with
the KMS key `alias/superstarter-state`. Nothing is committed and no state password exists.

## Setup

```sh
cd packages/platform/data-infrastructure
cp .env.example .env.local   # set VERCEL_TEAM_SLUG and VERCEL_PROJECT_NAME
```

The scripts load `.env.local` with `node --env-file-if-exists`.

## Bootstrap (once per AWS account)

```sh
pnpm bootstrap --execute
```

This creates the team's Vercel OIDC provider and the state bucket and key. Running it again
converges the same settings.

## Plan and deploy

```sh
pnpm plan production
pnpm run deploy production <logical-id> ...
```

`deploy` takes the logical IDs of every resource the reviewed plan changes. It plans again
immediately before applying and refuses any other change. The first deploy names every resource:

```sh
pnpm run deploy production PostgresVpc PostgresInternetGateway PostgresRouteTable \
  PostgresInternetRoute PostgresSubnet_us-east-1a PostgresSubnet_us-east-1b \
  PostgresSubnetRoute_us-east-1a PostgresSubnetRoute_us-east-1b PostgresSecurityGroup \
  PostgresSubnetGroup PostgresParameters Postgres Runtime
```

The deploy prints three values. Set them in the Vercel project's environment:

| Variable                    | Value                                                               |
| --------------------------- | ------------------------------------------------------------------- |
| `AWS_ROLE_ARN`              | The role Vercel deployments assume                                  |
| `DATABASE_HOST`             | The RDS endpoint                                                    |
| `DATABASE_ADMIN_SECRET_ARN` | The master secret, which the admin scripts read under the same role |

Then `pnpm env:pull` brings them, with `VERCEL_OIDC_TOKEN`, into the app's `.env.local`, and
`pnpm db:migrate apply` applies the reviewed migrations through Drizzle's native migrator, then the SQL
programs that create the `app` login and grant it `core`. The database scripts (`db:*`, in this package)
load the app's `.env.local` first and this package's `.env.local` after it, so a value set here wins.
