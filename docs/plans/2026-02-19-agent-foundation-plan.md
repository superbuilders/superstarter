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
- **Known `as` usages in plan code:** Several code blocks use `as` for brevity. The implementer MUST replace these with Zod runtime validation per `rules/no-as-type-assertion.md`.

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

Also install the Inngest test utilities as a dev dependency:

```bash
bun add -D @inngest/test
```

Note: `@inngest/test` is required for `InngestTestEngine` — used to test Inngest function orchestration (step execution order, state transitions, event routing). Task 16 (integration tests) and Task 15 unit tests depend on it being available.

**Step 2: Add API key environment variables**

In `src/env.ts`, add to the `server` section after `DATABASE_URL`:

```typescript
// Read-only DB connection for agent queryDb tool — enforces read-only at connection level
DATABASE_URL_READONLY: z.string().url(),
ANTHROPIC_API_KEY: z.string().min(1).optional(),
OPENAI_API_KEY: z.string().min(1).optional(),
GEMINI_API_KEY: z.string().min(1).optional(),
XAI_API_KEY: z.string().min(1).optional(),
GROK_BASE_URL: z.string().url().optional().default("https://api.x.ai/v1"),
```

Add to `runtimeEnv` section:

```typescript
DATABASE_URL_READONLY: process.env.DATABASE_URL_READONLY,
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
OPENAI_API_KEY: process.env.OPENAI_API_KEY,
GEMINI_API_KEY: process.env.GEMINI_API_KEY,
XAI_API_KEY: process.env.XAI_API_KEY,
GROK_BASE_URL: process.env.GROK_BASE_URL,
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

First, define the `workflowConfigOverridesSchema` — a typed schema that mirrors `Partial<WorkflowConfig>` so the event payload carries structured config overrides rather than an untyped record. This schema references the per-role agent config shape that Task 4 will define in `src/agents/config.ts`. Forward-declaration note: `agentConfigSchema` and `modelConfigSchema` used here are defined in Task 4 (`src/agents/config.ts`). Import them from there once Task 4 is complete; for now, inline the shapes to keep this task self-contained.

The schema has one optional key per agent role (the 6 roles the architecture defines: `explorer`, `specialist`, `concept`, `critic`, `reviewer`, `implementer`). Each role value is an optional object containing an optional `model` (the model config shape) and an optional `systemPrompt` string. The outer schema uses `.nullable()` for AgentKit JSON Schema compat — matching the project convention that optional AgentKit parameters use `.nullable()` rather than `.optional()`.

```typescript
// Inline model config shape — mirrors modelConfigSchema from Task 4
const planModelConfigSchema = z.object({
	provider: z.enum(["anthropic", "openai", "gemini", "grok"]),
	model: z.string().min(1),
	temperature: z.number().min(0).max(2).nullable(),
	maxTokens: z.number().int().positive().nullable(),
})

// Inline per-role agent config shape — mirrors agentConfigSchema from Task 4
const planAgentConfigSchema = z.object({
	model: planModelConfigSchema.optional(),
	systemPrompt: z.string().min(1).optional(),
})

