# Sub-Plan 05: Judge Agent Configs

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Specialist judge agent configurations — model, tools, and system prompts for each evaluation criterion.

**Architecture:** Same pattern as `src/lib/agent/explorer.ts` — modules exporting model, MAX_STEPS, tools, buildInstructions.

**Tech Stack:** Vercel AI SDK, Anthropic provider

**Dependencies:** None

**Produces:** `src/lib/agent/judges/{security,bug-hunter,compatibility,performance,quality,meta}.ts`

---

## Contract (non-negotiable)

**Judge output schema** — every judge must return this shape (the judging orchestrator parses it):

```typescript
{
    criterion: string
    verdict: "pass" | "concern" | "fail"
    findings: {
        severity: "critical" | "major" | "minor"
        description: string
        recommendation: string
    }[]
    overallAssessment: string
}
```

**Module export pattern** — each judge module exports:
```typescript
{ model, MAX_STEPS, tools, buildInstructions(context) }
```

**Judge identifiers** (used by judging orchestrator to map configs):
`security`, `bug-hunter`, `compatibility`, `performance`, `quality`

**Meta-judge** has a different signature — no sandbox tools, receives verdicts as input.

## Internal (can change freely)

- Which model each judge uses
- MAX_STEPS per judge
- System prompt content (as long as output matches the schema above)
- Which tools each judge has access to
- How the meta-judge synthesizes verdicts

---

## Steps

### Step 1: Create specialist judge configs

**Files:** Create `src/lib/agent/judges/security.ts`, `bug-hunter.ts`, `compatibility.ts`, `performance.ts`, `quality.ts`

Each follows the `explorer.ts` pattern:
- Model: `anthropic("claude-sonnet-4-6")`
- MAX_STEPS: 20
- Tools: `readTool`, `globTool`, `grepTool` (read-only)
- `buildInstructions(context)` — specialized system prompt for the criterion

System prompts instruct judges to evaluate the approach against their criterion and return the structured verdict.

### Step 2: Create meta-judge config

**Files:** Create `src/lib/agent/judges/meta.ts`

Different from specialist judges:
- Receives all judge verdicts as input (not via tools)
- No sandbox tools — pure reasoning
- Tools: only `create_memory`
- Synthesizes verdicts into overall verdict

### Step 3: Verify

Run: `bun typecheck`
Expected: PASS

### Step 4: Commit

```bash
git add src/lib/agent/judges/
git commit -m "feat: add specialist judge agent configs"
```
