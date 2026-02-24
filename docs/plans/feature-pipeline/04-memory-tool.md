# Sub-Plan 04: Memory Tool

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI SDK tool for LLMs to create memory records, plus a utility to inject memories into system prompts.

**Architecture:** One tool definition (no execute function — dispatched by orchestrator loop) and one pure formatting function.

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

## Internal (can change freely)

- Tool description text
- Markdown formatting style (headers, bullets, ordering)
- How memories are grouped/sorted

---

## Steps

### Step 1: Create memory module

**Files:** Create `src/lib/agent/memory.ts`

1. `createMemoryTool` — AI SDK `tool()` with no execute function, description instructs the LLM when to create memories
2. `formatMemoriesForPrompt(memories)` — groups by kind, prefixes each with `[phase]`, returns markdown block or empty string

### Step 2: Verify

Run: `bun typecheck`
Expected: PASS

### Step 3: Commit

```bash
git add src/lib/agent/memory.ts
git commit -m "feat: add memory record tool and prompt injection"
```
