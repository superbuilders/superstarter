# Approach B: Manual generateText Loop with Per-Step Inngest Checkpointing

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the ToolLoopAgent black box with a manual `generateText` loop where each LLM call is its own Inngest `step.run()`, enabling per-step checkpointing, dashboard visibility during execution, and future human approval gates.

**Architecture:** Each iteration of the agent loop calls `generateText` (which defaults to `stopWhen: stepCountIs(1)` — one LLM call + tool execution per invocation). The response messages from each call are accumulated and passed to the next call, mirroring `generateText`'s internal `stepInputMessages = [...initialMessages, ...responseMessages]` pattern. Each iteration is wrapped in `step.run()` for Inngest checkpointing. Echo events are emitted per-step for dashboard visibility. On retry, Inngest replays completed steps from cache, restoring the accumulated message state correctly.

**Tech Stack:** AI SDK v6 (`ai`, `@ai-sdk/anthropic`), Inngest (checkpointing enabled), Bun

---

### Task 1: Refactor explorer.ts to export config constants

**Files:**
- Modify: `src/lib/agent/explorer.ts`

The current file exports a `ToolLoopAgent` instance. We replace it with individual config constants that the Inngest function can compose into a manual loop. The `ToolLoopAgent` import is removed.

**Step 1: Rewrite explorer.ts**

Replace the entire contents of `src/lib/agent/explorer.ts` with:

```typescript
import { anthropic } from "@ai-sdk/anthropic"
import type { GenerateTextResult, StepResult } from "ai"
import { globTool, grepTool, readTool } from "@/lib/agent/fs/tools"

const MAX_STEPS = 20 as const

const model = anthropic("claude-haiku-4-5-20251001")

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

type ExplorerTools = typeof tools
type ExplorerStepResult = StepResult<ExplorerTools>
type ExplorerResponseMessages = GenerateTextResult<ExplorerTools, never>["response"]["messages"]

export { MAX_STEPS, instructions, model, tools }
export type { ExplorerResponseMessages, ExplorerStepResult, ExplorerTools }
```

**Key changes from current file:**
- Removed `ToolLoopAgent` and `stepCountIs` imports from `"ai"`
- Added `GenerateTextResult` and `StepResult` type imports from `"ai"` — both are exported from `ai` at `packages/ai/src/generate-text/index.ts`
- Export individual constants instead of agent instance
- Export `ExplorerResponseMessages` type — derived from `GenerateTextResult["response"]["messages"]`. This gives the Inngest function a type for the accumulated response messages without importing non-exported `ResponseMessage` from AI SDK internals.
- Export `ExplorerStepResult` type — derived directly from `StepResult<ExplorerTools>`. This is the AI SDK's own step result type, used for typing the full materialized step data in the Inngest function.
- Export `ExplorerTools` type for use in typed step results

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS. `GenerateTextResult<ExplorerTools, never>` and `StepResult<ExplorerTools>` both resolve. The `never` for OUTPUT works because `response.messages` type doesn't depend on the OUTPUT generic.

If `GenerateTextResult` or `StepResult` is not found, check the imports: both are exported from `ai` at `packages/ai/src/generate-text/index.ts`.

**Step 3: Commit**

```bash
git add src/lib/agent/explorer.ts
git commit -m "refactor: export explorer config constants instead of ToolLoopAgent"
```

---

### Task 2: Rewrite explore Inngest function with manual loop

**Files:**
- Modify: `src/inngest/functions/agents/explore.ts`

This is the core change. Replace the single `step.run()` wrapping `explorer.generate()` with a manual loop where each LLM call is its own `step.run()`.

**Critical design decision: Full data, no summarization.**

The step result type is `StepResult<ExplorerTools>` from the AI SDK — no custom summary types. Every field is returned in full: complete tool calls with all properties, complete tool results with all properties, the full `content` array, reasoning, sources, files, everything.

