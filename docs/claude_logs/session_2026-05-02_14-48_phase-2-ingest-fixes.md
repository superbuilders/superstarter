# Session Log: Phase 2 ingest path — admin routing, workflow dispatch, tagger JSON

**Date:** 2026-05-02, ~13:30–14:48 CDT
**Duration:** ~75 minutes
**Focus:** Repair the form-driven real-item ingest end-to-end: routing collision with the SPEC, embedding-backfill workflow not actually running, and Haiku tagger always falling back.

## What Got Done

- **Relocated admin ingest route** from `src/app/(admin)/ingest/{page,actions,_form}.tsx` to `src/app/(admin)/admin/ingest/...` so the URL is `/admin/ingest` (matching `revalidatePath('/admin/ingest')` in §7.9 of the SPEC) instead of the route-group-collapsed `/ingest`. Updated the two stale `@/app/(admin)/ingest/...` imports in `page.tsx` and `_form.tsx`. Commit `926d3ee` (`fix(admin): nest routes under /admin segment so URLs match SPEC`).
- **Switched `ingestRealItem` to dispatch via the workflow runtime.** Replaced the direct `embeddingBackfillWorkflow({ itemId })` call in `src/server/items/ingest.ts` with `start(embeddingBackfillWorkflow, [{ itemId }])` imported from `workflow/api`. Used the array-form args because the `start` signature requires `TArgs extends unknown[]`. Commit `5cfeebf` (`fix(items): start embedding-backfill via workflow runtime, not direct call`).
- **Hardened the Haiku classifier in `src/server/items/tagger.ts`.** Tightened the system prompt to "Respond with raw JSON only — no markdown code fences, no commentary, just the object." and added a `stripCodeFences` helper that matches `/^\s*\`\`\`(?:json)?\s*\n?([\s\S]*?)\n?\`\`\`\s*$/` and uses the captured group when present, trimmed raw string otherwise. Commit `e9abb4a` (`fix(tagger): strip markdown fences and tighten Haiku JSON instruction`).
- **Added `.well-known/workflow/` to the auth-proxy matcher exclusion** in `src/proxy.ts`. Documented the carve-out in a multi-line comment that explains the coupling applies to all workflows, not just embedding-backfill. Commit `6d7a610` (`fix(proxy): exclude .well-known/workflow/* from auth proxy matcher`).
- **Confirmed all four commits typecheck** via `bun --bun tsgo --noEmit`.

## Issues & Troubleshooting

- **Problem:** `/admin/ingest` and `/ingest` both 404'd (effectively — the form was unreachable at the URL the SPEC and `revalidatePath` referenced).
  - **Cause:** The route lived at `src/app/(admin)/ingest/page.tsx`. `(admin)` is a Next.js route group — the parens folder is collapsed out of the URL — so the resolved path was `/ingest`, not `/admin/ingest`.
  - **Fix:** Move the route into `src/app/(admin)/admin/ingest/`. The `(admin)` group still scopes the layout-level admin gate; the literal `admin/` segment supplies the URL.

- **Problem:** Form ingest threw "You attempted to execute workflow embeddingBackfillWorkflow function directly. To start a workflow, use start(embeddingBackfillWorkflow) from workflow/api".
  - **Cause:** `ingestRealItem` was calling the transformed workflow function as if it were a normal async. Inside the Next dev bundle, `withWorkflow()` + `@workflow/swc-plugin` rewrites the function and rejects direct invocation at runtime.
  - **Fix:** Dispatch via `start(embeddingBackfillWorkflow, [{ itemId }])` so the runtime enqueues a durable run.

- **Problem:** Hitting "Suggest" on the form always fell through to the fallback (`tagger: response was not valid JSON; using fallback`); sub-type and difficulty fields never updated from defaults.
  - **Cause:** Haiku was wrapping its JSON response in ```json … ``` fences, breaking `JSON.parse`.
  - **Fix:** Two layers — tightened the prompt to forbid fences, and defensively strip a single fenced block (with optional `json` tag) before parsing so a future-misbehaving model still parses cleanly.

- **Problem:** After the workflow `start()` fix, ingestion succeeded (row landed in DB) but `embedding` stayed null indefinitely. Specific orphan: `019dea21-bdab-7520-b524-8b100964d4ea`.
  - **Cause:** The workflow runtime registers internal HTTP handlers under `/.well-known/workflow/v1/{flow,step}` and self-dispatches calls to them from inside the dev server. Those calls carry no NextAuth session. The auth proxy's matcher (`/((?!_next/static|_next/image|favicon).*)`) didn't exclude `.well-known/workflow/*`, so the proxy 302-redirected every dispatch to `/login`. The run row was created (`run_created` event in `.next/workflow-data/runs/`) but never advanced past `pending`. Confirmed by curl: `GET /.well-known/workflow/v1/{flow,step}` → 302 → `/login`.
  - **Fix:** Add `\\.well-known/workflow/` to the matcher's negative-lookahead group. Post-fix curl returns 405 (route handler reached, wrong method) instead of 302, while `/admin/ingest` still 302-redirects when unauthed.

