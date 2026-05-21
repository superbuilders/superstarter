// scripts/dev/retag-items.ts
//
// Operational dev-only re-classifier. Reads every row from `items` at
// status='live', re-runs the extract-pass classifier (text-only — no image
// input) with the improved disambiguation rubric shipped in commit 65e8af4
// of phase5-tagger-improvement, and UPDATEs `sub_type_id` + `difficulty`
// in place where the new classification differs from the current one.
//
// Plan: docs/plans/tagger-improvement.md §3.2.
//
// Reuses the exact same system prompt + tool definition as
// scripts/_lib/extract.ts (imported, not transcribed) so prompt parity is
// mechanical. The user message is text-only (question + options as plain
// text); the LLM still produces the full extract schema (isTextOnly,
// answerVisible, etc.) but only `subTypeId` + `difficulty` are consumed.
//
// Usage:
//   bun run scripts/dev/retag-items.ts                 # default: dry-run
//   bun run scripts/dev/retag-items.ts --apply         # write UPDATEs
//   bun run scripts/dev/retag-items.ts --limit 10      # smoke a small batch
//   bun run scripts/dev/retag-items.ts --apply --limit 10

import "@/env"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { type AdminDb, createAdminDb } from "@/db/admin"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { itemBody } from "@/server/items/body-schema"
import {
	client,
	EXTRACT_MAX_TOKENS,
	EXTRACT_MODEL,
	withBackoff
} from "@scripts/_lib/anthropic"
import {
	buildExtractSystemPrompt,
	EXTRACT_TOOL,
	EXTRACT_TOOL_NAME,
	extractedItem
} from "@scripts/_lib/extract"

const optionShape = z.object({
	id: z.string().min(1),
	text: z.string().min(1)
})

const optionsSchema = z.array(optionShape).min(2).max(5)

const ErrBodySchema = errors.new("body schema validation failed")
const ErrOptionsSchema = errors.new("options schema validation failed")
const ErrNoToolUseBlock = errors.new(`no ${EXTRACT_TOOL_NAME} tool_use block`)
const ErrClassifySchema = errors.new("classifier output failed schema validation")
const ErrCliMissingLimit = errors.new("--limit requires a numeric argument")
const ErrCliBadLimit = errors.new("--limit must be a positive integer")
const ErrCliUnknownArg = errors.new("unknown CLI argument")

interface CliArgs {
	apply: boolean
	limit: number | null
}

function parseLimitValue(raw: string | undefined): number {
	if (!raw) {
		logger.error("retag: --limit requires a numeric argument")
		throw ErrCliMissingLimit
	}
	const n = Number.parseInt(raw, 10)
	if (!Number.isFinite(n) || n <= 0) {
		logger.error({ raw }, "retag: --limit not a positive integer")
		throw errors.wrap(ErrCliBadLimit, raw)
	}
	return n
}

function parseArgs(argv: ReadonlyArray<string>): CliArgs {
	let apply = false
	let limit: number | null = null
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (arg === undefined) continue
		if (arg === "--apply") {
			apply = true
			continue
		}
		if (arg === "--limit") {
			limit = parseLimitValue(argv[i + 1])
			i++
			continue
		}
		if (arg === "--help" || arg === "-h") {
			logger.info("usage: bun run scripts/dev/retag-items.ts [--apply] [--limit N]")
			process.exit(0)
		}
		logger.error({ arg }, "retag: unknown CLI argument")
		throw errors.wrap(ErrCliUnknownArg, arg)
	}
	return { apply, limit }
}

type ClassifyResult = z.infer<typeof extractedItem>

interface RetagOutcome {
	itemId: string
	sourceFolder: string | null
	before: { subTypeId: string; difficulty: string }
	after: {
		subTypeId: ClassifyResult["subTypeId"]
		difficulty: ClassifyResult["difficulty"]
	}
	changed: boolean
	tokensIn: number
	tokensOut: number
}

interface RenderedQuestion {
	question: string
	options: string[]
}

