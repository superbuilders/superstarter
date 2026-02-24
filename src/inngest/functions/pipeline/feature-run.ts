import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { featureRuns } from "@/db/schemas/agent"
import { inngest } from "@/inngest"
import type { AnalysisOutput } from "@/inngest/functions/pipeline/analysis"
import { analysisFunction } from "@/inngest/functions/pipeline/analysis"
import type { ApproachesOutput } from "@/inngest/functions/pipeline/approaches"
import { ApproachesOutputSchema, approachesFunction } from "@/inngest/functions/pipeline/approaches"
import type { ImplementationOutput } from "@/inngest/functions/pipeline/implementation"
import {
	ImplementationOutputSchema,
	implementationFunction
} from "@/inngest/functions/pipeline/implementation"
import { judgingFunction } from "@/inngest/functions/pipeline/judging"
import { createFunction as sandboxCreateFunction } from "@/inngest/functions/sandbox/create"
import { stopFunction as sandboxStopFunction } from "@/inngest/functions/sandbox/stop"
import { CtaResponseEventSchema } from "@/lib/agent/cta"
import {
	completeFeatureRun,
	createFeatureRun,
	createPhaseResult,
	createSandboxRecord,
	failFeatureRun,
	failPhaseResult,
	passPhaseResult,
	updateFeatureRunPhase
} from "@/lib/pipeline/persistence"
import { createPR } from "@/lib/pipeline/pr-creation"

const CTA_TIMEOUT = "30d" as const

type InngestStep = Parameters<Parameters<typeof inngest.createFunction>[2]>[0]["step"]
type InngestLogger = Parameters<Parameters<typeof inngest.createFunction>[2]>[0]["logger"]

type Memory = { phase: string; kind: string; content: string }

const MemoryArraySchema = z.array(
	z.object({
		phase: z.string(),
		kind: z.string(),
		content: z.string()
	})
)

async function readMemoriesFromDb(
	runId: string,
	stepName: string,
	step: InngestStep,
	logger: InngestLogger
): Promise<Memory[]> {
	logger.debug("reading memories", { runId, stepName })
	return step.run(stepName, async function readMemoriesStep() {
		const result = await errors.try(
			db
				.select({ memories: featureRuns.memories })
				.from(featureRuns)
				.where(eq(featureRuns.id, runId))
				.limit(1)
		)
		if (result.error) {
			logger.error("reading memories failed", { error: result.error, runId })
			throw errors.wrap(result.error, "read feature run memories")
		}

		const row = result.data[0]
		if (!row) {
			return []
		}

		const parsed = MemoryArraySchema.safeParse(row.memories)
		if (!parsed.success) {
			return []
		}

		return parsed.data
	})
}

async function emitCtaAndWait(
	ctaId: string,
	ctaData: Record<string, unknown>,
	stepPrefix: string,
	step: InngestStep,
	logger: InngestLogger
): Promise<z.infer<typeof CtaResponseEventSchema> | null> {
	await step.sendEvent(`cta-emit-${stepPrefix}`, {
		name: "paul/cta/request" as const,
		data: ctaData
	})

	logger.info("cta emitted, suspending", { ctaId, stepPrefix })

	const ctaResponse = await step.waitForEvent(`cta-wait-${stepPrefix}`, {
		event: "paul/cta/response",
		if: `async.data.ctaId == "${ctaId}"`,
		timeout: CTA_TIMEOUT
	})

	if (!ctaResponse) {
		logger.warn("cta timeout", { ctaId, stepPrefix })
		return null
	}

	logger.info("cta response received", { ctaId, kind: ctaResponse.data.kind })

	const validated = CtaResponseEventSchema.safeParse(ctaResponse.data)
	if (!validated.success) {
		logger.error("cta response validation failed", { error: validated.error })
		throw errors.new("cta response validation failed")
	}

	return validated.data
}

async function handleCtaTimeout(
	runId: string,
	sandboxId: string,
	phaseResultId: string,
	step: InngestStep,
	logger: InngestLogger
): Promise<{ status: "failed"; reason: string }> {
	logger.warn("cta timed out, failing run", { runId })

	await step.run("fail-phase-timeout", async function failPhaseTimeout() {
		await failPhaseResult(db, phaseResultId)
	})

	await step.run("fail-run-timeout", async function failRunTimeout() {
		await failFeatureRun(db, runId)
	})

	await step.invoke("stop-sandbox-timeout", {
		function: sandboxStopFunction,
		data: { sandboxId }
	})

	return { status: "failed" as const, reason: "cta_timeout" }
}

