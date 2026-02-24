# Feature Development Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-agent pipeline that autonomously analyzes codebases, generates approaches, evaluates them through specialist judges, implements the approved approach, and creates a PR — with human-in-the-loop CTAs at every phase boundary.

**Architecture:** Single master Inngest function drives a strict sequential phase pipeline (Analysis → Approaches → Judging → Implementation → PR). Each phase is a separate Inngest function invoked via `step.invoke()`. Full state persistence to PostgreSQL with every SDK field captured.

**Tech Stack:** Inngest (orchestration), Vercel AI SDK (LLM), Vercel Sandbox (code execution), Drizzle ORM (PostgreSQL), Zod (validation), Bun (runtime/test)

**Design Doc:** `docs/plans/2026-02-23-feature-pipeline-design.md`

---

## Implementation Phase 1: Database Schema

**Dependency:** None. This is the foundation.

### Task 1: Drop the core schema and create agent schema file

**Files:**
- Delete: `src/db/schemas/core.ts`
- Create: `src/db/schemas/agent.ts`
- Modify: `src/db/index.ts`
- Modify: `drizzle.config.ts`

**Step 1: Create the agent schema with all enums and tables**

Create `src/db/schemas/agent.ts` with all 10 tables from the design doc. Use Drizzle's `pgSchema("agent")` for namespace isolation.

Enums to define:
- `sandboxStatus`: `pending`, `running`, `stopping`, `stopped`, `failed`, `aborted`, `snapshotting`
- `sandboxSourceType`: `git`, `tarball`, `snapshot`, `empty`
- `snapshotStatus`: `created`, `deleted`, `failed`
- `featurePhase`: `analysis`, `approaches`, `judging`, `implementation`, `pr`, `completed`, `failed`
- `phaseStatus`: `running`, `passed`, `failed`
- `agentType`: `orchestrator`, `explorer`, `coder`, `judge`, `meta_judge`
- `finishReason`: `stop`, `length`, `content-filter`, `tool-calls`, `error`, `other`
- `toolOutputType`: `text`, `json`, `execution-denied`, `error-text`, `error-json`, `content`
- `memoryKind`: `insight`, `failure`, `decision`, `constraint`
- `ctaKind`: `approval`, `text`, `choice`

Tables (in dependency order):
1. `sandboxes` — full Vercel Sandbox metadata
2. `sandboxSnapshots` — point-in-time sandbox snapshots
3. `featureRuns` — top-level feature request entity
4. `phaseResults` — one per phase execution
5. `agentInvocations` — every LLM call with full detail
6. `agentSteps` — each step within a multi-step invocation
7. `toolCalls` — every tool call with full input/output
8. `memoryRecords` — LLM-generated summaries
9. `ctaEvents` — CTA request/response pairs

All columns exactly as specified in the design doc. Every timestamp uses `{ mode: "date", withTimezone: true }`. UUIDs use `.defaultRandom()`. Foreign keys use `onDelete: "cascade"` where parent deletion should cascade.

Add indexes on:
- `featureRuns`: `currentPhase`
- `phaseResults`: `(runId, phase)`
- `agentInvocations`: `(phaseResultId, agentType)`
- `agentSteps`: `(invocationId, stepNumber)`
- `toolCalls`: `(stepId)`, `(invocationId)`
- `memoryRecords`: `(runId, phase)`
- `ctaEvents`: `(runId)`

**Step 2: Update drizzle.config.ts**

Change schema from `"./src/db/schemas/core.ts"` to `"./src/db/schemas/agent.ts"`. Change schemaFilter from `["core"]` to `["agent"]`.

**Step 3: Update src/db/index.ts**

Change the import from `* as core from "@/db/schemas/core"` to `* as agent from "@/db/schemas/agent"`. Update the schema spread.

**Step 4: Remove core.ts**

Delete `src/db/schemas/core.ts`. Remove any remaining references to core schema tables (grep the codebase).

**Step 5: Verify typecheck passes**

Run: `bun typecheck`
Expected: PASS (no references to removed core tables outside of db layer)

**Step 6: Commit**

```bash
git add src/db/schemas/agent.ts src/db/index.ts drizzle.config.ts
git rm src/db/schemas/core.ts
git commit -m "feat: replace core schema with agent schema for feature pipeline"
```

**Step 7: Generate and review migration**

Run: `bun db:generate`

