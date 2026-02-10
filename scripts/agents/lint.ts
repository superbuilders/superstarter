#!/usr/bin/env bun
/**
 * scripts/agents/lint.ts
 *
 * Runs biome lint with JSON output, groups violations by (file, rule),
 * and uses Claude Agent SDK to fan out fixes to parallel subagents.
 *
 * Usage:
 *   bun run scripts/agents/lint.ts          # dry-run: show violations
 *   bun run scripts/agents/lint.ts --fix    # fix violations with agents
 */

import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"
import * as errors from "@superbuilders/errors"
import type { Logger } from "@superbuilders/slog"
import { query } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"

/**
 * Custom logger that writes to stderr so stdout remains pure JSON.
 * Implements the Logger interface from @superbuilders/slog.
 */
const LOG_PREFIX = "agents/lint"

function formatLogData(data?: Record<string, unknown>): string {
	if (data === undefined) {
		return ""
	}
	return ` ${JSON.stringify(data)}`
}

const logger: Logger = {
	debug(message: string, data?: Record<string, unknown>): void {
		process.stderr.write(`DEBUG ${LOG_PREFIX}: ${message}${formatLogData(data)}\n`)
	},
	info(message: string, data?: Record<string, unknown>): void {
		process.stderr.write(`INFO ${LOG_PREFIX}: ${message}${formatLogData(data)}\n`)
	},
	warn(message: string, data?: Record<string, unknown>): void {
		process.stderr.write(`WARN ${LOG_PREFIX}: ${message}${formatLogData(data)}\n`)
	},
	error(message: string, data?: Record<string, unknown>): void {
		process.stderr.write(`ERROR ${LOG_PREFIX}: ${message}${formatLogData(data)}\n`)
	}
}

type GritRule = {
	name: string
	content: string
}

type MdcDoc = {
	name: string
	content: string
}

/**
 * Load ALL .grit rules from the gritql directory.
 */
async function loadAllGritRules(): Promise<GritRule[]> {
	const gritqlDir = join(process.cwd(), "gritql")
	const rules: GritRule[] = []

	const filesResult = await errors.try(readdir(gritqlDir))
	if (filesResult.error) {
		logger.error("read gritql directory", { error: String(filesResult.error) })
		throw filesResult.error
	}

	const gritFiles = filesResult.data.filter((f) => f.endsWith(".grit"))

	for (const file of gritFiles) {
		const ruleName = file.replace(".grit", "")
		const gritPath = join(gritqlDir, file)

		const gritResult = await errors.try(readFile(gritPath, "utf-8"))
		if (!gritResult.error) {
			rules.push({ name: ruleName, content: gritResult.data })
		}
	}

	logger.info("loaded grit rules", { count: rules.length })
	return rules
}

/**
 * Load ALL .mdc documentation files from the rules directory.
 */
async function loadAllMdcDocs(): Promise<MdcDoc[]> {
	const rulesDir = join(process.cwd(), "rules")
	const docs: MdcDoc[] = []

	const filesResult = await errors.try(readdir(rulesDir))
	if (filesResult.error) {
		logger.error("read rules directory", { error: String(filesResult.error) })
		throw filesResult.error
	}

	const mdcFiles = filesResult.data.filter((f) => f.endsWith(".mdc"))

	for (const file of mdcFiles) {
		const docName = file.replace(".mdc", "")
		const mdcPath = join(rulesDir, file)

		const mdcResult = await errors.try(readFile(mdcPath, "utf-8"))
		if (!mdcResult.error) {
			docs.push({ name: docName, content: mdcResult.data })
		}
	}

	logger.info("loaded mdc docs", { count: docs.length })
	return docs
}

/**
 * Build a set of grit rule names for filtering valid plugin groups.
 */
function buildGritRuleSet(rules: GritRule[]): Set<string> {
	return new Set(rules.map((r) => r.name))
}

/**
 * Build the STATIC system prompt containing ALL GritQL rules and ALL MDC documentation.
 * Load the biome configuration (base.json).
 */
