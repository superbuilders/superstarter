# Plan — `scripts/import-screenshots.ts` (OCR import for CCAT screenshots)

> **⚠️ Partially superseded.** As of 2026-05-02, this plan is partially superseded by [`opaque-option-ids-and-pipeline-split.md`](opaque-option-ids-and-pipeline-split.md). The two structural changes — opaque option ids replacing letter ids, and the single `import-screenshots.ts` script splitting into stage 1 (`import-questions.ts`) / stage 2 (`generate-explanations.ts`) / stage 3 (`regenerate-explanations.ts`) — landed in commits `cb45ce6..cee3b74`. The substantive design from this plan (idempotency model, four-pass LLM contract, structured-explanation contract, canonical 5-image dry-run, sub-type style hints, provenance via `metadata_json.importSource` and `originalExplanation`) carries forward unchanged into the new scripts; only the topology and the option-id encoding changed.
>
> Where this plan and the v2 plan disagree on **script topology** (one script vs three) or **option-id shape** (letters vs opaque base32), the v2 plan is canonical. Everywhere else, this plan is still the design reference. The "Operating procedure" section below has been rewritten to reflect the new 6-step workflow.

Batch importer that turns a folder of CCAT question PNGs into rows in the `items` bank by POSTing each screenshot's extracted content through the existing `/api/admin/ingest-item` route. Standalone Bun script; not part of the app's source tree.

This revision changes two things from the previous draft:

1. **The script and this plan are persistent tooling, not one-shot.** They stay in the repo after the initial ~300-item import. Future test-bank growth — additional screenshot collections from new sources — runs through the same pipeline. The script is idempotent and source-agnostic by design, so re-running against new directories is a routine operation rather than a code change.
2. **Quality-gating is a single 5-image cross-source sample.** Before each large run, a single dry-run over a 5-image sample drawn from the *entire* dataset (not per-source) confirms extraction quality, the unified-explanation contract, and the solve+verify path in one shot. Once quality is confirmed, the user clears the old run's artefacts and executes the full run.

The substantive design from the previous draft — the unified-explanation contract, the metadata plumbing, the solve+verify path, the per-sub-type style hints — is preserved unchanged.

The known input formats living in `data/testbank/` are:

- `data/testbank/12min_prep_practice_1/` — 34 PNGs, one question per image, **answer + explanation visible** in most.
- `data/testbank/12min_prep_practice_2/` — 65 PNGs, one question per image, **answer + explanation visible** in most.
- `data/testbank/gauntlet_ccat_practice_1/` — 32 PNGs, one question per image, **answer not visible** in most (need solve + verify).

Future drops will live as additional sibling directories under `data/testbank/`. The script's `--sample` mode walks `data/testbank/` recursively, so adding a new subdirectory of screenshots is a drop-in operation — the canonical dry-run automatically samples across the union of old and new sources without any code change. `data/testbank/` is in `.gitignore`, so screenshots never land in the repo.

## What we're building

A single CLI:

```bash
bun run scripts/import-screenshots.ts <inbox-dir> [--dry-run] [--limit N] [--sample] [--skip-solve]
```

Per image, in order:

1. **Idempotency** — SHA-256 the file bytes, look it up in `scripts/_logs/imported.jsonl`, skip if already imported.
2. **Extract** — Sonnet vision call. Returns the structured object below or fails.
3. **Skip non-text-only** — drop anything where `isTextOnly === false`.
4. **Branch on `answerVisible`** to determine the **answer**:
   - `true` — trust the screenshot's `correctAnswer`.
   - `false` and `--skip-solve` not set — run **solve** then **verify** (fresh context). Drop on disagreement.
   - `false` and `--skip-solve` set — log to skipped and continue.
5. **Generate the unified explanation** — one Sonnet text-only call against the unified-explanation contract (§"Unified explanation contract"). Always runs, regardless of source. Uses the now-known answer as ground truth.
6. **POST** — `POST http://localhost:3000/api/admin/ingest-item` with `Authorization: Bearer ${CRON_SECRET}`. Body matches `requestSchema` in `src/app/api/admin/ingest-item/route.ts` (extended this phase to accept optional `metadata`).
7. **Log** outcome to one of the JSONL files under `scripts/_logs/`.

End-of-run summary printed to stdout.

## Files created (and kept)

| Path | Purpose |
| --- | --- |
| `scripts/import-screenshots.ts` | The script. |
| `scripts/_logs/.gitkeep` | Keeps the directory in the repo, contents are gitignored. |
| `docs/plans/ocr-import-screenshots.md` | This plan. The runbook for current and future imports. |

Files modified:

- `.gitignore` — append `scripts/_logs/*.jsonl` (the `.gitkeep` stays tracked).
- `src/server/items/ingest.ts` — extend `ingestRealItem` signature to accept optional `metadata?: { originalExplanation?: string; importSource?: string }` and merge it into the row's `metadata_json`. One-line addition; existing call sites are unaffected because the parameter is optional.
- `src/app/api/admin/ingest-item/route.ts` — extend `requestSchema` to accept the same optional `metadata` shape and pass it through.

