# Sub-Plan 07: Phase Loop Utilities

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the generic agent think-dispatch-inject loop from `orchestrate.ts` into a reusable utility for all phase orchestrators.

**Architecture:** DRY extraction of the loop in `orchestrate.ts` lines 156-232, parameterized via config object and callback.

**Tech Stack:** Vercel AI SDK, Inngest

**Dependencies:** None (references existing `orchestrate.ts` patterns but does not import from it)

**Produces:** `src/lib/pipeline/phase-loop.ts`

---

## Contract (non-negotiable)

**`runAgentLoop` config shape:**
```typescript
{
    model: LanguageModel
    system: string
    initialMessages: ModelMessage[]
    tools: ToolSet
    maxSteps: number
    step: InngestStep
    logger: Logger
    onToolCall: (toolCall: StaticToolCall) → Promise<ToolResultPart>
}
```

**`runAgentLoop` return shape:**
```typescript
{
    text: string
    stepCount: number
    finishReason: string
}
```

**`buildToolResult` signature:**
```typescript
buildToolResult(toolCallId: string, toolName: string, value: unknown) → ToolResultPart
```

## Internal (can change freely)

- Loop implementation details (how messages accumulate, how tool results are injected)
- Logging within the loop
- How `onToolCall` errors are handled
- Step naming convention (`think-${i}` etc.)

---

## Steps

### Step 1: Create phase loop module

**Files:** Create `src/lib/pipeline/phase-loop.ts`

Extract from `orchestrate.ts`:
1. `buildToolResult` — creates `ToolResultPart` from tool call ID, name, and value
2. `runAgentLoop` — the generic loop:
   - For each step up to `maxSteps`:
     a. `step.run(`think-${i}`)` → `generateText({ model, system, messages, tools })`
     b. If `finishReason === "stop"`: break
     c. Parse response messages, append to message history
     d. For each tool call: invoke `onToolCall` callback
     e. Inject tool results into messages
   - Return `{ text, stepCount, finishReason }`

The `onToolCall` callback is how each phase orchestrator customizes dispatch (spawn subagent, CTA, memory creation). The loop doesn't know about specific tools — it delegates everything to the callback.

### Step 2: Verify

Run: `bun typecheck`
Expected: PASS

### Step 3: Commit

```bash
git add src/lib/pipeline/phase-loop.ts
git commit -m "feat: add shared phase loop utilities"
```