This is a HUMAN-REVIEWED step. Inspect the generated migration SQL to verify:
- All 10 tables are created in the `agent` schema
- All enums are created
- All foreign keys and indexes are present
- The old `core` schema tables are dropped

**Step 8: Apply migration**

Run: `bun db:push`

---

## Implementation Phase 2: Inngest Events & Persistence Layer

**Dependency:** Phase 1 (schema must exist).

### Task 2: Add feature pipeline Inngest events

**Files:**
- Modify: `src/inngest/index.ts`

**Step 1: Add new event schemas**

Add these events to the `schema` object in `src/inngest/index.ts`:

```typescript
"paul/pipeline/feature-run": z.object({
    prompt: z.string().min(1),
    githubRepoUrl: z.string().url(),
    githubBranch: z.string().min(1),
    runtime: z.enum(["node24", "node22", "python3.13"]).default("node24")
}),
"paul/pipeline/analysis": z.object({
    runId: z.string().uuid(),
    sandboxId: z.string().min(1),
    prompt: z.string().min(1),
    githubRepoUrl: z.string().url(),
    githubBranch: z.string().min(1),
    memories: z.array(z.object({
        phase: z.string(),
        kind: z.string(),
        content: z.string()
    }))
}),
"paul/pipeline/approaches": z.object({
    runId: z.string().uuid(),
    sandboxId: z.string().min(1),
    prompt: z.string().min(1),
    githubRepoUrl: z.string().url(),
    githubBranch: z.string().min(1),
    analysisOutput: z.unknown(),
    memories: z.array(z.object({
        phase: z.string(),
        kind: z.string(),
        content: z.string()
    }))
}),
"paul/pipeline/judging": z.object({
    runId: z.string().uuid(),
    sandboxId: z.string().min(1),
    prompt: z.string().min(1),
    githubRepoUrl: z.string().url(),
    githubBranch: z.string().min(1),
    selectedApproach: z.unknown(),
    analysisOutput: z.unknown(),
    memories: z.array(z.object({
        phase: z.string(),
        kind: z.string(),
        content: z.string()
    }))
}),
"paul/pipeline/implementation": z.object({
    runId: z.string().uuid(),
    sandboxId: z.string().min(1),
    prompt: z.string().min(1),
    githubRepoUrl: z.string().url(),
    githubBranch: z.string().min(1),
    selectedApproach: z.unknown(),
    analysisOutput: z.unknown(),
    judgingOutput: z.unknown(),
    memories: z.array(z.object({
        phase: z.string(),
        kind: z.string(),
        content: z.string()
    }))
})
```

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/inngest/index.ts
git commit -m "feat: add feature pipeline Inngest event schemas"
```

### Task 3: Create persistence layer

**Files:**
- Create: `src/lib/pipeline/persistence.ts`

**Step 1: Create the persistence module**

This module wraps Drizzle inserts/updates for all agent-schema tables. Every function takes a `db` handle (or transaction) and the data to persist. Functions:

- `createFeatureRun(db, data)` → inserts into `featureRuns`, returns `{ id }`
- `updateFeatureRunPhase(db, runId, phase)` → updates `currentPhase`
- `completeFeatureRun(db, runId)` → sets `completedAt` and `currentPhase = 'completed'`
- `failFeatureRun(db, runId)` → sets `completedAt` and `currentPhase = 'failed'`
- `createSandboxRecord(db, data)` → inserts into `sandboxes`
- `updateSandboxStatus(db, sandboxId, status)` → updates sandbox status
- `createSnapshotRecord(db, data)` → inserts into `sandboxSnapshots`
- `createPhaseResult(db, data)` → inserts into `phaseResults` with status `running`, returns `{ id }`
- `passPhaseResult(db, phaseResultId, output)` → sets status `passed`, output, completedAt
- `failPhaseResult(db, phaseResultId)` → sets status `failed`, completedAt
- `createAgentInvocation(db, data)` → inserts into `agentInvocations`, returns `{ id }`
- `completeAgentInvocation(db, invocationId, data)` → updates with all output fields, usage, completedAt
- `createAgentStep(db, data)` → inserts into `agentSteps`
- `createToolCall(db, data)` → inserts into `toolCalls`
- `createMemoryRecord(db, data)` → inserts into `memoryRecords`
- `getMemoryRecords(db, runId)` → selects all memory records for a run, ordered by createdAt
- `createCtaEvent(db, data)` → inserts into `ctaEvents`
- `completeCtaEvent(db, ctaId, responseData)` → updates with response fields, respondedAt
- `timeoutCtaEvent(db, ctaId)` → sets timedOut = true

Each function uses explicit column selection (no `SELECT *`). Each function returns only `{ id }` from inserts.

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/pipeline/persistence.ts
git commit -m "feat: add pipeline persistence layer for all agent schema tables"
```