`scripts/` already exists. **No schema migration:** `items.metadata_json` is `jsonb notNull default '{}'` per SPEC §3.3.

## Lifecycle expectations

- The script is **persistent tooling**: it stays in the repo after the initial run.
- Each run is **idempotent**: SHA-256 file-content hashes in `imported.jsonl` mean re-running against an inbox that contains already-imported screenshots is safe — they're skipped.
- Adding a new test-bank source is: drop screenshots into a new `data/testbank/<source-name>/` directory, run the sample dry-run (§"Test plan"), confirm quality, run the full pass.
- `scripts/_logs/imported.jsonl` accumulates across runs. **Do not delete it** between runs unless you intentionally want to re-ingest material from earlier runs (which would create duplicate items in the bank, since `items` has no content-hash uniqueness constraint — only the `imported.jsonl` log prevents re-ingest).

## Dependencies

No new packages. The repo already has:

- `@anthropic-ai/sdk` `0.92.0` — used today by `src/server/items/tagger.ts`.
- `zod` `^4.3.6`.

`sharp` is **not** installed and we don't need it. The Anthropic SDK accepts base64 PNG directly. Screenshots are ~100KB, well under the 5MB-per-image API limit.

Bun loads `.env` automatically per `CLAUDE.md`, so `Bun.env.ANTHROPIC_API_KEY` and `Bun.env.CRON_SECRET` work without `dotenv`.

## Style exemption (header comment)

The script lives outside `src/`. The Superbuilder ruleset (Pino logger, `errors.try`, no `as`, no `try/catch`, no `console.log`, etc.) does **not** apply. The script uses `console.log` for progress, native `try/catch`, and inline ternaries freely. The first lines of the file say so:

```ts
// scripts/import-screenshots.ts
//
// OCR import pipeline for CCAT question screenshots. Persistent tooling
// for ingesting new test-bank sources into the items bank.
//
// EXEMPT FROM THE PROJECT RULESET. This file is a standalone Bun script,
// not part of the app source tree. It uses console.log, native try/catch,
// and other patterns banned in src/. Do not copy idioms from this file
// into src/.
//
// Usage and operating procedure: see docs/plans/ocr-import-screenshots.md
// (the runbook for sample-then-full import workflow, including the
// canonical 5-image cross-source dry-run).
```

The two `src/` files modified by this change (`ingest.ts` and `route.ts`) **do** follow the ruleset — they are real app code being extended with a small additive parameter.

## Imports the script will pull from `src/`

- `import { subTypes, subTypeIds, type SubTypeId, type Difficulty } from "@/config/sub-types"` — single source of truth for the 11 v1 sub-types and difficulty levels.

That's the only `@/`-aliased import. The script does **not** import `@/db`, `@/server/items/ingest`, or anything that would pull in the Drizzle pool, the workflow runtime, or the T3 env wrapper — it hits the running dev server's HTTP endpoint instead.

## Unified explanation contract

This is the load-bearing change introduced in the previous revision and preserved here. Every item ingested by this script gets an explanation written by a single Sonnet call governed by the contract below. The screenshot's verbatim explanation, when one exists, is preserved separately in `metadata_json.originalExplanation`.

### Why uniform

Screenshots come from mixed sources. Their explanations vary by length (one paragraph to multi-section walkthroughs), structure (prose, tables, equations, multi-paragraph derivations), and pedagogical approach (re-deriving the math vs. naming the pattern vs. discussing distractors). A user reviewing wrong items in the post-session review (PRD §6.5) reads explanation-after-explanation in quick succession; stylistic whiplash actively interferes with the recognition-building the review screen exists to support. A consistent voice — across all items, regardless of import source or sub-type — is a small surface-level change with a large effect on review quality.

### Grounding

The contract is grounded in three sources, in priority order:

1. **PRD §6.4 strategy-library kinds.** The strategy library distinguishes three kinds of help: *recognition* (how to spot the pattern next time), *technique* (the fastest method given the pattern), and *trap-avoidance* (the most-likely error and how to dodge it). A good explanation is a compressed instance of all three.
2. **CCAT-categories.md per-sub-type narratives.** For each of the 11 sub-types, that document describes the sub-type's core recognition cue and its fastest method (e.g., percentages — "the 10% block trick"; antonyms — "two options seem opposite, the correct answer is usually the more general opposite"; fractions — "for highest-value questions where all are close to 1, compare the *remaining* part to 1"). The explanation should pick up that vocabulary so a user reading explanations across multiple percentages items hears the same conceptual framing reinforced.
3. **Learning-science principles for short post-task explanations.** The relevant ones are: name the pattern category before the method (schema activation precedes recall); keep the method procedural rather than re-derive equations (cognitive-load minimization given the user just read the question); call out the most-tempting distractor by *kind*, not by accident, so the lesson generalizes (the worked-example effect). Two to three sentences is the sweet spot.

