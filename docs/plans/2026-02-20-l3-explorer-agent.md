# L3 Explorer Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first L3 agent — a read-only codebase explorer using ToolLoopAgent + claude-haiku-4-5, triggered via Inngest.

**Architecture:** `ToolLoopAgent` wraps `generateText` with a built-in tool loop. The agent gets three read-only tools (read, glob, grep) from `src/lib/agent/fs/tools.ts`. An Inngest function wraps the entire agent call in a single `step.run()` — idempotent read-only tools make retry-from-scratch acceptable. After the agent completes, each step is emitted as a `paul/debug/echo` event for per-step visibility in the Inngest dashboard. Later, when write tools are added, this migrates to a manual `streamText` loop with per-step checkpointing (Approach B).

**Tech Stack:** AI SDK v6 (`ai`, `@ai-sdk/anthropic`), Inngest, Bun

---

### Task 1: Install @ai-sdk/anthropic

**Files:**
- Modify: `package.json` (via bun add)

**Step 1: Install the package**

Run: `bun add @ai-sdk/anthropic`
Expected: Package added to `dependencies` in `package.json`

**Step 2: Verify installation**

Run: `bun typecheck`
Expected: PASS (no new type errors from adding the dep)

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add @ai-sdk/anthropic provider"
```

---

### Task 2: Add ANTHROPIC_API_KEY to environment

**Files:**
- Modify: `src/env.ts:22` (add to `server` schema)
- Modify: `src/env.ts:44` (add to `runtimeEnv`)
- Modify: `.env.example` (add placeholder)

**Step 1: Add to server schema in `src/env.ts`**

Add after the `DATABASE_URL` line (line 22):

```typescript
ANTHROPIC_API_KEY: z.string().optional(),
```

**Step 2: Add to runtimeEnv in `src/env.ts`**

Add after the `DATABASE_URL` line in `runtimeEnv` (line 45):

```typescript
ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
```

**Step 3: Add placeholder to `.env.example`**

Add after the Drizzle section:

```
# Anthropic
ANTHROPIC_API_KEY=""
```

**Step 4: Add actual key to `.env`**

Add your real Anthropic API key to `.env`:

```
ANTHROPIC_API_KEY="sk-ant-..."
```

**Step 5: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/env.ts .env.example
git commit -m "feat: add ANTHROPIC_API_KEY to environment schema"
```

---

### Task 3: Create the debug echo function

**Files:**
- Modify: `src/inngest/index.ts` (add echo event schema)
- Create: `src/inngest/functions/debug/echo.ts`
- Modify: `src/inngest/functions/index.ts` (register echo function)

**Step 1: Add the echo event schema**

In `src/inngest/index.ts`, add to the `schema` object after the existing entries:

```typescript
"paul/debug/echo": z.object({
	source: z.string().min(1),
	payload: z.record(z.string(), z.unknown())
})
```

**Step 2: Create the echo function**

Create `src/inngest/functions/debug/echo.ts`:

```typescript
import { inngest } from "@/inngest"

const echoFunction = inngest.createFunction(
	{ id: "paul/debug/echo" },
	{ event: "paul/debug/echo" },
	async ({ event, logger }) => {
		logger.info("echo", { source: event.data.source })
		return event.data
	}
)

export { echoFunction }
```

**Step 3: Register the echo function**

In `src/inngest/functions/index.ts`, add the import:

```typescript
import { echoFunction } from "@/inngest/functions/debug/echo"
```

Add `echoFunction` to the `functions` array:

```typescript
const functions = [readFunction, globFunction, grepFunction, writeFunction, editFunction, echoFunction]
```

**Step 4: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/inngest/index.ts src/inngest/functions/debug/echo.ts src/inngest/functions/index.ts
git commit -m "feat: add debug echo function for Inngest step visibility"
```

---

### Task 4: Create the explorer agent definition

**Files:**
- Create: `src/lib/agent/explorer.ts`

**Step 1: Create the agent module**

Create `src/lib/agent/explorer.ts`:

```typescript
import { anthropic } from "@ai-sdk/anthropic"
import { ToolLoopAgent, stepCountIs } from "ai"
import { readTool, globTool, grepTool } from "@/lib/agent/fs/tools"

const MAX_STEPS = 20 as const

const tools = {
	read: readTool,
	glob: globTool,
	grep: grepTool
} as const

const instructions = [
	"You are a codebase explorer.",
	"Given a question or task about a codebase, use the available tools to read files, search for patterns, and find relevant code.",
	"Be thorough but efficient:",
	"- Start with glob to understand directory structure",
	"- Use grep to find relevant code by pattern",
	"- Read specific files to understand implementation details",
	"Provide a clear, structured answer with file paths and relevant code excerpts."
].join("\n")

const explorer = new ToolLoopAgent({
	id: "paul/explorer",
	model: anthropic("claude-haiku-4-5-20251001"),
	instructions,
	tools,
	stopWhen: stepCountIs(MAX_STEPS)
})

export { explorer, MAX_STEPS }
```

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS — `ToolLoopAgent`, `stepCountIs`, and tool imports all resolve.

If `ToolLoopAgent` is not found in `ai` exports, check the AI SDK version. It was added in v6. The import path is `ai` (not `ai/agent`).

**Step 3: Commit**

```bash
git add src/lib/agent/explorer.ts
git commit -m "feat: add L3 explorer agent with read-only fs tools"
```

---

### Task 5: Add Inngest explore event schema

**Files:**
- Modify: `src/inngest/index.ts` (add explore event to schema)

**Step 1: Add the explore event schema**

In `src/inngest/index.ts`, add to the `schema` object (before the echo entry):

```typescript
"paul/agents/explore": z.object({
	prompt: z.string().min(1)
}),
```

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/inngest/index.ts
git commit -m "feat: add paul/agents/explore event schema"
```