async function loadBiomeConfig(): Promise<string> {
	const biomePath = join(process.cwd(), "biome/base.json")

	const result = await errors.try(readFile(biomePath, "utf-8"))
	if (result.error) {
		logger.warn("could not load biome config", { error: String(result.error) })
		return ""
	}

	logger.info("loaded biome config", { path: "biome/base.json" })
	return result.data
}

async function loadSuperLintScript(): Promise<string> {
	const scriptPath = join(process.cwd(), "scripts/super-lint.ts")

	const result = await errors.try(readFile(scriptPath, "utf-8"))
	if (result.error) {
		logger.warn("could not load super-lint script", {
			error: String(result.error)
		})
		return ""
	}

	logger.info("loaded super-lint script", { path: "scripts/super-lint.ts" })
	return result.data
}

/**
 * Build the STATIC system prompt containing ALL GritQL rules, ALL MDC documentation, and biome config.
 * This is the same for every agent, enabling prompt caching.
 * All agents (plugin and non-plugin) get this so they don't introduce any violations.
 */
function buildStaticSystemPrompt(
	gritRules: GritRule[],
	mdcDocs: MdcDoc[],
	biomeConfig: string,
	superLintScript: string
): string {
	let prompt = `You are a lint fixer. You will be given violations to fix in a specific file.

## CRITICAL INSTRUCTIONS

### THE CARDINAL SIN: DO NOT CHANGE CODE YOU HAVEN'T READ

Before fixing ANYTHING, you MUST:
1. Read the ENTIRE file thoroughly
2. Trace the dependency chain - read imported modules, parent functions, callers
3. Understand the full context of WHY the code exists
4. Only THEN make your fix

Changing code without fully understanding it is the cardinal sin. If you're unsure about a fix, read more code first. Use Glob and Grep to find usages. Read parent files. Understand the data flow.

### FIXING RULES

1. Fix ONLY the violations you are assigned
2. Do NOT fix violations of any other rule
3. Do NOT introduce violations of ANY rule while fixing (including the GritQL rules below)
3. Do NOT introduce violations of ANY rule while fixing (including the GritQL rules and Biome rules below)
4. Preserve existing behavior - only change what's necessary for the fix
5. Use the Edit tool to make changes

## BIOME CONFIGURATION

Below is the Biome linter configuration. You MUST NOT introduce violations of any of these rules.

\`\`\`json
${biomeConfig}
\`\`\`

## CODEBASE DOCUMENTATION

Below is ALL the documentation for this codebase. You MUST follow these guidelines when making any changes.

`

	for (const doc of mdcDocs) {
		prompt += `### ${doc.name}\n\n${doc.content}\n\n---\n\n`
	}

	prompt += `## ALL GRITQL LINT RULES

Below are ALL the custom GritQL lint rules in this codebase. You MUST understand them ALL to avoid introducing new violations while fixing ANY lint issue.

`

	for (const rule of gritRules) {
		prompt += `### Rule: ${rule.name}\n\n`
		prompt += `**GritQL Pattern:**\n\`\`\`grit\n${rule.content}\`\`\`\n\n`
		prompt += "---\n\n"
	}

	prompt += `## SUPER-LINT (Type-Aware Linter)

Below is the super-lint script. These are TypeScript type-checker based lint rules. You MUST NOT introduce violations of these rules.

\`\`\`typescript
${superLintScript}
\`\`\`

`

	return prompt
}

/**
 * Build task prompt for a PLUGIN (GritQL) violation group.
 * Tells agent to fix ONLY this specific rule.
 */
