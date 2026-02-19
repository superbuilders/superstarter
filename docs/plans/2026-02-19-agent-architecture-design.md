# Agent Architecture Design

Date: 2026-02-19

## Overview

A multi-agent developer tooling system for building Incept features. Agents research codebases, generate feature concepts, evaluate approaches through configurable judge panels, and present plans for human approval — all orchestrated via Inngest with a real-time Next.js dashboard.

## Decisions

| Decision | Choice |
|----------|--------|
| Purpose | Developer tooling for building Incept |
| Workflows | Codebase exploration, feature implementation, code review |
| Trigger | Event-driven (Inngest) with real-time web dashboard |
| Comparison | Parallel specialists + configurable judge panel |
| Memory | Ephemeral per-run |
| LLM | Multi-provider (model configurable per agent) |
| Architecture | Inngest AgentKit Networks |
| Config | DB-persisted presets with runtime overrides |

## Design Principles

Six principles derived from observed workflow patterns. These are non-negotiable architectural constraints.

### 1. Worktree Isolation

Every workflow run operates in its own git worktree. No shared working directories. This provides:
- Clean filesystem state per workflow (no cross-contamination)
- Parallel workflows on the same repo without conflicts
- Atomic rollback (delete the worktree to undo everything)
- Branch-per-feature enforced at the infrastructure level

The orchestration layer manages the full worktree lifecycle: create on workflow start, persist during human review, delete on abandonment.

### 2. Context Frontloading

Agents fail when they guess. They succeed when they have complete context before acting. Every agent phase MUST gather all relevant context before making decisions or generating output:
- Onboarding runs BEFORE concept generation, not during
- Implementation agents receive the full plan + codebase context + conventions, never a summary
- Debugging agents receive the exact error output + relevant source + recent git diff, not a description of the problem

The cost of over-gathering context is low (extra tokens). The cost of under-gathering is catastrophic (wasted iterations, wrong approaches, compounding errors).

### 3. Systematic Debugging & Verification

No agent output is trusted without verification. Every write operation is followed by a reality check:
- After code generation: typecheck + lint + test
- After schema changes: verify the migration applies, query the DB to confirm structure
- After any claim about codebase state: read the actual file, don't rely on memory
- After integration: run the affected code path end-to-end

Agents must diagnose before attempting fixes. The pattern is: observe (read error/state) → hypothesize (one specific root cause) → verify hypothesis (read relevant code) → fix (targeted change) → confirm (re-run). Never shotgun fixes.

### 4. Maximum Decomposition

Every task is split into the smallest independently-executable pieces. This applies to:
- **Research**: Each aspect of codebase exploration is a separate subagent with a focused scope
- **Implementation**: Each file or logical unit is a separate step, not a monolithic "implement everything"
- **Debugging**: Each hypothesis is tested independently
- **Review**: Each concern (types, conventions, logic, performance) is a separate reviewer

The decomposition boundary is: "Can this piece be done without knowing the result of another piece?" If yes, they're independent and parallelizable.

### 5. Focused Agent Delegation

Agents have narrow scopes and small context windows. A single agent should never:
- Explore AND implement
- Generate AND evaluate
- Touch more than one logical concern at a time

Prefer spawning 5 focused subagents over 1 broad agent. Each subagent gets only the context it needs for its specific task. This prevents context pollution and makes failures isolated and recoverable.

### 6. Deep Observability

