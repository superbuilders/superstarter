// scripts/export-testbank.ts
//
// offline-app round, C1. Exports the live question bank to a single,
// self-contained JSON file consumed by the offline practice app
// (public/offline-app/index.html — built in C2).
//
// Run:  bun run scripts/export-testbank.ts
//
// Reads status='live' rows from the production RDS `items` table (via the
// @/db OIDC/RDS pool), validates each row's shape with hard-fail guards,
// and writes public/offline-app/testbank.json.
//
// Hard-fail guards — the script aborts loudly (process.exit(1)) on any:
//   1. body.kind !== "text"                   — W-stem-content-format protection.
//   2. correct_answer matches != 1 option id  — dangling-correct-answer protection.
//   3. options count < 2 or > 5               — malformed-item protection
//      (5 = canonical max, matches optionsJsonSchema in
//      src/server/items/selection.ts).
//   4. row status !== "live"                  — filter-bug guard.
//
// Null-explanation policy (offline-app C1, option 3): items with a NULL
// explanation are exported as-is with `explanation: null`. The null set is
// counted and reported in the summary — never skipped, never failed.
//
// Output JSON shape (public/offline-app/testbank.json):
//   {
//     "version":    "<YYYY-MM-DD>",          // export date
//     "exportedAt": "<ISO-8601 timestamp>",
//     "subTypes": [                          // all 14, from @/config/sub-types
//       { "id": "verbal.antonyms", "name": "Antonyms", "section": "verbal" },
//       ...
//     ],
//     "items": [
//       {
//         "id":            "<uuid>",
//         "subTypeId":     "verbal.antonyms",
//         "difficulty":    "easy" | "medium" | "hard" | "brutal",
//         "stem":          "<plain text from body.text>",
//         "options":       [ { "id": "<opaque>", "text": "<choice>" }, ... ],
//         "correctAnswer": "<option id>",
//         "explanation":   "<plain text>" | null
//       }
//     ]
//   }

import * as errors from "@superbuilders/errors"
import { asc, eq } from "drizzle-orm"
import { z } from "zod"
import { subTypes } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { bodyText } from "@/server/items/body-schema"

// Canonical option-count bounds — kept identical to optionsJsonSchema in
// src/server/items/selection.ts (.min(2).max(5)). Hard-fail guard 3.
const MIN_OPTIONS = 2
const MAX_OPTIONS = 5

const OUTPUT_PATH = "public/offline-app/testbank.json"

const optionSchema = z.object({
	id: z.string().min(1),
	text: z.string().min(1)
})
const optionsSchema = z.array(optionSchema)

// Generic "has a string kind" probe. Validated separately from bodyText so a
// future visual body variant (chart/grid/...) parses here but then trips the
// explicit `kind !== "text"` guard rather than silently shipping.
const bodyKindSchema = z.object({ kind: z.string() })

interface RawItemRow {
	id: string
	subTypeId: string
	difficulty: "easy" | "medium" | "hard" | "brutal"
	status: "live" | "candidate" | "retired" | "rejected"
	body: unknown
	optionsJson: unknown
	correctAnswer: string
	explanation: string | null
}

interface OutputSubType {
	id: string
	name: string
	section: "verbal" | "numerical"
}

interface OutputItem {
	id: string
	subTypeId: string
	difficulty: "easy" | "medium" | "hard" | "brutal"
	stem: string
	options: { id: string; text: string }[]
	correctAnswer: string
	explanation: string | null
}

interface Testbank {
	version: string
	exportedAt: string
	subTypes: OutputSubType[]
	items: OutputItem[]
}

function abortWithValidationFailure(itemId: string, reason: string): never {
	logger.error({ itemId, reason }, "testbank export hard-fail validation")
	process.exit(1)
}

// Validates one raw `items` row against the four hard-fail guards and shapes
// it into an OutputItem. Aborts the process on any guard failure.
function validateAndTransformRow(row: RawItemRow): OutputItem {
	// Guard 4 — filter-bug guard. The query filters to status='live'; this
	// asserts the contract held for every row that reaches the export array.
	if (row.status !== "live") {
		abortWithValidationFailure(
			row.id,
			`status is '${row.status}', expected 'live' (filter-bug guard)`
		)
	}

	// Guard 1 — body must be a text body. W-stem-content-format protection.
	const bodyKind = bodyKindSchema.safeParse(row.body)
	if (!bodyKind.success) {
		abortWithValidationFailure(row.id, "body is not an object with a string 'kind' field")
	}
	if (bodyKind.data.kind !== "text") {
		abortWithValidationFailure(
			row.id,
			`body.kind is '${bodyKind.data.kind}', expected 'text' (W-stem-content-format)`
		)
	}
	const body = bodyText.safeParse(row.body)
	if (!body.success) {
		abortWithValidationFailure(
			row.id,
			"body.kind is 'text' but body failed the canonical text-body schema"
		)
	}

	// options_json must decode to an array of { id, text }.
	const options = optionsSchema.safeParse(row.optionsJson)
	if (!options.success) {
		abortWithValidationFailure(row.id, "options_json is not an array of { id, text }")
	}

	// Guard 3 — canonical option count. Malformed-item protection.
	if (options.data.length < MIN_OPTIONS) {
		abortWithValidationFailure(
			row.id,
			`has ${options.data.length} option(s), fewer than the minimum ${MIN_OPTIONS}`
		)
	}
	if (options.data.length > MAX_OPTIONS) {
		abortWithValidationFailure(
			row.id,
			`has ${options.data.length} options, more than the canonical maximum ${MAX_OPTIONS}`
		)
	}

	// Guard 2 — correct_answer must resolve to exactly one option id.
	const matchCount = options.data.filter(function isCorrectOption(option) {
		return option.id === row.correctAnswer
	}).length
	if (matchCount !== 1) {
		abortWithValidationFailure(
			row.id,
			`correct_answer '${row.correctAnswer}' matches ${matchCount} option id(s), expected exactly 1`
		)
	}

	return {
		id: row.id,
		subTypeId: row.subTypeId,
		difficulty: row.difficulty,
		stem: body.data.text,
		options: options.data,
		correctAnswer: row.correctAnswer,
		explanation: row.explanation
	}
}