### Task 4: Create memory record tool and injection

**Files:**
- Create: `src/lib/agent/memory.ts`

**Step 1: Create the memory tool and injection utilities**

This module provides:

1. `createMemoryTool` — AI SDK tool definition (no execute function, dispatched by orchestrator loop):
```typescript
tool({
    description: "Create a memory record...",
    inputSchema: z.object({
        kind: z.enum(["insight", "failure", "decision", "constraint"]),
        content: z.string().min(1)
    })
})
```

2. `formatMemoriesForPrompt(memories)` — Takes an array of memory records from the DB and formats them as a string block for system prompt injection:
```
## Memory Records from Previous Phases

### Insights
- [analysis] The auth middleware chains through 3 layers...

### Decisions
- [approaches] Chose approach B because...
```

Groups by kind, prefixes each with `[phase]`, returns empty string if no memories.

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/agent/memory.ts
git commit -m "feat: add memory record tool and prompt injection utility"
```

---

## Implementation Phase 3: Judge Agents

**Dependency:** Phase 1 (enums for agentType).

### Task 5: Create specialist judge agent configs

**Files:**
- Create: `src/lib/agent/judges/security.ts`
- Create: `src/lib/agent/judges/bug-hunter.ts`
- Create: `src/lib/agent/judges/compatibility.ts`
- Create: `src/lib/agent/judges/performance.ts`
- Create: `src/lib/agent/judges/quality.ts`
- Create: `src/lib/agent/judges/meta.ts`

**Step 1: Create each judge agent config**

Each judge follows the same pattern as `src/lib/agent/explorer.ts` — a module exporting `model`, `MAX_STEPS`, `tools`, and a `buildInstructions(context)` function.

All judges use:
- Model: `anthropic("claude-sonnet-4-6")` (same as orchestrator — judges need good reasoning)
- MAX_STEPS: 20
- Tools: `readTool`, `globTool`, `grepTool` (read-only, same as explorer)

Each judge has a specialized system prompt that instructs it to:
- Evaluate the approach against its specific criterion
- Return a structured verdict (pass/concern/fail) with findings
- Produce severity-tagged findings (critical/major/minor)

The meta-judge is different:
- Receives all judge verdicts as input (not via tools)
- Synthesizes into overall verdict
- No sandbox tools needed — pure reasoning
- Tools: none (just `create_memory`)

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/agent/judges/
git commit -m "feat: add specialist judge agent configs (security, bugs, compat, perf, quality, meta)"
```

---

## Implementation Phase 4: Quality Gate Runners

**Dependency:** Phase 1 (schema), existing sandbox/bash infrastructure.

### Task 6: Create quality gate runner utilities

**Files:**
- Create: `src/lib/pipeline/quality-gates.ts`

**Step 1: Create the quality gate module**

Functions that connect to a sandbox and run quality checks:

- `runTypecheck(sandbox)` → runs `tsc --noEmit` via sandbox bash, returns `{ gate: 'typecheck', status: 'passed' | 'failed', output: string }`
- `runLint(sandbox)` → runs `bun lint` via sandbox bash
- `runTests(sandbox)` → runs `bun test` via sandbox bash
- `runBuild(sandbox)` → runs `bun build` via sandbox bash
- `runAllGates(sandbox)` → runs all four sequentially, returns array of results. Stops on first failure (no point linting if typecheck fails).