Every agent decision, tool call, and state transition is visible to the operator. This means:
- Every agent emits structured progress events (not just "working on it" — what specifically it's doing and why)
- Tool call inputs AND outputs are logged (what file was read, what the content was, what decision was made from it)
- Decision points are explicit events (why concept A was chosen over B, why a file was modified)
- Verification results are always surfaced (typecheck passed/failed with exact output, test results with assertion details)
- Token usage per agent per step is tracked for cost awareness

The dashboard is not a summary view — it's a flight recorder. You should be able to reconstruct the full reasoning chain of any workflow run.

## System Architecture

Four layers, bottom-up:

```
┌──────────────────────────────────────────────────────────────────┐
│                         WEB DASHBOARD                            │
│  Flight recorder UI: full agent reasoning chains, tool I/O,     │
│  decision traces, verification results, cost tracking            │
│  (Next.js RSC + Inngest Realtime)                               │
├──────────────────────────────────────────────────────────────────┤
│                      ORCHESTRATION LAYER                         │
│  Inngest Functions: event triggers, step parallelism,            │
│  durability, human-in-the-loop event breaks                      │
│  Decomposition: every parallelizable piece is a separate step    │
├──────────────────────────────────────────────────────────────────┤
│                        AGENT LAYER                               │
│  Narrow-scope agents as factory functions                        │
│  Each agent gets ONLY the context for its specific task          │
│  Networks for iterative phases, plain calls otherwise            │
├──────────────────────────────────────────────────────────────────┤
│                         TOOL LAYER                               │
│  Shared createTool() definitions with Zod params                 │
│  Read-only tools shared freely                                   │
│  Write tools restricted to implementation agents                 │
│  Verification tools available to all (typecheck, lint, test, DB) │
├──────────────────────────────────────────────────────────────────┤
│                      WORKSPACE LAYER                             │
│  Git worktree lifecycle: create, persist, cleanup                │
│  One worktree per workflow run — full filesystem isolation        │
│  Branch management, conflict detection, atomic rollback          │
└──────────────────────────────────────────────────────────────────┘
```

## Source Layout

```
src/
├── agents/
│   ├── config.ts            # WorkflowConfig type, DEFAULT_CONFIG, resolveConfig(), resolveModel()
│   ├── tools/
│   │   ├── filesystem.ts    # readFile, listFiles, searchCode, readDirectory
│   │   ├── analysis.ts      # runLint, runTypecheck, analyzeImports, findUsages, getGitHistory
│   │   ├── conventions.ts   # readClaudeMd (reads CLAUDE.md + rules/*.md)
│   │   ├── progress.ts      # emitProgress (realtime updates via Inngest, with full tool I/O)
│   │   ├── verification.ts  # verifyTypecheck, verifyLint, verifyTests, queryDb, diffCheck
│   │   ├── workspace.ts     # createWorktree, deleteWorktree, listWorktrees, worktreeStatus
│   │   └── implementation.ts # writeFile, editFile, runTests (restricted to implementer)
│   ├── agents/
│   │   ├── explorer.ts      # createExplorerAgent(config) — maps codebase architecture
│   │   ├── specialist.ts    # createSpecialistAgent(config) — deep-dive research on ONE topic
│   │   ├── concept.ts       # createConceptAgent(config) — generates feature approaches
│   │   ├── critic.ts        # createCriticAgent(config) — pokes holes in concepts
│   │   ├── judge.ts         # createJudgeAgent(personality) — evaluates from a persona
│   │   ├── reviewer.ts      # createReviewerAgent(config) — reviews ONE concern (types/logic/perf)
│   │   ├── verifier.ts      # createVerifierAgent(config) — post-implementation reality checks
│   │   └── implementer.ts   # createImplementerAgent(config) — generates code for ONE file/unit
│   ├── networks/
│   │   ├── explore.ts       # Exploration network (iterative codebase mapping)
│   │   ├── implement.ts     # Implementation network (iterative code + verify loop)
│   │   └── debug.ts         # Debug network (observe → hypothesize → verify → fix → confirm)
│   ├── primitives/
│   │   ├── onboard.ts       # Reusable codebase onboarding (parallel subagents)
│   │   └── verify.ts        # Reusable verification primitive (typecheck + lint + test + DB)
│   └── index.ts             # Re-exports, shared types
├── inngest/
│   ├── functions/
│   │   └── agent-feature.ts # Main feature development pipeline
├── app/(dashboard)/agents/
│   ├── error.tsx                           # Dashboard-wide error boundary
│   ├── page.tsx + content.tsx              # Dashboard home
│   ├── workflows/
│   │   ├── [runId]/
│   │   │   ├── page.tsx + content.tsx      # Live workflow viewer
│   │   │   ├── error.tsx + loading.tsx + not-found.tsx
│   │   └── new/
│   │       ├── page.tsx + content.tsx      # Trigger new workflow
│   ├── judges/
│   │   ├── page.tsx + content.tsx          # Judge personality list
│   │   └── [judgeId]/
│   │       ├── page.tsx + content.tsx      # Edit/create judge
│   │       ├── error.tsx + loading.tsx + not-found.tsx
│   ├── presets/
│   │   ├── page.tsx + content.tsx          # Agent config presets
│   └── review/
│       └── [runId]/
│           ├── page.tsx + content.tsx      # Plan review + feedback
│           ├── error.tsx + loading.tsx + not-found.tsx
```

## Tool Layer

Tools are atomic capabilities shared across agents. Each is a `createTool()` with Zod-validated parameters.

### Core Tools (read-only, shared freely)

| Tool | Parameters | Purpose |
|------|-----------|---------|
| `readFile` | `{ path: string }` | Read file contents with line numbers |
| `listFiles` | `{ glob: string, path?: string }` | List files matching a glob pattern |
| `searchCode` | `{ pattern: string, glob?: string }` | Ripgrep-style content search |
| `readDirectory` | `{ path: string, depth?: number }` | Tree-style directory listing |
| `readClaudeMd` | `{}` | Read CLAUDE.md + all rules/*.md for conventions |
| `emitProgress` | `{ stage: string, detail: string }` | Push realtime update to dashboard |

### Analysis Tools (read-only, for specialists/reviewers)

| Tool | Parameters | Purpose |
|------|-----------|---------|
| `analyzeImports` | `{ path: string }` | Map import graph for a file |
| `findUsages` | `{ symbol: string, glob?: string }` | Find all references to a symbol |
| `getGitHistory` | `{ path: string, count?: number }` | Recent commits touching a file |
| `runLint` | `{ path: string }` | Run `bun lint` on a file/directory |
| `runTypecheck` | `{ path?: string }` | Run `bun typecheck`, return errors |

### Verification Tools (available to all agents)

Every agent can verify claims against reality. These tools enforce Principle 3 (Systematic Debugging & Verification).

| Tool | Parameters | Purpose |
|------|-----------|---------|
| `verifyTypecheck` | `{ path?: string }` | Run `bun typecheck`, return exact errors with file:line |
| `verifyLint` | `{ path?: string }` | Run `bun lint`, return violations with rule names |
| `verifyTests` | `{ path?: string, filter?: string }` | Run `bun test`, return pass/fail with assertion details |
| `queryDb` | `{ query: string, readonly: true }` | Execute read-only SQL to verify schema/data assumptions |
| `diffCheck` | `{ base?: string }` | `git diff` against base branch, returns exact changes |
| `verifyEndpoint` | `{ method: string, path: string, body?: unknown }` | Hit a local endpoint and return status + response body |
| `readLogs` | `{ filter?: string, lines?: number }` | Read recent application logs matching a filter |

The `queryDb` tool is critical: agents must verify database state rather than assuming schema matches expectations. Read-only enforced at the connection level (separate read-only DB user).

### Workspace Tools (orchestration layer only)

Worktree lifecycle management. These enforce Principle 1 (Worktree Isolation).

| Tool | Parameters | Purpose |
|------|-----------|---------|
| `createWorktree` | `{ branch: string, baseBranch?: string }` | Create isolated worktree from branch |
| `deleteWorktree` | `{ path: string }` | Clean up worktree after workflow completes or is abandoned |
| `listWorktrees` | `{}` | List all active worktrees with branch + status |
| `worktreeStatus` | `{ path: string }` | Git status + recent commits in a specific worktree |

### Implementation Tools (restricted to implementer agent)

| Tool | Parameters | Purpose |
|------|-----------|---------|
| `writeFile` | `{ path: string, content: string }` | Write/create a file |
| `editFile` | `{ path: string, old: string, new: string }` | Find-and-replace edit |
| `runTests` | `{ path?: string }` | Run `bun test` on a file/directory |

Tool capability boundaries enforce agent roles: exploration agents cannot write files, judges cannot touch the codebase. ALL agents can verify (typecheck, lint, test, query DB).

## Agent Definitions

Every agent is a **factory function** that accepts runtime config. No hardcoded models or prompts.

### Agent Roster

Each agent has a **narrow scope**. Prefer spawning multiple focused agents over one broad agent (Principle 5).

| Agent | Purpose | Scope Constraint | Default Model | Tools |
|-------|---------|-------------------|--------------|-------|
| Explorer | Map ONE slice of codebase architecture | Single directory or concern | Haiku | Core + Analysis |
| Specialist | Deep-dive research on ONE specific topic | Single question/topic | Configurable | Core + Analysis |
| Concept | Generate feature implementation approaches | Single feature | Opus | Core + Analysis |
| Critic | Poke holes in ONE concept | Single concept at a time | Configurable | Core + Analysis |
| Judge | Evaluate from a specific persona | Single evaluation lens | Per-personality | readClaudeMd + emitProgress |
| Reviewer | Review ONE concern (types OR logic OR perf) | Single review dimension | Sonnet | Core + Analysis + Verification |
| Verifier | Post-implementation reality checks | Single verification pass | Haiku | Core + Verification + queryDb |
| Implementer | Generate code for ONE file or logical unit | Single file/module | Sonnet | All (including write + verification) |

**Key changes from original:**
- Explorer scoped to ONE directory/concern (spawn 6 for full codebase, not 1)
- Reviewer split by concern dimension (spawn separate type/logic/perf reviewers)
- Implementer scoped to ONE file (spawn per-file implementers in parallel)
- Verifier added as a mandatory post-write agent
- All agents get verification tools (Principle 3)

### Agent Factory Pattern

```typescript
function createExplorerAgent(config: AgentConfig): Agent {
    return createAgent({
        name: "Explorer",
        description: "Maps codebase architecture and patterns",
        model: resolveModel(config.model),
        system: config.systemPrompt,
        tools: [readFile, listFiles, searchCode, readDirectory, readClaudeMd, emitProgress],
    })
}
```

Dynamic system prompts can layer network state on top of the configured base prompt via AgentKit's `system: async ({ network }) => ...` pattern.

## Configuration System

### Config Shape

```typescript
interface AgentConfig {
    model: ModelConfig
    systemPrompt: string
}

interface ModelConfig {
    provider: "anthropic" | "openai" | "gemini" | "grok"
    model: string
    parameters?: Record<string, unknown>
}

interface WorkflowConfig {
    explorer: AgentConfig
    specialist: AgentConfig
    concept: AgentConfig
    critic: AgentConfig
    reviewer: AgentConfig
    implementer: AgentConfig
}
```

### Resolution Order

```
1. Event payload has configOverrides?  → merge over preset
2. Event payload has presetId?         → load from DB
3. Neither?                            → load isDefault=true for this workflow type
4. No default in DB?                   → fall back to DEFAULT_CONFIG in code
```

Four levels: code defaults → DB default preset → named preset → per-run overrides.

### Config Loading

```typescript
async function resolveConfig(
    workflowType: string,
    presetId?: string,
    overrides?: Partial<WorkflowConfig>,
): Promise<WorkflowConfig> {
    let config = structuredClone(DEFAULT_CONFIG)
    const preset = presetId
        ? await loadPreset(presetId)
        : await loadDefaultPreset(workflowType)
    if (preset) config = deepMerge(config, preset.config)
    if (overrides) config = deepMerge(config, overrides)
    return config
}
```

## Database Schema

Three new tables added to `src/db/schemas/core.ts`:

### agent_presets

Saved agent configuration presets (model + prompt per agent role).

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| name | varchar(255) | Human-readable name ("default", "fast-explore") |
| workflowType | varchar(64) | "feature" / "explore" / "review" |
| config | jsonb | Full WorkflowConfig |
| isDefault | boolean | One default per workflow type |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### judge_personalities

Persisted judge personas with system prompts and model config.

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| name | varchar(255) | Display name ("The Skeptic") |
| slug | varchar(64) unique | URL-safe identifier ("skeptic") |
| persona | text | Full system prompt |
| evaluationFocus | text | What this judge specifically evaluates |
| model | jsonb | ModelConfig (provider + model + params) |
| isActive | boolean | Toggle on/off without deleting |
| isBuiltIn | boolean | Shipped defaults vs user-created |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### workflow_runs

Tracks each workflow execution, status, results, verification reports, and cost.

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| feature | text | User's feature description |
| branchName | varchar(255) | Feature branch name |
| worktreePath | varchar(500) | Git worktree path (set on Phase 5 start) |
| worktreeStatus | varchar(32) | "pending" / "active" / "merged" / "deleted" |
| status | varchar(32) | "running" / "plan-review" / "implementing" / "impl-review" / "debug-escalated" / "approved" / "merged" / "failed" |
| phase | varchar(32) | Current phase name |
| presetId | uuid | FK to agent_presets |
| configSnapshot | jsonb | Frozen config at run time (for reproducibility) |
| judgeIds | jsonb | Which judge personalities participated |
| result | jsonb | Final plan + verdicts (set when plan-review) |
| verificationReport | jsonb | Full verification suite results (set after Phase 5) |
| debugTraces | jsonb | Array of debug network traces if any failures occurred |
| feedback | text | User feedback if reworking |
| inngestRunId | varchar(255) | Link to Inngest traces |
| totalTokens | integer | Total tokens consumed across all agents |
| estimatedCost | numeric(10,4) | Estimated cost in USD |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Shipped Judge Personalities

| Name | Slug | Focus |
|------|------|-------|
| The Skeptic | skeptic | Failure modes, edge cases, unstated assumptions |
| Technical Architect | architect | Structural soundness, SOLID, coupling, scalability |
| Linus Torvalds | linus | Simplicity, zero tolerance for over-engineering |
| The Pragmatist | pragmatist | Ship velocity vs. quality trade-offs |

Users can create additional judge personalities from the dashboard at any time. New judges are persisted to DB and immediately available for workflow runs.

## Feature Development Pipeline

The primary workflow. Four phases, each callable independently but designed to flow as a pipeline.

### Phase 1: Codebase Onboarding (Reusable Primitive)

A callable function (not a workflow) that spawns parallel subagents to explore different slices of the codebase. Each subagent has a clean context window — only reads its assigned slice. A consolidation agent merges summaries into structured output.

```
onboard(scope: OnboardingScope): Promise<CodebaseContext>
│
├── step.run("map-structure")     → directory tree, entry points, config
├── step.run("map-data-layer")    → DB schema, ORM patterns, migrations
├── step.run("map-api-layer")     → routes, server actions, API patterns
├── step.run("map-ui-layer")      → components, layouts, client/server split
├── step.run("map-conventions")   → CLAUDE.md rules, lint config, error patterns
├── step.run("map-dependencies")  → package.json, key libraries, usage
│
└── step.run("consolidate")       → merge all summaries into CodebaseContext
```

**Scoped exploration:** The caller passes `OnboardingScope` — full codebase, specific directory, or specific topic. This lets later phases call onboarding narrowly for validation.

```typescript
interface OnboardingScope {
    targetPath: string
    focus?: string
    depth: "shallow" | "deep"
    slices: string[]
}

interface CodebaseContext {
    structure: string
    dataLayer: string
    apiLayer: string
    uiLayer: string
    conventions: string
    dependencies: string
    relevantFiles: Array<{ path: string, summary: string }>
}
```

### Phase 2: Feature Concepts (Iterative Network)

Generates 2+ distinct approaches to implementing the feature, then iterates using codebase validation and criticism subagents.

```
concepts(feature: string, context: CodebaseContext): Promise<ConceptResult>
│
│  LOOP:
│    Concept Agent generates/refines approaches
│    For each concept:
│      ├── onboard(shallow, targeted) → validate against codebase
│      └── Critic subagent → poke holes
│    Concept Agent evaluates:
│      → Drop concepts that don't hold up
│      → Refine promising ones
│      → Generate new if all dropped
│    Exit when: best concept survives criticism, max iterations, or all abandoned
│
└── Returns: { concepts: RankedConcept[], bestConcept, iterations }
```

This phase uses an AgentKit Network because the iteration count is unknown and routing depends on concept quality.

```typescript
interface ConceptNetworkState {
    feature: string
    codebaseContext: CodebaseContext
    concepts: Array<{
        id: string
        name: string
        description: string
        approach: string
        codeSketch: string
        criticisms: string[]
        refinements: string[]
        status: "active" | "dropped" | "refined"
    }>
    iterationCount: number
    phase: "generating" | "validating" | "criticizing" | "refining" | "converged"
}
```

### Phase 3: Judge Panel (Configurable Personalities)

A panel of judge agents — loaded from DB — evaluates the best concept in parallel. Each judge has a distinct personality and evaluation lens.

```
judge(plan: Concept, context: CodebaseContext): Promise<JudgingResult>
│
├── Load active judges from DB
│
├── Parallel (one Inngest step per judge):
│   Each judge evaluates from their persona
│   Each can call onboard(shallow) to verify claims
│
├── step.run("synthesize-verdicts")
│   Combines into: consensus, contentious points, blocking issues
│
└── Returns: JudgingResult {
        verdicts, synthesis, overallScore, proceed: boolean
    }
```

If blocking issues exist, the pipeline loops back to Phase 2 with judge feedback.

### Phase 4: User Confirmation (Human-in-the-Loop)

The plan + judge verdicts are presented via the dashboard. The Inngest function completes with "ready-for-review" status. Human input triggers a separate event.

- **Approve** → emits `agent/feature.approved` → proceeds to Phase 5
- **Feedback** → emits `agent/feature.feedback` → pipeline re-enters Phase 2 with feedback context

This event-break pattern prevents Inngest functions from blocking indefinitely on human input.

### Phase 5: Implementation (Decomposed + Verified)

Approved plans are decomposed into independent implementation units and executed in parallel. Every write is immediately verified.

```
implement(plan: ApprovedPlan, context: CodebaseContext): Promise<ImplementationResult>
│
├── step.run("create-worktree")
│   → Create isolated worktree from feature branch
│
├── step.run("decompose-plan")
│   → Split plan into independent file-level implementation units
│   → Identify dependencies between units (which must be sequential)
│   → Group independent units into parallel waves
│
├── For each wave (sequential):
│   ├── Parallel (one step per unit in wave):
│   │   ├── Implementer agent writes ONE file/module
│   │   ├── Verifier agent immediately checks:
│   │   │   ├── typecheck passes for this file
│   │   │   ├── lint passes for this file
│   │   │   └── if DB changes: queryDb to confirm schema
│   │   └── If verification fails → enters Debug Network
│   │
│   └── step.run("wave-integration-check")
│       → typecheck + lint across all files in wave
│       → run affected tests
│
├── step.run("full-verification")
│   → Full typecheck + lint + test suite
│   → DB schema verification (if applicable)
│   → Endpoint smoke tests (if applicable)
│   → Git diff review (sanity check changes are reasonable)
│
└── Returns: ImplementationResult {
        files: ModifiedFile[],
        verificationReport: VerificationReport,
        worktreePath: string
    }
```

### Debug Network (Triggered on Verification Failure)

When any verification step fails, the debug network activates. This enforces Principle 3 — diagnose before fixing.

```
debug(failure: VerificationFailure, context: CodebaseContext): Promise<DebugResult>
│
│  STRICT SEQUENCE (no skipping steps):
│    1. OBSERVE  → Read exact error output + relevant source files
│    2. HYPOTHESIZE → Form ONE specific root cause hypothesis
│    3. VERIFY HYPOTHESIS → Read code/state that would confirm or refute
│    4. FIX → Make ONE targeted change addressing the root cause
│    5. CONFIRM → Re-run the exact verification that failed
│
│  If CONFIRM fails:
│    → Increment attempt counter
│    → If attempts < 3: loop back to OBSERVE with new state
│    → If attempts >= 3: STOP. Emit failure event for human review.
│      Do NOT keep guessing.
│
└── Returns: DebugResult {
        rootCause: string,
        fix: string,
        attempts: number,
        resolved: boolean
    }
```

The 3-attempt hard limit prevents the shotgun-fix anti-pattern. After 3 attempts, the agent lacks the right mental model and human intervention is required. The full debug trace (all observations, hypotheses, and attempted fixes) is surfaced in the dashboard for the human to diagnose.

### Phase 6: Implementation Review (Human-in-the-Loop)

After Phase 5, the implementation + verification report is presented for human review before merge.

- **Approve** → merge worktree branch, clean up worktree
- **Feedback** → re-enter Phase 5 with specific feedback
- **Reject** → delete worktree, archive run as rejected

### Pipeline Event Schema

```typescript
// Trigger — worktree is created by the pipeline, not passed in
type FeatureRequested = {
    name: "agent/feature.requested"
    data: {
        feature: string
        baseBranch?: string          // defaults to main
        branchName: string           // feature branch name
        presetId?: string
        configOverrides?: Partial<WorkflowConfig>
        targetPath?: string          // scope within repo
    }
}

// Human-in-the-loop (plan review)
type FeatureFeedback = {
    name: "agent/feature.feedback"
    data: { runId: string, feedback: string }
}

type FeatureApproved = {
    name: "agent/feature.approved"
    data: { runId: string }
}

// Human-in-the-loop (implementation review)
type ImplementationFeedback = {
    name: "agent/implementation.feedback"
    data: { runId: string, feedback: string }
}

type ImplementationApproved = {
    name: "agent/implementation.approved"
    data: { runId: string, merge: boolean }
}

// Debug escalation (3 attempts exhausted)
type DebugEscalation = {
    name: "agent/debug.escalation"
    data: {
        runId: string
        failure: string
        attempts: Array<{ hypothesis: string, fix: string, result: string }>
    }
}
```

## Dashboard Design

Five views built with Next.js App Router following the project's `page.tsx` + `content.tsx` RSC pattern. Real-time updates via Inngest Realtime (SSE).

### Next.js Architectural Requirements

**Async Params (Next.js 15+):** All dynamic route pages type `params` as `Promise<{}>` and chain data fetches via `.then()`. No `await` in server components.

**Error Boundaries:** Every route segment with dynamic data gets:
- `error.tsx` — client component with error/reset props
- `not-found.tsx` — for missing resources (workflows, judges)
- Global `(dashboard)/error.tsx` as catch-all

**Loading States:** Every dynamic route gets a `loading.tsx` with skeleton UI matching the view layout.

**Cache Strategy (Partial Prerendering):**
- **Static:** Dashboard shell, navigation, layout — auto-prerendered
- **Cached (`'use cache'`):** Recent runs list (`cacheLife('minutes')`), workflow history, aggregate stats
- **Dynamic (no cache):** Realtime Inngest event streams, live workflow status, active agent output

**Code Splitting:** Non-critical dashboard views (judge management, presets, workflow history) use `next/dynamic` with `ssr: false` and loading skeletons. Only the active workflow viewer and trigger form are in the critical bundle.

**Server Actions:** All form mutations (trigger workflow, save preset, create/edit judge, submit feedback) use Server Actions with `revalidateTag()` for cache invalidation. Route Handlers are reserved for the Inngest webhook only.

### Realtime Event Serialization

Inngest realtime events cross the server → client boundary. All event data must be JSON-serializable:
- Timestamps as ISO strings, not Date objects
- No function references, class instances, or DB client refs
- Typed at the boundary via a shared `WorkflowEvent` union (see below)

The `content.tsx` client component subscribes to the Inngest realtime stream and receives only serializable `WorkflowEvent` objects. The `page.tsx` server component initiates the subscription and passes it as a promise.

### Accessibility Architecture

**Live Workflow Viewer:** The activity feed uses `aria-live="polite"` for routine updates (agent progress, phase transitions) and `aria-live="assertive"` for critical events (errors, workflow completion). This ensures screen readers announce realtime changes.

**Keyboard Navigation:** Dashboard list views (workflow list, judge list) use roving focus with Arrow keys. Modal-like forms (trigger workflow, edit judge) use focus traps.

### Module Boundaries

`src/agents/index.ts` is the single import point for agent-related code. Other modules import from `@/agents`, never from subdirectories like `@/agents/tools/filesystem`. This enables internal refactoring without breaking dependents.

### View 1: Dashboard Home (`/agents`)

Command center showing active workflows, items ready for review, and recent runs.

- **Active Workflows** — live progress bars with current phase
- **Ready for Review** — plans awaiting human approval
- **Recent Runs** — completed/failed workflow history
- **Quick actions** — [+ New Workflow], [Judges], [Presets]

### View 2: Trigger Workflow (`/agents/workflows/new`)

Configure and launch a new feature development workflow.

- **Feature description** textarea
- **Worktree selection** (branch picker)
- **Scope** directory selection
- **Agent config** — preset selector with inline editing per agent (model + prompt)
- **Judge panel** — checkboxes for active judges, inline "add judge for this run"
- **Save as Preset** and **Start Workflow** actions

### View 3: Live Workflow Viewer (`/agents/workflows/[runId]`)

Real-time view of a running workflow. Three-column layout:

- **Left sidebar** — pipeline phases with status (done/active/pending)
- **Center** — live activity feed (auto-scrolling agent events, verdicts, progress)
- **Bottom** — expandable sections for concepts, onboarding context

Each pipeline phase is clickable to show detailed results from that phase.

### View 4: Plan Review (`/agents/review/[runId]`)

Human-in-the-loop confirmation page.

- **Feature description**
- **Selected approach** with implementation steps and files to create/modify
- **Judge verdicts** — score bars per judge with expandable full verdicts
- **Synthesis** — consensus, contentious points, blocking issues
- **Feedback textarea** + **[Send Feedback & Rework]** / **[Approve & Proceed]** buttons

### View 5: Judge Management (`/agents/judges`)

CRUD for judge personalities.

- **List view** — name, model, active status, built-in vs custom
- **Edit view** — name, slug, persona prompt, evaluation focus, model selection
- **Toggle active/inactive** without deleting
- **Create new** judge personality form

### Realtime Event Types

The event stream is the flight recorder (Principle 6). Every event includes enough detail to reconstruct agent reasoning without reading raw logs.

```typescript
type WorkflowEvent =
    // Phase lifecycle
    | { type: "phase.started", phase: PhaseName, timestamp: number }
    | { type: "phase.completed", phase: PhaseName, timestamp: number, durationMs: number }

    // Agent lifecycle + observability
    | { type: "agent.spawned", agentName: string, role: string, model: string, scope: string }
    | { type: "agent.tool_call", agentName: string, tool: string, input: unknown, output: unknown }
    | { type: "agent.decision", agentName: string, decision: string, reasoning: string }
    | { type: "agent.progress", agentName: string, detail: string }
    | { type: "agent.completed", agentName: string, summary: string, tokenUsage: TokenUsage }
    | { type: "agent.error", agentName: string, error: string, context: unknown }

    // Concept phase
    | { type: "concept.generated", concept: ConceptSummary }
    | { type: "concept.dropped", conceptId: string, reason: string }
    | { type: "concept.refined", conceptId: string, changes: string }

    // Judge phase
    | { type: "judge.verdict", judgeName: string, score: number, summary: string }
    | { type: "synthesis.complete", result: JudgingResult }

    // Implementation phase
    | { type: "worktree.created", path: string, branch: string }
    | { type: "worktree.deleted", path: string, reason: string }
    | { type: "implementation.wave_started", waveIndex: number, units: string[] }
    | { type: "implementation.unit_completed", file: string, status: "success" | "needs_debug" }
    | { type: "implementation.wave_completed", waveIndex: number, passed: boolean }

    // Verification (every check result is surfaced)
    | { type: "verification.typecheck", passed: boolean, errors: string[] }
    | { type: "verification.lint", passed: boolean, violations: string[] }
    | { type: "verification.tests", passed: boolean, results: TestResult[] }
    | { type: "verification.db_query", query: string, result: unknown }
    | { type: "verification.full_suite", passed: boolean, report: VerificationReport }

    // Debug network
    | { type: "debug.started", failure: string, file: string }
    | { type: "debug.hypothesis", attempt: number, hypothesis: string }
    | { type: "debug.verification", attempt: number, confirmed: boolean, evidence: string }
    | { type: "debug.fix_applied", attempt: number, change: string }
    | { type: "debug.resolved", attempts: number, rootCause: string }
    | { type: "debug.escalated", attempts: number, trace: DebugTrace[] }

    // Human-in-the-loop
    | { type: "workflow.ready-for-review", planId: string }
    | { type: "workflow.feedback-received", feedback: string }
    | { type: "workflow.approved" }
    | { type: "workflow.implementation-ready", worktreePath: string, report: VerificationReport }
    | { type: "workflow.failed", error: string }

    // Cost tracking
    | { type: "cost.update", totalTokens: number, totalCost: number, breakdown: AgentCostBreakdown[] }

interface TokenUsage { inputTokens: number, outputTokens: number, cacheHits: number }
interface TestResult { name: string, passed: boolean, assertion?: string }
interface DebugTrace { hypothesis: string, evidence: string, fix: string, result: string }
interface AgentCostBreakdown { agentName: string, tokens: number, estimatedCost: number }
```

## Implementation Priority

Build incrementally. Workspace and verification infrastructure come first because everything depends on isolation and correctness.

1. **Workspace layer** — worktree create/delete/status tools. Without isolation, nothing else is safe to run.
2. **Verification primitive** — verifyTypecheck, verifyLint, verifyTests, queryDb. Every subsequent phase needs this.
3. **Tool layer + agent factories + config system** — foundation with narrow-scope agent pattern
4. **Codebase onboarding primitive** — parallel subagent exploration, one per slice
5. **Feature concepts network** — the creative core
6. **Debug network** — observe → hypothesize → verify → fix → confirm loop with 3-attempt hard limit
7. **Judge panel** — DB persistence + parallel execution
8. **Implementation phase** — decompose → parallel waves → per-file implementer + verifier pairs
9. **Inngest pipeline orchestration** — wire all phases together with events
10. **Dashboard: flight recorder** — full agent reasoning chain viewer with tool I/O, decisions, verification results, cost tracking
11. **Dashboard: trigger + live viewer** — workflow controls + realtime event stream
12. **Dashboard: plan review + implementation review** — both human-in-the-loop gates
13. **Dashboard: judge management + presets** — configuration UI

---

## Research Appendix

Comprehensive research findings that inform the architectural decisions above. Based on deep exploration of AI SDK v6 (458 files), Inngest (160 pages), and AgentKit (46 pages) documentation corpora.

### A. Technology Evaluation: AgentKit vs AI SDK

#### Why These Two

The two viable options for this system are:

1. **Inngest AgentKit** (`@inngest/agent-kit`) — Inngest's native multi-agent framework
2. **Vercel AI SDK v6** (`ai`) — Vercel's unified LLM toolkit with `ToolLoopAgent`

Both are TypeScript-first. Both support tool calling and multi-step loops. The critical differences emerge at the orchestration and multi-agent layers.

#### Decision Matrix

| Capability | AgentKit | AI SDK v6 |
|------------|----------|-----------|
| Multi-agent networks | First-class (`createNetwork`) | DIY (subagents via tools) |
| Shared state across agents | Built-in typed State (`createState<T>`) | Manual (pass through tool args) |
| Router patterns | Code-based, LLM-based, hybrid | Manual routing in orchestrator |
| Inngest integration | Native — peer dep, `step.ai` automatic | Via `step.ai.wrap()` bridge |
| Durability | Automatic (every LLM call is a step) | Manual (wrap each call in `step.ai.wrap()`) |
| Provider count | 4 (OpenAI, Anthropic, Gemini, Grok) | 40+ via provider packages |
| Streaming | Inngest Realtime (WebSocket) | SSE via `streamText` / `useChat` |
| UI hooks | `useAgent` (custom) | `useChat`, `useCompletion`, `useObject` |
| Testing | Via `@inngest/test` (step mocking) | `MockLanguageModelV3` (model mocking) |
| Structured output | Not built-in (model's native JSON mode) | `Output.object/array/choice` with Zod |
| Middleware | Inngest middleware lifecycle | `wrapLanguageModel` composable middleware |
| Model abstraction | Own layer (`openai()`, `anthropic()`) | `LanguageModelV3` spec across all providers |

#### Why AgentKit Wins for THIS System

This architecture requires:

1. **Multi-agent networks with routing** — The concept network (Phase 2) and debug network are iterative loops where a router decides the next agent based on state. AgentKit's `createNetwork` + code-based router is purpose-built for this. AI SDK would require hand-rolling the entire loop.

2. **Shared typed state** — Concept refinement, critic feedback, and judge verdicts flow through shared state. AgentKit's `createState<T>()` provides this with TypeScript generics. AI SDK has no equivalent.

3. **Inngest-native durability** — Every agent inference call automatically becomes a durable `step.ai` step with memoization and retry. With AI SDK, every call would need explicit `step.ai.wrap()` wrapping.

4. **Tool handler context** — AgentKit tools receive `{ network, agent, step }` in their handler. The `step` parameter enables tools to use `step.waitForEvent()` for HITL, `step.sendEvent()` for fan-out, and `step.run()` for sub-operations. AI SDK tools receive `{ toolCallId, messages, abortSignal }` — no Inngest integration.

5. **Router flexibility** — The concept network needs a code-based router that inspects state to decide whether to continue generating, criticize, or converge. The debug network needs a strict sequential router (observe → hypothesize → verify → fix → confirm). AgentKit supports both patterns natively.

#### What AgentKit Lacks (and Mitigations)

| Gap | Impact | Mitigation |
|-----|--------|------------|
| 4 providers only | Can't use Mistral, DeepSeek, Groq, etc. | Sufficient for our needs (Anthropic + OpenAI primary). Use `step.ai.wrap()` with AI SDK for exotic providers if needed. |
| No structured output primitive | No `Output.object()` equivalent | Use model's native JSON mode + Zod `safeParse` at the boundary. Anthropic and OpenAI both support structured output natively. |
| No `Output.array()` streaming | Can't stream array elements | Not needed — our agents produce complete outputs, not streaming arrays. |
| No middleware composition | Can't stack interceptors like AI SDK | Use Inngest middleware lifecycle hooks instead. Different mechanism, same capability. |
| Less mature ecosystem | Fewer integrations, smaller community | Offset by Inngest's maturity. AgentKit is v0.5+ but backed by Inngest's production platform. |

#### The Escape Hatch: `step.ai.wrap()`

If a future requirement demands AI SDK capabilities (e.g., 200+ models via AI Gateway, structured output streaming, advanced middleware), `step.ai.wrap()` bridges the gap:

```typescript
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

// Inside an Inngest function:
const result = await step.ai.wrap("generate-concept", async () => {
    return generateText({
        model: anthropic("claude-opus-4-6"),
        output: Output.object({ schema: ConceptSchema }),
        prompt: "Generate a feature concept...",
    })
})
```

This gives AI SDK's full power while retaining Inngest durability. Use sparingly — it bypasses AgentKit's network/state model.

### B. AgentKit Architecture Deep-Dive

#### Four Primitives

1. **Agent** (`createAgent`) — Model + system prompt + tools. Stateless. Execution: system prompt → inference → tool calls → result.
2. **Network** (`createNetwork`) — While-loop of agents with shared State. Router decides next agent per iteration. `maxIter` prevents infinite loops.
3. **Router** — Function returning Agent, Agent[], or undefined (stop). Three patterns: code-based (deterministic), routing agent (LLM decides), hybrid.
4. **Tool** (`createTool`) — Zod-validated params + handler receiving `{ network, agent, step }`.

#### Agent Lifecycle Hooks

```
onStart → inference → onResponse → tool execution → onFinish
```

- `onStart`: Modify prompts before inference
- `onResponse`: Modify result before tool calling (e.g., inject state)
- `onFinish`: Post-processing after all tools execute

#### Network Loop Mechanics

```
1. Router(state) → Agent
2. Agent.run() → InferenceResult (via step.ai)
3. Tools execute (if called)
4. State updated with result
5. Router(updated state) → next Agent or undefined
6. Repeat until router returns undefined or maxIter
```

State is accessible everywhere:
- Router: `network.state.data`
- Agent system prompt: `({ network }) => network.state.data`
- Tool handler: `network.state.data`

#### Dynamic System Prompts

Agent prompts can be functions that read network state:

```typescript
createAgent({
    system: async ({ network }) => {
        const state = network?.state.data
        return `You are reviewing concept: ${state?.currentConcept?.name}
                Previous criticisms: ${state?.criticisms?.join("\n")}`
    },
})
```

This is how agents receive updated context each iteration without manual prompt management.

#### Model Configuration Hierarchy

```
Agent.model > Network.defaultModel > (error if neither)
```

The `defaultModel` also serves the routing agent when using `createRoutingAgent()`.

#### History Adapters

For persistent conversations across network runs (not needed for this system, but worth noting):

```typescript
interface HistoryConfig {
    createThread(ctx): Promise<{ threadId: string }>
    get(ctx): Promise<AgentResult[]>
    appendUserMessage(ctx): Promise<void>
    appendResults(ctx): Promise<void>
}
```

Our system uses ephemeral per-run state. History adapters would only matter if we added conversational features to the dashboard.

### C. Inngest Integration Patterns

#### Durable Execution Model

Every AgentKit inference call inside a network becomes a `step.ai` operation:

```
Function invoked → step.ai("agent-inference-1") → result memoized
                → step.ai("agent-inference-2") → result memoized
                → step.ai("agent-inference-3") → crash!
                → Function re-invoked
                → step.ai("agent-inference-1") → memoized (skip)
                → step.ai("agent-inference-2") → memoized (skip)
                → step.ai("agent-inference-3") → retry
```

This means:
- No wasted LLM tokens on retries (completed calls are cached)
- Function can survive serverless timeouts and restarts
- Each agent call is independently retried (4 retries default)

#### `step.ai.infer()` vs `step.ai.wrap()`

| Method | Where LLM runs | When to use |
|--------|----------------|-------------|
| `step.ai.infer()` | Inngest's infrastructure | Default for AgentKit. No compute cost during LLM wait. Supports OpenAI, Anthropic, Gemini, Grok, Azure OpenAI. |
| `step.ai.wrap()` | Your server | Escape hatch for AI SDK calls. Your server stays active during inference. Use for providers not supported by `infer()`. |

AgentKit uses `step.ai.infer()` automatically. You only need `step.ai.wrap()` if you're mixing in AI SDK calls outside of AgentKit networks.

#### Step Types Available in Tool Handlers

When a tool handler receives `{ step }`, it has access to the full Inngest step API:

| Step Method | Use Case in Our System |
|-------------|----------------------|
| `step.run(id, fn)` | Wrap side-effects (DB writes, API calls) for retry |
| `step.sleep(id, duration)` | Delay between operations (rate limit backoff) |
| `step.waitForEvent(id, opts)` | HITL inside tools (NOT used — we use event-break pattern) |
| `step.sendEvent(id, event)` | Fan-out to other functions, trigger workflows |
| `step.invoke(id, opts)` | Call another Inngest function and await result |

#### Event-Break HITL Pattern (Our Approach)

We chose event-break over `step.waitForEvent()` for human-in-the-loop. The difference:

**`step.waitForEvent()` (NOT used):**
```
Function starts → ... → step.waitForEvent("approval", { timeout: "7d" })
                         ↑ Function pauses, occupies a run slot
                         ↓ Resumes when event received or times out
```
- Pros: Simpler control flow
- Cons: Long-running function, occupies concurrency slot, timeout risk

**Event-break (USED):**
```
Function A starts → ... → saves state to DB → emits "ready-for-review" → ends
                                                                              ↓
Human reviews in dashboard → clicks approve → sends event "feature.approved"
                                                                              ↓
Function B starts → loads state from DB → continues with Phase 5
```
- Pros: No long-running functions, no concurrency slot waste, unlimited review time
- Cons: More events to define, state must be persisted to DB

The event-break pattern is the right choice because:
1. Human review can take hours or days — `step.waitForEvent()` with a 7d timeout wastes a run slot
2. Each phase is independently retriable
3. State is in the DB (our `workflow_runs` table), not in Inngest's function state
4. The dashboard can show pending reviews without querying Inngest's internal state

#### Flow Control for Agent Workloads

Key Inngest flow control options for agent functions:

```typescript
inngest.createFunction({
    id: "agent/feature-pipeline",
    retries: 2,                          // 2 retries per step (3 total)
    concurrency: [{
        scope: "fn",
        limit: 3,                        // max 3 concurrent pipeline runs
    }],
    throttle: {
        limit: 10,
        period: "1m",                    // max 10 new runs per minute
    },
    timeouts: {
        finish: "30m",                   // hard timeout per phase
    },
}, ...)
```

#### Step Parallelism for Agent Tasks

Inngest supports parallel step execution via `Promise.all()`. This maps directly to our architecture:

```typescript
// Phase 1: Parallel onboarding subagents
const structure = step.run("map-structure", () => explorerAgent.run(...))
const dataLayer = step.run("map-data-layer", () => explorerAgent.run(...))
const apiLayer = step.run("map-api-layer", () => explorerAgent.run(...))
const [structureResult, dataResult, apiResult] = await Promise.all([
    structure, dataLayer, apiLayer,
])

// Phase 3: Parallel judge execution
const judgeResults = await Promise.all(
    activeJudges.map(judge =>
        step.run(`judge-${judge.slug}`, () => judgeAgent.run(...))
    )
)
```

Limits: 1,000 steps max per function, 4MB total state. Both are generous for our use case.

### D. Streaming Architecture

#### Inngest Realtime (WebSocket-Based)

The dashboard receives real-time updates via Inngest Realtime, which uses **WebSocket** connections (not SSE). This is a critical distinction from AI SDK's SSE-based streaming.

```
┌──────────────┐     WebSocket     ┌───────────────────┐    publish()    ┌───────────────┐
│  Dashboard    │ ←───────────────→ │  Inngest Realtime │ ←───────────── │  Inngest Fn   │
│  (useAgent)   │                   │  Service          │                │  (AgentKit)   │
└──────────────┘                   └───────────────────┘                └───────────────┘
```

#### Required Components

1. **Inngest Client** with `realtimeMiddleware()` — already configured in `src/inngest/index.ts`
2. **Channel + Topic** definitions — typed pub/sub channels
3. **Token endpoint** (`POST /api/realtime/token`) — generates subscription tokens
4. **Inngest route** (`/api/inngest`) — already exists
5. **Client-side** — `useInngestSubscription` hook or `@inngest/use-agent`

#### Channel Definition Pattern

```typescript
import { channel, topic } from "@inngest/realtime"

const workflowChannel = channel(
    (runId: string) => `workflow:${runId}`
).addTopic(
    topic("events").type<WorkflowEvent>()
)
```

#### Publishing from Agent Functions

```typescript
inngest.createFunction(
    { id: "agent/feature-pipeline" },
    { event: "agent/feature.requested" },
    async ({ event, step, publish }) => {
        const runId = event.data.runId

        // Emit progress events throughout the pipeline
        await publish(workflowChannel(runId).events({
            type: "phase.started",
            phase: "onboarding",
            timestamp: Date.now(),
        }))

        // ... agent work ...

        await publish(workflowChannel(runId).events({
            type: "agent.tool_call",
            agentName: "explorer",
            tool: "readFile",
            input: { path: "src/db/schemas/core.ts" },
            output: "/* file contents */",
        }))
    }
)
```

#### Dashboard Subscription

The `content.tsx` client component subscribes to the realtime channel:

```typescript
"use client"
import { useInngestSubscription } from "@inngest/realtime/hooks"

