import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { Sandbox } from "@vercel/sandbox"

const MAX_OUTPUT_LENGTH = 8000

type GateName = "typecheck" | "test" | "lint" | "build"

type GateResult = {
	gate: GateName
	status: "passed" | "failed"
	output: string
}

function truncateTail(raw: string, limit: number): string {
	if (raw.length <= limit) {
		return raw
	}
	return `[truncated]\n${raw.slice(-limit)}`
}

async function runGate(
	sandbox: Sandbox,
	gate: GateName,
	command: string,
	args: string[]
): Promise<GateResult> {
	logger.info("running quality gate", { gate, command, args })

	const cmdResult = await errors.try(sandbox.runCommand(command, args))
	if (cmdResult.error) {
		logger.error("gate command dispatch failed", { error: cmdResult.error, gate })
		throw errors.wrap(cmdResult.error, `quality gate '${gate}'`)
	}

	const cmd = cmdResult.data

	const stdoutResult = await errors.try(cmd.stdout())
	if (stdoutResult.error) {
		logger.error("gate stdout failed", { error: stdoutResult.error, gate })
		throw errors.wrap(stdoutResult.error, `quality gate '${gate}' stdout`)
	}

	const stderrResult = await errors.try(cmd.stderr())
	if (stderrResult.error) {
		logger.error("gate stderr failed", { error: stderrResult.error, gate })
		throw errors.wrap(stderrResult.error, `quality gate '${gate}' stderr`)
	}

	const combined = [stdoutResult.data, stderrResult.data].filter(Boolean).join("\n")
	const output = truncateTail(combined, MAX_OUTPUT_LENGTH)
	const status = cmd.exitCode === 0 ? "passed" : "failed"

	logger.info("quality gate complete", {
		gate,
		status,
		exitCode: cmd.exitCode,
		outputLength: combined.length
	})

	return { gate, status, output }
}

async function runTypecheck(sandbox: Sandbox): Promise<GateResult> {
	return runGate(sandbox, "typecheck", "bun", ["typecheck"])
}

async function runTests(sandbox: Sandbox): Promise<GateResult> {
	return runGate(sandbox, "test", "bun", ["test"])
}

async function runLint(sandbox: Sandbox): Promise<GateResult> {
	return runGate(sandbox, "lint", "bun", ["lint"])
}

async function runBuild(sandbox: Sandbox): Promise<GateResult> {
	return runGate(sandbox, "build", "bun", ["build"])
}

const GATE_ORDER: ReadonlyArray<(sandbox: Sandbox) => Promise<GateResult>> = [
	runTypecheck,
	runTests,
	runLint,
	runBuild
]

async function runAllGates(sandbox: Sandbox): Promise<GateResult[]> {
	logger.info("running all quality gates")

	const results: GateResult[] = []

	for (const gate of GATE_ORDER) {
		const result = await gate(sandbox)
		results.push(result)

		if (result.status === "failed") {
			logger.warn("quality gate failed, stopping", { gate: result.gate, output: result.output })
			break
		}
	}

	const passed = results.every(function checkPassed(r) {
		return r.status === "passed"
	})
	logger.info("all quality gates complete", {
		total: results.length,
		passed,
		gates: results.map(function summarize(r) {
			return `${r.gate}:${r.status}`
		})
	})

	return results
}

export {
	GATE_ORDER,
	MAX_OUTPUT_LENGTH,
	runAllGates,
	runBuild,
	runGate,
	runLint,
	runTests,
	runTypecheck,
	truncateTail
}

export type { GateName, GateResult }
