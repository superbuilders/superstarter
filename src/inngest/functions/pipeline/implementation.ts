import * as errors from "@superbuilders/errors"
import type { Sandbox } from "@vercel/sandbox"
import { z } from "zod"
import { inngest } from "@/inngest"
import { codeFunction } from "@/inngest/functions/agents/code"
import { formatMemoriesForPrompt } from "@/lib/agent/memory"
import { connectSandbox } from "@/lib/agent/sandbox"
import type { GateResult } from "@/lib/pipeline/quality-gates"
import { runAllGates } from "@/lib/pipeline/quality-gates"

const MAX_CODER_ATTEMPTS = 5

const FileChangeSchema = z.object({
	path: z.string(),
	changeType: z.enum(["added", "modified", "deleted"])
})

const ImplementationOutputSchema = z.object({
	branch: z.string(),
	filesChanged: z.array(FileChangeSchema),
	gateResults: z.array(
		z.object({
			gate: z.enum(["typecheck", "test", "lint", "build"]),
			status: z.enum(["passed", "failed"]),
			output: z.string()
		})
	),
	totalCoderAttempts: z.number(),
	conditionsAddressed: z.array(z.string())
})

type ImplementationOutput = z.infer<typeof ImplementationOutputSchema>
type FileChange = z.infer<typeof FileChangeSchema>

type SandboxLogger = {
	info: (msg: string, ctx?: Record<string, unknown>) => void
	error: (msg: string, ctx?: Record<string, unknown>) => void
}

function slugifyBranch(prompt: string): string {
	const slug = prompt
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.slice(0, 50)
		.replace(/-+$/, "")
	return `feat/${slug}`
}

async function runSandboxGit(
	sandbox: Sandbox,
	args: string[],
	logger: SandboxLogger
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const cmdResult = await errors.try(sandbox.runCommand("git", args))
	if (cmdResult.error) {
		logger.error("git command dispatch failed", { error: cmdResult.error, args })
		throw errors.wrap(cmdResult.error, `git ${args[0]}`)
	}

	const cmd = cmdResult.data

	const stdoutResult = await errors.try(cmd.stdout())
	if (stdoutResult.error) {
		logger.error("git stdout failed", { error: stdoutResult.error, args })
		throw errors.wrap(stdoutResult.error, `git ${args[0]} stdout`)
	}

	const stderrResult = await errors.try(cmd.stderr())
	if (stderrResult.error) {
		logger.error("git stderr failed", { error: stderrResult.error, args })
		throw errors.wrap(stderrResult.error, `git ${args[0]} stderr`)
	}

	logger.info("git command complete", {
		args,
		exitCode: cmd.exitCode,
		stdoutLength: stdoutResult.data.length
	})

	return {
		stdout: stdoutResult.data,
		stderr: stderrResult.data,
		exitCode: cmd.exitCode
	}
}

function parseGitDiffNameStatus(diffOutput: string): FileChange[] {
	const lines = diffOutput.trim().split("\n").filter(Boolean)

	return lines.map(function parseDiffLine(line) {
		const parts = line.split("\t")
		const statusChar = parts[0]
		const filePath = parts[1]

		if (!statusChar || !filePath) {
			return { path: line, changeType: "modified" as const }
		}

		let changeType: "added" | "modified" | "deleted"
		if (statusChar.startsWith("A")) {
			changeType = "added"
		} else if (statusChar.startsWith("D")) {
			changeType = "deleted"
		} else {
			changeType = "modified"
		}

		return { path: filePath, changeType }
	})
}

function buildCoderPrompt(ctx: {
	prompt: string
	selectedApproach: unknown
	analysisOutput: unknown
	judgingOutput: unknown
	memoriesPrompt: string
	attempt: number
	previousFilesTouched: string[]
	previousCoderSummary: string
	previousGateErrors: GateResult[]
}): string {
	const sections: string[] = [
		"## Feature Request",
		ctx.prompt,
		"",
		"## Selected Implementation Approach",
		JSON.stringify(ctx.selectedApproach, null, 2),
		"",
		"## Codebase Analysis",
		JSON.stringify(ctx.analysisOutput, null, 2)
	]

	if (ctx.judgingOutput) {
		sections.push("", "## Judging Conditions", JSON.stringify(ctx.judgingOutput, null, 2))
	}

	if (ctx.memoriesPrompt.length > 0) {
		sections.push("", ctx.memoriesPrompt)
	}

	if (ctx.attempt > 0) {
		const attemptLabel = `## RETRY CONTEXT (Attempt #${String(ctx.attempt + 1)})`
		sections.push(
			"",
			attemptLabel,
			"The previous coder attempt FAILED quality gates. You must fix the issues.",
			""
		)

		if (ctx.previousFilesTouched.length > 0) {
			const fileList = ctx.previousFilesTouched
				.map(function formatFile(f) {
					return `- ${f}`
				})
				.join("\n")
			sections.push("### Files Touched by Previous Attempt", fileList, "")
		}

		if (ctx.previousCoderSummary.length > 0) {
			sections.push("### Previous Coder Summary", ctx.previousCoderSummary, "")
		}

		const failedGates = ctx.previousGateErrors.filter(function isFailed(g) {
			return g.status === "failed"
		})
		if (failedGates.length > 0) {
			sections.push("### Gate Errors")
			for (const gate of failedGates) {
				sections.push(`#### ${gate.gate} (FAILED)`, "```", gate.output, "```", "")
			}
		}

		sections.push(
			"### Instructions",
			"- Do NOT repeat the patterns that caused previous failures.",
			"- Focus on fixing the specific gate errors shown above.",
			"- Implement the full feature correctly this time."
		)
	}

	return sections.join("\n")
}