function WorkflowViewer({ runId, tokenPromise }) {
    const token = React.use(tokenPromise)
    const { data: events } = useInngestSubscription<WorkflowEvent>({
        channel: `workflow:${runId}`,
        topic: "events",
        token,
    })
    // Render flight recorder from events array
}
```

#### Why WebSocket Over SSE

| Aspect | WebSocket (Inngest Realtime) | SSE (AI SDK) |
|--------|------------------------------|--------------|
| Direction | Bidirectional | Server → Client only |
| Connection | Single persistent connection | One connection per stream |
| Multiplexing | Multiple channels on one socket | One stream per request |
| Reconnection | Built into Inngest client | Manual |
| Auth | Subscription tokens with expiry | Headers on each request |
| Use case | Dashboard with multiple live views | Chat streaming |

For our flight recorder dashboard with multiple simultaneous views (active workflows, live agents, verification results), WebSocket multiplexing is essential.

### E. AI SDK as Escape Hatch

#### When to Use AI SDK via `step.ai.wrap()`

Even though AgentKit is the primary framework, AI SDK provides capabilities worth accessing in specific scenarios:

1. **Structured Output with Zod** — AI SDK's `Output.object({ schema })` guarantees Zod-validated structured output with automatic retries on parse failure. Use for concept generation output, judge verdicts, implementation plans.

2. **Provider-Specific Features** — Anthropic thinking/reasoning mode (`budgetTokens`), OpenAI web search, provider-defined tools (bash, text_editor).

3. **Exotic Providers** — If we need DeepSeek, Mistral, Groq, or any of the 40+ AI SDK providers not supported by AgentKit.

4. **AI Gateway** — Vercel's AI Gateway provides automatic routing, fallbacks, caching, and zero-token-markup access to 200+ models. Accessed via `providerOptions.gateway`.

#### AI Gateway Capabilities

| Feature | Value for This System |
|---------|----------------------|
| 200+ models, 35+ providers | Provider flexibility without code changes |
| Zero token markup | Cost savings at scale |
| Automatic fallbacks | Resilience if primary provider is down |
| Gateway-level caching | Reduce duplicate LLM calls |
| ZDR (Zero Data Retention) | Privacy compliance |
| BYOK (Bring Your Own Key) | Use org's API keys |
| OIDC auth on Vercel | No API key management for Vercel deploys |

Access pattern (via AI SDK):

```typescript
import { gateway } from "ai"

