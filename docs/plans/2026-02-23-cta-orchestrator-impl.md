# CTA + Orchestrator Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a CTA system and orchestrator agent that can delegate to subagents and suspend for typed human feedback via Inngest's durable execution.

**Architecture:** Unified execution loop — `generateText` with execute-less tools, all tool calls dispatched at the Inngest step level. See `docs/plans/2026-02-23-cta-orchestrator-design.md` for full design.

**Tech Stack:** Inngest (step.invoke, step.waitForEvent, step.sendEvent), AI SDK v5 (generateText, tool without execute), Zod 4

---

### Task 1: CTA Types, Schemas, and Tool

**Files:**
- Create: `src/lib/agent/cta.ts`

**Step 1: Implement CTA schemas, types, and tool**

Both `CtaRequestEventSchema` and `CtaResponseEventSchema` use `z.discriminatedUnion("kind", [...])` so each kind carries only its relevant fields.

```typescript
// src/lib/agent/cta.ts
import { tool } from "ai"
import { z } from "zod"

// --- Shared Schemas ---

const CtaKindSchema = z.enum(["approval", "text", "choice"])

const ChoiceOptionSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1)
})

// --- Request Event Schema (discriminated union on kind) ---

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

// --- Response Event Schema (discriminated union on kind) ---

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

// --- Types ---

type CtaKind = z.infer<typeof CtaKindSchema>
type CtaRequestEvent = z.infer<typeof CtaRequestEventSchema>
type CtaResponseEvent = z.infer<typeof CtaResponseEventSchema>

// --- Tool Definition (no execute — loop-intercepted) ---
// NOTE: Tool input stays flat for LLM compatibility.
// The orchestrator transforms flat args → discriminated event data.

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
        message: z
            .string()
            .describe("Message to show for approval CTAs")
            .optional(),
        prompt: z
            .string()
            .describe("Prompt to show for text or choice CTAs")
            .optional(),
        placeholder: z
            .string()
            .describe("Placeholder text for text input CTAs")
            .optional(),
        options: z
            .array(ChoiceOptionSchema)
            .describe("Options for choice CTAs")
            .optional()
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
```

**Step 2: Run typecheck + lint**

Run: `bun typecheck && bun scripts/dev/lint.ts src/lib/agent/cta.ts`

**Step 3: Commit**

```bash
git add src/lib/agent/cta.ts
git commit -m "feat: add CTA types, schemas, and tool definition"
```

---

### Task 2: Orchestrator Agent Config

**Files:**
- Create: `src/lib/agent/orchestrator.ts`

**Step 1: Implement orchestrator config**

```typescript
// src/lib/agent/orchestrator.ts
import { openai } from "@ai-sdk/openai"
import { tool } from "ai"
import { z } from "zod"
import { requestHumanFeedbackTool } from "@/lib/agent/cta"

const MAX_STEPS = 50 as const

const model = openai("gpt-5-nano")

const spawnSubagentTool = tool({
    description: [
        "Spawn a subagent to perform work.",
        "Use 'explore' for researching codebases, reading files, searching for patterns.",
        "Use 'code' for writing code, editing files, running commands.",
        "The subagent runs to completion and returns a summary of its work."
    ].join(" "),
    inputSchema: z.object({
        agent: z
            .enum(["explore", "code"])
            .describe("Which subagent to spawn"),
        prompt: z
            .string()
            .min(1)
            .describe("Detailed instructions for the subagent"),
        sandboxId: z
            .string()
            .min(1)
            .describe("Sandbox ID for the subagent to work in"),
        github: z
            .object({
                repoUrl: z.string().url(),
                branch: z.string().min(1)
            })
            .describe("GitHub repo context for the subagent")
            .optional()
    })
})

const tools = {
    request_human_feedback: requestHumanFeedbackTool,
    spawn_subagent: spawnSubagentTool
} as const

const instructions = [
    "You are an orchestrator agent that manages a team of subagents.",
    "You have two subagents available:",
    "- 'explore': researches codebases, reads files, finds patterns",
    "- 'code': writes code, edits files, runs commands",
    "",
    "You also have the ability to request feedback from a human user.",
    "Use this when you need decisions, approvals, or clarification.",
    "",
    "Your job is to:",
    "1. Break down the user's request into subtasks",
    "2. Delegate each subtask to the appropriate subagent",
    "3. Review subagent results and decide next steps",
    "4. Request human feedback when you need input on decisions",
    "5. Provide a final summary when the work is complete",
    "",
    "Be strategic about when to ask for human feedback.",
    "Ask early for architectural decisions and approvals.",
    "Don't ask for things you can decide yourself."
].join("\n")

type OrchestratorTools = typeof tools

export { MAX_STEPS, instructions, model, spawnSubagentTool, tools }
export type { OrchestratorTools }
```

**Step 2: Run typecheck + lint**

Run: `bun typecheck && bun scripts/dev/lint.ts src/lib/agent/orchestrator.ts`

**Step 3: Commit**

```bash
git add src/lib/agent/orchestrator.ts
git commit -m "feat: add orchestrator agent config with spawn and CTA tools"
```

