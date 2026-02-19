# Agent System Foundation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the foundation layer for the multi-agent developer tooling system — dependencies, DB schema, config resolution, tool definitions, agent factories, and the codebase onboarding primitive.

**Architecture:** Inngest AgentKit agents defined as factory functions with runtime-configurable models and prompts. Tools are `createTool()` wrappers around filesystem and shell operations. The onboarding primitive runs parallel Inngest steps, each spawning a single-agent network for one codebase slice, then consolidates results into a typed `CodebaseContext`.

**Tech Stack:** `@inngest/agent-kit`, `inngest`, `drizzle-orm` (PostgreSQL), `zod`, `bun:test`

**Design Reference:** `docs/plans/2026-02-19-agent-architecture-design.md`

**Scope:** This plan covers foundation through codebase onboarding (Phase 1 of the feature pipeline). Concept networks, judge panel, implementation phase, debug network, and dashboard are separate plans.

**Codebase conventions to follow (see CLAUDE.md + rules/):**
- Function declarations, never arrow functions (except trivial inline callbacks)
- `errors.try()` / `errors.trySync()` with immediate `if (result.error)` — never try/catch
- `logger.error()` before every throw — never silent errors
- `export { }` at bottom of file — never inline exports
- `@/` prefix for all imports — never relative imports
- Tabs, double quotes, no semicolons, trailing commas: none
- No classes — ESM modules with factory functions
- No `as` type assertions (except `as const`)
- No `??` nullish coalescing, no `||` for fallbacks
- No barrel files — import directly from defining module
- In Inngest functions, use `logger` parameter, not imported slog
- AgentKit tool optional parameters use `.nullable()` not `.optional()` (JSON Schema compat)

---

## Task 1: Install dependencies and configure environment

**Files:**
- Modify: `package.json`
- Modify: `src/env.ts:8-25`

**Step 1: Install @inngest/agent-kit**

```bash
bun add @inngest/agent-kit
```

**Step 2: Add API key environment variables**

In `src/env.ts`, add to the `server` section after `DATABASE_URL`:

```typescript
ANTHROPIC_API_KEY: z.string().min(1).optional(),
OPENAI_API_KEY: z.string().min(1).optional(),
GEMINI_API_KEY: z.string().min(1).optional(),
```

Add to `runtimeEnv` section:

```typescript
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
OPENAI_API_KEY: process.env.OPENAI_API_KEY,
GEMINI_API_KEY: process.env.GEMINI_API_KEY,
```

**Step 3: Verify typecheck passes**

```bash
bun typecheck
```

Expected: no errors.

**Step 4: Commit**

```bash
git add package.json bun.lock src/env.ts
git commit -m "feat: install @inngest/agent-kit and add LLM API key env vars"
```

---

## Task 2: Add agent event schemas to Inngest client

**Files:**
- Modify: `src/inngest/index.ts`

**Step 1: Add agent event schemas**

Add these Zod schemas to the `schema` object in `src/inngest/index.ts`:

```typescript
"agent/feature.requested": z.object({
	feature: z.string().min(1),
	baseBranch: z.string().default("main"),
	branchName: z.string().min(1),
	presetId: z.string().uuid().nullable(),
	configOverrides: z.record(z.string(), z.unknown()).nullable(),
	targetPath: z.string().nullable(),
}),
"agent/feature.feedback": z.object({
	runId: z.string().uuid(),
	feedback: z.string().min(1),
}),
"agent/feature.approved": z.object({
	runId: z.string().uuid(),
}),
"agent/implementation.feedback": z.object({
	runId: z.string().uuid(),
	feedback: z.string().min(1),
}),
"agent/implementation.approved": z.object({
	runId: z.string().uuid(),
	merge: z.boolean(),
}),
"agent/debug.escalation": z.object({
	runId: z.string().uuid(),
	failure: z.string(),
	attempts: z.array(z.object({
		hypothesis: z.string(),
		fix: z.string(),
		result: z.string(),
	})),
}),
```

**Step 2: Verify typecheck**

```bash
bun typecheck
```

**Step 3: Commit**

```bash
git add src/inngest/index.ts
git commit -m "feat: add agent pipeline event schemas to Inngest client"
```

---

## Task 3: Add agent database tables

**Files:**
- Modify: `src/db/schemas/core.ts`

**Step 1: Add agent tables**

Add these table definitions to `src/db/schemas/core.ts` after existing tables. Use the existing `coreSchema` and existing patterns (uuid PKs, timestamps).

```typescript
import {
	boolean,
	integer,
	jsonb,
	numeric,
	pgSchema,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core"

// --- Agent Presets ---
const coreAgentPresets = coreSchema.table("agent_preset", {
	id: uuid().primaryKey().defaultRandom(),
	name: varchar({ length: 255 }).notNull(),
	workflowType: varchar("workflow_type", { length: 64 }).notNull(),
	config: jsonb().notNull(),
	isDefault: boolean("is_default").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// --- Judge Personalities ---
const coreJudgePersonalities = coreSchema.table("judge_personality", {
	id: uuid().primaryKey().defaultRandom(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 64 }).notNull().unique(),
	persona: text().notNull(),
	evaluationFocus: text("evaluation_focus").notNull(),
	model: jsonb().notNull(),
	isActive: boolean("is_active").notNull().default(true),
	isBuiltIn: boolean("is_built_in").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// --- Workflow Runs ---
const coreWorkflowRuns = coreSchema.table("workflow_run", {
	id: uuid().primaryKey().defaultRandom(),
	feature: text().notNull(),
	branchName: varchar("branch_name", { length: 255 }).notNull(),
	worktreePath: varchar("worktree_path", { length: 500 }),
	worktreeStatus: varchar("worktree_status", { length: 32 }).notNull().default("pending"),
	status: varchar({ length: 32 }).notNull().default("running"),
	phase: varchar({ length: 32 }).notNull().default("onboarding"),
	presetId: uuid("preset_id"),
	configSnapshot: jsonb("config_snapshot").notNull(),
	judgeIds: jsonb("judge_ids").notNull().default([]),
	result: jsonb(),
	verificationReport: jsonb("verification_report"),
	debugTraces: jsonb("debug_traces"),
	feedback: text(),
	inngestRunId: varchar("inngest_run_id", { length: 255 }),
	totalTokens: integer("total_tokens").notNull().default(0),
	estimatedCost: numeric("estimated_cost", { precision: 10, scale: 4 }).notNull().default("0"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
```

Add these to the file's `export { }` block at the bottom:

