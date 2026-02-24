# Sub-Plan 03: Persistence Layer

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** CRUD operations for all agent-schema tables, used by every orchestrator and the master.

**Architecture:** Pure functions wrapping Drizzle inserts/updates. No business logic — just data access.

**Tech Stack:** Drizzle ORM

**Dependencies:** 01 (Schema)

**Produces:** `src/lib/pipeline/persistence.ts`

---

## Contract (non-negotiable)

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

## Internal (can change freely)

- Internal query implementation (raw SQL vs query builder)
- Which columns are selected in reads (as long as return type is met)
- Transaction handling strategy
- Error handling within functions (as long as they throw on failure)

---

## Steps

### Step 1: Create persistence module

**Files:** Create `src/lib/pipeline/persistence.ts`

Implement all functions listed in the contract. Each insert uses explicit column selection (no `returning()` without columns). Each read uses explicit `.select({...})` (no implicit `SELECT *`).

### Step 2: Verify

Run: `bun typecheck`
Expected: PASS

### Step 3: Commit

```bash
git add src/lib/pipeline/persistence.ts
git commit -m "feat: add pipeline persistence layer"
```
