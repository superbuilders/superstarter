import { Signer } from "@aws-sdk/rds-signer"
import * as errors from "@superbuilders/errors"
import { attachDatabasePool } from "@vercel/functions"
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { AWS_REGION, DATABASE_NAME, DATABASE_USER } from "@/db/constants"
import { RDS_CA_BUNDLE } from "@/db/rds-ca-bundle"
import { type Db, dbSchema } from "@/db/schema"
import { env } from "@/env"
import { logger } from "@/logger"

const credentials = awsCredentialsProvider({ roleArn: env.AWS_ROLE_ARN })

const signer = new Signer({
	region: AWS_REGION,
	hostname: env.DATABASE_HOST,
	port: 5432,
	username: DATABASE_USER,
	credentials
})

async function getDbPassword(): Promise<string> {
	const result = await errors.try(signer.getAuthToken())
	if (result.error) {
		logger.error(
			{ error: result.error, host: env.DATABASE_HOST, user: DATABASE_USER },
			"rds iam auth token fetch failed"
		)
		throw errors.wrap(result.error, "rds iam auth token")
	}
	return result.data
}

const pool = new Pool({
	host: env.DATABASE_HOST,
	port: 5432,
	user: DATABASE_USER,
	database: DATABASE_NAME,
	ssl: { ca: RDS_CA_BUNDLE, rejectUnauthorized: true },
	max: 10,
	password: getDbPassword
})
attachDatabasePool(pool)

const db: Db = drizzle({ client: pool, schema: dbSchema })

export type { Db }
export { db }
