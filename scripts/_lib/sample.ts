// scripts/_lib/sample.ts
//
// File walking, deterministic sampling, and SHA-256 helpers shared by
// the OCR pipeline scripts.
// EXEMPT FROM THE PROJECT RULESET.

import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"

const SAMPLE_SEED = "18seconds-ocr-sample-v1"

function listPngsTopLevel(dir: string): string[] {
	const out: string[] = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
			out.push(path.join(dir, entry.name))
		}
	}
	out.sort()
	return out
}

function listPngsRecursive(dir: string): string[] {
	const out: string[] = []
	function walk(current: string): void {
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name)
			if (entry.isDirectory()) {
				walk(full)
			} else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
				out.push(full)
			}
		}
	}
	walk(dir)
	out.sort()
	return out
}

function deterministicSample<T extends string>(files: T[], count: number): T[] {
	const hashed = files.map((file) => ({
		file,
		hash: createHash("sha256").update(`${SAMPLE_SEED}|${file}`).digest("hex")
	}))
	hashed.sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0))
	return hashed.slice(0, count).map((h) => h.file)
}

function sha256File(filePath: string): string {
	const buf = fs.readFileSync(filePath)
	return createHash("sha256").update(buf).digest("hex")
}

export {
	deterministicSample,
	listPngsRecursive,
	listPngsTopLevel,
	sha256File,
	SAMPLE_SEED
}
