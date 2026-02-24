# Sub-Plan 03: Persistence Layer

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** CRUD operations for all agent-schema tables.

**Architecture:** Pure functions wrapping Drizzle inserts/updates. All writes use upsert semantics (ON CONFLICT DO NOTHING) for Inngest replay safety.

**Tech Stack:** Drizzle ORM

**Dependencies:** 01 (Schema)

**Produces:** `src/lib/pipeline/persistence.ts`

---

## Contract (non-negotiable)

```typescript
// Feature Runs
createFeatureRun(db, data) → { id: string }
updateFeatureRunPhase(db, runId, phase) → void
updateFeatureRunMemories(db, runId, memories) → void
completeFeatureRun(db, runId) → void
failFeatureRun(db, runId) → void

// Sandboxes
createSandboxRecord(db, data) → void
updateSandboxStatus(db, sandboxId, status) → void

// Phase Results
createPhaseResult(db, data) → { id: string }
passPhaseResult(db, phaseResultId, output) → void
failPhaseResult(db, phaseResultId) → void

// Agent Invocations
createAgentInvocation(db, data) → { id: string }
completeAgentInvocation(db, invocationId, data) → void

// CTA Events
createCtaEvent(db, data) → void
completeCtaEvent(db, ctaId, responseData) → void
timeoutCtaEvent(db, ctaId) → void
```

**v2 changes from v1:**
- Removed `createSnapshotRecord` — no snapshots table.
- Removed `createAgentStep`, `createToolCall` — no separate tables; steps/toolCalls are jsonb on `agentInvocations`, written via `completeAgentInvocation`.
- Removed `createMemoryRecord`, `getMemoryRecords` — memories are jsonb on `featureRuns`, written via `updateFeatureRunMemories`.
- Added `updateFeatureRunMemories` — appends to the memories jsonb array.
- All write functions use upsert semantics (ON CONFLICT DO NOTHING) for Inngest replay safety.

## Internal (can change freely)

- Query implementation, transaction handling, error handling.

---

## Steps

1. Create `src/lib/pipeline/persistence.ts` with all functions above. Each insert uses explicit column selection. All inserts use ON CONFLICT DO NOTHING.
2. `bun typecheck` — must pass.
3. Commit: `feat: add pipeline persistence layer`
