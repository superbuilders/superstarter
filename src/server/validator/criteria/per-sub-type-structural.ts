// per-sub-type-structural criterion (Phase 4 sub-phase b §1.2 commit 2 — implementation).
//
// Per plan-doc §0.6.1 #4: dispatch on candidate.subTypeId; per-sub-type
// structural rules. v1 first-cut implements rules for the sub-types whose
// structural shape is mechanically checkable; sub-types without checkable
// rules pass-through. Calibration directive: thresholds tighten in the §1.3
// batch runner against working-set flag-rate.
//
// Implemented checks:
//   - numerical.fractions, numerical.percentages, numerical.ratios,
//     numerical.averages, numerical.workrate, numerical.speed_distance_time,
//     numerical.word_problems, numerical.lowest_values: correctAnswer's
//     option text contains a numeric token (digit, fraction, percent sign).
//   - verbal.antonyms: option-text dedup (no two options have identical text;
//     the structural defect of "frugal" appearing twice in different cases).
//   - verbal.letter_series, numerical.number_series: stem contains the
//     "___" / "?" placeholder for the missing element.
//
// Sub-types without an implemented rule (verbal.analogies,
// verbal.sentence_completion, verbal.critical_reasoning) return pass — admin
// handles their structural review at the human-judgment layer per
// plan-doc §0.6.1 layered-detection framing.

import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { logger } from "@/logger"
import type { SubTypeId } from "@/config/sub-types"
import type {
	CandidateForValidation,
	ValidationContext,
	ValidatorCriterion,
	ValidatorVerdict
} from "@/server/validator/types"

const optionRecordSchema = z.object({
	id: z.string(),
	text: z.string()
})
const optionsSchema = z.array(optionRecordSchema)

const NUMERIC_PATTERN = /[0-9]/
const PLACEHOLDER_PATTERN = /\?|___|_{2,}|\.\.\./

interface BodyTextHolder {
	readonly text: string
}

const bodyTextSchema = z.object({ kind: z.literal("text"), text: z.string() })

function bodyTextOf(candidate: CandidateForValidation): string | null {
	const parsed = bodyTextSchema.safeParse(candidate.body)
	if (!parsed.success) return null
	return parsed.data.text
}

function correctOptionText(
	options: ReadonlyArray<{ id: string; text: string }>,
	correctAnswer: string
): string | null {
	const found = options.find(function byId(o) {
		return o.id === correctAnswer
	})
	return found === undefined ? null : found.text
}

function checkNumericCorrect(
	candidate: CandidateForValidation,
	options: ReadonlyArray<{ id: string; text: string }>
): ValidatorVerdict {
	const text = correctOptionText(options, candidate.correctAnswer)
	if (text === null) {
		return {
			kind: "flag",
			reason: "correctAnswer id not in options (defensive — schema-shape catches first)",
			metadata: { check: "numeric-correct-option" }
		}
	}
	if (!NUMERIC_PATTERN.test(text)) {
		return {
			kind: "flag",
			reason: "numerical sub-type but correct option text has no digits",
			metadata: {
				check: "numeric-correct-option",
				correctOptionText: text,
				subTypeId: candidate.subTypeId
			}
		}
	}
	return { kind: "pass" }
}

function checkAntonymDedup(
	options: ReadonlyArray<{ id: string; text: string }>
): ValidatorVerdict {
	const seen = new Map<string, string>()
	for (const o of options) {
		const norm = o.text.trim().toLowerCase()
		const prior = seen.get(norm)
		if (prior !== undefined) {
			return {
				kind: "flag",
				reason: "duplicate option text (case-and-whitespace-normalized)",
				metadata: { check: "antonym-dedup", duplicateText: o.text }
			}
		}
		seen.set(norm, o.id)
	}
	return { kind: "pass" }
}

function checkSeriesPlaceholder(
	candidate: CandidateForValidation,
	bodyText: string
): ValidatorVerdict {
	if (!PLACEHOLDER_PATTERN.test(bodyText)) {
		return {
			kind: "flag",
			reason: "series sub-type but stem missing placeholder (?, ___, …)",
			metadata: { check: "series-placeholder", subTypeId: candidate.subTypeId }
		}
	}
	return { kind: "pass" }
}

const NUMERIC_SUB_TYPES: ReadonlySet<SubTypeId> = new Set<SubTypeId>([
	"numerical.fractions",
	"numerical.percentages",
	"numerical.ratios",
	"numerical.averages",
	"numerical.workrate",
	"numerical.speed_distance_time",
	"numerical.word_problems",
	"numerical.lowest_values",
	"numerical.number_series"
])

const SERIES_SUB_TYPES: ReadonlySet<SubTypeId> = new Set<SubTypeId>([
	"verbal.letter_series",
	"numerical.number_series"
])

async function checkPerSubTypeStructural(
	candidate: CandidateForValidation,
	_ctx: ValidationContext
): Promise<ValidatorVerdict> {
	const optionsParse = optionsSchema.safeParse(candidate.optionsJson)
	if (!optionsParse.success) {
		logger.debug(
			{ itemId: candidate.id, error: optionsParse.error },
			"per-sub-type-structural: options parse failed (schema-shape should also flag)"
		)
		return { kind: "error", reason: "optionsJson did not parse for per-sub-type check" }
	}
	const options = optionsParse.data
	const bodyText = bodyTextOf(candidate)
	if (NUMERIC_SUB_TYPES.has(candidate.subTypeId)) {
		const verdict = checkNumericCorrect(candidate, options)
		if (verdict.kind !== "pass") return verdict
	}
	if (candidate.subTypeId === "verbal.antonyms") {
		const verdict = checkAntonymDedup(options)
		if (verdict.kind !== "pass") return verdict
	}
	if (SERIES_SUB_TYPES.has(candidate.subTypeId) && bodyText !== null) {
		const verdict = checkSeriesPlaceholder(candidate, bodyText)
		if (verdict.kind !== "pass") return verdict
	}
	return { kind: "pass" }
}

const ErrPerSubTypeStructuralUnreachable = errors.new(
	"per-sub-type-structural criterion unreachable error"
)

const perSubTypeStructuralCriterion: ValidatorCriterion = {
	name: "per-sub-type-structural",
	check: checkPerSubTypeStructural
}

export type { BodyTextHolder }
export { ErrPerSubTypeStructuralUnreachable, perSubTypeStructuralCriterion }
