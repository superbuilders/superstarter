// Step bodies for validatorBatchWorkflow (Phase 4 sub-phase b §1.3 commit 0).
//
// Lives separately from the workflow file (`./validator-batch`) per the
// project's workflow convention: the @workflow/next plugin's node-module
// guard rejects any reachable Node.js dependency (pino via `@/logger`) on a
// workflow file's import graph. Step files run outside the workflow VM, so
// they're allowed Node.js modules. All `logger.*` calls and the
// `errors.new()` sentinels live here. Mirrors the precedent at
// `sibling-generation-steps.ts` and `embedding-backfill-steps.ts`.
//
// Step shape (mirrors workflow file orchestration):
//   1. loadCandidatesStep        — DB read; produces CandidateForValidation[]
//   2. buildContextStep          — context.ts builder; loads embeddings,
//                                  provenance, cohort peers, pressure cells
//   3. runPass1Step              — iterate candidates × criteria 1-5; collect
//                                  verdicts (criterion 6 returns pass-1
//                                  deferral)
//   4. computeCohortRatesStep    — pure aggregation pass-1 → per-cohort rates
//   5. runPass2Step              — re-invoke validateCandidate with populated
//                                  cohortFailureRates; merge pass-2 criterion-6
//                                  verdict into pass-1 results
//   6. summarizeCalibrationStep  — calibration.ts summarizeForCalibration
//   7. persistResultsStep        — STUB; throws ErrPersistNotYetImplemented;
//                                  §1.3 commit-1 implements

import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { z } from "zod"
import type { SubTypeId } from "@/config/sub-types"
import { subTypeIds } from "@/config/sub-types"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"
import { summarizeForCalibration, type CalibrationSummary } from "@/server/validator/calibration"
import { buildValidationContext, withCohortFailureRates } from "@/server/validator/context"
import { validateCandidate } from "@/server/validator/engine"
import type {
	CandidateForValidation,
	CandidateValidationResult,
	ValidationContext
} from "@/server/validator/types"

const ErrPersistNotYetImplemented = errors.new(
	"validator persistResultsStep stubbed (§1.3 commit-0); implementation lands at §1.3 commit-1"
)
const ErrLoadCandidatesQueryFailed = errors.new("loadCandidatesStep query failed")
const ErrUnknownSubTypeId = errors.new("loadCandidatesStep encountered unknown sub_type_id")

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)

function asSubTypeId(s: string): SubTypeId {
	if (!subTypeIdSet.has(s)) {
		logger.error({ subTypeId: s }, "validator-batch: unknown sub_type_id")
		throw errors.wrap(ErrUnknownSubTypeId, `value '${s}'`)
	}
	const matched = subTypeIds.find(function eqs(known) {
		return known === s
	})
	if (matched === undefined) {
		logger.error({ subTypeId: s }, "validator-batch: post-guard sub-type-id miss (impossible)")
		throw errors.wrap(ErrUnknownSubTypeId, `post-guard miss for '${s}'`)
	}
	return matched
}

const metadataObjectSchema = z.record(z.string(), z.unknown())

async function loadCandidatesStep(): Promise<ReadonlyArray<CandidateForValidation>> {
	"use step"
	const result = await errors.try(
		db
			.select({
				id: items.id,
				subTypeId: items.subTypeId,
				difficulty: items.difficulty,
				source: items.source,
				status: items.status,
				body: items.body,
				optionsJson: items.optionsJson,
				correctAnswer: items.correctAnswer,
				explanation: items.explanation,
				embedding: items.embedding,
				metadataJson: items.metadataJson,
				sourceFolder: items.sourceFolder,
				sourceFilename: items.sourceFilename
			})
			.from(items)
			.where(eq(items.status, "candidate"))
	)
	if (result.error) {
		logger.error({ error: result.error }, "validator-batch: loadCandidatesStep query failed")
		throw errors.wrap(ErrLoadCandidatesQueryFailed, "candidates SELECT")
	}
	const candidates: CandidateForValidation[] = []
	for (const row of result.data) {
		const metaParse = metadataObjectSchema.safeParse(row.metadataJson)
		if (!metaParse.success) {
			logger.error(
				{ itemId: row.id, error: metaParse.error },
				"validator-batch: candidate metadataJson failed object schema"
			)
			continue
		}
		candidates.push({
			id: row.id,
			subTypeId: asSubTypeId(row.subTypeId),
			difficulty: row.difficulty,
			source: row.source,
			status: row.status,
			body: row.body,
			optionsJson: row.optionsJson,
			correctAnswer: row.correctAnswer,
			explanation: row.explanation,
			embedding: row.embedding,
			metadataJson: metaParse.data,
			sourceFolder: row.sourceFolder,
			sourceFilename: row.sourceFilename
		})
	}
	logger.info(
		{ candidateCount: candidates.length },
		"validator-batch: loadCandidatesStep complete"
	)
	return candidates
}

async function buildContextStep(
	candidates: ReadonlyArray<CandidateForValidation>
): Promise<ValidationContext> {
	"use step"
	return await buildValidationContext(candidates)
}

async function runPass1Step(
	candidates: ReadonlyArray<CandidateForValidation>,
	ctx: ValidationContext
): Promise<ReadonlyArray<CandidateValidationResult>> {
	"use step"
	const results: CandidateValidationResult[] = []
	for (const candidate of candidates) {
		const result = await validateCandidate(candidate, ctx)
		results.push(result)
	}
	logger.info({ resultCount: results.length }, "validator-batch: runPass1Step complete")
	return results
}

function getPromptHash(candidate: CandidateForValidation): string | null {
	const v = candidate.metadataJson.promptHash
	if (typeof v !== "string" || v.length === 0) return null
	return v
}

