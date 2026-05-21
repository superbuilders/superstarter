# Session Log: Turbopack + Bun External-Module 500 Fix

**Date:** 2026-05-02, ~11:00–11:10 local
**Duration:** ~70 minutes
**Focus:** Diagnose and fix `bun dev` returning HTTP 500 on `/login` with `Failed to load external module pino-7be1ea1cfc3b1faa`.

## What Got Done

- Identified the root cause as a Next.js 16.2.4 / Turbopack / Bun-runtime interaction bug, not anything middleware/proxy-related.
- Captured the actual stacktrace from the 500 response body (the runtime error wasn't in the dev server's stdout): `Failed to load external module pino-7be1ea1cfc3b1faa: ResolveMessage: Cannot find package 'pino-7be1ea1cfc3b1faa'`.
- Read the Turbopack chunk to confirm codegen pattern: `__turbopack_context__.x("pino-7be1ea1cfc3b1faa", () => require("pino-7be1ea1cfc3b1faa"))`. Confirmed `.x` resolves to `externalRequire(id, thunk)` which calls `thunk()` directly (no name munging).
- Discovered Turbopack creates `.next/dev/node_modules/<package>-<16hex>` symlinks to satisfy these `require()`s. Verified with `ls -la .next/dev/node_modules/`:
  - `pino-7be1ea1cfc3b1faa -> ../../../node_modules/.bun/pino@10.3.1/node_modules/pino`
  - `pg-367f91b354a1644a -> ../../../node_modules/.bun/pg@8.20.0+52bd52a0bccfa6a2/node_modules/pg`
