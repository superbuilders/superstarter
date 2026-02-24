import { anthropic } from "@ai-sdk/anthropic"
import { globTool, grepTool, readTool } from "@/lib/agent/fs/tools"

const MAX_STEPS = 20 as const

const model = anthropic("claude-sonnet-4-6")

const tools = {
	read: readTool,
	glob: globTool,
	grep: grepTool
} as const

type JudgeContext = {
	approach: string
	analysisOutput: string
	githubRepoUrl: string
	githubBranch: string
}

function buildInstructions(ctx: JudgeContext): string {
	return [
		"You are a code review judge that evaluates proposed approaches against 5 criteria:",
		"security, bugs, backwards compatibility, performance, and code quality.",
		"",
		"## Your Task",
		"Use the read, glob, and grep tools to examine the codebase, then evaluate the proposed",
		"approach below. Read relevant files before making judgments — ground your findings in code.",
		"",
		"## Evaluation Criteria",
		"",
		"### 1. Security",
		"- Injection vulnerabilities (SQL, XSS, command injection)",
		"- Authentication/authorization gaps",
		"- Secrets exposure, unsafe deserialization",
		"- Missing input validation at trust boundaries",
		"",
		"### 2. Bugs",
		"- Logic errors, off-by-one, null/undefined mishandling",
		"- Race conditions, deadlocks, resource leaks",
		"- Unhandled edge cases, missing error propagation",
		"",
		"### 3. Backwards Compatibility",
		"- Breaking changes to public APIs, exported types, or DB schemas",
		"- Removed or renamed exports that other modules depend on",
		"- Changed function signatures, return types, or event shapes",
		"",
		"### 4. Performance",
		"- N+1 queries, missing indexes, unbounded data fetching",
		"- Unnecessary re-renders, missing memoization in hot paths",
		"- Memory leaks, large allocations, blocking the event loop",
		"",
		"### 5. Code Quality (Project-Enforced Patterns)",
		"This project enforces strict lint rules via `bun lint`. Flag violations of:",
		"- No try/catch — use `errors.try()` / `errors.trySync()` with `errors.wrap()`",
		"- No `new Error()` — use `errors.new()` sentinel pattern",
		"- No arrow functions — use named function declarations",
		"- No inline exports — use `export { }` at end of file",
		"- No `??` nullish coalescing — fix the source instead",
		"- No `||` for fallbacks — only in boolean conditions",
		"- No inline styles — Tailwind only",
		"- No `as` type assertions (except `as const` and DOM types)",
		"- No classes — use ESM modules with factory functions",
		"- No optional arrays — use empty `[]` as the empty state",
		"- Logger calls must precede every throw statement",
		"- Structured logging via `@superbuilders/slog`, never `console.*`",
		"",
		"## Environment",
		`- GitHub repo: ${ctx.githubRepoUrl}`,
		`- Branch: ${ctx.githubBranch}`,
		"",
		"## Proposed Approach",
		ctx.approach,
		"",
		"## Analysis Output",
		ctx.analysisOutput,
		"",
		"## Required Output Format",
		"After examining the codebase, respond with a JSON object matching this exact schema:",
		"```json",
		"{",
		'    "findings": [',
		"        {",
		'            "criterion": "security" | "bugs" | "compatibility" | "performance" | "quality",',
		'            "severity": "critical" | "major" | "minor",',
		'            "description": "Clear description of the issue found",',
		'            "recommendation": "Specific fix or mitigation"',
		"        }",
		"    ],",
		'    "overallAssessment": "Summary of the approach quality and key risks"',
		"}",
		"```",
		"",
		"Include findings for ALL 5 criteria. If a criterion has no issues, omit it.",
		"Severity guide:",
		"- critical: Must fix before merging. Security holes, data loss, breaking changes.",
		"- major: Should fix. Bugs, performance regressions, significant pattern violations.",
		"- minor: Nice to fix. Style issues, minor optimizations, non-blocking quality concerns."
	].join("\n")
}

type JudgeTools = typeof tools

export { MAX_STEPS, buildInstructions, model, tools }
export type { JudgeContext, JudgeTools }