### Shape

Output is plain prose, **2–3 sentences total**, in this order:

1. **Recognition cue** (1 sentence). Names the pattern category in language the user could carry to another problem of the same kind. ≤ 12 words. Example: *"This is a percent-of-whole problem with two stacked changes."*
2. **Method** (1 sentence). The fastest path to the answer, framed as what the test-taker *does*, not as an equation derivation. ≤ 25 words. Example: *"Apply the 10% trick: 10% of 300 is 30, so 5% is 15 — the answer is 100% − 5% = 95%."*
3. **Trap** (1 sentence, **optional** — only when a distractor exemplifies a common error worth naming). ≤ 18 words. Example: *"Don't subtract percentages directly across the two changes; anchor each step on the new base."*

No bullets, no headers, no LaTeX, no multi-line equations.

### Provenance

Two fields are written into `items.metadata_json` for every item this script ingests:

- `originalExplanation: string | undefined` — the screenshot's verbatim explanation if one was visible, otherwise omitted.
- `importSource: "ocr-visible" | "ocr-solved"` — whether the answer came from the screenshot or from solve+verify.

Quality review post-import is a SQL query against `metadata_json`:

```sql
-- Items where the unified explanation can be compared to the source
SELECT id, sub_type_id,
       metadata_json->>'originalExplanation' AS original,
       explanation
FROM items
WHERE metadata_json->>'importSource' = 'ocr-visible'
  AND metadata_json ? 'originalExplanation'
ORDER BY random()
LIMIT 20;
```

Spot-checks across the 11 sub-types catch systematic prompt issues without reading hundreds of items.

## CLI argument parsing

`Bun.argv.slice(2)`, hand-rolled:

- `<inbox-dir>` — required positional. Resolved via `path.resolve()`. Must exist and be a directory; otherwise exit 1 with a message.
- `--dry-run` — extract (and solve/verify/explain if needed) and log to stdout, do **not** POST.
- `--limit N` — stop after N images. Combined with `--sample` to cap the sample size.
- `--sample` — instead of processing files in lexicographic order, **draw a deterministic random sample** from across the entire `<inbox-dir>` recursively (including subdirectories). Use a fixed seed so re-running with the same `--sample --limit N` yields the same N images. Documented and reviewable: the user wants the *same* 5 images each time the canonical dry-run is invoked, so quality regressions in prompt edits are reproducible.
- `--skip-solve` — when `answerVisible === false`, log to skipped and continue (don't run solve+verify, don't POST).

When `--sample` is set, the script walks `<inbox-dir>` recursively, collects all `.png` files (case-insensitive), sorts the full list lexicographically, then samples N items using a hash-based selection seeded with a constant. This is reproducible across runs without writing seed state to disk.

When `--sample` is not set, files are processed in lexicographic order from the immediate directory only (no recursion). This is the "import everything in this folder" mode.

## Pipeline detail

### 1. Idempotency

```
hash = sha256(file bytes)        // crypto.createHash, ~5ms per ~100KB image
if hash ∈ imported.jsonl:
    log skip(reason="already imported", hash, filePath) to stdout
    continue
```

`imported.jsonl` is read once at startup into an in-memory `Set<string>` of hashes for O(1) lookup. New successful imports are appended to the same file as the run progresses. **The log persists across runs**: a re-run after the script has been used before continues to skip everything previously imported. This is what makes the script idempotent across test-bank expansions.

### 2. Extract — Sonnet 4.6 vision

Single message with image + instructions. Model id constant: `EXTRACT_MODEL = "claude-sonnet-4-6"`. Max tokens 1024, temperature 0.

Validated by this Zod schema:

```ts
const extractedItem = z.object({
    isTextOnly: z.boolean(),
    question: z.string().min(1),
    options: z.array(
        z.object({
            id: z.enum(["A", "B", "C", "D", "E"]),
            text: z.string().min(1)
        })
    ).min(2).max(5),
    answerVisible: z.boolean(),
    correctAnswer: z.enum(["A", "B", "C", "D", "E"]).optional(),
    explanationVisible: z.boolean(),
    originalExplanation: z.string().min(1).optional(),
    subTypeId: z.enum(subTypeIds),
    difficulty: z.enum(["easy", "medium", "hard", "brutal"])
}).refine(d => !d.answerVisible || d.correctAnswer !== undefined,
          { message: "answerVisible=true but correctAnswer missing" })
  .refine(d => !d.explanationVisible || d.originalExplanation !== undefined,
          { message: "explanationVisible=true but originalExplanation missing" })
```

The field is `originalExplanation` from extraction onward — the user-facing `explanation` is always written by the unified pass downstream, so naming the extracted text `originalExplanation` from the start prevents accidental conflation.

