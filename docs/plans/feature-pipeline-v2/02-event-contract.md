# Sub-Plan 02: Event Contract

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Define all Inngest event schemas for the feature pipeline.

**Architecture:** Zod schemas added to the existing Inngest client event map.

**Tech Stack:** Inngest, Zod

**Dependencies:** None

**Produces:** Modified `src/inngest/index.ts`

---

## Contract (non-negotiable)

| Event Name | Payload Fields |
|------------|---------------|
| `paul/pipeline/feature-run` | `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `runtime: "node24" \| "node22" \| "python3.13"` |
| `paul/pipeline/analysis` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `memories: MemoryRecord[]` |
| `paul/pipeline/approaches` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `analysisOutput: unknown`, `memories: MemoryRecord[]` |
| `paul/pipeline/judging` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `selectedApproach: unknown`, `analysisOutput: unknown`, `memories: MemoryRecord[]` |
| `paul/pipeline/implementation` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `selectedApproach: unknown`, `analysisOutput: unknown`, `judgingOutput: unknown`, `memories: MemoryRecord[]` |

**v2 change:** Removed `paul/pipeline/judge` event. Single judge runs inline in the judging orchestrator — no separate Inngest function.

**Shared type:**
```typescript
MemoryRecord = { phase: string, kind: string, content: string }
```

## Internal (can change freely)

- Zod refinements, defaults, additional optional fields.

---

## Steps

1. Add 5 event schemas to `src/inngest/index.ts`.
2. `bun typecheck` — must pass.
3. Commit: `feat: add feature pipeline event schemas`
