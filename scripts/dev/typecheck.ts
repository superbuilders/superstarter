import { $ } from "bun"
import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"

/**
 * The full typecheck perimeter: the root project PLUS every package tsconfig.
 * The root config excludes `packages/`, so without this fan-out a package can
 * ship a type error while every gate stays green.
 *
 * Runs on tsc (TypeScript 7 native compiler) with NO tsc fallback, and every
 * gate runs CONCURRENTLY — tsc parallelizes checking within each gate and
 * Promise.all parallelizes across gates, so wall time is the slowest single
 * gate, not the sum.
 */

type Gate = {
	label: string
	cwd: string
	project: string
}

const GATES: Gate[] = [
	{ label: "root", cwd: ".", project: "tsconfig.json" },
	{ label: "iac", cwd: "packages/superstarter-iac", project: "tsconfig.json" }
]

function countErrors(output: string): number {
	const matches = output.match(/error TS\d+:/g)
	if (matches === null) {
		return 0
	}
	return matches.length
}

async function runGate(gate: Gate): Promise<string[]> {
	const result = await errors.try(
		$`tsc --noEmit -p ${gate.project}`.cwd(gate.cwd).quiet().nothrow()
	)
	if (result.error) {
		logger.error({ error: result.error, gate: gate.label }, "typecheck gate spawn failed")
		throw errors.wrap(result.error, `typecheck gate spawn: ${gate.label}`)
	}
	const output = `${result.data.stdout.toString()}${result.data.stderr.toString()}`
	const errorCount = countErrors(output)
	if (errorCount > 0) {
		process.stdout.write(output)
		return [`${gate.label}: ${errorCount} type errors`]
	}
	logger.info({ gate: gate.label }, "typecheck gate ok")
	return []
}

async function main(): Promise<void> {
	const results = await Promise.all(GATES.map(runGate))
	const failures = results.flat()
	for (const failure of failures) {
		logger.error({ failure }, "typecheck gate FAILED")
	}
	if (failures.length > 0) {
		logger.error({ failures }, "typecheck perimeter failed")
		throw errors.new(`typecheck: ${failures.length} gates failed`)
	}
	logger.info({ gates: GATES.length }, "typecheck perimeter ok")
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "typecheck failed")
	process.exit(1)
}
