// scripts/backfill-missing-embeddings.ts
//
// Populate embedding for any items where embedding IS NULL. Standalone Bun
// script — bypasses the embedding-backfill workflow runtime entirely so it
// works outside Next.js context (e.g., right after `bun db:seed:items`,
// which intentionally skips the workflow trigger).
//
// EXEMPT FROM THE PROJECT RULESET. Native console.log etc.
//
// Usage:
//   bun run scripts/backfill-missing-embeddings.ts [--limit N]
//
// Why not use the workflow function? The workflow runtime's metadata
// transform only runs inside Next.js's withWorkflow() plugin. Calling it
// from a raw Bun process throws start-invalid-workflow-function. For a
// one-shot backfill we don't need the workflow's durability — direct
// embedText + UPDATE is sufficient.
//
// See src/db/seeds/items/index.ts for the seed-side decoupling, and
// docs/plans/opaque-option-ids-and-pipeline-split.md for the wider
// architecture this slots into.

import "@/env"
import { isNull, sql } from "drizzle-orm"
import { createAdminDb } from "@/db/admin"
import { items } from "@/db/schemas/catalog/items"
import { itemBody } from "@/server/items/body-schema"
import { embedText } from "@/server/generation/embeddings"

interface CliArgs {
	limit: number | undefined
}

function parseArgs(argv: string[]): CliArgs {
	const args = argv.slice(2)
	let limit: number | undefined

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		if (arg === "--help" || arg === "-h") {
			console.log(`Usage: bun run scripts/backfill-missing-embeddings.ts [--limit N]

Populates the embedding column for items where embedding IS NULL. No
flags required for the typical post-seed run.

Flags:
  --limit N   Stop after backfilling N items.
  --help, -h  Print this usage and exit.`)
			process.exit(0)
		}
		if (arg === "--limit") {
			const next = args[i + 1]
			if (!next) {
				console.error("--limit requires a value")
				process.exit(1)
			}
			const parsed = Number.parseInt(next, 10)
			if (!Number.isFinite(parsed) || parsed < 1) {
				console.error(`--limit must be a positive integer, got: ${next}`)
				process.exit(1)
			}
			limit = parsed
			i++
		} else {
			console.error(`unexpected argument: ${arg}`)
			process.exit(1)
		}
	}

	return { limit }
}

async function main(): Promise<void> {
	const { limit } = parseArgs(Bun.argv)

	console.log("backfill-missing-embeddings: starting")
	console.log(`  limit: ${limit ?? "(none)"}`)

	await using adminDb = await createAdminDb()
	const db = adminDb.db

	let baseQuery = db
		.select({ id: items.id, body: items.body })
		.from(items)
		.where(isNull(items.embedding))
		.$dynamic()

	if (limit !== undefined) {
		baseQuery = baseQuery.limit(limit)
	}

	const rows = await baseQuery
	console.log(`  found ${rows.length} item(s) with embedding=NULL`)

	let backfilled = 0
	let failed = 0

	for (const row of rows) {
		const parsed = itemBody.safeParse(row.body)
		if (!parsed.success) {
			console.log(`  [skip] ${row.id} — body schema invalid`)
			failed++
			continue
		}
		const body = parsed.data
		const text = body.kind === "text" ? body.text : null
		if (!text) {
			console.log(`  [skip] ${row.id} — non-text body variant`)
			failed++
			continue
		}

		try {
			const embedding = await embedText(text)
			await db.execute(
				sql`UPDATE items SET embedding = ${JSON.stringify(embedding)}::vector WHERE id = ${row.id}`
			)
			backfilled++
			console.log(`  [ok] ${row.id}  (${embedding.length}-dim)`)
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			console.log(`  [fail] ${row.id} — ${message}`)
			failed++
		}
	}

	console.log("")
	console.log("=== summary ===")
	console.log(`backfilled: ${backfilled}`)
	console.log(`failed:     ${failed}`)
	console.log(`total:      ${rows.length}`)
}

try {
	await main()
} catch (err) {
	console.error("[fatal]", err instanceof Error ? err.message : String(err))
	if (err instanceof Error && err.stack) console.error(err.stack)
	process.exit(1)
}