```typescript
export { coreAgentPresets, coreJudgePersonalities, coreWorkflowRuns }
```

**Step 2: Verify typecheck**

```bash
bun typecheck
```

**Step 3: Commit**

```bash
git add src/db/schemas/core.ts
git commit -m "feat: add agent_preset, judge_personality, and workflow_run DB tables"
```

**Note:** Do NOT run `bun db:generate`. Migrations are human-reviewed per CLAUDE.md.

---

## Task 4: Config system — types and resolution

**Files:**
- Create: `src/agents/config.ts`
- Create: `src/agents/config.test.ts`

**Step 1: Write the failing test**

```typescript
// src/agents/config.test.ts
import { describe, expect, test } from "bun:test"
import {
	applyOverrides,
	DEFAULT_CONFIG,
	type WorkflowConfig,
} from "@/agents/config"

describe("DEFAULT_CONFIG", () => {
	test("has all required agent keys", () => {
		expect(DEFAULT_CONFIG.explorer).toBeDefined()
		expect(DEFAULT_CONFIG.specialist).toBeDefined()
		expect(DEFAULT_CONFIG.concept).toBeDefined()
		expect(DEFAULT_CONFIG.critic).toBeDefined()
		expect(DEFAULT_CONFIG.reviewer).toBeDefined()
		expect(DEFAULT_CONFIG.implementer).toBeDefined()
	})

	test("each agent has model and systemPrompt", () => {
		for (const key of Object.keys(DEFAULT_CONFIG)) {
			const agentKey = key as keyof WorkflowConfig
			const agent = DEFAULT_CONFIG[agentKey]
			expect(agent.model).toBeDefined()
			expect(agent.model.provider).toBeDefined()
			expect(agent.model.model).toBeDefined()
			expect(typeof agent.systemPrompt).toBe("string")
			expect(agent.systemPrompt.length).toBeGreaterThan(0)
		}
	})
})

describe("applyOverrides", () => {
	test("returns clone of base when no overrides", () => {
		const result = applyOverrides(DEFAULT_CONFIG, {})
		expect(result).toEqual(DEFAULT_CONFIG)
		expect(result).not.toBe(DEFAULT_CONFIG)
	})

	test("overrides a single agent config", () => {
		const result = applyOverrides(DEFAULT_CONFIG, {
			explorer: {
				model: { provider: "openai", model: "gpt-4o" },
				systemPrompt: "custom explorer prompt",
			},
		})
		expect(result.explorer.model.provider).toBe("openai")
		expect(result.explorer.systemPrompt).toBe("custom explorer prompt")
	})

	test("preserves non-overridden agents", () => {
		const result = applyOverrides(DEFAULT_CONFIG, {
			explorer: {
				model: { provider: "openai", model: "gpt-4o" },
				systemPrompt: "custom",
			},
		})
		expect(result.concept).toEqual(DEFAULT_CONFIG.concept)
		expect(result.reviewer).toEqual(DEFAULT_CONFIG.reviewer)
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/config.test.ts
```

Expected: FAIL — module `@/agents/config` not found.

**Step 3: Write implementation**

```typescript
// src/agents/config.ts
import type { ModelConfig as AgentKitModelConfig } from "@inngest/agent-kit"

interface ModelConfig {
	provider: "anthropic" | "openai" | "gemini" | "grok"
	model: string
	parameters?: Record<string, unknown>
}

interface AgentConfig {
	model: ModelConfig
	systemPrompt: string
}

interface WorkflowConfig {
	explorer: AgentConfig
	specialist: AgentConfig
	concept: AgentConfig
	critic: AgentConfig
	reviewer: AgentConfig
	implementer: AgentConfig
}

const AGENT_KEYS: ReadonlyArray<keyof WorkflowConfig> = [
	"explorer",
	"specialist",
	"concept",
	"critic",
	"reviewer",
	"implementer",
] as const

const DEFAULT_CONFIG: WorkflowConfig = {
	explorer: {
		model: { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
		systemPrompt: "You are a codebase explorer. Map the architecture, patterns, and conventions of the directory you are assigned. Be thorough but concise. Focus on structure, not implementation details.",
	},
	specialist: {
		model: { provider: "anthropic", model: "claude-sonnet-4-6" },
		systemPrompt: "You are a specialist researcher. Deep-dive into the specific topic assigned to you. Provide detailed findings with file paths and code references.",
	},
	concept: {
		model: { provider: "anthropic", model: "claude-opus-4-6" },
		systemPrompt: "You are a feature architect. Generate distinct implementation approaches for the requested feature. Each approach should include: name, description, detailed approach, file changes, and a code sketch. Be creative but practical.",
	},
	critic: {
		model: { provider: "anthropic", model: "claude-sonnet-4-6" },
		systemPrompt: "You are a code critic. Poke holes in the proposed approach. Look for: missing edge cases, incorrect assumptions about the codebase, performance issues, convention violations, and maintenance burden. Be specific and cite evidence.",
	},
	reviewer: {
		model: { provider: "anthropic", model: "claude-sonnet-4-6" },
		systemPrompt: "You are a code reviewer. Review the implementation for correctness, convention adherence, type safety, and potential bugs. Focus only on your assigned concern dimension.",
	},
	implementer: {
		model: { provider: "anthropic", model: "claude-sonnet-4-6" },
		systemPrompt: "You are a code implementer. Write production-quality code for your assigned file or module. Follow all codebase conventions exactly. After writing, verify with typecheck and lint.",
	},
}

function applyOverrides(
	base: WorkflowConfig,
	overrides: Partial<WorkflowConfig>,
): WorkflowConfig {
	const result = structuredClone(base)
	for (const key of AGENT_KEYS) {
		const override = overrides[key]
		if (override) {
			result[key] = override
		}
	}
	return result
}

export { AGENT_KEYS, applyOverrides, DEFAULT_CONFIG }
export type { AgentConfig, ModelConfig, WorkflowConfig }
```

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/config.test.ts
```

Expected: all PASS.

**Step 5: Commit**

```bash
git add src/agents/config.ts src/agents/config.test.ts
git commit -m "feat: add agent config types, defaults, and override resolution"
```

---

## Task 5: Model resolver utility

**Files:**
- Modify: `src/agents/config.ts`
- Modify: `src/agents/config.test.ts`

The AgentKit model constructors (`anthropic()`, `openai()`, `gemini()`) need to be called with the right parameters. This utility maps our `ModelConfig` to an AgentKit `AiAdapter`.

**Step 1: Write the failing test**

Add to `src/agents/config.test.ts`:

```typescript
import { resolveModel } from "@/agents/config"

