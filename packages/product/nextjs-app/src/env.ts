import {
	type OperationalDeployment,
	VERCEL_TARGETS
} from "@superstarter/operational-telemetry/schema"
import { Config, Option, Schema } from "effect"

// Every environment variable the app reads is declared here as an Effect Config, and nothing else
// reads process.env. Configs are values: yield one inside an Effect, or run it once where a
// module needs the value at load. The browser never reads env; the server hands it what it needs.

export const AWS_REGION = "us-east-1"

const AwsRoleArn = Schema.String.check(
	Schema.isPattern(/^arn:aws:iam::[0-9]{12}:role\/[A-Za-z0-9+=,.@_/-]+$/)
).pipe(Schema.brand("AwsRoleArn"))
export type AwsRoleArn = typeof AwsRoleArn.Type

const RdsEndpoint = Schema.String.check(
	Schema.isPattern(/^[a-z0-9-]+\.[a-z0-9]+\.us-east-1\.rds\.amazonaws\.com$/)
).pipe(Schema.brand("RdsEndpoint"))
export type RdsEndpoint = typeof RdsEndpoint.Type

const PosthogProjectToken = Schema.String.check(Schema.isPattern(/^phc_[A-Za-z0-9]+$/)).pipe(
	Schema.brand("PosthogProjectToken")
)
export type PosthogProjectToken = typeof PosthogProjectToken.Type

/** The IAM role the runtime assumes through Vercel OIDC. */
const awsRoleArn = Config.schema(AwsRoleArn, "AWS_ROLE_ARN")

/** The RDS endpoint, no scheme and no port. */
const databaseHost = Config.schema(RdsEndpoint, "DATABASE_HOST")

/** A local database name as PostgreSQL spells an unquoted identifier. */
const LocalDatabaseName = Schema.String.check(Schema.isPattern(/^[a-z_][a-z0-9_]{0,62}$/)).pipe(
	Schema.brand("LocalDatabaseName")
)

/** The local database the app reads and writes: `superstarter` in development, the throwaway
 * `superstarter_test` under `pnpm test`. */
const localDatabase = Config.schema(LocalDatabaseName, "LOCAL_POSTGRES_DATABASE")

/** PostHog's project token, for OTLP export, server exceptions and the browser client. Read only
 * through `telemetryBackend`, on a hosted deployment. */
const posthogProjectToken = Config.schema(PosthogProjectToken, "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN")

const hostedDeployment = (id: string): Config.Config<OperationalDeployment> =>
	Config.all({
		target: Config.Literals(VERCEL_TARGETS, "VERCEL_TARGET_ENV"),
		commit: Config.NonEmptyString("VERCEL_GIT_COMMIT_SHA")
	}).pipe(Config.map(({ target, commit }) => ({ kind: "hosted", target, id, commit })))

/** Vercel names a deployment only on Vercel. A deployment id with no commit or target is invalid,
 * never local. */
export const deployment: Config.Config<OperationalDeployment> = Config.option(
	Config.NonEmptyString("VERCEL_DEPLOYMENT_ID")
).pipe(
	Config.flatMap(
		Option.match({
			onNone: () => Config.succeed<OperationalDeployment>({ kind: "local" }),
			onSome: hostedDeployment
		})
	)
)

/** Where the app's database is. A Vercel deployment signs in to RDS with IAM through its OIDC
 * role; a local process signs in as `app` to the cluster `pnpm db:local` starts. Each arm reads
 * only its own variables. */
export type DatabaseTarget =
	| Readonly<{ kind: "rds"; host: RdsEndpoint; roleArn: AwsRoleArn }>
	| Readonly<{ kind: "local"; database: string }>

const databaseTargetOf = (current: OperationalDeployment): Config.Config<DatabaseTarget> =>
	current.kind === "hosted"
		? Config.all({ host: databaseHost, roleArn: awsRoleArn }).pipe(
				Config.map(({ host, roleArn }) => ({ kind: "rds", host, roleArn }))
			)
		: localDatabase.pipe(Config.map((database) => ({ kind: "local", database })))

export const databaseTarget: Config.Config<DatabaseTarget> = deployment.pipe(
	Config.flatMap(databaseTargetOf)
)

/** Where telemetry goes. Every Vercel deployment, production and preview alike, exports to PostHog
 * and requires its token there. A local process writes JSONL under `out/telemetry/`, sends nothing
 * to PostHog and never reads the token, so `next dev` and a local build need no env at all. */
export type TelemetryBackend =
	| Readonly<{ kind: "posthog"; token: PosthogProjectToken }>
	| Readonly<{ kind: "local" }>

const backendOf = (current: OperationalDeployment): Config.Config<TelemetryBackend> =>
	current.kind === "hosted"
		? posthogProjectToken.pipe(Config.map((token) => ({ kind: "posthog", token })))
		: Config.succeed<TelemetryBackend>({ kind: "local" })

export const telemetryBackend: Config.Config<TelemetryBackend> = deployment.pipe(
	Config.flatMap(backendOf)
)
