# Sub-Plan 06: Quality Gate Runners

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Utility functions that run typecheck, test, lint, and build in a Vercel Sandbox.

**Architecture:** Pure functions, never throw on failure, return structured results.

**Tech Stack:** Vercel Sandbox SDK

**Dependencies:** None

**Produces:** `src/lib/pipeline/quality-gates.ts`

---

## Contract (non-negotiable)

**Gate result shape:**
```typescript
{
    gate: "typecheck" | "test" | "lint" | "build"
    status: "passed" | "failed"
    output: string   // max 8000 chars, tail-biased (keep last N chars)
}
```

**Function signatures:**
```typescript
runTypecheck(sandbox) → GateResult
runTests(sandbox) → GateResult
runLint(sandbox) → GateResult
runBuild(sandbox) → GateResult
runAllGates(sandbox) → GateResult[]
```

**v2 changes from v1:**
- **Gate order fixed:** typecheck → test → lint → build (functional gates before style gates). This is non-negotiable — moved from "internal" to contract.
- **Output truncation:** max 8000 chars, tail-biased. Prevents token overflow when gate output is injected into coder retry context.

## Internal (can change freely)

- Exact commands, timeouts, stdout/stderr formatting, transient retry logic.

---

## Steps

1. Create `src/lib/pipeline/quality-gates.ts`. Each function runs command via `sandbox.runCommand()`, captures output, truncates to 8000 chars (tail-biased), returns structured result. Never throws. `runAllGates` runs in order: typecheck → test → lint → build, short-circuits on first failure.
2. `bun typecheck` — must pass.
3. Commit: `feat: add quality gate runners`
