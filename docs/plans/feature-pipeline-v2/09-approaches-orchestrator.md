# Sub-Plan 09: Approaches Orchestrator

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 2 orchestrator — generates 2+ distinct implementation approaches with validated assumptions.

**Architecture:** Inngest function that runs the agent loop, spawning explorers to validate assumptions.

**Tech Stack:** Inngest, Vercel AI SDK, Vercel Sandbox

**Dependencies:** 02 (Events), 03 (Persistence), 04 (Memory), 07 (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/approaches.ts`

---

## Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/approaches`

**Trigger event:** `paul/pipeline/approaches` (shape defined in Sub-Plan 02)

**Return shape:**
```typescript
{
    approaches: {
        id: string
        title: string
        summary: string
        rationale: string
        implementation: string
        affectedFiles: string[]
        tradeoffs: { pros: string[], cons: string[] }
        assumptions: {
            claim: string
            validated: boolean
            evidence: string
        }[]
        estimatedComplexity: "low" | "medium" | "high"
    }[]
    recommendation: string
    singleApproachJustification?: string
}
```

**v2 additions:**
- **Structured output enforcement** — Zod-validate before returning.
- **Differentiation constraint in system prompt** — approaches must differ along a structural axis (which layer, what abstraction, sync vs async). "Do not produce approach B by weakening approach A." This is a prompt-level fix, not a schema change.
- **`implementation` field guidance** — system prompt must instruct: "Write the implementation plan as a numbered list of concrete steps: which file, what change, in what order." Prose descriptions like "add an endpoint" are insufficient for the coder.

## Internal (can change freely)

- System prompt content, explorer strategy, CTA timing, minimum approach count enforcement.

---

## Steps

1. Create `src/inngest/functions/pipeline/approaches.ts`. Receives analysisOutput in event. System prompt includes differentiation constraint and concrete implementation plan instructions. Validates output before returning.
2. `bun typecheck` — must pass.
3. Commit: `feat: add approaches phase orchestrator`
