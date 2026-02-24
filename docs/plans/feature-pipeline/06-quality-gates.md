# Sub-Plan 06: Quality Gate Runners

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Utility functions that run typecheck, lint, test, and build in a Vercel Sandbox and return structured pass/fail results.

**Architecture:** Pure functions that execute commands via `sandbox.runCommand()` and return structured results. Never throw on gate failure.

**Tech Stack:** Vercel Sandbox SDK

**Dependencies:** None

**Produces:** `src/lib/pipeline/quality-gates.ts`

---

## Contract (non-negotiable)

**Gate result shape** — the implementation orchestrator parses this:
```typescript
{
    gate: "typecheck" | "lint" | "test" | "build"
    status: "passed" | "failed"
    output: string
}
```

**Function signatures:**
```typescript
runTypecheck(sandbox) → GateResult
runLint(sandbox) → GateResult
runTests(sandbox) → GateResult
runBuild(sandbox) → GateResult
runAllGates(sandbox) → GateResult[]
```

**`runAllGates` behavior:** Runs gates in order (typecheck → lint → test → build). Stops on first failure. Returns array of results for all gates run (including the failed one).

## Internal (can change freely)

- Exact commands run in sandbox (e.g., `tsc --noEmit` vs `bun typecheck`)
- Timeout per gate
- How stdout/stderr are captured and formatted into `output`
- Whether to retry transient failures

---

## Steps

### Step 1: Create quality gates module

**Files:** Create `src/lib/pipeline/quality-gates.ts`

Each gate function:
1. Executes the command via `sandbox.runCommand()`
2. Captures stdout, stderr, exitCode
3. Returns `status: 'passed'` if exitCode === 0, else `status: 'failed'`
4. Combines stdout + stderr into the `output` field
5. Does NOT throw on failure

`runAllGates` runs all four sequentially, short-circuiting on first failure.

### Step 2: Verify

Run: `bun typecheck`
Expected: PASS

### Step 3: Commit

```bash
git add src/lib/pipeline/quality-gates.ts
git commit -m "feat: add quality gate runners"
```
