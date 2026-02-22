# Round 1: Plans & Design Documents Research

> Compiled from 3 parallel subagents reading `docs/plans/`

---

## 1. Architecture Design Summary

**System**: Multi-agent developer tooling for Incept. Agents research codebases, generate feature concepts, evaluate via judge panels, present approval-ready plans to humans. Orchestrated by Inngest with a real-time Next.js dashboard.

### Agent Roster (8 Types)

| Agent | Purpose | Default Model | Tools |
|-------|---------|--------------|-------|
| Explorer | Map ONE codebase slice | Haiku | Core + Analysis |
| Specialist | Deep-dive ONE topic | Configurable | Core + Analysis |
| Concept | Generate feature approaches | Opus | Core + Analysis |
| Critic | Poke holes in ONE concept | Configurable | Core + Analysis |
| Judge | Evaluate from persona lens | Per-personality | readClaudeMd + emitProgress |
| Reviewer | Review ONE concern dimension | Sonnet | Core + Analysis + Verification |
| Verifier | Post-implementation checks | Haiku | Core + Verification |
| Implementer | Code for ONE file/unit | Sonnet | All (including write + verification) |

### 6-Phase Pipeline

1. **Codebase Onboarding** — 6 parallel slice explorers (structure, data, api, ui, conventions, deps)
2. **Feature Concepts** — Iterative concept generation + criticism + validation
3. **Judge Panel** — 4-N parallel judges with DB-persisted personalities
4. **User Confirmation** — Event-break HITL (function ends, dashboard presents, user triggers next)
5. **Implementation** — Decomposed into file-level units, parallel waves, per-file verification
6. **Implementation Review** — Second HITL gate

**Debug Network**: Observe → Hypothesize → Verify → Fix → Confirm (max 3 attempts, then escalate)

### Config Resolution (4 Levels)

```
1. Event payload configOverrides → merge over preset
2. Event payload presetId → load from DB
3. Neither → load isDefault=true for workflow type
4. No default in DB → code DEFAULT_CONFIG
```

### HITL Pattern

Event-break (not `step.waitForEvent()`):
- Function A ends → emits "ready-for-review"
- Dashboard shows pending → user acts
- User action emits event → Function B starts with DB state

### Tool Tiers

- **Core** (read-only, all agents): readFile, listFiles, searchCode, readDirectory, readClaudeMd, emitProgress
- **Analysis** (read-only, specialists/reviewers): analyzeImports, findUsages, getGitHistory, runLint, runTypecheck
- **Verification** (all agents): verifyTypecheck, verifyLint, verifyTests, diffCheck, queryDb, verifyEndpoint, readLogs
- **Workspace** (orchestration only): createWorktree, deleteWorktree, listWorktrees, worktreeStatus
- **Implementation** (Implementer only): writeFile, editFile, runTests

### DB Schema (3 New Tables)

- **agent_presets**: Saved config presets (model + prompt per role), one default per workflow type
- **judge_personalities**: Persisted judges with slug, persona prompt, evaluation focus, model config, isActive, isBuiltIn
- **workflow_runs**: Full execution history (status, phase, configSnapshot, judgeIds, result, verificationReport, debugTraces, feedback, totalTokens, estimatedCost)

### Inngest Events

- `agent/feature.requested` — Trigger with feature, branchName, presetId?, configOverrides?, targetPath?
- `agent/feature.feedback` / `agent/feature.approved` — Plan review HITL
- `agent/implementation.feedback` / `agent/implementation.approved` — Implementation review HITL
- `agent/debug.escalation` — Debug network exhausted 3 attempts

### Dashboard (5 Views)

1. **Dashboard Home** (`/agents`) — Active workflows, ready for review, recent runs
2. **Trigger Workflow** (`/agents/workflows/new`) — Feature description, preset selector, scope, judge panel config
3. **Live Workflow Viewer** (`/agents/workflows/[runId]`) — Three-column realtime feed
4. **Plan Review** (`/agents/review/[runId]`) — Feature + approach + judge verdicts + approve/feedback
5. **Judge Management** (`/agents/judges`) — CRUD for judge personalities

