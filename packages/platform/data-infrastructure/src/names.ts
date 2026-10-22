import { AWS_REGION } from "@superstarter/database/postgres/rds"
import { VERCEL_TARGETS } from "@superstarter/operational-telemetry/schema"
import { Array as Arr, Record } from "effect"
import type { VercelProject, VercelTeamSlug } from "#env.ts"
import { type Environment, PROJECT } from "#environment.ts"

/**
 * The tags on every AWS resource superstarter creates. `"shared"` marks the account singletons that
 * belong to no stage: the state bucket, its key and the Vercel OIDC provider.
 */
export const requiredTags = <S extends Environment | "shared">(stage: S) =>
	({ Project: PROJECT, Stage: stage }) as const

/** The same tags as the Key/Value list that the S3 and IAM APIs take. */
export const awsTagsOf = (tags: ReturnType<typeof requiredTags>) =>
	Arr.map(Record.toEntries(tags), ([Key, Value]) => ({ Key, Value }))

/**
 * The state bucket, in S3's account-regional namespace. A template cannot claim a globally unique
 * name, so the name carries the account and region, which that namespace requires.
 */
export const stateBucketNameOf = (account: string) =>
	`${PROJECT}-state-${account}-${AWS_REGION}-an` as const

/** The customer-managed key that encrypts the state bucket. */
export const STATE_KEY_ALIAS = `alias/${PROJECT}-state` as const

export const vercelIssuer = (team: VercelTeamSlug) => `oidc.vercel.com/${team}` as const

export const vercelAudience = (team: VercelTeamSlug) => `https://vercel.com/${team}` as const

/** IAM permits one provider per issuer in an account, so the provider is shared, never staged. */
export const vercelOidcProviderArn = (
	target: Readonly<{ account: string; team: VercelTeamSlug }>
) => `arn:aws:iam::${target.account}:oidc-provider/${vercelIssuer(target.team)}` as const

/** The OIDC subjects Vercel signs for the project's deployments, one per Vercel environment: every
 * one of them assumes the runtime role. */
export const vercelSubjectsOf = (vercel: VercelProject) =>
	Arr.map(
		VERCEL_TARGETS,
		(target) => `owner:${vercel.team}:project:${vercel.project}:environment:${target}` as const
	)

/** The IAM database-authentication resource for one login on one physical instance. */
export const databaseUserArn = (
	target: Readonly<{ account: string; dbiResourceId: string; user: string }>
) =>
	`arn:aws:rds-db:${AWS_REGION}:${target.account}:dbuser:${target.dbiResourceId}/${target.user}` as const

/**
 * Every physical name, tag and description an environment's resources carry, each a template of the
 * environment, so one environment's names never equal another's and no stage adopts another's
 * resources. Renaming one replaces its resource; security-group and parameter-group descriptions
 * cannot change in place either.
 */
export const namesOf = <E extends Environment>(environment: E) => {
	const prefix = `${PROJECT}-${environment}` as const
	const database = `${prefix}-postgres` as const
	const runtimeRole = `${prefix}-vercel` as const
	return {
		environment,
		tags: requiredTags(environment),
		database,
		databaseIngressDescription: `${prefix} PostgreSQL from any address, IAM token over TLS`,
		databaseSubnetsDescription: `${prefix} PostgreSQL across two availability zones`,
		databaseParametersDescription: `${prefix} PostgreSQL requires TLS 1.3`,
		runtimeRole,
		runtimeRoleDescription: `${prefix} Vercel deployments through OIDC`,
		runtimePolicy: `${runtimeRole}-policy`
	} as const
}

export type Names = ReturnType<typeof namesOf<Environment>>
