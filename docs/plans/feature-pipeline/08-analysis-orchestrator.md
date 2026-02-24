# Sub-Plan 08: Analysis Orchestrator

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 1 orchestrator — analyzes the target codebase to understand architectural feasibility for the requested feature.

**Architecture:** Inngest function that runs the agent loop with explorer subagents to map the codebase.

**Tech Stack:** Inngest, Vercel AI SDK, Vercel Sandbox

**Dependencies:** 02 (Events), 03 (Persistence), 04 (Memory), 07 (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/analysis.ts`

---

## Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/analysis`

**Trigger event:** `paul/pipeline/analysis` (shape defined in Sub-Plan 02)

**Return shape** (the master orchestrator parses this):
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

## Internal (can change freely)

- System prompt content
- Which subagents are spawned and how many
- Whether explorers run in parallel or sequentially
- When CTAs are fired
- How the output is assembled from subagent results

---

## Steps

### Step 1: Create analysis orchestrator

**Files:** Create `src/inngest/functions/pipeline/analysis.ts`

1. Inngest function triggered by `paul/pipeline/analysis` event
2. Connects to sandbox via `connectSandbox(event.data.sandboxId)`
3. Builds system prompt: analysis-specific instructions + formatted memories (via `formatMemoriesForPrompt`) + feature request
4. Runs `runAgentLoop` with:
   - Tools: `spawn_subagent` (explorer only), `request_human_feedback`, `create_memory`
   - `onToolCall` callback that dispatches: spawn → `step.invoke(exploreFunction)`, CTA → emit/wait pattern, memory → persist via `createMemoryRecord`
5. Persists invocation data via persistence layer
6. Returns the analysis output matching the contract shape

System prompt instructs the orchestrator to:
- Break the codebase into logical areas and spawn explorers for each
- Identify which files, modules, and systems the feature will touch
- List architectural constraints and risks
- Produce a feasibility assessment
- Create memory records for key findings
- Request CTA if the feature request is ambiguous

### Step 2: Verify

Run: `bun typecheck`
Expected: PASS

### Step 3: Commit

```bash
git add src/inngest/functions/pipeline/analysis.ts
git commit -m "feat: add analysis phase orchestrator"
```
