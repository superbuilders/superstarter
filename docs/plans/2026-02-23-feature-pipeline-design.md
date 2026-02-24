# Feature Development Pipeline Design

**Date:** 2026-02-23
**Status:** Approved

## Overview

A multi-agent pipeline that takes a user's feature request and autonomously analyzes the codebase, generates approaches, evaluates them through specialist judges, implements the approved approach, and creates a PR — with human-in-the-loop CTAs at every phase boundary.

## Architecture: Single Master Orchestrator

One long-lived Inngest function manages the entire feature request lifecycle as a strict sequential phase pipeline. It spawns phase-specific orchestrators via `step.invoke()`, checkpointing between phases.

```
FeatureRun (master Inngest function)
  ├─ Phase 1: Analysis         → Analysis Orchestrator
  ├─ Phase 2: Approaches       → Approach Orchestrator
  ├─ Phase 3: Judging          → Judging Orchestrator
  ├─ Phase 4: Implementation   → Implementation Orchestrator
  └─ Phase 5: PR Creation      → Deterministic step
```

### Key Design Decisions

- **Strict sequential phases.** Each phase must complete before the next begins. Clean state boundaries.
- **No revert machinery.** If a run fails, start a new run. Old run's full history (every tool call, LLM message, memory record) persists in PG for reference.
- **Full DB persistence.** Every field from every SDK type gets an explicit column. No data is lost.
- **Dynamic approach count.** Soft minimum of 2 approaches. Single approach requires written justification or CTA.
- **Specialist subagent judges.** One judge per criterion, running in parallel. Meta-judge synthesizes.
- **Orchestrator-managed implementation retries.** Fresh coder agents per attempt, not in-loop retries.
- **User CTA approval between every phase.** The orchestrator can also fire CTAs within a phase.
- **LLM memory records.** Agents create structured memories as they work. Memories are injected into subsequent phase system prompts.

---

## Data Model (agent schema)

### sandboxes

| Column | Type | Purpose |
|--------|------|---------|
| `id` | text PK | Sandbox ID from Vercel |
| `runId` | uuid FK → feature_runs | Which feature run owns this |
| `status` | enum | `pending`, `running`, `stopping`, `stopped`, `failed`, `aborted`, `snapshotting` |
| `runtime` | text | `node24`, `node22`, `python3.13` |
| `memory` | integer | Memory in MB |
| `vcpus` | integer | Virtual CPUs |
| `region` | text | Deployment region |
| `cwd` | text | Working directory |
| `timeout` | integer | Timeout in ms |
| `networkPolicy` | jsonb | Allow/deny rules |
| `interactivePort` | integer | Port for interactive access |
| `routes` | jsonb | `[{ url, subdomain, port }]` |
| `sourceSnapshotId` | text | Snapshot ID used to create sandbox |
| `sourceType` | enum | `git`, `tarball`, `snapshot`, `empty` |
| `sourceUrl` | text | Git URL or tarball URL |
| `sourceRevision` | text | Git branch/commit/tag |
| `sourceDepth` | integer | Shallow clone depth |
| `requestedAt` | timestamp | |
| `createdAt` | timestamp | |
| `startedAt` | timestamp | |
| `requestedStopAt` | timestamp | |
| `stoppedAt` | timestamp | |
| `abortedAt` | timestamp | |
| `snapshottedAt` | timestamp | |
| `duration` | integer | Duration in ms |

### sandbox_snapshots

| Column | Type | Purpose |
|--------|------|---------|
| `id` | text PK | Snapshot ID from Vercel |
| `sandboxId` | text FK → sandboxes | Source sandbox |
| `runId` | uuid FK → feature_runs | |
| `status` | enum | `created`, `deleted`, `failed` |
| `sizeBytes` | bigint | Snapshot size |
| `region` | text | |
| `expiresAt` | timestamp | |
| `createdAt` | timestamp | |