interface CohortPass1Stats {
	readonly cohortKey: string
	readonly total: number
	readonly failed: number
	readonly rate: number
}

function increment(counts: Map<string, number>, key: string): void {
	const existing = counts.get(key)
	const next = existing === undefined ? 1 : existing + 1
	counts.set(key, next)
}

function buildCohortByItemId(
	candidates: ReadonlyArray<CandidateForValidation>
): ReadonlyMap<string, string> {
	const m = new Map<string, string>()
	for (const c of candidates) {
		const h = getPromptHash(c)
		if (h !== null) m.set(c.id, h)
	}
	return m
}

function tallyTotals(
	candidates: ReadonlyArray<CandidateForValidation>,
	cohortByItemId: ReadonlyMap<string, string>
): ReadonlyMap<string, number> {
	const totals = new Map<string, number>()
	for (const c of candidates) {
		const cohort = cohortByItemId.get(c.id)
		if (cohort === undefined) continue
		increment(totals, cohort)
	}
	return totals
}

function resultIsPass1Failure(result: CandidateValidationResult): boolean {
	for (const [name, verdict] of result.flagsByName) {
		if (name === "provenance-batch-reject") continue
		if (verdict.kind === "flag" || verdict.kind === "error") return true
	}
	return false
}

function tallyFailures(
	pass1: ReadonlyArray<CandidateValidationResult>,
	cohortByItemId: ReadonlyMap<string, string>
): ReadonlyMap<string, number> {
	const failures = new Map<string, number>()
	for (const result of pass1) {
		const cohort = cohortByItemId.get(result.itemId)
		if (cohort === undefined) continue
		if (resultIsPass1Failure(result)) {
			increment(failures, cohort)
		}
	}
	return failures
}

function computeRatesAndStats(
	totals: ReadonlyMap<string, number>,
	failures: ReadonlyMap<string, number>
): { rates: ReadonlyMap<string, number>; stats: ReadonlyArray<CohortPass1Stats> } {
	const rates = new Map<string, number>()
	const stats: CohortPass1Stats[] = []
	for (const [cohortKey, total] of totals) {
		const failedRaw = failures.get(cohortKey)
		const failed = failedRaw === undefined ? 0 : failedRaw
		const rate = total === 0 ? 0 : failed / total
		rates.set(cohortKey, rate)
		stats.push({ cohortKey, total, failed, rate })
	}
	return { rates, stats }
}

async function computeCohortRatesStep(
	candidates: ReadonlyArray<CandidateForValidation>,
	pass1: ReadonlyArray<CandidateValidationResult>
): Promise<{
	readonly rates: ReadonlyMap<string, number>
	readonly stats: ReadonlyArray<CohortPass1Stats>
}> {
	"use step"
	const cohortByItemId = buildCohortByItemId(candidates)
	const totals = tallyTotals(candidates, cohortByItemId)
	const failures = tallyFailures(pass1, cohortByItemId)
	const { rates, stats } = computeRatesAndStats(totals, failures)
	logger.info({ cohortCount: rates.size }, "validator-batch: computeCohortRatesStep complete")
	return { rates, stats }
}

async function runPass2Step(
	candidates: ReadonlyArray<CandidateForValidation>,
	ctx: ValidationContext,
	cohortRates: ReadonlyMap<string, number>,
	pass1: ReadonlyArray<CandidateValidationResult>
): Promise<ReadonlyArray<CandidateValidationResult>> {
	"use step"
	const ctx2 = withCohortFailureRates(ctx, cohortRates)
	const pass1ById = new Map<string, CandidateValidationResult>()
	for (const r of pass1) pass1ById.set(r.itemId, r)
	const merged: CandidateValidationResult[] = []
	for (const candidate of candidates) {
		const newResult = await validateCandidate(candidate, ctx2)
		const prior = pass1ById.get(candidate.id)
		if (prior === undefined) {
			merged.push(newResult)
			continue
		}
		const mergedFlags = new Map(prior.flagsByName)
		const pbrVerdict = newResult.flagsByName.get("provenance-batch-reject")
		if (pbrVerdict !== undefined) {
			mergedFlags.set("provenance-batch-reject", pbrVerdict)
		}
		let hasAnyFlag = false
		for (const v of mergedFlags.values()) {
			if (v.kind === "flag" || v.kind === "error") {
				hasAnyFlag = true
				break
			}
		}
		const isPressureCell = newResult.isPressureCell
		const aggregateFlag = hasAnyFlag ? true : isPressureCell
		merged.push({
			itemId: candidate.id,
			flagsByName: mergedFlags,
			hasAnyFlag: aggregateFlag,
			isPressureCell,
			evaluatedAtMs: Date.now()
		})
	}
	logger.info({ resultCount: merged.length }, "validator-batch: runPass2Step complete")
	return merged
}

function summarizeCalibrationStep(
	results: ReadonlyArray<CandidateValidationResult>
): CalibrationSummary {
	return summarizeForCalibration(results)
}

async function persistResultsStep(
	_results: ReadonlyArray<CandidateValidationResult>,
	_invokedByAdminEmail: string
): Promise<number> {
	"use step"
	logger.error(
		{ resultCount: _results.length },
		"validator-batch: persistResultsStep stub invoked (§1.3 commit-0)"
	)
	throw errors.wrap(ErrPersistNotYetImplemented, "persistResultsStep")
}

export type { CohortPass1Stats }
export {
	asSubTypeId,
	buildContextStep,
	computeCohortRatesStep,
	ErrLoadCandidatesQueryFailed,
	ErrPersistNotYetImplemented,
	ErrUnknownSubTypeId,
	loadCandidatesStep,
	persistResultsStep,
	runPass1Step,
	runPass2Step,
	summarizeCalibrationStep
}
