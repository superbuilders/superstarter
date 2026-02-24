# Feature Pipeline — Sub-Plan DAG

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement each sub-plan.

**Design Doc:** `docs/plans/2026-02-23-feature-pipeline-design.md`

## DAG Overview

```
A: Schema ─────────┐
                    ├──▶ C: Persistence ─────┐
B: Event Contract ──┤                        │
                    │                        ├──▶ H: Analysis Orchestrator ────┐
D: Memory Tool ─────┤                        │                                │
                    │                        ├──▶ I: Approaches Orchestrator ──┤
G: Phase Loop ──────┤                        │                                │
                    │                        ├──▶ J: Judging Orchestrator ─────┼──▶ M: Master Orchestrator
E: Judge Configs ───┘──(only J needs this)   │                                │
                                             ├──▶ K: Implementation Orch. ────┤
F: Quality Gates ───────(only K needs this)──┘                                │
                                                                              │
L: PR Creation ───────────────────────────────────────────────────────────────┘
```

**Leaf nodes (no dependencies, can be built in any order):**
A, B, D, E, F, G, L

**Second tier (need leaf nodes):**
C (needs A)

**Third tier (need C + leaf nodes):**
H, I, J, K (can all be built in parallel)

**Terminal node:**
M (needs H, I, J, K, L, C)

---

## How to Read Each Sub-Plan

Each sub-plan has:
- **Dependencies** — which sub-plans must be done first
- **Produces** — what files/modules this creates
- **Contract** — the non-negotiable interface this sub-plan establishes. Changing these breaks downstream sub-plans.
- **Internal** — what CAN be changed freely without affecting other sub-plans
- **Steps** — implementation steps

---

## Sub-Plan A: Database Schema

**Dependencies:** None

**Produces:** `src/db/schemas/agent.ts`, updated `drizzle.config.ts`, updated `src/db/index.ts`

### Contract (non-negotiable)

These table and column names are referenced by every downstream sub-plan. Renaming any of them requires updating all consumers.

**Enum values:**

| Enum | Values |
|------|--------|
| `sandboxStatus` | `pending`, `running`, `stopping`, `stopped`, `failed`, `aborted`, `snapshotting` |
| `sandboxSourceType` | `git`, `tarball`, `snapshot`, `empty` |
| `snapshotStatus` | `created`, `deleted`, `failed` |
| `featurePhase` | `analysis`, `approaches`, `judging`, `implementation`, `pr`, `completed`, `failed` |
| `phaseStatus` | `running`, `passed`, `failed` |
| `agentType` | `orchestrator`, `explorer`, `coder`, `judge`, `meta_judge` |
| `finishReason` | `stop`, `length`, `content-filter`, `tool-calls`, `error`, `other` |
| `toolOutputType` | `text`, `json`, `execution-denied`, `error-text`, `error-json`, `content` |
| `memoryKind` | `insight`, `failure`, `decision`, `constraint` |
| `ctaKind` | `approval`, `text`, `choice` |

**Table names:** `sandboxes`, `sandboxSnapshots`, `featureRuns`, `phaseResults`, `agentInvocations`, `agentSteps`, `toolCalls`, `memoryRecords`, `ctaEvents`

**Schema namespace:** `agent` (via `pgSchema("agent")`)

All column names and types as specified in the design doc section "Data Model."

### Internal (can change freely)

- Index strategy (which indexes, composite vs single)
- Cascade behavior on FKs
- Default values
- Column ordering within tables

### Steps

1. Create `src/db/schemas/agent.ts` with all enums and 9 tables, columns per design doc
2. Update `drizzle.config.ts`: schema → `"./src/db/schemas/agent.ts"`, schemaFilter → `["agent"]`
3. Update `src/db/index.ts`: import `* as agent` instead of `* as core`
4. Delete `src/db/schemas/core.ts`, grep for stale references
5. `bun typecheck` — must pass
6. Commit: `feat: replace core schema with agent schema`
7. `bun db:generate` — HUMAN REVIEW the migration SQL
8. `bun db:push` — apply to database