### feature_runs

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `prompt` | text | Original user feature request |
| `sandboxId` | text FK → sandboxes | Active sandbox |
| `githubRepoUrl` | text | |
| `githubBranch` | text | |
| `currentPhase` | enum | `analysis`, `approaches`, `judging`, `implementation`, `pr`, `completed`, `failed` |
| `createdAt` | timestamp | |
| `completedAt` | timestamp | |

### phase_results

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `runId` | uuid FK → feature_runs | |
| `phase` | enum | `analysis`, `approaches`, `judging`, `implementation`, `pr` |
| `status` | enum | `running`, `passed`, `failed` |
| `output` | jsonb | Phase-specific structured output |
| `startedAt` | timestamp | |
| `completedAt` | timestamp | |

### agent_invocations

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `phaseResultId` | uuid FK → phase_results | |
| `parentInvocationId` | uuid FK → agent_invocations | Null for top-level, set for subagents |
| `agentType` | enum | `orchestrator`, `explorer`, `coder`, `judge`, `meta_judge` |
| `modelProvider` | text | e.g., `anthropic`, `openai` |
| `modelId` | text | e.g., `claude-sonnet-4-6`, `gpt-5-nano` |
| `systemPrompt` | text | Full system prompt sent |
| `inputMessages` | jsonb | Messages array sent to the model |
| `finishReason` | enum | `stop`, `length`, `content-filter`, `tool-calls`, `error`, `other` |
| `rawFinishReason` | text | Provider's raw finish reason string |
| `outputText` | text | Final text output |
| `outputReasoningText` | text | Reasoning/thinking text |
| `outputReasoning` | jsonb | Full reasoning parts array |
| `outputContent` | jsonb | Full content parts array |
| `outputFiles` | jsonb | Generated files array |
| `outputSources` | jsonb | Source references array |
| `responseMessages` | jsonb | response.messages array |
| `responseId` | text | Provider response ID |
| `responseModelId` | text | Actual model ID used |
| `responseHeaders` | jsonb | Response headers |
| `responseBody` | jsonb | Raw response body |
| `responseTimestamp` | timestamp | Provider response timestamp |
| `providerMetadata` | jsonb | Provider-specific metadata |
| `warnings` | jsonb | CallWarning array |
| `requestBody` | jsonb | request.body raw request |
| `stepCount` | integer | Number of steps in this invocation |
| `inputTokens` | integer | |
| `outputTokens` | integer | |
| `totalTokens` | integer | |
| `inputTokensNoCacheTokens` | integer | |
| `inputTokensCacheReadTokens` | integer | |
| `inputTokensCacheWriteTokens` | integer | |
| `outputTokensTextTokens` | integer | |
| `outputTokensReasoningTokens` | integer | |
| `usageRaw` | jsonb | Raw usage data from provider |
| `startedAt` | timestamp | |
| `completedAt` | timestamp | |

### agent_steps

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `invocationId` | uuid FK → agent_invocations | |
| `stepNumber` | integer | 0-indexed within invocation |
| `modelProvider` | text | |
| `modelId` | text | |
| `functionId` | text | Telemetry function ID |
| `metadata` | jsonb | Step-level metadata |
| `text` | text | Text output for this step |
| `reasoningText` | text | |
| `reasoning` | jsonb | Reasoning parts |
| `content` | jsonb | Content parts |
| `files` | jsonb | Generated files |
| `sources` | jsonb | Source references |
| `finishReason` | enum | `stop`, `length`, `content-filter`, `tool-calls`, `error`, `other` |
| `rawFinishReason` | text | |
| `inputTokens` | integer | |
| `outputTokens` | integer | |
| `totalTokens` | integer | |
| `inputTokensNoCacheTokens` | integer | |
| `inputTokensCacheReadTokens` | integer | |
| `inputTokensCacheWriteTokens` | integer | |
| `outputTokensTextTokens` | integer | |
| `outputTokensReasoningTokens` | integer | |
| `usageRaw` | jsonb | |
| `warnings` | jsonb | |
| `requestBody` | jsonb | |
| `responseId` | text | |
| `responseModelId` | text | |
| `responseHeaders` | jsonb | |
| `responseBody` | jsonb | |
| `responseTimestamp` | timestamp | |
| `providerMetadata` | jsonb | |
| `createdAt` | timestamp | |

