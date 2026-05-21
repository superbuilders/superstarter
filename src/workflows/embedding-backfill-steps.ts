// Step bodies for embeddingBackfillWorkflow.
//
// This file lives separately from the workflow file because the
// `@workflow/next` plugin's node-module guard scans the import graph of
// every `"use workflow"` file and rejects any reachable Node.js-runtime
// dependency (pino, in this codebase, via `@/logger`). Step files are
// allowed Node.js modules — they execute outside the workflow VM — so
// hoisting the actual logic + logger imports into a sibling step module
// keeps the workflow file's import graph clean while preserving
// `logger.error` / `logger.info` observability inside each step.
//
// See `rules/error-handling.md` and `rules/structured-logging.md` for
// why the logger calls live alongside the throw sites.

import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { embedText } from "@/server/generation/embeddings"
import { itemBody } from "@/server/items/body-schema"

const ErrItemNotFound = errors.new("item not found")
const ErrInvalidBody = errors.new("invalid item body")

interface LoadedItem {
	id: string
	bodyText: string
}

function textForBody(body: { kind: "text"; text: string }): string {
	switch (body.kind) {
		case "text":
			return body.text
		default: {
			const _exhaustive: never = body.kind
			return _exhaustive
		}
	}
}

async function loadItemStep(itemId: string): Promise<LoadedItem> {
	"use step"
	const rows = await db
		.select({ id: items.id, body: items.body })
		.from(items)
		.where(eq(items.id, itemId))
		.limit(1)
	const row = rows[0]
	if (!row) {
		logger.warn({ itemId }, "embedding-backfill: item not found")
		throw errors.wrap(ErrItemNotFound, `item id '${itemId}'`)
	}

	const parsed = itemBody.safeParse(row.body)
	if (!parsed.success) {
		logger.error(
			{ itemId, issues: parsed.error.issues },
			"embedding-backfill: item body failed schema validation"
		)
		throw errors.wrap(ErrInvalidBody, `item id '${itemId}'`)
	}

	const text = textForBody(parsed.data)
	return { id: row.id, bodyText: text }
}

async function embedStep(text: string): Promise<number[]> {
	"use step"
	return embedText(text)
}

async function writeStep(itemId: string, embedding: number[]): Promise<void> {
	"use step"
	const result = await errors.try(
		db.update(items).set({ embedding }).where(eq(items.id, itemId))
	)
	if (result.error) {
		logger.error({ error: result.error, itemId }, "embedding-backfill: update failed")
		throw errors.wrap(result.error, "embedding-backfill update")
	}
	logger.info({ itemId, dimensions: embedding.length }, "embedding-backfill: wrote embedding")
}

export { embedStep, loadItemStep, writeStep }
