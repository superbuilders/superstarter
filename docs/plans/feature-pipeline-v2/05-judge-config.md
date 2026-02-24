# Sub-Plan 05: Judge Config

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Single judge agent configuration that evaluates across all criteria: security, bugs, compatibility, performance, code quality.

**Architecture:** Same pattern as `src/lib/agent/explorer.ts`. One module, one agent, one structured output covering all criteria.

**Tech Stack:** Vercel AI SDK, Anthropic provider

**Dependencies:** None

**Produces:** `src/lib/agent/judge.ts`

---

## Contract (non-negotiable)

**v2 change:** 5 specialist judges + meta-judge → 1 judge. Same output schema but returns findings across all criteria. No meta-judge — verdict is derived deterministically from findings.

**Judge output schema:**
```typescript
{
    findings: {
        criterion: "security" | "bugs" | "compatibility" | "performance" | "quality"
        severity: "critical" | "major" | "minor"
        description: string
        recommendation: string
    }[]
    overallAssessment: string
}
```

**Verdict is NOT in the LLM output.** Derived deterministically by the judging orchestrator:
- Any critical finding → `fail`
- 2+ major findings or any fail → `rejected`
- Any major finding → `concern` (maps to `approved_with_conditions`)
- All minor or empty → `pass` (maps to `approved`)

**Module export pattern:**
```typescript
{ model, MAX_STEPS, tools, buildInstructions(context) }
```

**Judge system prompt must include project-specific enforced patterns** (no try/catch, sentinel errors, no arrow functions, etc.) — the judge should catch patterns that `bun lint` will reject.

## Internal (can change freely)

- Which model, MAX_STEPS, system prompt content (as long as output matches schema).
- How the judge partitions its attention across criteria.

---

## Steps

1. Create `src/lib/agent/judge.ts` following the `explorer.ts` pattern. Model: `anthropic("claude-sonnet-4-6")`, MAX_STEPS: 20, tools: `readTool`, `globTool`, `grepTool` (read-only). System prompt instructs judge to evaluate all 5 criteria and return structured findings. Include project-specific lint rules in the prompt.
2. `bun typecheck` — must pass.
3. Commit: `feat: add judge agent config`
