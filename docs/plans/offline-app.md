# offline-app — Plan-Doc

Round: offline-app.
Round-open hash: `79dee59` (`docs(perf): resolve R-leonardiwata-2680 pin with identity mapping`; end-session-perf C4 close + housekeeping). Working tree clean at C0.
Branch: `offline-app`, created off `main` at `79dee59`, pushed to `origin/offline-app`.
Round-close hash: TBD.

> **Round-shape decision (closed-plan-immutable from C0).** Audit-only commit-0. No code, no script, no HTML. C0 audits the testbank content shape and quality, audits the repo conventions for the offline app's home (`public/offline-app/`) and the export script (`scripts/`), records the already-made design decisions, and surfaces content gotchas. C1+ executes the build (export script → offline HTML → cross-browser test → merge).

---

## §0 Round metadata

### §0.1 Round name

`offline-app`.

### §0.2 Opened

2026-05-16.

### §0.3 Branch

`offline-app`, branched off `main` at `79dee59`. Tracked on `origin/offline-app`. This round merges back to `main` at C4 (unlike recent perf rounds, which committed straight to `main`).

### §0.4 Goal

A minimal standalone **offline practice app** for cohort distribution. Two files: `public/offline-app/index.html` (the app) + `public/offline-app/testbank.json` (the question bank). Users either download both files, or visit `https://18seconds.vercel.app/offline-app/` and open the HTML. The HTML loads the testbank via a **file picker** (`<input type="file">`) so it works from `file://` with no CORS error and no server.

### §0.5 Audit findings

Detailed findings are in §2. The headline facts:

- **Single-table export.** `items` stores choices in an `options_json` jsonb column — there is **no separate `choices` table**, so the export is a single-table read with no join (only an optional join to `sub_types` for display names).
- **Body is text-only.** `items.body` is jsonb but its Zod schema (`src/server/items/body-schema.ts`) is a discriminated union with **exactly one variant: `{ kind: "text", text: string }`**. All 50 seeds, all 389 imports, and all 437 sibling-generation files confirm text-only bodies. No HTML, no LaTeX, no images, no MathJax needed. (Some stems contain unicode math glyphs — `×`, `²` — but those are plain characters in plain text.)
- **`explanation` is nullable.** It is a `text` column on `items`, declared without `.notNull()`. Coverage at the live-bank level could **not** be confirmed at C0 (see §0.5.1).
- **`brutal` tier is thin.** Of 389 imported items, only **5** are `brutal` (vs 134 easy / 179 medium / 71 hard). The offline app's 50-Q session composition must not assume four evenly-stocked tiers.

#### §0.5.1 ⚠️ DB was unreachable at C0 — live counts are unconfirmed

The `items` table lives in production RDS Postgres, reached via AWS IAM auth + Vercel OIDC. At C0:

- The local `.env.local` has no `DATABASE_LOCAL_URL`, so `@/db` targets production RDS.
- The `VERCEL_OIDC_TOKEN` in `.env.local` is **expired** (`ExpiredTokenException`: token expiry was ~`1778587496`, current time ~`1778947662`).
- The Docker daemon is not running, so there is no local `pgvector/pgvector:pg18` container to fall back to.

A temporary read-only inspection script was written, run (it failed at the auth step), and **deleted** — it was never staged or committed. Consequently, **live per-sub-type counts, per-tier counts, and explanation-coverage % could not be obtained at C0.** The §2 counts below are derived from on-disk import/generation artifacts, which are an *approximation* — they do not reflect admin retire/reject transitions or candidate→live promotion. Getting the live numbers is the first task of C1 (see §5) and requires a fresh OIDC token or a running local DB.

### §0.6 Reconciliation — carry-forward from prior rounds

- **User identity mapping (carried from `end-session-perf` C4 housekeeping, commit `79dee59`):** Vercel username `leonardiwata-2680` ↔ GitHub username `ryoiwata` — the **same person**. The four "out-of-band" prod deploys flagged in that round were the user's own manual Vercel dashboard work.
- **Cross-round-durable home for this mapping is TBD.** Today the mapping lives only inside `docs/plans/end-session-perf.md` §0.11-RC (a round-scoped doc — not durable for future rounds). The repo root has `AGENTS.md` (with `CLAUDE.md` symlinked to it), but it currently holds only Bun-usage tooling guidance. **Decide at C1 (or round-close):** add a "Project facts" section to `AGENTS.md`, or create `docs/project-facts.md`. C0 does not touch either file — flagged here, not actioned.

### §0.7 Success criteria

1. The testbank JSON generates cleanly from the production DB via the C1 export script.
2. The offline HTML opens in Chrome, Firefox, and Safari on desktop and renders a full 50-question practice session end-to-end.
3. The user can complete a session, see correct/incorrect feedback **with explanations**, and see a per-sub-type summary at the end.
4. The offline HTML makes **no network requests** once the testbank is loaded — verified in the browser network panel. (Implication: any third-party library must be inlined into the single HTML file, not pulled from a CDN at runtime.)

### §0.8 Non-goals

No mastery state, no adaptive selection, no spaced repetition, no sync-back to the server, no analytics, no mobile-native build, no content updates without re-downloading the JSON. The testbank JSON is **fully public** — answers and explanations included. That is acceptable for this use case (cohort practice, not commercial test prep).

### §0.9 C0-immutable

The §2 audit findings and the §0.7 / §0.8 decisions are frozen at C0. Later cycles may *refine* them against measured data (e.g., fill in live counts) but may not silently rewrite them — a divergence must be explained in the commit ledger.

### §0.10 Forward-watch (W-* items)

