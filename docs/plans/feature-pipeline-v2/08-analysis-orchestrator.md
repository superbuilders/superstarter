# Sub-Plan 08: Analysis Orchestrator

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 1 orchestrator — analyzes the target codebase for architectural feasibility.

**Architecture:** Inngest function that runs the agent loop with explorer subagents.

**Tech Stack:** Inngest, Vercel AI SDK, Vercel Sandbox

**Dependencies:** 02 (Events), 03 (Persistence), 04 (Memory), 07 (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/analysis.ts`

---

## Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/analysis`

**Trigger event:** `paul/pipeline/analysis` (shape defined in Sub-Plan 02)

**Return shape:**
```typescript
{
    affectedSystems: string[]
    architecturalConstraints: string[]
    risks: string[]
    codebaseMap: {
        path: string
        purpose: string
        relevance: string
    }[]
    feasibilityAssessment: string
}
```

**v2 addition: Structured output enforcement.** The orchestrator must Zod-validate its final output before returning. Use AI SDK `structuredOutputs` or JSON.parse + safeParse. Fail the phase explicitly if validation fails.

## Internal (can change freely)

- System prompt content, subagent count/strategy, when CTAs fire, how output is assembled.

---

## Steps

1. Create `src/inngest/functions/pipeline/analysis.ts`. Inngest function: receives event, connects to sandbox, builds system prompt with memories (via `formatMemoriesForPrompt`), runs `runAgentLoop`. Tools: `spawn_subagent` (explorer only), `request_human_feedback` (via `dispatchCta`), `create_memory`. Validates output against return shape schema before returning.
2. `bun typecheck` — must pass.
3. Commit: `feat: add analysis phase orchestrator`
