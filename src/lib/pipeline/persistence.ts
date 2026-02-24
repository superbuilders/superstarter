import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq, sql } from "drizzle-orm"
import type { db as dbClient } from "@/db"
import {
	agentInvocations,
	ctaEvents,
	featureRuns,
	phaseResults,
	sandboxes
} from "@/db/schemas/agent"

type Db = typeof dbClient

// ---------------------------------------------------------------------------
// Feature Runs
// ---------------------------------------------------------------------------

type CreateFeatureRunData = {
	id: string
	prompt: string
	sandboxId: string
	githubRepoUrl: string
	githubBranch: string
	currentPhase:
		| "analysis"
		| "approaches"
		| "judging"
		| "implementation"
		| "pr"
		| "completed"
		| "failed"
}

async function createFeatureRun(db: Db, data: CreateFeatureRunData): Promise<{ id: string }> {
	logger.info("creating feature run", { id: data.id })

	const result = await errors.try(
		db
			.insert(featureRuns)
			.values({
				id: data.id,
				prompt: data.prompt,
				sandboxId: data.sandboxId,
				githubRepoUrl: data.githubRepoUrl,
				githubBranch: data.githubBranch,
				currentPhase: data.currentPhase,
				memories: [],
				createdAt: new Date()
			})
			.onConflictDoNothing()
			.returning({ id: featureRuns.id })
	)
	if (result.error) {
		logger.error("creating feature run failed", { error: result.error })
		throw errors.wrap(result.error, "create feature run")
	}

	return { id: data.id }
}

async function updateFeatureRunPhase(
	db: Db,
	runId: string,
	phase: "analysis" | "approaches" | "judging" | "implementation" | "pr" | "completed" | "failed"
): Promise<void> {
	logger.info("updating feature run phase", { runId, phase })

	const result = await errors.try(
		db.update(featureRuns).set({ currentPhase: phase }).where(eq(featureRuns.id, runId))
	)
	if (result.error) {
		logger.error("updating feature run phase failed", { error: result.error })
		throw errors.wrap(result.error, "update feature run phase")
	}
}

async function updateFeatureRunMemories(db: Db, runId: string, memories: unknown[]): Promise<void> {
	logger.info("appending feature run memories", { runId, count: memories.length })

	const result = await errors.try(
		db
			.update(featureRuns)
			.set({
				memories: sql`${featureRuns.memories} || ${JSON.stringify(memories)}::jsonb`
			})
			.where(eq(featureRuns.id, runId))
	)
	if (result.error) {
		logger.error("appending feature run memories failed", { error: result.error })
		throw errors.wrap(result.error, "update feature run memories")
	}
}

async function completeFeatureRun(db: Db, runId: string): Promise<void> {
	logger.info("completing feature run", { runId })

	const result = await errors.try(
		db
			.update(featureRuns)
			.set({ currentPhase: "completed", completedAt: new Date() })
			.where(eq(featureRuns.id, runId))
	)
	if (result.error) {
		logger.error("completing feature run failed", { error: result.error })
		throw errors.wrap(result.error, "complete feature run")
	}
}

async function failFeatureRun(db: Db, runId: string): Promise<void> {
	logger.info("failing feature run", { runId })

	const result = await errors.try(
		db
			.update(featureRuns)
			.set({ currentPhase: "failed", completedAt: new Date() })
			.where(eq(featureRuns.id, runId))
	)
	if (result.error) {
		logger.error("failing feature run failed", { error: result.error })
		throw errors.wrap(result.error, "fail feature run")
	}
}

// ---------------------------------------------------------------------------
// Sandboxes
// ---------------------------------------------------------------------------

type CreateSandboxData = {
	id: string
	status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting"
	runtime: string
	memory: number
	vcpus: number
	region: string
	cwd: string
	timeout: number
	networkPolicy?: unknown
	interactivePort?: number
	routes?: unknown
	sourceSnapshotId?: string
	sourceType?: "git" | "tarball" | "snapshot" | "empty"
	sourceUrl?: string
	sourceRevision?: string
	sourceDepth?: number
	requestedAt?: Date
	createdAt?: Date
	startedAt?: Date
}

