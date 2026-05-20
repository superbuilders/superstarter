import * as errors from "@superbuilders/errors"
import { z } from "zod"

const moderationDecisionSchema = z.enum([
	"approve_as_is",
	"approve_edit",
	"reject",
	"needs_revision",
	"hide"
])

const moderateExperimentalItemInputSchema = z
	.object({
		experimentalItemId: z.string().uuid(),
		decision: moderationDecisionSchema,
		proposalId: z.string().uuid().optional(),
		decisionNotes: z.string().trim().min(1).max(1000).optional()
	})
	.superRefine(function validateProposalSelection(input, ctx) {
		if (input.decision === "approve_edit" && input.proposalId === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["proposalId"],
				message: "proposalId is required when approving an edited proposal"
			})
		}
		if (input.decision !== "approve_edit" && input.proposalId !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["proposalId"],
				message: "proposalId is only valid for approve_edit decisions"
			})
		}
	})

const ErrExperimentalModerationInputInvalid = errors.new(
	"moderateExperimentalItemAction: input validation failed"
)
const ErrExperimentalModerationItemNotFound = errors.new(
	"moderateExperimentalItemAction: experimental item not found"
)
const ErrExperimentalModerationProposalNotFound = errors.new(
	"moderateExperimentalItemAction: proposal not found for experimental item"
)
const ErrExperimentalModerationTransactionFailed = errors.new(
	"moderateExperimentalItemAction: transaction failed"
)

type ExperimentalModerationDecision = z.infer<typeof moderationDecisionSchema>
type ModerateExperimentalItemInput = z.infer<typeof moderateExperimentalItemInputSchema>
type ExperimentalModerationAuditStatus =
	| "unaudited"
	| "approved"
	| "rejected"
	| "needs_revision"

interface ModerateExperimentalItemOutput {
	readonly outcome: "ok"
	readonly decisionId: string
	readonly experimentalItemId: string
	readonly decision: ExperimentalModerationDecision
	readonly auditStatus: ExperimentalModerationAuditStatus
	readonly hiddenAtMs?: number
	readonly proposalId?: string
	readonly decisionNotes?: string
	readonly actedAtMs: number
	readonly actedByEmail: string
}

export type {
	ExperimentalModerationAuditStatus,
	ExperimentalModerationDecision,
	ModerateExperimentalItemInput,
	ModerateExperimentalItemOutput
}
export {
	ErrExperimentalModerationInputInvalid,
	ErrExperimentalModerationItemNotFound,
	ErrExperimentalModerationProposalNotFound,
	ErrExperimentalModerationTransactionFailed,
	moderateExperimentalItemInputSchema,
	moderationDecisionSchema
}