async function buildPluginTaskPrompt(group: ViolationGroup): Promise<string> {
	const fileResult = await errors.try(readFile(join(process.cwd(), group.file), "utf-8"))

	let prompt = `## YOUR TASK

Fix ONLY the "${group.rule}" GritQL rule in this file. There are ${group.violations.length} violation(s).

**File:** ${group.file}
**Rule to fix:** ${group.rule}
**Violation spans:** ${group.violations
		.map(function formatSpan(v: Violation) {
			return `[${v.span[0]}, ${v.span[1]}]`
		})
		.join(", ")}

REMEMBER:
- Fix ONLY "${group.rule}" - do not touch other code
- Do NOT introduce violations of any other rule listed in your instructions
- Create a todo list to track each violation you need to fix

`

	if (!fileResult.error) {
		prompt += `## FILE CONTENT\n\n\`\`\`typescript\n${fileResult.data}\`\`\`\n`
	}

	return prompt
}

/**
 * Build task prompt for a NON-PLUGIN (built-in Biome) violation group.
 * Tells agent to fix the biome rule violations but not introduce GritQL violations.
 */
async function buildBiomeTaskPrompt(group: ViolationGroup): Promise<string> {
	const fileResult = await errors.try(readFile(join(process.cwd(), group.file), "utf-8"))

	let prompt = `## YOUR TASK

Fix the Biome lint rule "${group.rule}" in this file. There are ${group.violations.length} violation(s).

**File:** ${group.file}
**Biome rule to fix:** ${group.rule}
**Rule description:** ${group.description}
**Violation spans:** ${group.violations
		.map(function formatSpan(v: Violation) {
			return `[${v.span[0]}, ${v.span[1]}]`
		})
		.join(", ")}

REMEMBER:
- Fix ONLY the "${group.rule}" violations
- Do NOT introduce violations of any GritQL rule listed in your instructions
- The GritQL rules in your instructions are STRICT - do not use ??, ||, inline ternaries, etc.
- Create a todo list to track each violation you need to fix

`

	if (!fileResult.error) {
		prompt += `## FILE CONTENT\n\n\`\`\`typescript\n${fileResult.data}\`\`\`\n`
	}

	return prompt
}

/**
 * Load MDC documentation for a specific super-lint rule if it exists.
 */
async function loadSuperLintRuleMdc(ruleName: string): Promise<string | undefined> {
	const mdcPath = join(process.cwd(), "rules", `${ruleName}.mdc`)
	const result = await errors.try(readFile(mdcPath, "utf-8"))
	if (result.error) {
		return undefined
	}
	return result.data
}

/**
 * Build task prompt for a SUPER-LINT (type-aware) violation group.
 * These are TypeScript type-checker based rules.
 * Includes the MDC documentation for the rule if it exists.
 */
async function buildSuperLintTaskPrompt(group: ViolationGroup): Promise<string> {
	const fileResult = await errors.try(readFile(join(process.cwd(), group.file), "utf-8"))
	const mdcContent = await loadSuperLintRuleMdc(group.rule)

	let prompt = `## YOUR TASK

Fix the super-lint rule "${group.rule}" in this file. There are ${group.violations.length} violation(s).

**File:** ${group.file}
**Rule to fix:** ${group.rule}
**Rule description:** ${group.description}
**Violation locations (line, column):** ${group.violations
		.map(function formatSpan(v: Violation) {
			return `[${v.span[0]}, ${v.span[1]}]`
		})
		.join(", ")}

`

	if (mdcContent) {
		prompt += `## RULE DOCUMENTATION

The following documentation explains this rule and how to fix it. **You MUST follow these guidelines.**

${mdcContent}

---

`
	}

	prompt += `REMEMBER:
- Fix ONLY the "${group.rule}" violations
- Do NOT introduce violations of any GritQL rule listed in your instructions
- Do NOT introduce violations of any Biome rule listed in your instructions
- When fixing, ensure consistency throughout the entire data flow chain (trace where values come from and go to)
- Create a todo list to track each violation you need to fix

`

	if (!fileResult.error) {
		prompt += `## FILE CONTENT\n\n\`\`\`typescript\n${fileResult.data}\`\`\`\n`
	}

	return prompt
}