async function handlePhaseFailure(
	runId: string,
	sandboxId: string,
	phaseResultId: string,
	failedPhase: string,
	step: InngestStep,
	logger: InngestLogger
): Promise<{ status: "failed"; failedPhase: string }> {
	logger.error("phase failed, failing run", { runId, failedPhase })

	await step.run("fail-phase-result", async function failPhaseStep() {
		await failPhaseResult(db, phaseResultId)
	})

	await step.run("fail-run", async function failRunStep() {
		await failFeatureRun(db, runId)
	})

	await step.invoke("stop-sandbox-failure", {
		function: sandboxStopFunction,
		data: { sandboxId }
	})

	return { status: "failed" as const, failedPhase }
}

function validateApproachesOutput(raw: unknown, logger: InngestLogger): ApproachesOutput {
	const result = ApproachesOutputSchema.safeParse(raw)
	if (!result.success) {
		logger.error("approaches invoke result validation failed", { error: result.error })
		throw errors.wrap(result.error, "approaches invoke result validation")
	}
	return result.data
}

function validateImplementationOutput(raw: unknown, logger: InngestLogger): ImplementationOutput {
	const result = ImplementationOutputSchema.safeParse(raw)
	if (!result.success) {
		logger.error("implementation invoke result validation failed", { error: result.error })
		throw errors.wrap(result.error, "implementation invoke result validation")
	}
	return result.data
}

async function selectApproach(ctx: {
	approachesOutput: ApproachesOutput
	approachesPhaseResultId: string
	runId: string
	sandboxId: string
	step: InngestStep
	logger: InngestLogger
}): Promise<
	{ ok: true; selected: unknown } | { ok: false; failure: { status: "failed"; reason: string } }
> {
	const { approachesOutput, approachesPhaseResultId, runId, sandboxId, step, logger } = ctx
	const ctaId = crypto.randomUUID()
	const approachCount = approachesOutput.approaches.length

	if (approachCount < 2) {
		const approvalResponse = await emitCtaAndWait(
			ctaId,
			{
				ctaId,
				runId,
				kind: "approval" as const,
				message: "Proceed with the single approach?"
			},
			"after-approaches",
			step,
			logger
		)

		if (!approvalResponse) {
			const failure = await handleCtaTimeout(
				runId,
				sandboxId,
				approachesPhaseResultId,
				step,
				logger
			)
			return { ok: false, failure }
		}

		return { ok: true, selected: approachesOutput.approaches[0] }
	}

	const choiceOptions = approachesOutput.approaches.map(function buildOption(a) {
		return { id: a.id, label: a.title }
	})

	const choiceResponse = await emitCtaAndWait(
		ctaId,
		{
			ctaId,
			runId,
			kind: "choice" as const,
			prompt: "Which approach should I pursue?",
			options: choiceOptions
		},
		"after-approaches",
		step,
		logger
	)

	if (!choiceResponse) {
		const failure = await handleCtaTimeout(runId, sandboxId, approachesPhaseResultId, step, logger)
		return { ok: false, failure }
	}

	if (choiceResponse.kind !== "choice") {
		logger.error("unexpected cta response kind for approach selection", {
			expected: "choice",
			actual: choiceResponse.kind
		})
		throw errors.new("unexpected cta response kind for approach selection")
	}

	const selectedId = choiceResponse.selectedId
	const found = approachesOutput.approaches.find(function matchApproach(a) {
		return a.id === selectedId
	})

	if (!found) {
		logger.error("selected approach not found", {
			selectedId,
			availableIds: approachesOutput.approaches.map(function getId(a) {
				return a.id
			})
		})
		throw errors.new("selected approach not found in approaches output")
	}

	return { ok: true, selected: found }
}

