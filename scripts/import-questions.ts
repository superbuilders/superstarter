// scripts/import-questions.ts
//
// Stage 1 of the split OCR pipeline. Per image: idempotency check
// (presence of stage-1 JSON file), extract via Sonnet vision,
// isTextOnly check, branch on answerVisible (use screenshot answer OR
// run solve+verify). Emits one JSON file per successful image to
// scripts/_stage1/<source-dir-name>/<original-filename>.json.
//
// Does NOT call the explain pass. Does NOT POST to the ingest route.
// That happens in stage 2 (scripts/generate-explanations.ts).
//
// EXEMPT FROM THE PROJECT RULESET. Native try/catch, console.log, and
// other patterns banned in src/ are intentional here per the
// scripts/import-screenshots.ts precedent.
//
// Usage and operating procedure: see
// docs/plans/opaque-option-ids-and-pipeline-split.md §5.1 for the runbook.

import * as fs from "node:fs"
import * as path from "node:path"
import { assignOptionIds } from "@/server/items/option-id"
import { errorToString } from "@scripts/_lib/anthropic"
import { type ExtractedItem, extractFromImage } from "@scripts/_lib/extract"
import {
	appendJsonl,
	ensureLogsDir,
	ensureStage1Dir,
	EXTRACT_FAILURES_LOG,
	NEEDS_REVIEW_LOG,
	nowIso,
	SKIPPED_LOG,
	STAGE1_COMPLETE_LOG,
	STAGE1_DIR
} from "@scripts/_lib/logs"
import {
	deterministicSample,
	listPngsRecursive,
	listPngsTopLevel,
	SAMPLE_SEED,
	sha256File
} from "@scripts/_lib/sample"
import {
	indexForLetter,
	letterForIndex,
	type SolverOutput,
	solveQuestion,
	type VerifierOutput,
	verifyAnswer
} from "@scripts/_lib/solve-verify"

interface CliArgs {
	inboxDir: string
	dryRun: boolean
	limit: number | undefined
	sample: boolean
	skipSolve: boolean
}

function printUsage(): void {
	console.log(`Usage: bun run scripts/import-questions.ts <inbox-dir> [--dry-run] [--limit N] [--sample] [--skip-solve]

Stage 1 of the split OCR pipeline: extract → solve+verify (when answer not visible) → emit stage-1 JSON.
The explain pass and the POST to /api/admin/ingest-item happen in stage 2 (scripts/generate-explanations.ts).

Arguments:
  <inbox-dir>     Required. Path to a folder of PNG screenshots.

Flags:
  --dry-run       Run extract (and solve/verify if needed) but do not write stage-1 JSON files.
  --limit N       Stop after processing N images.
  --sample        Recursively sample N images deterministically from across <inbox-dir>.
                  REQUIRES --limit to specify the sample size.
  --skip-solve    For images where the answer is not visible, log to skipped and continue
                  instead of running solve+verify.
  --help, -h      Print this usage message and exit.

See docs/plans/opaque-option-ids-and-pipeline-split.md §5.1 for the full runbook.`)
}

function parseArgs(argv: string[]): CliArgs | { help: true } {
	const args = argv.slice(2)
	if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
		return { help: true }
	}

	let inboxDir: string | undefined
	let dryRun = false
	let limit: number | undefined
	let sample = false
	let skipSolve = false

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		if (arg === "--dry-run") {
			dryRun = true
		} else if (arg === "--sample") {
			sample = true
		} else if (arg === "--skip-solve") {
			skipSolve = true
		} else if (arg === "--limit") {
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
		} else if (arg?.startsWith("--")) {
			console.error(`unknown flag: ${arg}`)
			process.exit(1)
		} else if (arg && !inboxDir) {
			inboxDir = arg
		} else {
			console.error(`unexpected argument: ${arg}`)
			process.exit(1)
		}
	}

	if (!inboxDir) {
		console.error("inbox-dir is required")
		printUsage()
		process.exit(1)
	}

	if (sample && limit === undefined) {
		console.error("--sample requires --limit (the deterministic sample size must be explicit)")
		process.exit(1)
	}

	const resolved = path.resolve(inboxDir)
	if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
		console.error(`inbox-dir does not exist or is not a directory: ${resolved}`)
		process.exit(1)
	}

	return { inboxDir: resolved, dryRun, limit, sample, skipSolve }
}