async function createSandboxRecord(db: Db, data: CreateSandboxData): Promise<void> {
	logger.info("creating sandbox record", { id: data.id })

	const result = await errors.try(
		db
			.insert(sandboxes)
			.values({
				id: data.id,
				status: data.status,
				runtime: data.runtime,
				memory: data.memory,
				vcpus: data.vcpus,
				region: data.region,
				cwd: data.cwd,
				timeout: data.timeout,
				networkPolicy: data.networkPolicy,
				interactivePort: data.interactivePort,
				routes: data.routes,
				sourceSnapshotId: data.sourceSnapshotId,
				sourceType: data.sourceType,
				sourceUrl: data.sourceUrl,
				sourceRevision: data.sourceRevision,
				sourceDepth: data.sourceDepth,
				requestedAt: data.requestedAt,
				createdAt: data.createdAt,
				startedAt: data.startedAt
			})
			.onConflictDoNothing()
	)
	if (result.error) {
		logger.error("creating sandbox record failed", { error: result.error })
		throw errors.wrap(result.error, "create sandbox record")
	}
}

async function updateSandboxStatus(
	db: Db,
	sandboxId: string,
	status: "pending" | "running" | "stopping" | "stopped" | "failed" | "aborted" | "snapshotting"
): Promise<void> {
	logger.info("updating sandbox status", { sandboxId, status })

	const result = await errors.try(
		db.update(sandboxes).set({ status }).where(eq(sandboxes.id, sandboxId))
	)
	if (result.error) {
		logger.error("updating sandbox status failed", { error: result.error })
		throw errors.wrap(result.error, "update sandbox status")
	}
}

// ---------------------------------------------------------------------------
// Phase Results
// ---------------------------------------------------------------------------

type CreatePhaseResultData = {
	id: string
	runId: string
	phase: "analysis" | "approaches" | "judging" | "implementation" | "pr" | "completed" | "failed"
}

async function createPhaseResult(db: Db, data: CreatePhaseResultData): Promise<{ id: string }> {
	logger.info("creating phase result", { id: data.id, runId: data.runId, phase: data.phase })

	const result = await errors.try(
		db
			.insert(phaseResults)
			.values({
				id: data.id,
				runId: data.runId,
				phase: data.phase,
				status: "running",
				startedAt: new Date()
			})
			.onConflictDoNothing()
			.returning({ id: phaseResults.id })
	)
	if (result.error) {
		logger.error("creating phase result failed", { error: result.error })
		throw errors.wrap(result.error, "create phase result")
	}

	return { id: data.id }
}

async function passPhaseResult(db: Db, phaseResultId: string, output: unknown): Promise<void> {
	logger.info("passing phase result", { phaseResultId })

	const result = await errors.try(
		db
			.update(phaseResults)
			.set({ status: "passed", output, completedAt: new Date() })
			.where(eq(phaseResults.id, phaseResultId))
	)
	if (result.error) {
		logger.error("passing phase result failed", { error: result.error })
		throw errors.wrap(result.error, "pass phase result")
	}
}

async function failPhaseResult(db: Db, phaseResultId: string): Promise<void> {
	logger.info("failing phase result", { phaseResultId })

	const result = await errors.try(
		db
			.update(phaseResults)
			.set({ status: "failed", completedAt: new Date() })
			.where(eq(phaseResults.id, phaseResultId))
	)
	if (result.error) {
		logger.error("failing phase result failed", { error: result.error })
		throw errors.wrap(result.error, "fail phase result")
	}
}

// ---------------------------------------------------------------------------
// Agent Invocations
// ---------------------------------------------------------------------------

type CreateAgentInvocationData = {
	id: string
	phaseResultId: string
	parentInvocationId?: string
	agentType: string
	modelId: string
	systemPrompt: string
	inputMessages: unknown
}

async function createAgentInvocation(
	db: Db,
	data: CreateAgentInvocationData
): Promise<{ id: string }> {
	logger.info("creating agent invocation", {
		id: data.id,
		phaseResultId: data.phaseResultId,
		agentType: data.agentType
	})

	const result = await errors.try(
		db
			.insert(agentInvocations)
			.values({
				id: data.id,
				phaseResultId: data.phaseResultId,
				parentInvocationId: data.parentInvocationId,
				agentType: data.agentType,
				modelId: data.modelId,
				systemPrompt: data.systemPrompt,
				inputMessages: data.inputMessages,
				startedAt: new Date()
			})
			.onConflictDoNothing()
			.returning({ id: agentInvocations.id })
	)
	if (result.error) {
		logger.error("creating agent invocation failed", { error: result.error })
		throw errors.wrap(result.error, "create agent invocation")
	}

	return { id: data.id }
}