const result = await generateText({
    model: gateway("anthropic/claude-opus-4-6"),
    providerOptions: {
        gateway: {
            fallbacks: ["openai/gpt-5.1"],
            cache: { maxAge: 300 },
        },
    },
    prompt: "...",
})
```

To use inside AgentKit via the escape hatch:

```typescript
await step.ai.wrap("gateway-call", async () => {
    return generateText({
        model: gateway("anthropic/claude-opus-4-6"),
        providerOptions: { gateway: { fallbacks: ["openai/gpt-5.1"] } },
        output: Output.object({ schema: ConceptSchema }),
        prompt: conceptPrompt,
    })
})
```

### F. Testing Strategy

#### Three Testing Layers

**1. Inngest Function Tests** (`@inngest/test`)

Test the pipeline orchestration: event triggers, step execution order, state transitions.

```typescript
import { InngestTestEngine } from "@inngest/test"

const t = new InngestTestEngine({ function: featurePipeline })

// Test Phase 1 triggers onboarding steps
const { result, state } = await t.execute({
    events: [{
        name: "agent/feature.requested",
        data: { feature: "add dark mode", branchName: "feature/dark-mode" },
    }],
    steps: [
        { id: "map-structure", handler: () => mockStructure },
        { id: "map-data-layer", handler: () => mockDataLayer },
        // ... mock all agent steps
    ],
})
```

Always mock: `step.sleep`, `step.waitForEvent`, `step.ai.infer` (LLM calls).

**2. Agent Unit Tests**

Test individual agents with mocked models. Verify:
- Correct tools are available
- System prompt includes expected context
- Router returns expected agent based on state

```typescript
// Test router logic
const router = conceptNetworkRouter
const state = createState<ConceptNetworkState>({
    phase: "generating",
    concepts: [],
    iterationCount: 0,
})
const result = router({ network: { state }, callCount: 0 })
expect(result).toBe(conceptAgent) // First iteration generates
```

**3. Tool Integration Tests**

Test tools in isolation with real filesystem/DB operations in a test fixture:

```typescript
// Test readFile tool
const result = await readFileTool.handler(
    { path: "src/lib/utils.ts" },
    { network: mockNetwork, agent: mockAgent, step: mockStep }
)
expect(result).toContain("export function cn")
```

#### What Mocking Looks Like

| Layer | Mock What | Real What |
|-------|-----------|-----------|
| Pipeline | All agent/LLM steps | Event routing, step ordering |
| Agent | Model responses | Router logic, state updates |
| Tool | Network/step context | Tool handler logic |
| Integration | Nothing | Full pipeline with test models |

### G. Token Budget Management

#### The Problem

Multi-agent systems compound token costs:
- Phase 1 (Onboarding): 6 parallel explorers, each reading files → ~50K tokens per explorer
- Phase 2 (Concepts): Iterative loop with concept + critic agents → unbounded
- Phase 3 (Judges): N judges in parallel, each evaluating full plan → ~20K per judge
- Phase 5 (Implementation): Per-file implementers + verifiers → varies wildly

Without budget controls, a single workflow run could consume millions of tokens.

#### Mitigation Strategies

**1. Per-Agent Token Tracking**

AgentKit reports token usage per inference call via Inngest traces. Emit cost events:

```typescript
// After each agent call, emit cost update
await publish(workflowChannel(runId).events({
    type: "cost.update",
    totalTokens: cumulativeTokens,
    totalCost: estimatedCost,
    breakdown: agentCosts,
}))
```

**2. Network `maxIter` Limits**

Every network MUST have a `maxIter`:

| Network | Recommended `maxIter` | Rationale |
|---------|----------------------|-----------|
| Concept | 8 | Generate → criticize → refine × ~3 cycles |
| Debug | 3 | Hard limit by design (Principle 3) |
| Explore | 5 | Map → drill-down × ~2 cycles |
| Implement | 4 | Write → verify → fix × ~1 cycle |

**3. Model Tiering**

Use cheap models for high-volume tasks, expensive models for critical decisions:

| Task | Model Tier | Rationale |
|------|-----------|-----------|
| File reading/exploration | Haiku | High volume, low reasoning |
| Code generation | Sonnet | Balance of quality and cost |
| Concept generation | Opus | Creative, high-stakes |
| Criticism | Configurable | User choice per preset |
| Judging | Per-personality | Each judge can use different models |
| Verification | Haiku | Mechanical checks, low reasoning |

**4. Context Window Hygiene**

- Explorers get ONLY their assigned directory slice
- Implementers get ONLY their assigned file + the plan for that file
- Judges get the plan summary, not raw exploration output
- Debug agents get the error + relevant source, not the full codebase context

### H. Key Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AgentKit provider lock-in (4 providers) | Medium | Low | `step.ai.wrap()` escape hatch for AI SDK. Our primary providers (Anthropic, OpenAI) are supported. |
| Inngest Realtime is Developer Preview | High | Medium | Build dashboard on standard Inngest event patterns first. Realtime is additive — can fall back to polling. |
| `readClaudeMd` token cost at scale | Medium | Medium | Cache CLAUDE.md content as a step result. Only re-read on cache miss or explicit refresh. |
| Network iteration runaway | Low | High | `maxIter` on every network. Cost tracking per workflow. Hard budget limits per run. |
| Git worktree accumulation | Medium | Low | Cron-based cleanup function. `worktreeStatus` check before creating new ones. Dashboard shows active worktrees. |
| Serverless timeout during long agent chains | Medium | High | Inngest checkpointing (already enabled). Each step is independently retried. `step.ai.infer()` offloads LLM wait. |
| State size exceeding 4MB Inngest limit | Low | High | Keep exploration summaries terse. Don't store full file contents in state — reference paths instead. |
| Model API rate limits during parallel execution | Medium | Medium | Inngest concurrency + throttling on the function. Model-specific rate limit keys. |
| AgentKit API instability (v0.x) | Medium | Medium | Pin version. Wrap AgentKit calls in our own factory functions for indirection. Monitor changelog. |

### I. Package Dependencies

#### Required Packages

```
@inngest/agent-kit          # Agent framework (agents, networks, tools, routers)
inngest                     # Already installed — durable execution runtime
@inngest/realtime           # Already configured — streaming middleware
```

#### Optional Packages (for escape hatch)

```
ai                          # AI SDK v6 — for step.ai.wrap() bridge
@ai-sdk/anthropic           # If using AI SDK for Anthropic calls
@ai-sdk/openai              # If using AI SDK for OpenAI calls
@inngest/use-agent          # React hook for streaming agent UI (alternative to raw realtime)
```

#### Package Relationship

```
@inngest/agent-kit ──peer dep──→ inngest
                   ──uses──→ step.ai.infer() (automatic)
                   ──uses──→ Inngest Realtime (via publish())

