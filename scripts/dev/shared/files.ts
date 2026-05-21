import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import * as ts from "typescript"

interface ParsedTsConfig {
	fileNames: string[]
	options: ts.CompilerOptions
}

function parseTsConfig(): ParsedTsConfig {
	const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.json")
	if (!configPath) {
		logger.error("tsconfig.json not found")
		throw errors.new("tsconfig.json not found")
	}

	const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
	if (configFile.error) {
		const errorMessage =
			typeof configFile.error.messageText === "string"
				? configFile.error.messageText
				: configFile.error.messageText.messageText
		logger.error({ error: errorMessage }, "tsconfig read failed")
		throw errors.new("tsconfig read failed")
	}

	const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd())
	return {
		fileNames: parsed.fileNames,
		options: parsed.options
	}
}

function isTypeScriptFile(f: string): boolean {
	if (f.endsWith(".ts")) {
		return true
	}
	if (f.endsWith(".tsx")) {
		return true
	}
	return false
}

// Self-declared EXEMPT files (header: "EXEMPT FROM THE PROJECT RULESET").
// MUST be kept in sync with biome/base.jsonc's includes ignore block.
// Both biome and super-lint enforce the same exemption contract: the file
// must (a) carry the EXEMPT header and (b) appear in this list AND in the
// biome ignore. New files in scripts/_lib/ written under the current
// ruleset are NOT auto-exempt — they must be added here explicitly.
const EXEMPT_PATHS: ReadonlyArray<string> = [
	"scripts/_lib/anthropic.ts",
	"scripts/_lib/explain.ts",
	"scripts/_lib/extract.ts",
	"scripts/_lib/logs.ts",
	"scripts/_lib/sample.ts",
	"scripts/_lib/solve-verify.ts",
	"scripts/backfill-missing-embeddings.ts",
	"scripts/generate-explanations.ts",
	"scripts/import-questions.ts",
	"scripts/migrate-opaque-option-ids.ts",
	"scripts/regenerate-explanations.ts"
]

function isSkippedPath(fileName: string): boolean {
	if (fileName.includes("node_modules")) {
		return true
	}
	if (fileName.includes(".next")) {
		return true
	}
	if (fileName.includes("src/components/ui")) {
		return true
	}
	for (const exempt of EXEMPT_PATHS) {
		if (fileName.endsWith(`/${exempt}`)) {
			return true
		}
	}
	return false
}

function getStagedFiles(): string[] {
	const result = Bun.spawnSync(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"])
	if (!result.success) {
		return []
	}
	const output = result.stdout.toString().trim()
	if (!output) {
		return []
	}
	return output
		.split("\n")
		.filter(isTypeScriptFile)
		.map((f) => `${process.cwd()}/${f}`)
}

function getFilesToCheck(): string[] {
	const parsed = parseTsConfig()
	function isCheckableFile(f: string): boolean {
		if (f.endsWith(".d.ts")) {
			return false
		}
		if (f.includes("node_modules")) {
			return false
		}
		if (f.includes(".next")) {
			return false
		}
		if (f.includes("/scripts/")) {
			return false
		}
		if (f.endsWith(".ts")) {
			return true
		}
		if (f.endsWith(".tsx")) {
			return true
		}
		if (f.endsWith(".js")) {
			return true
		}
		return f.endsWith(".jsx")
	}
	return parsed.fileNames.filter(isCheckableFile)
}

export { getFilesToCheck, getStagedFiles, isSkippedPath, isTypeScriptFile, parseTsConfig }
export type { ParsedTsConfig }
