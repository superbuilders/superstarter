// Step bodies for masteryRecomputeWorkflow.
//
// Lives separately from the workflow file because the `@workflow/next`
// plugin's node-module guard rejects any reachable Node.js dependency
// (pino via `@/logger`) on a workflow file's import graph. Step files
// run outside the workflow VM, so they are allowed Node.js modules.
// All `logger.*` calls and the `errors.new()` sentinels live here; the
// workflow file imports only the step functions and contains no
// pino-reachable edges.
//
// One step that did not exist in the pre-split file is
// `logRecomputeLoopStartingStep` — the original workflow function
// emitted a `logger.info` directly between the metadata-load and the
// per-sub-type loop. That call is preserved verbatim, just hoisted into
// a step so the workflow file no longer needs the logger import.

import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { type SubTypeId, subTypeIds } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import type { MasterySource } from "@/server/mastery/compute"
import { recomputeForUser } from "@/server/mastery/recompute"

const ErrSessionRowMissing = errors.new("session row missing during recompute workflow")
const ErrUnknownSubTypeId = errors.new("sub_type_id not in v1 SubTypeId union")

interface SessionMetadata {
	userId: string
	source: MasterySource
}

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)

function asSubTypeId(s: string): SubTypeId {
	if (!subTypeIdSet.has(s)) {
		logger.error({ subTypeId: s }, "masteryRecomputeWorkflow: unknown sub_type_id")
		throw errors.wrap(ErrUnknownSubTypeId, `value '${s}'`)
	}
	const matched = subTypeIds.find(function eq(known) {
		return known === s
	})
	if (!matched) {
		logger.error({ subTypeId: s }, "masteryRecomputeWorkflow: post-guard miss (impossible)")
		throw errors.wrap(ErrUnknownSubTypeId, `post-guard miss for '${s}'`)
	}
	return matched
}

async function loadSessionMetadataStep(sessionId: string): Promise<SessionMetadata> {
	"use step"
	const tStepStart = Date.now()
	logger.info({ stepName: "loadSessionMetadata", sessionId }, "step:start")
	const result = await errors.try(
		db
			.select({ userId: practiceSessions.userId, type: practiceSessions.type })
			.from(practiceSessions)
			.where(eq(practiceSessions.id, sessionId))
			.limit(1)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, sessionId },
			"masteryRecomputeWorkflow: session metadata read failed"
		)
		throw errors.wrap(result.error, "loadSessionMetadata")
	}
	const row = result.data[0]
	if (!row) {
		logger.error({ sessionId }, "masteryRecomputeWorkflow: session row missing")
		throw errors.wrap(ErrSessionRowMissing, `session id '${sessionId}'`)
	}
	let source: MasterySource = "ongoing"
	if (row.type === "diagnostic") source = "diagnostic"
	logger.info(
		{
			stepName: "loadSessionMetadata",
			sessionId,
			durationMs: Date.now() - tStepStart
		},
		"step:complete"
	)
	return { userId: row.userId, source }
}

async function listDistinctSubTypesStep(sessionId: string): Promise<SubTypeId[]> {
	"use step"
	const tStepStart = Date.now()
	logger.info({ stepName: "listDistinctSubTypes", sessionId }, "step:start")
	const result = await errors.try(
		db
			.selectDistinct({ subTypeId: items.subTypeId })
			.from(attempts)
			.innerJoin(items, eq(attempts.itemId, items.id))
			.where(eq(attempts.sessionId, sessionId))
	)
	if (result.error) {
		logger.error(
			{ error: result.error, sessionId },
			"masteryRecomputeWorkflow: distinct sub-type query failed"
		)
		throw errors.wrap(result.error, "listDistinctSubTypes")
	}
	const out: SubTypeId[] = []
	for (const row of result.data) {
		out.push(asSubTypeId(row.subTypeId))
	}
	logger.info(
		{
			stepName: "listDistinctSubTypes",
			sessionId,
			subTypeCount: out.length,
			durationMs: Date.now() - tStepStart
		},
		"step:complete"
	)
	return out
}

async function logRecomputeLoopStartingStep(input: {
	sessionId: string
	subTypeCount: number
	source: MasterySource
}): Promise<void> {
	"use step"
	const tStepStart = Date.now()
	logger.info(
		{
			stepName: "logRecomputeLoopStarting",
			sessionId: input.sessionId,
			subTypeCount: input.subTypeCount
		},
		"step:start"
	)
	logger.info(
		{ sessionId: input.sessionId, subTypeCount: input.subTypeCount },
		"recompute:loop:starting"
	)
	logger.info(
		{
			sessionId: input.sessionId,
			subTypeCount: input.subTypeCount,
			source: input.source
		},
		"masteryRecomputeWorkflow: starting per-sub-type recompute loop"
	)
	logger.info(
		{
			stepName: "logRecomputeLoopStarting",
			sessionId: input.sessionId,
			durationMs: Date.now() - tStepStart
		},
		"step:complete"
	)
}

async function recomputeStep(
	userId: string,
	subTypeId: SubTypeId,
	source: MasterySource
): Promise<void> {
	"use step"
	const tStepStart = Date.now()
	logger.info({ stepName: "recompute", userId, subTypeId }, "step:start")
	const result = await errors.try(recomputeForUser(userId, subTypeId, source))
	if (result.error) {
		logger.error(
			{ error: result.error, userId, subTypeId, source },
			"masteryRecomputeWorkflow: recomputeForUser failed"
		)
		throw errors.wrap(result.error, "recomputeForUser")
	}
	logger.info(
		{
			stepName: "recompute",
			userId,
			subTypeId,
			durationMs: Date.now() - tStepStart
		},
		"step:complete"
	)
}

