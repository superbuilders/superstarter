# Sub-Plan 11: Implementation Orchestrator

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 4 orchestrator — implements the approved approach with orchestrator-managed coder retries until quality gates pass.

**Architecture:** Inngest function that spawns fresh coder agents per attempt, resets the branch between attempts, runs quality gates after each.

**Tech Stack:** Inngest, Vercel AI SDK, Vercel Sandbox

**Dependencies:** 02 (Events), 03 (Persistence), 04 (Memory), 06 (Quality Gates), 07 (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/implementation.ts`

---

## Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/implementation`

**Trigger event:** `paul/pipeline/implementation` (shape defined in Sub-Plan 02)

**Return shape:**
```typescript
{
    branch: string
    filesChanged: {
        path: string
        changeType: "added" | "modified" | "deleted"
    }[]
    gateResults: {
        gate: "typecheck" | "test" | "lint" | "build"
        status: "passed" | "failed"
        output: string
    }[]
    totalCoderAttempts: number
    conditionsAddressed: string[]
}
```

**v2 changes from v1:**
- **Sandbox reset between attempts.** Before each coder attempt: `git checkout -B feat/<name>` to reset the branch to pre-coder state. Fresh coder gets a clean filesystem, not Coder 1's broken files.
- **Structured retry context.** Each retry prompt includes:
  - Which files the previous coder touched (`git diff --name-only`)
  - The previous coder's final text summary
  - The specific gate error output (truncated to 8000 chars per sub-plan 06)
  - Explicit instruction: "Do NOT repeat these patterns: [derived from failure]"
- **Structured output enforcement** — Zod-validate before returning.

## Internal (can change freely)

- Max coder retry count, branch naming, how filesChanged is detected, coder system prompt content.

---

## Steps

1. Create `src/inngest/functions/pipeline/implementation.ts`. Creates feature branch. Retry loop (max 5 attempts): reset branch → spawn fresh coder via `step.invoke(codeFunction)` with full context (approach, analysis, conditions, previous failure) → run `runAllGates(sandbox)` → if all pass, break; if fail, capture failure context for next attempt. On success, detect changed files via `git diff --name-status`. Validates output before returning.
2. `bun typecheck` — must pass.
3. Commit: `feat: add implementation phase orchestrator`