- **W-explanation-coverage** — what fraction of `status='live'` items have a non-empty `explanation`? Unknown at C0 (DB unreachable). C1 export script must measure this and the C1 prompt must set a null-explanation policy (see H-equivalent register §4 and §5).
- **W-per-sub-type-item-count** — live item count per sub-type. Imports range 10–54 per sub-type (§2), but live counts differ. C1 measures.
- **W-per-tier-item-count** — `brutal` is thin in imports (5/389). Confirm the live `brutal` count; the offline 50-Q session composition (§4 W-session-composition note) must degrade gracefully if a tier is nearly empty.
- **W-stem-content-format** — text-only confirmed at C0. The watch: the export script **must hard-fail** on any `body.kind !== "text"` so a future visual schema variant (the body-schema comment lists `text_with_image`, `chart`, `grid`, …) cannot silently ship a broken offline app.
- **W-testbank-json-size** — measure the exported `testbank.json` size at C1; informs the §4 H2 single-file-vs-chunked decision.
- **W-offline-url-resolution** — does `https://18seconds.vercel.app/offline-app/` resolve to `index.html`, or only the explicit `/offline-app/index.html`? Next.js serves `public/` files verbatim and does not do directory-index resolution by default. Confirm at C3; the distribution instructions must use whichever URL actually works.
- **W-session-composition** — how the offline app picks 50 questions (uniform random across the bank, balanced per sub-type, or a tier mix). This is a C2 build decision, not a C0 one; recorded here so C2 addresses it explicitly.

### §0.11 Pin index

No pin from a prior round directly governs this work — the open `end-session-perf` pins all concern the live app's server runtime, which the offline app does not touch. Two are tangentially relevant and noted for the record:

- `R-prod-domain-mismatch-18seconds-tech-vs-vercel-app` — confirms the distribution URL must use `https://18seconds.vercel.app`, **not** a `.tech` domain (none is attached).
- `R-leonardiwata-2680-out-of-band-prod-deploys` — RESOLVED; its identity mapping is carried forward in §0.6.

No new pins opened at C0.

---

## §1 Commit ledger

### C0 — audit (this commit)

- **Type:** plan-doc, read-only audit. No code, no script, no HTML.
- **Files touched:** `docs/plans/offline-app.md` (new).
- **Branch:** `offline-app` created off `main` at `79dee59`.
- **Outcome:** testbank content shape audited; repo conventions audited; design decisions recorded; content gotchas surfaced (§2). DB found unreachable — live counts deferred to C1.

### C1 — testbank export (this commit)

- **Type:** code. Net-new export script + generated artifact + durable-doc edit.
- **Files touched:** `scripts/export-testbank.ts` (new), `public/offline-app/testbank.json` (new, generated), `AGENTS.md` ("Project facts" section appended), `docs/plans/offline-app.md` (this ledger entry).
- **Redirector decisions at C1-open:**
  - Path A — refresh OIDC, export against production RDS. No local Docker fallback.
  - Null-explanation policy: option (3) — export `explanation: null` as-is; count and report; never skip or fail.
  - Sub-type display names sourced from `src/config/sub-types.ts` (live-app source of truth), not the `sub_types` DB rows.
  - Identity-mapping durable home: `AGENTS.md` "Project facts" section (chosen over a new `docs/project-facts.md`).
- **OIDC refresh:** `vercel env pull .env.local` refreshed `VERCEL_OIDC_TOKEN` (project `ryo-iwatas-projects/18seconds`, `development` env). A temporary reachability probe (`scripts/_c1-reachability-check.ts`, deleted before staging — never committed) confirmed `hasEnvToken: true` and a live sample row. Path A succeeded; no Docker fallback needed.
- **Hard-fail validations:** all four implemented in `export-testbank.ts` — (1) non-`text` `body.kind`; (2) `correct_answer` not matching exactly one `options_json[].id`; (3) option count `< 2` or `> 5` (canonical max from `optionsJsonSchema` in `src/server/items/selection.ts`); (4) row `status !== 'live'`. **None triggered** — all 448 live items passed validation.
- **Live counts measured (resolving §0.10 W-* items):**
  - **Total live items:** 448 (vs the §2.5 on-disk approximation of "at least a few hundred").
  - **Per tier** (W-per-tier-item-count): easy 141, medium 228, hard 73, **brutal 6**.
  - **Per sub-type** (W-per-sub-type-item-count):

    | Sub-type | Section | Live count |
    |----------|---------|-----------:|
    | verbal.antonyms | verbal | 35 |
    | verbal.letter_series | verbal | 16 |
    | verbal.analogies | verbal | 43 |
    | verbal.sentence_completion | verbal | 61 |
    | verbal.critical_reasoning | verbal | 59 |
    | numerical.number_series | numerical | 49 |
    | numerical.lowest_values | numerical | 41 |
    | numerical.fractions | numerical | 9 |
    | numerical.percentages | numerical | 34 |
    | numerical.averages | numerical | 18 |
    | numerical.ratios | numerical | 16 |
    | numerical.workrate | numerical | 21 |
    | numerical.speed_distance_time | numerical | 17 |
    | numerical.word_problems | numerical | 29 |

  - **Explanation coverage** (W-explanation-coverage): **448/448 = 100%.** Zero null explanations. The null-explanation policy (option 3) is wired into the script, but the live null set is empty — no items export with `explanation: null`.
  - **testbank.json size** (W-testbank-json-size): 493,285 bytes ≈ **481.7 KB** (2-space pretty-printed; 448 items + 14 sub-types). Comfortably a single file — confirms H2 lean (a).
- **§0.9 reconciliation:** the §2.5 on-disk-artifact counts are now superseded by these live numbers. Per-sub-type and per-tier live counts run higher than the import-log approximation (seed items + promoted generated siblings) except `numerical.fractions` (import 10 → live 9). This is the refinement §0.9 anticipates, not a silent rewrite — §2.5 is left intact as the C0-frozen approximation.
- **AGENTS.md:** "Project facts" section appended (10 lines) with the `leonardiwata-2680` ↔ `ryoiwata` identity mapping — promoted from the round-scoped `end-session-perf` plan-doc to a durable cross-round home. `CLAUDE.md` symlink → `AGENTS.md` verified intact (resolves §0.6 TBD).
- **Outcome:** `public/offline-app/testbank.json` generated and validated. C2 (offline HTML) is unblocked.
- **C2 readiness note:** the `brutal` tier holds only **6** live items bank-wide — a per-sub-type `brutal` draw is effectively impossible (6 items spread across 14 sub-types). C2's 50-Q session composition (W-session-composition) must not assume four evenly-stocked tiers. A balanced per-sub-type draw of 50 across 14 sub-types (~3–4 each) is feasible: the thinnest sub-type, `numerical.fractions`, has 9 live items.

