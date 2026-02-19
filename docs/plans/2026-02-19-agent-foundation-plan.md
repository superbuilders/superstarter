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
- **Known `??` usages in plan code:** Several code blocks below use `??` for brevity. The implementer MUST replace these with proper validation per `rules/no-nullish-coalescing.md` (validate and throw, or fix the source type).

## Testing Philosophy (TDD)

Every tested task follows **vertical slices** — one test, one implementation, repeat. Never write all tests then all code.

**What we test — observable behavior through public interfaces:**
- "readFile handler returns numbered lines for an existing file"
- "applyOverrides merges explorer config while preserving others"
- "createWorktree produces a worktree visible in listWorktrees"
- "resolveModel output is accepted by createAgent"

**What we DON'T test:**
- Tool names or property values (structural — the type system handles this)
- That config keys exist (TypeScript enforces this at compile time)
- `.toBeDefined()` assertions on opaque objects (meaningless — the value could be garbage)

**Handler export pattern for testability:**
Tool handlers are extracted as standalone named functions and exported alongside the tool. Tests call handlers directly with real inputs (temp files, real directories). This tests behavior without requiring a full AgentKit network.

```typescript
// Handler is a standalone function — exported for testing
async function handleReadFile(params: { path: string }) { ... }
const readFileTool = createTool({ name: "read_file", handler: handleReadFile, ... })
export { handleReadFile, readFileTool }
```

**Test boundaries:**
| Layer | Strategy | Mock? |
|-------|----------|-------|
| Tool handlers | Real temp files/dirs, real shell commands | No |
| Config | Pure function input/output | No |
| Workspace | Real git repos in temp dirs | No |
| Agent factories | Integration with `createAgent` + `createNetwork` | No LLM (factory only) |
| Onboarding | Unit test prompt builders; integration deferred to smoke test | No |

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

Behaviors to test:
- `applyOverrides` with empty overrides produces a deep clone
- `applyOverrides` replaces the targeted agent's config completely
- `applyOverrides` leaves untouched agents identical to the base

(We do NOT test that `DEFAULT_CONFIG` has certain keys — TypeScript enforces that at compile time via the `WorkflowConfig` type.)

```typescript
// src/agents/config.test.ts
import { describe, expect, test } from "bun:test"
import {
	applyOverrides,
	DEFAULT_CONFIG,
} from "@/agents/config"

describe("applyOverrides", () => {
	test("empty overrides produce a deep clone of base", () => {
		const result = applyOverrides(DEFAULT_CONFIG, {})
		expect(result).toEqual(DEFAULT_CONFIG)
		expect(result).not.toBe(DEFAULT_CONFIG)
		// Verify deep clone — mutating result must not affect base
		result.explorer.systemPrompt = "mutated"
		expect(DEFAULT_CONFIG.explorer.systemPrompt).not.toBe("mutated")
	})

	test("overriding explorer replaces its model and prompt", () => {
		const result = applyOverrides(DEFAULT_CONFIG, {
			explorer: {
				model: { provider: "openai", model: "gpt-4o" },
				systemPrompt: "custom explorer prompt",
			},
		})
		expect(result.explorer.model.provider).toBe("openai")
		expect(result.explorer.model.model).toBe("gpt-4o")
		expect(result.explorer.systemPrompt).toBe("custom explorer prompt")
	})

	test("non-overridden agents remain identical to base", () => {
		const result = applyOverrides(DEFAULT_CONFIG, {
			explorer: {
				model: { provider: "openai", model: "gpt-4o" },
				systemPrompt: "custom",
			},
		})
		expect(result.concept).toEqual(DEFAULT_CONFIG.concept)
		expect(result.reviewer).toEqual(DEFAULT_CONFIG.reviewer)
		expect(result.implementer).toEqual(DEFAULT_CONFIG.implementer)
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

Behaviors to test:
- Each provider's adapter is accepted by `createAgent` (integration test — proves the adapter is real, not just non-null)
- Grok falls through to OpenAI-compatible adapter

Add to `src/agents/config.test.ts`:

```typescript
import { createAgent } from "@inngest/agent-kit"
import { resolveModel } from "@/agents/config"