// C2 of end-session-perf round. Collapsed single step combining all 4
// previous step bodies inline. C1 measurement showed ~700ms overhead per
// Vercel Workflow step boundary; 4 steps + 14 recompute iterations meant
// 15 transitions × ~700ms = ~10s of pure transition overhead. Collapsing
// to 1 step eliminates 14 transitions. The 4 old step functions above
// remain exported (and unchanged) so this commit is a pure additive
// extension — revert is a one-line change in mastery-recompute.ts.
//
// Inner instrumentation is preserved: per-phase `phase:complete` markers
// substitute for the former per-step `step:complete` so the timing table
// still shows where time goes inside the collapsed step. The
// `recompute:user:*` logs inside recomputeForUser fire naturally per
// sub-type and remain the per-iteration visibility.
async function recomputeAllForSession(input: { sessionId: string }): Promise<void> {
	"use step"
	const tStepStart = Date.now()
	logger.info(
		{ stepName: "recomputeAllForSession", sessionId: input.sessionId },
		"step:start"
	)

	// Phase 1 — load session metadata (inlined from loadSessionMetadataStep).
	const tLoadMetaStart = Date.now()
	const metaResult = await errors.try(
		db
			.select({ userId: practiceSessions.userId, type: practiceSessions.type })
			.from(practiceSessions)
			.where(eq(practiceSessions.id, input.sessionId))
			.limit(1)
	)
	if (metaResult.error) {
		logger.error(
			{ error: metaResult.error, sessionId: input.sessionId },
			"masteryRecomputeWorkflow: session metadata read failed"
		)
		throw errors.wrap(metaResult.error, "loadSessionMetadata")
	}
	const metaRow = metaResult.data[0]
	if (!metaRow) {
		logger.error(
			{ sessionId: input.sessionId },
			"masteryRecomputeWorkflow: session row missing"
		)
		throw errors.wrap(ErrSessionRowMissing, `session id '${input.sessionId}'`)
	}
	let source: MasterySource = "ongoing"
	if (metaRow.type === "diagnostic") source = "diagnostic"
	const userId = metaRow.userId
	logger.info(
		{
			phaseName: "loadSessionMetadata",
			sessionId: input.sessionId,
			durationMs: Date.now() - tLoadMetaStart
		},
		"phase:complete"
	)

	// Phase 2 — list distinct sub-types (inlined from listDistinctSubTypesStep).
	const tListStart = Date.now()
	const distinctResult = await errors.try(
		db
			.selectDistinct({ subTypeId: items.subTypeId })
			.from(attempts)
			.innerJoin(items, eq(attempts.itemId, items.id))
			.where(eq(attempts.sessionId, input.sessionId))
	)
	if (distinctResult.error) {
		logger.error(
			{ error: distinctResult.error, sessionId: input.sessionId },
			"masteryRecomputeWorkflow: distinct sub-type query failed"
		)
		throw errors.wrap(distinctResult.error, "listDistinctSubTypes")
	}
	const subTypeList: SubTypeId[] = []
	for (const row of distinctResult.data) {
		subTypeList.push(asSubTypeId(row.subTypeId))
	}
	logger.info(
		{
			phaseName: "listDistinctSubTypes",
			sessionId: input.sessionId,
			subTypeCount: subTypeList.length,
			durationMs: Date.now() - tListStart
		},
		"phase:complete"
	)

	// Phase 3 — content logs (inlined from logRecomputeLoopStartingStep).
	// Preserves recompute:loop:starting (the W-distinct-subtype-count-on-full-
	// length verifier) and the legacy workflow-loop info log verbatim.
	logger.info(
		{ sessionId: input.sessionId, subTypeCount: subTypeList.length },
		"recompute:loop:starting"
	)
	logger.info(
		{
			sessionId: input.sessionId,
			subTypeCount: subTypeList.length,
			source
		},
		"masteryRecomputeWorkflow: starting per-sub-type recompute loop"
	)

	// Phase 4 — per-sub-type recompute loop (inlined from recomputeStep loop).
	// recomputeForUser's recompute:user:* logs give per-iteration visibility.
	const tLoopStart = Date.now()
	for (const subTypeId of subTypeList) {
		const recomputeResult = await errors.try(
			recomputeForUser(userId, subTypeId, source)
		)
		if (recomputeResult.error) {
			logger.error(
				{ error: recomputeResult.error, userId, subTypeId, source },
				"masteryRecomputeWorkflow: recomputeForUser failed"
			)
			throw errors.wrap(recomputeResult.error, "recomputeForUser")
		}
	}
	logger.info(
		{
			phaseName: "recomputeLoop",
			sessionId: input.sessionId,
			subTypeCount: subTypeList.length,
			durationMs: Date.now() - tLoopStart
		},
		"phase:complete"
	)

	logger.info(
		{
			stepName: "recomputeAllForSession",
			sessionId: input.sessionId,
			durationMs: Date.now() - tStepStart
		},
		"step:complete"
	)
}

export type { SessionMetadata }
export {
	listDistinctSubTypesStep,
	loadSessionMetadataStep,
	logRecomputeLoopStartingStep,
	recomputeAllForSession,
	recomputeStep
}