const BiomeDiagnosticSchema = z.object({
	category: z.string(),
	severity: z.string(),
	description: z.string(),
	location: z.object({
		path: z.object({
			file: z.string()
		}),
		span: z.tuple([z.number(), z.number()]),
		sourceCode: z.string().optional()
	})
})

const BiomeOutputSchema = z.object({
	summary: z.record(z.string(), z.unknown()),
	diagnostics: z.array(BiomeDiagnosticSchema),
	command: z.string()
})

type Violation = {
	span: [number, number]
}

type ViolationCategory = "plugin" | "biome" | "super-lint"

type ViolationGroup = {
	file: string
	rule: string
	description: string
	violations: Violation[]
	category: ViolationCategory
}

type GroupedOutput = {
	pluginGroups: ViolationGroup[]
	biomeGroups: ViolationGroup[]
	superLintGroups: ViolationGroup[]
	summary: {
		totalFiles: number
		totalPluginRules: number
		totalBiomeRules: number
		totalSuperLintRules: number
		totalPluginViolations: number
		totalBiomeViolations: number
		totalSuperLintViolations: number
	}
}

/**
 * Extract rule name from description.
 * GritQL plugins reference their .mdc file: "READ `rules/no-logical-or-fallback.mdc`"
 * Biome rules use their category path like "lint/style/noNonNullAssertion"
 */