### 6 Design Principles

1. Worktree Isolation per run
2. Context Frontloading before decisions
3. Systematic Debugging & Verification
4. Maximum Decomposition
5. Focused Agent Delegation (5 narrow > 1 broad)
6. Deep Observability (flight recorder)

---

## 2. Foundation Plan (16 Tasks)

### Task Inventory

| Task | Component | Key Deliverable |
|------|-----------|----------------|
| 1 | Dependencies | @inngest/agent-kit, @inngest/test, env vars (4 API keys + GROK_BASE_URL + DATABASE_URL_READONLY) |
| 2 | Events | Agent event schemas with `workflowConfigOverridesSchema` via Zod |
| 3 | Database | 3 new tables (presets, judges, workflow runs) with FK constraints, partial unique index |
| 4 | Config | Types, defaults, `applyOverrides()` with deep merge, full 4-level `resolveConfig` pipeline |
| 5 | Config | `resolveModel()` utility; Grok provider includes baseURL and XAI_API_KEY |
| 6 | Tools | Filesystem tools (readFile, listFiles, searchCode, readDirectory) |
| 7 | Tools | Analysis tools (analyzeImports, findUsages, getGitHistory, runLint, runTypecheck) |
| 8 | Tools | Conventions tool (readClaudeMd → renamed readConventions) |
| 9 | Tools | Progress tool (emitProgress) wired to Inngest Realtime |
| 10 | Workspace | Worktree management as `createTool()` wrappers at `src/agents/tools/workspace.ts` |
| 11 | Tools | All 7 verification tools using shared `runCheck` primitive |
| 12 | Agent | Explorer agent factory with Core + Analysis tools + `extraTools` parameter |
| 13 | Agent | Specialist agent factory with Core + Analysis + Verification tools |
| 14 | Primitive | Onboarding primitive: `buildSlicePrompt`, `createSliceNetwork`, `saveSummaryTool` wired via `extraTools` |
| 15 | Inngest | `agent/onboard` function: creates workflow_run, resolves config, creates worktree, 6 parallel slices, consolidates, persists |
| 16 | Integration | Smoke test against live codebase |

### Key Implementation Patterns

- **TDD vertical slices**: RED → GREEN per task, not horizontal
- **Handler export pattern**: Handlers exported separately from tool definitions for direct testability
- **`.nullable()` for AgentKit**: Intentional deviation at tool schema boundaries for JSON Schema compat
- **`saveSummaryTool` wiring**: Via `extraTools` parameter on `createExplorerAgent`, passed in `createSliceNetwork`
- **Config resolution**: `resolveConfig` calls `loadDefaultPreset` → `loadPreset` → `applyOverrides`
- **`workflow_run` creation**: Dedicated step at function start for dashboard and HITL events
- **Context persistence**: `CodebaseContext` written to `workflow_run.result` column after exploration
- **Parallel slices**: 6 `step.run()` calls wrapped in `Promise.all()` for Inngest checkpointing

### Future Plans (Not in This Document)

- Plan 2: Concept Network + Critic + Judge Panel (Phases 2-3)
- Plan 3: Implementation Phase + Debug Network (Phases 5-6)
- Plan 4: Full Pipeline Orchestration (Wire all phases with HITL events)
- Plan 5: Dashboard enhancements (HITL controls, trigger UI, review workflows, judge management)

---

## 3. Audit Findings

### Critical Gaps (C1-C6) — All Addressed in Plan Revision

| ID | Issue | Resolution in Plan |
|----|-------|-------------------|
| C1 | `saveSummaryTool` not wired into explorer | `extraTools` parameter added to Task 12, passed in Task 14 |
| C2 | `workflow_runs` record never created | Dedicated step in Task 15 at function start |
| C3 | `CodebaseContext` never persisted to DB | Task 15 writes to `workflow_run.result` column |
| C4 | Config resolution pipeline incomplete | Full 4-level pipeline in Task 4 |
| C5 | `configOverrides` typed as `Record<string, unknown>` | Typed via `workflowConfigOverridesSchema` in Task 2 |
| C6 | `as Partial<WorkflowConfig>` unsafe assertion | Zod `safeParse` in Task 15 |

