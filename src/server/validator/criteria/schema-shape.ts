// schema-shape criterion (Phase 4 sub-phase b §1.2 commit 0 stub).
//
// Per plan-doc §0.6.1 #1: correctAnswer is one of the optionsJson ids; option
// count matches sub-type convention; required fields (stem, options,
// correctAnswer, explanation when applicable) present and well-typed.
//
// Implementation lands at §1.2 commit-1. The stub returns an error verdict so
// §1.3 batch runs cannot silently succeed before commit-1 implementations land.

import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"
import type {
	CandidateForValidation,
	ValidationContext,
	ValidatorCriterion,
	ValidatorVerdict
} from "@/server/validator/types"

const ErrSchemaShapeNotImplemented = errors.new("schema-shape criterion not yet implemented")

async function checkSchemaShape(
	candidate: CandidateForValidation,
	_ctx: ValidationContext
): Promise<ValidatorVerdict> {
	logger.warn({ itemId: candidate.id }, "schema-shape criterion invoked before implementation")
	return { kind: "error", reason: "criterion not yet implemented (commit-1)" }
}

const schemaShapeCriterion: ValidatorCriterion = {
	name: "schema-shape",
	check: checkSchemaShape
}

export { ErrSchemaShapeNotImplemented, schemaShapeCriterion }
