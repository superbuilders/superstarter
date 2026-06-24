import type { SQL } from "drizzle-orm"
import { pgcrypto } from "@/db/programs/extensions/pgcrypto"
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

const programs: SQL[] = [
	createAppUser(),
	grantRdsIamToAppUser(),
	grantConnectToAppUser(),
	pgcrypto(),
	grantSchemaUsageToAppUser(),
	grantAllTablesToAppUser(),
	grantAllSequencesToAppUser(),
	grantDefaultTablePrivsToAppUser(),
	grantDefaultSequencePrivsToAppUser()
]

export { programs }