describe("resolveModel", () => {
	test("anthropic adapter is accepted by createAgent", () => {
		const adapter = resolveModel({ provider: "anthropic", model: "claude-sonnet-4-6" })
		const agent = createAgent({ name: "test", model: adapter, system: "test" })
		expect(agent.name).toBe("test")
	})

	test("openai adapter is accepted by createAgent", () => {
		const adapter = resolveModel({ provider: "openai", model: "gpt-4o" })
		const agent = createAgent({ name: "test", model: adapter, system: "test" })
		expect(agent.name).toBe("test")
	})

	test("gemini adapter is accepted by createAgent", () => {
		const adapter = resolveModel({ provider: "gemini", model: "gemini-1.5-flash" })
		const agent = createAgent({ name: "test", model: adapter, system: "test" })
		expect(agent.name).toBe("test")
	})

	test("grok uses openai-compatible adapter", () => {
		const adapter = resolveModel({ provider: "grok", model: "grok-beta" })
		const agent = createAgent({ name: "test", model: adapter, system: "test" })
		expect(agent.name).toBe("test")
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

Behaviors to test (through handler functions, with real temp files):
- `handleReadFile` returns numbered lines for an existing file
- `handleReadFile` returns error object for a non-existent path
- `handleListFiles` returns matching file paths in a directory
- `handleSearchCode` returns matching lines with line numbers
- `handleReadDirectory` returns file tree up to specified depth

```typescript
// src/agents/tools/filesystem.test.ts
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
	handleReadFile,
	handleListFiles,
	handleSearchCode,
	handleReadDirectory,
} from "@/agents/tools/filesystem"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

let testDir: string

beforeAll(async () => {
	testDir = await mkdtemp(join(tmpdir(), "fs-tools-test-"))
	await Bun.write(join(testDir, "hello.ts"), "const x = 1\nconst y = 2\n")
	await Bun.write(join(testDir, "world.ts"), "import { z } from \"zod\"\n")
	const sub = join(testDir, "sub")
	await Bun.write(join(sub, "nested.ts"), "export {}\n")
})

afterAll(async () => {
	await rm(testDir, { recursive: true, force: true })
})

describe("handleReadFile", () => {
	test("returns numbered lines for existing file", async () => {
		const result = await handleReadFile({ path: join(testDir, "hello.ts") })
		expect(result).toContain("   1  const x = 1")
		expect(result).toContain("   2  const y = 2")
	})

	test("returns error for non-existent file", async () => {
		const result = await handleReadFile({ path: join(testDir, "nope.ts") })
		expect(result).toEqual({ error: expect.stringContaining("File not found") })
	})
})

describe("handleListFiles", () => {
	test("returns matching files for glob pattern", async () => {
		const result = await handleListFiles({ glob: "*.ts", path: testDir })
		expect(result).toContain("hello.ts")
		expect(result).toContain("world.ts")
	})
})

describe("handleSearchCode", () => {
	test("finds pattern in files", async () => {
		const result = await handleSearchCode({ pattern: "const", path: testDir, glob: null })
		expect(result).toContain("hello.ts")
		expect(result).toContain("const x = 1")
	})

	test("returns no-match message when pattern absent", async () => {
		const result = await handleSearchCode({ pattern: "ZZZZNOTHERE", path: testDir, glob: null })
		expect(result).toBe("No matches found.")
	})
})

describe("handleReadDirectory", () => {
	test("returns files up to specified depth", async () => {
		const result = await handleReadDirectory({ path: testDir, depth: 2 })
		expect(result).toContain("hello.ts")
		expect(result).toContain("nested.ts")
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
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// --- Handlers (exported for direct testing) ---

async function handleReadFile({ path }: { path: string }) {
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
}

async function handleListFiles({ glob: pattern, path }: { glob: string; path: string }) {
	logger.debug("listing files", { pattern, path })
	const globber = new Bun.Glob(pattern)
	const matches: string[] = []
	for await (const match of globber.scan({ cwd: path, absolute: true })) {
		matches.push(match)
	}
	matches.sort()
	return matches.join("\n")
}

async function handleSearchCode({
	pattern,
	path,
	glob: fileGlob,
}: { pattern: string; path: string; glob: string | null }) {
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
}

async function handleReadDirectory({ path, depth }: { path: string; depth: number }) {
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
}

// --- Tool definitions (wrapping handlers for AgentKit) ---

const readFileTool = createTool({
	name: "read_file",
	description: "Read file contents. Returns the file content with line numbers.",
	parameters: z.object({
		path: z.string().describe("Absolute path to the file to read"),
	}),
	handler: handleReadFile,
})

const listFilesTool = createTool({
	name: "list_files",
	description: "List files matching a glob pattern in a directory.",
	parameters: z.object({
		glob: z.string().describe("Glob pattern to match files (e.g. '**/*.ts')"),
		path: z.string().describe("Directory to search in (absolute path)"),
	}),
	handler: handleListFiles,
})

const searchCodeTool = createTool({
	name: "search_code",
	description: "Search file contents using ripgrep. Returns matching lines with file paths and line numbers.",
	parameters: z.object({
		pattern: z.string().describe("Regex pattern to search for"),
		path: z.string().describe("Directory to search in (absolute path)"),
		glob: z.string().nullable().describe("Optional glob filter (e.g. '*.ts')"),
	}),
	handler: handleSearchCode,
})

const readDirectoryTool = createTool({
	name: "read_directory",
	description: "List directory tree structure up to a specified depth.",
	parameters: z.object({
		path: z.string().describe("Directory path (absolute)"),
		depth: z.number().describe("Max depth to recurse").default(3),
	}),
	handler: handleReadDirectory,
})

export {
	handleListFiles,
	handleReadDirectory,
	handleReadFile,
	handleSearchCode,
	listFilesTool,
	readDirectoryTool,
	readFileTool,
	searchCodeTool,
}
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
- Create: `src/agents/tools/analysis.test.ts`

Same pattern as filesystem tools. Handlers exported separately. These wrap shell commands for lint, typecheck, import analysis, symbol usage, and git history.

**Step 1: Write the failing test**

Behaviors to test (against the current repo — it's a real project with git history and imports):
- `handleAnalyzeImports` finds import statements in a known file
- `handleFindUsages` finds references to a known symbol
- `handleGetGitHistory` returns commits for a tracked file

```typescript
// src/agents/tools/analysis.test.ts
import { describe, expect, test } from "bun:test"
import {
	handleAnalyzeImports,
	handleFindUsages,
	handleGetGitHistory,
} from "@/agents/tools/analysis"

const REPO_ROOT = process.cwd()

describe("handleAnalyzeImports", () => {
	test("finds import statements in a known file", async () => {
		const result = await handleAnalyzeImports({
			path: `${REPO_ROOT}/src/env.ts`,
		})
		expect(result).toContain("import")
		expect(result).toContain("zod")
	})
})

describe("handleFindUsages", () => {
	test("finds references to a known symbol", async () => {
		const result = await handleFindUsages({
			symbol: "DATABASE_URL",
			path: `${REPO_ROOT}/src`,
			glob: null,
		})
		expect(result).toContain("DATABASE_URL")
	})
})

describe("handleGetGitHistory", () => {
	test("returns commits for a tracked file", async () => {
		const result = await handleGetGitHistory({
			path: `${REPO_ROOT}/CLAUDE.md`,
			count: 3,
		})
		expect(result.length).toBeGreaterThan(0)
		expect(result).not.toBe("No git history found for this file.")
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/tools/analysis.test.ts
```

Expected: FAIL — handlers not exported.

**Step 3: Write the tools**

```typescript
// src/agents/tools/analysis.ts
import { createTool } from "@inngest/agent-kit"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// --- Handlers (exported for direct testing) ---

async function handleRunLint({ path }: { path: string }) {
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
}

async function handleRunTypecheck() {
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
}

async function handleAnalyzeImports({ path }: { path: string }) {
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
}

async function handleFindUsages({
	symbol,
	path,
	glob: fileGlob,
}: { symbol: string; path: string; glob: string | null }) {
	logger.debug("finding usages", { symbol, path, fileGlob })
	const args = ["rg", "--line-number", "--no-heading", "-w", symbol, path]
	if (fileGlob) {
		args.push("--glob", fileGlob)
	}
	const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" })
	const stdout = await new Response(proc.stdout).text()
	await proc.exited
	return stdout.trim() ? stdout : `No usages of '${symbol}' found.`
}

async function handleGetGitHistory({ path, count }: { path: string; count: number }) {
	logger.debug("getting git history", { path, count })
	const proc = Bun.spawn(
		["git", "log", `--max-count=${count}`, "--oneline", "--", path],
		{ stdout: "pipe", stderr: "pipe" },
	)
	const stdout = await new Response(proc.stdout).text()
	await proc.exited
	return stdout.trim() ? stdout : "No git history found for this file."
}

// --- Tool definitions ---

const runLintTool = createTool({
	name: "run_lint",
	description: "Run bun lint on a file or directory. Returns lint violations.",
	parameters: z.object({
		path: z.string().describe("File or directory path to lint"),
	}),
	handler: handleRunLint,
})

const runTypecheckTool = createTool({
	name: "run_typecheck",
	description: "Run TypeScript type checking. Returns type errors if any.",
	parameters: z.object({}),
	handler: handleRunTypecheck,
})

const analyzeImportsTool = createTool({
	name: "analyze_imports",
	description: "Map the import graph for a file. Shows what this file imports and from where.",
	parameters: z.object({
		path: z.string().describe("Absolute path to the file"),
	}),
	handler: handleAnalyzeImports,
})

const findUsagesTool = createTool({
	name: "find_usages",
	description: "Find all references to a symbol across the codebase.",
	parameters: z.object({
		symbol: z.string().describe("Symbol name to search for"),
		path: z.string().describe("Directory to search in"),
		glob: z.string().nullable().describe("Optional glob filter"),
	}),
	handler: handleFindUsages,
})

const getGitHistoryTool = createTool({
	name: "get_git_history",
	description: "Get recent git commits touching a specific file.",
	parameters: z.object({
		path: z.string().describe("File path to check history for"),
		count: z.number().describe("Number of commits to show").default(10),
	}),
	handler: handleGetGitHistory,
})

export {
	analyzeImportsTool,
	findUsagesTool,
	getGitHistoryTool,
	handleAnalyzeImports,
	handleFindUsages,
	handleGetGitHistory,
	handleRunLint,
	handleRunTypecheck,
	runLintTool,
	runTypecheckTool,
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/tools/analysis.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/tools/analysis.ts src/agents/tools/analysis.test.ts
git commit -m "feat: add analysis tools (lint, typecheck, imports, usages, git history)"
```

---

## Task 8: Conventions tool

**Files:**
- Create: `src/agents/tools/conventions.ts`
- Create: `src/agents/tools/conventions.test.ts`

Reads CLAUDE.md and all rules/*.md files so agents know codebase conventions.

**Step 1: Write the failing test**

Behavior: given a repo root containing CLAUDE.md and rules/*.md, returns their concatenated contents.

```typescript
// src/agents/tools/conventions.test.ts
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { handleReadConventions } from "@/agents/tools/conventions"
import { mkdtemp, mkdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

let testRepo: string

beforeAll(async () => {
	testRepo = await mkdtemp(join(tmpdir(), "conventions-test-"))
	await Bun.write(join(testRepo, "CLAUDE.md"), "# Project Rules\nUse bun.\n")
	await mkdir(join(testRepo, "rules"), { recursive: true })
	await Bun.write(join(testRepo, "rules", "no-try.md"), "### No try/catch\nUse errors.try().\n")
})

afterAll(async () => {
	await rm(testRepo, { recursive: true, force: true })
})

describe("handleReadConventions", () => {
	test("includes CLAUDE.md content", async () => {
		const result = await handleReadConventions({ repoRoot: testRepo })
		expect(result).toContain("# Project Rules")
		expect(result).toContain("Use bun.")
	})

	test("includes rules/*.md content", async () => {
		const result = await handleReadConventions({ repoRoot: testRepo })
		expect(result).toContain("no-try.md")
		expect(result).toContain("Use errors.try().")
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/tools/conventions.test.ts
```

**Step 3: Write implementation**

```typescript
// src/agents/tools/conventions.ts
import { createTool } from "@inngest/agent-kit"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

async function handleReadConventions({ repoRoot }: { repoRoot: string }) {
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
}

const readConventionsTool = createTool({
	name: "read_conventions",
	description: "Read the codebase conventions (CLAUDE.md + all rules/*.md). Call this before generating or reviewing code to understand the project's enforced patterns.",
	parameters: z.object({
		repoRoot: z.string().describe("Absolute path to the repository root"),
	}),
	handler: handleReadConventions,
})

export { handleReadConventions, readConventionsTool }
```

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/tools/conventions.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/tools/conventions.ts src/agents/tools/conventions.test.ts
git commit -m "feat: add conventions tool (reads CLAUDE.md + rules/*.md)"
```

---

## Task 9: Progress tool

**Files:**
- Create: `src/agents/tools/progress.ts`
- Create: `src/agents/tools/progress.test.ts`

Emits realtime events to the dashboard via Inngest publish. The `publish` function is only available inside Inngest function context, so this tool receives it via network state.

**Step 1: Write the failing test**

Behavior: handler returns the stage and detail it was given (confirmation for the caller).

```typescript
// src/agents/tools/progress.test.ts
import { describe, expect, test } from "bun:test"
import { handleEmitProgress } from "@/agents/tools/progress"

describe("handleEmitProgress", () => {
	test("returns emitted confirmation with stage and detail", async () => {
		const result = await handleEmitProgress({
			stage: "onboarding",
			detail: "exploring data layer",
		})
		expect(result).toEqual({
			emitted: true,
			stage: "onboarding",
			detail: "exploring data layer",
		})
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/tools/progress.test.ts
```

**Step 3: Write implementation**

```typescript
// src/agents/tools/progress.ts
import { createTool } from "@inngest/agent-kit"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

async function handleEmitProgress({ stage, detail }: { stage: string; detail: string }) {
	logger.info("agent progress", { stage, detail })
	return { emitted: true, stage, detail }
}

const emitProgressTool = createTool({
	name: "emit_progress",
	description: "Emit a progress update to the dashboard. Use this to report what you are doing and why.",
	parameters: z.object({
		stage: z.string().describe("Current stage or phase name"),
		detail: z.string().describe("What you are doing right now and why"),
	}),
	handler: handleEmitProgress,
})

export { emitProgressTool, handleEmitProgress }
```

**Note:** Full Inngest Realtime `publish()` integration will be wired in the pipeline task. For now, the tool logs the progress event. The dashboard integration is a separate plan.

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/tools/progress.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/tools/progress.ts src/agents/tools/progress.test.ts
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

describe("worktree lifecycle", () => {
	test("create → list → verify → delete → verify gone", async () => {
		// Create
		const branch = `test-wt-${Date.now()}`
		const wtPath = await createWorktree(testRepoPath, branch, "main")

		// List — new worktree appears
		const after = await listWorktrees(testRepoPath)
		const found = after.find(function matchBranch(wt) {
			return wt.branch === branch
		})
		expect(found).toBeDefined()

		// Status — should be clean
		const status = await worktreeStatus(wtPath)
		expect(status).toContain("(clean)")

		// Delete
		await deleteWorktree(testRepoPath, wtPath)

		// Verify gone
		const final = await listWorktrees(testRepoPath)
		const gone = final.find(function matchBranch(wt) {
			return wt.branch === branch
		})
		expect(gone).toBeUndefined()
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
- Create: `src/agents/tools/verification.test.ts`

Tools agents can use to verify their work against reality (Principle 3). Available to ALL agents.

**Step 1: Write the failing test**

Behaviors (tested against the current repo since it has real TypeScript and git history):
- `handleVerifyTypecheck` returns passed:true for a valid project
- `handleDiffCheck` returns diff or no-changes message

```typescript
// src/agents/tools/verification.test.ts
import { describe, expect, test } from "bun:test"
import {
	handleVerifyTypecheck,
	handleDiffCheck,
} from "@/agents/tools/verification"

const CWD = process.cwd()

describe("handleVerifyTypecheck", () => {
	test("returns passed:true for a valid project", async () => {
		const result = await handleVerifyTypecheck({ cwd: CWD })
		expect(result.passed).toBe(true)
		expect(result.output).toBe("All type checks passed.")
	})
})

describe("handleDiffCheck", () => {
	test("returns diff output or no-changes message", async () => {
		const result = await handleDiffCheck({ cwd: CWD, base: "main" })
		expect(typeof result).toBe("string")
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/tools/verification.test.ts
```

**Step 3: Write implementation**

```typescript
// src/agents/tools/verification.ts
import { createTool } from "@inngest/agent-kit"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// --- Handlers (exported for direct testing) ---

async function handleVerifyTypecheck({ cwd }: { cwd: string }) {
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
}

async function handleVerifyLint({ cwd, path }: { cwd: string; path: string | null }) {
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
}

async function handleVerifyTests({ cwd, filter }: { cwd: string; filter: string | null }) {
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
}

async function handleDiffCheck({ cwd, base }: { cwd: string; base: string }) {
	logger.debug("checking diff", { cwd, base })
	const proc = Bun.spawn(["git", "diff", `${base}...HEAD`], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	})
	const stdout = await new Response(proc.stdout).text()
	await proc.exited
	return stdout.trim() ? stdout : "No changes from base branch."
}

// --- Tool definitions ---

const verifyTypecheckTool = createTool({
	name: "verify_typecheck",
	description: "Run TypeScript typecheck and return exact errors with file:line locations. Use to verify code correctness.",
	parameters: z.object({
		cwd: z.string().describe("Working directory to run typecheck in"),
	}),
	handler: handleVerifyTypecheck,
})

const verifyLintTool = createTool({
	name: "verify_lint",
	description: "Run linter and return violations with rule names. Use to verify convention adherence.",
	parameters: z.object({
		cwd: z.string().describe("Working directory"),
		path: z.string().nullable().describe("Optional specific file/directory to lint"),
	}),
	handler: handleVerifyLint,
})

const verifyTestsTool = createTool({
	name: "verify_tests",
	description: "Run tests and return pass/fail results with assertion details.",
	parameters: z.object({
		cwd: z.string().describe("Working directory"),
		filter: z.string().nullable().describe("Optional test file or pattern filter"),
	}),
	handler: handleVerifyTests,
})

const diffCheckTool = createTool({
	name: "diff_check",
	description: "Show git diff against a base branch. Use to review changes made by implementation.",
	parameters: z.object({
		cwd: z.string().describe("Working directory (worktree path)"),
		base: z.string().describe("Base branch to diff against").default("main"),
	}),
	handler: handleDiffCheck,
})

export {
	diffCheckTool,
	handleDiffCheck,
	handleVerifyLint,
	handleVerifyTests,
	handleVerifyTypecheck,
	verifyLintTool,
	verifyTestsTool,
	verifyTypecheckTool,
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/tools/verification.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/tools/verification.ts src/agents/tools/verification.test.ts
git commit -m "feat: add verification tools (typecheck, lint, tests, diff)"
```

---

## Task 12: Explorer agent factory

**Files:**
- Create: `src/agents/agents/explorer.ts`
- Create: `src/agents/agents/explorer.test.ts`

**Step 1: Write the failing test**

Behaviors to test:
- Factory produces an agent that can be passed to `createNetwork` (integration — proves the agent is valid AgentKit structure)
- Factory accepts custom config (different provider, different prompt)

```typescript
// src/agents/agents/explorer.test.ts
import { describe, expect, test } from "bun:test"
import { createNetwork } from "@inngest/agent-kit"
import { createExplorerAgent } from "@/agents/agents/explorer"
import { DEFAULT_CONFIG } from "@/agents/config"

describe("createExplorerAgent", () => {
	test("produces an agent accepted by createNetwork", () => {
		const agent = createExplorerAgent(DEFAULT_CONFIG.explorer)
		// The real test: createNetwork accepts this agent without throwing
		const network = createNetwork({
			name: "test-explorer",
			agents: [agent],
			maxIter: 1,
		})
		expect(network.name).toBe("test-explorer")
	})

	test("accepts custom provider and prompt", () => {
		const agent = createExplorerAgent({
			model: { provider: "openai", model: "gpt-4o" },
			systemPrompt: "Custom explorer prompt.",
		})
		const network = createNetwork({
			name: "test-custom",
			agents: [agent],
			maxIter: 1,
		})
		expect(network.name).toBe("test-custom")
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
- Create: `src/agents/agents/specialist.test.ts`

Same pattern as explorer but with analysis tools included.

**Step 1: Write the failing test**

Behavior: factory produces an agent accepted by `createNetwork`.

```typescript
// src/agents/agents/specialist.test.ts
import { describe, expect, test } from "bun:test"
import { createNetwork } from "@inngest/agent-kit"
import { createSpecialistAgent } from "@/agents/agents/specialist"
import { DEFAULT_CONFIG } from "@/agents/config"

describe("createSpecialistAgent", () => {
	test("produces an agent accepted by createNetwork", () => {
		const agent = createSpecialistAgent(DEFAULT_CONFIG.specialist)
		const network = createNetwork({
			name: "test-specialist",
			agents: [agent],
			maxIter: 1,
		})
		expect(network.name).toBe("test-specialist")
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/agents/specialist.test.ts
```

**Step 3: Write implementation**

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

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/agents/specialist.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/agents/specialist.ts src/agents/agents/specialist.test.ts
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

Behaviors to test:
- `buildSlicePrompt` includes the target path and slice-specific instructions
- `buildSlicePrompt` for each valid slice produces a non-empty prompt with instructions
- `createSliceNetwork` produces a network accepted by AgentKit (integration)

```typescript
// src/agents/primitives/onboard.test.ts
import { describe, expect, test } from "bun:test"
import {
	buildSlicePrompt,
	createSliceNetwork,
	DEFAULT_SLICES,
} from "@/agents/primitives/onboard"
import { DEFAULT_CONFIG } from "@/agents/config"

describe("buildSlicePrompt", () => {
	test("includes target path and slice-specific instructions", () => {
		const prompt = buildSlicePrompt("/my/repo", "data-layer")
		expect(prompt).toContain("/my/repo")
		expect(prompt).toContain("data-layer")
		expect(prompt).toContain("database schema")
	})

	test("produces non-empty prompt for every default slice", () => {
		for (const slice of DEFAULT_SLICES) {
			const prompt = buildSlicePrompt("/repo", slice)
			expect(prompt.length).toBeGreaterThan(100)
			expect(prompt).toContain(slice)
			expect(prompt).toContain("save_summary")
		}
	})
})

describe("createSliceNetwork", () => {
	test("produces a valid network with router", () => {
		const network = createSliceNetwork(
			DEFAULT_CONFIG.explorer,
			"/repo",
			"structure",
		)
		expect(network.name).toBe("explore-structure")
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
	createSliceNetwork,
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