- Established via timing test that the symlinks are created **during the same chunk-emit pass that runs the `require()`** — so on a fresh `.next/`, the chunk's require fires before the symlink exists, Bun caches the failure permanently in-process, and every subsequent request 500s. A "warm" restart (where `.next/dev/node_modules/` already has the symlinks) returns 200 first try.
- Confirmed via web search this is the known, still-open Bun-runtime regression: [vercel/next.js#86866](https://github.com/vercel/next.js/issues/86866) and [oven-sh/bun#25370](https://github.com/oven-sh/bun/issues/25370). PR #86697 fixed Node-runtime; Bun-runtime is still broken.
- Edited `src/logger.ts`: moved the "DO NOT FUCKING TOUCH — always log debug on server" comment from `src/env.ts` into the `pino({ level: "debug" })` constructor site (where the invariant actually lives now).
- Edited `src/env.ts`: removed `import { logger } from "@/logger"` and the `if (isServerRuntime) { logger.level = "debug" }` block. The setter was redundant — pino was already constructed with `level: "debug"`.
- Edited `package.json`: `"dev": "bun --bun next dev"` → `"dev": "bun next dev"`. Left `build` and `start` scripts on `--bun` since they don't hit the dev-only Turbopack external-symlink path.
- Edited `.gitignore`: added `/.swc/` (Next.js's SWC transpile cache for `next.config.ts`, which appears once `--bun` is dropped from dev).
- Verified end-to-end with `rm -rf .next && bun dev`: first request to `/login` returned 200, two follow-up requests also 200, login page rendered, no deprecation warnings emitted, no `pino-<hash>` errors. `bun run typecheck` passed.

## Issues & Troubleshooting

- **Problem:** `bun dev` printed `Ready in 221ms` and then every `GET /login` returned 500.
  **Cause:** Turbopack codegen for `serverExternalPackages` emits `require("pino-7be1ea1cfc3b1faa")` and creates a matching symlink at `.next/dev/node_modules/pino-7be1ea1cfc3b1faa`, but under `bun --bun` the chunk's `require()` runs before the symlink is created. Bun's resolver caches the "Cannot find package" failure for the lifetime of the process.
  **Fix:** Drop the `--bun` flag from the `dev` script so Next.js's Node-runtime require-hook handles the same resolution path correctly. (Not a Next.js codegen change — the same chunks work fine when Node is the runtime.)

- **Problem:** First instinct — remove `pino` from `serverExternalPackages` in `next.config.ts` — did not fix the 500.
  **Cause:** Turbopack auto-detects pino as external (worker-thread package) regardless of the explicit list, so the same hashed-require codegen still fires.
  **Fix:** Reverted that change; pursued runtime/dev-script fix instead.

- **Problem:** `bun next dev` (without `--bun`) initially failed at config-load time with `Cannot find module './src/logger'` from `src/env.ts`.
  **Cause:** Without `--bun`, Next.js's `transpile-config.js` compiles `next.config.ts` via SWC and loads it through Node's `require.extensions['.ts']` hook. SWC's `paths` resolution rewrote `@/logger` to `./src/logger` relative to cwd, but Node tried to resolve it relative to env.ts's location (`src/`), looking for `src/src/logger`.
  **Fix:** Removed the `import { logger } from "@/logger"` and the `logger.level = "debug"` block from `src/env.ts`. The setter was a no-op against the current `logger.ts` (which constructs pino with `level: "debug"`), so removing it preserved the always-debug-on-server invariant. Moved the loud "don't touch" comment into `src/logger.ts` so the next person who tries to weaken the level sees it.

- **Problem:** Tried a Bun runtime plugin (`Bun.plugin` + `bunfig.toml` `preload`) to rewrite `pino-<hash>` → `pino` at resolve time.
  **Cause/Result:** Wrote a minimal `/tmp/bun-plugin-test` reproducer. The plugin loaded and `setup()` fired, but `onResolve` only ran for the entrypoint — it did not fire for inner CJS `require()` calls inside the chunk. This matches [oven-sh/bun#9863](https://github.com/oven-sh/bun/issues/9863). Abandoned the approach.

- **Problem:** Two stale-looking warnings in the dev log: `The "middleware" file convention is deprecated. Please use "proxy" instead.` and `Next.js can't recognize the exported config field in "/src/middleware"` — even though `src/middleware.ts` is deleted and `src/proxy.ts` exists with `export const config = …` inline.
  **Cause:** Both warnings only fired under `bun --bun`. They disappeared once the dev script switched to `bun next dev`. Likely a Bun-runtime quirk in how Next's file-watcher/AST-extractor sees the working tree; not investigated further since the fix dropped `--bun` anyway.
  **Fix:** Implicit — removed by the runtime change. No source edit needed.

- **Problem:** Misleading comment in `src/proxy.ts` claiming `export { config }` "produces a compile error and 500s every request."
  **Cause:** That comment was written based on the wrong root-cause hypothesis from an earlier session — the 500s were always the pino-external bug. The inline `export const config` is still the right form (Next.js's `extractExportedConstValue` does AST analysis and won't follow re-exports), so the *action* is correct; only the *reason* in the comment is wrong.
  **Fix:** Left as-is. Not blocking. Flagged here for the user to clean up if desired.

## Decisions Made

- **Drop `--bun` from `dev` only, not from `build`/`start`.** The Turbopack hashed-external symlink creation is a dev-only code path. Production `next build` uses a different chunk layout and isn't affected, so there's no reason to take the Bun-runtime perf hit off `build`/`start`.
- **Move the always-debug invariant into `src/logger.ts` instead of keeping the env.ts setter as a redundant safety net.** The setter was already redundant (pino is constructed with `level: "debug"`), and keeping the import forced env.ts to be reachable through the broken Turbopack path. Centralizing the invariant in `logger.ts` (with the original loud comment) preserves intent without the cross-module coupling.
- **Did not pursue the Bun runtime plugin / preload workaround** even though it would have let us keep `--bun`. Bun's `onResolve` doesn't fire for CJS `require()` inside compiled chunks, so the workaround can't actually intercept the offending call.
- **Did not pursue pre-seeding `node_modules/<package>-<hash>` symlinks.** It worked in testing (HTTP 200 from a wiped `.next/` when the hashed symlinks were pre-created at project root), but the hashes are Turbopack-internal and version-dependent — hardcoding them would silently break on a Next.js bump. The runtime-switch fix is more durable.
- **Left `src/proxy.ts` alone.** The inline `export const config` is correct; only its accompanying comment's *reason* is wrong. Not worth a churn commit.

## Current State

- `bun dev` works end-to-end from a wiped `.next/`. Cold first request to `/login` returns 200 in ~3s, follow-up requests in ~50–80ms.
- No deprecation warnings emitted.
- `bun run typecheck` is green after the changes.
- Working-tree changes from this session (uncommitted, alongside pre-existing edits the user already had open):
  - `M .gitignore` — added `/.swc/`
  - `M package.json` — `dev` script now `bun next dev`
  - `M src/env.ts` — removed `@/logger` import + level setter
  - `M src/logger.ts` — added the always-debug comment
- Pre-existing unstaged changes (untouched by this session): `D src/middleware.ts`, `?? src/proxy.ts`, plus the docs/phase-1-manual-verification.md move and the prior session log.
- `build` / `start` scripts still use `--bun`. Not retested in this session — only `dev` was in scope.

## Next Steps

1. **Commit the fix** as a focused change: `.gitignore` + `package.json` + `src/env.ts` + `src/logger.ts`. Suggested message: `fix(dev): drop --bun from dev script to avoid turbopack external-module bug`.
2. **Decide what to do with the bundled `proxy.ts` / `middleware.ts` deletion** that was already in the working tree before this session — those want their own commit independent of this fix.
3. **Verify `bun build` and `bun start` still work** under `--bun`. They weren't exercised this session; only `bun dev` was.
4. **Update or delete the misleading comment in `src/proxy.ts`** ("`export { config }` produces a compile error and 500s every request"). The inline `export const` is still right, but the stated reason is the old wrong hypothesis.
5. **Watch [vercel/next.js#86866](https://github.com/vercel/next.js/issues/86866) / [oven-sh/bun#25370](https://github.com/oven-sh/bun/issues/25370)** for the upstream fix. Once landed, restoring `bun --bun next dev` is a one-line revert.