### High-Severity Gaps (H1-H10) — All Addressed

| ID | Issue | Resolution |
|----|-------|-----------|
| H1 | 3 of 7 verification tools missing | All 7 in Task 11 |
| H2 | No `DATABASE_URL_READONLY` env var | Added in Task 1 |
| H3 | Explorer missing analysis tools | All 5 in Task 12 |
| H4 | `src/agents/index.ts` never created | Created after Tasks 12-13 (barrel module) |
| H5 | Worktree lifecycle not wired into Inngest | Wired in Task 15 |
| H6 | `focus` and `depth` params unused | Used in Task 14 (buildSlicePrompt and maxIter) |
| H7 | `presetId` from event never consumed | Consumed in Task 15 config resolution |
| H8 | `relevantFiles` always `[]` | Collected per slice in Task 14 |
| H9 | Multiple `??` nullish coalescing violations | Replaced with explicit validation |
| H10 | Workspace tools at wrong path/API | Correct path and `createTool()` wrappers in Task 10 |

---

## 4. OpenClaw Research Key Takeaways

### Adopted Patterns

- **Factory function wrapping** — ~100 adapter files wrapping agent calls with auth, token accounting, failover
- **Cascading tool tiers** — Global → provider → agent → group → sandbox (lower layers only restrict)
- **Event-driven orchestration** — Event bus, hooks on named events
- **Skills as markdown convention context** — YAML + markdown frontmatter, LLM reads and decides when to apply
- **Steerability over autonomy** — Most durable lesson: agents must be visible and interactive

### Rejected Patterns

- Session trees (ephemeral per-run model)
- Hybrid RAG memory (no cross-run persistence needed)
- Channel adapters (one interface: web dashboard)
- Plugin marketplace (fixed agent roster)
- MCP integrations (token cost too high; use standard CLIs)

### Anti-Patterns to Avoid

- Security as afterthought (default: deny all, require explicit expansion)
- Unbounded token costs (budget per workflow, track as structured events)
- Opt-in safety features (security-relevant features ON by default)

---

## 5. Skills Alignment

### Relevant Skills (6)

- `next-best-practices` — RSC boundaries, async patterns, data patterns (HIGH)
- `next-cache-components` — PPR, `use cache`, cacheLife, cacheTag (HIGH)
- `vercel-composition-patterns` — Compound components, boolean prop avoidance (HIGH)
- `vercel-react-best-practices` — 57 performance rules: streaming, derived state, memo (HIGH)
- `building-components` — Accessible, composable UI patterns (MEDIUM)
- `web-design-guidelines` — Design token enforcement (PERIPHERAL)

### Conflicts (4, All Resolvable)

1. `next-cache-components` shows `async` cached components vs. project bans `async` pages → Ban applies to `page.tsx` only
2. `vercel-composition-patterns` uses dot-notation → Use named ESM exports instead
3. `next-best-practices/data-patterns` shows `async function Dashboard()` → Project rule overrides
4. `next-best-practices/rsc-boundaries` says "Server Components can be async" → Project rule overrides

### Critical Gap

**Inngest Realtime SSE in RSC Promise-Passing Pattern** — Must author `inngest-realtime-rsc` skill before building Live Workflow Viewer. No existing skill covers the intersection of Inngest Realtime + `React.use()` + Suspense.

### Skill Delivery Strategy

Deliver at agent factory time via system prompt injection (20-30K tokens once per spawn), NOT per-tool-call. Only Implementer and Reviewer agents need skills. Explorers do not.

---

## Summary

The agent foundation is designed as a 6-phase pipeline with 8 specialized agent types, 5 tool tiers, 4-level config resolution, event-break HITL gates, and a flight-recorder dashboard. The 16-task implementation plan builds bottom-up: dependencies → schema → config → tools → agents → primitives → Inngest function → integration test. All critical and high-severity audit gaps were addressed in the plan revision. The immediate next work is Plans 2-5 covering Concept Networks, Implementation Phase, Pipeline Orchestration, and Dashboard enhancements.
