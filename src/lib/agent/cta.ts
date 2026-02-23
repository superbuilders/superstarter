import { tool } from "ai"
import { z } from "zod"

const CtaKindSchema = z.enum(["approval", "text", "choice"])

const ChoiceOptionSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1)
})

const CtaRequestBase = { ctaId: z.string().min(1), runId: z.string().min(1) }

const CtaRequestEventSchema = z.discriminatedUnion("kind", [
	z.object({
		...CtaRequestBase,
		kind: z.literal("approval"),
		message: z.string().min(1)
	}),
	z.object({
		...CtaRequestBase,
		kind: z.literal("text"),
		prompt: z.string().min(1),
		placeholder: z.string().optional()
	}),
	z.object({
		...CtaRequestBase,
		kind: z.literal("choice"),
		prompt: z.string().min(1),
		options: z.array(ChoiceOptionSchema).min(2)
	})
])

const CtaResponseBase = { ctaId: z.string().min(1) }

const CtaResponseEventSchema = z.discriminatedUnion("kind", [
	z.object({
		...CtaResponseBase,
		kind: z.literal("approval"),
		approved: z.boolean(),
		reason: z.string().optional()
	}),
	z.object({
		...CtaResponseBase,
		kind: z.literal("text"),
		text: z.string().min(1)
	}),
	z.object({
		...CtaResponseBase,
		kind: z.literal("choice"),
		selectedId: z.string().min(1)
	})
])

type CtaKind = z.infer<typeof CtaKindSchema>
type CtaRequestEvent = z.infer<typeof CtaRequestEventSchema>
type CtaResponseEvent = z.infer<typeof CtaResponseEventSchema>

const requestHumanFeedbackTool = tool({
	description: [
		"Request feedback from a human user.",
		"Use 'approval' when you need a yes/no decision.",
		"Use 'text' when you need free-form text input.",
		"Use 'choice' when you need the user to pick from options.",
		"The function will suspend until the human responds (up to 30 days)."
	].join(" "),
	inputSchema: z.object({
		kind: CtaKindSchema.describe("The type of feedback to request"),
		message: z.string().describe("Message to show for approval CTAs").optional(),
		prompt: z.string().describe("Prompt to show for text or choice CTAs").optional(),
		placeholder: z.string().describe("Placeholder text for text input CTAs").optional(),
		options: z.array(ChoiceOptionSchema).describe("Options for choice CTAs").optional()
	})
})

export {
	ChoiceOptionSchema,
	CtaKindSchema,
	CtaRequestEventSchema,
	CtaResponseEventSchema,
	requestHumanFeedbackTool
}
export type { CtaKind, CtaRequestEvent, CtaResponseEvent }
