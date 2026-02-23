# Sandbox GitHub Source Design

**Goal:** Allow sandbox creation to clone a GitHub repository at a specific branch, supporting both public and private repos.

**Approach:** Extend the existing `paul/sandbox/create` Inngest event with an optional `github` object. Use the `@vercel/sandbox` SDK's native `source: { type: "git" }` parameter — no manual `git clone` commands.

---

## Event Schema

```typescript
"paul/sandbox/create": z.object({
    runtime: z.enum(["node24", "node22", "python3.13"]).default("node24"),
    github: z.object({
        repoUrl: z.string().url(),
        branch: z.string(),
        token: z.string().optional()
    }).optional()
})
```

- `github` is all-or-nothing: either provide the full object or omit it entirely
- `repoUrl` and `branch` are required within the object
- `token` is optional — only needed for private repos (GitHub PAT)
- When `github` is omitted, behavior is unchanged (empty sandbox)

## Create Function Logic

```typescript
if (event.data.github) {
    const { repoUrl, branch, token } = event.data.github
    const source = token
        ? { type: "git", url: repoUrl, revision: branch, depth: 1,
            username: "x-access-token", password: token }
        : { type: "git", url: repoUrl, revision: branch, depth: 1 }
    Sandbox.create({ runtime: event.data.runtime, source })
} else {
    Sandbox.create({ runtime: event.data.runtime })
}
```

The SDK's `source.type: "git"` handles:
- Cloning the repository
- Checking out the specified revision (branch, tag, or commit SHA)
- Shallow clone via `depth: 1`
- Authentication via `username`/`password` (GitHub PAT uses `x-access-token` as username)

## Sandbox Metadata

When `github` is present, include `repoUrl` and `branch` in the description echoed to `paul/debug/echo`:

```typescript
const description = {
    sandboxId: sbx.sandboxId,
    status: sbx.status,
    // ... existing fields ...
    repoUrl: event.data.github?.repoUrl,
    branch: event.data.github?.branch
}
```

## What Doesn't Change

- **Agents** — still receive `sandboxId`, connect via `Sandbox.get()`, unaware of GitHub
- **File operations** — unchanged, cloned files are just sandbox filesystem entries
- **Sandbox stop** — unchanged, stop by `sandboxId` regardless of creation method
- **Database schema** — no changes, sandbox metadata is ephemeral through Inngest

## Files Modified

| File | Change |
|------|--------|
| `src/inngest/index.ts` | Add optional `github` object to `paul/sandbox/create` schema |
| `src/inngest/functions/sandbox/create.ts` | Branch on `event.data.github` presence, build `source` param |

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Event structure | Extend existing event | One event, agents don't care about the difference |
| GitHub fields | Grouped `github` object | All-or-nothing prevents impossible partial states |
| Auth mechanism | PAT via event data | Per-invocation flexibility, no env dependency |
| Clone method | Native SDK `source.type: "git"` | SDK handles auth, shallow clone, revision checkout |
| Working directory | SDK default (likely `/repo`) | SDK manages clone destination |
| Private repo support | Yes, via optional `token` | Full scope from day one |