Pre-parse: strip markdown fences with the same regex `src/server/items/tagger.ts` already uses. On `safeParse` failure or non-JSON output, append to `extract-failures.jsonl` and continue.

### 3. Skip non-text-only

If `isTextOnly === false`, append to `skipped.jsonl` with `reason: "visual content"` and continue.

### 4. Resolve the answer

- **`answerVisible === true`** — use the screenshot's `correctAnswer`. No LLM call needed at this stage.
- **`answerVisible === false` and `--skip-solve` not set** — run **solve** then **verify** (in a fresh conversation). The solve prompt's reasoning field exists only as scaffolding for verify; it is **not** used as the user-facing explanation. If verify disagrees, log to `needs-review.jsonl` and continue without ingesting.
- **`answerVisible === false` and `--skip-solve` set** — log to `skipped.jsonl` with reason `"needs solve, --skip-solve set"` and continue.

After this stage, every surviving item has a known correct answer.

### 5. Generate the unified explanation

A single Sonnet text-only call against the unified-explanation prompt. Inputs: the question, the options, the known correct answer, the sub-type, and (optionally, as background) the screenshot's `originalExplanation` if one existed. Output:

```ts
const unifiedExplanationOutput = z.object({
    explanation: z.string().min(1)
})
```

Always runs, regardless of which branch produced the answer. The screenshot's verbatim explanation is passed in as background context (so the model can pick up source-specific tactical hints, like a clever method or a named distractor) but the model is explicitly instructed to write a fresh explanation in the contract style, not to paraphrase the original.

If the explanation pass fails after 3 retries, append to `explanation-failures.jsonl` and continue without ingesting. Better to drop an item than ingest one with an empty or off-spec explanation.

### 6. POST to ingest

Single `fetch` to `http://localhost:3000/api/admin/ingest-item`:

```ts
{
  method: "POST",
  headers: {
    "Authorization": `Bearer ${Bun.env.CRON_SECRET}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    subTypeId,
    difficulty,
    body: { kind: "text", text: question },
    options,
    correctAnswer,
    explanation,                    // the unified explanation
    metadata: {
      importSource: "ocr-visible" | "ocr-solved",
      ...(originalExplanation ? { originalExplanation } : {})
    }
  })
}
```

Expected success: `201 { itemId: <uuid> }`. The route also kicks off the embedding-backfill workflow internally.

On any non-2xx, append to `ingest-failures.jsonl` and continue. Do not retry the local ingest POST on 5xx — those are dev-server bugs and should be visible.

### 7. Log success

Append one line to `imported.jsonl`:

```json
{
  "timestamp": "2026-05-02T16:00:00.000Z",
  "filePath": "data/testbank/gauntlet_ccat_practice_1/q01.png",
  "hash": "sha256:abcd…",
  "itemId": "01928f1a-…",
  "subTypeId": "verbal.synonyms",
  "difficulty": "easy",
  "importSource": "ocr-visible",
  "hadOriginalExplanation": true
}
```

`hadOriginalExplanation` is a convenience for filtering the JSONL when running quality reviews — pull out the items most worth spot-checking (the ones where you can compare against a source explanation) without parsing the DB rows.

## Rate limit and backoff

A single in-process throttle: between any two outbound requests (extract, solve, verify, unified-explanation, **and** the local ingest POST) wait until 1 second has elapsed since the previous request's start. Implemented with one `lastRequestStartMs` variable and `await Bun.sleep(...)`.

Worst-case path per image: extract → solve → verify → unified-explanation → ingest = 5 requests, ~5 seconds. 300 images × ~5 seconds = ~25 minutes wall-clock.

On a `429` from Anthropic, retry with exponential backoff: `1s`, `2s`, `4s`. After the third failure, append to the appropriate failures file and continue. We do **not** retry the local ingest POST on 5xx.

## End-of-run summary

```
Total files:                 312
Already imported:             45
Skipped (visual):             12
Skipped (no-solve):            0
Extract failures:              3
Explanation failures:          1
Ingest failures:               1
Needs review:                  8
Successfully ingested:       242
  - visible answer:          179  (orig explanation: 152, no orig: 27)
  - solve + verify:           63