const JudgingConditionsSchema = z.object({
	conditions: z.array(z.union([z.string(), z.object({ description: z.string() }), z.unknown()]))
})

function extractConditionsAddressed(judgingOutput: unknown): string[] {
	const parsed = JudgingConditionsSchema.safeParse(judgingOutput)
	if (!parsed.success) {
		return []
	}

	return parsed.data.conditions.map(function stringify(c) {
		if (typeof c === "string") {
			return c
		}
		if (typeof c === "object" && c !== null && "description" in c) {
			const desc = c.description
			if (typeof desc === "string") {
				return desc
			}
		}
		return JSON.stringify(c)
	})
}

const implementationFunction = inngest.createFunction(
	{ id: "paul/pipeline/implementation" },
	{ event: "paul/pipeline/implementation" },
	async ({ event, logger, step }) => {
		const {
			runId,
			sandboxId,
			prompt,
			githubRepoUrl,
			githubBranch,
			memories,
			selectedApproach,
			analysisOutput,
			judgingOutput
		} = event.data

		logger.info("starting implementation phase", { runId, sandboxId })

		const sandbox = await connectSandbox(sandboxId, logger)

		const branchName = slugifyBranch(prompt)
		const memoriesPrompt = formatMemoriesForPrompt(memories)
		const github = { repoUrl: githubRepoUrl, branch: githubBranch }
		const conditionsAddressed = extractConditionsAddressed(judgingOutput)

		await step.run("create-feature-branch", async () => {
			await runSandboxGit(sandbox, ["checkout", "-B", branchName], logger)
		})

		let lastGateResults: GateResult[] = []
		let previousFilesTouched: string[] = []
		let previousCoderSummary = ""
		let allGatesPassed = false
		let totalCoderAttempts = 0

		for (let attempt = 0; attempt < MAX_CODER_ATTEMPTS; attempt++) {
			totalCoderAttempts++

			if (attempt > 0) {
				await step.run(`reset-branch-${attempt}`, async () => {
					logger.info("resetting branch for retry", { attempt, branchName })
					await runSandboxGit(sandbox, ["checkout", "-B", branchName, githubBranch], logger)
				})
			}

			const coderPrompt = buildCoderPrompt({
				prompt,
				selectedApproach,
				analysisOutput,
				judgingOutput,
				memoriesPrompt,
				attempt,
				previousFilesTouched,
				previousCoderSummary,
				previousGateErrors: lastGateResults
			})

			const coderResult = await step.invoke(`coder-attempt-${attempt}`, {
				function: codeFunction,
				data: {
					prompt: coderPrompt,
					sandboxId,
					github
				}
			})

			logger.info("coder attempt complete", {
				attempt,
				stepCount: coderResult.stepCount,
				textLength: coderResult.text.length
			})

			previousCoderSummary = coderResult.text

			const filesTouchedResult = await step.run(`diff-files-${attempt}`, async () => {
				const diffResult = await runSandboxGit(
					sandbox,
					["diff", "--name-only", githubBranch],
					logger
				)
				return diffResult.stdout.trim().split("\n").filter(Boolean)
			})
			previousFilesTouched = filesTouchedResult

			const gateResults = await step.run(`quality-gates-${attempt}`, async () => {
				return runAllGates(sandbox)
			})

			lastGateResults = gateResults

			const passed = gateResults.every(function checkPassed(g) {
				return g.status === "passed"
			})

			logger.info("quality gates result", {
				attempt,
				passed,
				gates: gateResults.map(function summarize(g) {
					return `${g.gate}:${g.status}`
				})
			})

			if (passed) {
				allGatesPassed = true
				break
			}

			logger.warn("quality gates failed, will retry", {
				attempt,
				remainingAttempts: MAX_CODER_ATTEMPTS - attempt - 1,
				failedGates: gateResults
					.filter(function isFailed(g) {
						return g.status === "failed"
					})
					.map(function getName(g) {
						return g.gate
					})
			})
		}

		const filesChanged = await step.run("detect-changed-files", async () => {
			const diffResult = await runSandboxGit(
				sandbox,
				["diff", "--name-status", githubBranch],
				logger
			)
			return parseGitDiffNameStatus(diffResult.stdout)
		})

		const output: ImplementationOutput = {
			branch: branchName,
			filesChanged,
			gateResults: lastGateResults,
			totalCoderAttempts,
			conditionsAddressed
		}

		if (!allGatesPassed) {
			logger.error("implementation phase failed after max attempts", {
				runId,
				totalCoderAttempts,
				lastGateResults: lastGateResults.map(function summarize(g) {
					return `${g.gate}:${g.status}`
				})
			})
		}

		logger.info("implementation phase complete", {
			runId,
			branch: branchName,
			filesChanged: filesChanged.length,
			allGatesPassed,
			totalCoderAttempts
		})

		return output
	}
)

export { implementationFunction, ImplementationOutputSchema, MAX_CODER_ATTEMPTS }
export type { FileChange, ImplementationOutput }