---

## Sub-Plan B: Event Contract

**Dependencies:** None

**Produces:** Modified `src/inngest/index.ts` with new event schemas

### Contract (non-negotiable)

These event names and payload shapes are the interface between the master orchestrator and each phase. Every phase orchestrator and the master depend on these exact names and shapes.

| Event Name | Payload Fields |
|------------|---------------|
| `paul/pipeline/feature-run` | `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `runtime: "node24" \| "node22" \| "python3.13"` |
| `paul/pipeline/analysis` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `memories: MemoryRecord[]` |
| `paul/pipeline/approaches` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `analysisOutput: unknown`, `memories: MemoryRecord[]` |
| `paul/pipeline/judging` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `selectedApproach: unknown`, `analysisOutput: unknown`, `memories: MemoryRecord[]` |
| `paul/pipeline/implementation` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `selectedApproach: unknown`, `analysisOutput: unknown`, `judgingOutput: unknown`, `memories: MemoryRecord[]` |
| `paul/pipeline/judge` | `runId: uuid`, `sandboxId: string`, `criterion: string`, `systemPrompt: string`, `approachContext: unknown` |

**Shared type:**
```typescript
MemoryRecord = { phase: string, kind: string, content: string }
```

### Internal (can change freely)

- Zod refinements (min lengths, regex patterns)
- Default values
- Whether fields use `.url()` vs `.string()`
- Additional optional fields (adding fields is safe, removing/renaming is not)

### Steps

1. Add all 6 event schemas to `src/inngest/index.ts` schema object
2. `bun typecheck` — must pass
3. Commit: `feat: add feature pipeline event schemas`

---

## Sub-Plan C: Persistence Layer

**Dependencies:** A (Schema)

**Produces:** `src/lib/pipeline/persistence.ts`

### Contract (non-negotiable)

These function signatures are called by every phase orchestrator and the master. Renaming functions or changing parameter shapes breaks all consumers.

```typescript
// Feature Runs
createFeatureRun(db, data) → { id: string }
updateFeatureRunPhase(db, runId, phase) → void
completeFeatureRun(db, runId) → void
failFeatureRun(db, runId) → void

// Sandboxes
createSandboxRecord(db, data) → void
updateSandboxStatus(db, sandboxId, status) → void
createSnapshotRecord(db, data) → void

// Phase Results
createPhaseResult(db, data) → { id: string }
passPhaseResult(db, phaseResultId, output) → void
failPhaseResult(db, phaseResultId) → void

// Agent Invocations
createAgentInvocation(db, data) → { id: string }
completeAgentInvocation(db, invocationId, data) → void

// Agent Steps & Tool Calls
createAgentStep(db, data) → void
createToolCall(db, data) → void

// Memory Records
createMemoryRecord(db, data) → void
getMemoryRecords(db, runId) → { phase: string, kind: string, content: string, createdAt: Date }[]

