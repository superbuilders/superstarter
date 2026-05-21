# Plan — Dev DB data wipe (taxonomy-restructure operational follow-up)

> **Status: shipped 2026-05-06.** Round opened against `main` at HEAD `98170e9` post-taxonomy-restructure-close; closed at this commit. Three commits, fixed (the conditional-fourth from Q5 was removed at redline + confirmed unnecessary at execution): `8d3cf1d` (commit 1 — wipe-and-reseed dev DB; expand TRUNCATE scope to sub_types+strategies per audit finding), `647a609` (commit 2 — derive targetQuestionCountFor from diagnosticMix.length; restore noReServeInSession final-submit assertion), this commit (commit 3 — plan close + SPEC §6.14.21 + formal §2(b) amendment).

This plan covers the operational data-wipe round that follows the taxonomy-restructuring round (closed at `1710a91`). The taxonomy round shipped config + schema-seed + doc reconciliation but deliberately did not touch dev-DB row state; the dev DB still carries `items`, `attempts`, `practice_sessions`, `mastery_state`, and `candidate_promotion_log` rows tagged or stamped against the prior 11-sub-type taxonomy. The application code now expects only the new 14-sub-type taxonomy. This round wipes the items + practice surfaces (preserving auth + taxonomy + strategy data), restores the test surface to a coherent state, and unblocks the testbank re-extraction round that comes next.

The audit surfaced a load-bearing finding the user prompt's "37/37 via wipe alone" framing did not anticipate: the failing `selection.test.ts:noReServeInSession` test fails for **two** independent reasons, only one of which is data-state-tied. See §2(d) for the full diagnosis; §5 for the resolution.

## 1. Why this round, why now

Three forcing functions:

1. **The taxonomy round closed config-clean but data-dirty.** Six commits restructured the 11-sub-type taxonomy to 14 sub-types (cut `verbal.synonyms`, renamed `verbal.logic` → `verbal.critical_reasoning`, moved `letter_series` numerical→verbal, split `numerical.averages_ratios` into `averages` + `ratios`, added `workrate` + `speed_distance_time` + `lowest_values`). The `sub_types` and `strategies` catalog tables were updated by the schema-seed in commit 1; `items.sub_type_id` references were left as-is per the closed-plan §5 explicit out-of-scope reaffirmation. Items in dev DB therefore carry a mix of valid-new-taxonomy ids (for sub-types unchanged across the restructure: `verbal.antonyms`, `verbal.analogies`, `verbal.sentence_completion`, `numerical.number_series`, `numerical.word_problems`, `numerical.fractions`, `numerical.percentages`) and now-invalid ids (`verbal.synonyms`, `verbal.logic`, `numerical.letter_series`, `numerical.averages_ratios`). Selection-engine reads against the now-invalid ids return zero rows; runtime behavior with stale data is the empirical signal this round resolves.

2. **The test surface dropped to 36/37 during the taxonomy round and stayed there.** `src/server/items/selection.test.ts:noReServeInSession` drives a diagnostic-quota's worth of submissions and asserts all served items are distinct. The test depends on (a) live items in the dev DB tagged under the new taxonomy AND (b) a coherent `targetQuestionCount` ↔ `diagnosticMix.length` invariant. The taxonomy round broke (a); the audit reveals (b) is also broken (see §2(d)). Wipe-and-reseed addresses (a); test restoration addresses (b).

3. **Three operational rounds depend on this one.** Testbank re-extraction (next round) reruns the OCR pipeline against `data/testbank/` under the new taxonomy and ingests the re-extracted items via `scripts/import-questions.ts` + `scripts/generate-explanations.ts`. The diagnostic-mix re-balance to 50 entries (deferred per Q1(b) of the taxonomy round) sits naturally inside the re-extraction round once empirical per-sub-type ratios arrive. Strategy authoring for the three new sub-types (`workrate`, `speed_distance_time`, `lowest_values`) is independent and can run in parallel. None of these can proceed cleanly while the dev DB still carries old-taxonomy items: a re-extraction run that ingests on top of stale rows produces a mixed-taxonomy bank, and the test surface stays red. **Production deploy remains gated on Leo's no-deploy-until-feature-complete decision; this is dev-only.**

This round, like the taxonomy round, is operational rather than user-visible. The audit is the load-bearing piece. The actual TRUNCATE is one statement; the test restoration is a focused edit; the rest is verification.

## 2. Audit findings

The audit ran read-only against `main` post-taxonomy-restructure (HEAD = `98170e9` at audit time). Findings grouped per the user prompt's structure.

### 2(a) Tables to TRUNCATE