describe("resolveModel", () => {
	test("creates anthropic adapter with max_tokens", () => {
		const adapter = resolveModel({
			provider: "anthropic",
			model: "claude-sonnet-4-6",
		})
		expect(adapter).toBeDefined()
	})

	test("creates openai adapter", () => {
		const adapter = resolveModel({
			provider: "openai",
			model: "gpt-4o",
		})
		expect(adapter).toBeDefined()
	})

	test("creates gemini adapter", () => {
		const adapter = resolveModel({
			provider: "gemini",
			model: "gemini-1.5-flash",
		})
		expect(adapter).toBeDefined()
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/config.test.ts
```

Expected: FAIL — `resolveModel` not exported.

**Step 3: Write implementation**

Add to `src/agents/config.ts`:

```typescript
import {
	anthropic,
	gemini,
	openai,
} from "@inngest/agent-kit"

function resolveModel(config: ModelConfig) {
	const params = config.parameters

	if (config.provider === "anthropic") {
		return anthropic({
			model: config.model,
			defaultParameters: {
				max_tokens: 8192,
				...params,
			},
		})
	}

	if (config.provider === "openai") {
		return openai({
			model: config.model,
			defaultParameters: params,
		})
	}

	if (config.provider === "gemini") {
		return gemini({
			model: config.model,
			defaultParameters: params,
		})
	}

	// Grok uses OpenAI-compatible API
	return openai({
		model: config.model,
		defaultParameters: params,
	})
}
```

Add `resolveModel` to the `export { }` block.

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/config.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/config.ts src/agents/config.test.ts
git commit -m "feat: add resolveModel utility for AgentKit provider adapters"
```

---

## Task 6: Core filesystem tools

**Files:**
- Create: `src/agents/tools/filesystem.ts`
- Create: `src/agents/tools/filesystem.test.ts`

These tools are read-only, shared across all agents. They wrap Bun APIs and ripgrep.

**Step 1: Write the failing test**

```typescript
// src/agents/tools/filesystem.test.ts
import { describe, expect, test } from "bun:test"
import {
	readFileTool,
	listFilesTool,
	searchCodeTool,
	readDirectoryTool,
} from "@/agents/tools/filesystem"

describe("filesystem tools", () => {
	test("readFileTool has correct name and parameters", () => {
		expect(readFileTool.name).toBe("read_file")
	})

	test("listFilesTool has correct name", () => {
		expect(listFilesTool.name).toBe("list_files")
	})

	test("searchCodeTool has correct name", () => {
		expect(searchCodeTool.name).toBe("search_code")
	})

	test("readDirectoryTool has correct name", () => {
		expect(readDirectoryTool.name).toBe("read_directory")
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/tools/filesystem.test.ts
```

**Step 3: Write implementation**

```typescript
// src/agents/tools/filesystem.ts
import { createTool } from "@inngest/agent-kit"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

const readFileParams = z.object({
	path: z.string().describe("Absolute path to the file to read"),
})

const readFileTool = createTool({
	name: "read_file",
	description: "Read file contents. Returns the file content with line numbers.",
	parameters: readFileParams,
	handler: async function handleReadFile({ path }) {
		logger.debug("reading file", { path })
		const file = Bun.file(path)
		const exists = await file.exists()
		if (!exists) {
			return { error: `File not found: ${path}` }
		}
		const content = await file.text()
		const lines = content.split("\n")
		const numbered = lines
			.map(function addLineNumber(line, i) {
				return `${String(i + 1).padStart(4)}  ${line}`
			})
			.join("\n")
		return numbered
	},
})

const listFilesParams = z.object({
	glob: z.string().describe("Glob pattern to match files (e.g. '**/*.ts')"),
	path: z.string().describe("Directory to search in (absolute path)"),
})

const listFilesTool = createTool({
	name: "list_files",
	description: "List files matching a glob pattern in a directory.",
	parameters: listFilesParams,
	handler: async function handleListFiles({ glob: pattern, path }) {
		logger.debug("listing files", { pattern, path })
		const globber = new Bun.Glob(pattern)
		const matches: string[] = []
		for await (const match of globber.scan({ cwd: path, absolute: true })) {
			matches.push(match)
		}
		matches.sort()
		return matches.join("\n")
	},
})

const searchCodeParams = z.object({
	pattern: z.string().describe("Regex pattern to search for"),
	path: z.string().describe("Directory to search in (absolute path)"),
	glob: z.string().nullable().describe("Optional glob filter (e.g. '*.ts')"),
})

const searchCodeTool = createTool({
	name: "search_code",
	description: "Search file contents using ripgrep. Returns matching lines with file paths and line numbers.",
	parameters: searchCodeParams,
	handler: async function handleSearchCode({ pattern, path, glob: fileGlob }) {
		logger.debug("searching code", { pattern, path, fileGlob })
		const args = ["rg", "--line-number", "--no-heading", pattern, path]
		if (fileGlob) {
			args.push("--glob", fileGlob)
		}
		const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" })
		const stdout = await new Response(proc.stdout).text()
		const stderr = await new Response(proc.stderr).text()
		await proc.exited
		if (proc.exitCode === 1) {
			return "No matches found."
		}
		if (proc.exitCode !== 0) {
			return { error: `rg failed: ${stderr}` }
		}
		return stdout
	},
})

const readDirectoryParams = z.object({
	path: z.string().describe("Directory path (absolute)"),
	depth: z.number().describe("Max depth to recurse").default(3),
})

const readDirectoryTool = createTool({
	name: "read_directory",
	description: "List directory tree structure up to a specified depth.",
	parameters: readDirectoryParams,
	handler: async function handleReadDirectory({ path, depth }) {
		logger.debug("reading directory", { path, depth })
		const args = ["fd", "--base-directory", path, "--max-depth", String(depth), "--type", "f"]
		const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" })
		const stdout = await new Response(proc.stdout).text()
		await proc.exited
		if (proc.exitCode !== 0) {
			const stderr = await new Response(proc.stderr).text()
			return { error: `fd failed: ${stderr}` }
		}
		const files = stdout.trim().split("\n").filter(Boolean)
		files.sort()
		return files.join("\n")
	},
})

export { listFilesTool, readDirectoryTool, readFileTool, searchCodeTool }
```

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/tools/filesystem.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/tools/filesystem.ts src/agents/tools/filesystem.test.ts
git commit -m "feat: add core filesystem tools (readFile, listFiles, searchCode, readDirectory)"
```

---

## Task 7: Analysis tools

**Files:**
- Create: `src/agents/tools/analysis.ts`

Same pattern as filesystem tools. These wrap shell commands for lint, typecheck, import analysis, symbol usage, and git history.

**Step 1: Write the tools**

```typescript
// src/agents/tools/analysis.ts
import { createTool } from "@inngest/agent-kit"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

const runLintTool = createTool({
	name: "run_lint",
	description: "Run bun lint on a file or directory. Returns lint violations.",
	parameters: z.object({
		path: z.string().describe("File or directory path to lint"),
	}),
	handler: async function handleRunLint({ path }) {
		logger.debug("running lint", { path })
		const proc = Bun.spawn(["bun", "lint", path], {
			stdout: "pipe",
			stderr: "pipe",
		})
		const stdout = await new Response(proc.stdout).text()
		const stderr = await new Response(proc.stderr).text()
		await proc.exited
		return proc.exitCode === 0
			? "No lint violations."
			: `${stdout}\n${stderr}`.trim()
	},
})

const runTypecheckTool = createTool({
	name: "run_typecheck",
	description: "Run TypeScript type checking. Returns type errors if any.",
	parameters: z.object({}),
	handler: async function handleRunTypecheck() {
		logger.debug("running typecheck")
		const proc = Bun.spawn(["bun", "typecheck"], {
			stdout: "pipe",
			stderr: "pipe",
		})
		const stdout = await new Response(proc.stdout).text()
		const stderr = await new Response(proc.stderr).text()
		await proc.exited
		return proc.exitCode === 0
			? "No type errors."
			: `${stdout}\n${stderr}`.trim()
	},
})

const analyzeImportsTool = createTool({
	name: "analyze_imports",
	description: "Map the import graph for a file. Shows what this file imports and from where.",
	parameters: z.object({
		path: z.string().describe("Absolute path to the file"),
	}),
	handler: async function handleAnalyzeImports({ path }) {
		logger.debug("analyzing imports", { path })
		const proc = Bun.spawn(
			["rg", "--no-heading", "--line-number", "^import ", path],
			{ stdout: "pipe", stderr: "pipe" },
		)
		const stdout = await new Response(proc.stdout).text()
		await proc.exited
		if (!stdout.trim()) {
			return "No imports found."
		}
		return stdout
	},
})

const findUsagesTool = createTool({
	name: "find_usages",
	description: "Find all references to a symbol across the codebase.",
	parameters: z.object({
		symbol: z.string().describe("Symbol name to search for"),
		path: z.string().describe("Directory to search in"),
		glob: z.string().nullable().describe("Optional glob filter"),
	}),
	handler: async function handleFindUsages({ symbol, path, glob: fileGlob }) {
		logger.debug("finding usages", { symbol, path, fileGlob })
		const args = ["rg", "--line-number", "--no-heading", "-w", symbol, path]
		if (fileGlob) {
			args.push("--glob", fileGlob)
		}
		const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" })
		const stdout = await new Response(proc.stdout).text()
		await proc.exited
		return stdout.trim() ? stdout : `No usages of '${symbol}' found.`
	},
})

const getGitHistoryTool = createTool({
	name: "get_git_history",
	description: "Get recent git commits touching a specific file.",
	parameters: z.object({
		path: z.string().describe("File path to check history for"),
		count: z.number().describe("Number of commits to show").default(10),
	}),
	handler: async function handleGetGitHistory({ path, count }) {
		logger.debug("getting git history", { path, count })
		const proc = Bun.spawn(
			["git", "log", `--max-count=${count}`, "--oneline", "--", path],
			{ stdout: "pipe", stderr: "pipe" },
		)
		const stdout = await new Response(proc.stdout).text()
		await proc.exited
		return stdout.trim() ? stdout : "No git history found for this file."
	},
})

export {
	analyzeImportsTool,
	findUsagesTool,
	getGitHistoryTool,
	runLintTool,
	runTypecheckTool,
}
```

**Step 2: Verify typecheck**

```bash
bun typecheck
```

**Step 3: Commit**

```bash
git add src/agents/tools/analysis.ts
git commit -m "feat: add analysis tools (lint, typecheck, imports, usages, git history)"
```

---

## Task 8: Conventions tool

**Files:**
- Create: `src/agents/tools/conventions.ts`

Reads CLAUDE.md and all rules/*.md files so agents know codebase conventions.

**Step 1: Write implementation**

```typescript
// src/agents/tools/conventions.ts
import { createTool } from "@inngest/agent-kit"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

const readConventionsTool = createTool({
	name: "read_conventions",
	description: "Read the codebase conventions (CLAUDE.md + all rules/*.md). Call this before generating or reviewing code to understand the project's enforced patterns.",
	parameters: z.object({
		repoRoot: z.string().describe("Absolute path to the repository root"),
	}),
	handler: async function handleReadConventions({ repoRoot }) {
		logger.debug("reading conventions", { repoRoot })
		const sections: string[] = []

		const claudeMd = Bun.file(`${repoRoot}/CLAUDE.md`)
		if (await claudeMd.exists()) {
			sections.push("# CLAUDE.md\n\n" + await claudeMd.text())
		}

		const rulesGlob = new Bun.Glob("*.md")
		const rulesDir = `${repoRoot}/rules`
		for await (const file of rulesGlob.scan({ cwd: rulesDir, absolute: true })) {
			const content = await Bun.file(file).text()
			const name = file.split("/").pop()
			sections.push(`# rules/${name}\n\n${content}`)
		}

		return sections.join("\n\n---\n\n")
	},
})

export { readConventionsTool }
```

**Step 2: Commit**

```bash
git add src/agents/tools/conventions.ts
git commit -m "feat: add conventions tool (reads CLAUDE.md + rules/*.md)"
```

---

## Task 9: Progress tool

**Files:**
- Create: `src/agents/tools/progress.ts`

Emits realtime events to the dashboard via Inngest publish. The `publish` function is only available inside Inngest function context, so this tool receives it via network state.

**Step 1: Write implementation**

```typescript
// src/agents/tools/progress.ts
import { createTool } from "@inngest/agent-kit"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

const emitProgressTool = createTool({
	name: "emit_progress",
	description: "Emit a progress update to the dashboard. Use this to report what you are doing and why.",
	parameters: z.object({
		stage: z.string().describe("Current stage or phase name"),
		detail: z.string().describe("What you are doing right now and why"),
	}),
	handler: async function handleEmitProgress({ stage, detail }) {
		logger.info("agent progress", { stage, detail })
		return { emitted: true, stage, detail }
	},
})

export { emitProgressTool }
```

**Note:** Full Inngest Realtime `publish()` integration will be wired in the pipeline task. For now, the tool logs the progress event. The dashboard integration is a separate plan.

**Step 2: Commit**

```bash
git add src/agents/tools/progress.ts
git commit -m "feat: add progress tool for agent status reporting"
```

---

## Task 10: Workspace management functions

**Files:**
- Create: `src/agents/workspace.ts`
- Create: `src/agents/workspace.test.ts`

These are orchestration-layer functions (not agent tools). They manage git worktree lifecycle.

**Step 1: Write the failing test**

```typescript
// src/agents/workspace.test.ts
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
	createWorktree,
	deleteWorktree,
	listWorktrees,
	worktreeStatus,
} from "@/agents/workspace"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

let testRepoPath: string

beforeAll(async () => {
	testRepoPath = await mkdtemp(join(tmpdir(), "agent-workspace-test-"))
	// Initialize a git repo for testing
	const init = Bun.spawn(["git", "init", testRepoPath], { stdout: "pipe" })
	await init.exited
	// Create an initial commit (required for worktrees)
	Bun.spawn(["git", "-C", testRepoPath, "commit", "--allow-empty", "-m", "init"], {
		stdout: "pipe",
	})
})

afterAll(async () => {
	await rm(testRepoPath, { recursive: true, force: true })
})

describe("listWorktrees", () => {
	test("returns at least the main worktree", async () => {
		const result = await listWorktrees(testRepoPath)
		expect(result.length).toBeGreaterThanOrEqual(1)
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/workspace.test.ts
```

**Step 3: Write implementation**

```typescript
// src/agents/workspace.ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

interface WorktreeInfo {
	path: string
	branch: string
	head: string
}

async function runGit(
	args: string[],
	cwd: string,
): Promise<string> {
	const proc = Bun.spawn(["git", ...args], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	})
	const stdout = await new Response(proc.stdout).text()
	const stderr = await new Response(proc.stderr).text()
	await proc.exited
	if (proc.exitCode !== 0) {
		logger.error("git command failed", { args, stderr })
		throw errors.new(`git ${args[0]}: ${stderr.trim()}`)
	}
	return stdout.trim()
}

async function createWorktree(
	repoRoot: string,
	branch: string,
	baseBranch: string,
): Promise<string> {
	logger.info("creating worktree", { repoRoot, branch, baseBranch })
	const worktreePath = `${repoRoot}/../worktrees/${branch}`
	await runGit(
		["worktree", "add", "-b", branch, worktreePath, baseBranch],
		repoRoot,
	)
	return worktreePath
}

async function deleteWorktree(
	repoRoot: string,
	worktreePath: string,
): Promise<void> {
	logger.info("deleting worktree", { repoRoot, worktreePath })
	await runGit(["worktree", "remove", worktreePath, "--force"], repoRoot)
}

async function listWorktrees(repoRoot: string): Promise<WorktreeInfo[]> {
	logger.debug("listing worktrees", { repoRoot })
	const output = await runGit(["worktree", "list", "--porcelain"], repoRoot)
	const worktrees: WorktreeInfo[] = []
	let current: Partial<WorktreeInfo> = {}

	for (const line of output.split("\n")) {
		if (line.startsWith("worktree ")) {
			current.path = line.slice("worktree ".length)
		} else if (line.startsWith("HEAD ")) {
			current.head = line.slice("HEAD ".length)
		} else if (line.startsWith("branch ")) {
			current.branch = line.slice("branch refs/heads/".length)
		} else if (line === "") {
			if (current.path && current.head) {
				worktrees.push({
					path: current.path,
					branch: current.branch ?? "(detached)",
					head: current.head,
				})
			}
			current = {}
		}
	}

	return worktrees
}

async function worktreeStatus(worktreePath: string): Promise<string> {
	logger.debug("checking worktree status", { worktreePath })
	const status = await runGit(["status", "--short"], worktreePath)
	const log = await runGit(
		["log", "--oneline", "--max-count=5"],
		worktreePath,
	)
	return `Status:\n${status ? status : "(clean)"}\n\nRecent commits:\n${log}`
}

export { createWorktree, deleteWorktree, listWorktrees, worktreeStatus }
export type { WorktreeInfo }
```

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/workspace.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/workspace.ts src/agents/workspace.test.ts
git commit -m "feat: add git worktree management functions"
```

---

## Task 11: Verification tools

**Files:**
- Create: `src/agents/tools/verification.ts`

Tools agents can use to verify their work against reality (Principle 3). Available to ALL agents.

**Step 1: Write implementation**

```typescript
// src/agents/tools/verification.ts
import { createTool } from "@inngest/agent-kit"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

const verifyTypecheckTool = createTool({
	name: "verify_typecheck",
	description: "Run TypeScript typecheck and return exact errors with file:line locations. Use to verify code correctness.",
	parameters: z.object({
		cwd: z.string().describe("Working directory to run typecheck in"),
	}),
	handler: async function handleVerifyTypecheck({ cwd }) {
		logger.debug("verifying typecheck", { cwd })
		const proc = Bun.spawn(["bun", "typecheck"], {
			cwd,
			stdout: "pipe",
			stderr: "pipe",
		})
		const stdout = await new Response(proc.stdout).text()
		const stderr = await new Response(proc.stderr).text()
		await proc.exited
		const passed = proc.exitCode === 0
		return {
			passed,
			output: passed ? "All type checks passed." : `${stdout}\n${stderr}`.trim(),
		}
	},
})

const verifyLintTool = createTool({
	name: "verify_lint",
	description: "Run linter and return violations with rule names. Use to verify convention adherence.",
	parameters: z.object({
		cwd: z.string().describe("Working directory"),
		path: z.string().nullable().describe("Optional specific file/directory to lint"),
	}),
	handler: async function handleVerifyLint({ cwd, path }) {
		logger.debug("verifying lint", { cwd, path })
		const args = path ? ["bun", "lint", path] : ["bun", "lint"]
		const proc = Bun.spawn(args, {
			cwd,
			stdout: "pipe",
			stderr: "pipe",
		})
		const stdout = await new Response(proc.stdout).text()
		const stderr = await new Response(proc.stderr).text()
		await proc.exited
		const passed = proc.exitCode === 0
		return {
			passed,
			output: passed ? "No lint violations." : `${stdout}\n${stderr}`.trim(),
		}
	},
})

const verifyTestsTool = createTool({
	name: "verify_tests",
	description: "Run tests and return pass/fail results with assertion details.",
	parameters: z.object({
		cwd: z.string().describe("Working directory"),
		filter: z.string().nullable().describe("Optional test file or pattern filter"),
	}),
	handler: async function handleVerifyTests({ cwd, filter }) {
		logger.debug("verifying tests", { cwd, filter })
		const args = filter ? ["bun", "test", filter] : ["bun", "test"]
		const proc = Bun.spawn(args, {
			cwd,
			stdout: "pipe",
			stderr: "pipe",
		})
		const stdout = await new Response(proc.stdout).text()
		const stderr = await new Response(proc.stderr).text()
		await proc.exited
		const passed = proc.exitCode === 0
		return {
			passed,
			output: `${stdout}\n${stderr}`.trim(),
		}
	},
})

const diffCheckTool = createTool({
	name: "diff_check",
	description: "Show git diff against a base branch. Use to review changes made by implementation.",
	parameters: z.object({
		cwd: z.string().describe("Working directory (worktree path)"),
		base: z.string().describe("Base branch to diff against").default("main"),
	}),
	handler: async function handleDiffCheck({ cwd, base }) {
		logger.debug("checking diff", { cwd, base })
		const proc = Bun.spawn(["git", "diff", `${base}...HEAD`], {
			cwd,
			stdout: "pipe",
			stderr: "pipe",
		})
		const stdout = await new Response(proc.stdout).text()
		await proc.exited
		return stdout.trim() ? stdout : "No changes from base branch."
	},
})

export { diffCheckTool, verifyLintTool, verifyTestsTool, verifyTypecheckTool }
```

**Step 2: Commit**

```bash
git add src/agents/tools/verification.ts
git commit -m "feat: add verification tools (typecheck, lint, tests, diff)"
```

---

## Task 12: Explorer agent factory

**Files:**
- Create: `src/agents/agents/explorer.ts`
- Create: `src/agents/agents/explorer.test.ts`

**Step 1: Write the failing test**

```typescript
// src/agents/agents/explorer.test.ts
import { describe, expect, test } from "bun:test"
import { createExplorerAgent } from "@/agents/agents/explorer"
import { DEFAULT_CONFIG } from "@/agents/config"

describe("createExplorerAgent", () => {
	test("creates an agent with the correct name", () => {
		const agent = createExplorerAgent(DEFAULT_CONFIG.explorer)
		expect(agent.name).toBe("Explorer")
	})

	test("accepts custom config", () => {
		const agent = createExplorerAgent({
			model: { provider: "openai", model: "gpt-4o" },
			systemPrompt: "Custom explorer prompt.",
		})
		expect(agent.name).toBe("Explorer")
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/agents/explorer.test.ts
```

**Step 3: Write implementation**

```typescript
// src/agents/agents/explorer.ts
import { createAgent } from "@inngest/agent-kit"
import type { AgentConfig } from "@/agents/config"
import { resolveModel } from "@/agents/config"
import { readFileTool, listFilesTool, searchCodeTool, readDirectoryTool } from "@/agents/tools/filesystem"
import { readConventionsTool } from "@/agents/tools/conventions"
import { emitProgressTool } from "@/agents/tools/progress"

function createExplorerAgent(config: AgentConfig) {
	return createAgent({
		name: "Explorer",
		description: "Maps codebase architecture and patterns for a specific directory or concern.",
		model: resolveModel(config.model),
		system: config.systemPrompt,
		tools: [
			readFileTool,
			listFilesTool,
			searchCodeTool,
			readDirectoryTool,
			readConventionsTool,
			emitProgressTool,
		],
	})
}

export { createExplorerAgent }
```

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/agents/explorer.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/agents/explorer.ts src/agents/agents/explorer.test.ts
git commit -m "feat: add explorer agent factory"
```

---

## Task 13: Specialist agent factory

**Files:**
- Create: `src/agents/agents/specialist.ts`

Same pattern as explorer but with analysis tools included.

**Step 1: Write implementation**

```typescript
// src/agents/agents/specialist.ts
import { createAgent } from "@inngest/agent-kit"
import type { AgentConfig } from "@/agents/config"
import { resolveModel } from "@/agents/config"
import { readFileTool, listFilesTool, searchCodeTool, readDirectoryTool } from "@/agents/tools/filesystem"
import { analyzeImportsTool, findUsagesTool, getGitHistoryTool } from "@/agents/tools/analysis"
import { readConventionsTool } from "@/agents/tools/conventions"
import { emitProgressTool } from "@/agents/tools/progress"

function createSpecialistAgent(config: AgentConfig) {
	return createAgent({
		name: "Specialist",
		description: "Deep-dive researcher for a specific topic or question about the codebase.",
		model: resolveModel(config.model),
		system: config.systemPrompt,
		tools: [
			readFileTool,
			listFilesTool,
			searchCodeTool,
			readDirectoryTool,
			analyzeImportsTool,
			findUsagesTool,
			getGitHistoryTool,
			readConventionsTool,
			emitProgressTool,
		],
	})
}

export { createSpecialistAgent }
```

**Step 2: Commit**

```bash
git add src/agents/agents/specialist.ts
git commit -m "feat: add specialist agent factory"
```

---

## Task 14: Onboarding primitive

**Files:**
- Create: `src/agents/primitives/onboard.ts`
- Create: `src/agents/primitives/onboard.test.ts`

The onboarding primitive spawns parallel explorer agents to map different codebase slices, then consolidates results into a typed `CodebaseContext`.

This is NOT an Inngest function — it's a reusable async function that takes an Inngest `step` parameter for parallel execution. The Inngest function in Task 15 calls this.

**Step 1: Write the types and test**

```typescript
// src/agents/primitives/onboard.test.ts
import { describe, expect, test } from "bun:test"
import {
	DEFAULT_SLICES,
	type CodebaseContext,
	type OnboardingScope,
} from "@/agents/primitives/onboard"

describe("onboarding types", () => {
	test("DEFAULT_SLICES has all 6 slices", () => {
		expect(DEFAULT_SLICES).toHaveLength(6)
		expect(DEFAULT_SLICES).toContain("structure")
		expect(DEFAULT_SLICES).toContain("data-layer")
		expect(DEFAULT_SLICES).toContain("api-layer")
		expect(DEFAULT_SLICES).toContain("ui-layer")
		expect(DEFAULT_SLICES).toContain("conventions")
		expect(DEFAULT_SLICES).toContain("dependencies")
	})
})

describe("buildSlicePrompt", () => {
	test("includes target path and slice name", async () => {
		const { buildSlicePrompt } = await import("@/agents/primitives/onboard")
		const prompt = buildSlicePrompt("/path/to/repo", "data-layer")
		expect(prompt).toContain("/path/to/repo")
		expect(prompt).toContain("data-layer")
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/primitives/onboard.test.ts
```

**Step 3: Write implementation**

```typescript
// src/agents/primitives/onboard.ts
import { createNetwork, createState, createTool } from "@inngest/agent-kit"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { AgentConfig } from "@/agents/config"
import { resolveModel } from "@/agents/config"
import { createExplorerAgent } from "@/agents/agents/explorer"
import {
	listFilesTool,
	readDirectoryTool,
	readFileTool,
	searchCodeTool,
} from "@/agents/tools/filesystem"
import { readConventionsTool } from "@/agents/tools/conventions"
import { emitProgressTool } from "@/agents/tools/progress"

interface OnboardingScope {
	targetPath: string
	focus: string | undefined
	depth: "shallow" | "deep"
	slices: string[]
}

interface CodebaseContext {
	structure: string
	dataLayer: string
	apiLayer: string
	uiLayer: string
	conventions: string
	dependencies: string
	relevantFiles: Array<{ path: string; summary: string }>
}

const DEFAULT_SLICES = [
	"structure",
	"data-layer",
	"api-layer",
	"ui-layer",
	"conventions",
	"dependencies",
] as const

interface ExplorerState {
	summary: string
	done: boolean
}

const saveSummaryParams = z.object({
	summary: z.string().describe("Your complete summary of this codebase slice"),
})

const saveSummaryTool = createTool({
	name: "save_summary",
	description: "Save your exploration summary. Call this when you have finished exploring your assigned codebase slice.",
	parameters: saveSummaryParams,
	handler: async function handleSaveSummary({ summary }, { network }) {
		if (network) {
			network.state.data.summary = summary
			network.state.data.done = true
		}
		return "Summary saved."
	},
})

const SLICE_PROMPTS: Record<string, string> = {
	"structure": "Map the directory tree, entry points (page.tsx files), configuration files (tsconfig, biome, drizzle, next.config), and overall project layout. Identify the major architectural boundaries.",
	"data-layer": "Map the database schema (Drizzle tables, types, relations), ORM patterns, prepared statements, and migration approach. Identify key data types.",
	"api-layer": "Map API routes, server actions, route handlers, and the Inngest webhook. Identify the data flow patterns (RSC → DB → client).",
	"ui-layer": "Map the component structure, page.tsx + content.tsx pattern, client/server split, and shared UI components. Identify layout patterns.",
	"conventions": "Read CLAUDE.md and all rules/*.md. Summarize the enforced code patterns, banned patterns, error handling conventions, and logging requirements.",
	"dependencies": "Read package.json. Summarize key production and dev dependencies, their versions, and how they're used. Identify any custom @superbuilders/* packages.",
}

function buildSlicePrompt(targetPath: string, slice: string): string {
	const sliceDetail = SLICE_PROMPTS[slice]
	return [
		`You are exploring the codebase at: ${targetPath}`,
		`Your assigned slice: ${slice}`,
		"",
		sliceDetail,
		"",
		"Instructions:",
		"1. Use read_directory to understand the layout",
		"2. Use read_file to examine key files",
		"3. Use search_code to find patterns",
		"4. When you have a thorough understanding, call save_summary with your findings",
		"5. Be concise but complete. Include file paths for everything you reference.",
	].join("\n")
}

function createSliceNetwork(config: AgentConfig, targetPath: string, slice: string) {
	const maxIter = 8

	const agent = createExplorerAgent({
		model: config.model,
		systemPrompt: buildSlicePrompt(targetPath, slice),
	})

	return createNetwork<ExplorerState>({
		name: `explore-${slice}`,
		agents: [agent],
		maxIter,
		defaultState: createState<ExplorerState>({ summary: "", done: false }),
		router: function exploreRouter({ network }) {
			if (network.state.data.done) {
				return undefined
			}
			return agent
		},
	})
}

async function onboard(
	scope: OnboardingScope,
	explorerConfig: AgentConfig,
): Promise<CodebaseContext> {
	logger.info("starting onboarding", {
		targetPath: scope.targetPath,
		slices: scope.slices,
		depth: scope.depth,
	})

	const sliceResults: Record<string, string> = {}

	// Run all slices (caller is responsible for parallelism via step.run)
	for (const slice of scope.slices) {
		const network = createSliceNetwork(explorerConfig, scope.targetPath, slice)
		const input = `Explore the ${slice} of the codebase at ${scope.targetPath}`
		const result = await network.run(input)
		sliceResults[slice] = result.state.data.summary
		logger.info("slice completed", { slice, summaryLength: result.state.data.summary.length })
	}

	const context: CodebaseContext = {
		structure: sliceResults["structure"] ?? "",
		dataLayer: sliceResults["data-layer"] ?? "",
		apiLayer: sliceResults["api-layer"] ?? "",
		uiLayer: sliceResults["ui-layer"] ?? "",
		conventions: sliceResults["conventions"] ?? "",
		dependencies: sliceResults["dependencies"] ?? "",
		relevantFiles: [],
	}

	logger.info("onboarding complete", { sliceCount: scope.slices.length })
	return context
}

export {
	buildSlicePrompt,
	DEFAULT_SLICES,
	onboard,
	saveSummaryTool,
}
export type { CodebaseContext, OnboardingScope }
```

**Note on parallelism:** The `onboard` function above runs slices sequentially. In the Inngest function (Task 15), each slice is wrapped in a separate `step.run()` call with `Promise.all()` for parallel execution. The `onboard` function is the consolidated version for testing; the Inngest function is the parallelized production version.

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/primitives/onboard.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/primitives/onboard.ts src/agents/primitives/onboard.test.ts
git commit -m "feat: add codebase onboarding primitive with parallel slice exploration"
```

---

## Task 15: Inngest onboarding function (wiring it together)

**Files:**
- Create: `src/inngest/functions/agent-onboard.ts`
- Modify: `src/inngest/functions/index.ts`

The first real Inngest function. Listens for `agent/feature.requested`, runs parallel onboarding, and stores results.

**Step 1: Write the Inngest function**

```typescript
// src/inngest/functions/agent-onboard.ts
import { createNetwork, createState } from "@inngest/agent-kit"
import { inngest } from "@/inngest"
import { DEFAULT_CONFIG, applyOverrides, resolveModel } from "@/agents/config"
import type { WorkflowConfig } from "@/agents/config"
import { createExplorerAgent } from "@/agents/agents/explorer"
import {
	buildSlicePrompt,
	DEFAULT_SLICES,
	saveSummaryTool,
	type CodebaseContext,
} from "@/agents/primitives/onboard"

interface ExplorerState {
	summary: string
	done: boolean
}

const agentOnboard = inngest.createFunction(
	{
		id: "agent/onboard",
		retries: 2,
		concurrency: [{ scope: "fn", limit: 3 }],
	},
	{ event: "agent/feature.requested" },
	async function handleAgentOnboard({ event, step, logger }) {
		const { feature, targetPath, branchName } = event.data
		logger.info("starting agent onboarding", { feature, targetPath, branchName })

		// Resolve config
		const overrides = event.data.configOverrides
			? (event.data.configOverrides as Partial<WorkflowConfig>)
			: undefined
		const config = applyOverrides(DEFAULT_CONFIG, overrides ?? {})
		const explorerConfig = config.explorer

		// Determine target path (default to repo root)
		const repoRoot = process.cwd()
		const explorePath = targetPath ?? repoRoot

		// Run all slice explorations in parallel via step.run
		const slicePromises = DEFAULT_SLICES.map(function createSliceStep(slice) {
			return step.run(`onboard-${slice}`, async function exploreSlice() {
				const agent = createExplorerAgent({
					model: explorerConfig.model,
					systemPrompt: buildSlicePrompt(explorePath, slice),
				})

				const network = createNetwork<ExplorerState>({
					name: `explore-${slice}`,
					agents: [agent],
					maxIter: 8,
					defaultState: createState<ExplorerState>({
						summary: "",
						done: false,
					}),
					router: function sliceRouter({ network: net }) {
						if (net.state.data.done) {
							return undefined
						}
						return agent
					},
				})

				const result = await network.run(
					`Explore the ${slice} of the codebase at ${explorePath}`,
				)

				return {
					slice,
					summary: result.state.data.summary,
				}
			})
		})

		const sliceResults = await Promise.all(slicePromises)

		// Consolidate results
		const context = await step.run(
			"consolidate-onboarding",
			async function consolidate() {
				const contextMap: Record<string, string> = {}
				for (const result of sliceResults) {
					contextMap[result.slice] = result.summary
				}

				const codebaseContext: CodebaseContext = {
					structure: contextMap["structure"] ?? "",
					dataLayer: contextMap["data-layer"] ?? "",
					apiLayer: contextMap["api-layer"] ?? "",
					uiLayer: contextMap["ui-layer"] ?? "",
					conventions: contextMap["conventions"] ?? "",
					dependencies: contextMap["dependencies"] ?? "",
					relevantFiles: [],
				}

				return codebaseContext
			},
		)

		logger.info("onboarding complete", { feature, sliceCount: sliceResults.length })
		return context
	},
)

export { agentOnboard }
```

**Step 2: Register the function in the Inngest functions index**

In `src/inngest/functions/index.ts`, replace the empty array:

```typescript
import { agentOnboard } from "@/inngest/functions/agent-onboard"

const functions = [agentOnboard]

export { functions }
```

**Step 3: Verify typecheck**

```bash
bun typecheck
```

**Step 4: Commit**

```bash
git add src/inngest/functions/agent-onboard.ts src/inngest/functions/index.ts
git commit -m "feat: add agent onboarding Inngest function with parallel slice exploration"
```

---

## Task 16: Smoke test — run onboarding against the Paul codebase

This is a manual integration test. Requires:
1. Running `bun dev` (Next.js dev server)
2. Running `bun dev:inngest` (Inngest dev server)
3. `ANTHROPIC_API_KEY` set in `.env`

**Step 1: Start the dev servers**

In terminal 1:

```bash
bun dev
```

In terminal 2:

```bash
bun dev:inngest
```

**Step 2: Trigger the onboarding event**

Open the Inngest dev server UI at `http://localhost:8288` and send a test event:

```json
{
  "name": "agent/feature.requested",
  "data": {
    "feature": "smoke test - onboard the codebase",
    "branchName": "test/onboarding-smoke",
    "baseBranch": "main",
    "presetId": null,
    "configOverrides": null,
    "targetPath": null
  }
}
```

**Step 3: Observe in Inngest dev UI**

Verify:
- Function `agent/onboard` triggers
- 6 parallel `onboard-*` steps appear
- Each step completes with a summary
- `consolidate-onboarding` step produces a `CodebaseContext`
- No errors in the function run

**Step 4: Review the output**

Check that the `CodebaseContext` has non-empty summaries for all 6 slices. The explorer agents should have:
- Read directory structures
- Examined key files
- Produced structured summaries
- Used the `save_summary` tool to write to state

---

## Summary

| Task | Component | Deliverable |
|------|-----------|-------------|
| 1 | Dependencies | `@inngest/agent-kit` installed, API key env vars |
| 2 | Events | 6 agent event schemas in Inngest client |
| 3 | Database | 3 new tables (presets, judges, workflow runs) |
| 4 | Config | Types, defaults, `applyOverrides()` with tests |
| 5 | Config | `resolveModel()` utility with tests |
| 6 | Tools | Filesystem tools (readFile, listFiles, searchCode, readDirectory) with tests |
| 7 | Tools | Analysis tools (lint, typecheck, imports, usages, git history) |
| 8 | Tools | Conventions tool (readClaudeMd) |
| 9 | Tools | Progress tool (emitProgress) |
| 10 | Workspace | Worktree management functions with tests |
| 11 | Tools | Verification tools (typecheck, lint, tests, diff) |
| 12 | Agent | Explorer agent factory with test |
| 13 | Agent | Specialist agent factory |
| 14 | Primitive | Onboarding primitive with tests |
| 15 | Inngest | `agent/onboard` function — wires parallel exploration |
| 16 | Integration | Smoke test against live codebase |

**Next plans (not in this document):**
- **Plan 2: Concept Network + Critic + Judge Panel** — Phase 2-3 of the pipeline
- **Plan 3: Implementation Phase + Debug Network** — Phase 5-6
- **Plan 4: Full Pipeline Orchestration** — Wire all phases with HITL events
- **Plan 5: Dashboard** — Flight recorder, trigger, review, judge management
