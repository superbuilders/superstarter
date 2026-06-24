import type { Violation } from "@scripts/dev/lint/types"
import { logger } from "@/logger"

function outputText(allViolations: Violation[]): void {
	for (const v of allViolations) {
		const relativePath = v.file.replace(`${process.cwd()}/`, "")
		logger.warn(
			{
				location: `${relativePath}:${v.line}:${v.column}`,
				rule: v.rule,
				message: v.message
			},
			"lint violation"
		)
	}

	if (allViolations.length > 0) {
		logger.info(
			{
				violations: allViolations.length,
				files: new Set(allViolations.map((v) => v.file)).size
			},
			"summary"
		)
	} else {
		logger.info("no violations found")
	}
}

function outputJson(allViolations: Violation[]): void {
	process.stdout.write(`${JSON.stringify({ violations: allViolations }, null, 2)}\n`)
}

export { outputJson, outputText }