- **Problem (diagnosis-only):** Why did the seed script leave 55 rows fully embedded if the form path was broken?
  - **Cause:** The seed runs as a standalone Bun process (`bun run src/db/seeds/items/index.ts`), not inside Next dev. The `@workflow/swc-plugin` compiler is wired up by `withWorkflow()` in `next.config.ts` and only transforms code Next bundles. In the seed's process the workflow file is loaded untransformed; `"use workflow"` and `"use step"` are inert string-expression statements; the function executes inline as a plain async, calls `embedText()` directly, writes the embedding column itself.
  - **Fix:** None applied. Surfaced in the proxy-fix commit body so the divergence is documented; the seed never exercises the actual workflow runtime.

## Decisions Made

- **Pass workflow args as `[{ itemId }]`, not `{ itemId }`,** even though the user's instruction sketch wrote the bare-object form. The `start` overload signature requires `TArgs extends unknown[]`, so the array form is what TypeScript accepts. Verified by reading `node_modules/.bun/@workflow+core@4.2.4/.../runtime/start.d.ts`.
- **Did not refactor the seed script** to use the workflow runtime. The seed currently bypasses it accidentally (untransformed standalone Bun process), which means it never tests the dispatch path — but it does the right thing data-wise (embeddings land synchronously) and isn't worth changing right now. Documented in the commit body.
- **Diagnosed before fixing the proxy issue.** The user explicitly split the workflow-stuck-in-pending investigation into a Phase 1 diagnose step and a Phase 2 confirm-then-fix step. Held the proposed fix until they confirmed the direction.
- **Did not add step-entry/exit logging to `embedding-backfill.ts`** as a diagnostic aid. The proxy 302 was visible enough from the run-store + curl probe; instrumentation would have masked rather than illuminated the symptom.
- **Kept the orphan-cleanup SQL out of automation.** The user had specific manual SQL to run; I surfaced the queries but didn't try to fabricate a one-shot script without permission.

## Current State

- **Working:**
  - Branch `main` is 13 commits ahead of `origin/main`. Untracked: `docs/claude_logs/session_2026-05-02_13-23_phase-2-real-item-path.md` (prior session) and this file.
  - Admin form lives at `/admin/ingest` (route group `(admin)` still scopes the admin-gate layout).
  - Server action dispatches the embedding-backfill workflow via `start()`. Auth-proxy matcher now exempts `.well-known/workflow/*`; live curl returns 405 (handler reachable) instead of 302.
  - Tagger system prompt forbids markdown fences; defensive fence-strip is in place.
  - `bun --bun tsgo --noEmit` passes on the full repo.
- **Not yet verified by me:**
  - End-to-end form submission with a fresh row landing `embedding IS NOT NULL` within ~10s — needs a browser session the user owns.
  - The four manual SQL steps the user enumerated (latest-row check, orphan delete for `019dea21-bdab-7520-b524-8b100964d4ea`, count check). No `db:exec` script exists in `package.json`; deferred pending user confirmation to add one.
  - Behavior of the pre-existing pending run for `019dea21-…`: it may or may not auto-resume now that dispatch routes are reachable. Easiest path is a fresh submission + the orphan delete; the final `COUNT(*) WHERE embedding IS NULL` is what proves cleanliness.

## Next Steps

1. **Confirm end-to-end ingest in the browser.** Submit a fresh row via `/admin/ingest`, watch dev-server logs for the workflow steps' `logger.info` lines (`embedding-backfill: wrote embedding`), confirm `has_embedding = t` on the new row within ~10s.
2. **Run the orphan cleanup SQL.** Either via `db:studio`, psql, or a small one-shot Bun script if it's worth standing up. Then run the final `SELECT COUNT(*) FROM items WHERE source = 'real' AND embedding IS NULL` and confirm 0.
3. **Verify the Haiku tagger end-to-end.** Hit Suggest on the form, confirm dev logs show no `tagger: response was not valid JSON` warn line, and confirm the form's sub-type and difficulty fields update from their defaults.
4. **Decide whether the seed-script bypass is worth correcting.** Currently documented as accidental. If we want the seed to exercise the runtime (so it'd surface dispatch issues like today's proxy bug), we'd need it to either run inside the dev server or invoke `start()` against a registered worker. Low priority — flagged in the commit body.
5. **Commit the prior session log** (`session_2026-05-02_13-23_phase-2-real-item-path.md`) and this one if they should be tracked. They're currently untracked.
