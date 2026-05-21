// scripts/dev/smoke/sibling-workflow-smoke.ts
//
// Manual smoke for plan §9 commit 6 gate. Exercises siblingGeneration-
// Workflow against ONE real source from numerical.fractions, then
// re-runs against the SAME source to verify the writeSiblingSetStep
// idempotency guard returns the same insertedIds without writing
// duplicate rows.
//
// Source picked at audit time:
//   id            019dfd8d-9825-7558-ad74-9a6e73fbe4db
//   sub-type      numerical.fractions
//   difficulty    hard
//   text          "There are 10 socks in a drawer ..."
//
// Why direct workflow-function call (not start()):
//
//   `start()` from `workflow/api` requires the Next.js process — the
//   `withWorkflow` plugin in next.config.ts wires it; from a Bun script
//   outside that process, `start()` throws "invalid workflow function"
//   (see scripts/dev/smoke/diagnostic-mastery-recompute.ts header).
//   Calling the workflow function directly executes its body as plain
//   async (no durability), which is the right shape for a one-shot
//   smoke that exercises the WORKFLOW BODY's correctness rather than
//   the durable runtime. The "use workflow" + "use step" string-literal
//   directives are no-ops outside the runtime. Production triggers
//   (commit 7's orchestration) face the same constraint and resolve it
//   via direct invocation too — durability is a deploy-time concern,
//   not a dev-time one.
//
// Usage: bun run scripts/dev/smoke/sibling-workflow-smoke.ts

import "@/env"
import * as errors from "@superbuilders/errors"
import { and, eq, sql } from "drizzle-orm"
import * as fs from "node:fs"
import { createAdminDb } from "@/db/admin"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { provenancePathFor } from "@/server/generation/sibling-provenance"
import { siblingGenerationWorkflow } from "@/workflows/sibling-generation"

const SMOKE_SOURCE_ID = "019dfd8d-9825-7558-ad74-9a6e73fbe4db"

const ErrFirstRunMissingFile = errors.new(
	"sibling-workflow-smoke: first run did not produce provenance JSON"
)
const ErrIdempotencyMismatch = errors.new(
	"sibling-workflow-smoke: replay returned different insertedIds"
)
const ErrRowCountDrift = errors.new(
	"sibling-workflow-smoke: DB row count drifted across replay"
)

interface RunOutcome {
	insertedIds: string[]
	dbRowCount: number
	provenanceFileExists: boolean
}

async function countSiblingRows(parentItemId: string): Promise<number> {
	await using adminDb = await createAdminDb()
	const result = await errors.try(
		adminDb.db
			.select({ id: items.id })
			.from(items)
			.where(
				and(
					sql`${items.metadataJson}->>'parentItemId' = ${parentItemId}`,
					eq(items.source, "generated")
				)
			)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, parentItemId },
			"sibling-workflow-smoke: count query failed"
		)
		throw errors.wrap(result.error, "count query")
	}
	return result.data.length
}

async function cleanupExistingSiblings(parentItemId: string): Promise<void> {
	await using adminDb = await createAdminDb()
	const delResult = await errors.try(
		adminDb.db
			.delete(items)
			.where(
				and(
					sql`${items.metadataJson}->>'parentItemId' = ${parentItemId}`,
					eq(items.source, "generated")
				)
			)
	)
	if (delResult.error) {
		logger.error(
			{ error: delResult.error, parentItemId },
			"sibling-workflow-smoke: cleanup delete failed"
		)
		throw errors.wrap(delResult.error, "cleanup delete")
	}
	const provPath = provenancePathFor(parentItemId)
	if (fs.existsSync(provPath)) {
		fs.unlinkSync(provPath)
	}
}

async function runOnce(parentItemId: string, label: string): Promise<RunOutcome> {
	logger.info({ parentItemId, label }, "sibling-workflow-smoke: starting workflow run")
	const workflowResult = await siblingGenerationWorkflow({ itemId: parentItemId })
	const dbRowCount = await countSiblingRows(parentItemId)
	const provPath = provenancePathFor(parentItemId)
	const provenanceFileExists = fs.existsSync(provPath)
	logger.info(
		{
			parentItemId,
			label,
			insertedIds: workflowResult.insertedIds,
			dbRowCount,
			provenanceFileExists,
			provenancePath: provPath
		},
		"sibling-workflow-smoke: workflow run complete"
	)
	return { insertedIds: workflowResult.insertedIds, dbRowCount, provenanceFileExists }
}

async function main(): Promise<void> {
	logger.info(
		{ sourceItemId: SMOKE_SOURCE_ID },
		"sibling-workflow-smoke: cleaning prior smoke artifacts"
	)
	await cleanupExistingSiblings(SMOKE_SOURCE_ID)

	const first = await runOnce(SMOKE_SOURCE_ID, "first")
	if (!first.provenanceFileExists) {
		logger.error(
			{ parentItemId: SMOKE_SOURCE_ID },
			"sibling-workflow-smoke: first run did not write provenance JSON"
		)
		throw ErrFirstRunMissingFile
	}
	if (first.dbRowCount !== 4) {
		logger.error(
			{ parentItemId: SMOKE_SOURCE_ID, dbRowCount: first.dbRowCount },
			"sibling-workflow-smoke: first run did not produce 4 DB rows"
		)
		throw errors.wrap(
			ErrRowCountDrift,
			`first run row count ${first.dbRowCount} !== 4`
		)
	}

	const second = await runOnce(SMOKE_SOURCE_ID, "second-replay")
	if (second.dbRowCount !== 4) {
		logger.error(
			{ first: first.dbRowCount, second: second.dbRowCount },
			"sibling-workflow-smoke: replay produced extra rows; idempotency guard failed"
		)
		throw errors.wrap(
			ErrRowCountDrift,
			`replay row count ${second.dbRowCount} !== 4`
		)
	}
	const sameIds =
		first.insertedIds.length === second.insertedIds.length &&
		first.insertedIds.every(function compare(id, i) {
			return second.insertedIds[i] === id
		})
	if (!sameIds) {
		logger.error(
			{ first: first.insertedIds, second: second.insertedIds },
			"sibling-workflow-smoke: replay returned different insertedIds"
		)
		throw ErrIdempotencyMismatch
	}

	logger.info(
		{
			parentItemId: SMOKE_SOURCE_ID,
			insertedIds: first.insertedIds,
			dbRowCount: second.dbRowCount
		},
		"sibling-workflow-smoke PASSED — workflow body + idempotency guard verified"
	)
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "sibling-workflow-smoke: failed")
	process.exit(1)
}