// CTA Events
createCtaEvent(db, data) → void
completeCtaEvent(db, ctaId, responseData) → void
timeoutCtaEvent(db, ctaId) → void
```

### Internal (can change freely)

- Internal query implementation (raw SQL vs query builder)
- Which columns are selected in reads (as long as return type is met)
- Transaction handling strategy
- Error handling within functions (as long as they throw on failure)

### Steps

1. Create `src/lib/pipeline/persistence.ts` with all functions above
2. Each insert function uses explicit column selection (no `returning()` without columns)
3. Each read function uses explicit `.select({...})` (no implicit `SELECT *`)
4. `bun typecheck` — must pass
5. Commit: `feat: add pipeline persistence layer`

---

## Sub-Plan D: Memory Tool

**Dependencies:** None

**Produces:** `src/lib/agent/memory.ts`

### Contract (non-negotiable)

The tool name and input schema are what phase orchestrators dispatch against. The prompt format is what all phase system prompts expect.

**Tool name:** `create_memory`

**Tool input schema:**
```typescript
{
    kind: "insight" | "failure" | "decision" | "constraint",
    content: string
}
```

**`formatMemoriesForPrompt(memories)` signature:**
- Input: `{ phase: string, kind: string, content: string }[]`
- Output: `string` (formatted markdown block, or empty string if no memories)

### Internal (can change freely)

- Tool description text
- Markdown formatting style (headers, bullets, ordering)
- How memories are grouped/sorted

### Steps

1. Create `src/lib/agent/memory.ts` with `createMemoryTool` (AI SDK tool, no execute function) and `formatMemoriesForPrompt`
2. `bun typecheck` — must pass
3. Commit: `feat: add memory record tool and prompt injection`

---

## Sub-Plan E: Judge Agent Configs

**Dependencies:** None

**Produces:** `src/lib/agent/judges/{security,bug-hunter,compatibility,performance,quality,meta}.ts`

### Contract (non-negotiable)

**Judge output schema** — every judge must return this shape (the judging orchestrator parses it):

```typescript
{
    criterion: string
    verdict: "pass" | "concern" | "fail"
    findings: {
        severity: "critical" | "major" | "minor"
        description: string
        recommendation: string
    }[]
    overallAssessment: string
}
```

**Module export pattern** — each judge module exports:
```typescript
{ model, MAX_STEPS, tools, buildInstructions(context) }
```

**Judge identifiers** (used by judging orchestrator to map configs):
`security`, `bug-hunter`, `compatibility`, `performance`, `quality`

**Meta-judge** has a different signature — no sandbox tools, receives verdicts as input.

### Internal (can change freely)

- Which model each judge uses
- MAX_STEPS per judge
- System prompt content (as long as output matches the schema above)
- Which tools each judge has access to
- How the meta-judge synthesizes verdicts

### Steps

1. Create 5 specialist judge configs following the `explorer.ts` pattern (model, MAX_STEPS, tools, buildInstructions)
2. Create meta-judge config (no sandbox tools, receives verdicts, produces synthesized verdict)
3. `bun typecheck` — must pass
4. Commit: `feat: add specialist judge agent configs`

---

## Sub-Plan F: Quality Gate Runners

**Dependencies:** None

**Produces:** `src/lib/pipeline/quality-gates.ts`

### Contract (non-negotiable)

**Gate result shape** — the implementation orchestrator parses this:
```typescript
{
    gate: "typecheck" | "lint" | "test" | "build"
    status: "passed" | "failed"
    output: string
}
```

**Function signatures:**
```typescript
runTypecheck(sandbox) → GateResult
runLint(sandbox) → GateResult
runTests(sandbox) → GateResult
runBuild(sandbox) → GateResult
runAllGates(sandbox) → GateResult[]
```

**`runAllGates` behavior:** Runs gates in order (typecheck → lint → test → build). Stops on first failure. Returns array of results for all gates run.

### Internal (can change freely)

- Exact commands run in sandbox (e.g., `tsc --noEmit` vs `bun typecheck`)
- Timeout per gate
- How stdout/stderr are captured and formatted
- Whether to retry transient failures

### Steps

1. Create `src/lib/pipeline/quality-gates.ts` with all 5 functions
2. Each uses `sandbox.runCommand()` to execute, captures stdout/stderr/exitCode
3. Never throws on gate failure — returns `status: 'failed'` with output
4. `bun typecheck` — must pass
5. Commit: `feat: add quality gate runners`

---

## Sub-Plan G: Phase Loop Utilities

**Dependencies:** None (references existing `orchestrate.ts` patterns but doesn't import from it)

**Produces:** `src/lib/pipeline/phase-loop.ts`

### Contract (non-negotiable)

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

### Internal (can change freely)

- Loop implementation details (how messages accumulate, how tool results are injected)
- Logging within the loop
- How `onToolCall` errors are handled
- Step naming convention (`think-${i}` etc.)

### Steps

1. Create `src/lib/pipeline/phase-loop.ts` — extract the generic loop from `orchestrate.ts` lines 156-232 into `runAgentLoop`
2. Also export `buildToolResult` (already exists in `orchestrate.ts` — DRY extraction)
3. `bun typecheck` — must pass
4. Commit: `feat: add shared phase loop utilities`

---

## Sub-Plan H: Analysis Orchestrator

**Dependencies:** B (Events), C (Persistence), D (Memory), G (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/analysis.ts`

### Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/analysis`

**Trigger event:** `paul/pipeline/analysis` (from Sub-Plan B)

**Return shape (the master orchestrator parses this):**
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

### Internal (can change freely)

- System prompt content
- Which subagents are spawned and how
- How many explorers run in parallel
- When CTAs are fired
- How the output is assembled from subagent results

### Steps

1. Create `src/inngest/functions/pipeline/analysis.ts`
2. Inngest function: receives event, connects to sandbox, builds system prompt with memories, runs `runAgentLoop`, persists invocation data via persistence layer, returns structured output
3. System prompt instructs: break codebase into areas, spawn explorers, identify affected systems, list constraints/risks, create memories
4. `bun typecheck` — must pass
5. Commit: `feat: add analysis phase orchestrator`

---

## Sub-Plan I: Approaches Orchestrator

**Dependencies:** B (Events), C (Persistence), D (Memory), G (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/approaches.ts`

### Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/approaches`

**Trigger event:** `paul/pipeline/approaches` (from Sub-Plan B)

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

### Internal (can change freely)

- System prompt content
- How approaches are generated (sequential vs parallel explorers)
- Steelmanning strategy
- When CTAs are fired
- Minimum approach count enforcement

### Steps

1. Create `src/inngest/functions/pipeline/approaches.ts`
2. Receives analysis output in event, builds system prompt with analysis context + memories
3. Runs `runAgentLoop`, spawns explorers to validate assumptions
4. System prompt instructs: generate 2+ approaches, steelman each, validate assumptions, create memories
5. `bun typecheck` — must pass
6. Commit: `feat: add approaches phase orchestrator`

---

## Sub-Plan J: Judging Orchestrator

**Dependencies:** B (Events), C (Persistence), D (Memory), E (Judge Configs), G (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/judging.ts`, `src/inngest/functions/pipeline/judge-runner.ts`

### Contract (non-negotiable)

**Inngest function IDs:** `paul/pipeline/judging`, `paul/pipeline/judge`

**Trigger events:** `paul/pipeline/judging`, `paul/pipeline/judge` (from Sub-Plan B)

**Judging return shape:**
```typescript
{
    selectedApproachId: string
    judgeVerdicts: JudgeVerdict[]       // From Sub-Plan E contract
    overallVerdict: "approved" | "approved_with_conditions" | "rejected"
    conditions: string[]
    rejectionReason?: string
    synthesizedRisks: string[]
}
```

**Judge runner return shape:** The judge output schema from Sub-Plan E.

### Internal (can change freely)

- How judges are dispatched (parallel vs sequential)
- Meta-judge implementation (inline LLM call vs separate function)
- How verdicts are aggregated into overall verdict
- Thresholds for approved/conditions/rejected

### Steps

1. Create `src/inngest/functions/pipeline/judge-runner.ts` — generic Inngest function that runs one judge agent against the sandbox
2. Create `src/inngest/functions/pipeline/judging.ts` — spawns 5 judges in parallel via `step.invoke(judgeRunnerFunction)`, collects verdicts, runs meta-judge synthesis
3. `bun typecheck` — must pass
4. Commit: `feat: add judging phase orchestrator`

---

## Sub-Plan K: Implementation Orchestrator

**Dependencies:** B (Events), C (Persistence), D (Memory), F (Quality Gates), G (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/implementation.ts`

### Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/implementation`

**Trigger event:** `paul/pipeline/implementation` (from Sub-Plan B)

**Return shape:**
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

### Internal (can change freely)

- Max coder retry count
- How failure context is injected into retry prompts
- Feature branch naming convention
- How `filesChanged` is detected (git diff parsing, etc.)
- Coder system prompt content

### Steps

1. Create `src/inngest/functions/pipeline/implementation.ts`
2. Creates feature branch, runs orchestrator-managed retry loop (fresh coder per attempt)
3. After each coder, runs `runAllGates()` from Sub-Plan F
4. On gate failure, spawns fresh coder with failure output
5. On all gates pass, returns implementation output
6. `bun typecheck` — must pass
7. Commit: `feat: add implementation phase orchestrator`

---

## Sub-Plan L: PR Creation

**Dependencies:** None

**Produces:** `src/lib/pipeline/pr-creation.ts`

### Contract (non-negotiable)

**Function signature:**
```typescript
createPR(sandbox, config: {
    branch: string
    githubRepoUrl: string
    prompt: string
    analysisOutput: unknown
    approachOutput: unknown
    implOutput: unknown
}) → { prUrl: string, prNumber: number, title: string, body: string }
```

### Internal (can change freely)

- PR title generation logic
- PR body format and content
- Whether git push uses SSH or HTTPS
- Whether PR is created via `gh` CLI or GitHub API
- How outputs are summarized into the PR body

### Steps

1. Create `src/lib/pipeline/pr-creation.ts` — deterministic function (no LLM)
2. Pushes feature branch via sandbox bash (`git push origin <branch>`)
3. Creates PR via `gh pr create` in sandbox
4. Generates title from prompt, body from phase outputs
5. `bun typecheck` — must pass
6. Commit: `feat: add PR creation utility`

---

## Sub-Plan M: Master Orchestrator + Registry

**Dependencies:** B (Events), C (Persistence), H, I, J, K (all phase orchestrators), L (PR Creation)

**Produces:** `src/inngest/functions/pipeline/feature-run.ts`, modified `src/inngest/functions/index.ts`

### Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/feature-run`

**Trigger event:** `paul/pipeline/feature-run` (from Sub-Plan B)

**Phase sequence:** `analysis → approaches → judging → implementation → pr`

This is the only place that defines the phase ordering. All phase orchestrators are independent — the master decides when to invoke them and what data to pass.

### Internal (can change freely)

- CTA prompts between phases (what messages the user sees)
- How phase outputs are threaded to the next phase
- Sandbox lifecycle management (when to create, when to stop)
- Error handling and failure reporting
- How the feature_run DB record is updated

### Steps

1. Create `src/inngest/functions/pipeline/feature-run.ts` — master Inngest function
2. Phase loop: for each phase, create phase_result, fetch memories, `step.invoke(phaseFunction)`, persist output, update currentPhase
3. Between phases, fire CTA for user approval (after Approaches, use choice CTA for approach selection)
4. After implementation, run PR creation via `step.run()`
5. On any phase failure, fail the run and stop sandbox
6. Update `src/inngest/functions/index.ts` — register all new pipeline functions
7. `bun typecheck` — must pass
8. `bun lint:all` — must pass
9. Commit: `feat: add master feature-run orchestrator and register pipeline functions`

---

## Suggested Build Order

Given the DAG, here's one efficient execution order that maximizes parallelism:

**Wave 1 (all leaf nodes, in parallel):**
A, B, D, E, F, G, L

**Wave 2 (needs A):**
C

**Wave 3 (needs B, C, D, G + optionally E, F):**
H, I, J, K (all in parallel)

**Wave 4 (needs everything):**
M
