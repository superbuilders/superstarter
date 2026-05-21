// scripts/migrate-opaque-option-ids.ts
//
// One-shot migration: rewrite every items row's option ids from letter
// shape ("A","B","C","D","E") to opaque base32 ids (8 chars). Also
// rewrites correct_answer and metadata_json.structuredExplanation.parts[].
// referencedOptions[] consistently with the new id map.
//
// EXEMPT FROM THE PROJECT RULESET. This file is a standalone Bun script,
// not part of the app source tree. It uses console.log, native try/catch,
// and other patterns banned in src/.
//
// Idempotent: re-running after a partial run skips already-migrated rows
// (detected by inspecting options_json[0].id — single uppercase A-E means
// not yet migrated).
//
// Logs per-item state to scripts/_logs/migrate-opaque-ids.jsonl AFTER each
// row's transaction commits successfully (the log is the rollback artifact).
//
// Usage:
//   bun run scripts/migrate-opaque-option-ids.ts
//
// See docs/plans/opaque-option-ids-and-pipeline-split.md §3 for the design.

import "@/env"
import { eq } from "drizzle-orm"
import * as fs from "node:fs"
import * as path from "node:path"
import { createAdminDb } from "@/db/admin"
import { items } from "@/db/schemas/catalog/items"
import { assignOptionIds } from "@/server/items/option-id"

const LOGS_DIR = path.resolve(import.meta.dir, "_logs")
const LOG_FILE = path.join(LOGS_DIR, "migrate-opaque-ids.jsonl")

interface ItemOption {
	id: string
	text: string
}

interface StructuredPart {
	kind: string
	text: string
	referencedOptions: string[]
}

interface StructuredExplanation {
	parts: StructuredPart[]
}

interface MetadataJson {
	originalExplanation?: string
	importSource?: string
	structuredExplanation?: StructuredExplanation
}

type LogStatus =
	| "migrated"
	| "skipped-already-migrated"
	| "failed"
	| "skipped-malformed"

interface LogEntry {
	timestamp: string
	itemId: string
	status: LogStatus
	oldOptions?: ItemOption[]
	newOptions?: ItemOption[]
	letterToOpaque?: Record<string, string>
	error?: string
}

