# Sub-Plan 01: Database Schema

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the `agent` PostgreSQL schema with all tables and enums for the feature pipeline.

**Architecture:** Drizzle ORM schema using `pgSchema("agent")` namespace, replacing the placeholder `core` schema.

**Tech Stack:** Drizzle ORM, PostgreSQL

**Dependencies:** None

**Produces:** `src/db/schemas/agent.ts`, updated `drizzle.config.ts`, updated `src/db/index.ts`

---

## Contract (non-negotiable)

These table names, column names, and enum values are referenced by every downstream sub-plan. Renaming any of them requires updating all consumers.

### Enum Values

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

### Table Names

`sandboxes`, `sandboxSnapshots`, `featureRuns`, `phaseResults`, `agentInvocations`, `agentSteps`, `toolCalls`, `memoryRecords`, `ctaEvents`

### Schema Namespace

`agent` (via `pgSchema("agent")`)

All column names and types as specified in the design doc section "Data Model."

## Internal (can change freely)

- Index strategy (which indexes, composite vs single)
- Cascade behavior on FKs
- Default values
- Column ordering within tables

---

## Steps

### Step 1: Create agent schema

**Files:** Create `src/db/schemas/agent.ts`

Create all enums and 9 tables with columns exactly per the design doc. Use `pgSchema("agent")` for namespace isolation. Every timestamp uses `{ mode: "date", withTimezone: true }`. UUIDs use `.defaultRandom()`.

Add indexes on:
- `featureRuns`: `currentPhase`
- `phaseResults`: `(runId, phase)`
- `agentInvocations`: `(phaseResultId, agentType)`
- `agentSteps`: `(invocationId, stepNumber)`
- `toolCalls`: `(stepId)`, `(invocationId)`
- `memoryRecords`: `(runId, phase)`
- `ctaEvents`: `(runId)`

### Step 2: Update drizzle.config.ts

Change schema from `"./src/db/schemas/core.ts"` to `"./src/db/schemas/agent.ts"`. Change schemaFilter from `["core"]` to `["agent"]`.

### Step 3: Update src/db/index.ts

Change the import from `* as core from "@/db/schemas/core"` to `* as agent from "@/db/schemas/agent"`. Update the schema spread.

### Step 4: Remove core.ts

Delete `src/db/schemas/core.ts`. Grep the codebase for any remaining references to core schema tables and remove them.

### Step 5: Verify

Run: `bun typecheck`
Expected: PASS

### Step 6: Commit

```bash
git add src/db/schemas/agent.ts src/db/index.ts drizzle.config.ts
git rm src/db/schemas/core.ts
git commit -m "feat: replace core schema with agent schema for feature pipeline"
```

### Step 7: Generate and review migration (HUMAN STEP)

Run: `bun db:generate`

Inspect the generated migration SQL to verify all tables, enums, FKs, and indexes are present.

### Step 8: Apply migration

Run: `bun db:push`
