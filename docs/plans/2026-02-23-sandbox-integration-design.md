# Sandbox Integration Design

## Goal

Replace `node:fs` operations with Vercel Sandbox-backed operations so agents have an isolated filesystem in production. Sandbox-only — no local fallback.

## Architecture

### Tool Context Injection

Tools remain static module-level exports. The `Sandbox` instance flows through the AI SDK's `experimental_context` mechanism:

```
generateText({ ..., experimental_context: { sandbox } })
    → tool execute({ args }, { experimental_context })
        → extractSandbox(experimental_context)
            → operations.read(sandbox, path)
```

No factories, no closures, no module-level mutable state.

### Separation of Concerns

Agents do not create or manage sandboxes. They receive a `sandboxId` in their event data and connect via `Sandbox.get()`. Sandbox lifecycle is managed by dedicated Inngest functions.

```
Caller creates sandbox (paul/sandbox/create)
    → receives sandboxId
    → sends agent event with sandboxId (paul/agents/explore)
        → agent connects via Sandbox.get()
        → agent does work
    → caller stops sandbox (paul/sandbox/stop)
```

### File Structure

```
src/lib/agent/fs/
├── operations.ts     # REWRITTEN — sandbox-backed read, glob, grep, write, edit
├── tools.ts          # MODIFIED — tools pull sandbox from experimental_context
└── context.ts        # NEW — Zod validation for tool context + extractSandbox helper

src/inngest/functions/
├── sandbox/
│   ├── create.ts     # paul/sandbox/create — creates sandbox, echoes data
│   └── stop.ts       # paul/sandbox/stop — stops sandbox by id, echoes data
├── agents/
│   ├── explore.ts    # MODIFIED — receives sandboxId, connects, passes via experimental_context
│   └── code.ts       # MODIFIED — same pattern
└── debug/
    └── echo.ts       # EXISTING — unchanged
```

## Design Details

### context.ts

Solves the `unknown` → `Sandbox` type problem without `as` assertions. Uses Zod runtime validation.

Defines `ErrSandboxContext` sentinel error. When this error propagates to an Inngest function, it should be caught and re-thrown as `NonRetriableError` — retrying won't fix a missing sandbox.

```typescript
const ErrSandboxContext = errors.new("sandbox missing from tool context")

function extractSandbox(context: unknown): Sandbox
```

### operations.ts — Rewrite

Every function takes `Sandbox` as first parameter. The big simplifications:

| Operation | Before | After |
|-----------|--------|-------|
| `read` | `stat()` + `readFile()` (node:fs) | `sandbox.readFileToBuffer()` |
| `glob` | 75 lines: walkDirectory + globToRegex + convertGlobChar | `sandbox.runCommand("find", [...])` |
| `grep` | 80 lines: file walking + line scanning + binary detection | `sandbox.runCommand("grep", ["-rn", ...])` |
| `write` | `mkdir()` + `writeFile()` (node:fs) | `sandbox.writeFiles([...])` |
| `edit` | `readFile()` + string replace + `writeFile()` | `readFileToBuffer()` + replace + `writeFiles()` |

Deleted helpers: `walkDirectoryFromBase`, `globToRegex`, `convertGlobChar`, `searchFileLines`, `resolveGrepOptions`.

`runCommand` returns `cmdId`, `cwd`, `startedAt`, `exitCode`, stdout, stderr. All logged per the maximal data extraction axiom.

Return types (`ReadResult`, `GlobResult`, `GrepResult`, `WriteResult`, `EditResult`) and error sentinels (`ErrNotFound`, `ErrTooLarge`, etc.) stay the same — the interface doesn't change.

### tools.ts — Modified

Same static tool exports. Execute functions change from:

```typescript
execute: async ({ path }) => {
    const result = await errors.try(read(path))
    ...
}
```

To:

```typescript
execute: async ({ path }, { experimental_context }) => {
    const sandbox = extractSandbox(experimental_context)
    const result = await errors.try(read(sandbox, path))
    ...
}
```

Input schemas unchanged. LLM never sees sandboxId.

### explorer.ts / coder.ts — Unchanged

Static tool objects, model config, instructions. No changes needed.

### Event Schema Changes

```typescript
// Agent events now require sandboxId
"paul/agents/explore": z.object({
    prompt: z.string().min(1),
    sandboxId: z.string().min(1)
})

"paul/agents/code": z.object({
    prompt: z.string().min(1),
    sandboxId: z.string().min(1)
})

// New sandbox lifecycle events
"paul/sandbox/create": z.object({
    runtime: z.enum(["node24", "node22", "python3.13"]).default("node24")
})

"paul/sandbox/stop": z.object({
    sandboxId: z.string().min(1)
})
```

### sandbox/create.ts

Creates a sandbox and echoes full sandbox metadata via `paul/debug/echo`. Returns `{ sandboxId }`.

Uses a `describeSandbox(sbx)` helper to extract all known fields into a plain object — single place to update when the SDK adds new properties.

### sandbox/stop.ts

Connects to a sandbox by id, stops it, echoes final state.

### agents/explore.ts and agents/code.ts

Modified to:
1. Read `event.data.sandboxId`
2. Connect via `Sandbox.get({ sandboxId })`
3. Pass sandbox in `experimental_context` to `generateText`
4. Catch `ErrSandboxContext` and throw `NonRetriableError`

## What's NOT In Scope

- Database persistence of sandbox metadata
- Snapshot save/restore
- Network policy switching
- Port exposure
- Git clone source loading
- Local filesystem fallback