---

### Task 3: Event Schemas

**Files:**
- Modify: `src/inngest/index.ts`

**Step 1: Add three new event schemas**

Add to the `schema` object in `src/inngest/index.ts`. Import `CtaRequestEventSchema` and `CtaResponseEventSchema` from `@/lib/agent/cta` to avoid duplicating the discriminated unions:

```typescript
import {
    CtaRequestEventSchema,
    CtaResponseEventSchema
} from "@/lib/agent/cta"

// Add to schema object:
"paul/agents/orchestrate": z.object({
    prompt: z.string().min(1),
    sandboxId: z.string().min(1)
}),
"paul/cta/request": CtaRequestEventSchema,
"paul/cta/response": CtaResponseEventSchema
```

Note: If Inngest's `fromSchema` doesn't accept `z.discriminatedUnion()` (it expects `z.object()`), fall back to a `z.union()` or keep the flat schema for the event registration only, and use the discriminated union for internal validation in the orchestrator function.
```

**Step 2: Run typecheck**

Run: `bun typecheck`

**Step 3: Commit**

```bash
git add src/inngest/index.ts
git commit -m "feat: add orchestrate, CTA request, and CTA response event schemas"
```

---

### Task 4: Orchestrator Inngest Function

**Files:**
- Create: `src/inngest/functions/agents/orchestrate.ts`
- Modify: `src/inngest/functions/index.ts`

This is the core implementation — the unified execution loop.

**Step 1: Implement the orchestrator function**

```typescript
// src/inngest/functions/agents/orchestrate.ts
import * as errors from "@superbuilders/errors"
import type { ModelMessage } from "ai"
import { generateText } from "ai"
import { modelMessageSchema } from "ai"
import { z } from "zod"
import { inngest } from "@/inngest"
import { exploreFunction } from "@/inngest/functions/agents/explore"
import { codeFunction } from "@/inngest/functions/agents/code"
import { CtaResponseEventSchema } from "@/lib/agent/cta"
import type { CtaRequestEvent } from "@/lib/agent/cta"
import { MAX_STEPS, instructions, model, tools } from "@/lib/agent/orchestrator"

const CTA_TIMEOUT = "30d" as const

const messagesSchema = z.array(modelMessageSchema)

function parseMessages(raw: unknown): ModelMessage[] {
    const parsed = messagesSchema.safeParse(raw)
    if (!parsed.success) {
        throw errors.new("response messages failed validation")
    }
    return parsed.data
}

const orchestrateFunction = inngest.createFunction(
    { id: "paul/agents/orchestrate" },
    { event: "paul/agents/orchestrate" },
    async ({ event, logger, step }) => {
        logger.info("starting orchestrate", {
            prompt: event.data.prompt,
            sandboxId: event.data.sandboxId
        })

        let messages: ModelMessage[] = [
            { role: "user" as const, content: event.data.prompt }
        ]
        let lastText = ""
        let stepCount = 0

        for (let i = 0; i < MAX_STEPS; i++) {
            // LLM thinks — no tool execution
            const thought = await step.run(`think-${i}`, async () => {
                const result = await errors.try(
                    generateText({
                        model,
                        system: instructions,
                        messages,
                        tools
                    })
                )
                if (result.error) {
                    logger.error("llm call failed", { error: result.error, step: i })
                    throw errors.wrap(result.error, `llm step ${i}`)
                }

                return {
                    text: result.data.text,
                    finishReason: result.data.finishReason,
                    toolCalls: result.data.toolCalls,
                    responseMessages: result.data.response.messages,
                    usage: result.data.usage
                }
            })

            logger.info("thought complete", {
                step: i,
                finishReason: thought.finishReason,
                toolCallCount: thought.toolCalls.length
            })

            lastText = thought.text
            stepCount++

            if (thought.finishReason === "stop") {
                break
            }

            // Add assistant message(s) to history
            const assistantMessages = parseMessages(thought.responseMessages)
            messages = [...messages, ...assistantMessages]

            // Dispatch each tool call
            const toolResults: Array<{
                type: "tool-result"
                toolCallId: string
                result: unknown
            }> = []

            for (const toolCall of thought.toolCalls) {
                logger.info("dispatching tool", {
                    step: i,
                    tool: toolCall.toolName,
                    toolCallId: toolCall.toolCallId
                })

                if (toolCall.toolName === "spawn_subagent") {
                    const args = toolCall.args
                    const targetFunction =
                        args.agent === "explore" ? exploreFunction : codeFunction
                    const invokeResult = await step.invoke(
                        `spawn-${i}-${toolCall.toolCallId}`,
                        {
                            function: targetFunction,
                            data: {
                                prompt: args.prompt,
                                sandboxId: args.sandboxId,
                                github: args.github
                            }
                        }
                    )

                    logger.info("subagent complete", {
                        step: i,
                        agent: args.agent,
                        stepCount: invokeResult.stepCount
                    })

                    toolResults.push({
                        type: "tool-result" as const,
                        toolCallId: toolCall.toolCallId,
                        result: invokeResult
                    })
                } else if (toolCall.toolName === "request_human_feedback") {
                    const args = toolCall.args
                    const ctaId = crypto.randomUUID()

                    // Transform flat tool args → discriminated event data
                    function buildCtaRequestData(
                        flatArgs: typeof args
                    ): CtaRequestEvent {
                        const base = { ctaId, runId: event.id }
                        if (flatArgs.kind === "approval") {
                            return {
                                ...base,
                                kind: "approval" as const,
                                message: flatArgs.message ?? "Approval requested"
                            }
                        }
                        if (flatArgs.kind === "text") {
                            return {
                                ...base,
                                kind: "text" as const,
                                prompt: flatArgs.prompt ?? "Input requested",
                                placeholder: flatArgs.placeholder
                            }
                        }
                        return {
                            ...base,
                            kind: "choice" as const,
                            prompt: flatArgs.prompt ?? "Choice requested",
                            options: flatArgs.options ?? []
                        }
                    }

                    const ctaData = buildCtaRequestData(args)

                    await step.sendEvent(`cta-emit-${i}`, {
                        name: "paul/cta/request" as const,
                        data: ctaData
                    })

                    logger.info("cta emitted, suspending", { ctaId, kind: args.kind })

                    const ctaResponse = await step.waitForEvent(
                        `cta-wait-${i}`,
                        {
                            event: "paul/cta/response",
                            if: `event.data.ctaId == "${ctaId}"`,
                            timeout: CTA_TIMEOUT
                        }
                    )

                    if (!ctaResponse) {
                        logger.warn("cta timeout", { ctaId, kind: args.kind })
                        return {
                            text: "Human feedback request timed out after 30 days.",
                            stepCount,
                            timedOut: true
                        }
                    }

                    logger.info("cta response received", {
                        ctaId,
                        kind: ctaResponse.data.kind
                    })

                    const validated = CtaResponseEventSchema.safeParse(
                        ctaResponse.data
                    )
                    if (!validated.success) {
                        logger.error("cta response validation failed", {
                            error: validated.error
                        })
                        throw errors.new("cta response validation failed")
                    }

                    toolResults.push({
                        type: "tool-result" as const,
                        toolCallId: toolCall.toolCallId,
                        result: validated.data
                    })
                } else {
                    logger.error("unknown tool call", {
                        tool: toolCall.toolName,
                        step: i
                    })
                    throw errors.new(`unknown tool: ${toolCall.toolName}`)
                }
            }

            // Add tool results to message history
            if (toolResults.length > 0) {
                messages.push({
                    role: "tool" as const,
                    content: toolResults
                })
            }
        }

        logger.info("orchestrate complete", { stepCount })

        return { text: lastText, stepCount }
    }
)