// Typed configOverrides — mirrors Partial<WorkflowConfig> with all 6 agent roles
// Use .nullable() on the outer schema for AgentKit JSON Schema compat
// Once Task 4 is complete, replace inline schemas above with imports from @/agents/config
const workflowConfigOverridesSchema = z.object({
	explorer: planAgentConfigSchema.optional(),
	specialist: planAgentConfigSchema.optional(),
	concept: planAgentConfigSchema.optional(),
	critic: planAgentConfigSchema.optional(),
	reviewer: planAgentConfigSchema.optional(),
	implementer: planAgentConfigSchema.optional(),
}).nullable()
```

Add these Zod schemas to the `schema` object in `src/inngest/index.ts`:

```typescript
"agent/feature.requested": z.object({
	feature: z.string().min(1),
	baseBranch: z.string().default("main"),
	branchName: z.string().min(1),
	presetId: z.string().uuid().nullable(),
	configOverrides: workflowConfigOverridesSchema,
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
- Create: `src/db/scripts/seed-judges.ts`

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
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// --- Agent Presets ---
const coreAgentPreset = coreSchema.table("agent_preset", {
	id: uuid().primaryKey().defaultRandom(),
	name: varchar({ length: 255 }).notNull(),
	workflowType: varchar("workflow_type", { length: 64 }).notNull(),
	config: jsonb().notNull(),
	isDefault: boolean("is_default").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// --- Judge Personalities ---
const coreJudgePersonality = coreSchema.table("judge_personality", {
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
const coreWorkflowRun = coreSchema.table("workflow_run", {
	id: uuid().primaryKey().defaultRandom(),
	feature: text().notNull(),
	branchName: varchar("branch_name", { length: 255 }).notNull(),
	worktreePath: varchar("worktree_path", { length: 500 }),
	worktreeStatus: varchar("worktree_status", { length: 32 }).notNull().default("pending"),
	status: varchar({ length: 32 }).notNull().default("running"),
	phase: varchar({ length: 32 }).notNull().default("onboarding"),
	// FK to agent_preset — set null when preset is deleted so history is preserved
	presetId: uuid("preset_id").references(() => coreAgentPreset.id, { onDelete: "set null" }),
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

// Enforces one default preset per workflow type.
// Without this, loadDefaultPreset() would be ambiguous when multiple rows
// have isDefault = true for the same workflowType.
const agentPresetDefaultPerTypeIdx = uniqueIndex("agent_preset_default_per_type")
	.on(coreAgentPreset.workflowType)
	.where(sql`${coreAgentPreset.isDefault} = true`)
```

Add these to the file's `export { }` block at the bottom:

```typescript
export { agentPresetDefaultPerTypeIdx, coreAgentPreset, coreJudgePersonality, coreWorkflowRun }
```

**Step 2: Seed built-in judge personalities**

Create `src/db/scripts/seed-judges.ts`. Run once after initial migration. Never run automatically — human-reviewed like migrations.

```typescript
// src/db/scripts/seed-judges.ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { db } from "@/db"
import { coreJudgePersonality } from "@/db/schemas/core"

const BUILT_IN_JUDGES = [
	{
		name: "The Skeptic",
		slug: "skeptic",
		persona: "You are a relentless skeptic. You assume nothing is correct until proven otherwise.",
		evaluationFocus: "Failure modes, edge cases, unstated assumptions",
		model: { provider: "anthropic", model: "claude-sonnet-4-6" },
		isActive: true,
		isBuiltIn: true,
	},
	{
		name: "Technical Architect",
		slug: "architect",
		persona: "You are a seasoned systems architect who thinks in structures, not features.",
		evaluationFocus: "Structural soundness, SOLID principles, coupling, scalability",
		model: { provider: "anthropic", model: "claude-sonnet-4-6" },
		isActive: true,
		isBuiltIn: true,
	},
	{
		name: "Linus Torvalds",
		slug: "linus",
		persona: "You have zero tolerance for unnecessary complexity. If it can be simpler, it must be simpler.",
		evaluationFocus: "Simplicity, zero tolerance for over-engineering",
		model: { provider: "anthropic", model: "claude-sonnet-4-6" },
		isActive: true,
		isBuiltIn: true,
	},
	{
		name: "The Pragmatist",
		slug: "pragmatist",
		persona: "You weigh shipping velocity against code quality with an unflinching eye on the calendar.",
		evaluationFocus: "Ship velocity vs. quality trade-offs",
		model: { provider: "anthropic", model: "claude-sonnet-4-6" },
		isActive: true,
		isBuiltIn: true,
	},
] as const

async function main() {
	logger.info("seeding built-in judges", { count: BUILT_IN_JUDGES.length })

	const result = await errors.try(
		db
			.insert(coreJudgePersonality)
			.values(BUILT_IN_JUDGES)
			.onConflictDoNothing({ target: coreJudgePersonality.slug })
	)
	if (result.error) {
		logger.error("judge seed failed", { error: result.error })
		throw errors.wrap(result.error, "judge seed insert")
	}

	logger.info("built-in judges seeded")
}

const runResult = await errors.try(main())
if (runResult.error) {
	logger.error("seed script failed", { error: runResult.error })
	process.exit(1)
}
```

Run with:

```bash
bun src/db/scripts/seed-judges.ts
```

**Step 3: Verify typecheck**

```bash
bun typecheck
```

**Step 4: Commit**

```bash
git add src/db/schemas/core.ts src/db/scripts/seed-judges.ts
git commit -m "feat: add agent_preset, judge_personality, and workflow_run DB tables"
```

**Note:** Do NOT run `bun db:generate`. Migrations are human-reviewed per CLAUDE.md.

---

## Task 4: Config system — types and resolution

**Files:**
- Create: `src/agents/config.ts`
- Create: `src/agents/config.test.ts`

**Step 1: Write the failing tests**

Behaviors to test:

- `deepMerge` merges nested `ModelConfig` fields individually, not wholesale
- `resolveConfig` with no preset and no DB default returns `DEFAULT_CONFIG`
- `resolveConfig` with overrides applies them on top of the resolved base
- `loadPreset` returns `undefined` for a nonexistent ID
- `loadDefaultPreset` returns the row where `isDefault = true` for the given workflow type

(We do NOT test that `DEFAULT_CONFIG` has certain keys — TypeScript enforces that at compile time via the `WorkflowConfig` type.)

Note on DB tests: `loadPreset` and `loadDefaultPreset` query the real database. Run these tests against a local test database with the schema already migrated. No mocks — the architecture's testing philosophy requires integration fidelity.

```typescript
// src/agents/config.test.ts
import { describe, expect, test } from "bun:test"
import {
	DEFAULT_CONFIG,
	deepMerge,
	resolveConfig,
} from "@/agents/config"

describe("deepMerge", () => {
	test("merges nested model fields individually", () => {
		const base = DEFAULT_CONFIG
		const overlay = {
			explorer: {
				model: { provider: "openai" as const, model: "gpt-4o" },
				systemPrompt: base.explorer.systemPrompt,
			},
		}
		const result = deepMerge(base, overlay)
		expect(result.explorer.model.provider).toBe("openai")
		expect(result.explorer.model.model).toBe("gpt-4o")
		// Other agents untouched
		expect(result.concept).toEqual(base.concept)
		expect(result.reviewer).toEqual(base.reviewer)
	})

	test("systemPrompt replaces entirely when overridden", () => {
		const base = DEFAULT_CONFIG
		const overlay = {
			explorer: {
				model: base.explorer.model,
				systemPrompt: "replacement prompt",
			},
		}
		const result = deepMerge(base, overlay)
		expect(result.explorer.systemPrompt).toBe("replacement prompt")
	})

	test("empty overlay produces a deep clone of base", () => {
		const result = deepMerge(DEFAULT_CONFIG, {})
		expect(result).toEqual(DEFAULT_CONFIG)
		expect(result).not.toBe(DEFAULT_CONFIG)
		// Verify deep clone — mutating result must not affect base
		result.explorer.systemPrompt = "mutated"
		expect(DEFAULT_CONFIG.explorer.systemPrompt).not.toBe("mutated")
	})
})

describe("resolveConfig", () => {
	test("no preset and no DB default returns DEFAULT_CONFIG", async () => {
		// Assumes test DB has no default preset for this workflow type
		const result = await resolveConfig("nonexistent-workflow-type")
		expect(result).toEqual(DEFAULT_CONFIG)
	})

	test("overrides are applied on top of the resolved base", async () => {
		const overrides = {
			explorer: {
				model: { provider: "openai" as const, model: "gpt-4o" },
				systemPrompt: "custom explorer",
			},
		}
		const result = await resolveConfig("nonexistent-workflow-type", undefined, overrides)
		expect(result.explorer.model.provider).toBe("openai")
		expect(result.explorer.systemPrompt).toBe("custom explorer")
		// Non-overridden agents come from DEFAULT_CONFIG
		expect(result.concept).toEqual(DEFAULT_CONFIG.concept)
	})
})

describe("loadPreset", () => {
	test("returns undefined for nonexistent ID", async () => {
		const { loadPreset } = await import("@/agents/config")
		// Use a valid UUID format that does not exist in the DB
		const result = await loadPreset("00000000-0000-0000-0000-000000000000")
		expect(result).toBeUndefined()
	})
})

describe("loadDefaultPreset", () => {
	test("returns undefined when no default exists for workflow type", async () => {
		const { loadDefaultPreset } = await import("@/agents/config")
		const result = await loadDefaultPreset("nonexistent-workflow-type")
		expect(result).toBeUndefined()
	})
})
```

**Step 2: Run tests to verify they fail**

```bash
bun test src/agents/config.test.ts
```

Expected: FAIL — module `@/agents/config` not found.

**Step 3: Write implementation**

```typescript
// src/agents/config.ts
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { coreAgentPreset } from "@/db/schemas/core"
import { env } from "@/env"

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

// deepMerge merges overlay into base at the AgentConfig level.
// For each agent key present in overlay, individual ModelConfig fields
// are merged one by one (model, provider, parameters) rather than
// replacing the entire AgentConfig wholesale. systemPrompt replaces entirely.
function deepMerge(base: WorkflowConfig, overlay: Partial<WorkflowConfig>): WorkflowConfig {
	const result = structuredClone(base)
	for (const key of AGENT_KEYS) {
		const over = overlay[key]
		if (!over) {
			continue
		}
		result[key] = {
			model: {
				provider: over.model.provider,
				model: over.model.model,
				parameters: over.model.parameters,
			},
			systemPrompt: over.systemPrompt,
		}
	}
	return result
}

// loadPreset fetches a named preset from the DB by ID.
// Returns undefined if no preset with that ID exists.
async function loadPreset(presetId: string): Promise<WorkflowConfig | undefined> {
	logger.debug("loading preset", { presetId })
	const result = await errors.try(
		db
			.select({ config: coreAgentPreset.config })
			.from(coreAgentPreset)
			.where(eq(coreAgentPreset.id, presetId))
			.limit(1)
	)
	if (result.error) {
		logger.error("preset load failed", { error: result.error, presetId })
		throw errors.wrap(result.error, "preset load")
	}
	const row = result.data[0]
	if (!row) {
		return undefined
	}
	return row.config as WorkflowConfig
}

// loadDefaultPreset fetches the preset marked isDefault = true for the given
// workflow type. Returns undefined when no default exists in the DB.
// The unique partial index `agent_preset_default_per_type` guarantees at most
// one default row per workflow type, so .limit(1) is a safety measure only.
async function loadDefaultPreset(workflowType: string): Promise<WorkflowConfig | undefined> {
	logger.debug("loading default preset", { workflowType })
	const result = await errors.try(
		db
			.select({ config: coreAgentPreset.config })
			.from(coreAgentPreset)
			.where(and(
				eq(coreAgentPreset.workflowType, workflowType),
				eq(coreAgentPreset.isDefault, true),
			))
			.limit(1)
	)
	if (result.error) {
		logger.error("default preset load failed", { error: result.error, workflowType })
		throw errors.wrap(result.error, "default preset load")
	}
	const row = result.data[0]
	if (!row) {
		return undefined
	}
	return row.config as WorkflowConfig
}

// resolveConfig implements the 4-level resolution pipeline:
//   1. Start from code DEFAULT_CONFIG
//   2. Apply DB default preset for this workflow type (if any)
//   3. Apply named preset if presetId is given (overrides the default preset)
//   4. Apply per-run overrides on top of everything
async function resolveConfig(
	workflowType: string,
	presetId?: string,
	overrides?: Partial<WorkflowConfig>,
): Promise<WorkflowConfig> {
	logger.debug("resolving config", { workflowType, presetId })
	let config = structuredClone(DEFAULT_CONFIG)

	const preset = presetId
		? await loadPreset(presetId)
		: await loadDefaultPreset(workflowType)

	if (preset) {
		config = deepMerge(config, preset)
	}

	if (overrides) {
		config = deepMerge(config, overrides)
	}

	logger.debug("config resolved", { workflowType, hasPreset: preset !== undefined, hasOverrides: overrides !== undefined })
	return config
}

// Zod schema for config overrides in event payloads.
// Task 2 inlines this shape in the Inngest event schema; once Task 4 is complete,
// Task 2 should import from here to stay DRY. Task 15 imports from here.
const modelConfigSchema = z.object({
	provider: z.enum(["anthropic", "openai", "gemini", "grok"]),
	model: z.string().min(1),
	temperature: z.number().min(0).max(2).nullable(),
	maxTokens: z.number().int().positive().nullable(),
})

const agentConfigSchema = z.object({
	model: modelConfigSchema.optional(),
	systemPrompt: z.string().min(1).optional(),
})

const workflowConfigOverridesSchema = z.object({
	explorer: agentConfigSchema.optional(),
	specialist: agentConfigSchema.optional(),
	concept: agentConfigSchema.optional(),
	critic: agentConfigSchema.optional(),
	reviewer: agentConfigSchema.optional(),
	implementer: agentConfigSchema.optional(),
}).nullable()

export { AGENT_KEYS, DEFAULT_CONFIG, deepMerge, loadDefaultPreset, loadPreset, resolveConfig, workflowConfigOverridesSchema }
export type { AgentConfig, ModelConfig, WorkflowConfig }
```

**Step 4: Run tests to verify they pass**

```bash
bun test src/agents/config.test.ts
```

Expected: all PASS.

**Step 5: Commit**

```bash
git add src/agents/config.ts src/agents/config.test.ts
git commit -m "feat: add agent config types, deepMerge, loadPreset, loadDefaultPreset, resolveConfig"
```

---

## Task 5: Model resolver utility

**Files:**
- Modify: `src/agents/config.ts`
- Modify: `src/agents/config.test.ts`
- Modify: `src/env.ts`

The AgentKit model constructors (`anthropic()`, `openai()`, `gemini()`) need to be called with the right parameters. This utility maps our `ModelConfig` to an AgentKit `AiAdapter`. Grok uses the OpenAI-compatible API but requires a dedicated `baseURL` and `apiKey` sourced from env vars.

**Step 1: Add Grok env vars to `src/env.ts`**

Add `GROK_BASE_URL` and `XAI_API_KEY` to the T3 Env schema:

```typescript
server: {
	// ... existing vars ...
	GROK_BASE_URL: z.url().optional(),
	XAI_API_KEY: z.string().optional(),
},

runtimeEnv: {
	// ... existing vars ...
	GROK_BASE_URL: process.env.GROK_BASE_URL,
	XAI_API_KEY: process.env.XAI_API_KEY,
},
```

Default `GROK_BASE_URL` is `https://api.x.ai/v1`. Document in `.env.example`:

```bash
# xAI Grok (OpenAI-compatible)
GROK_BASE_URL=https://api.x.ai/v1
XAI_API_KEY=
```

**Step 2: Write the failing tests**

Behaviors to test:
- Each provider's adapter is accepted by `createAgent` (integration test — proves the adapter is real, not just non-null)
- Grok uses the OpenAI-compatible adapter with the correct `baseURL`

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

	test("grok uses openai-compatible adapter with correct baseURL", () => {
		const adapter = resolveModel({ provider: "grok", model: "grok-beta" })
		const agent = createAgent({ name: "test", model: adapter, system: "test" })
		expect(agent.name).toBe("test")
		// Verify the adapter was constructed with the xAI base URL.
		// The adapter object exposes its options; check the baseURL was threaded through.
		// If the AgentKit adapter does not expose options directly, the createAgent
		// acceptance test above is sufficient proof of correctness at the integration level.
	})
})
```

**Step 3: Run tests to verify they fail**

```bash
bun test src/agents/config.test.ts
```

Expected: FAIL — `resolveModel` not exported.

**Step 4: Write implementation**

Add to `src/agents/config.ts` (at the top, with other imports):

```typescript
import {
	anthropic,
	gemini,
	openai,
} from "@inngest/agent-kit"
import { env } from "@/env"
```

Add the `resolveModel` function body (before the `export { }` block):

```typescript
// resolveModel maps a ModelConfig to an AgentKit AiAdapter.
// Grok uses the OpenAI-compatible API at api.x.ai. Both GROK_BASE_URL and
// XAI_API_KEY are required in env when the grok provider is used.
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

	// Grok uses the OpenAI-compatible API endpoint.
	// GROK_BASE_URL defaults to https://api.x.ai/v1.
	// XAI_API_KEY must be set for authentication.
	if (!env.GROK_BASE_URL) {
		logger.error("GROK_BASE_URL not configured for grok provider", { model: config.model })
		throw errors.new("GROK_BASE_URL required for grok provider")
	}
	if (!env.XAI_API_KEY) {
		logger.error("XAI_API_KEY not configured for grok provider", { model: config.model })
		throw errors.new("XAI_API_KEY required for grok provider")
	}
	return openai({
		baseURL: env.GROK_BASE_URL,
		apiKey: env.XAI_API_KEY,
		model: config.model,
		defaultParameters: params,
	})
}
```

Update the `export { }` block to include `resolveModel`:

```typescript
export { AGENT_KEYS, DEFAULT_CONFIG, deepMerge, loadDefaultPreset, loadPreset, resolveConfig, resolveModel, workflowConfigOverridesSchema }
export type { AgentConfig, ModelConfig, WorkflowConfig }
```

**Step 5: Run tests to verify they pass**

```bash
bun test src/agents/config.test.ts
```

**Step 6: Commit**

```bash
git add src/agents/config.ts src/agents/config.test.ts src/env.ts
git commit -m "feat: add resolveModel utility for AgentKit provider adapters"
```

---
## Task 6: Core filesystem tools

**Files:**
- Create: `src/agents/tools/filesystem.ts`
- Create: `src/agents/tools/filesystem.test.ts`

These tools are read-only, shared across all agents. They wrap Bun APIs and ripgrep.

> NOTE ON LOGGING IN TOOLS: Tool handlers use `@superbuilders/slog` directly. This is correct — tools are standalone functions testable outside Inngest. When Inngest functions call these tools, the tool's slog output goes to stdout independently of Inngest's memoization-aware logger. This is acceptable because tool handlers are deterministic and don't run during Inngest replay (tools are called by the LLM, not by step functions). The Inngest `logger` parameter convention applies only to code inside `step.run()` callbacks.

> NOTE: Architecture spec defines `searchCode` with params `{ pattern: string, glob?: string }` (no `path`, optional `glob`). We add required `path` for worktree-scoped operation and use `.nullable()` for AgentKit compat instead of `.optional()`. This is an intentional deviation from the architecture.

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
	// Architecture spec: search_code params are { pattern: string, glob?: string }
	// We add required `path` for worktree-scoped operation and use .nullable() for AgentKit compat.
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

> NOTE ON LOGGING IN TOOLS: Tool handlers use `@superbuilders/slog` directly. This is correct — tools are standalone functions testable outside Inngest. When Inngest functions call these tools, the tool's slog output goes to stdout independently of Inngest's memoization-aware logger. This is acceptable because tool handlers are deterministic and don't run during Inngest replay (tools are called by the LLM, not by step functions). The Inngest `logger` parameter convention applies only to code inside `step.run()` callbacks.

> NOTE: Architecture spec defines `findUsages` with params `{ symbol: string, glob?: string }` (no `path`, optional `glob`). We add required `path` for worktree-scoped operation and use `.nullable()` for AgentKit compat instead of `.optional()`. This is an intentional deviation from the architecture.

> NOTE: Architecture spec defines `runTypecheck` with params `{ path?: string }`. The current plan had no params. An optional `path` parameter has been added: when provided, the handler scopes the typecheck to that file or directory; when absent, it runs project-wide. `.nullable()` is used for AgentKit JSON Schema compat rather than `.optional()`.

**Step 1: Write the failing test**

Behaviors to test (against the current repo — it's a real project with git history and imports):
- `handleAnalyzeImports` finds import statements in a known file
- `handleFindUsages` finds references to a known symbol
- `handleGetGitHistory` returns commits for a tracked file
- `handleRunTypecheck` runs project-wide when no path given
- `handleRunTypecheck` runs scoped when path is provided

```typescript
// src/agents/tools/analysis.test.ts
import { describe, expect, test } from "bun:test"
import {
	handleAnalyzeImports,
	handleFindUsages,
	handleGetGitHistory,
	handleRunTypecheck,
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

describe("handleRunTypecheck", () => {
	test("runs project-wide when no path given", async () => {
		const result = await handleRunTypecheck({ path: null })
		// Either passes cleanly or returns type errors — both are valid strings
		expect(typeof result).toBe("string")
		expect(result.length).toBeGreaterThan(0)
	})

	test("runs scoped to a directory when path is provided", async () => {
		const result = await handleRunTypecheck({ path: `${REPO_ROOT}/src/env.ts` })
		expect(typeof result).toBe("string")
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

// Architecture spec: runTypecheck params are { path?: string }.
// We use .nullable() for AgentKit JSON Schema compat. When path is provided, typecheck is scoped
// to that file/directory; when null, runs project-wide.
async function handleRunTypecheck({ path }: { path: string | null }) {
	logger.debug("running typecheck", { path })
	const args = ["bun", "typecheck"]
	if (path) {
		args.push("--", path)
	}
	const proc = Bun.spawn(args, {
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
	// Architecture spec: runTypecheck params are { path?: string }.
	// We use .nullable() for AgentKit JSON Schema compat. Null = project-wide run.
	description: "Run TypeScript type checking. Pass a path to scope to a file or directory, or null for project-wide. Returns type errors if any.",
	parameters: z.object({
		path: z.string().nullable().describe("File or directory to typecheck, or null for project-wide"),
	}),
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
	// Architecture spec: find_usages params are { symbol: string, glob?: string }
	// We add required `path` for worktree-scoped operation and use .nullable() for AgentKit compat.
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

> NOTE ON LOGGING IN TOOLS: Tool handlers use `@superbuilders/slog` directly. This is correct — tools are standalone functions testable outside Inngest. When Inngest functions call these tools, the tool's slog output goes to stdout independently of Inngest's memoization-aware logger. This is acceptable because tool handlers are deterministic and don't run during Inngest replay (tools are called by the LLM, not by step functions). The Inngest `logger` parameter convention applies only to code inside `step.run()` callbacks.

> NOTE: Architecture spec names this tool `read_claude_md` with params `{}`. We rename it to `read_conventions` for clarity and add `repoRoot: string` for testability — without it, the handler cannot be tested in isolation without mocking the process working directory. The tool name in code is `read_conventions`; the architecture's name (`read_claude_md`) is preserved here for traceability. This is an intentional deviation.

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

// Architecture spec names this tool `read_claude_md` with params {}.
// We rename to `read_conventions` for clarity and add `repoRoot` for testability.
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

> NOTE ON LOGGING IN TOOLS: Tool handlers use `@superbuilders/slog` directly. This is correct — tools are standalone functions testable outside Inngest. When Inngest functions call these tools, the tool's slog output goes to stdout independently of Inngest's memoization-aware logger. This is acceptable because tool handlers are deterministic and don't run during Inngest replay (tools are called by the LLM, not by step functions). The Inngest `logger` parameter convention applies only to code inside `step.run()` callbacks.

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
	// TODO(pipeline-plan): Replace slog stub with inngest.realtime.publish(channel, topic, data)
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

**Note:** Full Inngest Realtime wiring is deferred to Plan 4 (Inngest Pipeline Wiring). That plan will add the Realtime channel definition and the `inngest.realtime.publish(channel, topic, data)` call in place of the current slog stub. The `totalTokens` and `estimatedCost` columns on `workflow_runs` will also be populated there, once token counts are available from step results. For now, the tool logs the progress event so the handler is testable in isolation.

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
## Task 10: Workspace management tools

**Files:**
- Create: `src/agents/tools/workspace.ts`
- Create: `src/agents/tools/workspace.test.ts`

These are `createTool()` wrappers (following the same pattern as filesystem, analysis, etc.) for git worktree lifecycle management. They live in the tool layer at `src/agents/tools/workspace.ts`. Handler functions are exported separately to allow direct testing without going through the AgentKit tool-call interface.

**Step 1: Write the failing test**

```typescript
// src/agents/tools/workspace.test.ts
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
	handleCreateWorktree,
	handleDeleteWorktree,
	handleListWorktrees,
	handleWorktreeStatus,
} from "@/agents/tools/workspace"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

let testRepoPath: string

beforeAll(async () => {
	testRepoPath = await mkdtemp(join(tmpdir(), "agent-workspace-test-"))
	// Initialize a git repo for testing
	const init = Bun.spawn(["git", "init", testRepoPath], { stdout: "pipe" })
	await init.exited
	// Create an initial commit (required for worktrees) — awaited to prevent race condition
	const commit = Bun.spawn(
		["git", "-C", testRepoPath, "commit", "--allow-empty", "-m", "init"],
		{ stdout: "pipe" },
	)
	await commit.exited
})

afterAll(async () => {
	await rm(testRepoPath, { recursive: true, force: true })
})

describe("handleListWorktrees", () => {
	test("returns at least the main worktree", async () => {
		const result = await handleListWorktrees({ repoRoot: testRepoPath })
		expect(result.length).toBeGreaterThanOrEqual(1)
	})
})

describe("worktree lifecycle", () => {
	test("create → list → verify → delete → verify gone", async () => {
		// Create
		const branch = `test-wt-${Date.now()}`
		const wtPath = await handleCreateWorktree({
			repoRoot: testRepoPath,
			branch,
			baseBranch: "main",
		})

		// List — new worktree appears
		const after = await handleListWorktrees({ repoRoot: testRepoPath })
		const found = after.find(function matchBranch(wt) {
			return wt.branch === branch
		})
		expect(found).toBeDefined()

		// Status — should be clean
		const status = await handleWorktreeStatus({ repoRoot: testRepoPath, path: wtPath })
		expect(status).toContain("(clean)")

		// Delete
		await handleDeleteWorktree({ repoRoot: testRepoPath, path: wtPath })

		// Verify gone
		const final = await handleListWorktrees({ repoRoot: testRepoPath })
		const gone = final.find(function matchBranch(wt) {
			return wt.branch === branch
		})
		expect(gone).toBeUndefined()
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/agents/tools/workspace.test.ts
```

**Step 3: Write implementation**

```typescript
// src/agents/tools/workspace.ts
import { createTool } from "@inngest/agent-kit"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// --- Shared types ---

interface WorktreeInfo {
	path: string
	branch: string
	head: string
}

// --- Internal helper ---

async function runGit(args: string[], cwd: string): Promise<string> {
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

// --- Handlers (exported for direct testing) ---

async function handleCreateWorktree({
	repoRoot,
	branch,
	baseBranch,
}: {
	repoRoot: string
	branch: string
	baseBranch: string | null
}): Promise<string> {
	const base = baseBranch ?? "main"
	logger.info("creating worktree", { repoRoot, branch, base })
	const worktreePath = `${repoRoot}/../worktrees/${branch}`
	await runGit(["worktree", "add", "-b", branch, worktreePath, base], repoRoot)
	return worktreePath
}

async function handleDeleteWorktree({
	repoRoot,
	path,
}: {
	repoRoot: string
	path: string
}): Promise<void> {
	logger.info("deleting worktree", { repoRoot, path })
	await runGit(["worktree", "remove", path, "--force"], repoRoot)
}

async function handleListWorktrees({
	repoRoot,
}: {
	repoRoot: string
}): Promise<WorktreeInfo[]> {
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

async function handleWorktreeStatus({
	repoRoot,
	path,
}: {
	repoRoot: string
	path: string
}): Promise<string> {
	logger.debug("checking worktree status", { repoRoot, path })
	const status = await runGit(["status", "--short"], path)
	const log = await runGit(["log", "--oneline", "--max-count=5"], path)
	return `Status:\n${status ? status : "(clean)"}\n\nRecent commits:\n${log}`
}

// --- Tool definitions ---

const createWorktreeTool = createTool({
	name: "create_worktree",
	description:
		"Create an isolated git worktree on a new branch. Use at the start of any workflow run to ensure filesystem isolation.",
	parameters: z.object({
		repoRoot: z.string().describe("Absolute path to the repository root"),
		branch: z.string().describe("New branch name to create the worktree on"),
		baseBranch: z
			.string()
			.nullable()
			.default("main")
			.describe("Branch to base the worktree on (defaults to main)"),
	}),
	handler: handleCreateWorktree,
})

const deleteWorktreeTool = createTool({
	name: "delete_worktree",
	description: "Remove a git worktree and its branch. Use for cleanup after workflow completes or is abandoned.",
	parameters: z.object({
		repoRoot: z.string().describe("Absolute path to the repository root"),
		path: z.string().describe("Absolute path to the worktree to remove"),
	}),
	handler: handleDeleteWorktree,
})

const listWorktreesTool = createTool({
	name: "list_worktrees",
	description: "List all active git worktrees with branch and HEAD commit.",
	parameters: z.object({
		repoRoot: z.string().describe("Absolute path to the repository root"),
	}),
	handler: handleListWorktrees,
})

const worktreeStatusTool = createTool({
	name: "worktree_status",
	description: "Get git status and recent commits for a specific worktree.",
	parameters: z.object({
		repoRoot: z.string().describe("Absolute path to the repository root"),
		path: z.string().describe("Absolute path to the worktree to inspect"),
	}),
	handler: handleWorktreeStatus,
})

export {
	createWorktreeTool,
	deleteWorktreeTool,
	handleCreateWorktree,
	handleDeleteWorktree,
	handleListWorktrees,
	handleWorktreeStatus,
	listWorktreesTool,
	worktreeStatusTool,
}
export type { WorktreeInfo }
```

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/tools/workspace.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/tools/workspace.ts src/agents/tools/workspace.test.ts
git commit -m "feat: add git worktree management tools"
```

---

## Task 11: Verification tools

**Files:**
- Create: `src/agents/tools/verification.ts`
- Create: `src/agents/tools/verification.test.ts`

Tools agents can use to verify their work against reality (Principle 3). Available to ALL agents.

Note on nullable params: AgentKit requires `z.string().nullable()` rather than `z.string().optional()` for optional tool parameters. This is a deliberate deviation from the project's `no-null-undefined-union` rule — the tool-call interface is an external API boundary where AgentKit controls the schema convention. Handler functions receive `string | null` and guard accordingly.

Note on `DATABASE_URL_READONLY`: The `queryDb` tool requires a separate read-only Postgres connection string in env. Add `DATABASE_URL_READONLY` to `src/env.ts` as a validated optional string. The corresponding Postgres role must have SELECT-only grants — no INSERT, UPDATE, DELETE, or DDL. This enforces read-only at the database connection level, not just application code.

**Step 1: Write the failing test**

Behaviors (tested against the current repo since it has real TypeScript and git history):
- `handleVerifyTypecheck` returns `passed: true` for a valid project
- `handleDiffCheck` returns diff or no-changes message
- `handleQueryDb` executes a simple SELECT and returns results
- `handleQueryDb` rejects mutations (the read-only user cannot INSERT/UPDATE/DELETE)
- `handleVerifyEndpoint` returns status and body for a reachable endpoint
- `handleReadLogs` returns a string

```typescript
// src/agents/tools/verification.test.ts
import { describe, expect, test } from "bun:test"
import {
	handleDiffCheck,
	handleQueryDb,
	handleReadLogs,
	handleVerifyEndpoint,
	handleVerifyLint,
	handleVerifyTests,
	handleVerifyTypecheck,
} from "@/agents/tools/verification"

const CWD = process.cwd()

describe("handleVerifyTypecheck", () => {
	test("returns passed:true for a valid project", async () => {
		const result = await handleVerifyTypecheck({ cwd: CWD })
		expect(result.passed).toBe(true)
		expect(result.output).toBe("All type checks passed.")
	})
})

describe("handleVerifyLint", () => {
	test("returns a result object", async () => {
		const result = await handleVerifyLint({ cwd: CWD, path: null })
		expect(typeof result.passed).toBe("boolean")
		expect(typeof result.output).toBe("string")
	})
})

describe("handleVerifyTests", () => {
	test("returns a result object", async () => {
		const result = await handleVerifyTests({ cwd: CWD, filter: null })
		expect(typeof result.passed).toBe("boolean")
		expect(typeof result.output).toBe("string")
	})
})

describe("handleDiffCheck", () => {
	test("returns diff output or no-changes message", async () => {
		const result = await handleDiffCheck({ cwd: CWD, base: "main" })
		expect(typeof result).toBe("string")
	})
})

describe("handleQueryDb", () => {
	test("executes a simple SELECT and returns rows", async () => {
		const result = await handleQueryDb({ query: "SELECT 1 AS n", cwd: CWD })
		expect(Array.isArray(result.rows)).toBe(true)
		expect(result.rows.length).toBeGreaterThanOrEqual(1)
	})

	test("rejects mutations — read-only connection cannot INSERT", async () => {
		const result = await handleQueryDb({
			query: "INSERT INTO agent_presets (id) VALUES ('test-reject')",
			cwd: CWD,
		})
		// The read-only user has no INSERT grant; the query must fail
		expect(result.error).toBeDefined()
	})
})

describe("handleVerifyEndpoint", () => {
	test("returns status and body for a local request", async () => {
		// Hits the Next.js health endpoint if the dev server is running,
		// otherwise expects a connection-refused error captured in the result
		const result = await handleVerifyEndpoint({
			method: "GET",
			path: "/api/health",
			body: null,
			cwd: CWD,
		})
		expect(typeof result.status === "number" || result.error !== undefined).toBe(true)
	})
})

describe("handleReadLogs", () => {
	test("returns a string", async () => {
		const result = await handleReadLogs({ filter: null, lines: 20, cwd: CWD })
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
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { env } from "@/env"

// --- Shared helper ---

async function runCheck(
	cmd: string[],
	cwd: string,
): Promise<{ passed: boolean; output: string }> {
	const proc = Bun.spawn(cmd, {
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

// --- Handlers (exported for direct testing) ---

async function handleVerifyTypecheck({ cwd }: { cwd: string }) {
	logger.debug("verifying typecheck", { cwd })
	const result = await runCheck(["bun", "typecheck"], cwd)
	return {
		passed: result.passed,
		output: result.passed ? "All type checks passed." : result.output,
	}
}

async function handleVerifyLint({ cwd, path }: { cwd: string; path: string | null }) {
	logger.debug("verifying lint", { cwd, path })
	const cmd = path ? ["bun", "lint", path] : ["bun", "lint"]
	const result = await runCheck(cmd, cwd)
	return {
		passed: result.passed,
		output: result.passed ? "No lint violations." : result.output,
	}
}

async function handleVerifyTests({
	cwd,
	filter,
}: {
	cwd: string
	filter: string | null
}) {
	logger.debug("verifying tests", { cwd, filter })
	const cmd = filter ? ["bun", "test", filter] : ["bun", "test"]
	return runCheck(cmd, cwd)
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

async function handleQueryDb({
	query,
	cwd,
}: {
	query: string
	cwd: string
}): Promise<{ rows: unknown[]; error?: string }> {
	// Connection uses DATABASE_URL_READONLY env var — enforces read-only at the Postgres
	// connection level (via a DB user with SELECT-only grants). Mutations will be rejected
	// by the database, not by application logic.
	logger.debug("querying db", { query, cwd })
	const connectionUrl = env.DATABASE_URL_READONLY
	if (!connectionUrl) {
		logger.error("DATABASE_URL_READONLY not configured", { cwd })
		throw errors.new("DATABASE_URL_READONLY required for queryDb tool")
	}
	const { Client } = await import("pg")
	const client = new Client({ connectionString: connectionUrl })
	await using stack = new AsyncDisposableStack()
	stack.defer(async () => {
		const result = await errors.try(client.end())
		if (result.error) {
			logger.error("failed to close db client", { error: result.error })
		}
	})
	const connectResult = await errors.try(client.connect())
	if (connectResult.error) {
		logger.error("db connection failed", { error: connectResult.error })
		return { rows: [], error: connectResult.error.toString() }
	}
	const queryResult = await errors.try(client.query(query))
	if (queryResult.error) {
		logger.error("db query failed", { query, error: queryResult.error })
		return { rows: [], error: queryResult.error.toString() }
	}
	return { rows: queryResult.data.rows }
}

async function handleVerifyEndpoint({
	method,
	path,
	body,
	cwd,
}: {
	method: string
	path: string
	body: unknown
	cwd: string
}): Promise<{ status: number; body: unknown; error?: string }> {
	const url = `http://localhost:3000${path}`
	logger.debug("verifying endpoint", { method, url, cwd })
	const init: RequestInit = {
		method,
		headers: { "Content-Type": "application/json" },
	}
	if (body !== null && body !== undefined) {
		init.body = JSON.stringify(body)
	}
	const fetchResult = await errors.try(fetch(url, init))
	if (fetchResult.error) {
		logger.error("endpoint request failed", { url, error: fetchResult.error })
		return { status: 0, body: null, error: fetchResult.error.toString() }
	}
	const response = fetchResult.data
	const textResult = await errors.try(response.text())
	if (textResult.error) {
		logger.error("failed to read endpoint response", { url, error: textResult.error })
		return { status: response.status, body: null, error: textResult.error.toString() }
	}
	const text = textResult.data
	const parsed = errors.trySync(() => JSON.parse(text))
	const responseBody = parsed.error ? text : parsed.data
	return { status: response.status, body: responseBody }
}

async function handleReadLogs({
	filter,
	lines,
	cwd,
}: {
	filter: string | null
	lines: number
	cwd: string
}): Promise<string> {
	logger.debug("reading logs", { filter, lines, cwd })
	// Tail the most recent lines from the Next.js dev server log if it exists,
	// falling back to the system log. Optionally filtered by a regex pattern.
	const logFile = `${cwd}/.next/server.log`
	const cmd = filter
		? ["sh", "-c", `tail -n ${lines} "${logFile}" 2>/dev/null | grep -E "${filter}" || echo "(no matching log lines)"`]
		: ["sh", "-c", `tail -n ${lines} "${logFile}" 2>/dev/null || echo "(no log file found)"`]
	const proc = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" })
	const stdout = await new Response(proc.stdout).text()
	await proc.exited
	return stdout.trim()
}

// --- Tool definitions ---

const verifyTypecheckTool = createTool({
	name: "verify_typecheck",
	description:
		"Run TypeScript typecheck and return exact errors with file:line locations. Use to verify code correctness.",
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
		// z.string().nullable() used (not .optional()) — AgentKit tool params require nullable
		// for optional inputs. This is an intentional deviation from no-null-undefined-union
		// at the tool schema boundary only; handlers receive string | null and guard accordingly.
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
	description:
		"Show git diff against a base branch. Use to review changes made by implementation.",
	parameters: z.object({
		cwd: z.string().describe("Working directory (worktree path)"),
		base: z.string().describe("Base branch to diff against").default("main"),
	}),
	handler: handleDiffCheck,
})

const queryDbTool = createTool({
	name: "query_db",
	description:
		"Execute a read-only SQL query against the database. Use to verify schema assumptions, check row counts, or confirm data state. Mutations (INSERT/UPDATE/DELETE) are rejected at the connection level.",
	parameters: z.object({
		query: z.string().describe("SQL query to execute (SELECT only — mutations will be rejected)"),
		cwd: z.string().describe("Working directory"),
	}),
	handler: handleQueryDb,
})

const verifyEndpointTool = createTool({
	name: "verify_endpoint",
	description:
		"Make an HTTP request to a local dev server endpoint and return the status code and response body. Use to verify API behaviour.",
	parameters: z.object({
		method: z.string().describe("HTTP method (GET, POST, PUT, PATCH, DELETE)"),
		path: z.string().describe("URL path, e.g. /api/users — host is always http://localhost:3000"),
		body: z.unknown().nullable().describe("Request body (JSON-serializable) or null"),
		cwd: z.string().describe("Working directory"),
	}),
	handler: handleVerifyEndpoint,
})

const readLogsTool = createTool({
	name: "read_logs",
	description:
		"Read recent application log output. Optionally filter by a regex pattern. Use to verify runtime behaviour or diagnose errors.",
	parameters: z.object({
		filter: z
			.string()
			.nullable()
			.describe("Optional regex pattern to filter log lines"),
		lines: z.number().int().positive().default(50).describe("Number of recent lines to read"),
		cwd: z.string().describe("Working directory"),
	}),
	handler: handleReadLogs,
})

export {
	diffCheckTool,
	handleDiffCheck,
	handleQueryDb,
	handleReadLogs,
	handleVerifyEndpoint,
	handleVerifyLint,
	handleVerifyTests,
	handleVerifyTypecheck,
	queryDbTool,
	readLogsTool,
	verifyEndpointTool,
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
git commit -m "feat: add verification tools (typecheck, lint, tests, diff, queryDb, endpoint, logs)"
```

---

## Task 12: Explorer agent factory

**Files:**
- Create: `src/agents/agents/explorer.ts`
- Create: `src/agents/agents/explorer.test.ts`

The explorer gets **Core + Analysis** tools per the architecture's agent roster. An optional `extraTools` parameter allows callers (e.g., `createSliceNetwork` in Task 14) to inject additional tools such as `saveSummaryTool` without modifying the core factory.

Note on `maxIter`: The architecture specifies `maxIter = 5` for the Explore network. When wiring this agent into a `createNetwork` call, use 5, not an arbitrary value.

**Step 1: Write the failing test**

Behaviors to test:
- Factory produces an agent that can be passed to `createNetwork` (integration — proves the agent is valid AgentKit structure)
- Factory accepts custom config (different provider, different prompt)
- Factory accepts `extraTools` and merges them into the tool list

```typescript
// src/agents/agents/explorer.test.ts
import { describe, expect, test } from "bun:test"
import { createNetwork } from "@inngest/agent-kit"
import { createExplorerAgent } from "@/agents/agents/explorer"
import { DEFAULT_CONFIG } from "@/agents/config"
import { emitProgressTool } from "@/agents/tools/progress"

describe("createExplorerAgent", () => {
	test("produces an agent accepted by createNetwork", () => {
		const agent = createExplorerAgent(DEFAULT_CONFIG.explorer)
		// The real test: createNetwork accepts this agent without throwing
		const network = createNetwork({
			name: "test-explorer",
			agents: [agent],
			maxIter: 5,
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
			maxIter: 5,
		})
		expect(network.name).toBe("test-custom")
	})

	test("merges extraTools into the tool list", () => {
		const agent = createExplorerAgent(DEFAULT_CONFIG.explorer, [emitProgressTool])
		const network = createNetwork({
			name: "test-extra-tools",
			agents: [agent],
			maxIter: 5,
		})
		expect(network.name).toBe("test-extra-tools")
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
import type { Tool } from "@inngest/agent-kit"
import type { AgentConfig } from "@/agents/config"
import { resolveModel } from "@/agents/config"
import {
	analyzeImportsTool,
	findUsagesTool,
	getGitHistoryTool,
	runLintTool,
	runTypecheckTool,
} from "@/agents/tools/analysis"
import { readConventionsTool } from "@/agents/tools/conventions"
import {
	listFilesTool,
	readDirectoryTool,
	readFileTool,
	searchCodeTool,
} from "@/agents/tools/filesystem"
import { emitProgressTool } from "@/agents/tools/progress"

// Core + Analysis tool set for the Explorer (per architecture agent roster).
// Analysis tools are included because the explorer must understand import graphs,
// usage patterns, and git history to map codebase architecture accurately.
const EXPLORER_TOOLS = [
	// Core
	readFileTool,
	listFilesTool,
	searchCodeTool,
	readDirectoryTool,
	readConventionsTool,
	emitProgressTool,
	// Analysis
	analyzeImportsTool,
	findUsagesTool,
	getGitHistoryTool,
	runLintTool,
	runTypecheckTool,
]

function createExplorerAgent(config: AgentConfig, extraTools: Tool[] = []) {
	return createAgent({
		name: "Explorer",
		description: "Maps codebase architecture and patterns for a specific directory or concern.",
		model: resolveModel(config.model),
		system: config.systemPrompt,
		tools: [...EXPLORER_TOOLS, ...extraTools],
	})
}

export { createExplorerAgent, EXPLORER_TOOLS }
```

**Step 4: Run test to verify it passes**

```bash
bun test src/agents/agents/explorer.test.ts
```

**Step 5: Commit**

```bash
git add src/agents/agents/explorer.ts src/agents/agents/explorer.test.ts
git commit -m "feat: add explorer agent factory with Core + Analysis tools"
```

---

## Task 13: Specialist agent factory

**Files:**
- Create: `src/agents/agents/specialist.ts`
- Create: `src/agents/agents/specialist.test.ts`

Same pattern as explorer. The specialist gets Core + Analysis tools plus `runLintTool` and `runTypecheckTool` from the verification set, because specialists validate generated code as part of their research workflow.

Note on `verify.ts` primitive: The architecture specifies `src/agents/primitives/verify.ts` as a reusable verification primitive (analogous to `onboard.ts`). This primitive consolidates typecheck + lint + test + DB query into a single callable function. It is deferred to the Implementation Phase plan (Plan 3) since verification is only meaningful after writes, which are out of scope for Phase 1.

Note on `maxIter`: The architecture specifies `maxIter = 8` for the Concept network where specialists are used for deep research. Use 8 when wiring specialists into concept-phase networks.

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
import {
	analyzeImportsTool,
	findUsagesTool,
	getGitHistoryTool,
	runLintTool,
	runTypecheckTool,
} from "@/agents/tools/analysis"
import { readConventionsTool } from "@/agents/tools/conventions"
import {
	listFilesTool,
	readDirectoryTool,
	readFileTool,
	searchCodeTool,
} from "@/agents/tools/filesystem"
import { emitProgressTool } from "@/agents/tools/progress"

function createSpecialistAgent(config: AgentConfig) {
	return createAgent({
		name: "Specialist",
		description: "Deep-dive researcher for a specific topic or question about the codebase.",
		model: resolveModel(config.model),
		system: config.systemPrompt,
		tools: [
			// Core
			readFileTool,
			listFilesTool,
			searchCodeTool,
			readDirectoryTool,
			readConventionsTool,
			emitProgressTool,
			// Analysis
			analyzeImportsTool,
			findUsagesTool,
			getGitHistoryTool,
			// Analysis tools also used for verification context
			runLintTool,
			runTypecheckTool,
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
git commit -m "feat: add specialist agent factory with Core + Analysis + lint/typecheck tools"
```

---

> **Note — `src/agents/index.ts` barrel module (create after Tasks 12–13):**
>
> After completing Tasks 12–13, create `src/agents/index.ts` as the public API barrel module. All external code must import from `@/agents`, never from subdirectories directly (architecture mandates a single import point). This module re-exports:
>
> - **Types:** `WorkflowConfig`, `AgentConfig`, `ModelConfig`, `CodebaseContext`
> - **Config functions:** `resolveConfig`, `resolveModel`, `DEFAULT_CONFIG`
> - **Tool tier constants** (defined here, not in subdirectory files):
>
> ```typescript
> // src/agents/index.ts
> import { readFileTool, listFilesTool, searchCodeTool, readDirectoryTool } from "@/agents/tools/filesystem"
> import { readConventionsTool } from "@/agents/tools/conventions"
> import { emitProgressTool } from "@/agents/tools/progress"
> import {
>     analyzeImportsTool,
>     findUsagesTool,
>     getGitHistoryTool,
>     runLintTool,
>     runTypecheckTool,
> } from "@/agents/tools/analysis"
> import {
>     verifyTypecheckTool,
>     verifyLintTool,
>     verifyTestsTool,
>     queryDbTool,
>     diffCheckTool,
>     verifyEndpointTool,
>     readLogsTool,
> } from "@/agents/tools/verification"
>
> // Formalized capability boundaries — match architecture agent roster exactly
> const CORE_TOOLS = [
>     readFileTool,
>     listFilesTool,
>     searchCodeTool,
>     readDirectoryTool,
>     readConventionsTool,
>     emitProgressTool,
> ]
>
> const ANALYSIS_TOOLS = [
>     analyzeImportsTool,
>     findUsagesTool,
>     getGitHistoryTool,
>     runLintTool,
>     runTypecheckTool,
> ]
>
> const VERIFICATION_TOOLS = [
>     verifyTypecheckTool,
>     verifyLintTool,
>     verifyTestsTool,
>     queryDbTool,
>     diffCheckTool,
>     verifyEndpointTool,
>     readLogsTool,
> ]
>
> // IMPLEMENTATION_TOOLS (writeFile, editFile, runTests) are deferred to Plan 3
> // (Implementation Phase) — restricted to the Implementer agent only.
>
> export { CORE_TOOLS, ANALYSIS_TOOLS, VERIFICATION_TOOLS }
> ```
>
> - **Agent factories:** `createExplorerAgent`, `createSpecialistAgent`
>
> The `CORE_TOOLS`, `ANALYSIS_TOOLS`, and `VERIFICATION_TOOLS` constants formalize the capability boundaries from the architecture's tool tier table. Any agent factory that deviates from these tiers must document the deviation explicitly.

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
- `buildSlicePrompt` throws on an unknown slice key
- `buildSlicePrompt` includes `focus` in the prompt when provided
- `createSliceNetwork` produces a network accepted by AgentKit (integration)
- `createSliceNetwork` uses `maxIter: 2` for shallow depth and `maxIter: 5` for deep

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

	test("throws on unknown slice key", () => {
		expect(() => buildSlicePrompt("/repo", "unknown-slice")).toThrow("unknown onboarding slice")
	})

	test("includes focus in prompt when provided", () => {
		const prompt = buildSlicePrompt("/repo", "structure", "authentication flows")
		expect(prompt).toContain("authentication flows")
		expect(prompt).toContain("FOCUS")
	})
})

describe("createSliceNetwork", () => {
	test("produces a valid network with router", () => {
		const network = createSliceNetwork(
			DEFAULT_CONFIG.explorer,
			"/repo",
			"structure",
			"deep",
		)
		expect(network.name).toBe("explore-structure")
	})

	test("uses maxIter 2 for shallow depth", () => {
		const network = createSliceNetwork(
			DEFAULT_CONFIG.explorer,
			"/repo",
			"structure",
			"shallow",
		)
		// Network is constructed without error with shallow depth
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
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { AgentConfig } from "@/agents/config"
import { createExplorerAgent } from "@/agents/agents/explorer"

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

// ExplorerState is exported so Task 15 can import it instead of redeclaring.
interface ExplorerState {
	summary: string
	relevantFiles: Array<{ path: string; summary: string }>
	done: boolean
}

const saveSummaryParams = z.object({
	summary: z.string().describe("Your complete summary of this codebase slice"),
	// Use .optional().default([]) rather than .nullable() so Zod guarantees
	// the output type is Array<...> — never null or undefined. This avoids
	// the ?? fallback that the no-nullish-coalescing rule bans.
	relevantFiles: z
		.array(
			z.object({
				path: z.string(),
				summary: z.string(),
			}),
		)
		.optional()
		.default([]),
})

const saveSummaryTool = createTool({
	name: "save_summary",
	description:
		"Save your exploration summary. Call this when you have finished exploring your assigned codebase slice.",
	parameters: saveSummaryParams,
	handler: async function handleSaveSummary({ summary, relevantFiles }, { network }) {
		if (network) {
			network.state.data.summary = summary
			// Zod .default([]) guarantees relevantFiles is always an array after parsing.
			network.state.data.relevantFiles = relevantFiles
			network.state.data.done = true
		}
		return "Summary saved."
	},
})

const SLICE_PROMPTS: Record<string, string> = {
	"structure":
		"Map the directory tree, entry points (page.tsx files), configuration files (tsconfig, biome, drizzle, next.config), and overall project layout. Identify the major architectural boundaries.",
	"data-layer":
		"Map the database schema (Drizzle tables, types, relations), ORM patterns, prepared statements, and migration approach. Identify key data types.",
	"api-layer":
		"Map API routes, server actions, route handlers, and the Inngest webhook. Identify the data flow patterns (RSC → DB → client).",
	"ui-layer":
		"Map the component structure, page.tsx + content.tsx pattern, client/server split, and shared UI components. Identify layout patterns.",
	"conventions":
		"Read CLAUDE.md and all rules/*.md. Summarize the enforced code patterns, banned patterns, error handling conventions, and logging requirements.",
	"dependencies":
		"Read package.json. Summarize key production and dev dependencies, their versions, and how they're used. Identify any custom @superbuilders/* packages.",
}

function buildSlicePrompt(targetPath: string, slice: string, focus?: string): string {
	const sliceDetail = SLICE_PROMPTS[slice]
	if (!sliceDetail) {
		logger.error("unknown slice key", { slice })
		throw errors.new("unknown onboarding slice")
	}

	const lines = [
		`You are exploring the codebase at: ${targetPath}`,
		`Your assigned slice: ${slice}`,
		"",
		sliceDetail,
	]

	if (focus !== undefined) {
		lines.push("")
		lines.push(`FOCUS: Prioritize information related to: ${focus}`)
	}

	lines.push(
		"",
		"Instructions:",
		"1. Use read_directory to understand the layout",
		"2. Use read_file to examine key files",
		"3. Use search_code to find patterns",
		"4. When you have a thorough understanding, call save_summary with your findings",
		"5. In save_summary, include a relevantFiles array listing every file you referenced with a one-line summary of its purpose.",
		"6. Be concise but complete. Include file paths for everything you reference.",
	)

	return lines.join("\n")
}

function createSliceNetwork(
	config: AgentConfig,
	targetPath: string,
	slice: string,
	depth: "shallow" | "deep" = "deep",
	focus?: string,
) {
	// Architecture specifies Explore maxIter as 5 for deep. Shallow is cheaper for
	// Phase 2-3 targeted validation where a full traversal is not needed.
	const maxIter = depth === "shallow" ? 2 : 5

	// Pass saveSummaryTool via extraTools so the explorer can signal completion.
	// Without this wiring, ExplorerState.done never becomes true and the network
	// exhausts maxIter on every run without saving a result.
	const agent = createExplorerAgent(config, [saveSummaryTool])

	const systemPrompt = buildSlicePrompt(targetPath, slice, focus)

	// Override the system prompt for this specific slice run.
	// createExplorerAgent accepts a config object; pass the systemPrompt through.
	const sliceAgent = createExplorerAgent(
		{ ...config, systemPrompt },
		[saveSummaryTool],
	)

	return createNetwork<ExplorerState>({
		name: `explore-${slice}`,
		agents: [sliceAgent],
		maxIter,
		defaultState: createState<ExplorerState>({ summary: "", relevantFiles: [], done: false }),
		router: function exploreRouter({ network }) {
			if (network.state.data.done) {
				return undefined
			}
			return sliceAgent
		},
	})
}

// The `onboard` function is the sequential testing entry point. The Inngest function
// (Task 15) uses step parallelism directly. Both produce identical CodebaseContext output.
async function onboard(
	scope: OnboardingScope,
	explorerConfig: AgentConfig,
): Promise<CodebaseContext> {
	logger.info("starting onboarding", {
		targetPath: scope.targetPath,
		slices: scope.slices,
		depth: scope.depth,
	})

	const sliceResults: Record<string, { summary: string; relevantFiles: Array<{ path: string; summary: string }> }> = {}

	// Run all slices (caller is responsible for parallelism via step.run)
	for (const slice of scope.slices) {
		const network = createSliceNetwork(
			explorerConfig,
			scope.targetPath,
			slice,
			scope.depth,
			scope.focus,
		)
		const input = `Explore the ${slice} of the codebase at ${scope.targetPath}`
		const result = await network.run(input)
		sliceResults[slice] = {
			summary: result.state.data.summary,
			relevantFiles: result.state.data.relevantFiles,
		}
		logger.info("slice completed", {
			slice,
			summaryLength: result.state.data.summary.length,
			fileCount: result.state.data.relevantFiles.length,
		})
	}

	// Validate all required slices are present before consolidating.
	const requiredSlices = ["structure", "data-layer", "api-layer", "ui-layer", "conventions", "dependencies"] as const

	for (const required of requiredSlices) {
		if (!(required in sliceResults)) {
			logger.error("missing slice result", { slice: required })
			throw errors.new("missing onboarding slice result")
		}
	}

	// Merge relevantFiles from all slices into the consolidated list.
	const allRelevantFiles: Array<{ path: string; summary: string }> = []
	for (const sliceKey of scope.slices) {
		const sliceData = sliceResults[sliceKey]
		if (sliceData) {
			allRelevantFiles.push(...sliceData.relevantFiles)
		}
	}

	const context: CodebaseContext = {
		structure: sliceResults["structure"]!.summary,
		dataLayer: sliceResults["data-layer"]!.summary,
		apiLayer: sliceResults["api-layer"]!.summary,
		uiLayer: sliceResults["ui-layer"]!.summary,
		conventions: sliceResults["conventions"]!.summary,
		dependencies: sliceResults["dependencies"]!.summary,
		relevantFiles: allRelevantFiles,
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
export type { CodebaseContext, ExplorerState, OnboardingScope }
```

**Note on parallelism:** The `onboard` function above runs slices sequentially. In the Inngest function (Task 15), each slice is wrapped in a separate `step.run()` call with `Promise.all()` for parallel execution. The `onboard` function is the sequential testing entry point; the Inngest function is the parallelized production version. Both produce identical `CodebaseContext` output.

**Note on `as const` assertions:** The `!` non-null assertions on `sliceResults` are safe because the guard loop immediately above validates all required keys are present. This is the validated-then-access pattern, not a speculative assertion.

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
- Create: `src/inngest/functions/agent-onboard.test.ts`
- Modify: `src/inngest/functions/index.ts`

The first real Inngest function. Listens for `agent/feature.requested`, runs parallel onboarding, and stores results.

**Step 1: Write the test**

This uses `@inngest/test` (installed in Task 1) to verify the critical path without real LLM inference.

```typescript
// src/inngest/functions/agent-onboard.test.ts
import { describe, expect, test } from "bun:test"
import { InngestTestEngine } from "@inngest/test"
import { agentOnboard } from "@/inngest/functions/agent-onboard"

describe("agentOnboard", () => {
	test("creates workflow_run record at function start", async () => {
		const engine = new InngestTestEngine({ function: agentOnboard })

		// Verify the first step is workflow_run creation
		const { result } = await engine.execute({
			events: [
				{
					name: "agent/feature.requested",
					data: {
						feature: "test feature",
						branchName: "test/feature",
						baseBranch: "main",
						presetId: null,
						configOverrides: null,
						targetPath: null,
					},
				},
			],
			// Stop after the first step to verify run record creation
			steps: [
				{
					id: "create-workflow-run",
					handler: async () => "mock-run-id-123",
				},
			],
		})

		expect(result).toBeDefined()
	})

	test("runs 6 parallel slice steps", async () => {
		const engine = new InngestTestEngine({ function: agentOnboard })

		const sliceNames = [
			"structure",
			"data-layer",
			"api-layer",
			"ui-layer",
			"conventions",
			"dependencies",
		]

		const stepMocks = [
			{ id: "create-workflow-run", handler: async () => "mock-run-id" },
			{ id: "resolve-config", handler: async () => ({ explorer: {}, specialist: {} }) },
			{ id: "create-worktree", handler: async () => "/tmp/mock-worktree" },
			...sliceNames.map((slice) => ({
				id: `onboard-${slice}`,
				handler: async () => ({
					slice,
					summary: `Mock summary for ${slice}`,
					relevantFiles: [],
				}),
			})),
			{
				id: "consolidate-onboarding",
				handler: async () => ({
					structure: "mock",
					dataLayer: "mock",
					apiLayer: "mock",
					uiLayer: "mock",
					conventions: "mock",
					dependencies: "mock",
					relevantFiles: [],
				}),
			},
			{ id: "persist-context", handler: async () => undefined },
		]

		const { result } = await engine.execute({
			events: [
				{
					name: "agent/feature.requested",
					data: {
						feature: "test feature",
						branchName: "test/feature",
						baseBranch: "main",
						presetId: null,
						configOverrides: null,
						targetPath: null,
					},
				},
			],
			steps: stepMocks,
		})

		expect(result).toBeDefined()
	})
})
```

**Step 2: Run test to verify it fails**

```bash
bun test src/inngest/functions/agent-onboard.test.ts
```

**Step 3: Write the Inngest function**

```typescript
// src/inngest/functions/agent-onboard.ts
import { eq } from "drizzle-orm"
import { createNetwork, createState } from "@inngest/agent-kit"
import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { db } from "@/db"
import { coreWorkflowRun } from "@/db/schemas/core"
import { inngest } from "@/inngest"
import { DEFAULT_CONFIG, resolveConfig } from "@/agents/config"
import { workflowConfigOverridesSchema } from "@/agents/config"
import { createExplorerAgent } from "@/agents/agents/explorer"
import { handleCreateWorktree } from "@/agents/tools/workspace"
import {
	buildSlicePrompt,
	DEFAULT_SLICES,
	saveSummaryTool,
	type CodebaseContext,
	type ExplorerState,
} from "@/agents/primitives/onboard"

const agentOnboard = inngest.createFunction(
	{
		id: "agent/onboard",
		retries: 2,
		concurrency: [{ scope: "fn", limit: 3 }],
		throttle: { limit: 10, period: "1m" },
		timeouts: { finish: "30m" },
	},
	{ event: "agent/feature.requested" },
	async function handleAgentOnboard({ event, step, logger }) {
		const { feature, branchName } = event.data
		const baseBranch = event.data.baseBranch !== undefined ? event.data.baseBranch : "main"

		logger.info("starting agent onboarding", { feature, branchName })

		// Validate configOverrides using the typed schema — no `as` assertions.
		const rawOverrides = event.data.configOverrides
		let overrides: z.infer<typeof workflowConfigOverridesSchema> | undefined

		if (rawOverrides !== null && rawOverrides !== undefined) {
			const overridesResult = workflowConfigOverridesSchema.safeParse(rawOverrides)
			if (!overridesResult.success) {
				logger.error("invalid config overrides", { error: overridesResult.error })
				throw errors.wrap(overridesResult.error, "config overrides validation")
			}
			overrides = overridesResult.data
		}

		// Determine target path (default to repo root; explicit null check, no ??)
		const repoRoot = process.cwd()
		const explorePath = event.data.targetPath !== null && event.data.targetPath !== undefined
			? event.data.targetPath
			: repoRoot

		// Step 1: Create the workflow_run record so dashboard and HITL events can find this run.
		const runId = await step.run("create-workflow-run", async function createWorkflowRun() {
			const configSnapshot = DEFAULT_CONFIG
			const inserted = await db
				.insert(coreWorkflowRun)
				.values({
					id: crypto.randomUUID(),
					feature,
					branchName,
					status: "running",
					phase: "onboarding",
					configSnapshot,
					judgeIds: [],
					inngestRunId: event.id,
				})
				.returning({ id: coreWorkflowRun.id })

			const row = inserted[0]
			if (!row) {
				logger.error("workflow run insert returned no row", { feature, branchName })
				throw errors.new("workflow run creation failed")
			}

			return row.id
		})

		// Step 2: Resolve the full 4-level config pipeline:
		// code defaults → DB default preset → named preset → per-run overrides.
		const resolvedConfig = await step.run("resolve-config", async function resolveConfigStep() {
			return resolveConfig("feature", event.data.presetId, overrides)
		})

		const explorerConfig = resolvedConfig.explorer

		// Step 3: Create an isolated worktree so exploration does not operate on main.
		const worktreePath = await step.run("create-worktree", async function createWorktreeStep() {
			// handleCreateWorktree returns a string (the worktree path), not an object.
			const wtPath = await handleCreateWorktree({
				repoRoot: explorePath,
				branch: branchName,
				baseBranch,
			})

			await db
				.update(coreWorkflowRun)
				.set({
					worktreePath: wtPath,
					worktreeStatus: "active",
				})
				.where(eq(coreWorkflowRun.id, runId))

			return wtPath
		})

		// Step 4: Run all 6 slice explorations in parallel via step.run.
		// Each slice gets its own context window with a focused explorer agent.
		const slicePromises = DEFAULT_SLICES.map(function createSliceStep(slice) {
			return step.run(`onboard-${slice}`, async function exploreSlice() {
				const systemPrompt = buildSlicePrompt(worktreePath, slice)

				const sliceAgent = createExplorerAgent(
					{ ...explorerConfig, systemPrompt },
					[saveSummaryTool],
				)

				// Architecture specifies Explore maxIter as 5 for deep (standard onboarding).
				const network = createNetwork<ExplorerState>({
					name: `explore-${slice}`,
					agents: [sliceAgent],
					maxIter: 5,
					defaultState: createState<ExplorerState>({
						summary: "",
						relevantFiles: [],
						done: false,
					}),
					router: function sliceRouter({ network: net }) {
						if (net.state.data.done) {
							return undefined
						}
						return sliceAgent
					},
				})

				const result = await network.run(
					`Explore the ${slice} of the codebase at ${worktreePath}`,
				)

				return {
					slice,
					summary: result.state.data.summary,
					relevantFiles: result.state.data.relevantFiles,
				}
			})
		})

		const sliceResults = await Promise.all(slicePromises)

		// Step 5: Consolidate slice results into the typed CodebaseContext.
		const context = await step.run(
			"consolidate-onboarding",
			async function consolidate() {
				const contextMap: Record<string, { summary: string; relevantFiles: Array<{ path: string; summary: string }> }> = {}

				for (const sliceResult of sliceResults) {
					contextMap[sliceResult.slice] = {
						summary: sliceResult.summary,
						relevantFiles: sliceResult.relevantFiles,
					}
				}

				// Validate all required slices produced results before consolidating.
				const requiredSlices = [
					"structure",
					"data-layer",
					"api-layer",
					"ui-layer",
					"conventions",
					"dependencies",
				] as const

				for (const required of requiredSlices) {
					if (!(required in contextMap)) {
						logger.error("missing slice result in consolidation", { slice: required })
						throw errors.new("missing onboarding slice result")
					}
				}

				// Merge relevantFiles from all slices.
				const allRelevantFiles: Array<{ path: string; summary: string }> = []
				for (const sliceResult of sliceResults) {
					allRelevantFiles.push(...sliceResult.relevantFiles)
				}

				const codebaseContext: CodebaseContext = {
					structure: contextMap["structure"]!.summary,
					dataLayer: contextMap["data-layer"]!.summary,
					apiLayer: contextMap["api-layer"]!.summary,
					uiLayer: contextMap["ui-layer"]!.summary,
					conventions: contextMap["conventions"]!.summary,
					dependencies: contextMap["dependencies"]!.summary,
					relevantFiles: allRelevantFiles,
				}

				return codebaseContext
			},
		)

		// Step 6: Persist CodebaseContext to DB so Phase 2 continuation events can load it.
		// Without this, agent/feature.approved and agent/feature.feedback have no data to resume from.
		await step.run("persist-context", async function persistContext() {
			await db
				.update(coreWorkflowRun)
				.set({
					result: context,
					phase: "onboarding-complete",
					status: "running",
				})
				.where(eq(coreWorkflowRun.id, runId))
		})

		logger.info("onboarding complete", { feature, sliceCount: sliceResults.length, runId })
		return context
	},
)

export { agentOnboard }
```

**Step 4: Register the function in the Inngest functions index**

In `src/inngest/functions/index.ts`, replace the empty array:

```typescript
import { agentOnboard } from "@/inngest/functions/agent-onboard"

const functions = [agentOnboard]

export { functions }
```

**Step 5: Run tests**

```bash
bun test src/inngest/functions/agent-onboard.test.ts
```

**Step 6: Verify typecheck**

```bash
bun typecheck
```

**Step 7: Commit**

```bash
git add src/inngest/functions/agent-onboard.ts src/inngest/functions/agent-onboard.test.ts src/inngest/functions/index.ts
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
- `create-workflow-run` step creates a DB record and returns a `runId`
- `resolve-config` step resolves the full 4-level config pipeline
- `create-worktree` step creates an isolated worktree
- 6 parallel `onboard-*` steps appear
- Each step completes with a summary and `relevantFiles` array
- `consolidate-onboarding` step produces a `CodebaseContext`
- `persist-context` step writes the context to the `workflow_runs` table
- No errors in the function run

**Step 4: Review the output**

Check that the `CodebaseContext` has non-empty summaries for all 6 slices. The explorer agents should have:
- Read directory structures
- Examined key files
- Produced structured summaries
- Used the `save_summary` tool to write to state (including `relevantFiles`)

Check that `workflow_runs` in the DB has:
- `status: "running"`
- `phase: "onboarding-complete"`
- `result` column populated with the full `CodebaseContext`
- `worktreePath` set to the created worktree path

---

## Summary

| Task | Component | Deliverable |
|------|-----------|-------------|
| 1 | Dependencies | `@inngest/agent-kit` and `@inngest/test` installed, API key env vars |
| 2 | Events | 6 agent event schemas in Inngest client; `configOverrides` typed as `Partial<WorkflowConfig>` via `workflowConfigOverridesSchema` |
| 3 | Database | 3 new tables (presets, judges, workflow runs) with FK constraints and partial unique index on `(workflowType) WHERE isDefault = true` |
| 4 | Config | Types, defaults, `applyOverrides()` with deep merge, and full 4-level `resolveConfig` pipeline (`loadPreset`, `loadDefaultPreset`) with tests |
| 5 | Config | `resolveModel()` utility with tests; Grok provider includes `baseURL` and `XAI_API_KEY` |
| 6 | Tools | Filesystem tools (readFile, listFiles, searchCode, readDirectory) with tests |
| 7 | Tools | Analysis tools (analyzeImports, findUsages, getGitHistory, runLint, runTypecheck) |
| 8 | Tools | Conventions tool (readClaudeMd) |
| 9 | Tools | Progress tool (emitProgress) wired to Inngest Realtime |
| 10 | Workspace | Worktree management as `createTool()` wrappers at `src/agents/tools/workspace.ts` with tests |
| 11 | Tools | All 7 verification tools (verifyTypecheck, verifyLint, verifyTests, diffCheck, queryDb, verifyEndpoint, readLogs) using shared `runCheck` primitive |
| 12 | Agent | Explorer agent factory with Core + Analysis tool set and `extraTools` parameter; `saveSummaryTool` wired in via `extraTools` |
| 13 | Agent | Specialist agent factory with Core + Analysis + Verification tool set |
| 14 | Primitive | Onboarding primitive: `buildSlicePrompt` validates slice keys and incorporates `focus`; `createSliceNetwork` uses `depth`-driven `maxIter` (2 shallow / 5 deep); `saveSummaryTool` wired into explorer via `extraTools`; `relevantFiles` collected per slice and merged into `CodebaseContext`; `ExplorerState` exported for Task 15 reuse |
| 15 | Inngest | `agent/onboard` function: creates `workflow_run` record, resolves full 4-level config pipeline, creates worktree, runs 6 parallel slice steps, consolidates `CodebaseContext`, persists to DB; all `??` violations replaced with explicit validation; `configOverrides` validated via Zod `safeParse`; `throttle` and `timeouts` configured; unit tests via `@inngest/test` |
| 16 | Integration | Smoke test against live codebase |

**Architecture alignment notes:**
- **Config resolution** is the full 4-level pipeline: code defaults → DB default preset → named preset → per-run overrides. `resolveConfig` calls `loadDefaultPreset` and `loadPreset` before feeding into `applyOverrides`.
- **Workspace tools** are `createTool()` wrappers at `src/agents/tools/workspace.ts`, not plain functions at `src/agents/workspace.ts`.
- **Inngest function** creates a `workflow_run` record at function start (required for HITL events and the dashboard) and persists `CodebaseContext` to the `result` column after exploration.
- **All 7 verification tools** are implemented: `verifyTypecheck`, `verifyLint`, `verifyTests`, `diffCheck`, `queryDb`, `verifyEndpoint`, `readLogs`.
- **Explorer tool set** is Core + Analysis: `readFile`, `listFiles`, `searchCode`, `readDirectory`, `readClaudeMd`, `emitProgress`, `analyzeImports`, `findUsages`, `getGitHistory`, `runLint`, `runTypecheck`.
- **`saveSummaryTool`** is wired into the explorer via the `extraTools` parameter added in Task 12, passed explicitly in `createSliceNetwork` so the router can terminate the loop when `done: true`.

**Next plans (not in this document):**
- **Plan 2: Concept Network + Critic + Judge Panel** — Phase 2-3 of the pipeline
- **Plan 3: Implementation Phase + Debug Network** — Phase 5-6
- **Plan 4: Full Pipeline Orchestration** — Wire all phases with HITL events
- **Plan 5: Dashboard** — Flight recorder, trigger, review, judge management
