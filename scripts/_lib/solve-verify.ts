// scripts/_lib/solve-verify.ts
//
// Solve + verify passes for stage 1. Used in the answerVisible=false branch
// to determine the correct answer when the screenshot does not show one.
// EXEMPT FROM THE PROJECT RULESET.
//
// The LLM sees options labeled by synthetic letters A-E (positional) and
// returns one of those letters. The caller translates the letter back to
// an opaque option id by array index.

import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import {
	client,
	SOLVE_MAX_TOKENS,
	SOLVE_MODEL,
	VERIFY_MAX_TOKENS,
	VERIFY_MODEL,
	withBackoff
} from "@scripts/_lib/anthropic"

const optionLetter = z.enum(["A", "B", "C", "D", "E"])

const solverOutput = z.object({
	correctAnswer: optionLetter,
	reasoning: z.string().min(1),
	confidence: z.number().int().min(1).max(5)
})

type SolverOutput = z.infer<typeof solverOutput>

const verifierOutput = z
	.object({
		agrees: z.boolean(),
		correctIfDisagree: optionLetter.optional(),
		reason: z.string().min(1).optional()
	})
	.refine((d) => d.agrees || d.correctIfDisagree !== undefined, {
		message: "agrees=false but correctIfDisagree missing"
	})

type VerifierOutput = z.infer<typeof verifierOutput>

const SOLVE_SYSTEM = `You are solving a single CCAT (Criteria Cognitive Aptitude Test) multiple-choice question. Your job is to identify the correct option. Your reasoning will be checked by an independent verifier.

Call the submit_solver_answer tool with your chosen option, your reasoning (2–4 sentences explaining your method, used downstream by the verifier), and your confidence (1–5).`

const VERIFY_SYSTEM = `You are an independent verifier for CCAT (Criteria Cognitive Aptitude Test) answers. You will be given a question, the answer options, and another solver's claimed answer + reasoning.

Your protocol:
1. Solve the question yourself first, BEFORE looking at the claim. Pick the option you would choose.
2. Then read the claim. If the claim's answer matches yours AND the claim's reasoning is sound (no obvious errors), set agrees=true.
3. If the claim's answer does not match yours, set agrees=false, put your answer in correctIfDisagree, and explain the discrepancy in reason in 1–2 sentences.
4. If the claim's answer matches yours but its reasoning has a clear error (e.g. arithmetic mistake masked by a coincidentally correct option), set agrees=false and explain in reason.

Call the submit_verifier_judgment tool with your verdict.`

const SOLVE_TOOL_NAME = "submit_solver_answer"
const SOLVE_TOOL: Anthropic.Messages.Tool = {
	name: SOLVE_TOOL_NAME,
	description:
		"Submit your answer for the CCAT question along with reasoning and confidence. Reasoning is consumed by the downstream verifier and should make the method check-able.",
	input_schema: {
		type: "object",
		properties: {
			correctAnswer: { type: "string", enum: ["A", "B", "C", "D", "E"] },
			reasoning: {
				type: "string",
				description: "2–4 sentences naming the method used"
			},
			confidence: {
				type: "integer",
				minimum: 1,
				maximum: 5,
				description: "5 = certain, 1 = guess"
			}
		},
		required: ["correctAnswer", "reasoning", "confidence"]
	}
}

const VERIFY_TOOL_NAME = "submit_verifier_judgment"
const VERIFY_TOOL: Anthropic.Messages.Tool = {
	name: VERIFY_TOOL_NAME,
	description:
		"Submit your verdict on the solver's claim. Set agrees=true if you arrived at the same answer with sound reasoning. Set agrees=false otherwise, fill in correctIfDisagree with the option YOU would pick, and explain the discrepancy in reason.",
	input_schema: {
		type: "object",
		properties: {
			agrees: { type: "boolean" },
			correctIfDisagree: {
				type: "string",
				enum: ["A", "B", "C", "D", "E"],
				description: "set ONLY when agrees is false"
			},
			reason: {
				type: "string",
				description: "set ONLY when agrees is false; 1–2 sentences explaining the discrepancy"
			}
		},
		required: ["agrees"]
	}
}

const POSITIONAL_LETTERS = ["A", "B", "C", "D", "E"]

function letterForIndex(i: number): string {
	const letter = POSITIONAL_LETTERS[i]
	if (letter === undefined) {
		throw new Error(`option index ${i} exceeds positional letter range`)
	}
	return letter
}

function indexForLetter(letter: string): number {
	const i = POSITIONAL_LETTERS.indexOf(letter)
	if (i < 0) throw new Error(`unrecognized option letter '${letter}'`)
	return i
}

function formatOptionsForLLM(options: { text: string }[]): string {
	return options.map((o, i) => `${letterForIndex(i)}. ${o.text}`).join("\n")
}

async function solveQuestion(
	question: string,
	options: { text: string }[]
): Promise<SolverOutput> {
	const userContent = `Question:\n${question}\n\nOptions:\n${formatOptionsForLLM(options)}`

	const message = await withBackoff("solve", () =>
		client.messages.create({
			model: SOLVE_MODEL,
			max_tokens: SOLVE_MAX_TOKENS,
			temperature: 0,
			system: SOLVE_SYSTEM,
			tools: [SOLVE_TOOL],
			tool_choice: { type: "tool", name: SOLVE_TOOL_NAME },
			messages: [{ role: "user", content: userContent }]
		})
	)

	let toolInput: unknown
	for (const block of message.content) {
		if (block.type === "tool_use" && block.name === SOLVE_TOOL_NAME) {
			toolInput = block.input
			break
		}
	}
	if (toolInput === undefined) {
		throw new Error(`no ${SOLVE_TOOL_NAME} tool_use block in solve response`)
	}

	const parsed = solverOutput.safeParse(toolInput)
	if (!parsed.success) {
		throw new Error(`solver Zod validation failed: ${JSON.stringify(parsed.error.issues)}`)
	}
	return parsed.data
}

async function verifyAnswer(
	question: string,
	options: { text: string }[],
	claim: SolverOutput
): Promise<VerifierOutput> {
	const userContent = [
		"Question:",
		question,
		"",
		"Options:",
		formatOptionsForLLM(options),
		"",
		`Claimed answer: ${claim.correctAnswer}`,
		`Claimed reasoning: ${claim.reasoning}`
	].join("\n")

	const message = await withBackoff("verify", () =>
		client.messages.create({
			model: VERIFY_MODEL,
			max_tokens: VERIFY_MAX_TOKENS,
			temperature: 0,
			system: VERIFY_SYSTEM,
			tools: [VERIFY_TOOL],
			tool_choice: { type: "tool", name: VERIFY_TOOL_NAME },
			messages: [{ role: "user", content: userContent }]
		})
	)

	let toolInput: unknown
	for (const block of message.content) {
		if (block.type === "tool_use" && block.name === VERIFY_TOOL_NAME) {
			toolInput = block.input
			break
		}
	}
	if (toolInput === undefined) {
		throw new Error(`no ${VERIFY_TOOL_NAME} tool_use block in verify response`)
	}

	const parsed = verifierOutput.safeParse(toolInput)
	if (!parsed.success) {
		throw new Error(`verifier Zod validation failed: ${JSON.stringify(parsed.error.issues)}`)
	}
	return parsed.data
}

export type { SolverOutput, VerifierOutput }
export { indexForLetter, letterForIndex, solveQuestion, verifyAnswer }
