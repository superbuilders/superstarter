// schema-shape criterion (Phase 4 sub-phase b §1.2 commit 2 — implementation).
//
// Per plan-doc §0.6.1 #1: correctAnswer is one of the optionsJson ids; option
// count is in [2, 5] per project optionSchema; required fields (body,
// correctAnswer) present and well-typed; explanation present (sub-phase a
// generated items always include an explanation per ingest pipeline).
//
// Uses project-canonical Zod schemas (optionSchema, itemBody) to validate the
// jsonb-typed columns at runtime, so the criterion catches both real ingest-
// pipeline drift and any post-hoc data corruption.

import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { logger } from "@/logger"
import { itemBody } from "@/server/items/body-schema"
import type {
	CandidateForValidation,
	ValidationContext,
	ValidatorCriterion,
	ValidatorVerdict
} from "@/server/validator/types"

const optionSchema = z.object({
	id: z.string().regex(/^[0-9a-z]{8}$/),
	text: z.string().min(1)
})

const optionsArraySchema = z.array(optionSchema).min(2).max(5)

async function checkSchemaShape(
	candidate: CandidateForValidation,
	_ctx: ValidationContext
): Promise<ValidatorVerdict> {
	const bodyParse = itemBody.safeParse(candidate.body)
	if (!bodyParse.success) {
		logger.debug({ itemId: candidate.id, error: bodyParse.error }, "schema-shape: body parse failed")
		return {
			kind: "flag",
			reason: "body did not match itemBody schema",
			metadata: { check: "body" }
		}
	}
	const optionsParse = optionsArraySchema.safeParse(candidate.optionsJson)
	if (!optionsParse.success) {
		logger.debug(
			{ itemId: candidate.id, error: optionsParse.error },
			"schema-shape: options parse failed"
		)
		return {
			kind: "flag",
			reason: "optionsJson did not match optionSchema array",
			metadata: { check: "options" }
		}
	}
	const options = optionsParse.data
	const optionIds = options.map(function getId(o) {
		return o.id
	})
	if (!optionIds.includes(candidate.correctAnswer)) {
		return {
			kind: "flag",
			reason: "correctAnswer is not present in optionsJson ids",
			metadata: {
				check: "correctAnswer-in-options",
				correctAnswer: candidate.correctAnswer,
				optionIds
			}
		}
	}
	if (candidate.explanation === null || candidate.explanation.length === 0) {
		return {
			kind: "flag",
			reason: "explanation missing or empty",
			metadata: { check: "explanation" }
		}
	}
	return { kind: "pass" }
}

const ErrSchemaShapeUnreachable = errors.new("schema-shape criterion unreachable error")

const schemaShapeCriterion: ValidatorCriterion = {
	name: "schema-shape",
	check: checkSchemaShape
}

export { ErrSchemaShapeUnreachable, schemaShapeCriterion }