```

The breakdown under "visible answer" surfaces how many ingested items have a comparable original explanation in `metadata_json` for spot-checking.

## Draft prompts

These are pasted here for review **before** implementation. The user is expected to redline these in the plan, then I implement them verbatim into `scripts/import-screenshots.ts`.

The shared sub-type list and per-sub-type "fastest path" hints are generated at runtime from `subTypes` in `src/config/sub-types.ts` and from a small in-script constant `subTypeStyleHints`. The strings `${SUB_TYPE_LIST}` and `${SUB_TYPE_HINT}` are placeholders.

`subTypeStyleHints` is a literal table inlined in the script, sourced from `CCAT-categories.md`. It maps each of the 11 v1 sub-types to a 1-2 sentence "recognition + fastest method" cue. Inlining it keeps the script self-contained and its prompt deterministic. Example entries:

```ts
const subTypeStyleHints: Record<SubTypeId, string> = {
  "verbal.synonyms":
    "Recognition is fast or absent — if the test-taker doesn't know the word, deliberation rarely helps. Frame the explanation around the word's core sense.",
  "verbal.antonyms":
    "When two options point opposite, the more general opposite usually wins. Watch for words with multiple meanings keyed to the less obvious sense.",
  "numerical.percentages":
    "The 10% block trick is the fastest method: shift the decimal one place left, then scale. For stacked changes, anchor on the new base each step.",
  // ... 8 more, one per sub-type
}
```

The full table is drafted alongside the script and reviewed in the dry-run.

### Extract prompt (Sonnet 4.6, vision)

System:

```
You are an OCR + classification helper for CCAT (Criteria Cognitive Aptitude Test) practice screenshots. You will be shown one screenshot at a time, each containing one multiple-choice question.

Your job is to extract the question's structured content and classify it into one of the 11 v1 sub-types.

Sub-types (id — display name (section)):

${SUB_TYPE_LIST}

Difficulty (anchored by question features, not by the latency thresholds the names suggest):

- easy: vocabulary the average adult knows; arithmetic doable in your head in under 5 seconds; clear pattern.
- medium: less common vocabulary; arithmetic needing one written intermediate step; pattern requires a moment to spot.
- hard: uncommon vocabulary or trap distractors; multi-step arithmetic with fractions/percentages; pattern with two interleaved rules.
- brutal: vocabulary most adults wouldn't know; calculation path itself is hard to see; deeply ambiguous patterns.

Estimate from question complexity. Ignore any "Difficulty: hard" label printed on the screenshot.

Important conventions of CCAT screenshots:
- Some screenshots show the correct answer (a green checkmark, a highlighted option, a "Correct answer: X" line, or a "✓" next to one option). When you see one, set "answerVisible": true and put the option letter in "correctAnswer".
- Some screenshots show a written explanation below the question, typically titled "Explanation", "Solution", or similar. When present, set "explanationVisible": true and copy the explanation text verbatim into "originalExplanation". Preserve tables and structured layouts as best you can in plain text — they will be used as background context, not user-facing.
- If neither is shown, set both flags to false and omit "correctAnswer" and "originalExplanation".
- Synonyms/antonyms questions in the CCAT convention put the target word in ALL CAPS (e.g. "Choose the word that most nearly means HAPPY.").
- Set "isTextOnly": false if ANY of the answer choices is a chart, shape, image, or visual diagram. Set it true only if the entire question and every option is plain text.

Respond with raw JSON only — no markdown code fences, no commentary, just the object. Use this exact shape:

{
  "isTextOnly": <bool>,
  "question": <string, the prompt text verbatim>,
  "options": [{ "id": "A"|"B"|"C"|"D"|"E", "text": <string> }, ...],
  "answerVisible": <bool>,
  "correctAnswer": "A"|"B"|"C"|"D"|"E",      // only if answerVisible
  "explanationVisible": <bool>,
  "originalExplanation": <string>,            // only if explanationVisible (verbatim from screenshot)
  "subTypeId": <one of the 11 ids above>,
  "difficulty": "easy"|"medium"|"hard"|"brutal"
}
```

User content: `[{ type: "image", source: { type: "base64", media_type: "image/png", data: <b64> } }, { type: "text", text: "Extract this CCAT question." }]`.

### Solve prompt (Sonnet 4.6, text only)

Used only in the branch where `answerVisible === false` and `--skip-solve` not set. Its `reasoning` output is internal scaffolding for the verifier and is **not** used as the user-facing explanation.

System:

```
You are solving a single CCAT (Criteria Cognitive Aptitude Test) multiple-choice question. Your job is to identify the correct option. Your reasoning will be checked by an independent verifier.

Respond with raw JSON only — no markdown code fences, no commentary, just the object:

{
  "correctAnswer": "A"|"B"|"C"|"D"|"E",
  "reasoning": <2–4 sentence explanation of your method, used for verification>,
  "confidence": <integer 1–5, where 5 = certain and 1 = guess>
}
```

User: question text + options as before.

### Verify prompt (Sonnet 4.6, text only, FRESH CONVERSATION)

```
You are an independent verifier for CCAT (Criteria Cognitive Aptitude Test) answers. You will be given a question, the answer options, and another solver's claimed answer + reasoning.

Your protocol:
1. Solve the question yourself first, BEFORE looking at the claim. Pick the option you would choose.
2. Then read the claim. If the claim's answer matches yours AND the claim's reasoning is sound (no obvious errors), set "agrees": true.
3. If the claim's answer does not match yours, set "agrees": false, put your answer in "correctIfDisagree", and explain the discrepancy in "reason" in 1–2 sentences.
4. If the claim's answer matches yours but its reasoning has a clear error (e.g. arithmetic mistake masked by a coincidentally correct option), set "agrees": false and explain in "reason".

