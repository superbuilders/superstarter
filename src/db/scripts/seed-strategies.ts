import "@/env"
import * as errors from "@superbuilders/errors"
import { strategies as strategyConfig } from "@/config/strategies"
import type { SubTypeId } from "@/config/sub-types"
import { subTypeIds } from "@/config/sub-types"
import { createAdminDb } from "@/db/admin"
import { deterministicUuidv7 } from "@/db/lib/deterministic-uuid"
import { strategies } from "@/db/schemas/catalog/strategies"
import { logger } from "@/logger"

function strategyIdFor(subTypeId: SubTypeId, index: number): string {
	return deterministicUuidv7(`strategy:${subTypeId}:${index}`)
}

async function main() {
	await using adminDb = await createAdminDb()
	let total = 0
	for (const subTypeId of subTypeIds) {
		const entries = strategyConfig[subTypeId]
		if (!entries) continue
		for (let index = 0; index < entries.length; index += 1) {
			const entry = entries[index]
			if (!entry) {
				logger.error({ subTypeId, index }, "strategies config missing entry at index")
				throw errors.new("strategies config inconsistent")
			}
			const id = strategyIdFor(subTypeId, index)
			const result = await errors.try(
				adminDb.db
					.insert(strategies)
					.values({
						id,
						subTypeId,
						kind: entry.kind,
						text: entry.text
					})
					.onConflictDoUpdate({
						target: strategies.id,
						set: {
							subTypeId,
							kind: entry.kind,
							text: entry.text
						}
					})
			)
			if (result.error) {
				logger.error({ error: result.error, id, subTypeId, kind: entry.kind }, "strategy upsert failed")
				throw errors.wrap(result.error, "strategy upsert")
			}
			total += 1
		}
	}
	logger.info({ total }, "done seeding strategies")
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "seed strategies failed")
	process.exit(1)
}