const featureRunFunction = inngest.createFunction(
	{ id: "paul/pipeline/feature-run" },
	{ event: "paul/pipeline/feature-run" },
	async ({ event, logger, step }) => {
		const { prompt, githubRepoUrl, githubBranch, runtime } = event.data
		const runId = crypto.randomUUID()

		logger.info("starting feature run", { runId, githubRepoUrl, githubBranch, runtime })

		// -----------------------------------------------------------------------
		// 1. Create sandbox
		// -----------------------------------------------------------------------

		const sandboxResult = await step.invoke("create-sandbox", {
			function: sandboxCreateFunction,
			data: {
				runtime,
				github: {
					repoUrl: githubRepoUrl,
					branch: githubBranch
				}
			}
		})

		const sandboxId = sandboxResult.sandboxId

		logger.info("sandbox created", { runId, sandboxId })

		// -----------------------------------------------------------------------
		// 2. Persist sandbox + feature run records
		// -----------------------------------------------------------------------

		await step.run("persist-sandbox-record", async function persistSandbox() {
			await createSandboxRecord(db, {
				id: sandboxId,
				status: "running",
				runtime,
				memory: 512,
				vcpus: 2,
				region: "us-east-1",
				cwd: "/home/user",
				timeout: 300
			})
		})

		await step.run("create-feature-run", async function createRun() {
			await createFeatureRun(db, {
				id: runId,
				prompt,
				sandboxId,
				githubRepoUrl,
				githubBranch,
				currentPhase: "analysis"
			})
		})

		// -----------------------------------------------------------------------
		// 3. Analysis phase
		// -----------------------------------------------------------------------

		const analysisPhaseResultId = crypto.randomUUID()

		await step.run("create-phase-analysis", async function createAnalysisPhase() {
			await createPhaseResult(db, { id: analysisPhaseResultId, runId, phase: "analysis" })
		})

		const analysisMemories = await readMemoriesFromDb(runId, "read-memories-analysis", step, logger)

		const analysisInvokeResult = await errors.try(
			step.invoke("invoke-analysis", {
				function: analysisFunction,
				data: { runId, sandboxId, prompt, githubRepoUrl, githubBranch, memories: analysisMemories }
			})
		)
		if (analysisInvokeResult.error) {
			logger.error("analysis phase failed", { error: analysisInvokeResult.error })
			return handlePhaseFailure(runId, sandboxId, analysisPhaseResultId, "analysis", step, logger)
		}

		const analysisOutput: AnalysisOutput = analysisInvokeResult.data

		await step.run("pass-phase-analysis", async function passAnalysis() {
			await passPhaseResult(db, analysisPhaseResultId, analysisOutput)
		})

		await step.run("advance-phase-analysis", async function advanceAnalysis() {
			await updateFeatureRunPhase(db, runId, "approaches")
		})

		const analysisCtaId = crypto.randomUUID()
		const analysisCtaResponse = await emitCtaAndWait(
			analysisCtaId,
			{
				ctaId: analysisCtaId,
				runId,
				kind: "approval" as const,
				message: "Analysis complete. Approve to proceed to approach generation?"
			},
			"after-analysis",
			step,
			logger
		)

		if (!analysisCtaResponse) {
			return handleCtaTimeout(runId, sandboxId, analysisPhaseResultId, step, logger)
		}

		// -----------------------------------------------------------------------
		// 4. Approaches phase
		// -----------------------------------------------------------------------

		const approachesPhaseResultId = crypto.randomUUID()

		await step.run("create-phase-approaches", async function createApproachesPhase() {
			await createPhaseResult(db, { id: approachesPhaseResultId, runId, phase: "approaches" })
		})

		const approachesMemories = await readMemoriesFromDb(
			runId,
			"read-memories-approaches",
			step,
			logger
		)

		const approachesInvokeResult = await errors.try(
			step.invoke("invoke-approaches", {
				function: approachesFunction,
				data: {
					runId,
					sandboxId,
					prompt,
					githubRepoUrl,
					githubBranch,
					memories: approachesMemories,
					analysisOutput
				}
			})
		)
		if (approachesInvokeResult.error) {
			logger.error("approaches phase failed", { error: approachesInvokeResult.error })
			return handlePhaseFailure(
				runId,
				sandboxId,
				approachesPhaseResultId,
				"approaches",
				step,
				logger
			)
		}

		const approachesOutput = validateApproachesOutput(approachesInvokeResult.data, logger)

		await step.run("pass-phase-approaches", async function passApproaches() {
			await passPhaseResult(db, approachesPhaseResultId, approachesOutput)
		})

		await step.run("advance-phase-approaches", async function advanceApproaches() {
			await updateFeatureRunPhase(db, runId, "judging")
		})

		const approachResult = await selectApproach({
			approachesOutput,
			approachesPhaseResultId,
			runId,
			sandboxId,
			step,
			logger
		})

		if (!approachResult.ok) {
			return approachResult.failure
		}

		const selectedApproach = approachResult.selected

		logger.info("approach selected", { runId })

		// -----------------------------------------------------------------------
		// 5. Judging phase
		// -----------------------------------------------------------------------

		const judgingPhaseResultId = crypto.randomUUID()

		await step.run("create-phase-judging", async function createJudgingPhase() {
			await createPhaseResult(db, { id: judgingPhaseResultId, runId, phase: "judging" })
		})

		const judgingMemories = await readMemoriesFromDb(runId, "read-memories-judging", step, logger)

		const judgingInvokeResult = await errors.try(
			step.invoke("invoke-judging", {
				function: judgingFunction,
				data: {
					runId,
					sandboxId,
					prompt,
					githubRepoUrl,
					githubBranch,
					memories: judgingMemories,
					selectedApproach,
					analysisOutput
				}
			})
		)
		if (judgingInvokeResult.error) {
			logger.error("judging phase failed", { error: judgingInvokeResult.error })
			return handlePhaseFailure(runId, sandboxId, judgingPhaseResultId, "judging", step, logger)
		}

		const judgingOutput = judgingInvokeResult.data

		await step.run("pass-phase-judging", async function passJudging() {
			await passPhaseResult(db, judgingPhaseResultId, judgingOutput)
		})

		await step.run("advance-phase-judging", async function advanceJudging() {
			await updateFeatureRunPhase(db, runId, "implementation")
		})

		const judgingCtaId = crypto.randomUUID()
		const judgingCtaResponse = await emitCtaAndWait(
			judgingCtaId,
			{
				ctaId: judgingCtaId,
				runId,
				kind: "approval" as const,
				message: "Approach passed review. Begin implementation?"
			},
			"after-judging",
			step,
			logger
		)

		if (!judgingCtaResponse) {
			return handleCtaTimeout(runId, sandboxId, judgingPhaseResultId, step, logger)
		}

		// -----------------------------------------------------------------------
		// 6. Implementation phase
		// -----------------------------------------------------------------------

		const implPhaseResultId = crypto.randomUUID()

		await step.run("create-phase-implementation", async function createImplPhase() {
			await createPhaseResult(db, { id: implPhaseResultId, runId, phase: "implementation" })
		})

		const implMemories = await readMemoriesFromDb(
			runId,
			"read-memories-implementation",
			step,
			logger
		)

		const implInvokeResult = await errors.try(
			step.invoke("invoke-implementation", {
				function: implementationFunction,
				data: {
					runId,
					sandboxId,
					prompt,
					githubRepoUrl,
					githubBranch,
					memories: implMemories,
					selectedApproach,
					analysisOutput,
					judgingOutput
				}
			})
		)
		if (implInvokeResult.error) {
			logger.error("implementation phase failed", { error: implInvokeResult.error })
			return handlePhaseFailure(runId, sandboxId, implPhaseResultId, "implementation", step, logger)
		}

		const implOutput = validateImplementationOutput(implInvokeResult.data, logger)

		await step.run("pass-phase-implementation", async function passImpl() {
			await passPhaseResult(db, implPhaseResultId, implOutput)
		})

		await step.run("advance-phase-implementation", async function advanceImpl() {
			await updateFeatureRunPhase(db, runId, "pr")
		})

		const implCtaId = crypto.randomUUID()
		const implCtaResponse = await emitCtaAndWait(
			implCtaId,
			{
				ctaId: implCtaId,
				runId,
				kind: "approval" as const,
				message: "Implementation complete, all gates pass. Create PR?"
			},
			"after-implementation",
			step,
			logger
		)

		if (!implCtaResponse) {
			return handleCtaTimeout(runId, sandboxId, implPhaseResultId, step, logger)
		}

		// -----------------------------------------------------------------------
		// 7. PR creation
		// -----------------------------------------------------------------------

		const prPhaseResultId = crypto.randomUUID()

		await step.run("create-phase-pr", async function createPrPhase() {
			await createPhaseResult(db, { id: prPhaseResultId, runId, phase: "pr" })
		})

		const prResult = await step.run("create-pr", async function createPrStep() {
			return createPR({
				branch: implOutput.branch,
				githubRepoUrl,
				prompt,
				analysisOutput,
				approachOutput: selectedApproach,
				implOutput
			})
		})

		await step.run("pass-phase-pr", async function passPr() {
			await passPhaseResult(db, prPhaseResultId, prResult)
		})

		await step.run("complete-run", async function completeRun() {
			await completeFeatureRun(db, runId)
		})

		// -----------------------------------------------------------------------
		// 8. Cleanup
		// -----------------------------------------------------------------------

		await step.invoke("stop-sandbox", {
			function: sandboxStopFunction,
			data: { sandboxId }
		})

		logger.info("feature run complete", { runId, prUrl: prResult.prUrl })

		return { status: "completed" as const, prUrl: prResult.prUrl }
	}
)

export { featureRunFunction }
