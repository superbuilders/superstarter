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
