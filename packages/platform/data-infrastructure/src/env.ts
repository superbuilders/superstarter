import { AwsRoleArn, RdsEndpoint } from "@superstarter/database/postgres/rds"
import { Config, Schema } from "effect"

/** A Vercel team slug. It is spliced into the OIDC issuer URL and the IAM condition keys, so it may
 * hold no character that could break either or widen a match. */
const VercelTeamSlug = Schema.String.check(Schema.isPattern(/^[a-z0-9][a-z0-9-]*$/)).pipe(
	Schema.brand("VercelTeamSlug")
)
export type VercelTeamSlug = typeof VercelTeamSlug.Type

/** A Vercel project name, held to the same rule because it is spliced into the OIDC subject. */
const VercelProjectName = Schema.String.check(Schema.isPattern(/^[a-z0-9][a-z0-9._-]*$/)).pipe(
	Schema.brand("VercelProjectName")
)
type VercelProjectName = typeof VercelProjectName.Type

/** The Vercel project whose deployments assume the runtime role. */
const VercelProject = Schema.Struct({ team: VercelTeamSlug, project: VercelProjectName })
export type VercelProject = typeof VercelProject.Type

/** Both are required and have no default: a wrong team or project would trust someone else. */
export const VERCEL_TEAM_SLUG = Config.schema(VercelTeamSlug, "VERCEL_TEAM_SLUG")
export const VERCEL_PROJECT = Config.all({
	team: VERCEL_TEAM_SLUG,
	project: Config.schema(VercelProjectName, "VERCEL_PROJECT_NAME")
})

const SecretArn = Schema.String.check(
	Schema.isPattern(/^arn:aws:secretsmanager:us-east-1:[0-9]{12}:secret:[A-Za-z0-9/_+=.@-]+$/)
).pipe(Schema.brand("SecretArn"))

/** The role the database scripts assume to read the master secret. */
export const awsRoleArn = Config.schema(AwsRoleArn, "AWS_ROLE_ARN")

/** The database the operator scripts administer. */
export const databaseHost = Config.schema(RdsEndpoint, "DATABASE_HOST")

/** The master credentials secret. Only these operator scripts read it; the runtime signs IAM tokens. */
export const databaseAdminSecretArn = Config.schema(SecretArn, "DATABASE_ADMIN_SECRET_ARN")

/** The DevFactory credential dump `scripts/with-aws.ts` reads, when it is not the default
 * `~/Downloads/credentials.json`. */
export const devFactoryCredentialsPath = Config.NonEmptyString("DEVFACTORY_CREDS_PATH")

/** The operator's home directory, where the default DevFactory dump lives. */
export const homeDirectory = Config.NonEmptyString("HOME")

/** A named AWS profile in the operator's shell. The AWS SDK prefers it to environment credentials,
 * so it would shadow the session `scripts/with-aws.ts` injects. */
export const awsProfile = Config.option(Config.NonEmptyString("AWS_PROFILE"))
