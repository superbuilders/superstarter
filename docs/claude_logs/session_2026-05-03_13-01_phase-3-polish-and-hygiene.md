# Session Log: Phase 3 polish — race fix, lefthook + lint sweep, startSession idempotency, plan adaptations

**Date:** 2026-05-03 13:01 CDT
**Duration:** ~5 hours (continuous)
**Focus:** Address the four pre-push concerns from the Phase 3 session report (focus-shell race window, lefthook + accumulated lint debt, startSession idempotency, plan-only framework-constraint notes), in order, one commit each. Each fix surfaced adjacent issues that required pre-step commits before the planned commit could land cleanly.

## What Got Done

Six commits land on `main`, all with green typecheck + lint + smoke sign-off. The session ran four planned commits (A, B, C, D); two pre-step commits (A.5, A.6) were inserted to unblock A's smoke run.

- **`d0bf57b chore(workflows): remove unused example workflow`** [A.5]
  - Deleted `src/workflows/example.ts` (superstarter scaffolding, zero callers verified via `grep -r helloWorkflow src/ scripts/`).
  - Sign-off: `bun typecheck` clean. NOT a dev-server fix on its own — explicitly noted in the commit body.

- **`51bc09e fix(workflows): isolate logger from workflow-function import graph`** [A.6]
  - Created `src/workflows/embedding-backfill-steps.ts` and `src/workflows/mastery-recompute-steps.ts`. Step bodies + `@/logger` imports moved into the helper files.
  - Slimmed `src/workflows/embedding-backfill.ts` and `src/workflows/mastery-recompute.ts` to workflow-function-only orchestration; only import is from the sibling `*-steps` module.
  - For mastery-recompute: extracted the inline `logger.info` between metadata-load and per-sub-type loop into a new `logRecomputeLoopStartingStep` step, preserving observability while keeping the workflow file logger-free.
  - Sign-off: dev server starts (HTTP 302 on `/`, HTTP 200 on `/login`). Workflow plugin reports `Created manifest with 10 steps, 2 workflows, and 0 classes`. `phase3-commit1.ts` and `phase3-commit3.ts` smokes both PASS, including cron-triggered `masteryRecomputeWorkflow` execution proven by `masteryRecomputeWorkflow: starting per-sub-type recompute loop` log line firing through the step runtime.