type CompleteAgentInvocationData = {
	finishReason: string
	outputText?: string
	inputTokens?: number
	outputTokens?: number
	totalTokens?: number
	steps?: unknown
	toolCalls?: unknown
	rawResponse?: unknown
}

async function completeAgentInvocation(
	db: Db,
	invocationId: string,
	data: CompleteAgentInvocationData
): Promise<void> {
	logger.info("completing agent invocation", { invocationId, finishReason: data.finishReason })

	const result = await errors.try(
		db
			.update(agentInvocations)
			.set({
				finishReason: data.finishReason,
				outputText: data.outputText,
				inputTokens: data.inputTokens,
				outputTokens: data.outputTokens,
				totalTokens: data.totalTokens,
				steps: data.steps,
				toolCalls: data.toolCalls,
				rawResponse: data.rawResponse,
				completedAt: new Date()
			})
			.where(eq(agentInvocations.id, invocationId))
	)
	if (result.error) {
		logger.error("completing agent invocation failed", { error: result.error })
		throw errors.wrap(result.error, "complete agent invocation")
	}
}

// ---------------------------------------------------------------------------
// CTA Events
// ---------------------------------------------------------------------------

type CreateCtaEventData = {
	id: string
	runId: string
	phaseResultId: string
	invocationId?: string
	toolCallId?: string
	kind: "approval" | "text" | "choice"
	requestMessage?: string
	requestPrompt?: string
	requestPlaceholder?: string
	requestOptions?: unknown
}

async function createCtaEvent(db: Db, data: CreateCtaEventData): Promise<void> {
	logger.info("creating cta event", { id: data.id, runId: data.runId, kind: data.kind })

	const result = await errors.try(
		db
			.insert(ctaEvents)
			.values({
				id: data.id,
				runId: data.runId,
				phaseResultId: data.phaseResultId,
				invocationId: data.invocationId,
				toolCallId: data.toolCallId,
				kind: data.kind,
				requestMessage: data.requestMessage,
				requestPrompt: data.requestPrompt,
				requestPlaceholder: data.requestPlaceholder,
				requestOptions: data.requestOptions,
				requestedAt: new Date()
			})
			.onConflictDoNothing()
	)
	if (result.error) {
		logger.error("creating cta event failed", { error: result.error })
		throw errors.wrap(result.error, "create cta event")
	}
}

type CompleteCtaResponseData = {
	responseApproved?: boolean
	responseReason?: string
	responseText?: string
	responseSelectedId?: string
}

async function completeCtaEvent(
	db: Db,
	ctaId: string,
	responseData: CompleteCtaResponseData
): Promise<void> {
	logger.info("completing cta event", { ctaId })

	const result = await errors.try(
		db
			.update(ctaEvents)
			.set({
				responseApproved: responseData.responseApproved,
				responseReason: responseData.responseReason,
				responseText: responseData.responseText,
				responseSelectedId: responseData.responseSelectedId,
				respondedAt: new Date()
			})
			.where(eq(ctaEvents.id, ctaId))
	)
	if (result.error) {
		logger.error("completing cta event failed", { error: result.error })
		throw errors.wrap(result.error, "complete cta event")
	}
}

async function timeoutCtaEvent(db: Db, ctaId: string): Promise<void> {
	logger.info("timing out cta event", { ctaId })

	const result = await errors.try(
		db
			.update(ctaEvents)
			.set({ timedOut: true, respondedAt: new Date() })
			.where(eq(ctaEvents.id, ctaId))
	)
	if (result.error) {
		logger.error("timing out cta event failed", { error: result.error })
		throw errors.wrap(result.error, "timeout cta event")
	}
}

export {
	completeAgentInvocation,
	completeCtaEvent,
	completeFeatureRun,
	createAgentInvocation,
	createCtaEvent,
	createFeatureRun,
	createPhaseResult,
	createSandboxRecord,
	failFeatureRun,
	failPhaseResult,
	passPhaseResult,
	timeoutCtaEvent,
	updateFeatureRunMemories,
	updateFeatureRunPhase,
	updateSandboxStatus
}

export type {
	CompleteAgentInvocationData,
	CompleteCtaResponseData,
	CreateAgentInvocationData,
	CreateCtaEventData,
	CreateFeatureRunData,
	CreatePhaseResultData,
	CreateSandboxData
}
