# Round 3: Codebase Exploration Research

Compiled from 3 parallel exploration agents examining the actual codebase on the `agent/foundation` branch in `.worktrees/agent-foundation/`.

---

## 1. Agent Foundation Code (`src/agents/`)

### File Inventory (22 TypeScript files)

| Path | Lines | Purpose |
|------|-------|---------|
| `src/agents/config.ts` | 247 | DEFAULT_CONFIG, Zod schemas, deepMerge, resolveConfig (4-level pipeline), resolveModel |
| `src/agents/observability.ts` | 299 | TelemetryCollector, createObservableLifecycle, createStreamingPublisher |
| `src/agents/agents/explorer.ts` | 51 | createExplorerAgent with 11 tools + extraTools + lifecycle |
| `src/agents/agents/specialist.ts` | 43 | createSpecialistAgent with Core+Analysis tools |
| `src/agents/tools/analysis.ts` | ~55 | Analysis tool handlers |
| `src/agents/tools/conventions.ts` | ~33 | Convention analysis tools |
| `src/agents/tools/filesystem.ts` | ~71 | Filesystem read-only tools |
| `src/agents/tools/progress.ts` | ~17 | Progress reporting tools |
| `src/agents/tools/verification.ts` | ~100 | Verification tools (all agents) |
| `src/agents/tools/workspace.ts` | ~62 | Workspace management tools (orchestration) |
| `src/agents/primitives/onboard.ts` | varies | buildSlicePrompt, DEFAULT_SLICES, saveSummaryTool, CodebaseContext type |

### Config Resolution Pipeline (`config.ts`)

4-level resolution: code defaults -> DB default preset -> named preset -> per-run overrides

```
DEFAULT_CONFIG (6 agent roles: explorer, specialist, concept, critic, reviewer, implementer)
  -> DB default preset (coreAgentPreset where isDefault=true)
  -> Named preset (if presetId provided)
  -> Per-run overrides (from event payload)
```

- `resolveConfig()` merges configs with `deepMerge` (custom recursive merge)
- `resolveModel()` maps provider+model string to API config (4 providers: anthropic, openai, gemini, xai)
- All validated with Zod schemas

### Observability System (`observability.ts`)

- `TelemetryCollector` — accumulates agent events (inference_complete, tool calls, etc.)
- `createObservableLifecycle` — wraps AgentKit lifecycle hooks to capture telemetry
- `createStreamingPublisher` — publishes events to Inngest realtime channels
- Events persisted to `coreAgentEvent` table after network execution

### Agent Creation Pattern

Both `createExplorerAgent` and `createSpecialistAgent` follow the same factory pattern:
1. Accept config + tools + lifecycle hooks
2. Call `createAgent()` from `@inngest/agent-kit`
3. Pass system prompt, model config, tool set
4. Explorer gets 11 tools (Core + Analysis + Verification + Workspace), Specialist gets Core + Analysis

### Tool Tiers (5 levels)

| Tier | Tools | Access |
|------|-------|--------|
| Core | filesystem (read-only) | All agents |
| Analysis | analysis, conventions | All agents |
| Verification | verification | All agents |
| Workspace | workspace, progress | Orchestration agents |
| Implementation | (not yet built) | Implementer only |

---

## 2. Inngest Client & Event Schemas (`src/inngest/`)

### Client Configuration (`src/inngest/index.ts`, 88 lines)

- Client ID: `"superstarter"`
- Checkpointing enabled for durable execution
- `realtimeMiddleware()` from `@inngest/realtime/middleware`
- Logger pipes to `@superbuilders/slog`

### Event Schemas (7 events with Zod validation)

| Event | Key Fields | Purpose |
|-------|------------|---------|
| `superstarter/hello` | message | Test/hello event |
| `agent/feature.requested` | feature, presetId?, configOverrides? | Trigger new workflow run |
| `agent/feature.feedback` | runId, feedback, approved | User feedback on feature plan |
| `agent/feature.approved` | runId | Feature plan approved |
| `agent/implementation.feedback` | runId, feedback, approved | Implementation feedback |
| `agent/implementation.approved` | runId, merge? | Implementation approved, optional merge |
| `agent/debug.escalation` | runId, failure, attemptedFixes | Debug escalation with context |

### Config Override Shape

```typescript
configOverrides?: {
  explorer?: { model?, maxTokens?, temperature?, systemPromptSuffix? }
  specialist?: { ... }
  concept?: { ... }
  critic?: { ... }
  reviewer?: { ... }
  implementer?: { ... }
}
```