@inngest/use-agent ──uses──→ @inngest/realtime (WebSocket transport)

ai (AI SDK)        ──no dependency on──→ @inngest/agent-kit
                   ──bridged via──→ step.ai.wrap()
```

**Critical**: AI SDK and AgentKit are independent stacks with separate model abstractions and streaming primitives. AgentKit does NOT wrap AI SDK. They coexist via `step.ai.wrap()` only.

### J. Reference: Research Notes Index

Full research notes are available at `.claude/notes/`:

| File | Lines | Coverage |
|------|-------|----------|
| `ai-sdk-overview.md` | 1,003 | AI SDK v6 complete API surface, providers, tools, streaming, middleware, testing |
| `ai-sdk-agents.md` | 331 | ToolLoopAgent, loop control, workflow patterns, subagents |
| `ai-sdk-vercel.md` | 531 | AI Gateway, Vercel deployment, fluid compute, streaming on Vercel |
| `inngest-overview.md` | 832 | Full Inngest platform: steps, flow control, error handling, realtime, testing |
| `agentkit-overview.md` | 683 | AgentKit primitives, routing, state, tools, streaming, integrations |
| `agentkit-inngest.md` | 653 | Integration deep-dive: durability, state management, event patterns, deployment |

Total: 4,033 lines of synthesized documentation research.
