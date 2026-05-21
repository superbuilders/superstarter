import type { SQL } from "drizzle-orm"
import { pgcrypto } from "@/db/programs/extensions/pgcrypto"
import { pgvector } from "@/db/programs/extensions/pgvector"
import {
	createAppUser,
	grantAllSequencesToAppUser,
	grantAllTablesToAppUser,
	grantConnectToAppUser,
	grantDefaultSequencePrivsToAppUser,
	grantDefaultTablePrivsToAppUser,
	grantRdsIamToAppUser,
	grantSchemaUsageToAppUser
} from "@/db/programs/grants/app-user"
import { env } from "@/env"

// rds_iam is an AWS-RDS-only role. On a vanilla local Postgres (e.g. the
// pgvector/pgvector:pg16 dev container) the GRANT would fail with
// `role "rds_iam" does not exist`, so we skip it when DATABASE_LOCAL_URL is set.
function getRdsIamGrants(): SQL[] {
	if (env.DATABASE_LOCAL_URL) {
		return []
	}
	return [grantRdsIamToAppUser()]
}

const programs: SQL[] = [
	createAppUser(),
	...getRdsIamGrants(),
	grantConnectToAppUser(),
	pgcrypto(),
	pgvector(),
	grantSchemaUsageToAppUser(),
	grantAllTablesToAppUser(),
	grantAllSequencesToAppUser(),
	grantDefaultTablePrivsToAppUser(),
	grantDefaultSequencePrivsToAppUser()
]

export { programs }