**Serialization note:** `generateText` returns a `DefaultStepResult` class instance where `text`, `toolCalls`, `toolResults`, `reasoning`, `files`, `sources`, and their static/dynamic variants are **getter properties** computed from the `content` array. JavaScript's `JSON.stringify()` only serializes own enumerable properties — **getters are invisible**. Since Inngest's `step.run()` serializes the return value to JSON for checkpointing, we must explicitly materialize all getter-derived fields into a plain object. The `materialize()` function handles this.

**Step 1: Rewrite explore.ts**

Replace the entire contents of `src/inngest/functions/agents/explore.ts` with:

```typescript
import * as errors from "@superbuilders/errors"
import { generateText } from "ai"
import type { StepResult } from "ai"
import { inngest } from "@/inngest"
import {
	MAX_STEPS,
	instructions,
	model,
	tools
} from "@/lib/agent/explorer"
import type {
	ExplorerResponseMessages,
	ExplorerStepResult,
	ExplorerTools
} from "@/lib/agent/explorer"

/**
 * Materializes a StepResult class instance into a plain object.
 *
 * DefaultStepResult stores data in an own `content` array and exposes
 * text, toolCalls, toolResults, etc. as getter properties derived from it.
 * JSON.stringify only serializes own enumerable properties — getters are
 * invisible. This function explicitly reads every field so the result
 * is a plain object that survives Inngest's step.run() JSON serialization.
 */
function materialize(step: StepResult<ExplorerTools>): ExplorerStepResult {
	return {
		stepNumber: step.stepNumber,
		model: step.model,
		functionId: step.functionId,
		metadata: step.metadata,
		experimental_context: step.experimental_context,
		content: step.content,
		text: step.text,
		reasoning: step.reasoning,
		reasoningText: step.reasoningText,
		files: step.files,
		sources: step.sources,
		toolCalls: step.toolCalls,
		staticToolCalls: step.staticToolCalls,
		dynamicToolCalls: step.dynamicToolCalls,
		toolResults: step.toolResults,
		staticToolResults: step.staticToolResults,
		dynamicToolResults: step.dynamicToolResults,
		finishReason: step.finishReason,
		rawFinishReason: step.rawFinishReason,
		usage: step.usage,
		warnings: step.warnings,
		request: step.request,
		response: step.response,
		providerMetadata: step.providerMetadata
	}
}

const exploreFunction = inngest.createFunction(
	{ id: "paul/agents/explore" },
	{ event: "paul/agents/explore" },
	async ({ event, logger, step }) => {
		logger.info("starting explore", { prompt: event.data.prompt })

		let responseMessages: ExplorerResponseMessages = []
		const steps: ExplorerStepResult[] = []
		let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

		for (let i = 0; i < MAX_STEPS; i++) {
			const stepResult = await step.run(`llm-${i}`, async () => {
				const result = await errors.try(
					generateText({
						model,
						system: instructions,
						messages: [
							{ role: "user" as const, content: event.data.prompt },
							...responseMessages
						],
						tools
					})
				)
				if (result.error) {
					logger.error("llm call failed", { error: result.error, step: i })
					throw errors.wrap(result.error, `llm step ${i}`)
				}

				const firstStep = result.data.steps[0]
				if (!firstStep) {
					logger.error("no step in result", { step: i })
					throw errors.new("generateText returned no steps")
				}

				return {
					step: materialize(firstStep),
					responseMessages: result.data.response.messages
				}
			})

			responseMessages = [...responseMessages, ...stepResult.responseMessages]

			totalUsage = {
				promptTokens: totalUsage.promptTokens + stepResult.step.usage.promptTokens,
				completionTokens: totalUsage.completionTokens + stepResult.step.usage.completionTokens,
				totalTokens: totalUsage.totalTokens + stepResult.step.usage.totalTokens
			}

			steps.push(stepResult.step)

			await step.sendEvent(`echo-${i}`, [{
				name: "paul/debug/echo" as const,
				data: {
					source: "paul/agents/explore",
					payload: stepResult.step
				}
			}])

			logger.info("step complete", {
				step: i,
				finishReason: stepResult.step.finishReason,
				usage: stepResult.step.usage
			})

			if (stepResult.step.finishReason === "stop") {
				break
			}
		}

		logger.info("explore complete", {
			stepCount: steps.length,
			totalUsage
		})

		const lastStep = steps.at(-1)
		const text = lastStep ? lastStep.text : ""

		return {
			text,
			steps,
			totalUsage
		}
	}
)

export { exploreFunction }
```