### tool_calls

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `stepId` | uuid FK → agent_steps | |
| `invocationId` | uuid FK → agent_invocations | Denormalized for query convenience |
| `toolCallId` | text | SDK-assigned tool call ID |
| `toolName` | text | `read`, `glob`, `grep`, `write`, `edit`, `bash`, `spawn_subagent`, `request_human_feedback`, `create_memory` |
| `input` | jsonb | Full tool input parameters |
| `output` | jsonb | Full tool result |
| `outputType` | enum | `text`, `json`, `execution-denied`, `error-text`, `error-json`, `content` |
| `isDynamic` | boolean | Dynamic tool call flag |
| `isInvalid` | boolean | SDK marked as invalid |
| `error` | jsonb | Error info if invalid |
| `isPreliminary` | boolean | Preliminary result flag |
| `isProviderExecuted` | boolean | Provider-executed flag |
| `title` | text | Tool call title |
| `providerMetadata` | jsonb | |
| `createdAt` | timestamp | |

### memory_records

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | |
| `runId` | uuid FK → feature_runs | |
| `phaseResultId` | uuid FK → phase_results | |
| `invocationId` | uuid FK → agent_invocations | |
| `phase` | enum | |
| `kind` | enum | `insight`, `failure`, `decision`, `constraint` |
| `content` | text | |
| `createdAt` | timestamp | |

### cta_events

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK (= ctaId) | |
| `runId` | uuid FK → feature_runs | |
| `phaseResultId` | uuid FK → phase_results | |
| `invocationId` | uuid FK → agent_invocations | |
| `toolCallId` | text | SDK tool call ID that triggered this |
| `kind` | enum | `approval`, `text`, `choice` |
| `requestMessage` | text | For approval kind |
| `requestPrompt` | text | For text/choice kind |
| `requestPlaceholder` | text | For text kind |
| `requestOptions` | jsonb | For choice kind: `[{ id, label }]` |
| `responseApproved` | boolean | For approval kind |
| `responseReason` | text | For approval kind |
| `responseText` | text | For text kind |
| `responseSelectedId` | text | For choice kind |
| `requestedAt` | timestamp | |
| `respondedAt` | timestamp | |
| `timedOut` | boolean | |

### Relationships

```
feature_runs 1──N phase_results 1──N agent_invocations 1──N agent_steps 1──N tool_calls
feature_runs 1──1 sandboxes 1──N sandbox_snapshots
feature_runs 1──N memory_records
feature_runs 1──N cta_events
agent_invocations ──self── parentInvocationId (subagent hierarchy)
```

---

## Phase Pipeline

### Phase 1: Analysis

**Orchestrator:** Analysis Orchestrator (Claude Sonnet)

**Subagents:** Explorer (GPT-5-nano) — read-only codebase analysis. Multiple spawned in parallel for different areas.

**Output:**
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

**Gate:** Orchestrator self-certifies completion. User CTA to approve analysis.

### Phase 2: Approaches

**Orchestrator:** Approach Orchestrator (Claude Sonnet)

**Input:** Analysis output.

**Subagents:** Explorer (GPT-5-nano) — validate technical assumptions.

**Output:**
```typescript
{
  approaches: {
    id: string
    title: string
    summary: string
    rationale: string
    implementation: string
    affectedFiles: string[]
    tradeoffs: { pros: string[]; cons: string[] }
    assumptions: {
      claim: string
      validated: boolean
      evidence: string
    }[]
    estimatedComplexity: 'low' | 'medium' | 'high'
  }[]
  recommendation: string
  singleApproachJustification?: string
}
```

**Gate:** 2+ approaches (or 1 with justification). User CTA to approve and select approach.

### Phase 3: Judging

**Orchestrator:** Judging Orchestrator (Claude Sonnet)

