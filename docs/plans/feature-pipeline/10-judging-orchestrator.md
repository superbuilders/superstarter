# Sub-Plan 10: Judging Orchestrator

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 3 orchestrator — evaluates the selected approach through 5 specialist judges running in parallel, then synthesizes a meta-verdict.

**Architecture:** Inngest function that dispatches 5 judge runners via `step.invoke()` in parallel, collects verdicts, runs meta-judge synthesis.

**Tech Stack:** Inngest, Vercel AI SDK, Vercel Sandbox

**Dependencies:** 02 (Events), 03 (Persistence), 04 (Memory), 05 (Judge Configs), 07 (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/judging.ts`, `src/inngest/functions/pipeline/judge-runner.ts`

---

## Contract (non-negotiable)

**Inngest function IDs:** `paul/pipeline/judging`, `paul/pipeline/judge`

**Trigger events:** `paul/pipeline/judging`, `paul/pipeline/judge` (shapes defined in Sub-Plan 02)

**Judging return shape** (the master orchestrator parses this):
```typescript
{
    selectedApproachId: string
    judgeVerdicts: {
        criterion: string
        verdict: "pass" | "concern" | "fail"
        findings: {
            severity: "critical" | "major" | "minor"
            description: string
            recommendation: string
        }[]
        overallAssessment: string
    }[]
    overallVerdict: "approved" | "approved_with_conditions" | "rejected"
    conditions: string[]
    rejectionReason?: string
    synthesizedRisks: string[]
}
```

**Judge runner return shape:** The judge output schema from Sub-Plan 05.

## Internal (can change freely)

- How judges are dispatched (parallel vs sequential)
- Meta-judge implementation (inline LLM call vs separate function)
- How verdicts are aggregated into overall verdict
- Thresholds for approved/conditions/rejected

---

## Steps

### Step 1: Create judge runner

**Files:** Create `src/inngest/functions/pipeline/judge-runner.ts`

Generic Inngest function (`paul/pipeline/judge`) that:
1. Receives criterion, system prompt, sandbox ID, and approach context
2. Connects to sandbox
3. Runs the agent loop with the judge's tools (read/glob/grep)
4. Returns the judge's verdict matching the Sub-Plan 05 contract shape

### Step 2: Create judging orchestrator

**Files:** Create `src/inngest/functions/pipeline/judging.ts`

Inngest function (`paul/pipeline/judging`) that:
1. Receives selected approach + analysis output in event
2. Builds judge system prompts using configs from Sub-Plan 05
3. Spawns 5 judge runners in parallel via `step.invoke(judgeRunnerFunction)`:
   - Security Reviewer
   - Bug Hunter
   - Backwards Compatibility Checker
   - Performance Analyst
   - Code Quality Reviewer
4. Collects all 5 verdicts
5. Runs meta-judge synthesis (inline `generateText` call, not a separate Inngest function):
   - If any judge has `fail` verdict → overall is `rejected`
   - If all pass with only minor concerns → `approved`
   - If major concerns but no failures → `approved_with_conditions`
6. Returns the judging output matching the contract shape

### Step 3: Verify

Run: `bun typecheck`
Expected: PASS

### Step 4: Commit

```bash
git add src/inngest/functions/pipeline/judging.ts src/inngest/functions/pipeline/judge-runner.ts
git commit -m "feat: add judging phase orchestrator"
```
