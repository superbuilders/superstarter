# Foundation Plan Audit

**Date:** 2026-02-19
**Purpose:** Gap analysis of `2026-02-19-agent-foundation-plan.md` against `2026-02-19-agent-architecture-design.md`

---

## Executive Summary

This audit compares the 16-task agent foundation implementation plan against the architecture design specification. The plan covers the scaffolding work well at a structural level — schema, event schemas, config resolution, tool definitions, agent factories, and the Inngest orchestration function are all present. However, several critical integration gaps exist that will cause complete runtime failures before a single successful onboarding run can complete.

The most severe gap is the broken `save_summary` signal chain: the explorer agent factory (Task 12) does not include `saveSummaryTool`, meaning `ExplorerState.done` can never become `true`, and every `createSliceNetwork` invocation will exhaust its iteration limit without saving a result. Compounded by the absence of `workflow_runs` record creation (Task 15 never inserts the required row), the entire HITL event-break pattern for Phase 2 is non-functional from day one. A third critical issue — `CodebaseContext` returned but never persisted — means no downstream Inngest function triggered by `agent/feature.approved` can retrieve the onboarding result.

Beyond the runtime blockers, the config resolution pipeline is roughly 25% implemented: `applyOverrides` exists but `resolveConfig`, `loadPreset`, and `loadDefaultPreset` are entirely absent, making the `presetId` and `isDefault` DB columns inert. Several high-severity gaps affect tool completeness (3 of 7 verification tools missing, all 5 analysis tools missing from the explorer), workspace isolation (worktree never created in the Inngest function), and type safety (`configOverrides` typed as `Record<string, unknown>` instead of `Partial<WorkflowConfig>`). The recommended fix order in the final section prioritizes unblocking the critical path before addressing spec completeness and polish.

---

## Critical Gaps

These gaps will cause runtime failures. No successful onboarding run is possible while any of these remain.

| ID | Tasks | Description | Fix Guidance |
|----|-------|-------------|--------------|
| C1 | 12, 14 | `saveSummaryTool` not wired into explorer agent. `createExplorerAgent` does not include `saveSummaryTool` in its tool list. `createSliceNetwork` uses `createExplorerAgent` to build its agent. The explorer can never call `save_summary`, so `ExplorerState.done` never becomes `true`. The network runs to `maxIter` every time without saving a summary. | Add an optional `extraTools` parameter to `createExplorerAgent`, or pass `saveSummaryTool` explicitly in `createSliceNetwork` when constructing the explorer. |
| C2 | 15 | `workflow_runs` record never created. The Inngest function never inserts into `workflow_runs`. The architecture requires `inngestRunId`, `status`, `phase`, `configSnapshot`, and `branchName` written at function start. Without this row, the dashboard has no data, and all Phase 2 events (which require `runId`) cannot resume. | Insert a `workflow_runs` row in a dedicated step at function start, before any agent work begins. Store the returned `id` in step state for use throughout. |
| C3 | 15 | `CodebaseContext` returned from function but never persisted to DB. The architecture's event-break HITL pattern requires intermediate results written to DB so functions triggered by `agent/feature.approved` and `agent/feature.feedback` can load them. | Add a step after the explore phase that writes `CodebaseContext` to a DB table (e.g., `workflow_runs.explorationResult` as JSONB, or a dedicated `workflow_artifacts` table). |
| C4 | 4 | `resolveConfig`, `loadPreset`, and `loadDefaultPreset` entirely absent. Task 4 only implements `applyOverrides`. The DB-backed resolution pipeline (code defaults → DB default preset → named preset → per-run overrides) is ~25% implemented. `presetId` and `isDefault` columns serve no purpose without these functions. | Implement the three missing functions in `src/agents/config.ts`. `loadPreset(id)` queries `agent_presets` by ID. `loadDefaultPreset(workflowType)` queries by `isDefault = true`. `resolveConfig` calls them in order and feeds the result into `applyOverrides`. |
| C5 | 2 | `configOverrides` typed as `Record<string, unknown>` instead of `Partial<WorkflowConfig>`. The Zod schema uses `z.record(z.string(), z.unknown())`, which accepts arbitrary key-value pairs and loses type safety. Architecture specifies 6 typed agent config slots under `Partial<WorkflowConfig>`. | Define a `WorkflowConfigOverridesSchema` that mirrors `WorkflowConfig` with all fields optional, and use it for `configOverrides` in the event schema. |
| C6 | 15 | `as Partial<WorkflowConfig>` type assertion in the Inngest function. Banned by `no-as-type-assertion` project rule. The cast is unsafe because `configOverrides` is `Record<string, unknown>`. | Use Zod `safeParse` against `WorkflowConfigOverridesSchema` to validate and narrow the type at runtime. |