// Logs the per-sub-type / per-tier / explanation-coverage summary table.
function logExportSummary(outputItems: OutputItem[], version: string, fileSizeBytes: number): void {
	// Per-sub-type counts — keyed by sub_type_id, displayed against all 14.
	const perSubTypeCount = new Map<string, number>()
	for (const item of outputItems) {
		const existing = perSubTypeCount.get(item.subTypeId)
		const next = existing === undefined ? 1 : existing + 1
		perSubTypeCount.set(item.subTypeId, next)
	}

	// Per-tier counts.
	const perTier: Record<"easy" | "medium" | "hard" | "brutal", number> = {
		easy: 0,
		medium: 0,
		hard: 0,
		brutal: 0
	}
	for (const item of outputItems) {
		perTier[item.difficulty] += 1
	}

	// Explanation coverage (null-explanation policy: count, never skip).
	let withExplanation = 0
	let withoutExplanation = 0
	for (const item of outputItems) {
		if (item.explanation === null) {
			withoutExplanation += 1
		} else {
			withExplanation += 1
		}
	}
	const total = outputItems.length
	const coveragePct = total > 0 ? Math.round((withExplanation / total) * 1000) / 10 : 0

	for (const config of subTypes) {
		const counted = perSubTypeCount.get(config.id)
		const count = counted === undefined ? 0 : counted
		// `displayName` (not `name`) — Pino reserves `name` for the logger name.
		logger.info(
			{ subTypeId: config.id, displayName: config.displayName, section: config.section, count },
			"live items per sub-type"
		)
	}
	logger.info({ tier: "easy", count: perTier.easy }, "live items per tier")
	logger.info({ tier: "medium", count: perTier.medium }, "live items per tier")
	logger.info({ tier: "hard", count: perTier.hard }, "live items per tier")
	logger.info({ tier: "brutal", count: perTier.brutal }, "live items per tier")
	logger.info({ withExplanation, withoutExplanation, coveragePct }, "explanation coverage")

	const fileSizeKb = Math.round((fileSizeBytes / 1024) * 10) / 10
	logger.info(
		{
			totalLiveItems: total,
			subTypeCount: subTypes.length,
			fileSizeBytes,
			fileSizeKb,
			version,
			outputPath: OUTPUT_PATH
		},
		"testbank export complete"
	)
}

async function main(): Promise<void> {
	const now = new Date()
	const version = now.toISOString().slice(0, 10)
	const exportedAt = now.toISOString()

	logger.info({ outputPath: OUTPUT_PATH }, "testbank export starting")

	const rowsResult = await errors.try(
		db
			.select({
				id: items.id,
				subTypeId: items.subTypeId,
				difficulty: items.difficulty,
				status: items.status,
				body: items.body,
				optionsJson: items.optionsJson,
				correctAnswer: items.correctAnswer,
				explanation: items.explanation
			})
			.from(items)
			.where(eq(items.status, "live"))
			.orderBy(asc(items.id))
	)
	if (rowsResult.error) {
		logger.error({ error: rowsResult.error }, "live items query failed")
		throw errors.wrap(rowsResult.error, "live items query")
	}
	const rows = rowsResult.data
	logger.info({ count: rows.length }, "live items fetched")

	const outputItems: OutputItem[] = []
	for (const row of rows) {
		outputItems.push(validateAndTransformRow(row))
	}

	// subTypes catalog comes from the live-app config — the source of truth
	// for display names — not from the sub_types DB rows.
	const outputSubTypes: OutputSubType[] = subTypes.map(function toOutputSubType(config) {
		return { id: config.id, name: config.displayName, section: config.section }
	})

	const testbank: Testbank = {
		version,
		exportedAt,
		subTypes: outputSubTypes,
		items: outputItems
	}

	const json = `${JSON.stringify(testbank, null, 2)}\n`
	const fileSizeBytes = Buffer.byteLength(json, "utf8")

	// Bun.write creates the public/offline-app/ directory if it is absent.
	const writeResult = await errors.try(Bun.write(OUTPUT_PATH, json))
	if (writeResult.error) {
		logger.error({ error: writeResult.error, outputPath: OUTPUT_PATH }, "testbank write failed")
		throw errors.wrap(writeResult.error, "testbank write")
	}

	logExportSummary(outputItems, version, fileSizeBytes)
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "testbank export failed")
	process.exit(1)
}
process.exit(0)
