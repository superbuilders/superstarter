import { type SQL, sql } from "drizzle-orm"
import { POSTGRES_DATABASE_NAME, POSTGRES_PRINCIPALS } from "#postgres/principals.ts"

const APP = sql.identifier(POSTGRES_PRINCIPALS.app)
const CORE = sql.identifier("core")

/** How the application login authenticates: through RDS IAM on RDS, or by the local development
 * cluster's trust of localhost. Only RDS has `rds_iam` and the `postgres` database it connects to. */
export type PostgresAppIdentity = Readonly<{ kind: "rds-iam" }> | Readonly<{ kind: "local" }>

const identityPrograms = (identity: PostgresAppIdentity): ReadonlyArray<SQL> => {
	if (identity.kind === "local") {
		return []
	}
	return [
		sql`GRANT rds_iam TO ${APP}`,
		sql`GRANT CONNECT ON DATABASE ${sql.identifier(POSTGRES_DATABASE_NAME)} TO ${APP}`
	]
}

/**
 * The SQL drizzle-kit cannot express, applied in order after the migrations. Every statement is
 * idempotent. The application login reads and writes `core` tables and nothing else: it creates
 * no objects.
 */
export const postgresProgramsOf = (identity: PostgresAppIdentity): ReadonlyArray<SQL> => [
	sql.raw(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${POSTGRES_PRINCIPALS.app}') THEN
				CREATE ROLE ${POSTGRES_PRINCIPALS.app} LOGIN;
			END IF;
		END $$
	`),
	...identityPrograms(identity),
	sql`CREATE SCHEMA IF NOT EXISTS ${CORE}`,
	sql`GRANT USAGE ON SCHEMA ${CORE} TO ${APP}`,
	sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${CORE} TO ${APP}`,
	sql`ALTER DEFAULT PRIVILEGES IN SCHEMA ${CORE} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP}`
]