### C2 — offline HTML (this commit)

- **Type:** code. Net-new single-file offline app.
- **Files touched:** `public/offline-app/index.html` (new), `biome/base.jsonc` (lint-exempt registration), `docs/plans/offline-app.md` (this ledger entry).
- **Decisions locked at C2-open:**
  - **H1 stack:** vanilla JS, single HTML file. No Alpine, no Preact, no build step, no runtime CDN. CSS inline in `<style>`, JS inline in `<script>` IIFE.
  - **H2 packaging:** single `testbank.json` — confirmed by C1's 481.7 KB measurement.
  - **H3 don't-reshow:** within-session only — Fisher-Yates shuffle + slice. No `localStorage` / `sessionStorage` / `IndexedDB`; state is in-memory only.
  - **Session composition (resolves W-session-composition):** user-selected sub-types (default all 14 checked), uniform random within the selected pool, **tier-agnostic** (`brutal` at 6 items bank-wide is too thin to balance).
  - **Session length picker:** `10 / 25 / 50 / All selected`, default 50.
  - **Testbank refresh:** footer "Download latest testbank" link to `https://18seconds.vercel.app/offline-app/testbank.json` (the `.vercel.app` domain per the `R-prod-domain-mismatch` pin), `target="_blank" rel="noopener"`, user-initiated.
  - **UX:** light theme, system font stack, neutral zinc grays with green `#16a34a` / red `#dc2626` correct-wrong feedback, no animations.
- **File:** `public/offline-app/index.html` — 28,005 bytes (~27 KB), **790 lines** total (159 CSS, 602 JS, 29 HTML skeleton incl. an 18-line header comment). Under the 1000-line target.
- **Lint exemption (unanticipated by the C2 brief):** the pre-commit hook's biome lints JS embedded in HTML files with the full TS-app ruleset. That ruleset's `no-iife` plugin directly contradicts the C2 brief, which itself specifies a "module-pattern IIFE"; `noForEach` / `no-inline-ternary` / `noExcessiveCognitiveComplexity` likewise target app source, not a standalone vanilla-JS static artifact. `biome/base.jsonc` already has a sanctioned mechanism for this — a `files.includes` exempt list whose contract requires both a `!`-negation entry **and** an "EXEMPT FROM THE PROJECT RULESET" file header. `public/offline-app/index.html` was registered in both per that contract. This is the third file in the commit (the brief assumed two); flagged as a §3.15-style assumption-meets-reality deviation.
- **Three screens, single page:** setup (`setup-empty` → `setup-configured`), question, summary. Single module-scope `state` object; `render()` rebuilds `#app` via `replaceChildren`; handlers mutate state then `render()`. All testbank text rendered via `textContent` (XSS guard) — never `innerHTML`. Keyboard: `1-5` / `a-e` select an option, `Enter` advances.
- **Manual sanity check (served over `http://localhost` — Playwright blocks `file://`; the file-picker flow is identical either way):** all checks **passed** — setup screen renders ✓; file picker loads `testbank.json` ✓; 14 sub-type checkboxes with counts matching C1 (Antonyms 35, Fractions 9, …) ✓; 10-Q session completes end-to-end via both mouse and keyboard ✓; wrong-answer feedback colors options `wrong`/`correct`/`muted` + verdict + explanation ✓; summary renders per-sub-type and per-tier tables (Brutal row `0 / 0 / —`) ✓; missed-questions disclosure, "Start new session", and invalid-file inline error all work ✓. No app-originated console errors or network requests.
- **Unexpected discoveries:**
  - Many items carry **5 options**, not 4 — Sentence Completion / Critical Reasoning items are commonly 5-option. The app handles the full 2–5 range (letters A–E, keys `1-5`/`a-e`); C1's export already confirmed the 2–5 bound.
  - Invalid-file-while-configured: the app keeps the previously-loaded testbank and shows the error inline rather than resetting to empty — a deliberate resilience improvement over the spec's "reset" (which was written for the empty case).
- **Rough edges flagged for C3 testing:** (1) long Critical-Reasoning stems and long explanations rely on `white-space: pre-wrap` + the 680px container — eyeball overflow on narrow viewports; (2) `newSession()` preserves the chosen session length rather than resetting to 50 (intentional, but confirm it reads well); (3) "End session" has no confirmation dialog — an accidental click ends the run.
- **W-* items:** **W-session-composition resolved** (uniform random within user-selected pool, tier-agnostic, within-session no-repeat). **W-offline-url-resolution remains open for C3** (does the bare `/offline-app/` path resolve to `index.html` on the deployed site?).
- **Outcome:** `public/offline-app/index.html` complete and locally verified. C3 (cross-browser test) is next.

### C3a — preview deploy + URL resolution check (this commit)