**How it works:**

1. **Full data via `materialize()`:** Each step returns the complete `StepResult<ExplorerTools>` — all fields materialized from the class instance into a plain JSON-serializable object. No summarization, no field cherry-picking. The full `content` array, all tool calls with every property, all tool results with every property, reasoning, files, sources — everything is preserved for debugging.

2. **Initial messages:** The user prompt becomes `{ role: "user", content: prompt }`. On subsequent iterations, accumulated `responseMessages` (assistant + tool messages from previous steps) are appended.

3. **Per-step `step.run()`:** Each LLM call is independently checkpointed. On retry, Inngest replays completed steps and re-executes only the failed step. The closure captures `responseMessages` which is rebuilt from cached step results.

4. **Message accumulation:** `result.data.response.messages` returns an array of `AssistantModelMessage | ToolModelMessage` — the model's response plus tool results. This mirrors `generateText`'s internal pattern at line 664: `stepInputMessages = [...initialMessages, ...responseMessages]`.

5. **`generateText` defaults to `stepCountIs(1)`:** No `stopWhen` needed. Each call does exactly one LLM invocation + tool execution. The model returns `finishReason: "tool-calls"` if it wants to continue (more tool calls needed) or `"stop"` when done.

6. **Per-step echo events:** Each step emits its own `paul/debug/echo` event immediately with the full materialized step result, providing real-time dashboard visibility during execution (vs. batched after completion in Approach A).

7. **Final text:** The answer is from the last step's text. Uses `steps.at(-1)` with a ternary guard because `.at()` returns `T | undefined`.

8. **Why `result.data.steps[0]` instead of top-level properties:** `generateText` returns a `DefaultGenerateTextResult` class that has the same getter pattern as `DefaultStepResult`. The top-level `text`, `toolCalls`, etc. mirror the last step but are also getters. Using `steps[0]` gives us the `StepResult` directly — matching our export type and providing the `stepNumber` and `model` fields that only exist on `StepResult`, not on `GenerateTextResult`.

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS.

**Potential type issues and fixes:**

- If `ExplorerResponseMessages` doesn't assignable-spread into the `messages` parameter of `generateText`, the issue is that `generateText` expects `Array<ModelMessage>` and `ExplorerResponseMessages` is `Array<AssistantModelMessage | ToolModelMessage>`. These should be compatible since `AssistantModelMessage | ToolModelMessage` is a subset of `ModelMessage`. If TypeScript disagrees, add an explicit spread: `...(responseMessages as Array<ModelMessage>)`. But first try without — `as` is banned except for `as const`.

- If the combined array `[{ role: "user"... }, ...responseMessages]` doesn't typecheck against `Array<ModelMessage>`, try: change the initial message to use `{ role: "user" as const, content: event.data.prompt }`. The `as const` on `"user"` narrows the role literal type to match `UserModelMessage`.

- If `materialize()` return type doesn't satisfy `ExplorerStepResult`, check for missing fields. The `StepResult` type has every field listed in the function — if the AI SDK adds new fields in a future version, add them to `materialize()`.

- If the echo event payload type doesn't match the `paul/debug/echo` event schema, check `src/inngest/index.ts` for the event schema definition. The `payload` field should accept `ExplorerStepResult` or be typed broadly enough (e.g., `unknown` or `Record<string, unknown>`).