Respond with raw JSON only — no markdown code fences, no commentary, just the object:

{
  "agrees": <bool>,
  "correctIfDisagree": "A"|"B"|"C"|"D"|"E",  // only if agrees=false
  "reason": <string>                          // only if agrees=false
}
```

### Unified-explanation prompt (Sonnet 4.6, text only)

Always runs after the answer is known.

System:

```
You are writing a post-session-review explanation for a CCAT (Criteria Cognitive Aptitude Test) multiple-choice question. The user has already attempted the question; they are now reviewing what they got wrong (or got slowly). Your explanation is what they read.

The CCAT gives 18 seconds per question. Your explanation is NOT a derivation. It is a compressed pattern lesson the user can carry to the next item of the same kind.

The contract — follow it strictly:

Write 2–3 sentences of plain prose, in this order:

1. RECOGNITION CUE (1 sentence, ≤ 12 words). Name the pattern category in language the user could carry to a fresh problem of the same kind. Examples: "This is a percent-of-whole problem with two stacked changes." / "Antonym pair where two options point opposite; the more general one wins." / "Letter-series problem with two competing rules."

2. METHOD (1 sentence, ≤ 25 words). The fastest path to the answer, framed as what the test-taker DOES — not as an equation derivation. Use simple inline numbers/expressions if needed. Examples: "Apply the 10% trick: 10% of 300 is 30, so 5% is 15, leaving 95%." / "Test differences first: 2, 3, 4, 5 — the next term is F + 4 = J."

3. TRAP (1 sentence, ≤ 18 words, OPTIONAL — include only when a distractor exemplifies a common error worth naming by category). Examples: "Don't subtract percentages directly across the two changes — anchor each step on the new base." / "The most-tempting wrong answer applies the rule to the LAST term only; check the full sequence."

Hard rules:
- Plain prose only. No bullets, no headers, no LaTeX, no multi-line equations.
- Total length: 2 sentences (without trap) or 3 sentences (with trap). NEVER 1 sentence, NEVER 4+.
- Do not address the user ("You should…", "Notice that…"). Describe the method in third person or imperative.
- Do not re-state the question or the answer letter. The user is looking at both.
- Do not name option letters (A/B/C/D/E) in the explanation. Refer to options by content if at all.
- Do not say "the correct answer is…". The system already shows that.

Sub-type style hint for this question: ${SUB_TYPE_HINT}

Respond with raw JSON only — no markdown code fences, no commentary, just the object:

{ "explanation": <2–3 sentences per the contract above> }
```

User:

```
Question:
<question>

Options:
A. <option A text>
B. <option B text>
C. <option C text>
D. <option D text>
[E. <option E text>]

Correct answer: <X>

