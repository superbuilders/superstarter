# Sub-Plan 01: Database Schema

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the `agent` PostgreSQL schema with 5 tables and 5 enums.

**Architecture:** Drizzle ORM schema using `pgSchema("agent")` namespace, replacing the placeholder `core` schema.

**Tech Stack:** Drizzle ORM, PostgreSQL

**Dependencies:** None

**Produces:** `src/db/schemas/agent.ts`, updated `drizzle.config.ts`, updated `src/db/index.ts`

---

## Contract (non-negotiable)

### Enum Values

| Enum | Values |
|------|--------|
| `sandboxStatus` | `pending`, `running`, `stopping`, `stopped`, `failed`, `aborted`, `snapshotting` |
| `sandboxSourceType` | `git`, `tarball`, `snapshot`, `empty` |
| `featurePhase` | `analysis`, `approaches`, `judging`, `implementation`, `pr`, `completed`, `failed` |
| `phaseStatus` | `running`, `passed`, `failed` |
| `ctaKind` | `approval`, `text`, `choice` |

### Tables

**`sandboxes`** — No `runId` FK (avoids circular dependency).

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | Sandbox ID from Vercel |
| `status` | sandboxStatus enum | |
| `runtime` | text | |
| `memory` | integer | MB |
| `vcpus` | integer | |
| `region` | text | |
| `cwd` | text | |
| `timeout` | integer | ms |
| `networkPolicy` | jsonb | |
| `interactivePort` | integer | |
| `routes` | jsonb | `[{ url, subdomain, port }]` |
| `sourceSnapshotId` | text | |
| `sourceType` | sandboxSourceType enum | |
| `sourceUrl` | text | |
| `sourceRevision` | text | |
| `sourceDepth` | integer | |
| `requestedAt` | timestamp | |
| `createdAt` | timestamp | |
| `startedAt` | timestamp | |
| `requestedStopAt` | timestamp | |
| `stoppedAt` | timestamp | |
| `abortedAt` | timestamp | |
| `snapshottedAt` | timestamp | |
| `duration` | integer | ms |

**`featureRuns`** — Memories stored as jsonb here, not a separate table.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `prompt` | text | |
| `sandboxId` | text FK → sandboxes | |
| `githubRepoUrl` | text | |
| `githubBranch` | text | |
| `currentPhase` | featurePhase enum | |
| `memories` | jsonb | Append-only `[{ phase, kind, content }]` |
| `createdAt` | timestamp | |
| `completedAt` | timestamp | |

**`phaseResults`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `runId` | uuid FK → featureRuns | |
| `phase` | featurePhase enum | |
| `status` | phaseStatus enum | |
| `output` | jsonb | |
| `startedAt` | timestamp | |
| `completedAt` | timestamp | |

**`agentInvocations`** — Steps and tool calls stored as jsonb, not separate tables.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `phaseResultId` | uuid FK → phaseResults | |
| `parentInvocationId` | uuid FK → self | Nullable — null for top-level |
| `agentType` | text | Not enum — extensible |
| `modelId` | text | |
| `systemPrompt` | text | |
| `inputMessages` | jsonb | |
| `finishReason` | text | |
| `outputText` | text | |
| `inputTokens` | integer | |
| `outputTokens` | integer | |
| `totalTokens` | integer | |
| `steps` | jsonb | Full step results array |
| `toolCalls` | jsonb | Full tool calls + results array |
| `rawResponse` | jsonb | SDK response for debugging |
| `startedAt` | timestamp | |
| `completedAt` | timestamp | |

**`ctaEvents`** — `invocationId` is nullable for master-fired CTAs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | = ctaId |
| `runId` | uuid FK → featureRuns | |
| `phaseResultId` | uuid FK → phaseResults | |
| `invocationId` | uuid FK → agentInvocations | **Nullable** |
| `toolCallId` | text | |
| `kind` | ctaKind enum | |
| `requestMessage` | text | |
| `requestPrompt` | text | |
| `requestPlaceholder` | text | |
| `requestOptions` | jsonb | |
| `responseApproved` | boolean | |
| `responseReason` | text | |
| `responseText` | text | |
| `responseSelectedId` | text | |
| `requestedAt` | timestamp | |
| `respondedAt` | timestamp | |
| `timedOut` | boolean | |

### Key Decisions

- **No `sandboxes.runId`** — navigate from `featureRuns.sandboxId`.
- **`agentType` is text** — avoids ALTER TYPE migrations.
- **`ctaEvents.invocationId` is nullable** — master-fired CTAs have no invocation.
- **`memories` is jsonb on `featureRuns`** — not a separate table.
- **`steps`/`toolCalls` are jsonb on `agentInvocations`** — one write at completion.
- **All writes must use upsert semantics** — Inngest replay-safe.

## Internal (can change freely)

- Index strategy, cascade behavior, defaults, column ordering.

---

## Steps

1. Create `src/db/schemas/agent.ts` — 5 enums, 5 tables per spec above. Indexes on `featureRuns(createdAt)`, `phaseResults(runId, phase)`, `ctaEvents(runId)`.
2. Update `drizzle.config.ts` — schema → `"./src/db/schemas/agent.ts"`, schemaFilter → `["agent"]`.
3. Update `src/db/index.ts` — import `* as agent`.
4. Delete `src/db/schemas/core.ts`. Grep for stale references.
5. `bun typecheck` — must pass.
6. Commit: `feat: replace core schema with agent schema`
7. `bun db:generate` — HUMAN REVIEW migration SQL.
8. `bun db:push` — apply.
