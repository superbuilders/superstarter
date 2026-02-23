# Sandbox GitHub Source Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend sandbox creation to clone a GitHub repository at a specific branch using the SDK's native git source.

**Architecture:** Add an optional `github` object to the `paul/sandbox/create` event schema containing `repoUrl`, `branch`, and optional `token`. The create function builds a `source: { type: "git" }` param when `github` is present and passes it to `Sandbox.create()`. No new files — two edits.

**Tech Stack:** `@vercel/sandbox` ^1.6.0 native `source.type: "git"`, Inngest event schemas, Zod 4

**Design doc:** `docs/plans/2026-02-23-sandbox-github-source-design.md`

---

## Commit 1: `feat: add github source to sandbox creation`

### Task 1: Update Event Schema

**Files:**
- Modify: `src/inngest/index.ts:19-21`

**Step 1: Add `github` object to `paul/sandbox/create` schema**

Replace lines 19-21:

```typescript
	"paul/sandbox/create": z.object({
		runtime: z.enum(["node24", "node22", "python3.13"]).default("node24")
	}),
```

With:

```typescript
	"paul/sandbox/create": z.object({
		runtime: z.enum(["node24", "node22", "python3.13"]).default("node24"),
		github: z
			.object({
				repoUrl: z.string().url(),
				branch: z.string().min(1),
				token: z.string().min(1).optional()
			})
			.optional()
	}),
```

**Step 2: Typecheck**

Run: `bun typecheck`
Expected: PASS

---

### Task 2: Update Create Function

**Files:**
- Modify: `src/inngest/functions/sandbox/create.ts`

**Step 1: Add `buildCreateParams` helper and update the `step.run` call**

Replace the entire file with:

```typescript
import * as errors from "@superbuilders/errors"
import type { BaseCreateSandboxParams } from "@vercel/sandbox"
import { Sandbox } from "@vercel/sandbox"
import { NonRetriableError } from "inngest"
import { inngest } from "@/inngest"

function buildCreateParams(
	runtime: BaseCreateSandboxParams["runtime"],
	github?: { repoUrl: string; branch: string; token?: string }
): BaseCreateSandboxParams {
	if (!github) {
		return { runtime }
	}

	const { repoUrl, branch, token } = github

	if (token) {
		return {
			runtime,
			source: {
				type: "git" as const,
				url: repoUrl,
				revision: branch,
				depth: 1,
				username: "x-access-token",
				password: token
			}
		}
	}

	return {
		runtime,
		source: {
			type: "git" as const,
			url: repoUrl,
			revision: branch,
			depth: 1
		}
	}
}

const createFunction = inngest.createFunction(
	{ id: "paul/sandbox/create" },
	{ event: "paul/sandbox/create" },
	async ({ event, logger, step }) => {
		logger.info("creating sandbox", {
			runtime: event.data.runtime,
			repoUrl: event.data.github?.repoUrl,
			branch: event.data.github?.branch
		})

		const sandboxData = await step.run("create-sandbox", async () => {
			const params = buildCreateParams(event.data.runtime, event.data.github)
			const result = await errors.try(Sandbox.create(params))
			if (result.error) {
				logger.error("sandbox creation failed", { error: result.error })
				throw new NonRetriableError(String(result.error))
			}

			const sbx = result.data
			const description = {
				sandboxId: sbx.sandboxId,
				status: sbx.status,
				createdAt: sbx.createdAt,
				timeout: sbx.timeout,
				networkPolicy: sbx.networkPolicy,
				sourceSnapshotId: sbx.sourceSnapshotId,
				routes: sbx.routes,
				interactivePort: sbx.interactivePort,
				repoUrl: event.data.github?.repoUrl,
				branch: event.data.github?.branch
			}
			logger.info("sandbox created", description)
			return description
		})

		await step.sendEvent("echo-sandbox", [
			{
				name: "paul/debug/echo" as const,
				data: {
					source: "paul/sandbox/create",
					payload: sandboxData
				}
			}
		])

		logger.info("sandbox create complete", {
			sandboxId: sandboxData.sandboxId
		})

		return { sandboxId: sandboxData.sandboxId }
	}
)

export { createFunction }
```

**Step 2: Typecheck**

Run: `bun typecheck`
Expected: PASS

**Step 3: Lint**

Run: `bun lint:all`
Expected: PASS

**Step 4: Commit**

```bash
git add src/inngest/index.ts src/inngest/functions/sandbox/create.ts
git commit -m "feat: add github source to sandbox creation

Extend paul/sandbox/create event with optional github object containing
repoUrl, branch, and optional token for private repos. Uses @vercel/sandbox
native source.type: 'git' — no manual git clone commands."
```

---

## Manual Verification

After the commit, verify the integration:

1. Start the Inngest dev server: `bun dev:inngest`
2. Start the app: `bun dev`
3. Send a `paul/sandbox/create` event **without** github (existing behavior):
   ```json
   { "name": "paul/sandbox/create", "data": { "runtime": "node24" } }
   ```
4. Confirm sandbox creates normally, no regression
5. Send a `paul/sandbox/create` event **with** a public repo:
   ```json
   {
     "name": "paul/sandbox/create",
     "data": {
       "runtime": "node24",
       "github": {
         "repoUrl": "https://github.com/vercel/next.js",
         "branch": "canary"
       }
     }
   }
   ```
6. Check the debug echo output for `repoUrl` and `branch` in the payload
7. Use the returned `sandboxId` with an explore agent to verify files are present:
   ```json
   {
     "name": "paul/agents/explore",
     "data": {
       "prompt": "List the top-level files and directories. What repository is this?",
       "sandboxId": "<id>"
     }
   }
   ```
8. Stop the sandbox:
   ```json
   { "name": "paul/sandbox/stop", "data": { "sandboxId": "<id>" } }
   ```

---

## Summary of Changes

| File | Action | Lines (approx) |
|------|--------|-----------------|
| `src/inngest/index.ts` | Modify schema | +7 |
| `src/inngest/functions/sandbox/create.ts` | Rewrite with `buildCreateParams` | ~85 (was 52) |