### Inngest Functions

| File | Function | Purpose |
|------|----------|---------|
| `src/inngest/functions/index.ts` | barrel | Exports all functions for serve() |
| `src/inngest/functions/agent-onboard.ts` | `agentOnboard` | Full onboarding phase implementation |

### Onboarding Function (`agent-onboard.ts`, 255 lines)

Steps:
1. `create-workflow-run` — Insert into `coreWorkflowRun`, status="running", phase="onboarding"
2. `resolve-config` — 4-level config resolution pipeline
3. `create-worktree` — Git worktree for isolated workspace
4. **Parallel slice exploration** — 6 slices: structure, data-layer, api-layer, ui-layer, conventions, dependencies
5. `consolidate-onboarding` — Merge slice summaries into unified context
6. `persist-context` — Save to DB, update phase to "concept-network"

Uses `createNetwork()` with `maxIter=5`, state-based routing, telemetry persistence via `coreAgentEvent`.

### API Route (`src/app/api/inngest/route.ts`, 33 lines)

- `serve()` adapter for Next.js App Router
- Imports all functions from `src/inngest/functions/`

---

## 3. Database Schema (`src/db/schemas/core.ts`, 192 lines)

### Agent-Specific Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `coreAgentPreset` | id, name, workflowType, config (jsonb), isDefault (partial unique index per workflowType) | Workflow configuration presets |
| `coreJudgePersonality` | id, name, slug (unique), persona (text), evaluationFocus, model (jsonb), isActive, isBuiltIn | Judge evaluation personalities |
| `coreWorkflowRun` | id, feature, branchName, worktreePath, worktreeStatus, status, phase, presetId (FK), configSnapshot, judgeIds, result, verificationReport, debugTraces, feedback, inngestRunId, totalTokens, estimatedCost | Workflow execution tracking |
| `coreAgentEvent` | id, workflowRunId (FK cascade), networkName, agentName, eventType, iteration, promptTokens, completionTokens, totalTokens, durationMs, payload (jsonb), 3 indexes | Agent telemetry events |

### Auth Tables (NextAuth)

coreUsers, coreAccounts, coreSessions, coreVerificationTokens

### Other

corePosts (basic posts table)

### Notable Schema Details

- `coreAgentPreset.isDefault` uses a partial unique index per workflowType (only one default per type)
- `coreWorkflowRun.configSnapshot` stores resolved config at run time (immutable snapshot)
- `coreWorkflowRun.judgeIds` stores selected judge personality IDs
- `coreAgentEvent` has cascade delete on workflowRunId (cleaning up a run removes all events)
- 3 indexes on coreAgentEvent: by workflowRunId, by eventType, by agentName

---

## 4. Command Center UI (`src/app/command/`)

### File Inventory (11 source files + 1 test file, 909 lines total)

| Path | Lines | Purpose |
|------|-------|---------|
| `page.tsx` | 72 | Server Component: RSC orchestrator, 2 Drizzle prepared queries |
| `content.tsx` | 112 | Client Component: realtime integration, state management, 3-column layout |
| `layout.tsx` | 7 | Dark mode wrapper |
| `actions.ts` | 14 | Server action: getCommandCenterToken for Inngest subscription |
| `event-utils.ts` | 99 | CommandEvent type, EventFilters, EventMetrics, color/label mappings |
| `components/detail-panel.tsx` | 110 | Tabbed event details (Summary/Payload/Tokens) |
| `components/event-log.tsx` | 98 | Scrollable event table |
| `components/run-list.tsx` | 82 | Selectable workflow run list with status indicators |
| `components/run-metrics.tsx` | 61 | Aggregated metrics (Runs/Events/Tokens/Duration/Cost) |
| `components/status-bar.tsx` | 115 | Mode toggle, connection status, dual filter dropdowns |
| `event-utils.test.ts` | 147 | Tests for color/label, filtering, aggregation |

### Component Tree

```
page.tsx (Server Component)
  -> <Suspense>
    -> content.tsx (Client Component, "use client")
      -> RunMetrics (events aggregate)
      -> RunList (selectable run list)
      -> EventLog (scrollable event table)
      -> DetailPanel (tabbed: Summary/Payload/Tokens)
      -> StatusBar (mode toggle, filters, connection indicator)
```

### Data Fetching

