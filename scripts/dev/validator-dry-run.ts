// Validator dry-run CLI (Phase 4 sub-phase b §1.3 commit 0).
//
// Loads working-set candidates from the dev DB, builds full ValidationContext
// (parent embeddings + provenance + cohort peers + pressure cells), runs
// the two-pass orchestration (mirrors validatorBatchWorkflow's step
// sequence), and outputs a calibration report. Writes nothing to DB.
//
// Used by the redirector to surface per-criterion flag rates and decide
// threshold tuning before §1.3 commit-1 production batch invocation.
//
// Usage:
//   bun run scripts/dev/validator-dry-run.ts

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import {
	buildContextStep,
	computeCohortRatesStep,
	loadCandidatesStep,
	runPass1Step,
	runPass2Step,
	summarizeCalibrationStep
} from "@/workflows/validator-batch-steps"

interface PerCriterionRates {
	readonly criterion: string
	readonly flagRate: number
	readonly errorRate: number
}

function formatPercent(rate: number): string {
	return `${(rate * 100).toFixed(2)}%`
}

async function main(): Promise<void> {
	logger.info("validator-dry-run: starting")
	const candidates = await loadCandidatesStep()
	logger.info({ count: candidates.length }, "validator-dry-run: candidates loaded")

	const ctx = await buildContextStep(candidates)
	logger.info(
		{
			parentEmbeddings: ctx.parentEmbeddingByItemId.size,
			provenance: ctx.provenanceByParentItemId.size,
			cohorts: ctx.cohortPeersByCohortKey.size,
			pressureCells: ctx.pressureCells.size
		},
		"validator-dry-run: context built"
	)

	const pass1 = await runPass1Step(candidates, ctx)
	const cohort = await computeCohortRatesStep(candidates, pass1)
	const pass2 = await runPass2Step(candidates, ctx, cohort.rates, pass1)
	const summary = summarizeCalibrationStep(pass2)

	const allCriteria = [
		"schema-shape",
		"tier-distribution",
		"embedding-distance",
		"per-sub-type-structural",
		"sub-phase-a-failure-modes",
		"provenance-batch-reject"
	]
	const rows: PerCriterionRates[] = []
	for (const c of allCriteria) {
		const flagRateRaw = summary.flagRatesByCriterion.get(c)
		const errorRateRaw = summary.errorRatesByCriterion.get(c)
		const flagRate = flagRateRaw === undefined ? 0 : flagRateRaw
		const errorRate = errorRateRaw === undefined ? 0 : errorRateRaw
		rows.push({ criterion: c, flagRate, errorRate })
	}

	const reportLines: string[] = []
	reportLines.push("==============================================================")
	reportLines.push("  Validator dry-run calibration report")
	reportLines.push("==============================================================")
	reportLines.push(`Total candidates: ${summary.totalCandidates}`)
	reportLines.push(`Pressure-cell flagged: ${summary.pressureCellFlagCount}`)
	reportLines.push("")
	reportLines.push("Per-criterion flag and error rates:")
	for (const row of rows) {
		reportLines.push(
			`  ${row.criterion.padEnd(28)} flag=${formatPercent(row.flagRate).padStart(8)}  error=${formatPercent(row.errorRate).padStart(8)}`
		)
	}
	reportLines.push("")
	reportLines.push("Per-cohort pass-1 statistics (criterion 6 excluded from rate):")
	const sortedStats = [...cohort.stats].sort(function byRateDesc(a, b) {
		return b.rate - a.rate
	})
	for (const s of sortedStats) {
		reportLines.push(
			`  ${s.cohortKey}  total=${String(s.total).padStart(4)}  failed=${String(s.failed).padStart(4)}  rate=${formatPercent(s.rate).padStart(8)}`
		)
	}
	reportLines.push("==============================================================")
	logger.info({ report: reportLines.join("\n") }, "validator-dry-run: calibration report")
	process.exit(0)
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "validator-dry-run: failed")
	process.exit(1)
}
