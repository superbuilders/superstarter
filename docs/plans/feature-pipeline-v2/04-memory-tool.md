# Sub-Plan 04: Memory Tool

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI SDK tool for LLMs to create memory records, plus a utility to inject memories into system prompts.

**Architecture:** One tool definition (no execute function) and one pure formatting function.

**Tech Stack:** Vercel AI SDK, Zod

**Dependencies:** None

**Produces:** `src/lib/agent/memory.ts`

---

## Contract (non-negotiable)

**Tool name:** `create_memory`

**Tool input schema:**
```typescript
{
    kind: "insight" | "failure" | "decision" | "constraint",
    content: string
}
```

**`formatMemoriesForPrompt` signature:**
- Input: `{ phase: string, kind: string, content: string }[]`
- Output: `string` (formatted markdown block, or empty string if no memories)

**Unchanged from v1.**

## Internal (can change freely)

- Tool description text, markdown formatting style, grouping/sorting.

---

## Steps

1. Create `src/lib/agent/memory.ts` with `createMemoryTool` and `formatMemoriesForPrompt`.
2. `bun typecheck` — must pass.
3. Commit: `feat: add memory record tool and prompt injection`