- **`142ce27 fix(focus-shell): close submitPending race window`** [A]
  - **Reducer (`src/components/focus-shell/shell-reducer.ts`):** `submit_started` no longer clears `submitPending` (only sets `interQuestionVisible` for the post-submit fade). `set_question_started` (dispatched when next item's `<ItemSlot>` mounts) is the new clear point. `submit` and `triage_take` are reducer-level idempotent against an in-flight submit (return same state if already pending).
  - **Component (`src/components/focus-shell/focus-shell.tsx`):** Keyboard handler reads `stateRef.current.submitPending` and early-returns; refactored to single guard so cognitive complexity stays under biome's threshold. Submit-button onClick mirrors the same guard.
  - **Smoke (`scripts/dev/smoke/phase3-commit2-browser.ts`):** Added `runEnterSpamStressCheck()` helper. After the existing single-submit roundtrip, selects an option and fires 5 `keyboard.press('Enter')` back-to-back, then asserts the debug card's `items submitted` increments by exactly 1 (NOT 5).
  - Sign-off: smoke PASSED with `stressSubmitsBefore: 1 → stressSubmitsAfter: 2` (delta 1, 5 enters in 14ms — well inside the 200ms threshold). All other smoke checks green; 0 console errors.

- **`00a17a2 chore(repo): install lefthook + sweep accumulated lint debt`** [B]
  - `bunx lefthook install` writes `.git/hooks/pre-commit`. `lefthook.yml` keeps `lint` + `typecheck` steps; `format` step intentionally disabled with inline rationale (two pre-existing-on-main bugs documented).
  - Renamed `biome/base.json` → `biome/base.jsonc` so the includes block can carry inline comments.
  - Added biome ignore entries with self-documenting comment blocks: `!src/app/.well-known/workflow/**` (plugin-emitted webhook route), `!.claude/tracking/**` (Claude Code harness output), and 11 self-declared EXEMPT scripts under `scripts/_lib/*` and `scripts/*.ts`.
  - `scripts/dev/shared/files.ts:isSkippedPath` carries the same `EXEMPT_PATHS` list so super-lint enforces the same contract as biome (both must stay in sync).
  - Fixed 14 pre-existing violations in the two non-EXEMPT smokes: hardcoded `CHROMIUM_PATH` (no `??`, no `process.env`); captured `errors.try()` result in `deleteSession`; reordered the `await browser.close()` ahead of `logger.error` so the throw immediately follows the log call; replaced two `match[1] ?? "0"` fallbacks with explicit undefined checks. Hardcoded `APP_BASE` in commit3 smoke; added `logger.error` before each of the 5 `throw`s in `setup` and `readSession`.
  - Folded in pre-existing working-tree drift in `scripts/_lib/{explain,extract,solve-verify}.ts` (type-only Anthropic SDK imports — files are now in the EXEMPT list).
  - Fixed one super-lint violation in `src/components/focus-shell/focus-shell.tsx` from Commit A: `const isTriage = key === "T" || key === "t"` rewritten as `const lowerKey = key.toLowerCase(); const isTriage = lowerKey === "t"` (`no-logical-or-fallback` rule rejects `||` in const assignments).
  - Created `scripts/dev/fmt-bug-repro.ts` as a tracking artifact for the fmt.ts parser bug (shape characterized; isolated reproduction not yet achieved).

- **`e087ac9 feat(server): make startSession idempotent on in-progress sessions`** [C]
  - **`src/server/sessions/start.ts`:** Before inserting, look up existing in-progress session for `(user_id, type, sub_type_id)`. Fresh (`last_heartbeat_ms` within 5min): return its sessionId verbatim, `recency_excluded_item_ids` left as frozen snapshot. Stale: finalize as `'abandoned'` synchronously in the same transaction with the same UPDATE shape the abandon-sweep cron writes (`ended_at_ms = last_heartbeat_ms + 30s`, `completion_reason = 'abandoned'`), then proceed with fresh insert.
  - **`src/server/sessions/abandon-threshold.ts`** NEW — single-source of `ABANDON_THRESHOLD_MS = 5 * 60_000` and `HEARTBEAT_GRACE_MS = 30_000`. Both consumers (start.ts + cron route) import from here.
  - **`src/app/api/cron/abandon-sweep/route.ts`:** Imports threshold constants from shared file; trimmed unused re-exports of `ABANDON_THRESHOLD_MS / HEARTBEAT_GRACE_MS / POST` down to just `POST` (Next.js's required handler export).
  - **`scripts/dev/smoke/phase3-commit5.ts:loadDrillSession`:** Filter `endedAtMs IS NOT NULL` retained; comment reframed to acknowledge it's the semantically-correct query for "find the drill we just ran" (idempotency closes the strict-mode case but post-completion server-action revalidation still creates orphans — a separate problem).
  - **`scripts/dev/smoke/start-session-idempotency.ts`** NEW — 4-scenario smoke covering rapid resume, stale-finalize+fresh-insert, different-subType partitioning, diagnostic idempotency on subTypeId-IS-NULL match.
  - Sign-off: idempotency smoke 4/4. `phase3-commit5.ts` 13/13. Pre-extraction grep showed two identical `5 * 60_000` literals; post-extraction the literal lives only in `abandon-threshold.ts`.

- **`dc55a6f docs(plans): record Phase 3 framework-constraint adaptations and tooling-boundary observations`** [D]
  - Inline `Implementation note` after §6.5 pseudo-code: cacheComponents requires Suspense-wrapped inner async component for the diagnostic gate.
  - Inline `Implementation note` next to §10 commit 4's `(app)/page.tsx` line: `typedRoutes: true` rejects `<Link href>` to dynamic param routes that haven't been built yet; use plain `<a>` tags for forward-references.
  - New §11.1 (framework-constraint adaptations) cross-references the two inline notes.
  - New §11.2 (tooling-boundary observations) records the "lint scope follows ownership scope" meta-pattern with three precedents (workflow webhook routes, workflow function import graphs, EXEMPT scripts) plus the workflow manifest count offset (+3 built-in steps from `workflow/internal/builtins`) and the verification recipe.
  - New §11.3 (open follow-ups): post-completion orphan path that idempotency does NOT close, the disabled lefthook format step, and the "smoke is the contract" meta-observation.

## Issues & Troubleshooting

- **Problem:** `bun run dev` failed with `[plugin: workflow-node-module-error] You are attempting to use "pino"` immediately after `Created steps bundle`. Couldn't run the Commit A smoke without dev server.
  **Cause:** `@workflow/next` plugin scans the import graph of every `"use workflow"` file and rejects any reachable Node.js-runtime dependency. `src/workflows/example.ts`, `embedding-backfill.ts`, and `mastery-recompute.ts` all `import { logger } from "@/logger"` at module top-level, transitively pulling in pino.
  **Fix:** Two commits before A. A.5 deleted the dead `example.ts` (proven dead via grep — zero callers). A.5 alone was insufficient (proven by re-running dev — same error fired against the next workflow file in line). A.6 split each remaining workflow file into a sibling `*-steps.ts` helper that owns the `@/logger` import (the SWC plugin externalizes step files from the workflow bundle, so the node-module guard doesn't traverse into them). Verified by reading `@workflow/builders/dist/swc-esbuild-plugin.js` to understand the externalization boundary.

- **Problem:** Local Docker postgres wasn't running on port 54320 when the smoke first attempted to connect.
  **Cause:** Docker daemon socket was at `/var/run/docker.sock` (not the Desktop default); the `18seconds-postgres` container existed but in `Created` state, never started. Migrations had also never been applied to the (fresh) volume.
  **Fix:** `DOCKER_HOST=unix:///var/run/docker.sock docker start 18seconds-postgres`, then `CREATE EXTENSION vector` (pgvector wasn't pre-installed), then `bun run db:migrate && bun run db:push:programs && bun run db:seed && bun run db:seed:items`. The smoke also needed a specific user with id `dd2d98ab-e015-4892-84d0-1c12754028cf` (hardcoded in `phase3-commit2-browser.ts`); inserted via raw SQL.

- **Problem:** Refactoring the smoke for Commit A introduced a new biome `noExcessiveCognitiveComplexity` violation in `runSmoke()` (complexity 20, max 15).
  **Cause:** The stress-check block I added inline pushed the existing function past threshold. Pre-stash baseline showed 7 violations on HEAD; my addition added a 20-complexity flag. None of the other 7 were mine.
  **Fix:** Extracted the stress logic to `runEnterSpamStressCheck(page)` with a small `readSubmittedCount(page)` helper. Brought the count back to 7 (parity with HEAD~1, all pre-existing — Commit B's scope).

- **Problem:** `bunx lefthook run pre-commit` (Commit B's sign-off step) corrupted `src/server/items/selection.ts:372-373` into literal `}ive\n}ive`, breaking typecheck with TS1128.
  **Cause:** The format step in lefthook config (`run: bun run format`) invokes `scripts/dev/fmt.ts --strip-comments --write`, which has a parser bug: when stripping comments from a file containing an `if/else if/else` chain whose final `else` block uses a `never`-exhaustiveness pattern (`const _exhaustive: never = X; return _exhaustive`), the brace-insertion pass corrupts the closing `}` by joining it with truncated tail characters of the `_exhaustive` identifier. Compounded by a SECOND pre-existing config bug: the format step uses `getFilesToCheck()` (entire tsconfig include set) instead of `{staged_files}`, so combined with `stage_fixed: true` it would auto-stage ~96 unrelated files per commit.
  **Fix:** Disabled the format step in `lefthook.yml` with a multi-line inline comment documenting both bugs. Created `scripts/dev/fmt-bug-repro.ts` as a tracking artifact (the shape was characterized but isolated reproduction failed — the bug needs file-graph context the minimal repro lacks). Restored the 96 unintended format-pass modifications via `git checkout -- $(git status --short | grep -E '^ M|^MM' | awk '{print $NF}')` to recover the working tree. lefthook still runs `lint` + `typecheck` on every commit — those are the safety nets.

- **Problem:** Running `bun run lint` initially surfaced 281 violations across 14 files, way more than the documented "scripts/_lib/* drift" the user expected.
  **Cause:** 11 of the 14 lint-failing files carry an explicit `EXEMPT FROM THE PROJECT RULESET` header in their source (project convention), but biome doesn't read file-header markers. Plus a one-file `src/` "surprise": `src/app/.well-known/workflow/v1/webhook/[token]/route.js` (auto-generated by `@workflow/next`'s `createWebhookBundle`, byte-for-byte verified against the plugin's template literal at `base-builder.js:826-855`, gitignored, not user-authored).
  **Fix:** STOPPED before sweeping the 11 EXEMPT files — they self-declare exempt and refactoring them would contradict the documented intent. After authorization, added biome ignore entries (with self-documenting comment block) for the EXEMPT list explicitly (path-by-path, not wildcard, so new files don't auto-exempt themselves). Added the same list to `scripts/dev/shared/files.ts:EXEMPT_PATHS` so super-lint enforces the same contract. The webhook route ignored via `!src/app/.well-known/workflow/**`. Converted `biome/base.json` → `biome/base.jsonc` to support inline comments (biome rejects comments in plain `.json`).

- **Problem:** Commit C's first smoke run (`phase3-commit5.ts` with the orphan filter reverted, per the original spec) failed two SQL checks: drill session not finalized (endedAtMs null), and 0 attempts on the loaded session.
  **Cause:** The spec's premise — "orphan rows can no longer exist by construction" after idempotency lands — was too strong. Idempotency closes the *intra-render* double-startSession path (strict-mode + cacheComponents) but doesn't close the *post-completion* server-action-revalidation path. After `endSession` fires from the focus-shell handler, Next.js auto-revalidates the form-action's source route, which re-runs the run page's server-side `startSession`. By that point the previous session is finalized, so the idempotency check correctly creates a NEW empty row. Trace from dev log: `endSession: session finalized as completed` at 12:45:15.673 → `startSession: inserted` (Session B, no attempts) at 12:45:15.766 → final `GET /`.
  **Fix:** Restored the `endedAtMs IS NOT NULL` filter in `loadDrillSession` and reframed the comment: it's the semantically-correct query for "find the drill we just ran," not an orphan workaround. Documented the post-completion path as a Phase 5 follow-up in §11.3. Idempotency code itself unchanged — it still closes the strict-mode case (proven by the new 4/4 idempotency smoke).

- **Problem:** The +3 step-count discrepancy (manifest "10 steps" vs `grep -c '"use step"' = 7` after A.6) was potentially evidence of helper-extraction error.
  **Cause:** Not an extraction error. `workflow@4.x` auto-injects 3 built-in steps from `workflow/internal/builtins.js`: `__builtin_response_array_buffer`, `__builtin_response_json`, `__builtin_response_text`. They let workflow code call `await response.json()` on `fetch()` results across the VM boundary (where streaming Response bodies need to be reified to serializable values via steps).
  **Fix:** Diagnosis only — no code change. Recorded the discovery in §11.2 of the plan with a verification recipe: `grep -rn '"use step"' src/workflows/`, add 3, compare against the dev startup log line `Created manifest with N steps, M workflows, and 0 classes`. If the math doesn't match, the helper extraction silently dropped or duplicated a step.

- **Problem:** The T-key triage handler rewrite in Commit B (`key.toLowerCase() === "t"` replacing `key === "T" || key === "t"`) needed behavioral verification before Commit C — the triage path is load-bearing on the §5.2 BrainLift pedagogy.
  **Fix:** Wrote a one-off probe at `scripts/dev/t-key-probe.ts` that drives `/phase3-smoke`, waits for the triage prompt at t=19s, presses lowercase `t` (asserts `items submitted` 0→1), waits another 19s for the next prompt, presses `Shift+T` (asserts 1→2). Both PASS. Probe deleted post-verification (one-off, not committed).

## Decisions Made

- **Two pre-A commits (A.5 + A.6) instead of folding the workflow split into A.** Each fix has its own scope: A.5 is dead-code cleanup; A.6 is the precedent-setting pattern for Phase 4's pipeline workflows. Per user direction: "Two separate commits — cleaner blast-radius separation." A.5 commit body explicitly says it does NOT fix dev on its own to keep the next reader honest about cause/effect.

- **Helper-file extraction over `await import("@/logger")` for the workflow logger fix.** Per-step dynamic-import overhead would cost on every step invocation, and Phase 4's pipeline workflows would need the same fix anyway. Helper extraction is the precedent worth setting.

- **Disable lefthook's format step (Path X), not fix the format bugs in this session.** Per user direction. The fmt.ts parser bug is a separate refactor (needs test cases, would be its own commit); the unbounded scope is its own config change. Format step disabled with a multi-line inline rationale; `bun run format` remains available manually. Re-enable when both are addressed (Phase 4 prep).

- **Biome ignore for the 11 EXEMPT files (Path A from Commit B's options), not refactor them.** EXEMPT headers are a documented project convention. Refactoring 267 violations across 11 files would contradict the documented intent and risk regressions in code that's settled and CI-irrelevant. The proposed (c) hybrid (refactor `_lib/`, ignore standalone scripts) was rejected because Phase 4's generation pipeline lives in `src/server/generation/` — a fresh `src/` path that follows the ruleset from day one — so the OCR pipeline's helpers won't be load-bearing dependencies. Listed each EXEMPT file by path (not wildcard) so new files in `scripts/_lib/` don't auto-exempt themselves.

- **Restore `loadDrillSession`'s `endedAtMs IS NOT NULL` filter; ship Commit C's idempotency anyway (Path P).** The spec's "orphans can no longer exist by construction" premise was wrong; the post-completion server-action-revalidation orphan source still exists. Reframing the filter as the semantically-correct query for "find the drill we just ran" is honest. Idempotency still has real value (eliminates the strict-mode orphan source, closes the dev-only artifact). Phase 5 should investigate the post-completion path properly when adding the post-session review composition.

- **Extract the abandon threshold to a shared file as part of Commit C.** Per user refinement: the cron and idempotency MUST stay in lockstep. Now both `start.ts` and `route.ts` import `ABANDON_THRESHOLD_MS` and `HEARTBEAT_GRACE_MS` from `src/server/sessions/abandon-threshold.ts`. Future tightening (per §11's note about possibly 3 minutes) updates one constant.

- **`submit.ts:FIVE_MINUTES_MS` left alone.** It's the latency tripwire from plan §9.1 — a separate concept that happens to share the value. Different semantic meaning, no need to consolidate.

- **`b62b...` (Commit B) covers the `||` violation in `focus-shell.tsx` even though it's `src/`.** It was Commit A's regression that biome accepted but super-lint rejected. Commit B's whole point is "lefthook now catches what was slipping through" — fixing it in B is the natural closing of that loop. Pattern: `key.toLowerCase() === "t"`, behaviorally identical, verified by the T-key probe.

- **Each commit signs off with explicit smoke runs, not just "tests pass."** User-driven discipline: typecheck + lint + a smoke that exercises the actual fix path. The "smoke is the contract" meta-pattern recorded in §11.3 — Commit B's pre-commit hook caught Commit A's missed `||`, and Commit C's `phase3-commit5.ts` smoke caught the wrong "by construction" premise.

## Current State

**Six commits ahead of `origin/main`, working tree clean. All sign-off criteria green.**

```
dc55a6f  docs(plans): record Phase 3 framework-constraint adaptations and tooling-boundary observations  [D]
e087ac9  feat(server): make startSession idempotent on in-progress sessions                              [C]
00a17a2  chore(repo): install lefthook + sweep accumulated lint debt                                     [B]
142ce27  fix(focus-shell): close submitPending race window                                               [A]
51bc09e  fix(workflows): isolate logger from workflow-function import graph                              [A.6]
d0bf57b  chore(workflows): remove unused example workflow                                                [A.5]
```

What's working in this branch state, beyond what shipped in the original Phase 3:

- **lefthook is wired.** `.git/hooks/pre-commit` runs `lint` + `typecheck` on every commit; both pass on the staged set across the whole tree (319 files biome-checked, 0 violations; super-lint reports 0 violations).
- **The submitPending race window is closed.** Reducer-level idempotent against in-flight submits; dispatch-site early-return; smoke verifies 5 Enter presses → 1 submit (delta 1, not 5).
- **Dev server starts cleanly.** Workflow plugin no longer rejects pino through workflow files. Manifest reports 10 steps (7 user + 3 runtime built-ins) / 2 workflows / 0 classes.
- **`startSession` is idempotent.** Two rapid drill calls return the same sessionId; stale sessions get finalized atomically with the fresh insert; threshold lives in one shared file with the cron.
- **All 5 phase-3 smokes pass:** commit1 (server), commit2-browser (focus-shell + race stress), commit3 (heartbeat + abandon-sweep), commit4 (10 checks including diagnostic flow + tier-degraded count), commit5 (13 checks including drill end-to-end). New 6th smoke `start-session-idempotency.ts` (4 scenarios) also passes.
- **Plan reflects implementation reality.** §6.5 + §10 commit 4 carry inline implementation notes for the cacheComponents-Suspense and typedRoutes-`<a>` framework constraints. §11 has three new sub-headings (.1 framework adaptations, .2 tooling-boundary meta-pattern with three precedents + workflow manifest verification recipe, .3 open follow-ups).

Local environment state worth recording:

- Local docker postgres is **running** (`18seconds-postgres` container started from previously-Created state during this session). Volume seeded with all migrations + sub-types + strategies + 55 items + the smoke target user.
- Dev server is **not running** at session end (was started multiple times for smokes, killed each time).
- `scripts/dev/fmt-bug-repro.ts` exists as a tracking artifact for the fmt.ts parser bug (committed in B). The bug shape is characterized but isolated reproduction not yet achieved.

What's NOT pushed: all six commits are local. Working tree clean. Awaiting "authorize push" before shipping to `origin/main`.

## Next Steps

1. **Push the six commits to `origin/main` after authorization.** Single push covers A.5, A.6, A, B, C, D. No PR workflow in this repo — direct push to main is the established pattern.
2. **Investigate the post-completion orphan source in Phase 5 prep.** Tracked in plan §11.3. Candidates listed (skip form-action source-route revalidation on completion, revalidate `/` only, or detect recently-finalized sessions in run page's `startSession`). Don't pre-commit to a fix shape — the post-session review composition Phase 5 adds will determine the right answer.
3. **Fix the fmt.ts `--strip-comments` parser bug.** Tracked in plan §11.3 + `scripts/dev/fmt-bug-repro.ts`. Two-part work: (a) finish isolating the trigger shape (will likely need the file-graph context the minimal repro lacks), (b) fix the brace-insertion pass to not overlap identifier ranges. Once fixed, also (c) limit `lefthook.yml`'s format step to `{staged_files}` instead of full repo scan, and (d) re-enable the format step in pre-commit.
4. **Phase 4 generation pipeline workflows should adopt the helper-extraction pattern from day one.** Per A.6's precedent — `generateItem`, `validateItem`, `scoreItem`, `deployItem` workflow files should import only from sibling `*-steps.ts` modules, never from `@/logger` or any other pino-reachable package directly. Pattern documented in plan §11.2.
5. **Consider tightening the 5-minute abandon threshold.** Currently lives in `src/server/sessions/abandon-threshold.ts`. Plan §11's existing forward-looking note suggests possibly 3 minutes if real-world usage shows it's too generous. Lower bound is ~90 seconds (3× heartbeat interval); below that, false-abandons start hitting honest users.