Source explanation (background context only — write a fresh explanation, do not paraphrase): <originalExplanation if present, or "(none)" if absent>
```

## Logging files (under `scripts/_logs/`)

Every line in every file is one JSON object. Append-only. Persist across runs.

| File | Purpose | Schema |
| --- | --- | --- |
| `imported.jsonl` | Successful ingestions, source of idempotency. **Persists across runs.** | `{timestamp, filePath, hash, itemId, subTypeId, difficulty, importSource, hadOriginalExplanation}` |
| `skipped.jsonl` | Intentional skips. | `{timestamp, filePath, hash, reason, …extra}` |
| `extract-failures.jsonl` | Vision call failed, JSON parse failed, or Zod validation failed. | `{timestamp, filePath, hash, stage: "extract", rawOutput, error}` |
| `explanation-failures.jsonl` | Unified-explanation call failed after retries. | `{timestamp, filePath, hash, question, correctAnswer, error}` |
| `needs-review.jsonl` | Solver and verifier disagreed. | `{timestamp, filePath, hash, question, options, solver, verifier}` |
| `ingest-failures.jsonl` | Local POST returned non-2xx. | `{timestamp, filePath, hash, status, responseBody, requestBody}` |
| `.gitkeep` | Tracked. Keeps the dir in the repo. | (empty) |

`scripts/_logs/*.jsonl` is added to `.gitignore` so the run artefacts never land in commits.

## Test plan — sample-then-full workflow

The script's quality bar is enforced by a single canonical dry-run before each large import: a 5-image deterministic sample drawn from across the *entire* current dataset (recursive across all subdirectories of `data/testbank/`).

### Step 1 — Canonical 5-image dry-run

```bash
bun run scripts/import-screenshots.ts data/testbank --dry-run --sample --limit 5
```

What this does:
- Walks `data/testbank/` recursively, collects all `.png` files across every subdirectory.
- Deterministically samples 5 images (same 5 every time, given the same dataset).
- Runs the full extract → (solve+verify if needed) → unified-explanation pipeline on each.
- Prints to stdout, for each image: the extracted JSON, the verifier's `agrees` result (when applicable), the unified explanation, and — when an `originalExplanation` was extracted — both side-by-side for comparison.
- Writes nothing to `scripts/_logs/` (dry-run).
- Makes no HTTP POSTs.

The user reviews:
- **Extraction quality.** Are questions, options, sub-types, difficulties, answer-visibility flags, and `isTextOnly` all correct?
- **Unified explanation contract compliance.** 2-3 sentences? Correct order (recognition → method → optional trap)? No bullets, no derivations, no user address?
- **Style consistency across sub-types.** Do the explanations sound like they came from a single voice — the same compressed-strategy framing — even though the underlying questions are different sub-types?
- **Side-by-side comparison.** When an original explanation is available, does the unified version preserve the source's tactical insight (the named trick, the named trap) without inheriting its style or length?
- **Solve+verify.** For images where the answer wasn't visible: do solver and verifier agree? If not, is the disagreement legitimate (an actually-ambiguous question) or a model error?

If any of those fail, redline the prompts in this plan, regenerate the script, re-run the same 5-image dry-run. The deterministic sampling means re-running yields the *same* 5 images — quality regressions are reproducible.

### Step 2 — Optional `--skip-solve` dry-run

If the canonical sample happens to draw mostly answer-visible images, run a targeted dry-run on a known no-answer source to exercise the solve branch:

```bash
bun run scripts/import-screenshots.ts data/testbank/gauntlet_ccat_practice_1 --dry-run --limit 5
```

This is optional and only runs when the canonical dry-run didn't sufficiently exercise the solve+verify path.

### Step 3 — Clear stale state, then full run

Once quality is confirmed:

1. **Reset the bank if this is a *redo* of an earlier import.** If a prior version of the script produced items the user wants to discard:
   ```sql
   -- Targeted: only items previously ingested by this script
   DELETE FROM items WHERE source = 'real' AND metadata_json ? 'importSource';
   ```
   Or, less surgical, drop the whole `imported.jsonl` log and let idempotency reset:
   ```bash
   rm scripts/_logs/imported.jsonl
   ```
   Don't do both unless you actually want to reimport from scratch — `imported.jsonl` is the source of truth for "what's already in the bank from this script."
2. **Run for real:**
   ```bash
   bun run scripts/import-screenshots.ts data/testbank/<source-directory>
   ```
   No flags. The script processes every PNG in the directory, skips anything in `imported.jsonl`, and POSTs the rest.
3. **Watch the end-of-run summary.** Anything in `extract-failures.jsonl`, `explanation-failures.jsonl`, `ingest-failures.jsonl`, or `needs-review.jsonl` warrants follow-up; the script does not block on them.

### Step 4 — Post-run quality review

Spot-check 20 random `ocr-visible` items via the SQL query in §"Provenance" — read the original alongside the unified explanation, confirm the unified one preserves the source's tactical content. If problems are systematic (e.g., every analogies item missed the relationship type), regenerate explanations for that sub-type via a follow-up script — not by re-running this importer.

For a future run with a new test-bank source: repeat from Step 1. The 5-image canonical sample now draws from the union of old + new images, so it cross-validates that prompt edits haven't regressed older sources.

## Out of scope

- A dedicated `ADMIN_API_TOKEN` env var. The script reuses `CRON_SECRET`.
- A web UI for the `needs-review.jsonl` items. Manual review against the source PNG.
- A schema migration to add a dedicated `original_explanation` column. `metadata_json.originalExplanation` is the right shape for provenance metadata.
- Re-running the unified-explanation pass against items already in the bank. If the contract needs revising post-import, that's a separate one-shot `regenerate-explanations.ts` script.
- Parallelism. We hit the 1 req/s rate limit anyway.
- Image preprocessing.
- Cross-source duplicate detection. If two sources contain the same question (different screenshots, same content), they will both be ingested as separate `items` rows — the file-content SHA-256 prevents *byte-identical* re-ingest but won't catch semantic duplicates. Phase 4's similarity check (cosine < 0.92 against the same sub-type) will catch these in the bank, but the items will already be there. Acceptable for v1; revisit if it becomes a problem.

## Operating procedure (the runbook)

> **Updated to the v2 (split) topology.** The original 4-step procedure has been replaced by a 6-step workflow that maps to the stage-1 / stage-2 split. The substance is unchanged — extraction, solve+verify, explain, POST, spot-check — but the steps are now distributed across two commands so that question-state and explanation-state can be reviewed and re-run independently.

This section is the persistent operational guide for running the OCR pipeline — the answer to "I have a new batch of screenshots, what do I do?"

1. **Drop the new screenshots into `data/testbank/<new-source-name>/`.** Use a descriptive directory name (e.g., `prep_co_practice_1`, `criteria_official_2026`). Confirm `data/testbank/` is in `.gitignore` (it is — but worth checking before adding sensitive material).
2. **Run the canonical 5-image dry-run on stage 1**:
   ```bash
   bun run scripts/import-questions.ts data/testbank --dry-run --sample --limit 5
   ```
   Reviews extraction quality and the solve+verify path. No explain calls fire, no stage-1 files are written. The deterministic sample draws from the union of all subdirectories of `data/testbank/`, so older sources are cross-checked against the latest extract prompt automatically.
3. **Run stage 1 for real on the new directory:**
   ```bash
   bun run scripts/import-questions.ts data/testbank/<new-source-name>
   ```
   Watches end-of-run summary for `extract-failures.jsonl`, `needs-review.jsonl`, `skipped.jsonl`. Stage-1 JSON files land in `scripts/_stage1/<new-source-name>/`. Idempotency is file-presence-based: re-running the command is safe; only screenshots without an existing stage-1 JSON are re-extracted. Manually `rm` the stage-1 file to force a re-extract.
4. **Run the canonical 5-image dry-run on stage 2:**
   ```bash
   bun run scripts/generate-explanations.ts --dry-run --sample --limit 5
   ```
   Reviews explanation quality against the stage-1 JSON files (which already include opaque option ids). Compares prose against `originalExplanation` where present. The dry-run still calls the explain LLM — only the POST and the `imported.jsonl` append are skipped.
5. **Run stage 2 for real:**
   ```bash
   bun run scripts/generate-explanations.ts
   ```
   Confirm the dev server is running (`bun dev` in another terminal) and `ANTHROPIC_API_KEY` + `CRON_SECRET` are populated in `.env`. The script POSTs each stage-1 JSON's item to the ingest route and appends to `imported.jsonl` (now keyed on `sourceImageHash`). Watch the summary for `explanation-failures.jsonl` and `ingest-failures.jsonl`.
6. **Spot-check 20 items** via the provenance SQL query (§"Provenance"). Compare against the source explanation when present.

For a future run with a new test-bank source: repeat from step 1. The 5-image canonical samples for both stages now draw from the union of old + new images, so prompt edits are cross-validated against older sources.

**Reset semantics:** if a source needs reimporting, the reset is now in two layers:
- **Stage 1:** delete the corresponding subdirectory under `scripts/_stage1/`. The next stage-1 run re-extracts.
- **Stage 2:** delete the relevant entries from `scripts/_logs/imported.jsonl`. The next stage-2 run re-runs explain + POST against the stage-1 files for those entries.
Don't delete the entire `imported.jsonl` unless you actually want to reimport from scratch — it's the source of truth for "what's already in the bank from this script."

**For the very first migration-completion run (immediately after the schema migration in commits 1-3 of [`opaque-option-ids-and-pipeline-split.md`](opaque-option-ids-and-pipeline-split.md)):** purge `scripts/_stage1/` and `scripts/_logs/imported.jsonl` if any pre-migration content exists, since pre-migration stage-1 JSON files would contain letter ids that the post-migration validation rejects.

**Stage 3 (regenerate-explanations):** reserved for future use. When the explain prompt changes meaningfully, run `bun run scripts/regenerate-explanations.ts --dry-run --limit 5 --sub-type <id>` to preview, then drop `--dry-run` to apply. See `opaque-option-ids-and-pipeline-split.md` §4.1 for the full design.

## Decisions

These were resolved before implementation:

1. **Visible-answer items get a unified explanation, not the screenshot's verbatim text.** Stylistic consistency across all items dominates source fidelity for post-session review quality (PRD §6.5). The screenshot's original is preserved in `metadata_json.originalExplanation` for audit.
2. **Difficulty estimation accepts Sonnet's call.** Empirical attempt data, recovered later by the candidate-promotion workflow (Phase 6), is the only honest difficulty signal. Anchored definitions in the extract prompt keep estimates consistent across the run.
3. **Original explanations live in `metadata_json.originalExplanation`, not a new column.** Avoids a schema migration. The `metadata_json jsonb` column was put there specifically for this kind of optional provenance field.
4. **The unified-explanation pass runs as a separate Sonnet call after the answer is known.** Folding it into the solve or extract pass would couple two unrelated concerns (answer-finding and post-task-pedagogy) into one prompt, which empirically produces worse output on both axes.
5. **Script and plan are persistent, not one-shot.** Future test-bank expansions run through the same pipeline. Idempotency via `imported.jsonl` makes this safe; the canonical 5-image dry-run before each large run guards against prompt regressions affecting already-imported sources.
6. **Quality gating is a single 5-image cross-source sample, not per-source.** A deterministic random sample drawn from across the full `data/testbank/` directory exercises extraction, classification, both answer-resolution branches, and the unified-explanation contract in one pass. Per-source dry-runs are available as a fallback (§"Test plan → Step 2") but are not the canonical workflow.