---

## High-Severity Gaps

These gaps violate the architecture spec or remove significant functionality. The system will build and partially run, but key features described in the design will be missing or broken.

| ID | Tasks | Description | Fix Guidance |
|----|-------|-------------|--------------|
| H1 | 11 | 3 of 7 verification tools missing: `queryDb`, `verifyEndpoint`, `readLogs`. Task 11 only implements `verifyTypecheck`, `verifyLint`, `verifyTests`, `diffCheck`. | Implement the three missing tools in `src/agents/tools/verify.ts`. `queryDb` requires a read-only DB connection (see H2). `verifyEndpoint` makes an HTTP GET to a local dev server URL. `readLogs` tails a log file or Inngest run logs. |
| H2 | 11 | No `DATABASE_URL_READONLY` env var. Architecture requires a separate read-only DB user for `queryDb`. Neither the env var nor provisioning instructions exist in `src/env.ts`. | Add `DATABASE_URL_READONLY` to `src/env.ts` as an optional validated string. Document the required Postgres role setup in the repo. |
| H3 | 12 | Explorer agent missing all 5 analysis tools. Architecture specifies "Core + Analysis" tool set for the explorer. Task 12 only provides Core tools (`readFile`, `listFiles`, `searchCode`, `readDirectory`, `readClaudeMd`, `emitProgress`). Missing: `analyzeImports`, `findUsages`, `getGitHistory`, `runLint`, `runTypecheck`. | Implement the 5 analysis tools and pass them to `createExplorerAgent`. |
| H4 | All | `src/agents/index.ts` never created. Architecture mandates a single public import point. All plan tasks import directly from subdirectories, which the architecture explicitly forbids. | Create `src/agents/index.ts` that re-exports from all subdirectories. Update all cross-module imports to use `@/agents`. |
| H5 | 10, 15 | Worktree lifecycle not wired into Inngest function. Task 10 implements the workspace module, but Task 15 never calls `createWorktree`. Every onboarding run operates on the main checkout rather than an isolated branch. | In the Inngest function, add a step early in execution that calls `createWorktree` and registers cleanup via `AsyncDisposableStack` or a matching `deleteWorktree` step. |
| H6 | 13, 15 | `focus` and `depth` params accepted but never used. `focus` never appears in prompts; `depth` never changes behavior (`maxIter` is hardcoded to 8). "Shallow, targeted" onboarding for Phase 2-3 is non-functional. | Thread `focus` into `buildSlicePrompt` and use it to restrict slice selection. Map `depth` to `maxIter` per slice: e.g., `shallow → 3`, `standard → 5`, `deep → 8`. |
| H7 | 4, 15 | `presetId` from event never consumed. Task 15 reads `configOverrides` from the event payload but ignores `presetId`. A user selecting a preset in the dashboard has no effect on the run. | After C4 is fixed, call `loadPreset(presetId)` in the Inngest function when `presetId` is present, and feed its config into `resolveConfig`. |
| H8 | 14, 15 | `relevantFiles` always `[]`. The `CodebaseContext` type includes `relevantFiles` but no slice explorer populates it. | During the explore phase, accumulate file paths from each slice's `ExplorerState.summary` and write them into `CodebaseContext.relevantFiles`. |
| H9 | 10, 14, 15 | Multiple `??` nullish coalescing violations across Tasks 10, 14, and 15. Will fail pre-commit hooks per the `no-nullish-coalescing` rule. | Trace each `??` usage to its source. Apply the appropriate fix pattern: validate and throw if the value is required, fix the schema if the field should be non-optional, or align types at boundaries. |
| H10 | 10 | Workspace tools at wrong path and wrong API. Architecture places workspace tools at `src/agents/tools/workspace.ts` and requires `createTool()` wrappers. Task 10 implements plain functions at `src/agents/workspace.ts`. | Move file to `src/agents/tools/workspace.ts`. Wrap each function with `createTool()` so agents can invoke them through the standard tool-call interface. |

---

## Medium-Severity Gaps

These gaps represent design divergences that reduce correctness, observability, or future maintainability, but do not break current functionality outright.

