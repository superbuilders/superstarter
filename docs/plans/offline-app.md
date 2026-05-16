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

### C1+ (TBD)

To be filled at the corresponding commit.

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

## §6 Round-close shape (TBD)

Populated at C4. Will record: final outcome vs §0.7 success criteria, the resolved W-* items, the H1/H2/H3 decisions as built, any new patterns, the identity-mapping durable-home decision, and the merge to `main`.
