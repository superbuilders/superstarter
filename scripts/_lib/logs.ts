// scripts/_lib/logs.ts
//
// Shared logging primitives for the OCR pipeline scripts.
// EXEMPT FROM THE PROJECT RULESET.

import * as fs from "node:fs"
import * as path from "node:path"

const LOGS_DIR = path.resolve(import.meta.dir, "..", "_logs")
const STAGE1_DIR = path.resolve(import.meta.dir, "..", "_stage1")

const IMPORTED_LOG = path.join(LOGS_DIR, "imported.jsonl")
const SKIPPED_LOG = path.join(LOGS_DIR, "skipped.jsonl")
const EXTRACT_FAILURES_LOG = path.join(LOGS_DIR, "extract-failures.jsonl")
const EXPLANATION_FAILURES_LOG = path.join(LOGS_DIR, "explanation-failures.jsonl")
const NEEDS_REVIEW_LOG = path.join(LOGS_DIR, "needs-review.jsonl")
const INGEST_FAILURES_LOG = path.join(LOGS_DIR, "ingest-failures.jsonl")
const STAGE1_COMPLETE_LOG = path.join(LOGS_DIR, "stage1-complete.jsonl")
const STAGE3_REGENERATED_LOG = path.join(LOGS_DIR, "stage3-regenerated.jsonl")
const STAGE3_FAILURES_LOG = path.join(LOGS_DIR, "stage3-failures.jsonl")

function ensureLogsDir(): void {
	if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })
}

function ensureStage1Dir(): void {
	if (!fs.existsSync(STAGE1_DIR)) fs.mkdirSync(STAGE1_DIR, { recursive: true })
}

function appendJsonl(file: string, obj: unknown): void {
	ensureLogsDir()
	fs.appendFileSync(file, `${JSON.stringify(obj)}\n`)
}

interface ImportedLogEntry {
	hash: string
	[key: string]: unknown
}

function loadImportedHashes(): Set<string> {
	const hashes = new Set<string>()
	if (!fs.existsSync(IMPORTED_LOG)) return hashes
	const content = fs.readFileSync(IMPORTED_LOG, "utf8")
	for (const line of content.split("\n")) {
		const trimmed = line.trim()
		if (!trimmed) continue
		try {
			const parsed = JSON.parse(trimmed) as ImportedLogEntry
			if (typeof parsed.sourceImageHash === "string") {
				hashes.add(parsed.sourceImageHash)
			} else if (typeof parsed.hash === "string") {
				// Backward compatibility with the pre-split log shape.
				hashes.add(parsed.hash)
			}
		} catch {
			// Skip malformed lines — log file shouldn't have them but better
			// than crashing on a corrupted line.
		}
	}
	return hashes
}

function nowIso(): string {
	return new Date().toISOString()
}

export {
	appendJsonl,
	ensureLogsDir,
	ensureStage1Dir,
	EXPLANATION_FAILURES_LOG,
	EXTRACT_FAILURES_LOG,
	IMPORTED_LOG,
	INGEST_FAILURES_LOG,
	loadImportedHashes,
	LOGS_DIR,
	NEEDS_REVIEW_LOG,
	nowIso,
	SKIPPED_LOG,
	STAGE1_COMPLETE_LOG,
	STAGE1_DIR,
	STAGE3_FAILURES_LOG,
	STAGE3_REGENERATED_LOG
}
