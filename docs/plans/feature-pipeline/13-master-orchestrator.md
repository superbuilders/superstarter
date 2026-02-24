# Sub-Plan 13: Master Orchestrator + Registry

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** The top-level Inngest function that drives the entire feature pipeline — creates the run, sandbox, sequences phases, fires inter-phase CTAs, and handles failure.

**Architecture:** Single long-lived Inngest function with a phase loop. Invokes each phase orchestrator via `step.invoke()`, fires CTAs between phases, persists all state to PG.

**Tech Stack:** Inngest, Vercel Sandbox, Drizzle ORM

**Dependencies:** 02 (Events), 03 (Persistence), 08 (Analysis), 09 (Approaches), 10 (Judging), 11 (Implementation), 12 (PR Creation)

**Produces:** `src/inngest/functions/pipeline/feature-run.ts`, modified `src/inngest/functions/index.ts`

---

## Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/feature-run`

**Trigger event:** `paul/pipeline/feature-run` (shape defined in Sub-Plan 02)

**Phase sequence:** `analysis → approaches → judging → implementation → pr`

This is the only place that defines the phase ordering. All phase orchestrators are independent — the master decides when to invoke them and what data to pass.

## Internal (can change freely)

- CTA prompts between phases (what messages the user sees)
- How phase outputs are threaded to the next phase
- Sandbox lifecycle management (when to create, when to stop)
- Error handling and failure reporting
- How the feature_run DB record is updated

---

## Steps

### Step 1: Create master orchestrator

**Files:** Create `src/inngest/functions/pipeline/feature-run.ts`

Inngest function (`paul/pipeline/feature-run`) that:

1. Receives `paul/pipeline/feature-run` event
2. Creates a `featureRuns` row in PG via `createFeatureRun()` (currentPhase: `analysis`)
3. Creates a sandbox via `step.invoke(sandboxCreateFunction, { runtime, github })`
4. Persists sandbox metadata to `sandboxes` table via `createSandboxRecord()`
5. Phase loop — for each phase in `[analysis, approaches, judging, implementation]`:
   a. `createPhaseResult(db, { runId, phase, status: 'running' })`
   b. `getMemoryRecords(db, runId)` → fetch all memories
   c. `step.invoke(phaseFunction, { runId, sandboxId, prompt, memories, ...previousOutputs })`
   d. `passPhaseResult(db, phaseResultId, phaseOutput)`
   e. `updateFeatureRunPhase(db, runId, nextPhase)`
   f. Fire inter-phase CTA:
      - After Analysis: approval CTA — "Approve to proceed to approach generation?"
      - After Approaches: choice CTA — "Which approach should I pursue?"
      - After Judging: approval CTA — "Approach passed review. Begin implementation?"
      - After Implementation: approval CTA — "All gates pass. Create PR?"
   g. If phase fails: `failPhaseResult()`, `failFeatureRun()`, stop sandbox, return `{ status: 'failed' }`

6. After implementation passes, run PR creation:
   a. `createPhaseResult(db, { runId, phase: 'pr', status: 'running' })`
   b. `step.run('create-pr', () => createPR(sandbox, { branch, githubRepoUrl, prompt, analysisOutput, approachOutput, implOutput }))`
   c. `passPhaseResult(db, phaseResultId, prOutput)`
   d. `completeFeatureRun(db, runId)`

7. Stop the sandbox via `step.invoke(sandboxStopFunction, { sandboxId })`
8. Return `{ status: 'completed', prUrl }`

### Step 2: Update function registry

**Files:** Modify `src/inngest/functions/index.ts`

Register all new pipeline functions:
- `featureRunFunction` from `pipeline/feature-run`
- `analysisFunction` from `pipeline/analysis`
- `approachesFunction` from `pipeline/approaches`
- `judgingFunction` from `pipeline/judging`
- `judgeRunnerFunction` from `pipeline/judge-runner`
- `implementationFunction` from `pipeline/implementation`

### Step 3: Verify

Run: `bun typecheck`
Expected: PASS

Run: `bun lint:all`
Expected: PASS

### Step 4: Commit

```bash
git add src/inngest/functions/pipeline/feature-run.ts src/inngest/functions/index.ts
git commit -m "feat: add master feature-run orchestrator and register pipeline functions"
```