| ID | Tasks | Description | Fix Guidance |
|----|-------|-------------|--------------|
| M1 | 3 | No judge personality seeding. 4 built-in judge personalities described in architecture are never inserted into the DB. | Add a seed script or migration that inserts the 4 default judge rows into `agent_presets` with `isDefault = false` and appropriate `workflowType`. |
| M2 | 3 | No FK constraint on `workflow_runs.presetId` → `agent_presets.id`. | Add a foreign key in the Drizzle schema. If `presetId` is optional, use `.references(() => agentPresets.id, { onDelete: "set null" })`. |
| M3 | 3 | No unique partial index on `(workflowType) WHERE isDefault = true`. Without it, multiple rows can have `isDefault = true` for the same workflow type, making `loadDefaultPreset` ambiguous. | Add a unique partial index in the Drizzle schema via `uniqueIndex().on(table.workflowType).where(sql\`${table.isDefault} = true\`\)`. |
| M4 | 5 | Grok provider missing `baseURL` and `XAI_API_KEY`. The architecture specifies these as required for the xAI Grok integration. | Add `baseURL: "https://api.x.ai/v1"` to the Grok provider config and add `XAI_API_KEY` to `src/env.ts`. |
| M5 | 9 | `emitProgressTool` is a log stub. It logs a message but does not publish to Inngest Realtime. `totalTokens` and `estimatedCost` are never written. | Replace the log stub with an Inngest Realtime publish call. Compute token counts from step results and pass them through. |
| M6 | 4 | `applyOverrides` does wholesale replacement rather than deep merge. Overriding one field of a nested agent config wipes the other fields. | Replace the shallow `Object.assign` with a `deepMerge` utility that recurses into nested config objects. |
| M7 | 11 | `runTypecheck` drops `path` param. Architecture specifies an optional `{ path?: string }` input to scope the typecheck to a subdirectory. | Add the `path` param to the tool schema and pass it as a `--project` or `--rootDir` argument to `tsc`. |
| M8 | 8 | `readClaudeMd` renamed to `read_conventions` with an added `repoRoot` param not in the architecture. | Restore the tool name to `read_claude_md` (or the architecture's exact name). Remove `repoRoot` from the input schema if it is not in the spec, or document the intentional deviation. |
| M9 | 8 | `searchCode` and `findUsages` add a `path` param not in the architecture, and change `glob` from optional to nullable. | Align param shapes with the architecture. If the `path` addition is intentional, update the architecture first. Do not mix `optional` and `nullable` without a normalization step. |
| M10 | 14 | `maxIter: 8` in `createSliceNetwork`. Architecture specifies Explore `maxIter` as 5. | Change to 5, or make it configurable via the resolved `WorkflowConfig`. |
| M11 | 13 | Specialist agent missing `runLint` and `runTypecheck`. Architecture lists these as part of the specialist's tool set for verifying generated code. | Add `runLint` and `runTypecheck` from the verification tool set to the specialist agent. |
| M12 | All | `@inngest/test` not installed. Architecture references Inngest's test utilities for unit-testing step functions. | Add `@inngest/test` as a dev dependency via `bun add -d @inngest/test`. |
| M13 | 15 | Task 15 has zero tests despite the plan's TDD approach. The Inngest function is the most complex unit in the codebase and has no coverage. | Write step-by-step tests using `@inngest/test` (once M12 is resolved). Test at minimum: event parsing, worktree creation, explore phase, context persistence, and error paths. |
| M14 | 11 | `verify.ts` primitive (a helper that runs a shell command and returns structured pass/fail output) is never created. Each verification tool re-implements the same shell-exec-and-parse pattern. | Extract a `runCheck(cmd: string, cwd: string): Promise<CheckResult>` helper in `src/agents/tools/verify.ts` and reuse it in all verification tools. |
| M15 | 15 | `throttle` and `timeouts` missing from Inngest function config. Long-running LLM calls will time out silently; no rate limiting protects the API key budget. | Add `throttle: { limit: N, period: "1m" }` and `timeouts: { finish: "30m" }` to `inngest.createFunction` options. |

---

## Internal Consistency Issues

These issues are inconsistencies within the plan itself, independent of the architecture spec.

| ID | Tasks | Description | Fix Guidance |
|----|-------|-------------|--------------|
| I1 | 14, 15 | `ExplorerState` type duplicated in Task 14 and Task 15 without being exported from `onboard.ts`. Two definitions will drift. | Export `ExplorerState` from `src/agents/onboard.ts` (or a shared types file) and import it in both locations. |
| I2 | 5, 15 | `resolveModel` imported in Task 15's Inngest function but never called. Dead import. | Remove the import, or wire `resolveModel` into the agent construction call if it is supposed to be used there. |
| I3 | 14 | `buildSlicePrompt` does not validate the slice key. If a slice key is `undefined`, it silently joins into the prompt string, producing a malformed prompt. | Add a guard: if the slice key is not in the known slice map, log an error and throw before constructing the prompt. |
| I4 | 10 | `git commit` in workspace test setup is not awaited. This creates a race condition where the test assertion runs before the commit is complete. | `await` the `git commit` call in the test's `beforeEach` or setup block. |
| I5 | 10 | `Bun.write` to a non-existent `sub/` directory in the filesystem test will throw `ENOENT`. | Either create the directory first with `mkdir -p`, or use `Bun.write` with a path that is guaranteed to exist in the temp directory. |
| I6 | 8, 9, 11 | Tool handlers import and use module-level `slog` directly. Convention requires using the Inngest `logger` parameter inside Inngest functions. Tools called from within a function step inherit this constraint. | Thread the Inngest `logger` through each tool invocation context, or wrap tool calls in a step that captures and forwards the logger. |
| I7 | 15 | `onboard()` is exported from `onboard.ts` but never called by Task 15. Task 15 re-implements its logic inline. Dead export. | Either have Task 15 call `onboard()` directly, or delete the export from `onboard.ts` if inline orchestration is intentional. |

---

## Per-Task Gap Summary

| Task | Title | Gaps |
|------|-------|------|
| Task 1 | Project scaffolding | H4 (index.ts not created here) |
| Task 2 | Event schemas | C5, C6 (`configOverrides` wrong type, enabling the unsafe assertion upstream) |
| Task 3 | DB schema | M1, M2, M3 (no seed, no FK, no partial unique index) |
| Task 4 | Config resolution | C4, M6 (`resolveConfig`/`loadPreset`/`loadDefaultPreset` absent; `applyOverrides` does shallow merge) |
| Task 5 | Model registry | M4, I2 (Grok missing `baseURL`/API key; `resolveModel` imported but unused in Task 15) |
| Task 6 | Base agent | None identified |
| Task 7 | Checkpoint middleware | None identified |
| Task 8 | Core tools | M8, M9, I6 (`readClaudeMd` renamed; `searchCode`/`findUsages` param drift; module-level slog) |
| Task 9 | Progress tool | M5 (`emitProgressTool` is a log stub with no Realtime publish) |
| Task 10 | Workspace tools | H5, H9, H10, I4, I5 (worktree never called; `??` violations; wrong path and plain functions; test race condition; ENOENT) |
| Task 11 | Verification tools | H1, H2, M7, M14, I6 (3 tools missing; no `DATABASE_URL_READONLY`; `runTypecheck` drops `path`; no `runCheck` primitive; module-level slog) |
| Task 12 | Explorer agent | C1, H3 (`saveSummaryTool` not wired; all 5 analysis tools missing) |
| Task 13 | Specialist agent | M11 (missing `runLint`/`runTypecheck`) |
| Task 14 | Slice network | C1, H6, H8, H9, M10, I1, I3, I7 (C1 manifests here; `focus`/`depth` unused; `relevantFiles` never populated; `??` violations; wrong `maxIter`; `ExplorerState` duplicated; `buildSlicePrompt` no slice key guard; `onboard()` dead) |
| Task 15 | Inngest function | C2, C3, C6, H5, H6, H7, H9, M13, M15, I1, I2, I7 (`workflow_runs` never created; `CodebaseContext` not persisted; unsafe `as` assertion; worktree not called; `focus`/`depth` unused; `presetId` ignored; `??` violations; no tests; no throttle/timeout config; `ExplorerState` duplicated; `resolveModel` dead import; `onboard()` dead) |
| Task 16 | Integration tests | M12, M13 (`@inngest/test` not installed; function has no unit tests to complement integration tests) |

---

## Recommended Fix Order

Fix in dependency order: resolve what unblocks other fixes before addressing isolated gaps.

### Phase A — Structural Prerequisites (fix before any code runs)

These fixes must land first because later phases depend on them.

| Priority | Gap | Reason |
|----------|-----|--------|
| 1 | C5 | Fixing event schema type unblocks C6 and H7. All downstream config work depends on correct types. |
| 2 | C4 | `resolveConfig` / `loadPreset` / `loadDefaultPreset` must exist before the Inngest function can resolve config or consume `presetId`. |
| 3 | H4 | Create `src/agents/index.ts`. All subsequent module work should import through it per architecture. |
| 4 | M2, M3 | DB schema FK and partial unique index should be in place before any preset rows are written. |
| 5 | M1 | Seed built-in judge personalities after M2/M3 are in place. |
| 6 | H2, M4 | Add `DATABASE_URL_READONLY` and Grok `baseURL`/`XAI_API_KEY` to `src/env.ts` before implementing tools that need them. |
| 7 | M12 | Install `@inngest/test` before writing any Inngest unit tests. |

### Phase B — Critical Runtime Path (fix before first run attempt)

| Priority | Gap | Reason |
|----------|-----|--------|
| 8 | C1 | Wire `saveSummaryTool` into explorer. Without this, the network never terminates cleanly. |
| 9 | H5 | Wire `createWorktree` into the Inngest function. Without this, all runs operate on main. |
| 10 | C2 | Insert `workflow_runs` at function start. HITL events and the dashboard depend on this row. |
| 11 | C3 | Persist `CodebaseContext` to DB after the explore phase. Phase 2 continuation events cannot function without it. |
| 12 | C6 | Replace `as Partial<WorkflowConfig>` with Zod `safeParse` using the corrected schema from C5. |
| 13 | H7 | Consume `presetId` from event and call `loadPreset` (now available after C4). |
| 14 | H9 | Eliminate all `??` violations. Pre-commit hooks will block merging otherwise. |

### Phase C — Tool Completeness

| Priority | Gap | Reason |
|----------|-----|--------|
| 15 | H3 | Add 5 analysis tools to explorer agent. Exploration quality depends on these. |
| 16 | H1 | Implement 3 missing verification tools (`queryDb`, `verifyEndpoint`, `readLogs`). |
| 17 | H10 | Move workspace tools to correct path and wrap with `createTool()`. |
| 18 | M14 | Extract `runCheck` primitive before implementing H1 to avoid duplication. |
| 19 | M7, M8, M9 | Fix `runTypecheck` param drop and `readClaudeMd`/`searchCode`/`findUsages` param drift. |
| 20 | M11 | Add `runLint`/`runTypecheck` to specialist agent. |

### Phase D — Behavioral Correctness

| Priority | Gap | Reason |
|----------|-----|--------|
| 21 | H6 | Thread `focus` into prompts and map `depth` to `maxIter`. |
| 22 | H8 | Populate `relevantFiles` from explorer summaries. |
| 23 | M6 | Replace shallow merge in `applyOverrides` with deep merge. |
| 24 | M10 | Set `maxIter` to 5 per architecture (or make it configurable). |
| 25 | M5 | Replace `emitProgressTool` log stub with Inngest Realtime publish. |

### Phase E — Internal Consistency and Observability

| Priority | Gap | Reason |
|----------|-----|--------|
| 26 | I1 | Deduplicate `ExplorerState` type — export from one location. |
| 27 | I2 | Remove dead `resolveModel` import in Task 15. |
| 28 | I3 | Add slice key validation in `buildSlicePrompt`. |
| 29 | I4, I5 | Fix test race condition and ENOENT in workspace tests. |
| 30 | I6 | Thread Inngest `logger` through tool invocations rather than using module-level slog. |
| 31 | I7 | Resolve `onboard()` dead export — call it or delete it. |
| 32 | M15 | Add `throttle` and `timeouts` to Inngest function config. |

### Phase F — Test Coverage

| Priority | Gap | Reason |
|----------|-----|--------|
| 33 | M13 | Write Inngest unit tests for Task 15 using `@inngest/test`. Cover the critical path and error cases identified in Phases B-D. |

---

## TL;DR

- 6 critical gaps will prevent any successful onboarding run: broken `save_summary` signal, no `workflow_runs` record, no `CodebaseContext` persistence, ~75% of config resolution missing, wrong `configOverrides` type, and a banned `as` assertion.
- 10 high-severity gaps remove significant spec-mandated functionality: 8 tools missing across verification and analysis, worktree isolation non-functional, `focus`/`depth` params silently ignored, `presetId` never consumed.
- Fix order: structural prerequisites (event schema, config pipeline, `index.ts`, DB constraints) → critical runtime path → tool completeness → behavioral correctness → consistency and observability → tests.
- Pre-commit hooks will block all merges until the `??` violations (H9) are resolved — this is the highest-urgency lint issue.