**Input:** Selected approach + analysis context.

**Specialist Judge Subagents** (Explorer-class, parallel):
- Security Reviewer
- Bug Hunter
- Backwards Compatibility Checker
- Performance Analyst
- Code Quality Reviewer

**Each judge produces:**
```typescript
{
  criterion: string
  verdict: 'pass' | 'concern' | 'fail'
  findings: {
    severity: 'critical' | 'major' | 'minor'
    description: string
    recommendation: string
  }[]
  overallAssessment: string
}
```

**Meta-judge output:**
```typescript
{
  selectedApproachId: string
  judgeVerdicts: JudgeVerdict[]
  overallVerdict: 'approved' | 'approved_with_conditions' | 'rejected'
  conditions: string[]
  rejectionReason?: string
  synthesizedRisks: string[]
}
```

**Gate:** Verdict must be `approved` or `approved_with_conditions`. Rejected = run fails. User CTA to approve.

### Phase 4: Implementation

**Orchestrator:** Implementation Orchestrator (Claude Sonnet)

**Input:** Approved approach + analysis + judging conditions.

**Subagents:**
- Coder (GPT-5.1-codex) — fresh agent per attempt (orchestrator-managed retries)
- Explorer (GPT-5-nano) — reference lookups during implementation

**Quality gates (run in sandbox):**
1. Typecheck (`tsc --noEmit`)
2. Lint (`bun lint`)
3. Tests (`bun test`)
4. Build (`bun build`)

**Output:**
```typescript
{
  branch: string
  filesChanged: {
    path: string
    changeType: 'added' | 'modified' | 'deleted'
  }[]
  gateResults: {
    gate: 'typecheck' | 'lint' | 'test' | 'build'
    status: 'passed' | 'failed'
    output: string
    attempts: number
  }[]
  totalCoderAttempts: number
  conditionsAddressed: string[]
}
```

**Gate:** All quality gates pass. User CTA to approve implementation.

### Phase 5: PR Creation

**Deterministic step** (not an LLM phase):
1. Push feature branch to GitHub
2. Create PR with generated title/body
3. Link back to feature run

**Output:**
```typescript
{
  prUrl: string
  prNumber: number
  title: string
  body: string
}
```

---

## Master Orchestrator Loop

```
for each phase in [analysis, approaches, judging, implementation, pr]:
  1. Create phase_result row (status = 'running')
  2. step.invoke(phaseOrchestrator, { runId, phaseInput })
  3. Persist phase output to phase_result (status = 'passed')
  4. Update feature_runs.currentPhase to next phase

  If phase fails:
    Update phase_result (status = 'failed')
    Update feature_runs (currentPhase = 'failed')
    Break
```

---

## Memory Record System

### Creation

Agents have a `create_memory` tool:
```typescript
create_memory({
  kind: 'insight' | 'failure' | 'decision' | 'constraint',
  content: string
})
```

System prompts instruct agents to create memories when discovering non-obvious information, when something fails, when making meaningful choices, or when finding hard constraints.

### Consumption

At phase start, all memory records from the current run are injected into the system prompt:

```
## Memory Records from Previous Phases

### Insights
- [analysis] The auth middleware chains through 3 layers...

### Decisions
- [approaches] Chose approach B because...

### Constraints
- [analysis] Database uses ULIDs, not UUIDs...

### Failures
- (none yet)
```

Static injection, not a query tool. Memories are small and few — injecting all is cheaper and more reliable than expecting LLMs to query on demand.

### Scope

Memories are scoped to the `feature_run`. New runs start fresh with no inherited memories.

---

## Failure Model

- **Phase fails:** `feature_runs.currentPhase = 'failed'`. Run is terminal.
- **User wants to retry:** Start a new `feature_run`. Fresh sandbox, fresh branch, no inherited state.
- **History preserved:** The failed run's complete history (every tool call, message, memory record) remains in PG for debugging and optimization.
- **No revert machinery.** Simplicity over sophistication for v1.
