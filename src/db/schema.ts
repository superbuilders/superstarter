import type { ExtractTablesWithRelations } from "drizzle-orm"
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core"
import * as authAccountsSchema from "@/db/schemas/auth/accounts"
import * as authSessionsSchema from "@/db/schemas/auth/sessions"
import * as authUsersSchema from "@/db/schemas/auth/users"
import * as authVerificationTokensSchema from "@/db/schemas/auth/verification_tokens"
import * as catalogItemsSchema from "@/db/schemas/catalog/items"
import * as catalogStrategiesSchema from "@/db/schemas/catalog/strategies"
import * as catalogSubTypesSchema from "@/db/schemas/catalog/sub-types"
import * as opsCandidatePromotionLogSchema from "@/db/schemas/ops/candidate-promotion-log"
import * as practiceAttemptsSchema from "@/db/schemas/practice/attempts"
import * as practiceMasteryStateSchema from "@/db/schemas/practice/mastery-state"
import * as practicePracticeSessionsSchema from "@/db/schemas/practice/practice-sessions"
import * as practiceUserSubTypeBeltsSchema from "@/db/schemas/practice/user-sub-type-belts"

const dbSchema = {
	...authUsersSchema,
	...authAccountsSchema,
	...authSessionsSchema,
	...authVerificationTokensSchema,
	...catalogSubTypesSchema,
	...catalogStrategiesSchema,
	...catalogItemsSchema,
	...practicePracticeSessionsSchema,
	...practiceAttemptsSchema,
	...practiceMasteryStateSchema,
	...practiceUserSubTypeBeltsSchema,
	...opsCandidatePromotionLogSchema
}

type DbSchema = typeof dbSchema
type Db = PgDatabase<PgQueryResultHKT, DbSchema, ExtractTablesWithRelations<DbSchema>>

export type { Db, DbSchema }
export { dbSchema }