interface Counters {
	totalFiles: number
	alreadyExtracted: number
	skippedVisual: number
	skippedNoSolve: number
	extractFailures: number
	needsReview: number
	stage1OcrVisible: number
	stage1OcrSolved: number
	stage1WithOriginal: number
	stage1WithoutOriginal: number
}

function newCounters(totalFiles: number): Counters {
	return {
		totalFiles,
		alreadyExtracted: 0,
		skippedVisual: 0,
		skippedNoSolve: 0,
		extractFailures: 0,
		needsReview: 0,
		stage1OcrVisible: 0,
		stage1OcrSolved: 0,
		stage1WithOriginal: 0,
		stage1WithoutOriginal: 0
	}
}

function pad(value: string | number, width: number): string {
	return String(value).padStart(width, " ")
}

function printSummary(c: Counters): void {
	const total = c.stage1OcrVisible + c.stage1OcrSolved
	console.log("")
	console.log("=== Stage 1 summary ===")
	console.log(`Total files:                 ${pad(c.totalFiles, 4)}`)
	console.log(`Already extracted:           ${pad(c.alreadyExtracted, 4)}`)
	console.log(`Skipped (visual):            ${pad(c.skippedVisual, 4)}`)
	console.log(`Skipped (no-solve):          ${pad(c.skippedNoSolve, 4)}`)
	console.log(`Extract failures:            ${pad(c.extractFailures, 4)}`)
	console.log(`Needs review:                ${pad(c.needsReview, 4)}`)
	console.log(`Stage-1 outputs written:     ${pad(total, 4)}`)
	console.log(
		`  - visible answer:          ${pad(c.stage1OcrVisible, 4)}  (orig explanation: ${c.stage1WithOriginal}, no orig: ${c.stage1WithoutOriginal})`
	)
	console.log(`  - solve + verify:          ${pad(c.stage1OcrSolved, 4)}`)
}

interface Stage1Json {
	sourceImagePath: string
	sourceImageHash: string
	sourceFolder: string
	sourceFilename: string
	extractedAt: string
	subTypeId: ExtractedItem["subTypeId"]
	difficulty: ExtractedItem["difficulty"]
	question: string
	options: { id: string; text: string }[]
	correctAnswer: string
	originalExplanation?: string
	importSource: "ocr-visible" | "ocr-solved"
}

function stage1OutputPath(sourceImagePath: string, inboxDir: string): string {
	// Derive <source-dir-name> as the inbox-dir's basename. When --sample
	// is used recursively across multiple subdirectories, this still gives
	// a stable per-inbox grouping.
	const inboxBase = path.basename(inboxDir.replace(/\/$/, ""))
	const sourceBase = path.basename(sourceImagePath)
	const dir = path.join(STAGE1_DIR, inboxBase)
	return path.join(dir, `${sourceBase}.json`)
}

