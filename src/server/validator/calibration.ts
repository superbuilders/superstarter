// Calibration-data harness (Phase 4 sub-phase b §1.2 commit 0).
//
// §1.2 commit-1's threshold-tuning gate consumes summarizeForCalibration to
// surface per-criterion flag rates after a dry-run batch. Per plan-doc §0.6.1
// calibration directive: rate <2% → loosen threshold; rate >40% → tighten.

import type { CandidateValidationResult } from "@/server/validator/types"

interface CalibrationSummary {
	readonly totalCandidates: number
	readonly flagRatesByCriterion: ReadonlyMap<string, number>
	readonly errorRatesByCriterion: ReadonlyMap<string, number>
	readonly pressureCellFlagCount: number
}

function incrementCount(counts: Map<string, number>, key: string): void {
	const existing = counts.get(key)
	const next = existing === undefined ? 1 : existing + 1
	counts.set(key, next)
}

interface RawCounts {
	readonly flagCounts: ReadonlyMap<string, number>
	readonly errorCounts: ReadonlyMap<string, number>
	readonly pressureCellFlagCount: number
}

function collectCounts(results: ReadonlyArray<CandidateValidationResult>): RawCounts {
	const flagCounts = new Map<string, number>()
	const errorCounts = new Map<string, number>()
	let pressureCellFlagCount = 0

	for (const result of results) {
		if (result.isPressureCell) {
			pressureCellFlagCount += 1
		}
		for (const [criterionName, verdict] of result.flagsByName) {
			if (verdict.kind === "flag") {
				incrementCount(flagCounts, criterionName)
			} else if (verdict.kind === "error") {
				incrementCount(errorCounts, criterionName)
			}
		}
	}

	return { flagCounts, errorCounts, pressureCellFlagCount }
}

function ratesFromCounts(
	counts: ReadonlyMap<string, number>,
	total: number
): ReadonlyMap<string, number> {
	const rates = new Map<string, number>()
	for (const [name, count] of counts) {
		const rate = total === 0 ? 0 : count / total
		rates.set(name, rate)
	}
	return rates
}

function summarizeForCalibration(
	results: ReadonlyArray<CandidateValidationResult>
): CalibrationSummary {
	const counts = collectCounts(results)
	const total = results.length
	return {
		totalCandidates: total,
		flagRatesByCriterion: ratesFromCounts(counts.flagCounts, total),
		errorRatesByCriterion: ratesFromCounts(counts.errorCounts, total),
		pressureCellFlagCount: counts.pressureCellFlagCount
	}
}

export type { CalibrationSummary }
export { summarizeForCalibration }