- `getRecentRuns` — 50 most recent workflow runs (prepared statement)
- `getRunEvents` — 500 most recent agent events (prepared statement)
- Both passed as promises to content.tsx, consumed with React.use()
- Types exported: `RunItem`, `CommandEvent`

### Realtime Integration

- Server action `getCommandCenterToken(channel)` returns Inngest subscription token
- `useInngestSubscription` hook in content.tsx with live/paused mode toggle
- Events streamed via `onEvent` callback, appended to state array
- Connection states: active, connecting, closed, error, refresh_token, closing

### State Management (content.tsx)

- `selectedRunId: string | null`
- `selectedEventId: string | null`
- `mode: "live" | "paused"`
- `events: CommandEvent[]`
- `agentFilter: string | undefined`
- `typeFilter: string | undefined`

### 8 Event Type Color/Label Mappings

| Event Type | Label | Color |
|------------|-------|-------|
| inference_complete | Inference | ev-ok |
| run.started | Started | chart-2 |
| run.completed | Completed | ev-ok |
| run.failed | Failed | destructive |
| usage.updated | Usage | chart-1 |
| part.created | Part | chart-3 |
| tool_call.output.delta | Tool | chart-4 |
| unknown | [Unknown] | chart-2 |

### Current Capabilities

- List recent runs with status indicators
- Real-time event streaming (live/paused toggle)
- Event filtering by agent name and event type
- Aggregated metrics (tokens, cost at $3/1M tokens, duration)
- Tabbed event detail view (Summary, Payload JSON, Token breakdown)
- Connection state indicator

### Identified Limitations

**No CRUD/Management:**
- No run triggering or workflow initiation
- No preset management (create/edit/delete)
- No judge personality management
- No config override UI
- No HITL approval/feedback interface

**Display Limitations:**
- No pagination (hardcoded LIMIT 50 runs, 500 events)
- No search/text filtering
- No date range filtering
- No sort options
- No export (CSV/JSON)
- No event grouping by run

**Data/Performance:**
- Unbounded memory growth (events append forever)
- No event deduplication on reconnect
- No offline fallback
- No lazy loading

---

## 5. Environment & Dependencies

### Required Env Vars

- `DATABASE_URL` — PostgreSQL connection string

### Optional Env Vars

- `DATABASE_URL_READONLY` — Read-only DB connection
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY` — LLM providers
- `GROK_BASE_URL` — Grok API endpoint
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` — Inngest credentials

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@inngest/agent-kit` | ^0.13.2 | Agent framework |
| `@inngest/realtime` | ^0.4.6 | Realtime middleware |
| `inngest` | ^3.52.0 | Event orchestration |
| `drizzle-orm` | ^0.45.1 | Database ORM |
| `zod` | ^4.3.6 | Runtime validation |
| `next` | ^16.1.6 | Web framework |
| `react` | ^19.2.4 | UI library |
| `@superbuilders/errors` | ^3.0.2 | Error handling |
| `@superbuilders/slog` | ^4.0.0 | Structured logging |

---

## 6. Gap Analysis: What's Built vs. What's Needed

### Built (Foundation Layer)

- Agent config resolution (4-level pipeline)
- Observability/telemetry collection and streaming
- Explorer and Specialist agent factories
- 5 tool tiers (Core, Analysis, Verification, Workspace, Implementation placeholder)
- Onboarding phase Inngest function (complete with network execution)
- DB schema for presets, judge personalities, workflow runs, agent events
- Command center read-only dashboard with realtime streaming
- 7 Inngest event schemas covering the full workflow lifecycle

### Not Built (Interactive Command Center Needs)

**Triggering & Workflow Management:**
- UI to send `agent/feature.requested` events (start new runs)
- UI to send `agent/feature.feedback` / `agent/feature.approved` events (HITL)
- UI to send `agent/implementation.feedback` / `agent/implementation.approved` events
- UI to send `agent/debug.escalation` events
- Run cancellation / retry

**Configuration Management:**
- CRUD for `coreAgentPreset` (create, read, update, delete presets)
- Set default preset per workflow type
- Preview resolved config before triggering run
- CRUD for `coreJudgePersonality` (manage judge personas)
- Toggle judge active/inactive status

**Enhanced Monitoring:**
- Pagination for runs and events
- Search/text filtering
- Date range filtering
- Per-agent and per-event-type metrics breakdown
- Event grouping by run
- Timeline/waterfall visualization
- Run comparison view

**Data Management:**
- Export events/runs (CSV, JSON)
- Purge old events
- Event deduplication
- Bounded event retention
