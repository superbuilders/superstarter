/** The database the IaC creates and every session connects to. */
export const POSTGRES_DATABASE_NAME = "postgres"

/** PostgreSQL's default port, which the instance keeps. */
export const POSTGRES_PORT = 5432

/** Login identities. The runtime signs RDS IAM tokens as `app`; the master user exists only in
 * Secrets Manager, read by operator scripts. */
export const POSTGRES_PRINCIPALS = {
	app: "app"
} as const
export type PostgresPrincipal = (typeof POSTGRES_PRINCIPALS)[keyof typeof POSTGRES_PRINCIPALS]

/** The master login: RDS creates it with its password held in Secrets Manager, and the local
 * cluster's superuser carries the same name. Operator scripts and migrations sign in as it. */
export const POSTGRES_MASTER_USERNAME = "postgres"