Each function:
1. Executes the command via `sandbox.runCommand()`
2. Captures stdout, stderr, exitCode
3. Returns structured result with the full output
4. Does NOT throw on failure — returns `status: 'failed'` with the error output

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/pipeline/quality-gates.ts
git commit -m "feat: add quality gate runners for typecheck, lint, test, build"
```

---

## Implementation Phase 5: Phase Orchestrator Functions

**Dependency:** Phases 1-4 (schema, events, persistence, judges, gates).

### Task 7: Create shared phase orchestrator utilities

**Files:**
- Create: `src/lib/pipeline/phase-loop.ts`

**Step 1: Create shared utilities for phase orchestrators**

Extract the patterns from `orchestrate.ts` that all phase orchestrators share:

- `dispatchSubagent(step, targetFunction, input, stepIndex, toolCallId, logger)` → wraps `step.invoke()`, returns `ToolResultPart`
- `dispatchHumanFeedback(step, input, stepIndex, runId, logger)` → wraps `step.sendEvent()` + `step.waitForEvent()`, returns `ToolResultPart`
- `dispatchMemoryCreation(step, input, runId, phaseResultId, invocationId, phase, db)` → persists memory record to DB, returns `ToolResultPart`
- `runAgentLoop(config)` → the generic agent loop pattern:
  - Takes: `{ model, system, messages, tools, maxSteps, step, logger, onToolCall }`
  - Runs the think → dispatch → inject loop
  - Returns: `{ text, stepCount, steps, toolCalls, usage }`
  - The `onToolCall` callback handles tool-specific dispatch (spawn, CTA, memory)

This is the DRY extraction of the loop in `orchestrate.ts` lines 156-232, parameterized for reuse across all phase orchestrators.

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/pipeline/phase-loop.ts
git commit -m "feat: add shared phase orchestrator loop utilities"
```

### Task 8: Create Analysis phase orchestrator

**Files:**
- Create: `src/inngest/functions/pipeline/analysis.ts`

**Step 1: Create the analysis Inngest function**

This function:
1. Receives `paul/pipeline/analysis` event
2. Connects to sandbox via `connectSandbox()`
3. Builds system prompt: analysis-specific instructions + memory records + feature request
4. Runs the agent loop with tools: `spawn_subagent` (explorer only), `request_human_feedback`, `create_memory`
5. The orchestrator explores the codebase, identifies affected systems, constraints, risks
6. Returns the analysis output (affectedSystems, architecturalConstraints, risks, codebaseMap, feasibilityAssessment)

System prompt instructs the orchestrator to:
- Break the codebase into logical areas and spawn explorers for each
- Identify which files, modules, and systems the feature will touch
- List architectural constraints and risks
- Produce a feasibility assessment
- Create memory records for key findings
- Request CTA if the feature request is ambiguous

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/inngest/functions/pipeline/analysis.ts
git commit -m "feat: add analysis phase orchestrator"
```

### Task 9: Create Approaches phase orchestrator

**Files:**
- Create: `src/inngest/functions/pipeline/approaches.ts`

**Step 1: Create the approaches Inngest function**

This function:
1. Receives `paul/pipeline/approaches` event (includes analysisOutput)
2. Connects to sandbox
3. Builds system prompt: approach generation instructions + analysis context + memories
4. Runs the agent loop with tools: `spawn_subagent` (explorer only), `request_human_feedback`, `create_memory`
5. Generates 2+ approaches (or 1 with justification), each with title, summary, rationale, implementation plan, affected files, trade-offs, validated assumptions
6. Returns the approaches output

System prompt instructs the orchestrator to:
- Review the analysis output for context
- Generate distinct approaches (minimum 2 unless justified)
- For each approach, spawn explorers to validate key technical assumptions
- Steelman each approach — make the strongest case
- If generating only 1 approach, explain why alternatives aren't worth exploring
- Create memory records for key decisions
- Fire CTA if uncertain about direction

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/inngest/functions/pipeline/approaches.ts
git commit -m "feat: add approaches phase orchestrator"
```

### Task 10: Create Judging phase orchestrator

**Files:**
- Create: `src/inngest/functions/pipeline/judging.ts`
- Create: `src/inngest/functions/pipeline/judge-runner.ts`

**Step 1: Create the judge runner Inngest function**

A generic Inngest function that runs a single judge agent. Takes the judge's system prompt, tools, and context. Returns the judge's verdict. This is invoked by the judging orchestrator via `step.invoke()` for each specialist.

Event: `paul/pipeline/judge` (add to Inngest events)
```typescript
z.object({
    runId: z.string().uuid(),
    sandboxId: z.string().min(1),
    criterion: z.string().min(1),
    systemPrompt: z.string().min(1),
    approachContext: z.unknown()
})
```

**Step 2: Create the judging orchestrator Inngest function**

