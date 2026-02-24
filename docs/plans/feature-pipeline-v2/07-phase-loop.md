# Sub-Plan 07: Phase Loop Utilities

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the generic agent think-dispatch-inject loop into a reusable utility, plus a shared CTA dispatcher.

**Architecture:** DRY extraction of the loop in `orchestrate.ts` lines 156-232. Also extracts the 35-line CTA dispatch pattern (sendEvent + waitForEvent + validate + timeout handling) since all 4 phase orchestrators need it.

**Tech Stack:** Vercel AI SDK, Inngest

**Dependencies:** None

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

**`dispatchCta` signature** (v2 addition — extracted from orchestrate.ts):
```typescript
dispatchCta(
    toolCallId: string,
    toolName: string,
    input: HumanFeedbackInput,
    stepIndex: number,
    runId: string,
    step: InngestStep,
    logger: Logger
) → Promise<ToolResultPart>
```

This is the 35-line CTA dispatch pattern (sendEvent → waitForEvent → validate → timeout handling) extracted once, used by all 4 phase orchestrators. Memory dispatch (~10 lines, varies per orchestrator's context) stays inline — not worth abstracting.

## Internal (can change freely)

- Loop implementation, logging, step naming, error handling within onToolCall.

---

## Steps

1. Create `src/lib/pipeline/phase-loop.ts` — extract `buildToolResult`, `dispatchCta`, and `runAgentLoop` from `orchestrate.ts`.
2. `bun typecheck` — must pass.
3. Commit: `feat: add shared phase loop utilities`