function renderQuestion(bodyJson: unknown, optionsJson: unknown): RenderedQuestion {
	const bodyParsed = itemBody.safeParse(bodyJson)
	if (!bodyParsed.success) {
		logger.error({ issues: bodyParsed.error.issues }, "retag: body schema validation failed")
		throw errors.wrap(ErrBodySchema, JSON.stringify(bodyParsed.error.issues))
	}
	const optionsParsed = optionsSchema.safeParse(optionsJson)
	if (!optionsParsed.success) {
		logger.error(
			{ issues: optionsParsed.error.issues },
			"retag: options schema validation failed"
		)
		throw errors.wrap(ErrOptionsSchema, JSON.stringify(optionsParsed.error.issues))
	}
	return {
		question: bodyParsed.data.text,
		options: optionsParsed.data.map(function getText(o) {
			return o.text
		})
	}
}

interface ClassifyOutput {
	subTypeId: ClassifyResult["subTypeId"]
	difficulty: ClassifyResult["difficulty"]
	tokensIn: number
	tokensOut: number
}

async function classifyTextOnly(
	question: string,
	options: string[]
): Promise<ClassifyOutput> {
	const system = buildExtractSystemPrompt()

	const optionsBlock = options
		.map(function format(text, i) {
			const letter = String.fromCharCode("A".charCodeAt(0) + i)
			return `${letter}. ${text}`
		})
		.join("\n")
	const userText = [
		`Classify this CCAT question by calling the ${EXTRACT_TOOL_NAME} tool.`,
		"This is a text-only re-classification — there is no screenshot.",
		"Set isTextOnly=true, answerVisible=false, explanationVisible=false.",
		"Use the question + options below to determine subTypeId and difficulty.",
		"",
		"Question:",
		question,
		"",
		"Options:",
		optionsBlock
	].join("\n")

	const callResult = await errors.try(
		withBackoff("retag", function call() {
			return client.messages.create({
				model: EXTRACT_MODEL,
				max_tokens: EXTRACT_MAX_TOKENS,
				temperature: 0,
				system,
				tools: [EXTRACT_TOOL],
				tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
				messages: [
					{
						role: "user",
						content: [{ type: "text", text: userText }]
					}
				]
			})
		})
	)
	if (callResult.error) {
		logger.error({ error: callResult.error }, "retag: anthropic call failed")
		throw errors.wrap(callResult.error, "anthropic.messages.create")
	}
	const message = callResult.data

	let toolInput: unknown
	for (const block of message.content) {
		if (block.type === "tool_use" && block.name === EXTRACT_TOOL_NAME) {
			toolInput = block.input
			break
		}
	}
	if (toolInput === undefined) {
		const preview = JSON.stringify(message.content).slice(0, 200)
		logger.error({ preview }, "retag: no tool_use block in response")
		throw errors.wrap(ErrNoToolUseBlock, preview)
	}

	const parsed = extractedItem.safeParse(toolInput)
	if (!parsed.success) {
		logger.error({ issues: parsed.error.issues }, "retag: classifier schema validation failed")
		throw errors.wrap(ErrClassifySchema, JSON.stringify(parsed.error.issues))
	}

	return {
		subTypeId: parsed.data.subTypeId,
		difficulty: parsed.data.difficulty,
		tokensIn: message.usage.input_tokens,
		tokensOut: message.usage.output_tokens
	}
}

interface ItemRow {
	id: string
	subTypeId: string
	difficulty: "easy" | "medium" | "hard" | "brutal"
	body: unknown
	optionsJson: unknown
	sourceFolder: string | null
	status: "live" | "candidate" | "retired" | "rejected"
}

async function loadRows(adminDb: AdminDb, limit: number | null): Promise<ItemRow[]> {
	const baseQuery = adminDb.db
		.select({
			id: items.id,
			subTypeId: items.subTypeId,
			difficulty: items.difficulty,
			body: items.body,
			optionsJson: items.optionsJson,
			sourceFolder: items.sourceFolder,
			status: items.status
		})
		.from(items)
		.where(eq(items.status, "live"))
	if (limit !== null) {
		return baseQuery.limit(limit)
	}
	return baseQuery
}