async function processImage(
	filePath: string,
	args: CliArgs,
	counters: Counters
): Promise<void> {
	const hash = sha256File(filePath)
	const relPath = path.relative(process.cwd(), filePath)
	const shortHash = hash.slice(0, 12)

	console.log(`\n--- ${relPath}  [${shortHash}…]`)

	const stage1Path = stage1OutputPath(filePath, args.inboxDir)
	if (fs.existsSync(stage1Path)) {
		counters.alreadyExtracted++
		console.log(`  [skip] stage-1 JSON already exists: ${path.relative(process.cwd(), stage1Path)}`)
		return
	}

	const result = await extractFromImage(filePath)
	if (!result.ok) {
		counters.extractFailures++
		console.log(`  [extract failed] ${result.error}`)
		if (!args.dryRun) {
			appendJsonl(EXTRACT_FAILURES_LOG, {
				timestamp: nowIso(),
				filePath: relPath,
				hash,
				stage: "extract",
				rawOutput: result.rawOutput,
				error: result.error
			})
		}
		return
	}

	const data = result.data
	console.log(
		`  [extracted] subType=${data.subTypeId} difficulty=${data.difficulty} answerVisible=${data.answerVisible} explanationVisible=${data.explanationVisible} isTextOnly=${data.isTextOnly}`
	)
	if (args.dryRun) {
		console.log("  [extracted JSON]")
		const pretty = JSON.stringify(data, null, 2)
			.split("\n")
			.map((l) => `    ${l}`)
			.join("\n")
		console.log(pretty)
	}

	if (!data.isTextOnly) {
		counters.skippedVisual++
		console.log("  [skip] not text-only (visual content)")
		if (!args.dryRun) {
			appendJsonl(SKIPPED_LOG, {
				timestamp: nowIso(),
				filePath: relPath,
				hash,
				reason: "visual content"
			})
		}
		return
	}

	// Assign opaque ids server-side. Position-in-array is the source of
	// truth: options[0] always corresponds to the screenshot's "A" option.
	const optionsWithIds = assignOptionIds(data.options)
	console.log(`  [opaque ids] ${optionsWithIds.map((o) => o.id).join(", ")}`)

	let opaqueCorrectAnswer: string
	let importSource: "ocr-visible" | "ocr-solved"

	if (data.answerVisible && data.correctAnswer) {
		const idx = indexForLetter(data.correctAnswer)
		const opt = optionsWithIds[idx]
		if (!opt) {
			throw new Error(
				`extracted correctAnswer letter '${data.correctAnswer}' index ${idx} out of range for ${optionsWithIds.length} options`
			)
		}
		opaqueCorrectAnswer = opt.id
		importSource = "ocr-visible"
		console.log(`  [answer from screenshot] letter=${data.correctAnswer} → ${opaqueCorrectAnswer}`)
	} else {
		if (args.skipSolve) {
			counters.skippedNoSolve++
			console.log("  [skip] no answer visible, --skip-solve set")
			if (!args.dryRun) {
				appendJsonl(SKIPPED_LOG, {
					timestamp: nowIso(),
					filePath: relPath,
					hash,
					reason: "needs solve, --skip-solve set"
				})
			}
			return
		}

		console.log("  [solve]")
		let solver: SolverOutput
		try {
			solver = await solveQuestion(data.question, data.options)
		} catch (err) {
			counters.needsReview++
			console.log(`  [solve failed] ${errorToString(err)} → needs-review`)
			if (!args.dryRun) {
				appendJsonl(NEEDS_REVIEW_LOG, {
					timestamp: nowIso(),
					filePath: relPath,
					hash,
					failureMode: "solve-error",
					question: data.question,
					options: data.options,
					error: errorToString(err)
				})
			}
			return
		}
		console.log(`  [solver] answer=${solver.correctAnswer} confidence=${solver.confidence}`)
		if (args.dryRun) console.log(`  [solver reasoning] ${solver.reasoning}`)

		console.log("  [verify]")
		let verifier: VerifierOutput
		try {
			verifier = await verifyAnswer(data.question, data.options, solver)
		} catch (err) {
			counters.needsReview++
			console.log(`  [verify failed] ${errorToString(err)} → needs-review`)
			if (!args.dryRun) {
				appendJsonl(NEEDS_REVIEW_LOG, {
					timestamp: nowIso(),
					filePath: relPath,
					hash,
					failureMode: "verify-error",
					question: data.question,
					options: data.options,
					solver,
					error: errorToString(err)
				})
			}
			return
		}
		console.log(
			`  [verifier] agrees=${verifier.agrees}${verifier.correctIfDisagree ? ` (would pick ${verifier.correctIfDisagree})` : ""}`
		)
		if (args.dryRun && verifier.reason) console.log(`  [verifier reason] ${verifier.reason}`)

		if (!verifier.agrees) {
			counters.needsReview++
			console.log("  [skip] solver+verifier disagree → needs-review")
			if (!args.dryRun) {
				appendJsonl(NEEDS_REVIEW_LOG, {
					timestamp: nowIso(),
					filePath: relPath,
					hash,
					failureMode: "verify-disagreed",
					question: data.question,
					options: data.options,
					solver,
					verifier
				})
			}
			return
		}

		const idx = indexForLetter(solver.correctAnswer)
		const opt = optionsWithIds[idx]
		if (!opt) {
			throw new Error(
				`solver correctAnswer letter '${solver.correctAnswer}' index ${idx} out of range for ${optionsWithIds.length} options`
			)
		}
		opaqueCorrectAnswer = opt.id
		importSource = "ocr-solved"
		// Touch letterForIndex so an unused-import alarm cannot fire from a
		// future edit that drops the solve+verify path.
		void letterForIndex
	}

	const sourceFolder = path.basename(args.inboxDir.replace(/\/$/, ""))
	const sourceFilename = path.basename(filePath)

	const stage1Json: Stage1Json = {
		sourceImagePath: relPath,
		sourceImageHash: `sha256:${hash}`,
		sourceFolder,
		sourceFilename,
		extractedAt: nowIso(),
		subTypeId: data.subTypeId,
		difficulty: data.difficulty,
		question: data.question,
		options: optionsWithIds,
		correctAnswer: opaqueCorrectAnswer,
		importSource,
		...(data.originalExplanation ? { originalExplanation: data.originalExplanation } : {})
	}

	if (args.dryRun) {
		console.log(`  [DRY-RUN] would write stage-1 JSON to ${path.relative(process.cwd(), stage1Path)}`)
		const pretty = JSON.stringify(stage1Json, null, 2)
			.split("\n")
			.map((l) => `    ${l}`)
			.join("\n")
		console.log(pretty)
	} else {
		const dir = path.dirname(stage1Path)
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
		fs.writeFileSync(stage1Path, `${JSON.stringify(stage1Json, null, 2)}\n`)
		appendJsonl(STAGE1_COMPLETE_LOG, {
			timestamp: nowIso(),
			sourceImagePath: relPath,
			sourceImageHash: `sha256:${hash}`,
			subTypeId: data.subTypeId,
			difficulty: data.difficulty,
			importSource,
			hasOriginalExplanation: Boolean(data.originalExplanation)
		})
		console.log(`  [stage-1 written] ${path.relative(process.cwd(), stage1Path)}`)
	}

	if (importSource === "ocr-visible") {
		counters.stage1OcrVisible++
		if (data.originalExplanation) counters.stage1WithOriginal++
		else counters.stage1WithoutOriginal++
	} else {
		counters.stage1OcrSolved++
	}
}