> **Amended at commit 1 (`8d3cf1d`) per Path (A) audit finding.** The original §2(a) listed five tables; the pre-execution audit against the live dev DB found `sub_types` and `strategies` had drifted from their plan-time-assumed state (11 sub_types under old taxonomy IDs + 111 strategies vs the plan's expected 14 + 33) due to UPSERT-leaves-orphans semantics in the seed scripts. Both tables moved from §2(b) preserved → §2(a) wiped; the round's TRUNCATE list is now seven tables. See commit 1's commit body for the record-at-execution narrative; see §10.6 below for the formal Resolution-6 framing of the amendment; see SPEC §6.14.21 for the generalizable pattern.

Seven tables exist on disk that carry items + practice + catalog rows that must be wiped:

- **`items`** (`src/db/schemas/catalog/items.ts`) — canonical item bank; FK to `sub_types` and `strategies`. Will be repopulated by testbank re-extraction round.
- **`attempts`** (`src/db/schemas/practice/attempts.ts`) — per-question results; FKs to `practice_sessions` (ON DELETE CASCADE) and `items`. Stale by definition once `items` and `practice_sessions` are wiped.
- **`practice_sessions`** (`src/db/schemas/practice/practice-sessions.ts`) — session records; FKs to `users` (ON DELETE CASCADE) and `sub_types`. Some rows reference now-invalid `sub_type_id` values for drill-typed rows started under the old taxonomy.
- **`mastery_state`** (`src/db/schemas/practice/mastery-state.ts`) — per-`(user_id, sub_type_id)` mastery; composite PK; FKs to `users` (ON DELETE CASCADE) and `sub_types`. Rows with old-taxonomy `sub_type_id` are wiped together with the FK parent.
- **`candidate_promotion_log`** (`src/db/schemas/ops/candidate-promotion-log.ts`) — promotion audit trail; FK to `items`. Empty in dev DB at the round's execution time (no Phase 6 work has shipped) but listed for completeness.
- **`sub_types`** (`src/db/schemas/catalog/sub-types.ts`) — added to the wipe list per the Path (A) amendment. Empirical pre-wipe state at execution time was 11 rows carrying old-taxonomy IDs (`verbal.synonyms`, `verbal.logic`, `numerical.letter_series`, `numerical.averages_ratios` all present); the taxonomy round's commit-1 schema-seed run inserted/updated the 14 new IDs but left the 4 cut/renamed/moved old IDs orphaned in place because `seed-sub-types.ts` uses `onConflictDoUpdate` without companion delete-not-in-config logic. Re-seeded post-wipe via `bun db:seed` (FK-ordered: sub_types first, then strategies).
- **`strategies`** (`src/db/schemas/catalog/strategies.ts`) — added to the wipe list per the Path (A) amendment. Empirical pre-wipe state at execution time was 111 rows (3.36× the expected 33), distributed across both old and new sub_type_ids, with deterministic-id-by-`(subTypeId, index)` keying having upserted only the indices that existed under each successive strategy-config shape and leaving stale rows from prior shapes orphaned. Re-seeded post-wipe via `bun db:seed` after sub_types.

### 2(b) Tables to PRESERVE

> **Amended at commit 1 (`8d3cf1d`).** Originally listed six tables; `sub_types` and `strategies` moved to §2(a) per the Path (A) audit finding above.

Four tables must survive the wipe untouched:

- **`users`** (`src/db/schemas/auth/users.ts`) — auth identity; preserves Leo's dev account.
- **`sessions`** (auth, `src/db/schemas/auth/sessions.ts`; table named `sessions` in DB despite the import alias `authSessions`) — Auth.js v5 database-strategy session storage; cookie-token-keyed.
- **`accounts`** (`src/db/schemas/auth/accounts.ts`) — Auth.js OAuth account links.
- **`verification_tokens`** (`src/db/schemas/auth/verification_tokens.ts`) — Auth.js verification-token flow.

The taxonomy-round audit identified `strategy_views` and `review_queue` as tables dropped during the v1-code-cleanup round (per that round's audit category 1, dropped via `DROP TABLE … CASCADE` in commit 4). Verified during this audit: neither table appears in `src/db/schemas/**` and neither imports under `src/db/schema.ts`'s barrel. **Both are confirmed dropped.** No action required on either.

### 2(c) Foreign-key ordering for TRUNCATE

> **Amended at commit 1 (`8d3cf1d`).** The original analysis below was for the five-table case; the round shipped seven tables (sub_types + strategies added per Path (A) — see §2(a) above). The recommended approach (single TRUNCATE with CASCADE + explicit table list) and the bounded-CASCADE-blast-radius reasoning generalize cleanly to the seven-table case: `items`, `practice_sessions`, `mastery_state`, `strategies` all FK `sub_types`; `items` FKs `strategies`; `attempts` and `candidate_promotion_log` FK `items`; every CASCADE-reachable child remains in the explicit wipe list (no walk-out). The shipped statement is `TRUNCATE TABLE items, attempts, practice_sessions, mastery_state, candidate_promotion_log, sub_types, strategies RESTART IDENTITY CASCADE`.

The FK dependency graph among the original five tables to wipe (preserved as plan-time analysis):

```
attempts        →  practice_sessions (ON DELETE CASCADE), items
candidate_promotion_log  →  items
items           →  sub_types (preserved), strategies (preserved)
practice_sessions  →  users (preserved, ON DELETE CASCADE), sub_types (preserved)
mastery_state   →  users (preserved, ON DELETE CASCADE), sub_types (preserved)
```

The two real dependencies WITHIN the wipe set are: `attempts → practice_sessions` and `attempts → items` and `candidate_promotion_log → items`. Three approaches considered:

1. **Explicit ordered TRUNCATEs.** Wipe `attempts` → `candidate_promotion_log` → `items` → `practice_sessions` → `mastery_state` in that order. Five separate statements, no CASCADE. Most explicit; most fragile to add-a-table drift.
2. **Single TRUNCATE with CASCADE.** `TRUNCATE TABLE items, attempts, practice_sessions, mastery_state, candidate_promotion_log RESTART IDENTITY CASCADE` — Postgres handles ordering internally; CASCADE walks any FK to truncate dependents. Atomic; one statement.
3. **TRUNCATE per-parent with CASCADE.** `TRUNCATE TABLE items CASCADE; TRUNCATE TABLE practice_sessions CASCADE; TRUNCATE TABLE mastery_state CASCADE`. Three statements; relies on CASCADE to reach `attempts` and `candidate_promotion_log`. CASCADE silently widens the blast radius: a future schema change that adds a CASCADE-reachable child table to `users` (e.g.) would silently get wiped if the operator listed `users` here by mistake.

**Recommendation: approach (2) — single TRUNCATE with explicit table list and CASCADE.** Rationale: (a) atomic — single statement, no partial-wipe failure modes; (b) the CASCADE blast radius is bounded because the listed parents (`items`, `practice_sessions`, `mastery_state`, `candidate_promotion_log`) only have `attempts` and the listed parents themselves as CASCADE-reachable children, all of which are themselves in the explicit list — CASCADE walks no further than the explicit set; (c) matches the v1-code-cleanup round's existing precedent of `DROP TABLE … CASCADE` per the prior audit; (d) `RESTART IDENTITY` is harmless here since all PKs are UUIDv7 (no sequences to restart) but doesn't hurt.

The v1-code-cleanup round used `DROP TABLE … CASCADE` for tables it was eliminating from the schema; this round uses `TRUNCATE … CASCADE` for tables it's clearing data from. The shape rhymes; the verb differs because the schema is preserved.

### 2(d) Test-suite restoration — the load-bearing audit finding

`src/server/items/selection.test.ts:noReServeInSession` is the round's stated empirical signal (36/37 → 37/37 expected via wipe). The audit reveals the test fails for **two independent reasons**, only one of which is data-state-tied:

**Reason 1 (data-state, addressed by wipe + reseed).** The test calls `startSession({ type: "diagnostic" })`, then in a loop submits attempts and reads `data.nextItem` from each response. The selection engine, via `getNextFixedCurve`, reads `shuffledDiagnosticOrder(sessionId)[attemptIndex]` and dispatches `pickWithFallback({ subTypeId: slot.subTypeId, … })`. For mix slots whose `subTypeId` is `verbal.critical_reasoning` (renamed from old `verbal.logic`), `verbal.letter_series` (moved from numerical), `numerical.averages`, or `numerical.ratios` (split from `averages_ratios`), the dev DB carries zero items in those new-taxonomy ids — the items still exist tagged under their old ids. `pickItemRow` returns null, `getNextFixedCurve` returns undefined, the test sees `nextItem === undefined` before reaching quota and throws `ErrUnexpectedNextItemAbsence`. Wipe + reseed (the `bun db:seed:items` script already ingests against the new 14-sub-type taxonomy per `src/db/seeds/items/data/index.ts`'s `Record<SubTypeId, …>` map) restores the new-taxonomy item rows and clears this failure mode.

**Reason 2 (code-state, NOT addressed by wipe).** `targetQuestionCountFor` at `src/server/sessions/start.ts:82` returns `50` for `type === "diagnostic"`, which is written to `practice_sessions.target_question_count` at session-insert. `diagnosticMix.length` is `46` per the taxonomy round's Q1(b) deferral (synonyms' 4 entries cut, three new sub-types' entries not yet allocated). `getNextItem` at `src/server/items/selection.ts:443-449` returns `undefined` when `attemptCount >= ctx.targetQuestionCount` (= 50); `getNextFixedCurve` at `selection.ts:294-303` THROWS `ErrDiagnosticMixOutOfRange` when `attemptIndex >= order.length` (= 46). The undefined-on-quota check fires AFTER the strategy dispatch, so a session that gets through 46 attempts cleanly fails at the 47th-attempt selection with a thrown error, not a clean undefined. `src/config/diagnostic-mix.test.ts:53-56`'s comment ("selection.ts handles bank fallback when the mix runs out") is **incorrect** — the comment is aspirational; the engine throws.

Even with the dev DB perfectly re-seeded under the new taxonomy, `noReServeInSession` cannot reach 37/37 as currently written. The test loops `for (let i = 1; i <= 49; i += 1)` (49 iterations submitting attempts 2 through 50, plus the explicit 50th submit) — at iteration `i = 46`, the 47th-attempt selection trips `ErrDiagnosticMixOutOfRange` and the test fails with a thrown error from the selection engine.

**Three options for restoration:**

- **(i) Re-seed only.** Run `bun db:seed:items` after the wipe; do not edit the test. This addresses Reason 1 but leaves Reason 2 unresolved; the test still fails at iteration 46 with `ErrDiagnosticMixOutOfRange`. **Does not reach 37/37.**

- **(ii) Re-seed + parameterize the test on `diagnosticMix.length`.** Run `bun db:seed:items` after the wipe; edit `selection.test.ts:noReServeInSession` to (a) loop `diagnosticMix.length - 1` times instead of 49, (b) drop the final-submit-returns-undefined assertion (the assertion was about `targetQuestionCount=50` reaching quota, which does not match `mix=46` reality — the engine cannot produce a clean quota-reached `undefined` when mix exhausts first), (c) keep the post-loop "all `mix.length` attempted item_ids distinct" assertion, parameterized on `diagnosticMix.length`. The test name and docstring stay focused on the no-re-serve property, which is the test's actual reason for existing. **Reaches 37/37.** Test still exercises the session-attempted-ids exclusion contract end-to-end. Couples the round's scope to a small test edit but no product-code change.

- **(iii) Re-seed + skip-pending the test until testbank re-extraction.** Run `bun db:seed:items` after the wipe; mark `noReServeInSession` with `test.skip(...)` or `test.todo(...)` and a TODO comment pointing at the testbank-re-extraction round, where `diagnosticMix.length` will grow back to 50 alongside the re-balance. **Closes the round at 36/37 transiently.** The 37/37 restoration moves to the next round, which is cleaner conceptually (the bug lives where the cause lives) but defers the round's stated goal.

**Recommendation: (ii), with an architectural-posture amendment.** The test edit is small, self-contained, and preserves the test's intent (no-re-serve is the property it's named for and was written to verify). But parameterizing the test alone — without touching `targetQuestionCountFor` — codifies a *workaround*, not a *fix*: it leaves a hardcoded-50 in `start.ts` that's silently incoherent with `diagnosticMix.length=46` and would re-trip `ErrDiagnosticMixOutOfRange` against any future code path that exercises the full diagnostic loop (drill-from-incomplete-diagnostic, manual smoke against `/diagnostic/run`, a future regression test that doesn't import `diagnosticMix`).

**Resolved at redline 2026-05-04 (Q1):** the round adopts the architectural posture that `diagnosticMix.length` is the source of truth for "how many questions a diagnostic delivers" — Reading B (mix is canonical, code derives from mix), not Reading A (code is canonical, mix is incomplete). `src/server/sessions/start.ts:82` is amended so `targetQuestionCountFor("diagnostic")` returns `diagnosticMix.length` rather than the hardcoded `50`. The taxonomy round's Q1(b) deferral of the diagnostic-mix re-balance to sub-phase 2 / testbank-re-extraction is honored — re-balance still lives in a future round; this round's derivation fix codifies the *dynamic relationship* as the right architectural posture going forward, so when the future round restores `diagnosticMix.length` to 50, `targetQuestionCount` follows automatically without a coordinated edit.

The test edit then captures behavior naturally rather than working around a misalignment: with `target = mix.length`, `getNextItem`'s undefined-on-quota check at `selection.ts:443-449` fires cleanly when `attemptCount >= mix.length`, and `getNextFixedCurve`'s `ErrDiagnosticMixOutOfRange` throw at `selection.ts:294-303` becomes unreachable from the diagnostic happy path (it remains a defensive guard against impossible state). The final-submit-returns-undefined assertion in the test, dropped under bare option (ii), can be **restored** under the amended option (ii) because the engine now produces a clean undefined at the mix-exhausted boundary.

A note on code-state precondition vs data-state premise: the user prompt framed this round's goal as "37/37 via wipe alone." The audit reveals the framing was based on an incomplete diagnosis — wipe addresses one of two failure modes. This is a SPEC §6.14.19-flavored finding (type-error-as-audit cascade): the dev-DB-state issue masked a code-state issue that only surfaces once the data-state issue is removed. SPEC §6.14 candidate proposed in §6 below — sharpened by the redline outcome (the round addresses both failure modes rather than deferring one).

### 2(e) Other tests that may break post-wipe

Audit of all `src/**/*.test.ts` and `scripts/dev/smoke/**/*.ts`:

**Bun-test surface (`src/**/*.test.ts`, four files, 37 tests total — 3 + 16 + 5 + 13):**

- `src/server/items/selection.test.ts` (3 tests). `withinCellDeterminism` and `withinCellVariationAcrossSessions` query `verbal.antonyms` medium cell for live items; the seed provides 5 items in that cell unchanged across the taxonomy restructure (`verbal.antonyms` was untouched). Both pass post-wipe-and-reseed. `noReServeInSession` is the §2(d) failing test.
- `src/server/mastery/compute.test.ts` (16 tests). Pure-function tests against `recomputeForUser` / `computeMastery` shape. No DB queries; no items dependence. Unaffected.
- `src/config/diagnostic-mix.test.ts` (5 tests). Pure-function tests against the in-memory `diagnosticMix` constant + `shuffledDiagnosticOrder` PRNG. The length assertion is pinned at 46 (line 62), matching the provisional mix. No DB queries. Unaffected.
- `src/auth/drizzle-adapter-shim.test.ts` (13 tests). Pure-function tests against the Auth.js v5 adapter shim's date conversion + row mapping. No DB queries. Unaffected.

**Smoke surface (`scripts/dev/smoke/`, 12 files):**

Files that read or write `items` / `practice_sessions` / `attempts` / `mastery_state` (per `grep -l` audit): `phase3-commit1.ts`, `start-session-idempotency.ts`, `mastery-map-empty-state.ts`, `phase3-commit4.ts`, `phase3-polish-commit1.ts`, `phase3-commit5.ts`, `diagnostic-mastery-recompute.ts`, `heartbeat-route-ownership.ts`, `phase3-commit2-browser.ts`, `sign-out-button.ts`. Files that touch only auth or fmt/lint surfaces: `phase3-commit3.ts`. Sub-type-id references in smoke files (per `grep` audit) all resolve to valid new-taxonomy ids: `verbal.antonyms`, `numerical.fractions`, `numerical.percentages` — none reference the cut/renamed/split sub-types. Verified: the taxonomy round's commit 5 substituted the smoke-side ids cleanly.

**Smoke restoration posture.** Smokes are not part of the 37/37 test count (they're environment-dependent per SPEC §6.14.8). Post-wipe + reseed, smokes that read items expect ≥1 live row in the queried cell — the seed provides 5 each for `verbal.antonyms` and `numerical.fractions` (the two ids most-referenced in smokes), so smokes execute against valid data. **No smoke-side edits required.** Smokes are not re-run as part of the round's verification protocol (carrying-forward the per-round discipline of bun test as the canonical signal); operators may re-run individual smokes ad-hoc post-wipe to spot-check.

### 2(f) Backup posture

The dev DB is a throwaway dev-environment row store. It carries no production data, no shared state, no rows that need preservation across the wipe outside of users + auth + taxonomy + strategies (already enumerated as preserved per §2(b)). Honest survey of "anything in dev DB worth preserving":

- **Leo's user row + auth-session cookie.** Preserved by §2(b). The next dev-server load post-wipe finds the user's session token still valid; no re-login required.
- **Leo's manual test data.** The audit cannot inspect the live dev DB from this planning context (no DB credentials, no inspection at planning time). If Leo has in-flight investigation rows or hand-crafted items he wants to preserve, the wipe will lose them. Mitigation: a dry-run row count + a one-line `pg_dump --data-only --table=items --table=practice_sessions --table=attempts --table=mastery_state --table=candidate_promotion_log > pre-wipe-snapshot.sql` before the actual TRUNCATE costs nothing and gives him an undo path. **Recommendation: include the dump in the wipe script, default-on, output to `scripts/_logs/` (gitignored), with a logger.info message naming the path.** The script can cost-budget the dump (skip if N rows > 100k or time > 5s) but at v1 dev-DB scale, the dump runs in milliseconds.

This is a small operational courtesy with negligible cost. It's not "backup discipline" in the production-DB sense; it's "give the operator an undo button before a destructive op." **Open question Q2 in §10 surfaces this for redline.**

## 3. The TRUNCATE operation

### What's missing / what should exist

A one-shot, idempotent script that wipes the five §2(a) tables and produces a verifiable empty-state outcome. The script should:

1. Connect via `createAdminDb()` (the established admin-DB shape used by `drop-schema.ts`, `seed-strategies.ts`, `seed-sub-types.ts`).
2. Read the pre-wipe row counts for each of the five wipe-targeted tables; log them via `logger.info` with structured `{ table: ..., countBefore: ... }` context per the round's structured-logging discipline.
3. Optionally produce a pre-wipe `pg_dump --data-only` snapshot of the five tables to `scripts/_logs/wipe-snapshot-${timestamp}.sql` per §2(f). Default-on; can be disabled via `--no-snapshot` flag for CI-style runs.
4. Run the single CASCADE TRUNCATE per §2(c)'s recommended approach (2): `TRUNCATE TABLE items, attempts, practice_sessions, mastery_state, candidate_promotion_log RESTART IDENTITY CASCADE`.
5. Read post-wipe row counts; assert each is zero; log via `logger.info` with structured `{ table: ..., countAfter: 0 }` context.
6. Read the row counts for the §2(b) preserved tables (`users`, `sessions`, `accounts`, `verification_tokens`, `sub_types`, `strategies`); log them via `logger.info` and assert each is unchanged from a pre-wipe read (or non-zero for `users` + `sub_types` + `strategies`, which the seed scripts populated). The preservation invariant is what makes the operation safe; verify it before exit.
7. Exit zero on success; exit non-zero with an explicit logger.error if any post-wipe assertion fails.

Idempotency: a second run against an already-wiped DB is a no-op (the TRUNCATE truncates already-empty tables, the assertions pass, the dump file is per-timestamp). The script can be re-run after a partial seed without harm.

### Implementation seam

`scripts/dev/wipe-practice-data.ts` (NEW). The script lives in `scripts/dev/` per SPEC §6.14.8's "environment-dependent script" convention (not under `src/db/scripts/` since it's not a Drizzle-Kit pipeline step nor a seed). The shape mirrors `drop-schema.ts` (the existing operational-SQL admin-DB script): CLI args parsed from `process.argv.slice(2)`, `createAdminDb()` for connection, `errors.try` + `errors.wrap` discipline, `logger.info` / `logger.error` for all observability.

A `package.json` script wiring is recommended for ergonomics: `"db:wipe:practice-data": "bun --bun run scripts/dev/wipe-practice-data.ts"`. **Open question Q3 in §10 surfaces the script-name + wiring choice.**

A Drizzle migration was considered and rejected. Migrations are for schema state changes; this is a row-state operation. Adding a migration would (a) imprint a one-shot data op on the migration history that would re-execute on every fresh DB bootstrap (running the wipe in environments where there's nothing to wipe is a no-op, but it's noise), (b) create a migration whose intent is "wipe dev data" sitting in the `drizzle/` folder where future operators expect schema diffs, (c) miss the snapshot + assertion shape that an operational script naturally accommodates. The script approach is more honest about what's happening: dev-only data wipe, not a schema change.

### Files touched

- `scripts/dev/wipe-practice-data.ts` (NEW). ~80 lines following the `drop-schema.ts` shape.
- `package.json` (one-line script entry).

### Schema / state changes

None. Schema is untouched; row state moves from "mixed-taxonomy items + dependent practice rows" to "empty across the five §2(a) tables."

### Verification scenarios

1. Pre-run `psql` or Drizzle row-count read against the five §2(a) tables: log non-zero counts (proof of data to wipe).
2. Run `bun db:wipe:practice-data` (or equivalent).
3. Post-run `psql` or Drizzle row-count read against the five §2(a) tables: each returns 0.
4. Post-run row-count read against the six §2(b) preserved tables: `users` ≥ 1 (Leo's row), `sessions` ≥ 0 (depends on cookie expiry), `accounts` ≥ 0 (depends on OAuth setup), `verification_tokens` ≥ 0, `sub_types` = 14, `strategies` = 33 (3 entries × 11 currently-authored sub-types per the taxonomy round's resolution 7).
5. Cookie-roundtrip check: navigate to the dev server post-wipe; observe Leo's session token still authenticates without re-login.
6. Optional: inspect the `scripts/_logs/wipe-snapshot-${timestamp}.sql` file for non-zero size and parseable SQL (proof of the safety undo path).

## 4. Re-seed of items via existing seed pipeline

### What's missing / what should exist

After §3 zeroes `items`, the test surface and any smoke that reads items needs ≥1 live row in the queried cells. The existing seed script `bun db:seed:items` (wired at `src/db/seeds/items/index.ts`) ingests 50 hand-curated items distributed across the 14 sub-types per `src/db/seeds/items/data/index.ts`'s `Record<SubTypeId, SeedItemInput[]>` map. Per-sub-type seed counts (verified via `grep -c "subTypeId:" src/db/seeds/items/data/*.ts`):

```
verbal.antonyms: 5      numerical.number_series: 5     numerical.workrate: 0
verbal.analogies: 5     numerical.word_problems: 5     numerical.speed_distance_time: 0
verbal.sentence_completion: 5  numerical.fractions: 5  numerical.lowest_values: 0
verbal.critical_reasoning: 5   numerical.percentages: 5
verbal.letter_series: 5        numerical.averages: 3
                               numerical.ratios: 2
```

Total: 50 items across the 11 currently-authored sub-types. Three new sub-types (`workrate`, `speed_distance_time`, `lowest_values`) have empty seed files per the taxonomy round's Q4 + resolution 7 — strategy authoring + seed authoring for those is the testbank-re-extraction round's territory.

The 50 seed items map cleanly onto the 46-entry diagnostic-mix (the mix has zero entries for the three new sub-types, so all 46 entries hit cells with seed coverage).

### Implementation seam

No new code. Run `bun db:seed:items` post-wipe. The seed script's existing dedup-by-body-text guard (`existsByBodyText` at `src/db/seeds/items/index.ts:21-28`) is no-op against an empty `items` table; every seed row is fresh-inserted.

The seed script's deliberate `triggerEmbeddingBackfill: false` hand-off to `scripts/backfill-missing-embeddings.ts` is preserved. The selection-engine's similarity-aware fallback chain reads the `items.embedding` column; for the `noReServeInSession` test, the embedding column is irrelevant (the test exercises hash-permutation determinism + no-re-serve, not similarity fallback). **Whether to run `scripts/backfill-missing-embeddings.ts` post-seed as part of this round is open question Q4 in §10.** The default recommendation: yes, run it, since it's cheap (50 items × OpenAI embedding cost ≈ negligible) and brings the dev DB to a fully-coherent state for any post-wipe smoke that touches embeddings.

### Files touched

None.

### Schema / state changes

`items` table: 0 rows → 50 rows post-`bun db:seed:items`. Optionally, `items.embedding` column: 50 rows × NULL → 50 rows × non-NULL post-`scripts/backfill-missing-embeddings.ts` (per Q4).

### Verification scenarios

1. Post-seed row count: `SELECT status, count(*) FROM items GROUP BY status` returns `live: 50` (per Q5 redline pre-pinning — see below). If the count breaks down as `candidate: 50` (or any non-zero candidate count), the seed pipeline is misaligned with the v1 dev-DB seed posture and a small fix lands inside commit 1's scope per the Q5 resolution below.
2. Per-sub-type row count: each of the 11 currently-authored sub-types has the per-table count from the table above; the three new sub-types have 0.
3. `bun test` produces 37 results (test count restoration verified across all four test files).

**Q5 resolution — pre-pin to `status='live'` (resolved at redline 2026-05-04).** The v1 dev-DB seed represents real-items-bank items that the application treats as production-ready; `selection.test.ts:liveCellItemCount` queries `WHERE status = 'live'` per its design. The `'candidate'` status is the LLM-generation pipeline's territory (Phase 4 deliverable per `docs/architecture_plan.md` build sequencing); `'candidate'` items in the dev DB before Phase 4 ships would be ahead of the pipeline that produces them. **Round contract:** all 50 seed items land at `status='live'` post-seed. If the audit during commit 1's verification finds the seed pipeline (`src/server/items/ingest.ts:ingestRealItem` — invoked by `src/db/seeds/items/index.ts`) inserts at `'candidate'` (the items table's column default per `src/db/schemas/catalog/items.ts:14`), the seed pipeline is updated to land seed-path items at `'live'` as part of commit 1. The fix shape is small (either an explicit `status: "live"` on the insert, or a `SeedItemInput`-aware override path through `ingestRealItem`); the exact seam is determined at commit 1's verification step. **No conditional follow-up commit is needed** — the fix lands inside commit 1's scope per the Q5 resolution.

## 5. Test-suite restoration — `selection.test.ts:noReServeInSession` + `start.ts:targetQuestionCountFor`

### What's missing / what should exist

Per §2(d) audit finding, the test fails for two reasons; wipe + reseed addresses Reason 1 (data state). Q1's redline resolution adopts the architectural posture that `diagnosticMix.length` is canonical (Reading B), so this round addresses Reason 2 (code state) directly via a one-line derivation fix in `start.ts`, then captures the resulting clean behavior in the parameterized test.

**Code change — `src/server/sessions/start.ts:82` (`targetQuestionCountFor`).** The function currently returns the literal `50` for `type === "diagnostic"`. The fix derives from the mix:

```ts
import { diagnosticMix } from "@/config/diagnostic-mix"
// ...
function targetQuestionCountFor(input: StartSessionInput): number {
    if (input.type === "diagnostic") return diagnosticMix.length
    // ... drill / full_length / simulation paths unchanged
}
```

`full_length` and `simulation` continue to return the hardcoded `50` — those branches are out of scope here (they're Phase 5 sub-phase territory, not data-wipe territory; no diagnostic-mix-equivalent constant exists for full_length yet, and inventing one in this round would be scope-creep). The change is one import + one return-statement edit, scoped strictly to the diagnostic branch.

**Test edit — `src/server/items/selection.test.ts:noReServeInSession` (paraphrased; not an implementation):**

1. Import `diagnosticMix` from `@/config/diagnostic-mix` at the top of the test file.
2. Bind `const N = diagnosticMix.length` near the top of the `noReServeInSession` test body.
3. Change the `for` loop bound from `i <= 49` to `i < N` (loops `N − 1` times — re-fetches `data.nextItem` from each of the first `N − 1` submits).
4. **Restore** the final-Nth-submit-with-`expect(...nextItem).toBeUndefined()` block. With `targetQuestionCount = mix.length` post-fix, `getNextItem` produces a clean `undefined` at the quota-reached boundary; the engine's `ErrDiagnosticMixOutOfRange` throw at `selection.ts:294-303` is unreachable from the diagnostic happy path (defensive guard against impossible state — kept; never fires).
5. Update the post-loop attempts-table read assertion: `expect(itemIds.length).toBe(N)` and `expect(distinct.size).toBe(N)`.
6. Update the test's docstring comment block to reflect "drive the diagnostic to quota completion (mix-derived)" framing — the "no re-serve" property remains the test's reason for existing; the test name stays as `noReServeInSession`.

The combined edit is small (~12-15 lines changed across two files including the docstring update). It captures the dynamic relationship rather than working around a misalignment: when the testbank-re-extraction round restores `diagnosticMix.length` to 50, both the test and `targetQuestionCountFor` track automatically — no coordinated re-edit needed.

### Implementation seam

- `src/server/sessions/start.ts` (EDITED) — one import + one return-statement edit at the `targetQuestionCountFor` diagnostic branch.
- `src/server/items/selection.test.ts` (EDITED) — one test function (`noReServeInSession`); no other tests in the file affected (`withinCellDeterminism` and `withinCellVariationAcrossSessions` query the `verbal.antonyms` medium cell which the seed populates with 5 items, so they pass post-wipe-and-reseed without edits).

### Schema / state changes

None to the database schema. `practice_sessions.target_question_count` rows inserted post-fix carry `46` for diagnostic sessions (until the testbank-re-extraction round grows the mix and the value follows). Existing `target_question_count=50` rows from before the wipe are removed by the §3 TRUNCATE — no migration of historical row values needed.

### Verification scenarios

1. Pre-edit, post-wipe-and-reseed: `bun test src/server/items/selection.test.ts` produces 2 passing + 1 failing (`noReServeInSession` fails with `ErrDiagnosticMixOutOfRange` once Reason 1 is removed by the wipe+reseed — Reason 2 surfaces).
2. Post-`start.ts`-edit only (test still hardcoded at 49 loop iterations + 50th submit): `bun test src/server/items/selection.test.ts` produces 2 passing + 1 failing (`noReServeInSession` now fails earlier — `getNextItem` returns `undefined` at attemptCount=46 since `targetQuestionCount=46`, the test's i=46 iteration sees `nextItem === undefined` before quota *as the test currently understands quota* and throws `ErrUnexpectedNextItemAbsence`).
3. Post-`start.ts`-edit + post-test-edit + post-wipe + post-seed: `bun test src/server/items/selection.test.ts` produces 3 passing.
4. Full suite: `bun test` produces 37 passing (3 + 16 + 5 + 13 across the four test files; round goal restored).
5. Spot-check: `practice_sessions.target_question_count` for a fresh diagnostic session inserted post-fix equals `diagnosticMix.length` (currently 46) — verifies the derivation flowed end-to-end.

## 6. SPEC reconciliation — candidate §6.14.21

The audit-revealed cascade in §2(d) — a data-state-tied failure mode masking a code-state-tied failure mode — is a meta-pattern worth generalizing into a SPEC §6.14 implementation note. The pattern, sharpened by the redline outcome (the round addresses both failure modes within scope rather than deferring one):

> **Data-state-masking-code-state precondition.** When a test fails for a clearly data-state-tied reason (stale rows, missing seeds, taxonomy drift), confirm the data-state fix actually closes the test before assuming the data-state was the only cause. Wipe and reseed in isolation if possible; observe the resulting failure mode. A second, code-state-tied cause may surface only once the data-state cause is removed. The round-discipline implication: round goals framed as "fix X by addressing data-state issue Y" should be audited at round-open, not at round-close, to catch a second cause that masquerades as the same symptom. The corollary: when the second cause is small enough to address in-scope (one-line derivation fix vs. invariant-spanning refactor), it lands in the round that surfaced it rather than being deferred — the data-state and code-state fixes are tightly coupled in the verification surface and splitting them across rounds creates an awkward intermediate state where the test still fails after the data-state round closes.

This generalizes from this round's specific finding (the `ErrUnexpectedNextItemAbsence`/`ErrDiagnosticMixOutOfRange` symptom had two causes, one data-state and one code-state, both addressed within scope) into a meta-pattern for future rounds. It rhymes with §6.14.19 (type-error-as-audit-cascade — a typecheck failure in one place forced cascade-edits in seven consumer files) but is framed around the test surface rather than the typecheck surface.

The SPEC §6.14 entry is added in the round-close commit per the established convention. The cross-reference back to this plan + to §2(d) of this plan + to selection.test.ts:noReServeInSession is part of the entry's body.

### Implementation seam

`docs/SPEC.md` §6.14.21 (NEW). Follows the §6.14.18 / .19 / .20 shape: short title, one-paragraph framing, cross-references back to the originating plan, code surface, and any sibling §6.14 entries (likely .19 here).

### Files touched

- `docs/SPEC.md` (one new §6.14 entry).
- `docs/plans/phase5-data-wipe.md` (this plan's status header flips to "shipped" with commit hashes filled in).

### Schema / state changes

None (doc-only).

### Verification scenarios

None (doc-only).

## 7. Sequencing and commits

Three commits. **Round closes at exactly three commits per the redline resolution** — Q5's pre-pinning to `status='live'` removes the conditional-fourth-commit possibility (any seed-script edit needed to land items at `'live'` lands inside commit 1's scope, not as a separate commit). The audit's load-bearing finding (Reason 2 / code-state cause) drives the test-edit ordering: the wipe + reseed must precede the test+code edit in commit 2, since commit 2's verification depends on a re-seeded items table to reach the quota-completion path the test now asserts against.

Final shape:

1. **Commit 1 — `feat(scripts): add wipe-practice-data dev script + execute against dev DB`.** Lands `scripts/dev/wipe-practice-data.ts` per §3 and the `package.json` script entry per Q3. The commit's verification IS the wipe-and-verify run: `bun db:wipe:practice-data` against the dev DB, observing the §3 verification scenarios pass (pre-wipe non-zero counts logged, post-wipe zero counts asserted, preserved-table counts unchanged, default-on snapshot file written per Q2). Re-seeding via `bun db:seed:items` is part of this commit's verification footprint (run after the wipe; assert 50 items inserted at `status='live'` per Q5; if the seed pipeline lands rows at `'candidate'`, the small fix to land at `'live'` is included in this commit's scope per §4's Q5 resolution). Embedding backfill via `bun scripts/backfill-missing-embeddings.ts` is included per Q4 — keeps the dev DB single-coherent-state at commit close, no in-flight partial-embedding state.

2. **Commit 2 — `fix+test(selection): derive targetQuestionCountFor from diagnosticMix.length; parameterize noReServeInSession`.** Lands both the §5 `start.ts` derivation fix and the `selection.test.ts:noReServeInSession` parameterization. Combined ~12-15 lines across two files. Verification: `bun test src/server/items/selection.test.ts` passes 3/3, then `bun test` passes 37/37 (round goal restored). The commit's commit message body summarizes the §2(d) audit finding (Reason 1 + Reason 2) and the redline architectural posture (Reading B — `diagnosticMix.length` is canonical; `targetQuestionCountFor` derives from it). Forward-reference to the testbank-re-extraction round, where the mix grows back to 50 and `targetQuestionCount` follows automatically without a coordinated re-edit. No edit to any closed plan (closed-plans-immutable holds).

   The fix-and-test bundle is appropriate as a single commit because the two changes are tightly coupled: the test edit's verification depends on the `start.ts` change to make sense (without the derivation fix, the test's restored final-submit-undefined assertion would still fail). Splitting into commit 2a (`start.ts`) + commit 2b (test) was considered — rejected because commit 2a alone would leave the test surface in a transient broken state (test still hardcoded at 49 + 50 against a now-46-target-quota engine), violating the per-commit-passes-verification discipline carried forward from prior rounds.

3. **Commit 3 — `docs: close phase5-data-wipe plan; SPEC §6.14.21`.** Per §6. Plan status flip to "shipped" with the commit hashes for commits 1 + 2 filled in. SPEC §6.14.21 added per §6's framing. No edits to any prior closed plan (closed-plans-immutable convention from SPEC §6.14.20 holds).

## 8. Verification protocol carry-forward

Established discipline from prior sub-phases carries forward unchanged:

- `bun lint` clean (Biome + GritQL + super-lint).
- `bun typecheck` clean.
- `bun test` 37/37 (the round's stated goal — anything less is a regression).
- DB row counts before/after the wipe via the wipe script's own logging (`logger.info { table, countBefore, countAfter }`) plus an out-of-band `psql` spot-check if the operator wants paranoia coverage.
- Real-DB harness for any test verification (per SPEC §6.14.12 — DB-state inspection; the test's assertion path already follows this shape).
- SPEC §6.14 conventions inherited: .15 (hermetic-smoke-with-per-run-isolation — N/A here, no smoke; included for completeness), .19 (type-error-as-audit-cascade — surfaces obliquely in §6's candidate .21 framing), .20 (closed-plans-immutable — applies, no edits to phase5-taxonomy-restructure or earlier closed plans).
- No regression in the four pure-function test files (`compute.test.ts`, `diagnostic-mix.test.ts`, `drizzle-adapter-shim.test.ts`, the unaffected two tests in `selection.test.ts`) — verified by running the full suite, not just the edited file.

## 9. Out of scope

These are deliberately not addressed in this round:

- **Testbank re-extraction.** Next round. Reruns OCR + ingest + explanation generation against `data/testbank/12min_prep_practice_{1..6}` and the per-sub-type folders. Repopulates the items table to the empirical-anchor shape that the diagnostic-mix re-balance to 50 entries depends on.
- **Diagnostic-mix re-balance to 50 entries.** Deferred per Q1(b) of the taxonomy round; lives in the testbank-re-extraction round, where empirical per-sub-type ratios from the OCR'd six prep practice tests + per-sub-type folders provide the anchor. Per Q1's redline resolution this round, `targetQuestionCountFor` derives from `diagnosticMix.length` going forward — when the future round grows the mix back to 50, `targetQuestionCount` follows automatically.
- **Strategy authoring for the three new sub-types.** Independent round (`workrate`, `speed_distance_time`, `lowest_values`); can run in parallel with testbank re-extraction. Not blocked by this round.
- **`targetQuestionCountFor` extension to `full_length` / `simulation` branches.** The §5 `start.ts` edit is scoped strictly to the `type === "diagnostic"` branch. `full_length` and `simulation` continue returning the hardcoded `50`; their derivation source (a full-length-equivalent of `diagnosticMix`) does not exist yet and is Phase 5 sub-phase territory, not data-wipe territory.
- **Production deploy.** Gated on Leo's no-deploy-until-feature-complete decision. Dev-only this round, same as taxonomy round.
- **PRD edits.** The PRD does not describe data-state at the row level; no edits expected.
- **Architecture-plan edits.** No surface-level architectural changes; no edits expected.
- **Any taxonomy edits.** Closed in the prior round; no edits permitted per closed-plans-immutable + the round's data-only scope.
- **`docs/CCAT-categories.md` edits.** Same; closed in the prior round.
- **Any code surface edits beyond `start.ts:targetQuestionCountFor` + `selection.test.ts:noReServeInSession` (commit 2), the new wipe script (commit 1), and any seed-pipeline edit needed to land items at `status='live'` per Q5 (commit 1).** No additional selection-engine fixes, no smoke-side edits, no SPEC §6.14 edits beyond the round-close §6.14.21 entry.

## 10. Resolutions log

Five questions surfaced during plan-writing; one additional resolution (Path (A) amendment) surfaced at commit-1 pre-execution audit. **All six resolved + shipped 2026-05-06.** No remaining open questions at round-close.

### 10.1 Q1 — Test-restoration approach

**Resolved + shipped 2026-05-06 at commit 2 (`647a609`): option (ii) with architectural-posture amendment.** Re-seed addresses Reason 1 (commit 1 / `8d3cf1d`); the round adopts Reading B (`diagnosticMix.length` is canonical, `targetQuestionCountFor` derives from it) and addresses Reason 2 via a one-line derivation fix in `start.ts:82` plus the parameterized test (commit 2 / `647a609`). Round closes at 37/37. The taxonomy round's Q1(b) deferral of the diagnostic-mix re-balance is honored — re-balance still lives in the testbank-re-extraction round; this round's derivation fix codifies the dynamic relationship as the right architectural posture going forward, so when the future round restores `mix.length` to 50, `targetQuestionCount` follows automatically without a coordinated edit. (i) was rejected as it does not reach 37/37 (Reason 2 unresolved). (iii) was rejected as it defers 37/37 to the next round and creates an awkward intermediate state where the test stays red after the data-state round closes.

### 10.2 Q2 — Pre-wipe snapshot posture

**Resolved + shipped 2026-05-06 at commit 1 (`8d3cf1d`): default-on with `--no-snapshot` opt-out.** Cheap insurance at v1 dev-DB scale; future operator running the script under different conditions (e.g., in-flight investigation rows, hand-crafted manual test data) benefits from default-on; opt-out flag preserves discretion for CI-style runs. Snapshot writes to `scripts/_logs/wipe-snapshot-${timestamp}.sql` (gitignored). Empirical execution-time snapshot landed at `scripts/_logs/wipe-snapshot-2026-05-06T05-34-34-354.sql`.

### 10.3 Q3 — Wipe script naming + wiring

**Resolved + shipped 2026-05-06 at commit 1 (`8d3cf1d`): `scripts/dev/wipe-practice-data.ts` + `db:wipe:practice-data`.** Path matches `scripts/dev/*` convention used by smoke harnesses + SPEC §6.14.8's environment-dependent operational-script convention. Name `wipe-practice-data` is unambiguous about scope (the items + practice + mastery + catalog surfaces post Path (A) amendment). `package.json` script wiring matches the `db:` namespace used by `db:seed`, `db:seed:items`, `db:drop:schema`. Alternative `scripts/dev/db-wipe.ts` + `db:wipe` rejected as too broad — "wipe" without qualifier reads as "wipe everything."

### 10.4 Q4 — Embedding backfill posture

**Resolved + shipped 2026-05-06 at commit 1 (`8d3cf1d`): yes, included in commit 1.** Keeps dev DB single-coherent-state at round-close — no in-flight "items exist but embeddings missing" partial state for verification scenarios to reason about. Empirical post-execution result: 50 items backfilled, 0 failed (100% embedding coverage at round close). The existing `scripts/backfill-missing-embeddings.ts` script handled the work; `OPENAI_API_KEY` was set in the operator's env at execution time.

### 10.5 Q5 — Seed status pre-pinning

**Resolved + shipped 2026-05-06 at commit 1 (`8d3cf1d`): pre-pin to `status='live'` confirmed satisfied by existing pipeline.** The v1 dev-DB seed represents real-items-bank items the application treats as production-ready; `selection.test.ts:liveCellItemCount` queries `WHERE status = 'live'` per its design. The `'candidate'` status is the LLM-generation pipeline's territory (Phase 4 deliverable per `docs/architecture_plan.md` build sequencing). Commit-1 pre-execution verification confirmed `src/server/items/ingest.ts:ingestRealItem` already inserts at `status: "live"` explicitly (overriding the items column default of `"candidate"`); no seed-script edit was needed. Empirical post-execution result: all 50 seed items at `status='live'`. **The conditional fourth-commit contingency closed without firing** — round closed at exactly three commits.

### 10.6 Path (A) amendment — sub_types + strategies added to TRUNCATE list

**Resolved + shipped 2026-05-06 at commit 1 (`8d3cf1d`).** Surfaced at the pre-execution audit step inside commit 1: the live dev DB carried 11 sub_types (under old taxonomy IDs: `verbal.synonyms`, `verbal.logic`, `numerical.letter_series`, `numerical.averages_ratios` all present alongside the new IDs) and 111 strategies (3.36× the expected 33), instead of the plan §2(b)-assumed post-taxonomy-restructure 14 + 33 state. Root cause: `seed-sub-types.ts` and `seed-strategies.ts` use `onConflictDoUpdate` (UPSERT) without companion delete-not-in-config logic, so accumulated seed runs across rounds left stale rows orphaned in place.

Three options at audit-time:
- **(A) Expand TRUNCATE.** Add sub_types + strategies to the wipe list. Re-seed pipeline runs in FK order: `bun db:seed` (sub_types then strategies) before `bun db:seed:items`. Single-statement TRUNCATE blast radius still bounded (every CASCADE-reachable child remains in the explicit list).
- **(B) Manual surgical DELETE.** Delete only the rows with old-taxonomy IDs from sub_types; delete duplicate strategies. More fragile (requires careful WHERE-clause auditing per sub_type_id; risks missing rows under future drift shapes); leaves the discrepancy-vs-config rebuild ambiguous.
- **(C) Pre-amend the plan.** Pause execution, formally amend §2(b) before commit 1 ships, restart. Highest documentation overhead; lowest information-velocity payoff (the fix itself is small).

Path (A) was selected per the redline tightening: amendment captured inline in commit 1's commit body (record-at-execution); formal plan-doc amendment lands in commit 3's round-close (this commit). Empirical pre-wipe state recorded in commit 1's body as primary-source evidence: items=55, attempts=2663, practice_sessions=282, mastery_state=141, candidate_promotion_log=0, sub_types=11, strategies=111. Post-wipe-and-reseed verified state: sub_types=14 (canonical NEW IDs only; 0 old-taxonomy orphans), strategies=33 (3 each × 11 currently-authored sub_types per `Partial<Record>` shape from taxonomy round Q4; 0 over-counts), items=50 (status=live across all 50; embeddings 50/50).

This resolution is the single empirical instance of SPEC §6.14.21 (added in commit 3, this commit); see SPEC for the generalizable pattern.

### 10.7 Side-findings (out-of-scope flags surfaced during execution)

Two findings surfaced during commit 1's verification phase that are deliberately not folded into this round's commits:

- **Docker-proxy stale port routing.** During commit 1's post-reseed verification, the operator observed that `docker exec 18seconds-postgres psql ...` connects to a DIFFERENT postgres instance than `psql -h localhost -p 54320 ...` (different `pg_postmaster_start_time`; different data; INSERT/SELECT writes across the two endpoints are mutually invisible). The host port 54320 (per `docker-compose.override.yml`) is routed by `docker-proxy` to container IP `172.29.0.2:5432`, which is in the `warranted_frontend` network — NOT the current `18seconds-postgres` container at `192.168.32.2` in `18seconds_default`. This is environment-state drift from a previous container-network configuration; the `DATABASE_LOCAL_URL=localhost:54320` endpoint that the bun scripts and the Next.js dev server target is consistent with itself, so the round's scripts and tests landed against the same DB and the verification is sound. Captured here as environment-hygiene-tracking; out of scope for this round and any future plan round (it's an operator-environment artifact, not a generalizable code/architecture pattern). Recommended cleanup: `docker compose down && docker compose up -d` to rebuild the network mapping cleanly.

- **Seed-script UPSERT-leaves-orphans pattern as future-work flag.** The Path (A) audit finding has a generalizable code-state implication: any future taxonomy or strategy config change that cuts/renames an entry will leave orphans in the dev DB through subsequent `bun db:seed` runs unless either (i) the seed scripts adopt delete-not-in-config logic before the upsert step, or (ii) the round in question explicitly TRUNCATEs sub_types and strategies before re-seeding (the Path-A discipline this round established). Future-work tracking: a follow-up round adding `DELETE FROM sub_types WHERE id NOT IN (config-side-id-set)` + the equivalent for strategies would close this footgun at the seed-script layer; until that ships, every round that touches the taxonomy or strategy config should plan an explicit wipe-before-seed step. Captured here as future-work-flag; not auto-bundled into any current round.

---

## Audit cross-references summary (post-redline + post-execution)

- §2(a) tables wiped: **7 tables** post Path (A) amendment (`items`, `attempts`, `practice_sessions`, `mastery_state`, `candidate_promotion_log`, `sub_types`, `strategies`).
- §2(b) tables preserved: **4 tables** post Path (A) amendment (`users`, `sessions`, `accounts`, `verification_tokens`).
- §2(b) confirmed dropped (no action): `strategy_views`, `review_queue` — both eliminated by v1-code-cleanup round per the prior audit; verified absent from `src/db/schemas/**`.
- §2(c) FK ordering: single `TRUNCATE … CASCADE` with explicit 7-table list per Path (A) — bounded blast radius, no walk-out beyond the explicit set.
- §2(d) test-restoration: shipped per Q1 — re-seed (commit 1) + derive `targetQuestionCountFor` from `diagnosticMix.length` + parameterize test (commit 2).
- §2(e) other tests at risk: none (3 of 4 test files pure-function; smoke side already taxonomy-aligned).
- §2(f) backup posture: default-on snapshot with `--no-snapshot` opt-out per Q2; empirical execution snapshot at `scripts/_logs/wipe-snapshot-2026-05-06T05-34-34-354.sql`.
- §4 seed status posture: pre-pin to `status='live'` per Q5; verified satisfied by existing pipeline (no seed-script edit needed).
- §6 SPEC §6.14.21: live-DB-state-audit pattern shipped in commit 3 — see SPEC for the generalizable framing; see §10.6 here for the in-round empirical instance.
- §7 commits: **3 commits, fixed.** No conditional fourth (Q5 pre-pinning closed the contingency at audit-time + verification-time).
- §10.6 Path (A) amendment: sub_types + strategies moved §2(b) → §2(a); empirical pre-wipe state was 11/111 (vs plan-time-assumed 14/33) due to UPSERT-leaves-orphans semantics across rounds.
- §10.7 side-findings (out-of-round): docker-proxy stale port routing (environment hygiene); seed-script UPSERT-leaves-orphans pattern (future-work flag).

## 11. Round-close summary

> **Round closed 2026-05-06.** Three commits as projected; conditional fourth removed at redline + confirmed unnecessary at execution.

The round shipped a clean operational follow-up to the taxonomy-restructuring round, with one substantive scope expansion at audit-time (Path (A) — sub_types + strategies added to TRUNCATE list) and one architectural posture decision at planning-time (Reading B — `diagnosticMix.length` is canonical; `targetQuestionCountFor` derives from it, not vice versa).

**Final commit shape:**

1. `8d3cf1d` — `feat(scripts): wipe-and-reseed dev DB; expand TRUNCATE scope to sub_types+strategies per audit finding`. Lands `scripts/dev/wipe-practice-data.ts`, the package.json wiring, and the gitignore entry. Captures the §2(b) amendment inline in the commit body as record-at-execution. Empirical post-execution state: sub_types=14 (canonical NEW IDs), strategies=33 (3×11 with 0 over-counts), items=50 (status=live, embeddings 50/50), preserved tables unchanged.

2. `647a609` — `fix+test(selection): derive targetQuestionCountFor from diagnosticMix.length; restore noReServeInSession final-submit assertion`. One-line derivation fix in `src/server/sessions/start.ts` (diagnostic branch only — full_length, simulation, drill untouched per scope discipline) + parameterized test in `src/server/items/selection.test.ts:noReServeInSession`. Restores 37/37; end-to-end spot-check confirms `practice_sessions.target_question_count=46` for new diagnostic sessions.

3. (this commit) — `docs(plan+spec): close phase5-data-wipe round; add §6.14.21; record §2(b) formal amendment + Path (A) audit-finding`. Plan status flip to "shipped 2026-05-06"; formal §2(a)/§2(b) amendment in the plan doc; §10 resolutions log flipped to shipped with hashes; §10.6 Path (A) resolution added; §10.7 side-findings captured as out-of-round flags; SPEC §6.14.21 added (live-DB-state-audit pattern). No edits to any prior closed plan (closed-plans-immutable convention from §6.14.20 holds; verified via `git diff` zero-line check at commit-3 author-time).

**Two-cause failure framing for `noReServeInSession`:**

The test's failure had two independent causes (per §2(d) audit finding):

- **Reason 1 — data-state.** Items in dev DB carried old-taxonomy IDs; the new-taxonomy diagnostic mix queried cells with zero items in the new IDs. Resolved by commit 1's wipe + reseed.
- **Reason 2 — code-state.** `targetQuestionCountFor` returned hardcoded 50 while `diagnosticMix.length` was 46; the engine threw `ErrDiagnosticMixOutOfRange` at attempt 47 (mix-exhausted boundary defensive guard) before reaching quota. Resolved by commit 2's derivation fix + test parameterization.

The framing was load-bearing for the round's commit clustering: addressing only Reason 1 (option (i) at Q1) would not have reached 37/37; addressing only Reason 2 (option (iii) at Q1) would have left the data-state issue unresolved. The round adopted option (ii) — both — and committed them as a sequenced pair (data-state first in commit 1, code-state in commit 2 once the data-state path was clean enough to verify the code-state fix).

**Architectural posture endorsed (Reading B):**

`src/config/diagnostic-mix.ts` is the single source of truth for "how many questions a diagnostic delivers"; `src/server/sessions/start.ts:targetQuestionCountFor`'s diagnostic branch derives from `diagnosticMix.length`. Forward effect: when the testbank-re-extraction round restores `diagnosticMix.length` to ~50 (via the deferred re-balance from taxonomy round Q1(b)), `targetQuestionCount` follows automatically without a coordinated re-edit. The `full_length` and `simulation` branches retain hardcoded 50 — those are Phase 5 sub-phase territory, not data-wipe territory; their derivation source (a `full_length`-equivalent of `diagnosticMix`) does not exist yet.

**Verification at round close:**

- `bun lint`: clean
- `bun typecheck`: clean
- `bun test`: 37/37 (round goal achieved)
- Closed-plans-immutable: verified zero-line `git diff` against all closed plans (`phase5-post-session-review`, `phase5-v1-code-cleanup`, `phase5-taxonomy-restructure`, `phase3-*`, `phase-3-*`, `focus-shell-post-overhaul-fixes`, `opaque-option-ids-and-pipeline-split`, `ocr-import-screenshots`).
- Pre-wipe snapshot retained at `scripts/_logs/wipe-snapshot-2026-05-06T05-34-34-354.sql` (gitignored).

**Next round unblocked: testbank re-extraction.** Reruns OCR + ingest + explanation generation against `data/testbank/` under the new taxonomy; repopulates the items table to the empirical-anchor shape that the diagnostic-mix re-balance to ~50 entries depends on. Strategy authoring for the three new sub-types (`workrate`, `speed_distance_time`, `lowest_values`) is independent and can run in parallel.
