# Sub-Plan 10: Judging Orchestrator

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Phase 3 orchestrator — evaluates the selected approach through a judge agent, then derives a verdict deterministically.

**Architecture:** Inngest function that runs a single judge agent inline (not a separate Inngest function), collects findings, derives verdict from finding severities.

**Tech Stack:** Inngest, Vercel AI SDK, Vercel Sandbox

**Dependencies:** 02 (Events), 03 (Persistence), 04 (Memory), 05 (Judge Config), 07 (Phase Loop)

**Produces:** `src/inngest/functions/pipeline/judging.ts`

---

## Contract (non-negotiable)

**Inngest function ID:** `paul/pipeline/judging`

**Trigger event:** `paul/pipeline/judging` (shape defined in Sub-Plan 02)

**Return shape:**
```typescript
{
    selectedApproachId: string
    findings: {
        criterion: "security" | "bugs" | "compatibility" | "performance" | "quality"
        severity: "critical" | "major" | "minor"
        description: string
        recommendation: string
    }[]
    overallVerdict: "approved" | "approved_with_conditions" | "rejected"
    conditions: {
        description: string
        severity: "critical" | "major" | "minor"
    }[]
    rejectionReason?: string
    overallAssessment: string
}
```

**v2 changes from v1:**
- **5 judges + meta-judge → 1 judge.** Single judge evaluates all criteria. No `judge-runner.ts` Inngest function. No parallel dispatch. No `paul/pipeline/judge` event.
- **Verdict derived deterministically, not by LLM.** Judge returns findings only. Orchestrator derives:
  - Any critical finding → `rejected`
  - 2+ major findings → `rejected`
  - Any major finding → `approved_with_conditions`
  - All minor or empty → `approved`
- **Conditions carry severity** (not just `string[]`). `{ description, severity }` so the coder can prioritize.
- **No meta-judge LLM call.** Deterministic aggregation is more predictable than an LLM deciding the verdict.

## Internal (can change freely)

- Judge system prompt content, whether to use AI SDK structuredOutputs for the judge, exact verdict threshold logic.

---

## Steps

1. Create `src/inngest/functions/pipeline/judging.ts`. Receives selectedApproach + analysisOutput in event. Runs one judge agent via `runAgentLoop` with the judge config from sub-plan 05. Parses judge output (findings array). Derives verdict deterministically. Builds conditions from major/minor findings. Returns structured judging output.
2. `bun typecheck` — must pass.
3. Commit: `feat: add judging phase orchestrator`