async function main(): Promise<void> {
	const parsed = parseArgs(Bun.argv)
	if ("help" in parsed) {
		printUsage()
		return
	}
	const args = parsed

	ensureLogsDir()
	if (!args.dryRun) ensureStage1Dir()

	console.log(`import-questions: inbox=${args.inboxDir}`)
	console.log(
		`  flags: dryRun=${args.dryRun} limit=${args.limit ?? "(none)"} sample=${args.sample} skipSolve=${args.skipSolve}`
	)

	const candidates = args.sample
		? listPngsRecursive(args.inboxDir)
		: listPngsTopLevel(args.inboxDir)

	console.log(
		`  found ${candidates.length} .png file(s) ${args.sample ? "(recursive)" : "(top-level only)"}`
	)

	let queue = candidates
	if (args.sample) {
		if (args.limit === undefined) throw new Error("invariant: --sample requires --limit")
		queue = deterministicSample(candidates, args.limit)
		console.log(`  deterministic sample of ${queue.length} (seed=${SAMPLE_SEED}):`)
		for (const f of queue) console.log(`    - ${path.relative(process.cwd(), f)}`)
	} else if (args.limit !== undefined) {
		queue = queue.slice(0, args.limit)
	}

	if (queue.length === 0) {
		console.warn("warning: no .png files to process")
	}

	const counters = newCounters(queue.length)

	let interrupted = false
	const handleInterrupt = (): void => {
		interrupted = true
		console.log("\n[interrupted] flushing summary…")
	}
	process.on("SIGINT", handleInterrupt)
	process.on("SIGTERM", handleInterrupt)

	try {
		for (const filePath of queue) {
			if (interrupted) break
			try {
				await processImage(filePath, args, counters)
			} catch (err) {
				console.log(`  [unhandled] ${errorToString(err)}`)
				if (err instanceof Error && err.stack) console.log(err.stack)
			}
		}
	} finally {
		printSummary(counters)
	}
}

await main().catch((err: unknown) => {
	console.error("[fatal]", errorToString(err))
	if (err instanceof Error && err.stack) console.error(err.stack)
	process.exit(1)
})