function extractRuleName(description: string, category: string): string {
	if (category === "plugin") {
		const mdcMatch = description.match(/`rules\/([^`]+)\.mdc`/)
		if (mdcMatch?.[1]) {
			return mdcMatch[1]
		}

		const gritMatch = description.match(/([a-z]+-[a-z-]+)/)
		if (gritMatch?.[1]) {
			return gritMatch[1]
		}
	}

	const parts = category.split("/")
	const lastPart = parts[parts.length - 1]
	if (parts.length >= 2 && lastPart) {
		return lastPart
	}

	return category
}

interface SuperLintViolation {
	file: string
	line: number
	column: number
	rule: string
	message: string
	suggestion?: string
}

async function collectSuperLintViolations(): Promise<ViolationGroup[]> {
	logger.info("running super-lint")

	const proc = Bun.spawn(["bun", "scripts/super-lint.ts", "--json"], {
		cwd: process.cwd(),
		stdout: "pipe",
		stderr: "pipe"
	})

	const stdout = await new Response(proc.stdout).text()
	const stderr = await new Response(proc.stderr).text()

	await proc.exited

	if (stderr) {
		logger.debug("super-lint stderr", { stderr: stderr.slice(0, 500) })
	}

	if (!stdout.trim()) {
		logger.info("no output from super-lint")
		return []
	}

	const parseResult = errors.trySync(() => JSON.parse(stdout))
	if (parseResult.error) {
		logger.error("parse super-lint output", {
			error: String(parseResult.error)
		})
		return []
	}

	if (!parseResult.data.violations) {
		logger.error("super-lint output missing violations field", {
			data: parseResult.data
		})
		return []
	}
	const violations: SuperLintViolation[] = parseResult.data.violations
	logger.info("super-lint violations", { count: violations.length })

	const groupMap = new Map<string, ViolationGroup>()
	for (const v of violations) {
		const key = `${v.file}::${v.rule}`

		if (!groupMap.has(key)) {
			groupMap.set(key, {
				file: v.file.replace(`${process.cwd()}/`, ""),
				rule: v.rule,
				description: v.message,
				violations: [],
				category: "super-lint"
			})
		}

		const group = groupMap.get(key)
		if (group) {
			group.violations.push({ span: [v.line, v.column] })
		}
	}

	return Array.from(groupMap.values())
}

async function collectViolations(): Promise<GroupedOutput> {
	logger.info("running biome lint")

	const proc = Bun.spawn(["bun", "--bun", "biome", "lint", "--reporter=json"], {
		cwd: process.cwd(),
		stdout: "pipe",
		stderr: "pipe"
	})

	const stdout = await new Response(proc.stdout).text()
	const stderr = await new Response(proc.stderr).text()

	await proc.exited

	if (stderr) {
		logger.debug("biome stderr", { stderr: stderr.slice(0, 500) })
	}

	function sumViolations(sum: number, g: ViolationGroup) {
		return sum + g.violations.length
	}

	if (!stdout.trim()) {
		logger.info("no output from biome")
		const superLintGroups = await collectSuperLintViolations()
		const totalSuperLintViolations = superLintGroups.reduce(sumViolations, 0)
		return {
			pluginGroups: [],
			biomeGroups: [],
			superLintGroups,
			summary: {
				totalFiles: new Set(superLintGroups.map((g) => g.file)).size,
				totalPluginRules: 0,
				totalBiomeRules: 0,
				totalSuperLintRules: new Set(superLintGroups.map((g) => g.rule)).size,
				totalPluginViolations: 0,
				totalBiomeViolations: 0,
				totalSuperLintViolations
			}
		}
	}

	const parseResult = errors.trySync(() => JSON.parse(stdout))
	if (parseResult.error) {
		logger.error("parse biome output", { error: String(parseResult.error) })
		throw errors.wrap(parseResult.error, "parse biome output")
	}

	const validationResult = BiomeOutputSchema.safeParse(parseResult.data)
	if (!validationResult.success) {
		logger.error("validate biome output", { error: validationResult.error })
		throw errors.wrap(validationResult.error, "validate biome output")
	}

	const biomeOutput = validationResult.data
	const diagnostics = biomeOutput.diagnostics

	logger.info("parsed diagnostics", { count: diagnostics.length })

	function isPluginDiagnostic(d: z.infer<typeof BiomeDiagnosticSchema>) {
		return d.category === "plugin"
	}
	function isNonPluginDiagnostic(d: z.infer<typeof BiomeDiagnosticSchema>) {
		return d.category !== "plugin"
	}
	const pluginDiagnostics = diagnostics.filter(isPluginDiagnostic)
	const biomeDiagnostics = diagnostics.filter(isNonPluginDiagnostic)

	logger.info("plugin diagnostics", { count: pluginDiagnostics.length })
	logger.info("biome diagnostics", { count: biomeDiagnostics.length })

	const pluginGroupMap = new Map<string, ViolationGroup>()
	for (const diag of pluginDiagnostics) {
		const file = diag.location.path.file
		const rule = extractRuleName(diag.description, diag.category)
		const key = `${file}::${rule}`

		if (!pluginGroupMap.has(key)) {
			pluginGroupMap.set(key, {
				file,
				rule,
				description: diag.description,
				violations: [],
				category: "plugin"
			})
		}

		const group = pluginGroupMap.get(key)
		if (group) {
			group.violations.push({ span: diag.location.span })
		}
	}

	const biomeGroupMap = new Map<string, ViolationGroup>()
	for (const diag of biomeDiagnostics) {
		const file = diag.location.path.file
		const rule = extractRuleName(diag.description, diag.category)
		const key = `${file}::${rule}`

		if (!biomeGroupMap.has(key)) {
			biomeGroupMap.set(key, {
				file,
				rule,
				description: diag.description,
				violations: [],
				category: "biome"
			})
		}

		const group = biomeGroupMap.get(key)
		if (group) {
			group.violations.push({ span: diag.location.span })
		}
	}

	const superLintGroups = await collectSuperLintViolations()

	const pluginGroups = Array.from(pluginGroupMap.values())
	const biomeGroups = Array.from(biomeGroupMap.values())

	const allGroups = [...pluginGroups, ...biomeGroups, ...superLintGroups]
	const uniqueFiles = new Set(allGroups.map((g) => g.file))
	const uniquePluginRules = new Set(pluginGroups.map((g) => g.rule))
	const uniqueBiomeRules = new Set(biomeGroups.map((g) => g.rule))
	const uniqueSuperLintRules = new Set(superLintGroups.map((g) => g.rule))
	const totalSuperLintViolations = superLintGroups.reduce(sumViolations, 0)

	const output: GroupedOutput = {
		pluginGroups,
		biomeGroups,
		superLintGroups,
		summary: {
			totalFiles: uniqueFiles.size,
			totalPluginRules: uniquePluginRules.size,
			totalBiomeRules: uniqueBiomeRules.size,
			totalSuperLintRules: uniqueSuperLintRules.size,
			totalPluginViolations: pluginDiagnostics.length,
			totalBiomeViolations: biomeDiagnostics.length,
			totalSuperLintViolations
		}
	}

	return output
}

/**
 * Execute a single agent query and consume all messages.
 * Returns the final result message if successful.
 */
async function executeAgentQuery(taskPrompt: string, systemPrompt: string): Promise<string> {
	let resultMessage = ""
	for await (const message of query({
		prompt: taskPrompt,
		options: {
			model: "claude-opus-4-6",
			allowedTools: ["Read", "Edit", "Glob", "Grep", "TodoWrite"],
			systemPrompt
		}
	})) {
		if ("result" in message) {
			resultMessage = message.result
		}
	}
	return resultMessage
}

/**
 * Run a single agent with retry logic using errors.try pattern.
 * Returns success status and result message.
 */
async function runAgentWithRetry(
	group: ViolationGroup,
	systemPrompt: string,
	totalAgents: number,
	completedRef: { count: number },
	agentStartTime: number
): Promise<{ success: boolean; result: string }> {
	const ruleType = group.category
	const maxRetries = 3

	const taskPromptResult =
		group.category === "plugin"
			? await errors.try(buildPluginTaskPrompt(group))
			: group.category === "super-lint"
				? await errors.try(buildSuperLintTaskPrompt(group))
				: await errors.try(buildBiomeTaskPrompt(group))
	if (taskPromptResult.error) {
		logger.error("build task prompt", {
			error: String(taskPromptResult.error),
			file: group.file
		})
		return { success: false, result: "" }
	}
	const taskPrompt = taskPromptResult.data

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const queryResult = await errors.try(executeAgentQuery(taskPrompt, systemPrompt))
		if (!queryResult.error) {
			completedRef.count++
			const agentDuration = Math.round((performance.now() - agentStartTime) / 1000)
			logger.info("agent completed", {
				file: group.file,
				rule: group.rule,
				type: ruleType,
				durationSec: agentDuration,
				progress: `${completedRef.count}/${totalAgents}`,
				remaining: totalAgents - completedRef.count,
				attempt
			})
			return { success: true, result: queryResult.data }
		}

		const errStr = String(queryResult.error)
		const rateLimitKeywords = ["rate", "429", "overloaded"]
		const isRateLimit = rateLimitKeywords.some((keyword) => errStr.includes(keyword))
		const retryableKeywords = ["timeout", "ECONNRESET"]
		const hasRetryableKeyword = retryableKeywords.some((keyword) => errStr.includes(keyword))
		let isRetryable = false
		if (isRateLimit || hasRetryableKeyword) {
			isRetryable = true
		}

		if (isRetryable && attempt < maxRetries) {
			const backoffMs = Math.min(1000 * 2 ** attempt, 30000)
			logger.warn("agent error, retrying", {
				file: group.file,
				rule: group.rule,
				type: ruleType,
				attempt,
				maxRetries,
				backoffMs,
				error: errStr.slice(0, 200),
				isRateLimit
			})
			await new Promise(function delayResolve(resolve) {
				setTimeout(resolve, backoffMs)
			})
		} else {
			const agentDuration = Math.round((performance.now() - agentStartTime) / 1000)
			logger.error("agent failed permanently", {
				file: group.file,
				rule: group.rule,
				type: ruleType,
				durationSec: agentDuration,
				error: errStr,
				progress: `${completedRef.count}/${totalAgents}`
			})
			return { success: false, result: "" }
		}
	}

	return { success: false, result: "" }
}

/**
 * Fix violations using Claude Agent SDK with parallel subagents.
 * Uses a STATIC system prompt (cacheable) with all GritQL rules and MDC docs.
 * Plugin violations get "fix ONLY this rule" prompts.
 * Biome violations get "fix this biome rule but don't break GritQL rules" prompts.
 * Launches all agents directly in parallel via Promise.all.
 */
async function fixWithSubagents(output: GroupedOutput): Promise<void> {
	const allGroups = [...output.pluginGroups, ...output.biomeGroups, ...output.superLintGroups]
	logger.info("preparing agents", {
		total: allGroups.length,
		plugin: output.pluginGroups.length,
		biome: output.biomeGroups.length,
		superLint: output.superLintGroups.length
	})

	const gritRules = await loadAllGritRules()
	const mdcDocs = await loadAllMdcDocs()
	const biomeConfig = await loadBiomeConfig()
	const superLintScript = await loadSuperLintScript()
	const gritRuleSet = buildGritRuleSet(gritRules)

	const systemPrompt = buildStaticSystemPrompt(gritRules, mdcDocs, biomeConfig, superLintScript)
	logger.info("built static system prompt", {
		length: systemPrompt.length,
		gritRules: gritRules.length,
		mdcDocs: mdcDocs.length
	})

	const validPluginGroups = output.pluginGroups.filter((g) => gritRuleSet.has(g.rule))

	logger.info("valid groups after filtering", {
		originalPlugin: output.pluginGroups.length,
		filteredPlugin: validPluginGroups.length,
		biome: output.biomeGroups.length,
		superLint: output.superLintGroups.length
	})

	const allValidGroups = [...validPluginGroups, ...output.biomeGroups, ...output.superLintGroups]
	if (allValidGroups.length === 0) {
		logger.info("no violations to fix")
		return
	}

	const totalAgents = allValidGroups.length
	const completedRef = { count: 0 }
	const startTime = performance.now()

	logger.info("launching agents in parallel", { count: totalAgents })

	const agentPromises: Promise<{
		success: boolean
		result: string
		file: string
	}>[] = []
	for (const group of allValidGroups) {
		const agentStartTime = performance.now()
		logger.info("starting agent", {
			file: group.file,
			rule: group.rule,
			type: group.category,
			violations: group.violations.length,
			progress: `${completedRef.count}/${totalAgents}`
		})

		const promise = runAgentWithRetry(
			group,
			systemPrompt,
			totalAgents,
			completedRef,
			agentStartTime
		).then((agentResult) => ({ ...agentResult, file: group.file }))

		agentPromises.push(promise)
	}

	const results = await Promise.all(agentPromises)

	for (const result of results) {
		if (result.success && result.result) {
			process.stdout.write(`[${result.file}] ${result.result}\n`)
		}
	}

	function isFailedResult(r: { success: boolean; result: string; file: string }) {
		return !r.success
	}
	const succeeded = results.filter((r) => r.success).length
	const failed = results.filter(isFailedResult).length

	const totalDuration = Math.round((performance.now() - startTime) / 1000)
	logger.info("all agents completed", {
		total: totalAgents,
		succeeded,
		failed,
		durationSec: totalDuration,
		avgSecPerAgent: Math.round(totalDuration / totalAgents)
	})
}

async function main(): Promise<void> {
	const args = process.argv.slice(2)
	const shouldFix = args.includes("--fix")

	const output = await collectViolations()

	const totalViolations =
		output.summary.totalPluginViolations +
		output.summary.totalBiomeViolations +
		output.summary.totalSuperLintViolations
	if (totalViolations === 0) {
		logger.info("no violations found")
		return
	}

	if (shouldFix) {
		await fixWithSubagents(output)
	} else {
		logger.info("violations found", { output })
		logger.info("run with --fix to fix violations")
	}
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script execution", { error: String(result.error) })
	process.exit(1)
}