This function:
1. Receives `paul/pipeline/judging` event (includes selectedApproach, analysisOutput)
2. Connects to sandbox
3. Spawns 5 specialist judge agents in parallel via `step.invoke()`:
   - Security Reviewer
   - Bug Hunter
   - Backwards Compatibility Checker
   - Performance Analyst
   - Code Quality Reviewer
4. Collects all 5 verdicts
5. Runs meta-judge (inline, not a subagent) to synthesize verdicts into overall verdict
6. If any judge has `fail` verdict, overall is `rejected`
7. If all pass with only minor concerns, overall is `approved`
8. If major concerns but no failures, overall is `approved_with_conditions`
9. Returns the judging output

**Step 3: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/inngest/functions/pipeline/judging.ts src/inngest/functions/pipeline/judge-runner.ts
git commit -m "feat: add judging phase orchestrator with specialist judge dispatch"
```

### Task 11: Create Implementation phase orchestrator

**Files:**
- Create: `src/inngest/functions/pipeline/implementation.ts`

**Step 1: Create the implementation Inngest function**

This function:
1. Receives `paul/pipeline/implementation` event (includes selectedApproach, analysisOutput, judgingOutput)
2. Connects to sandbox
3. Creates a feature branch in the sandbox (`git checkout -b feat/<feature-name>`)
4. Orchestrator-managed retry loop (max 5 attempts):
   a. Spawn a fresh coder agent with full context (approach, analysis, judging conditions, previous failure output if retry)
   b. Coder writes code in the sandbox
   c. Run quality gates: typecheck → lint → test → build
   d. If all gates pass: break, success
   e. If gate fails: capture failure output, continue loop with next fresh coder
5. If all 5 attempts fail, the phase fails
6. Returns implementation output (branch, filesChanged, gateResults)

System prompt for each coder attempt includes:
- The selected approach's implementation plan
- The analysis codebase map
- Any judging conditions to address
- Previous attempt's failure output (if retry): "The previous attempt failed because: [gate output]. Fix these issues."

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/inngest/functions/pipeline/implementation.ts
git commit -m "feat: add implementation phase orchestrator with coder retry loop"
```

---

## Implementation Phase 6: Master Orchestrator & PR Creation

**Dependency:** Phase 5 (all phase orchestrators).

### Task 12: Create PR creation utility

**Files:**
- Create: `src/lib/pipeline/pr-creation.ts`

**Step 1: Create the PR creation module**

Deterministic function (no LLM) that:
1. Takes: `sandboxId`, `branch`, `githubRepoUrl`, `prompt`, `analysisOutput`, `approachOutput`, `implOutput`
2. Pushes the feature branch to GitHub via sandbox bash (`git push origin <branch>`)
   - This is the ONLY place git push is allowed — the sandbox bash ban in `fs/operations.ts` stays for agent tool calls
   - PR creation runs via `step.run()` in the master orchestrator, not via agent tools
3. Creates a PR via GitHub CLI (`gh pr create`) or GitHub API
4. Generates PR title from the feature prompt
5. Generates PR body with summary of analysis, approach, and implementation
6. Returns `{ prUrl, prNumber, title, body }`

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/pipeline/pr-creation.ts
git commit -m "feat: add PR creation utility for feature pipeline"
```

### Task 13: Create master feature-run orchestrator

**Files:**
- Create: `src/inngest/functions/pipeline/feature-run.ts`

**Step 1: Create the master Inngest function**

This is the top-level entry point. It:

1. Receives `paul/pipeline/feature-run` event
2. Creates a `featureRuns` row in PG (status: analysis)
3. Creates a sandbox via `step.invoke(sandboxCreateFunction, { runtime, github })`
4. Persists sandbox metadata to `sandboxes` table
5. Runs the phase loop:

```
for each phase in [analysis, approaches, judging, implementation]:
    a. Create phase_result row (status = 'running')
    b. Fetch memory records from DB
    c. step.invoke(phaseFunction, { runId, sandboxId, prompt, memories, ...previousOutputs })
    d. Persist phase output to phase_result (status = 'passed')
    e. Update feature_runs.currentPhase to next phase

    If phase returns failure:
        failPhaseResult(phaseResultId)
        failFeatureRun(runId)
        Stop sandbox
        Return { status: 'failed', failedPhase: phase }