**Step 3: Commit**

```bash
git add src/inngest/functions/agents/explore.ts
git commit -m "feat: replace ToolLoopAgent with manual generateText loop for per-step checkpointing"
```

---

### Task 3: Lint, format, and verify

**Step 1: Run full lint**

Run: `bun lint:all`
Expected: PASS or only pre-existing warnings. Fix any new errors.

Common issues:
- Import ordering (Biome auto-sorts alphabetically)
- `as const` might trigger GritQL rule if used outside `export` context — `"user" as const` in the messages array is fine (it's a literal narrowing, not a type assertion)
- The `materialize()` function comment block uses `/** */` style — `bun format` strips comments, so this may be removed. That's fine.

**Step 2: Run format**

Run: `bun format`
Expected: Files formatted (tabs, double quotes, no semicolons). The `materialize()` function comment will likely be stripped by the comment stripper. This is expected behavior.

**Step 3: Run typecheck**

Run: `bun typecheck`
Expected: PASS.

**Step 4: Commit any fixes**

```bash
git add src/lib/agent/explorer.ts src/inngest/functions/agents/explore.ts
git commit -m "style: lint and format approach B"
```

---

### Task 4: Manual integration test via Inngest dev server

**Step 1: Start the dev servers**

Terminal 1: `bun dev`
Terminal 2: `bun dev:inngest`

Expected: Next.js starts on port 3000, Inngest dev server connects.

**Step 2: Verify function registration**

Open Inngest dashboard (typically `http://localhost:8288`).
Expected: `paul/agents/explore` appears in the function list. It's the same function ID — we modified the implementation, not the registration.

**Step 3: Trigger a test event**

In the Inngest dashboard, send:

```json
{
  "name": "paul/agents/explore",
  "data": {
    "prompt": "What files are in the src/lib/agent directory and what do they do?"
  }
}
```

**Step 4: Observe per-step execution**

Expected behavior (the key improvement over Approach A):

1. The function run in the dashboard shows MULTIPLE steps: `llm-0`, `echo-0`, `llm-1`, `echo-1`, ... `llm-N`, `echo-N`
2. Each `llm-*` step appears as it completes — you can see progress in real-time
3. Each `echo-*` step triggers a separate `paul/debug/echo` function run
4. The total step count should be similar to Approach A (same model, same tools, same prompt)

**Step 5: Verify full step data**

Click into each `llm-*` step in the dashboard:
- `llm-0`: Should show the full `StepResult` with `content` array, `toolCalls` with complete tool call objects (including all properties from the AI SDK — `toolCallId`, `toolName`, `input`, `type`, etc.), `toolResults` with complete results (including `toolCallId`, `toolName`, `output`, `type`, etc.), `finishReason: "tool-calls"`, `usage`, `model`, `request`, `response`
- Middle steps: More tool calls/results with full data
- Final step: Should have `finishReason: "stop"`, `text` with the answer, empty `toolCalls`, the complete `content` array showing text parts

Click into each `echo-*` run:
- The `payload` should contain the full materialized `StepResult` — identical to the data in the corresponding `llm-*` step

**Step 6: Verify retry behavior (optional)**

To test checkpointing:
1. Send the same event
2. While it's running, kill the Next.js server (`Ctrl+C` in Terminal 1)
3. Restart with `bun dev`
4. The function should resume from the last completed step (not from scratch)

**Step 7: Compare with Approach A**

The return value should have a similar shape but with FULL step data:
- `text`: Final answer text
- `steps`: Array of full `StepResult` objects — complete tool calls, complete tool results, content arrays, usage, model info, request/response metadata
- `totalUsage`: Aggregated token counts

The numbers should be similar to a comparable Approach A run (same prompt, same model).

**Step 8: Commit any fixes**

```bash
git add -A
git commit -m "fix: address integration test findings"
```
