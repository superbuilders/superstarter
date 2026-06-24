import { sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import { DATABASE_NAME, DATABASE_USER } from "@/db/constants"

const PUBLIC_SCHEMA = "public"

function createAppUser(): SQL {
	return sql.raw(`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '${DATABASE_USER}') THEN
				CREATE USER ${DATABASE_USER};
			END IF;
		END $$
	`)
}

function grantRdsIamToAppUser(): SQL {
	return sql`GRANT rds_iam TO ${sql.identifier(DATABASE_USER)}`
}

function grantConnectToAppUser(): SQL {
	return sql`GRANT CONNECT ON DATABASE ${sql.identifier(DATABASE_NAME)} TO ${sql.identifier(DATABASE_USER)}`
}

function grantSchemaUsageToAppUser(): SQL {
	return sql`GRANT USAGE, CREATE ON SCHEMA ${sql.identifier(PUBLIC_SCHEMA)} TO ${sql.identifier(DATABASE_USER)}`
}

function grantAllTablesToAppUser(): SQL {
	return sql`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${sql.identifier(PUBLIC_SCHEMA)} TO ${sql.identifier(DATABASE_USER)}`
}

function grantAllSequencesToAppUser(): SQL {
	return sql`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${sql.identifier(PUBLIC_SCHEMA)} TO ${sql.identifier(DATABASE_USER)}`
}

function grantDefaultTablePrivsToAppUser(): SQL {
	return sql`ALTER DEFAULT PRIVILEGES IN SCHEMA ${sql.identifier(PUBLIC_SCHEMA)} GRANT ALL ON TABLES TO ${sql.identifier(DATABASE_USER)}`
}

function grantDefaultSequencePrivsToAppUser(): SQL {
	return sql`ALTER DEFAULT PRIVILEGES IN SCHEMA ${sql.identifier(PUBLIC_SCHEMA)} GRANT ALL ON SEQUENCES TO ${sql.identifier(DATABASE_USER)}`
}

export {
	createAppUser,
	grantAllSequencesToAppUser,
	grantAllTablesToAppUser,
	grantConnectToAppUser,
	grantDefaultSequencePrivsToAppUser,
	grantDefaultTablePrivsToAppUser,
	grantRdsIamToAppUser,
	grantSchemaUsageToAppUser
}