async function applyUpdate(
	adminDb: AdminDb,
	itemId: string,
	subTypeId: ClassifyResult["subTypeId"],
	difficulty: ClassifyResult["difficulty"]
): Promise<void> {
	const updateResult = await errors.try(
		adminDb.db
			.update(items)
			.set({ subTypeId, difficulty })
			.where(eq(items.id, itemId))
	)
	if (updateResult.error) {
		logger.error({ error: updateResult.error, itemId }, "retag: UPDATE failed")
		throw errors.wrap(updateResult.error, `update item ${itemId}`)
	}
}

interface RowProcessResult {
	outcome: RetagOutcome | null
	tokensIn: number
	tokensOut: number
}

async function processRow(
	adminDb: AdminDb,
	row: ItemRow,
	apply: boolean
): Promise<RowProcessResult> {
	const renderResult = errors.trySync(function render() {
		return renderQuestion(row.body, row.optionsJson)
	})
	if (renderResult.error) {
		logger.warn(
			{ itemId: row.id, error: renderResult.error },
			"retag: render skipped row"
		)
		return { outcome: null, tokensIn: 0, tokensOut: 0 }
	}
	const rendered = renderResult.data

	const clsResult = await errors.try(classifyTextOnly(rendered.question, rendered.options))
	if (clsResult.error) {
		logger.warn(
			{ itemId: row.id, error: clsResult.error },
			"retag: classify skipped row"
		)
		return { outcome: null, tokensIn: 0, tokensOut: 0 }
	}
	const cls = clsResult.data

	const before = { subTypeId: row.subTypeId, difficulty: row.difficulty }
	const after = { subTypeId: cls.subTypeId, difficulty: cls.difficulty }
	let isChanged = false
	if (before.subTypeId !== after.subTypeId || before.difficulty !== after.difficulty) {
		isChanged = true
	}

	const outcome: RetagOutcome = {
		itemId: row.id,
		sourceFolder: row.sourceFolder,
		before,
		after,
		changed: isChanged,
		tokensIn: cls.tokensIn,
		tokensOut: cls.tokensOut
	}

	if (isChanged && apply) {
		await applyUpdate(adminDb, row.id, cls.subTypeId, cls.difficulty)
	}

	return { outcome, tokensIn: cls.tokensIn, tokensOut: cls.tokensOut }
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2))
	const limitDisplay = args.limit === null ? "(none)" : String(args.limit)
	logger.info({ apply: args.apply, limit: limitDisplay }, "retag: starting")

	await using adminDb = await createAdminDb()

	const rows = await loadRows(adminDb, args.limit)
	logger.info({ rowCount: rows.length }, "retag: rows loaded at status='live'")

	const ts = new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "")
	const summaryPath = `scripts/_logs/retag-summary-${ts}.jsonl`
	const summaryFile = Bun.file(summaryPath)
	const writer = summaryFile.writer()

	let processed = 0
	let changed = 0
	let totalTokensIn = 0
	let totalTokensOut = 0

	for (const row of rows) {
		processed++
		const result = await processRow(adminDb, row, args.apply)
		totalTokensIn += result.tokensIn
		totalTokensOut += result.tokensOut

		if (result.outcome === null) continue

		writer.write(`${JSON.stringify(result.outcome)}\n`)

		if (result.outcome.changed) {
			changed++
			const folderTag = result.outcome.sourceFolder === null ? "(seed)" : result.outcome.sourceFolder
			logger.info(
				{
					index: processed,
					total: rows.length,
					itemId: row.id,
					folder: folderTag,
					before: result.outcome.before,
					after: result.outcome.after
				},
				"retag: row reclassified"
			)
		}
	}

	await writer.end()

	const mode = args.apply ? "APPLIED" : "DRY-RUN"
	logger.info(
		{
			mode,
			processed,
			changed,
			tokensIn: totalTokensIn,
			tokensOut: totalTokensOut,
			summaryPath: path.resolve(summaryPath)
		},
		"retag: complete"
	)
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "retag: failed")
	process.exit(1)
}
