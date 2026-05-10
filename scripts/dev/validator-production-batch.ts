// Validator production batch CLI (Phase 4 sub-phase b §1.3 commit 2).
//
// Invokes validatorBatchWorkflow in production mode against the working-set
// candidates; writes validatorResult sub-objects to items.metadata_json via
// jsonb_set inside a single transaction. §6.14.31 destructive-operation-gate
// step-3 surface: prints a confirmation summary; requires explicit --yes
// flag for non-interactive execution.
//
// Usage:
//   bun run scripts/dev/validator-production-batch.ts --admin-email <email> [--yes]
//
// Without --yes the script prints what it would do and exits without
// invoking the workflow. With --yes the script invokes immediately.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import { defaultThresholds } from "@/server/validator/thresholds"
import { computeThresholdsHash } from "@/server/validator/thresholds-hash"
import { validatorBatchWorkflow } from "@/workflows/validator-batch"

interface CliArgs {
	readonly adminEmail: string
	readonly autoYes: boolean
}

const ErrMissingAdminEmail = errors.new("validator-production-batch: --admin-email required")
const ErrNotConfirmed = errors.new("validator-production-batch: confirmation required (--yes)")

function parseArgs(argv: ReadonlyArray<string>): CliArgs {
	let adminEmail: string | undefined
	let autoYes = false
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i]
		if (arg === "--admin-email") {
			const next = argv[i + 1]
			if (next === undefined) {
				logger.error({}, "validator-production-batch: --admin-email flag without value")
				throw errors.wrap(ErrMissingAdminEmail, "no value after --admin-email")
			}
			adminEmail = next
			i += 1
			continue
		}
		if (arg === "--yes") {
			autoYes = true
		}
	}
	if (adminEmail === undefined || adminEmail.length === 0) {
		logger.error({}, "validator-production-batch: --admin-email missing or empty")
		throw errors.wrap(ErrMissingAdminEmail, "missing or empty")
	}
	return { adminEmail, autoYes }
}

function buildConfirmationSummary(thresholdsHash: string): string {
	const lines: string[] = []
	lines.push("==============================================================")
	lines.push("  ABOUT TO RUN VALIDATOR PRODUCTION BATCH")
	lines.push("==============================================================")
	lines.push("Target:      candidate-status items in dev DB")
	lines.push(`Thresholds:  ${thresholdsHash}`)
	lines.push("Expected (per §1.3 commit-1 dry-run):")
	lines.push("  ~25.42% will have validatorResult.hasAnyFlag=true (flagged for admin)")
	lines.push("  ~74.58% will have validatorResult.hasAnyFlag=false (validator-cleared)")
	lines.push("  ~398 candidates pressure-cell-flagged")
	lines.push("Writes:      metadata_json.validatorResult on every candidate row")
	lines.push("Mechanism:   single transaction; all-or-nothing; jsonb_set preserves siblings")
	lines.push("Reversible:  YES — re-run with new thresholds overwrites; manual UPDATE can clear")
	lines.push("==============================================================")
	return lines.join("\n")
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2))
	const thresholdsHash = computeThresholdsHash(defaultThresholds)
	const summary = buildConfirmationSummary(thresholdsHash)
	logger.info({ summary, adminEmail: args.adminEmail }, "validator-production-batch: confirmation gate")

	if (!args.autoYes) {
		logger.warn(
			{},
			"validator-production-batch: --yes not provided; exiting without invoking workflow"
		)
		throw errors.wrap(ErrNotConfirmed, "pass --yes to proceed")
	}

	logger.info({ adminEmail: args.adminEmail }, "validator-production-batch: invoking workflow")
	const startedAtMs = Date.now()
	const output = await validatorBatchWorkflow({
		mode: "production",
		invokedByAdminEmail: args.adminEmail
	})
	const durationMs = Date.now() - startedAtMs
	logger.info(
		{
			durationMs,
			candidateCount: output.candidateCount,
			persistedCount: output.persistedCount,
			thresholdsHash: output.thresholdsHash,
			calibrationSummary: {
				totalCandidates: output.calibrationSummary.totalCandidates,
				pressureCellFlagCount: output.calibrationSummary.pressureCellFlagCount,
				flagRates: Object.fromEntries(output.calibrationSummary.flagRatesByCriterion),
				errorRates: Object.fromEntries(output.calibrationSummary.errorRatesByCriterion)
			},
			cohortStatsCount: output.cohortStats.length
		},
		"validator-production-batch: workflow complete"
	)
	process.exit(0)
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "validator-production-batch: failed")
	process.exit(1)
}
