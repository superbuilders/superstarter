# Sub-Plan 02: Event Contract

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Define all Inngest event schemas for the feature pipeline — the message contract between master and phase orchestrators.

**Architecture:** Zod schemas added to the existing Inngest client event map.

**Tech Stack:** Inngest, Zod

**Dependencies:** None

**Produces:** Modified `src/inngest/index.ts`

---

## Contract (non-negotiable)

These event names and payload shapes are the interface between the master orchestrator and each phase. Every phase orchestrator and the master depend on these exact names and shapes.

| Event Name | Payload Fields |
|------------|---------------|
| `paul/pipeline/feature-run` | `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `runtime: "node24" \| "node22" \| "python3.13"` |
| `paul/pipeline/analysis` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `memories: MemoryRecord[]` |
| `paul/pipeline/approaches` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `analysisOutput: unknown`, `memories: MemoryRecord[]` |
| `paul/pipeline/judging` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `selectedApproach: unknown`, `analysisOutput: unknown`, `memories: MemoryRecord[]` |
| `paul/pipeline/implementation` | `runId: uuid`, `sandboxId: string`, `prompt: string`, `githubRepoUrl: string`, `githubBranch: string`, `selectedApproach: unknown`, `analysisOutput: unknown`, `judgingOutput: unknown`, `memories: MemoryRecord[]` |
| `paul/pipeline/judge` | `runId: uuid`, `sandboxId: string`, `criterion: string`, `systemPrompt: string`, `approachContext: unknown` |

**Shared type:**
```typescript
MemoryRecord = { phase: string, kind: string, content: string }
```

## Internal (can change freely)

- Zod refinements (min lengths, regex patterns)
- Default values
- Whether fields use `.url()` vs `.string()`
- Additional optional fields (adding fields is safe, removing/renaming is not)

---

## Steps

### Step 1: Add event schemas

**Files:** Modify `src/inngest/index.ts`

Add all 6 event schemas to the `schema` object.

### Step 2: Verify

Run: `bun typecheck`
Expected: PASS

### Step 3: Commit

```bash
git add src/inngest/index.ts
git commit -m "feat: add feature pipeline event schemas"
```
