# Sub-Plan 13: Master Orchestrator + Registry

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Top-level Inngest function driving the entire feature pipeline.

**Architecture:** Single long-lived Inngest function with a phase loop. Invokes each phase orchestrator via `step.invoke()`, fires CTAs between phases, persists all state to PG.

**Tech Stack:** Inngest, Vercel Sandbox, Drizzle ORM

**Dependencies:** 02 (Events), 03 (Persistence), 08 (Analysis), 09 (Approaches), 10 (Judging), 11 (Implementation), 12 (PR Creation)

**Produces:** `src/inngest/functions/pipeline/feature-run.ts`, modified `src/inngest/functions/index.ts`

---

## Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/feature-run`

**Trigger event:** `paul/pipeline/feature-run` (shape defined in Sub-Plan 02)

**Phase sequence:** `analysis → approaches → judging → implementation → pr`

## Internal (can change freely)

- CTA prompts, data threading, sandbox lifecycle, error reporting, DB record updates.

---

## v2 Fixes Applied

These issues were found by the review council and survived grug-brain scrutiny:

1. **`selectedApproach` extraction.** After the approaches CTA returns `selectedId`, the master must look up `approachesOutput.approaches.find(a => a.id === selectedId)` and pass the full approach object to judging. This lookup step was missing in v1.

2. **Single-approach CTA.** If `approaches.length === 1`, send an **approval** CTA ("Proceed with the single approach?"), not a choice CTA (which requires min 2 options and would throw a Zod error).

3. **CTA timeout = fail the run.** If any inter-phase CTA returns null (30-day timeout), call `failFeatureRun(db, runId)` and stop the sandbox. Do not proceed silently.

4. **All DB writes use upsert semantics.** All `createPhaseResult`, `passPhaseResult`, `updateFeatureRunPhase`, `updateFeatureRunMemories` calls must be idempotent for Inngest replay safety.

5. **Memory threading.** After each phase, if the phase created memories (via the `create_memory` tool), update `featureRuns.memories` via `updateFeatureRunMemories`. Read the current memories from the run record before invoking the next phase and pass them in the event payload.

---

## Steps

### Step 1: Create master orchestrator

**Files:** Create `src/inngest/functions/pipeline/feature-run.ts`

1. Receives `paul/pipeline/feature-run` event
2. Creates `featureRuns` row (currentPhase: `analysis`)
3. Creates sandbox via `step.invoke(sandboxCreateFunction, { runtime, github })`
4. Persists sandbox metadata via `createSandboxRecord()`
5. Phase loop — for each phase:
   a. `createPhaseResult()` (upsert)
   b. Read memories from `featureRuns.memories`
   c. `step.invoke(phaseFunction, { runId, sandboxId, prompt, memories, ...previousOutputs })`
   d. `passPhaseResult()` (upsert)
   e. `updateFeatureRunPhase()` (upsert)
   f. Update memories if phase created new ones
   g. Fire inter-phase CTA:
      - After Analysis: approval — "Approve to proceed?"
      - After Approaches: **if 1 approach → approval; if 2+ → choice** — "Which approach?"
      - After Judging: approval — "Begin implementation?"
      - After Implementation: approval — "Create PR?"
   h. If CTA returns null (timeout): `failFeatureRun()`, stop sandbox, return failed
   i. **After Approaches CTA:** look up `selectedApproach` by `selectedId` from CTA response. Validate it exists in approaches array.
   j. If phase fails: `failPhaseResult()`, `failFeatureRun()`, stop sandbox, return failed
6. PR creation: `step.run('create-pr', () => createPR({ branch, githubRepoUrl, prompt, analysisOutput, approachOutput, implOutput }))`
7. `completeFeatureRun()`
8. Stop sandbox
9. Return `{ status: 'completed', prUrl }`

### Step 2: Update function registry

**Files:** Modify `src/inngest/functions/index.ts`

Register:
- `featureRunFunction` from `pipeline/feature-run`
- `analysisFunction` from `pipeline/analysis`
- `approachesFunction` from `pipeline/approaches`
- `judgingFunction` from `pipeline/judging`
- `implementationFunction` from `pipeline/implementation`

### Step 3: Verify

`bun typecheck` — must pass. `bun lint:all` — must pass.

### Step 4: Commit

```bash
git add src/inngest/functions/pipeline/feature-run.ts src/inngest/functions/index.ts
git commit -m "feat: add master feature-run orchestrator and register pipeline functions"
```