```

6. After implementation passes, run PR creation:
   a. Create phase_result for 'pr' phase
   b. `step.run('create-pr', () => createPR(...))`
   c. Pass phase result
   d. Update feature_runs to 'completed'

7. Stop the sandbox
8. Return `{ status: 'completed', prUrl }`

Between phases, the master function fires a CTA asking the user to approve before proceeding. This is built into the phase loop — after each `step.invoke()` returns successfully, the master fires a CTA:
- After Analysis: "Here's what I found about your codebase. Approve to proceed to approach generation?"
- After Approaches: "Here are N approaches. Which one should I pursue?" (choice CTA)
- After Judging: "The approach passed review. Approve to begin implementation?"
- After Implementation: "Implementation complete, all gates pass. Approve to create PR?"

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/inngest/functions/pipeline/feature-run.ts
git commit -m "feat: add master feature-run orchestrator with phase loop"
```

### Task 14: Update Inngest function registry

**Files:**
- Modify: `src/inngest/functions/index.ts`

**Step 1: Register all new functions**

Add imports and exports for:
- `featureRunFunction` from `pipeline/feature-run`
- `analysisFunction` from `pipeline/analysis`
- `approachesFunction` from `pipeline/approaches`
- `judgingFunction` from `pipeline/judging`
- `judgeRunnerFunction` from `pipeline/judge-runner`
- `implementationFunction` from `pipeline/implementation`

Add all to the exported `functions` array.

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/inngest/functions/index.ts
git commit -m "feat: register all pipeline functions in Inngest function registry"
```

---

## Implementation Phase 7: Integration Wiring

### Task 15: Add judge event to Inngest schema

**Files:**
- Modify: `src/inngest/index.ts`

**Step 1: Add the judge runner event**

```typescript
"paul/pipeline/judge": z.object({
    runId: z.string().uuid(),
    sandboxId: z.string().min(1),
    criterion: z.string().min(1),
    systemPrompt: z.string().min(1),
    approachContext: z.unknown()
})
```

**Step 2: Verify typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/inngest/index.ts
git commit -m "feat: add judge runner event to Inngest schema"
```

### Task 16: End-to-end typecheck and lint

**Step 1: Run full typecheck**

Run: `bun typecheck`
Expected: PASS — all files compile cleanly

**Step 2: Run full lint**

Run: `bun lint:all`
Expected: PASS — all files pass Biome + GritQL + super-lint

**Step 3: Fix any issues and commit**

```bash
git add -A
git commit -m "fix: resolve any typecheck or lint issues from pipeline integration"
```

---

## File Summary

### New Files (15)

| File | Purpose |
|------|---------|
| `src/db/schemas/agent.ts` | All 10 pipeline tables + enums |
| `src/lib/pipeline/persistence.ts` | DB persistence helpers |
| `src/lib/pipeline/quality-gates.ts` | Sandbox quality gate runners |
| `src/lib/pipeline/phase-loop.ts` | Shared agent loop utilities |
| `src/lib/pipeline/pr-creation.ts` | PR creation utility |
| `src/lib/agent/memory.ts` | Memory tool + prompt injection |
| `src/lib/agent/judges/security.ts` | Security reviewer judge config |
| `src/lib/agent/judges/bug-hunter.ts` | Bug hunter judge config |
| `src/lib/agent/judges/compatibility.ts` | Compatibility checker judge config |
| `src/lib/agent/judges/performance.ts` | Performance analyst judge config |
| `src/lib/agent/judges/quality.ts` | Code quality reviewer judge config |
| `src/lib/agent/judges/meta.ts` | Meta-judge synthesizer config |
| `src/inngest/functions/pipeline/feature-run.ts` | Master orchestrator |
| `src/inngest/functions/pipeline/analysis.ts` | Analysis phase |
| `src/inngest/functions/pipeline/approaches.ts` | Approaches phase |
| `src/inngest/functions/pipeline/judging.ts` | Judging phase |
| `src/inngest/functions/pipeline/judge-runner.ts` | Individual judge runner |
| `src/inngest/functions/pipeline/implementation.ts` | Implementation phase |

### Modified Files (3)

| File | Change |
|------|--------|
| `src/inngest/index.ts` | Add pipeline event schemas |
| `src/inngest/functions/index.ts` | Register pipeline functions |
| `src/db/index.ts` | Switch from core to agent schema |
| `drizzle.config.ts` | Point to agent schema |

### Deleted Files (1)

| File | Reason |
|------|--------|
| `src/db/schemas/core.ts` | Replaced by agent schema |