- **Type:** deploy + verification. No code changes. Touches `docs/plans/offline-app.md` (this ledger entry) only.
- **Preview deployment:** `dpl_nNVewd8TTPDe6KhpXii5xz7vcgdg` — `https://18seconds-oo30wiu2y-ryo-iwatas-projects.vercel.app`. Deployed from branch `offline-app` @ `383034b` via `vercel --no-wait` (preview target — `target: null`, not prod). Build **Ready** in ~1 min (Building 17:45:43Z → Ready by 17:46:14Z). Preview app health: `/api/health` → `{"ok":true}` 200 — the build is genuinely healthy.
- **⚠️ Headline finding — the `/offline-app/*` paths are auth-gated; not publicly served.** All four probed paths redirect to the app login:

  | Path | Result |
  |------|--------|
  | `/offline-app/index.html` | `302 → /login` |
  | `/offline-app/` | `302 → /login` |
  | `/offline-app` | `302 → /login` |
  | `/offline-app/testbank.json` | `302 → /login` |

  Two protection layers observed. (1) Vercel **Deployment Protection** (SSO) returns `401 "Authentication Required"` to anonymous curl on every preview path — bypassed for this check with `vercel curl` (auto-generates a protection-bypass token; the sanctioned agent path, per the 401 page's own embedded `llms.txt` note). (2) Past the Vercel SSO layer, the **app's own NextAuth proxy** (`src/proxy.ts` — Next 16's `proxy`, i.e. middleware) 302-redirects to `/login` with `authjs` cookies set.
- **Root cause (`src/proxy.ts`):** the proxy matcher `/((?!_next/static|_next/image|favicon|\.well-known/workflow/|api/sessions/[^/]+/heartbeat).*)` matches `/offline-app/*` — it excludes only `_next` / `favicon` / workflow / heartbeat, **not** `public/` static assets. The handler's `PUBLIC_PREFIXES` (`/api/auth`, `/login`, `/api/health`, `/api/cron`, `/api/admin`) does not include `/offline-app`, so an unauthenticated `/offline-app/*` request falls through to `Response.redirect("/login")`. Static files under `public/offline-app/` are thus gated behind app authentication.
- **Impact:**
  1. **§0.4 distribution path broken** — "visit `https://18seconds.vercel.app/offline-app/` and open the HTML" bounces unauthenticated visitors (cohort members without 18seconds accounts) to `/login`.
  2. **C2 testbank-refresh link broken** — the offline app's footer "Download latest testbank" link to `https://18seconds.vercel.app/offline-app/testbank.json` redirects to `/login` for unauthenticated users.
  3. **Primary distribution path unaffected** — downloading both files and opening `index.html` via `file://` does not depend on the URL being public.
- **W-offline-url-resolution — NOT resolved; escalated.** The original question (does bare `/offline-app/` resolve to `index.html`?) could **not** be measured: the NextAuth proxy short-circuits the request before Vercel's static-file layer is reached. The more consequential answer supersedes it — `/offline-app/*` is not publicly served at all. Even after a proxy fix, the bare-directory-index behavior still needs a re-probe.
- **Suggested fix (NOT done in C3a — no code changes this commit):** add `"/offline-app"` to `PUBLIC_PREFIXES` in `src/proxy.ts` (one line; the `startsWith` carve-out mechanism already exists). Redirector decision for a follow-up commit.
- **Content verification — blocked.** `index.html` / `testbank.json` content could not be HTTP-verified past the proxy redirect. Both files are confirmed committed at `383034b` (`git ls-tree`) and static `public/` assets deploy verbatim, so they are in the deployment — just not anonymously reachable.
- **Prod unaffected (§3.16):** the production deployment before and after the preview deploy is unchanged — `dpl_GK52EP42MKndso7ZWehtzQoLCdNu` (`18seconds-2tsdnmokh…`, 4d old, the `end-session-perf` C3 promotion). Prod health `https://18seconds.vercel.app/api/health` → 200. The preview deploy did not touch prod.
- **Handoff to C3b (user-driven manual test):** the preview URL now requires **two** logins (Vercel SSO, then 18seconds NextAuth) before `/offline-app/index.html` is reachable — so the `file://` test is the priority and is unaffected. The redirector may want to fix `src/proxy.ts` before C3b so the preview-URL test is meaningful for the unauthenticated-distribution scenario.

### C3a.5 — proxy carve-out for /offline-app (this commit)

- **Type:** code (one-line fix) + durable-doc edit. Resolves the C3a headline finding.
- **Redirector decision:** View A — keep the offline app publicly distributable. Add `/offline-app` to the proxy's public allowlist.
- **Files changed:** `src/proxy.ts` (one entry added to `PUBLIC_PREFIXES` + a 7-line contract comment), `AGENTS.md` ("Public route carve-outs" entry appended to Project facts), `docs/plans/offline-app.md` (this ledger entry).
- **The fix:** `"/offline-app"` added to `src/proxy.ts`'s `PUBLIC_PREFIXES`. The proxy handler already iterates that list with `path.startsWith(prefix)` and returns `undefined` (allow) on a match, so the one entry makes every `/offline-app/*` request — `index.html`, `testbank.json`, and any future asset — bypass the NextAuth redirect. The matcher regex is left untouched; the allowlist check inside the handler is the carve-out point.
- **Carve-out contract (documented in both `src/proxy.ts` and `AGENTS.md`):** `/offline-app` is the first *content-delivery* entry in `PUBLIC_PREFIXES` — the others are all auth machinery (`/api/auth`, `/login`) or operational endpoints (`/api/health`, `/api/cron`, `/api/admin`). It is intentionally public: the testbank ships answers + explanations and is designed for unauthenticated download by cohort members who may have no 18seconds account. **Nothing sensitive may be placed under `public/offline-app/`.**
- **W-proxy-carve-out-contract-documented — resolved.** The contract is recorded in `src/proxy.ts` (inline comment above the entry) and `AGENTS.md` Project facts (durable cross-round home).
- **W-offline-url-resolution — pending final confirmation.** This commit applies the fix; the preview redeploy + anonymous re-curl that confirm `/offline-app/*` no longer redirects to `/login` run *after* this commit (results in the C3a.5 stop-and-report). Note the prod-vs-preview auth distinction: preview URLs sit behind Vercel Deployment Protection (SSO) regardless of the app's NextAuth proxy, so anonymous curl against the *preview* may still 401 at the Vercel layer — `vercel curl` is used to bypass Vercel SSO and observe the app proxy's real (post-fix) behavior.

### C3b — manual cross-browser testing (user-driven, no commit)

- **Type:** manual verification by user. No code changes, no commit of its own; recorded here and folded into the C4 round-close.
- **Scope tested:** `file://` on **Firefox / Linux only**. Chrome and Safari deferred to a future round per user decision.
- **All four §0.7 success criteria met on Firefox:** testbank loads via the file picker; a full mini-session completes end-to-end; the summary screen renders with both the per-sub-type and per-tier tables; the Network tab shows **zero requests** during the session.
- **Specific verifications:** correct-answer rendering (green); incorrect-answer rendering (red + correct option highlighted green); explanation panel display; "Start new session" preserves config (selected sub-types + session length); "View missed questions" disclosure section works; em-dash display for 0/0 tier rows (no `NaN%` bug).
- **File path observed:** Firefox served from `file:///run/user/1000/doc/a3e1bcc9/index.html` — the Linux Files-app sandboxed mount path. Confirms a genuine `file://` protocol, not a local server.
- **Deferred:** Chrome / Safari verification; narrow-viewport (400px-width) overflow check. Tracked as R-* pins in §6.

### C4 — C3-close + round-close (this commit)

- **Type:** plan-doc only. No code changes. Round-close commit; the merge to `main` follows it.
- **Files touched:** `docs/plans/offline-app.md` (this ledger entry + §6 round-close).
- **Patterns banked this round:**
  - **§3.17** (1/5) — an audit must cover middleware/proxy layers, not just static-serving conventions. Discriminator from §3.15: §3.15 is *mechanism-wrong-within-the-correct-area*; §3.17 is an *entire-layer-missed*. First occurrence this round: C0 audited `public/` but missed `src/proxy.ts`; C3a discovered the gap; C3a.5 fixed it.
  - **§3.18** (1/5) — an API/tooling error mid-execution leaves state in an ambiguous place; recovery requires explicit verification before the next action. First occurrence this round: C3a.5 hit an API error after commit+deploy but before push+report; recovery went via a user-driven `git status` check before the redirector drafted the recovery prompt.
- **Pins:** 8 W-* items retired; 3 R-* items opened (see §6).
- **Merge:** `offline-app` → `main` with `--no-ff` (merge commit, feature-branch boundary preserved in history) immediately after this commit pushes. C4 assumed prod would auto-deploy from the merge; that assumption was wrong and was corrected at C4-finalize.
- **Round status:** claimed CLOSED at C4, but the round was not actually closed until C4-finalize completed the manual prod deploy + verification.

### C4-finalize — manual prod deploy + true round close (this commit)

- **Type:** deploy + docs. No application code changes; production release + durable-doc correction.
- **Files touched:** `AGENTS.md` (Project facts `Deployment mechanism` subsection), `docs/plans/offline-app.md` (this ledger entry + §6 updates).
- **Precondition correction:** the C4 brief assumed Vercel would auto-deploy `main` after the merge. That assumption was false. At C4-finalize-open, `main` had advanced to `27cc6fa` after the offline-app merge commit `97ceef6`, but the `18seconds` production alias still pointed at a 6-day-old deployment and `https://18seconds.vercel.app/offline-app/index.html` still returned `302`.
- **Deploy target handling:** because `main` had moved past `97ceef6`, the manual prod deploy was executed from a temporary worktree pinned to `97ceef6` so the production artifact matched the intended offline-app release rather than the later `.agents/*` docs-only commit.
- **Manual prod deploy:** `vercel --prod --no-wait` to the explicit `18seconds` Vercel project (`projectId` `prj_3tsohpv4YQRqNRNREHfRSoeDwQc2`, `orgId` `team_URmItSs1LZZ5HsYPD0vdggI3`) produced **`dpl_Es8f2TRo9FDTqgirH1x9p53dxv92`** (`https://18seconds-2voqzajk9-ryo-iwatas-projects.vercel.app`, target `production`). Ready-state poll: Attempt 1 `Building` at 18:32:05Z, Attempt 2 `Building` at 18:32:37Z, Attempt 3 `Ready` at 18:33:09Z. Build duration in `vercel ls --prod`: **1m**.
- **Post-deploy prod alias:** `vercel ls --prod` now shows `https://18seconds-2voqzajk9-ryo-iwatas-projects.vercel.app` at the top of the production list (`2m`, `● Ready`, `Production`, user `leonardiwata-2680`). The previous top deployment remained the 6-day-old `18seconds-2tsdnmokh…` entry underneath it.
- **Prod verification (the four checks that failed at C4-open all now pass):**
  - `/offline-app/index.html` → `status=200 time=0.910008s type=text/html; charset=utf-8 size=28005`
  - `/offline-app/testbank.json` → `status=200 time=0.680334s type=application/json; charset=utf-8 size=493285`
  - `/offline-app/` with `-L` → `status=200 time=0.474913s type=text/html; charset=utf-8 size=28005`
  - `/api/health` → `status=200 time=0.502716s`
- **Deployment-mechanism finding (durable):** this project has **no GitHub → Vercel auto-deploy integration**. Pushing or merging to `main` updates Git history only; production release still requires a manual Vercel action (`vercel --prod`, `vercel promote`, or dashboard deploy). `AGENTS.md` Project facts now records that mechanism explicitly.
- **§3.16 occurrence promoted to 2/5:** first occurrence (`end-session-perf` C3) was out-of-band prod deploys; this occurrence is out-of-band deploy mechanism. Same pattern, different surface: the redirector's model of production state went stale because the release path itself was assumed rather than verified.
- **Outcome:** the offline app is now live at `https://18seconds.vercel.app/offline-app/`, prod health remains green, and the round is actually closed at this commit.

---

## §2 Audit findings (detailed)

### §2.1 `items` table — `src/db/schemas/catalog/items.ts`

Verbatim column shape (Drizzle):

| Column | Type | Null? | Notes |
|--------|------|-------|-------|
| `id` | `uuid` PK | no | `default uuidv7()` — creation time is in the id (project convention). |
| `sub_type_id` | `varchar(64)` | no | FK → `sub_types.id`. Dotted string, e.g. `verbal.antonyms`. |
| `difficulty` | enum `item_difficulty` | no | `["easy","medium","hard","brutal"]` — this is the **tier**. |
| `source` | enum `item_source` | no | `["real","generated"]`. |
| `status` | enum `item_status` | no | `["live","candidate","retired","rejected"]`, default `candidate`. |
| `body` | `jsonb` | no | Stem content — see §2.3. |
| `options_json` | `jsonb` | no | The choices — see §2.4. |
| `correct_answer` | `varchar(64)` | no | The **option `id`** of the correct choice — see §2.4. |
| `explanation` | `text` | **yes (nullable)** | Plain-text explanation. Coverage unconfirmed at C0. |
| `strategy_id` | `uuid` | yes | FK → `strategies`. Not needed by the offline app. |
| `embedding` | `vector(1536)` | yes | **Exclude from export** — large, useless offline. |
| `metadata_json` | `jsonb` | no | default `'{}'`. Not needed by the offline app. |
| `source_folder` / `source_filename` | `varchar` | yes | Provenance. Not needed by the offline app. |
| `rejected_at_ms` / `rejected_by` / `rejection_reason` | bigint / uuid / text | yes | Admin-rejection columns. Not needed. |

Indices: `items_sub_type_status_idx`, `items_sub_type_difficulty_status_idx`, `items_source_folder_idx`.

**Export projection (the only columns the offline app needs):** `id`, `sub_type_id`, `difficulty`, `body`, `options_json`, `correct_answer`, `explanation`. Filter to `status = 'live'` (the live app draws practice items from live status only).

### §2.2 `sub_types` table — `src/db/schemas/catalog/sub-types.ts` + `src/config/sub-types.ts`

`sub_types`: `id varchar(64) PK`, `name varchar(128)`, `section` enum `["verbal","numerical"]`, `latency_threshold_ms bigint`.

There are **exactly 14 sub-types** (`src/config/sub-types.ts`), 5 verbal + 9 numerical:

`verbal.antonyms`, `verbal.analogies`, `verbal.sentence_completion`, `verbal.critical_reasoning`, `verbal.letter_series`, `numerical.number_series`, `numerical.word_problems`, `numerical.fractions`, `numerical.percentages`, `numerical.averages`, `numerical.ratios`, `numerical.workrate`, `numerical.speed_distance_time`, `numerical.lowest_values`.

The config also carries a `displayName` per sub-type (e.g. `verbal.antonyms` → "Antonyms"). The export should include the display name + section so the offline app's per-sub-type summary reads nicely. These can come from either the `sub_types` DB rows or be hard-coded into the export script from `src/config/sub-types.ts`.

### §2.3 Stem content (`items.body`)

`body` is `jsonb`. Its canonical Zod schema, `src/server/items/body-schema.ts`, is:

```ts
const bodyText = z.object({ kind: z.literal("text"), text: z.string().min(1) })
const itemBody = z.discriminatedUnion("kind", [bodyText])
```

**One variant only.** The schema comment explicitly notes future visual variants (`text_with_image`, `chart`, `grid`, `image_pair`, `image_pair_grid`, `column_matching`) are *planned* as additive variants but **none exist in v1**. Every on-disk artifact confirms this: across all `scripts/_stage1/` and `scripts/_siblings/` files, the only item-body `kind` seen is `"text"` (the `recognition` / `elimination` / `tie-breaker` kinds in those files belong to *explanation parts*, not bodies).

⇒ The offline renderer only needs to render a plain-text stem. **Gotcha for the export script:** it must hard-fail on any non-`text` body kind, so a future schema variant cannot silently ship a broken offline app (W-stem-content-format).

### §2.4 Choices & correct answer (`items.options_json`, `items.correct_answer`)

`options_json` is a jsonb **array** of `{ id: string, text: string }`. The `id` is an 8-character opaque string (e.g. `"e0180e70"`, `"c6z3ehmq"`), assigned by `src/server/items/option-id.ts`. `correct_answer` (`varchar(64)`) stores the **`id` of the correct option**, not an index and not the answer text.

Confirmed from a sibling-source record:

```json
"options": [
  { "id": "e0180e70", "text": "warm" },
  { "id": "c6z3ehmq", "text": "tepid" },
  { "id": "7sm907mh", "text": "cold" },
  { "id": "f3mvv4sk", "text": "humid" }
],
"correctAnswer": "7sm907mh"
```

⇒ No join to a `choices` table — choices travel with the item. The offline app matches `correct_answer` against `options[].id`. **Gotcha for the export script:** validate that `correct_answer` matches exactly one `options_json[].id`, and that every item has the expected option count — a dangling `correct_answer` would render an unanswerable question offline.

### §2.5 Content counts (from on-disk artifacts — NOT live DB)

DB was unreachable at C0 (§0.5.1). The following are from import/generation logs and are an approximation of the bank, **not** confirmed live counts:

- **Seed items:** 50 total (`src/db/seeds/items/data/*.ts`) — matches the "50 pre-round seed items" noted in the schema comment. Note 3 sub-types have **zero** seed items (`numerical.lowest_values`, `numerical.speed_distance_time`, `numerical.workrate`) — imports cover them.
- **Imported "real" items:** 389 (`scripts/_logs/imported.jsonl`), all `importSource: "ocr-visible"`.
  - Per sub-type (imports): `verbal.sentence_completion` 54, `verbal.critical_reasoning` 54, `numerical.number_series` 44, `verbal.analogies` 38, `numerical.word_problems` 34, `numerical.lowest_values` 33, `verbal.antonyms` 30, `numerical.percentages` 26, `numerical.speed_distance_time` 16, `numerical.averages` 15, `numerical.ratios` 13, `verbal.letter_series` 11, `numerical.workrate` 11, `numerical.fractions` 10.
  - Per tier (imports): easy 134, medium 179, hard 71, **brutal 5**.
  - `hadOriginalExplanation`: 382 true, **7 false**. (Explanation-generation scripts exist — `scripts/generate-explanations.ts`, `scripts/regenerate-explanations.ts` — so the 7 may have been backfilled. Unconfirmed.)
- **Generated siblings:** 437 sibling files (`scripts/_siblings/*.json`), each carrying easy/medium/hard/brutal variants for one parent. These enter the bank as `source='generated'`, `status='candidate'`, and are promoted to `live` only via the validator/admin path — so the *live* generated-item count is unknown and likely well below 437×4.
- Misc: `needs-review.jsonl` 4, `skipped.jsonl` 7, `stage1-complete.jsonl` 486.

**Takeaway:** the live bank is at least a few hundred items, plenty for a 50-Q session, but the exact live distribution — especially how many `brutal` items survive as `live` — is a real unknown that C1 must measure.

### §2.6 `public/` directory

Contents: `public/audio/` and `public/favicon.svg`. **No `public/offline-app/` exists** — no collision. Next.js serves `public/` files verbatim at the site root, so `public/offline-app/index.html` → `/offline-app/index.html`. Whether the bare `/offline-app/` path resolves to `index.html` is unconfirmed (W-offline-url-resolution).

### §2.7 `scripts/` directory & `package.json` conventions

- Top-level standalone scripts are **kebab-case `.ts`** files run with `bun run scripts/<name>.ts` — e.g. `import-questions.ts`, `generate-explanations.ts`, `backfill-missing-embeddings.ts`, `migrate-opaque-option-ids.ts`. Some are registered as `package.json` scripts; many are run ad-hoc.
- DB-touching scripts import `db` directly from `@/db` (the `@/` alias resolves via `tsconfig.json`). Example: `src/db/seeds/items/index.ts` does `import { db } from "@/db"`. No wrapper layer.
- There is **no generic `db:query` script** — `db:studio` (drizzle-kit studio) is the only existing inspection entry point. The C1 export script is net-new.
- Precedent for writing into `public/`: `scripts/copy-sounds-to-public.ts`, wired as `predev`/`prebuild`. The C1 export script will similarly write `public/offline-app/testbank.json`; whether to wire it into `prebuild` is a C2 decision.
- ⇒ The testbank export script should live at `scripts/export-testbank.ts` (or similar kebab-case name), import `@/db`, and follow the project's error-handling / structured-logging rules.

### §2.8 Cross-round-durable docs at repo root

- `AGENTS.md` (2.5 KB) — currently only Bun-usage tooling guidance. `CLAUDE.md` is a **symlink** to `AGENTS.md`.
- `README.md` (24 KB) — project readme.
- No dedicated "project facts" file exists. See §0.6 — establishing a durable home for the identity mapping (and similar cross-round facts) is a C1/round-close decision, not a C0 action.

---

## §3 Patterns (carryover; no new at C0)

No new patterns banked at C0. Three cross-round patterns from the `end-session-perf` registry were actively *applied* during this audit:

- **§3.14** (executor between-round unauthorized action) — prevention in force: this prompt ends with an explicit STOP HERE; no action taken beyond the audit + plan-doc.
- **§3.15** (audit-confident hypothesis refuted by measurement) — applied directly: the testbank schema *looks* clean, but the audit did not stop at the schema. On-disk content artifacts were sampled (seeds, sibling JSON, import logs), surfacing the thin `brutal` tier and the nullable-`explanation` risk that the schema alone would not have revealed.
- **§3.16** (redirector/model of out-of-band state goes stale) — applied directly: DB reachability was *verified*, not assumed. The verification caught the expired OIDC token, so the plan-doc records "live counts unconfirmed" rather than fabricating them from stale assumptions.

---

## §4 Decision register (build-round equivalent of a hypothesis register)

For a build round, the "hypotheses" are open design decisions. Each carries decision criteria — the evidence at C1/C2 that selects an option.

### H1 — Stack for the offline HTML

**Options:** (a) single HTML file with **vanilla JS** (template literals, no dependency); (b) **Alpine.js** via inlined CDN bundle; (c) **Preact** via inlined CDN bundle.

**Constraint from §0.7 criterion 4:** the app must make no network requests after the testbank loads — so a CDN `<script src>` at runtime is disallowed; any library must be *inlined* into the HTML.

**Decision criteria (C2):** the app's surface is small — render one question, four option buttons, a feedback state, a next control, and a per-sub-type summary; state is a current index, an answers array, and optional localStorage. If the vanilla-JS version stays readable at that scope, prefer (a) — zero inlined bytes, zero dependency, nothing to keep updated. Choose (b)/(c) only if vanilla reactivity becomes genuinely unwieldy. **Provisional lean: (a) vanilla JS.**

### H2 — Testbank packaging: single JSON vs chunked

**Options:** (a) one `testbank.json`; (b) chunked per sub-type (14 files).

**Decision criteria (C1):** measure the exported JSON size (W-testbank-json-size). The bank is a few hundred to ~1–2k items of short text; the file is very likely under a few MB. The file picker loads one file once and parses it in memory — chunking would force the user to pick 14 files, which is worse UX for no benefit at this size. **Provisional lean: (a) single file**, unless C1 measurement shows an implausibly large export.

### H3 — Optional per-session "don't reshow recently-correct" via localStorage

**Options:** (a) omit entirely; (b) within-session only (don't repeat an item inside the current 50-Q draw — trivial, no storage); (c) cross-session localStorage that suppresses recently-correct items on the next run.

**Decision criteria (C2):** §0.8 rules out mastery/SRS. Option (b) is just "draw 50 distinct items" — effectively free and clearly in scope. Option (c) adds persistence, a staleness question, and a needed "reset" affordance. Include (c) only if it lands in roughly ten lines with a visible reset control; otherwise ship (b) and stop. **Provisional lean: (b); (c) only if cheap.**

---

## §5 Recommended next actions (C0-immutable)

**C1 — testbank export script.** Create `scripts/export-testbank.ts` (kebab-case, `bun run`). It imports `@/db`, selects `status='live'` items projecting only the §2.1 export columns, optionally joins `sub_types` (or hard-codes display names from `src/config/sub-types.ts`), and writes `public/offline-app/testbank.json`. It **must** validate as it goes and hard-fail loudly on: a non-`text` `body.kind`; a `correct_answer` that matches no `options_json[].id`; an unexpected option count. It must also **emit the live counts** that C0 could not get — per-sub-type, per-tier, and explanation-coverage % — so §0.10's W-items resolve. **Blocker:** C1 cannot run without DB access — the C1 prompt must first refresh `VERCEL_OIDC_TOKEN` (or start the local Docker `pgvector` DB and set `DATABASE_LOCAL_URL`). The C1 prompt must also set the **null-explanation policy**: fail the export, or export with an explicit `explanation: null` and let the offline app show "no explanation available."

**C2 — offline HTML.** Create `public/offline-app/index.html` — a single file, file-picker testbank load, stack per H1. Renders a 50-Q session, per-question correct/incorrect feedback with explanation, and a per-sub-type summary. Resolves W-session-composition (how 50 questions are drawn) and H3.

**C3 — cross-browser test.** Open the HTML from `file://` and from the deployed `/offline-app/` URL in Chrome, Firefox, and Safari on desktop. Verify a full 50-Q run, and verify zero network requests after the testbank loads (§0.7 criterion 4). Resolve W-offline-url-resolution.

**C4 — round-close + merge.** Update §6, bank any new patterns, reconcile pins, decide the durable home for the identity mapping (§0.6), and merge `offline-app` → `main`.

---

## §6 Round-close

Round status: **CLOSED** at C4-finalize. Plan-doc note: C4 claimed closed prematurely; C4-finalize manually deployed to prod and completed verification, at which point the round was actually closed.

### §6.1 Final outcome vs §0.7 success criteria

All four §0.7 criteria met — verified on **Firefox / Linux / `file://`** (C3b). Chrome, Safari, and narrow-viewport overflow are deferred to a future round per user decision.

1. Testbank JSON generates cleanly from production DB via `scripts/export-testbank.ts` — ✓ (C1, 448 live items, all validations passed).
2. Offline HTML opens and renders a full session end-to-end — ✓ on Firefox (C3b); Chrome/Safari deferred.
3. Session completes with correct/incorrect feedback + explanations + per-sub-type summary — ✓ (C3b).
4. Zero network requests after testbank load — ✓, confirmed in Firefox Network tab (C3b).

### §6.2 Decision register (§4) final state

- **H1 (stack):** chose **vanilla JS** — 790 LOC single file, no build, no runtime CDN. Confirmed working.
- **H2 (packaging):** chose a **single `testbank.json`** — 481.7 KB. Confirmed working.
- **H3 (don't-reshow):** chose **within-session-only** via Fisher-Yates shuffle. No `localStorage`. Confirmed working.

### §6.3 W-* resolutions (8 retired)

- **W-stem-content-format** — resolved at C1: 100% text bodies; hard-fail guard in the export script.
- **W-explanation-coverage** — resolved at C1: 100% coverage, zero nulls in the current bank.
- **W-per-sub-type-item-count** — resolved at C1: range 9–61; all sub-types have content.
- **W-per-tier-item-count** — resolved at C1: easy 141 / medium 228 / hard 73 / brutal 6 (brutal thin but acceptable).
- **W-testbank-json-size** — resolved at C1: 481.7 KB; single-file confirmed appropriate.
- **W-offline-url-resolution** — resolved at C3a.5: split into anonymous-cohort behavior + Vercel preview protection; both characterized.
- **W-proxy-carve-out-contract-documented** — resolved at C3a.5: inline comment in `src/proxy.ts` + `AGENTS.md` Project-facts entry.
- **W-session-composition** — resolved at C2: user-selected sub-types, uniform random within the selected pool, tier-agnostic.

### §6.4 Patterns

**Banked this round (§3 additions):**

- **§3.17** (1/5) — an audit must cover middleware/proxy layers, not just static-serving conventions. Discriminator from §3.15: §3.15 is mechanism-wrong-within-the-correct-area; §3.17 is an entire-layer-missed. First occurrence: C0 audited `public/` but missed `src/proxy.ts`; C3a discovered the gap; C3a.5 fixed it.
- **§3.18** (1/5) — an API/tooling error mid-execution leaves state in an ambiguous place; recovery requires explicit verification before the next action. First occurrence: C3a.5 API error after commit+deploy but before push+report; recovery via a user-driven `git status` check before the redirector drafted the recovery prompt.

**Applied this round (counts updated at close):**

- **§3.13** remains at **2/5** — rebuild-then-swap on production deploy still held at C4-finalize.
- **§3.14** remains at **1/5** — prevention worked across all C-rounds; zero recurrences of executor between-round unauthorized action.
- **§3.15** remains at **1/5** — informed the C0 audit posture (sample real data, don't trust the schema alone).
- **§3.16** is now **2/5** — informed pre-action verification steps at C1 / C3a / C3a.5 and was directly banked again at C4-finalize when the assumed GitHub→Vercel auto-deploy mechanism turned out not to exist.

### §6.5 Pins

**Retired:** 8 W-* items, as listed in §6.3.

**Opened (3 R-* items):**

- **R-offline-app-chrome-safari-untested** — cross-browser verification was limited to Firefox/Linux. Acceptable for current cohort distribution; worth re-verifying when the offline app gets active use.
- **R-offline-app-narrow-viewport-untested** — the 400px-width overflow check was deferred. Long `critical_reasoning` items may overflow on mobile-width viewports.
- **R-offline-app-future-features** — user noted "more test-like features" planned down the road. Explicit deferred-work tracker.

### §6.6 Carry-forward

- **Identity mapping** (`leonardiwata-2680` ↔ `ryoiwata`) already lives in `AGENTS.md` Project facts — durable across rounds (resolves §0.6 at C1).
- **Distribution URL:** `https://18seconds.vercel.app/offline-app/` resolves to `index.html` via a 308 from `/offline-app` to `/offline-app/` (confirmed at C3a.5). Testbank at `https://18seconds.vercel.app/offline-app/testbank.json`.
