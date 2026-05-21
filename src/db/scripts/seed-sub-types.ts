import "@/env"
import * as errors from "@superbuilders/errors"
import { subTypes as subTypesConfig } from "@/config/sub-types"
import { createAdminDb } from "@/db/admin"
import { subTypes } from "@/db/schemas/catalog/sub-types"
import { logger } from "@/logger"

async function main() {
	await using adminDb = await createAdminDb()
	logger.info({ count: subTypesConfig.length }, "seeding sub_types")
	for (const entry of subTypesConfig) {
		const result = await errors.try(
			adminDb.db
				.insert(subTypes)
				.values({
					id: entry.id,
					name: entry.displayName,
					section: entry.section,
					latencyThresholdMs: entry.latencyThresholdMs
				})
				.onConflictDoUpdate({
					target: subTypes.id,
					set: {
						name: entry.displayName,
						section: entry.section,
						latencyThresholdMs: entry.latencyThresholdMs
					}
				})
		)
		if (result.error) {
			logger.error({ error: result.error, id: entry.id }, "sub_type upsert failed")
			throw errors.wrap(result.error, "sub_type upsert")
		}
	}
	logger.info("done")
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "seed sub_types failed")
	process.exit(1)
}
