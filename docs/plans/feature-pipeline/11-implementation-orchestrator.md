# Sub-Plan 11: Implementation Orchestrator

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 4 orchestrator — implements the approved approach on a feature branch with orchestrator-managed coder retries until all quality gates pass.

**Architecture:** Inngest function that spawns fresh coder agents per attempt, runs quality gates after each, and manages the retry loop.

**Tech Stack:** Inngest, Vercel AI SDK, Vercel Sandbox

**Dependencies:** 02 (Events), 03 (Persistence), 04 (Memory), 06 (Quality Gates), 07 (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/implementation.ts`

---

## Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/implementation`

**Trigger event:** `paul/pipeline/implementation` (shape defined in Sub-Plan 02)

**Return shape** (the master orchestrator parses this):
```typescript
{
    branch: string
    filesChanged: {
        path: string
        changeType: "added" | "modified" | "deleted"
    }[]
    gateResults: {
        gate: "typecheck" | "lint" | "test" | "build"
        status: "passed" | "failed"
        output: string
        attempts: number
    }[]
    totalCoderAttempts: number
    conditionsAddressed: string[]
}
```

## Internal (can change freely)

- Max coder retry count
- How failure context is injected into retry prompts
- Feature branch naming convention
- How `filesChanged` is detected (git diff parsing, etc.)
- Coder system prompt content

---

## Steps

### Step 1: Create implementation orchestrator

**Files:** Create `src/inngest/functions/pipeline/implementation.ts`

Inngest function (`paul/pipeline/implementation`) that:

1. Receives selected approach, analysis output, judging output (including conditions) in event
2. Connects to sandbox
3. Creates a feature branch in the sandbox (`git checkout -b feat/<feature-name>`)
4. Orchestrator-managed retry loop (max 5 attempts):
   a. Spawn a fresh coder agent via `step.invoke(codeFunction)` with full context:
      - The selected approach's implementation plan
      - The analysis codebase map
      - Any judging conditions to address
      - Previous attempt's failure output (if retry)
   b. Coder writes code in the sandbox
   c. Run quality gates via `runAllGates(sandbox)` from Sub-Plan 06
   d. If all gates pass: break, success
   e. If gate fails: capture failure output, continue loop with next fresh coder — prompt includes: "The previous attempt failed: [gate output]. Fix these issues."
5. If all attempts fail, the phase fails
6. On success, detect changed files via `git diff --name-status` in sandbox
7. Returns implementation output matching the contract shape

### Step 2: Verify

Run: `bun typecheck`
Expected: PASS

### Step 3: Commit

```bash
git add src/inngest/functions/pipeline/implementation.ts
git commit -m "feat: add implementation phase orchestrator"
```