export { orchestrateFunction }
```

**Step 2: Register in functions index**

Add to `src/inngest/functions/index.ts`:

```typescript
import { orchestrateFunction } from "@/inngest/functions/agents/orchestrate"
```

Add `orchestrateFunction` to the `functions` array.

**Step 3: Run typecheck + lint**

Run: `bun typecheck && bun scripts/dev/lint.ts src/inngest/functions/agents/orchestrate.ts`

Note: `step.invoke` with direct function references may need type adjustments. If TypeScript complains, the implementer should check Inngest's `referenceFunction` API as an alternative.

**Step 4: Commit**

```bash
git add src/inngest/functions/agents/orchestrate.ts src/inngest/functions/index.ts
git commit -m "feat: add orchestrator agent with unified execution loop"
```

---

### Task 5: Typecheck + Lint Full Codebase

**Step 1: Run full typecheck**

Run: `bun typecheck`
Expected: PASS — no type errors

**Step 2: Run full lint**

Run: `bun lint`
Expected: PASS — no lint errors

**Step 3: Fix any issues found**

Address type errors and lint violations. Common things to watch for:
- `toolCall.args` typing (may need the AI SDK `ToolCall` generic)
- `step.invoke` function reference typing
- Message construction types (`ModelMessage` union)

**Step 4: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve type and lint issues in orchestrator"
```

---

### Task 6: Manual Integration Test

**Step 1: Start Inngest dev server**

Run: `bun dev:inngest` (in one terminal)
Run: `bun dev` (in another terminal)

**Step 2: Send orchestrate event via Inngest dashboard**

Navigate to Inngest dev dashboard (http://localhost:8288). Send event:

```json
{
    "name": "paul/agents/orchestrate",
    "data": {
        "prompt": "What files are in the src directory?",
        "sandboxId": "<a valid sandbox ID>"
    }
}
```

**Step 3: Verify function execution**

Check that:
- The orchestrate function starts
- The LLM makes a `spawn_subagent` tool call to explore
- The explore subagent is invoked and returns results
- The orchestrator continues processing

**Step 4: Test CTA flow**

Send an event that would trigger a CTA (may need to prompt the LLM appropriately), then manually send a `paul/cta/response` event:

```json
{
    "name": "paul/cta/response",
    "data": {
        "ctaId": "<ctaId from the request event>",
        "kind": "approval",
        "approved": true,
        "reason": "Approved for testing"
    }
}
```

Verify the orchestrator resumes after receiving the response.