---

### Task 6: Create the Inngest explore function

**Files:**
- Create: `src/inngest/functions/agents/explore.ts`

**Step 1: Create the function**

Create `src/inngest/functions/agents/explore.ts`:

```typescript
import * as errors from "@superbuilders/errors"
import { inngest } from "@/inngest"
import { explorer } from "@/lib/agent/explorer"

const exploreFunction = inngest.createFunction(
	{ id: "paul/agents/explore" },
	{ event: "paul/agents/explore" },
	async ({ event, logger, step }) => {
		logger.info("starting explore", { prompt: event.data.prompt })

		const result = await step.run("explore", async () => {
			const generation = await errors.try(
				explorer.generate({
					prompt: event.data.prompt
				})
			)
			if (generation.error) {
				logger.error("explore failed", { error: generation.error })
				throw errors.wrap(generation.error, "explore")
			}

			return {
				text: generation.data.text,
				steps: generation.data.steps.map(function summarizeStep(s) {
					return {
						stepNumber: s.stepNumber,
						finishReason: s.finishReason,
						usage: s.usage,
						text: s.text,
						toolCalls: s.toolCalls,
						toolResults: s.toolResults
					}
				}),
				totalUsage: generation.data.totalUsage
			}
		})

		await step.sendEvent("emit-steps", result.steps.map(function toEchoEvent(s) {
			return {
				name: "paul/debug/echo" as const,
				data: {
					source: "paul/agents/explore",
					payload: {
						stepNumber: s.stepNumber,
						finishReason: s.finishReason,
						usage: s.usage,
						text: s.text,
						toolCalls: s.toolCalls,
						toolResults: s.toolResults
					}
				}
			}
		}))

		logger.info("explore complete", {
			stepCount: result.steps.length,
			totalUsage: result.totalUsage
		})

		return result
	}
)

export { exploreFunction }
```

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS — Inngest event type infers `prompt: string` from the schema. `explorer.generate()` accepts `prompt`. `step.sendEvent()` accepts an array of events.

If `s.stepNumber` doesn't exist on the step result type, use the array index from `.map()` instead (add `i` parameter).

If `generation.data.totalUsage` doesn't exist, check if it's `generation.data.usage` (last step's usage) instead.

If `step.sendEvent()` doesn't accept a string ID as first arg, try `step.sendEvent(result.steps.map(...))` without the ID.

**Step 3: Commit**

```bash
git add src/inngest/functions/agents/explore.ts
git commit -m "feat: add Inngest explore function with per-step echo events"
```

---

### Task 7: Register the explore function

**Files:**
- Modify: `src/inngest/functions/index.ts`

**Step 1: Add import and registration**

In `src/inngest/functions/index.ts`, add the import:

```typescript
import { exploreFunction } from "@/inngest/functions/agents/explore"
```

Add `exploreFunction` to the `functions` array:

```typescript
const functions = [readFunction, globFunction, grepFunction, writeFunction, editFunction, echoFunction, exploreFunction]
```

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/inngest/functions/index.ts
git commit -m "feat: register explore function in Inngest"
```

---

### Task 8: Lint, format, and verify

**Step 1: Run full lint**

Run: `bun lint:all`
Expected: PASS or only pre-existing warnings. Fix any new errors introduced by our changes.

Common fixes:
- Missing trailing newlines
- Import ordering (Biome handles this)
- Arrow function callbacks in Inngest (allowed — they're trivial inline callbacks)

**Step 2: Run format**

Run: `bun format`
Expected: Files formatted per project config (tabs, double quotes, no semicolons)

**Step 3: Run typecheck one final time**

Run: `bun typecheck`
Expected: PASS

**Step 4: Commit any lint/format fixes**

```bash
git add -A
git commit -m "style: lint and format explorer agent"
```

---

### Task 9: Manual integration test via Inngest dev server

**Step 1: Start the dev servers**

Terminal 1: `bun dev`
Terminal 2: `bun dev:inngest`

Expected: Next.js starts on port 3000, Inngest dev server connects.

**Step 2: Verify function registration**

Open Inngest dashboard (typically `http://localhost:8288`).
Expected: Both `paul/agents/explore` and `paul/debug/echo` appear in the function list alongside the existing `paul/agents/fs/*` functions.

**Step 3: Trigger a test event**

In the Inngest dashboard, send a test event:

```json
{
  "name": "paul/agents/explore",
  "data": {
    "prompt": "What files are in the src/lib/agent directory and what do they do?"
  }
}
```

Expected: The explore function executes. After completion, multiple `paul/debug/echo` runs appear in the dashboard — one per agent step. Each echo run's payload contains the step's tool calls, tool results, and model text.

**Step 4: Verify the echo runs**

Click into each `paul/debug/echo` run in the Inngest dashboard:
- Early steps should show `glob` and `grep` tool calls with their results
- Later steps should show `read` tool calls with file contents
- The final step should have `finishReason: "stop"` with no tool calls (just the answer text)

**Step 5: Verify the explore function output**

Check the explore function's return value:
- `text`: Should contain a description of `operations.ts` and `tools.ts`
- `steps`: Array with > 1 entry
- `totalUsage`: Token counts > 0

If the function fails:
- Check `ANTHROPIC_API_KEY` is set in `.env`
- Check Inngest logs for the specific error
- Common issue: model ID typo — verify `claude-haiku-4-5-20251001` is correct

**Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address integration test findings"
```
