# Sub-Plan 09: Approaches Orchestrator

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 2 orchestrator — generates 2+ distinct implementation approaches with validated assumptions and trade-offs.

**Architecture:** Inngest function that runs the agent loop, spawning explorers to validate technical assumptions for each approach.

**Tech Stack:** Inngest, Vercel AI SDK, Vercel Sandbox

**Dependencies:** 02 (Events), 03 (Persistence), 04 (Memory), 07 (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/approaches.ts`

---

## Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/approaches`

**Trigger event:** `paul/pipeline/approaches` (shape defined in Sub-Plan 02)

**Return shape** (the master orchestrator parses this):
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

## Internal (can change freely)

- System prompt content
- How approaches are generated (sequential vs parallel explorers)
- Steelmanning strategy
- When CTAs are fired
- Minimum approach count enforcement logic

---

## Steps

### Step 1: Create approaches orchestrator

**Files:** Create `src/inngest/functions/pipeline/approaches.ts`

1. Inngest function triggered by `paul/pipeline/approaches` event
2. Receives `analysisOutput` in event data — injects into system prompt as context
3. Builds system prompt: approach generation instructions + analysis context + formatted memories
4. Runs `runAgentLoop` with tools: `spawn_subagent` (explorer only), `request_human_feedback`, `create_memory`
5. System prompt instructs the orchestrator to:
   - Review the analysis output for context
   - Generate distinct approaches (soft minimum of 2)
   - For each approach, spawn explorers to validate key technical assumptions
   - Steelman each approach — make the strongest case
   - If generating only 1 approach, explain why alternatives aren't worth exploring
   - Create memory records for key decisions
   - Fire CTA if uncertain about direction
6. Returns the approaches output matching the contract shape

### Step 2: Verify

Run: `bun typecheck`
Expected: PASS

### Step 3: Commit

```bash
git add src/inngest/functions/pipeline/approaches.ts
git commit -m "feat: add approaches phase orchestrator"
```