function appendLog(entry: LogEntry): void {
	if (!fs.existsSync(LOGS_DIR)) {
		fs.mkdirSync(LOGS_DIR, { recursive: true })
	}
	fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`)
}

function isAlreadyMigrated(options: ItemOption[]): boolean {
	const first = options[0]
	if (!first) return false
	const firstId = first.id
	if (typeof firstId !== "string") return false
	// Letter shape is exactly one uppercase A-E. Anything else (8-char base32,
	// already-opaque) is treated as already migrated.
	return !/^[A-E]$/.test(firstId)
}

interface ItemRow {
	id: string
	optionsJson: unknown
	correctAnswer: string
	metadataJson: unknown
}

async function migrate(): Promise<void> {
	console.log("starting opaque option-id migration")
	console.log(`log file: ${LOG_FILE}`)

	await using adminDb = await createAdminDb()
	const db = adminDb.db

	const rows: ItemRow[] = await db
		.select({
			id: items.id,
			optionsJson: items.optionsJson,
			correctAnswer: items.correctAnswer,
			metadataJson: items.metadataJson
		})
		.from(items)

	console.log(`found ${rows.length} item rows`)

	let migrated = 0
	let skippedAlreadyMigrated = 0
	let failed = 0
	let skippedMalformed = 0

	for (const row of rows) {
		const itemId = row.id
		const oldOptions = row.optionsJson as ItemOption[]

		if (!Array.isArray(oldOptions)) {
			const message = "options_json is not an array"
			console.log(`[skip] ${itemId} — ${message}`)
			appendLog({
				timestamp: new Date().toISOString(),
				itemId,
				status: "skipped-malformed",
				error: message
			})
			skippedMalformed++
			continue
		}

		if (isAlreadyMigrated(oldOptions)) {
			console.log(`[skip] ${itemId} — already migrated`)
			appendLog({
				timestamp: new Date().toISOString(),
				itemId,
				status: "skipped-already-migrated"
			})
			skippedAlreadyMigrated++
			continue
		}

		const newOptionsTexts = oldOptions.map(function pickText(option) {
			return { text: option.text }
		})
		const newOptions = assignOptionIds(newOptionsTexts)

		const letterToOpaque: Record<string, string> = {}
		for (let i = 0; i < oldOptions.length; i++) {
			const oldOpt = oldOptions[i]
			const newOpt = newOptions[i]
			if (!oldOpt || !newOpt) {
				throw new Error(`unexpected undefined option at index ${i} for item ${itemId}`)
			}
			letterToOpaque[oldOpt.id] = newOpt.id
		}

		const newCorrectAnswer = letterToOpaque[row.correctAnswer]
		if (!newCorrectAnswer) {
			const message = `correct_answer '${row.correctAnswer}' not in letterToOpaque map`
			console.log(`[fail] ${itemId} — ${message}`)
			appendLog({
				timestamp: new Date().toISOString(),
				itemId,
				status: "failed",
				oldOptions,
				newOptions,
				letterToOpaque,
				error: message
			})
			failed++
			continue
		}

		const oldMetadata = (row.metadataJson ?? {}) as MetadataJson
		let newMetadata: MetadataJson = oldMetadata
		let metadataFailed = false

		if (oldMetadata.structuredExplanation) {
			const newParts: StructuredPart[] = []
			for (const part of oldMetadata.structuredExplanation.parts) {
				const newRefs: string[] = []
				let partFailed = false
				for (const oldRef of part.referencedOptions) {
					const newRef = letterToOpaque[oldRef]
					if (!newRef) {
						const message = `referencedOptions value '${oldRef}' not in letterToOpaque map`
						console.log(`[fail] ${itemId} — ${message}`)
						appendLog({
							timestamp: new Date().toISOString(),
							itemId,
							status: "failed",
							oldOptions,
							newOptions,
							letterToOpaque,
							error: message
						})
						failed++
						metadataFailed = true
						partFailed = true
						break
					}
					newRefs.push(newRef)
				}
				if (partFailed) break
				newParts.push({
					kind: part.kind,
					text: part.text,
					referencedOptions: newRefs
				})
			}
			if (metadataFailed) continue
			newMetadata = {
				...oldMetadata,
				structuredExplanation: { parts: newParts }
			}
		}

		try {
			await db.transaction(async function applyMigration(tx) {
				await tx
					.update(items)
					.set({
						optionsJson: newOptions,
						correctAnswer: newCorrectAnswer,
						metadataJson: newMetadata as unknown as typeof items.$inferInsert.metadataJson
					})
					.where(eq(items.id, itemId))
			})
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			console.log(`[fail] ${itemId} — transaction error: ${message}`)
			appendLog({
				timestamp: new Date().toISOString(),
				itemId,
				status: "failed",
				oldOptions,
				newOptions,
				letterToOpaque,
				error: `transaction: ${message}`
			})
			failed++
			continue
		}

		// AFTER commit succeeds, log the per-item map. The log is the rollback
		// artifact (see plan §3.2/§3.4) so it must reflect what is in the DB.
		appendLog({
			timestamp: new Date().toISOString(),
			itemId,
			status: "migrated",
			oldOptions,
			newOptions,
			letterToOpaque
		})
		migrated++
		console.log(`[ok] ${itemId} — ${oldOptions.length} options migrated`)
	}

	console.log("\n=== summary ===")
	console.log(`migrated:                  ${migrated}`)
	console.log(`skipped (already migrated): ${skippedAlreadyMigrated}`)
	console.log(`skipped (malformed):       ${skippedMalformed}`)
	console.log(`failed:                    ${failed}`)
	console.log(`total:                     ${rows.length}`)
	console.log(`\nlog file: ${LOG_FILE}`)
}

try {
	await migrate()
} catch (err) {
	console.error("migration failed:", err)
	process.exit(1)
}
