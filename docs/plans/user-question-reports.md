# User Question Reports — Plan-Doc

Round: User Question Reports.
Round-open hash: `3f0571e` (HEAD at commit-0; empirically verified, see §0.3).
Target close hash: TBD.

> Lightweight scaffold per §0.4. Per-commit stop-and-report gates retained;
> §6.14-forensic fortressing relaxed.

---

## §0 Round metadata

### §0.1 Round opening

- **Name:** User Question Reports.
- **Open hash (empirical, verified at commit-0):** `3f0571e` — `feat(admin-review): enhance pressure-cell dashboard and row disposition functionality`.
- **Concurrent rounds:** **first time two named rounds open simultaneously in project history.** The Deployment Round (plan-doc `docs/plans/deployment-runbook.md`) opened at `6abb24f` (one commit before HEAD). New precedent: rounds may now overlap when their scopes don't intersect. The deployment round is operational-runbook scope (EXECUTE + VERIFY against `docs/DEPLOYMENT.md`); this round is feature-scope (BUILD against the user-reporting surface). Zero file overlap expected: deployment touches `packages/superstarter-iac`, `src/env.ts`, `src/db/index.ts`, `src/proxy.ts`, `vercel.json`, `src/app/api/health`, `src/app/api/cron/abandon-sweep`; this round touches `src/db/schemas/catalog/`, `src/server/items/`, `src/server/admin/`, `src/components/post-session/`, `src/components/admin-review/`, `src/app/(admin)/admin/review/`. Cross-coupling concern: none identified — both rounds may proceed in parallel without an interlock.
- **Target close hash:** TBD.

### §0.2 Forensic note — first instance of a candidate forward-watch pattern

A prior executor-autonomous session for this exact feature was reverted earlier today (2026-05-11). The session shipped multiple commits — schema + admin queue rewrite + post-session button — without round-opening a plan-doc and without redirector approval. The reverted-session log survives at `docs/claude_logs/session_2026-05-11_14-22_user-question-reports.md` for forensic reference; this round does not act on its content (no quoting, no copy-paste).

**Candidate pattern (instance #1):** "executor-autonomous-shipping-bypasses-redirector-pattern."

- **Distinct from §6.14.43 sub-type 6:** sub-type 6 records errors caught WITHIN the redirector pattern (redirector authoring against remembered conventions rather than verified ones). This new candidate records THE PATTERN ITSELF being bypassed — executor ships without round-opening.
- **Single observed instance** at round-open. Recorded as candidate, NOT promoted. Promotion threshold is established at 3+ instances. If a future executor session ships without a plan-doc round-open, the second instance lands here.

### §0.3 Handoff-baseline gap — candidate sub-pattern of §6.14.40

The redirector's prompt for this round declared HEAD at `d21b52d`; empirical HEAD at audit time was `3f0571e`. **37 commits between.**

```
3f0571e ← HEAD (round-open empirical)
6abb24f docs: open deployment runbook plan-doc with commit-0 empirical audit
65d37a1 feat(session-log): document session on anchor drill redesign...
…
f308126 docs(claude_logs): add session log for Phase 4 sub-phase b closure
d21b52d ← redirector-declared (handoff baseline)
```

Recorded as a **candidate sub-pattern of §6.14.40 (redirector-vs-empirical-state divergence)**, specifically at the **cross-conversation handoff boundary**. Distinguishing it from intra-conversation drift (where the redirector authors a follow-up prompt against the project state remembered from earlier in the same conversation): this is a fresh-conversation prompt opened against the project state remembered from the LAST conversation that closed at `d21b52d`. Sub-types of redirector-vs-empirical divergence may differ in their root cause and their mitigation surface; banking the instance as a sub-pattern candidate.

**Mitigation precedent landed in `6abb24f`'s plan-doc §0.1:** deployment-runbook recorded an analogous gap (`d21b52d` named, `65d37a1` empirical) and verified that the deployment surface was unchanged across the interval. This round's mitigation is structurally identical — verify that no in-scope file changed across `d21b52d..3f0571e`. Spot-check: `git log --oneline d21b52d..3f0571e -- src/db/schemas/catalog/items.ts src/server/admin/queue-data.ts src/components/post-session/wrong-items-browser.tsx src/components/admin-review/queue-status-tabs.tsx src/app/\(admin\)/admin/review/page.tsx` returns commits affecting `wrong-items-browser.tsx` (post-session tab/chart work) and `queue-data.ts` + `queue-status-tabs.tsx` + `queue-row-disposition.tsx` (`3f0571e` itself: pressure-cell dashboard + row disposition). **Surface IS shifted from the handoff baseline** — most notably, the admin queue already has reversible row-level disposition (live → rejected, rejected → live) added in `3f0571e`. The plan-doc proceeds against the EMPIRICAL surface at `3f0571e`, not the remembered surface at `d21b52d`.

### §0.4 Discipline shift — lightweight plan-doc bar

The builder has confirmed that **37 post-handoff commits without per-round plan-docs is intentional.** Discipline relaxed: per-round plan-docs are reserved for non-trivial feature rounds with multi-commit scope, not for every UI tweak or drill polish commit.

This plan-doc honors that shift:

- Shorter section structure; fewer §6.14 forensic reminders inline.
- Per-commit stop-and-report gates retained (the builder still wants visibility at each commit boundary).
- Decisions D1-D4 documented as **redirector-resolved**, not re-deliberated.

### §0.5 Scope

User-submitted item-quality reports. Three surfaces:

1. **Submit surface** — post-session item review (WrongItemsBrowser): "Report this question" button per item.
2. **Storage** — `item_user_reports` table (UUIDv7 + reason enum + free-text note + status).
3. **Admin triage** — new Reports tab on `/admin/review`; navigate-to-item-detail disposition flow.

### §0.6 Anti-scope (explicit)

- **NO** rate limiting beyond the `unique(user_id, item_id)` constraint that dedupes a user's reports of the same item. A user cannot report the same item twice concurrently; they CAN re-report after their previous report was dismissed/resolved (see §0.9).
- **NO** notification system. Admin is passive: opens `/admin/review?status=reports` and triages.
- **NO** anonymous reporting. Auth required at the server-action level via `getUserId()` (already in use elsewhere).
- **NO** reversal of resolved/dismissed status. A re-report after dismissal reopens via `ON CONFLICT (user_id, item_id) DO UPDATE` (see §0.9).
- **NO** validator engine modifications. Per D2 the validator stays untouched. `validatorResult.hasAnyFlag` is independent of `item_user_reports` row presence.
- **NO** retirement-undo work. Residual #4 from the handoff document (retirement / undo affordances) is independently addressed by `3f0571e`'s reversible row-disposition (live↔rejected via `queue-row-disposition.tsx` + the generalized `approveInputSchema` / `rejectInputSchema` that now permit `live → rejected` and `rejected → live` per `disposition-input-schema.ts:7-27`). Retirement (live → retired) and the corresponding audit `action_type` enum value remain forward-pinned and out of this round's scope.
- **NO** SPEC §15 anchor at round-open. The user-reports surface is small enough that a SPEC §15 may be unwarranted; consider at round-close.

### §0.7 Resolved deliberations (D1-D4) — redirector-decided

These four are governed; do not re-deliberate during commit authoring.

#### D1. Reporting eligibility = ALL items the user has encountered

The Report button is NOT confined to wrong items. Correct, incorrect, and skipped items are all reportable.

**Implication for §2:** the button plugs into the post-session item-review surface that already renders all attempted items (filterable by status). Empirically that surface is `WrongItemsBrowser` at `src/components/post-session/wrong-items-browser.tsx`. The component's name is historical — `statusFor()` at line 86 dispatches across all three statuses, and filters default to "all". The Report button renders on every card regardless of status.

#### D2. Validator integration = NONE

The validator engine stays untouched. NO 7th criterion is added. NO modifications to `src/server/validator/criteria/` or `src/server/validator/engine.ts` or any thresholds.

**User reports are an orthogonal signal.** They surface in the admin queue via:

1. A new "Reports" status tab on `/admin/review` (D3), enumerating open user reports.
2. A "User-flagged" badge on Candidates / Live / Rejected rows where the item has at least one open report. This badge composes WITH the existing `validatorResult.hasAnyFlag` badge (validator-flagged), not in place of it. Two independent signals; admin sees both.

`validatorResult.hasAnyFlag` is NOT modified by user reports. `metadata_json.validatorResult` is NOT modified by user reports. The two systems do not write to each other's state.

#### D3. Admin queue location = INTEGRATED into existing `/admin/review`

NO new `/admin/reports` route. The existing `<QueueStatusTabs>` at `src/components/admin-review/queue-status-tabs.tsx` is extended:

```
BEFORE: Candidates / Live / Rejected
AFTER:  Candidates / Live / Rejected / Reports
```

Search-param key: `?status=reports`. The page's `coerceStatusFilter()` (page.tsx:69-73) accepts `"reports"` as a fourth valid value. The pressure-cell dashboard remains candidates-tab-only.

The Reports tab is structurally different from the three item-cohort tabs: it enumerates ROWS in `item_user_reports`, not rows in `items`. A new loader (`loadAdminReportsData`) lives alongside `loadAdminQueueData` rather than overloading it.

#### D4. Admin disposition consequence = NAVIGATE-TO-ITEM-DETAIL

Resolving a report from the Reports tab does NOT directly mutate the item. The admin clicks "Open item" on a report row → navigates to `/admin/review/[itemId]` → takes whatever action they want on the item via the existing affordances (edit / approve / reject / dismiss the report only).

**Report row records (resolved at §1.1 commit-0 audit — Option A, same-row):**

The report row carries disposition state inline on the row, not in a sibling `item_user_report_dispositions` table. Per v1 simplicity (§0.4 discipline shift) and per §0.9 re-report semantics (a re-report by the same user against the same item overwrites the row in place via ON CONFLICT DO UPDATE — losing the previous disposition is the explicit trade-off). Option A columns:

1. **`disposition_admin_user_id`** — the admin who finalized the disposition (resolved or dismissed). NOT a separate "opened by" tracking — opening the item-detail page is a navigation event, not a state change; many admins might view a report without disposing it. Only the disposer's identity is recorded. FK `users.id` ON DELETE RESTRICT (mirrors `item_admin_actions.admin_user_id` — preserve admin attribution).
2. **`disposition_at_ms`** — UTC ms timestamp of disposition. The report row's UUIDv7 PK encodes the original submission time per the no-timestamp-columns rule; `disposition_at_ms` is the SEPARATE end-of-lifecycle timestamp (analogous to `items.rejected_at_ms`).
3. **`disposition_item_action_id`** — link to the `item_admin_actions.id` of the edit/approve/reject the admin took on the item AFTER opening the report. Nullable: the admin may dismiss without taking an item action.
4. **`disposition_kind`** — enum `resolved_via_item_action | dismissed_without_item_action`. Distinguishes the two D4 outcomes:
   - `resolved_via_item_action`: admin edited/approved/rejected the item; `disposition_item_action_id` points at the new audit row.
   - `dismissed_without_item_action`: admin reviewed and decided the item was fine; `disposition_item_action_id` stays NULL.

**Why Option A (same-row) over Option B (sibling table):**

- v1 simplicity per §0.4. The disposition is a single closing event per report; not a high-volume history needing its own table.
- §0.9 re-report semantics already trade away per-row history retention (overwrite via ON CONFLICT DO UPDATE). A sibling history ledger only makes sense if we want to preserve the previous disposition — which v1 explicitly does not.
- The audit trail of any ITEM action taken in response to a report already lives in `item_admin_actions`. The report row's `disposition_item_action_id` is the join key into that ledger; the full forensic trail is reachable via that join.
- Report history retention is forward-pinned at §4.2 — if production usage shows re-report-after-dismissal patterns, a follow-up round introduces the sibling ledger.

### §0.8 Reason taxonomy strawman

```
formatting       — rendering / layout / typography
wrong_answer     — the marked-correct option is not actually correct
mislabeled       — sub-type, difficulty, or status label is wrong
other            — free-text required
```

**Open at this commit:** the `mislabeled` reason needs a sub-axis. A user reporting a mislabel is reporting one of:

- sub-type mislabeled (e.g., a `verbal.analogies` item flagged as `verbal.antonyms`).
- difficulty mislabeled (e.g., a `brutal` item flagged as `easy`).
- status mislabeled (rare — would mean a candidate that escaped to live without approval; admin-visible only).

**Resolution path:** authored at §1.1 (schema) commit-0. The straw-form is a flat enum (`formatting | wrong_answer | mislabeled | other`) with the sub-axis captured in a `reason_note` free-text field. If post-launch usage shows `mislabeled` dominates and admins need to triage by sub-axis without reading free-text, the enum is extended (e.g., `mislabeled_sub_type | mislabeled_difficulty | mislabeled_status`) in a follow-up round. v1 keeps the enum flat.

### §0.9 Re-report semantics — ON CONFLICT DO UPDATE

The schema uses `UNIQUE (user_id, item_id)`. The server action's INSERT uses `ON CONFLICT (user_id, item_id) DO UPDATE SET`:

- `reason = EXCLUDED.reason`
- `reason_note = EXCLUDED.reason_note`
- `status = 'open'` (re-opens if previously resolved/dismissed)
- `reported_at_ms = EXCLUDED.reported_at_ms`
- `disposition` columns cleared (admin who previously closed it is overwritten; previous disposition is lost from this row).

**Trade-off documented:** the previous disposition is overwritten, not preserved. The audit trail of the previous admin decision lives only in `item_admin_actions` (if the admin took an item action) — there is NO `item_user_report_history` ledger at v1. If a user re-reports a dismissed item, the admin sees only the new report; the history of the previous dismissal is reachable only by querying the item's admin-actions history.

**Rationale:** v1 simplicity. A re-report after dismissal is rare (small user base, single-admin allowlist). If the pattern surfaces in production, a follow-up round introduces history retention.

### §0.10 Forward-pin index

(Empty at commit-0. Populated at round-close.)

---

## §1 Schema + user submit

### §1.1 Migration commit

**Subject:** `feat(item-user-reports): schema migration — item_user_reports table + reason / status enums`

**Scope:**

- New table `item_user_reports` in `src/db/schemas/catalog/item-user-reports.ts`. Style precedent: `src/db/schemas/catalog/item-admin-actions.ts` (already audited; the user-reports schema mirrors its idiom — UUIDv7 PK via `sql\`uuidv7()\``, `bigint mode:"number"` for ms timestamps, FK cascade rules documented inline).
- New enums:
  - `item_user_report_reason` — `formatting | wrong_answer | mislabeled | other`.
  - `item_user_report_status` — `open | resolved | dismissed`.
- Columns (provisional; final at commit-0 audit of this section):
  - `id uuid PK uuidv7()` (creation time recoverable via `timestampFromUuidv7` per `rules/no-timestamp-columns.md`).
  - `user_id uuid NOT NULL REFERENCES users.id ON DELETE CASCADE` (user-scoped report history is meaningless if the user is gone).
  - `item_id uuid NOT NULL REFERENCES items.id ON DELETE CASCADE` (analogous: report-against-deleted-item is meaningless; soft-delete via `status='rejected'` means the item still exists).
  - `reason item_user_report_reason NOT NULL`.
  - `reason_note text` (nullable; required at the app layer when `reason='other'`).
  - `status item_user_report_status NOT NULL DEFAULT 'open'`.
  - `disposition_admin_user_id uuid REFERENCES users.id ON DELETE RESTRICT` (nullable until disposed).
  - `disposition_at_ms bigint` (nullable; set when status transitions out of `open`).
  - `disposition_item_action_id uuid REFERENCES item_admin_actions.id ON DELETE SET NULL` (nullable; populated if the admin took an item action after opening the report — D4 outcome 1).
  - `disposition_kind item_user_report_disposition_kind` (nullable enum: `resolved_via_item_action | dismissed_without_item_action`; populated alongside `disposition_at_ms`).
- Constraints:
  - `UNIQUE (user_id, item_id)` — D9 dedup.
- Indexes (final, post-f4d7985 review):
  - `UNIQUE (user_id, item_id)` — dedup per §0.9; also serves the §2.3 reflectance lookup (`WHERE user_id = ? AND item_id IN (...)` — prefix-scans the unique composite).
  - `(item_id, status)` — composability with the §3.4 "User-flagged" badge LEFT JOIN aggregation.
  - **Dropped at audit:** `(status, id DESC)` (defer until query pattern observed; sequential scan beats the index at v1 scale). **Dropped post-f4d7985 per redirector C1:** `(user_id, status)` (redundant with the unique composite prefix for the §2.3 lookup; no other planned query needs it).

**`reported_at_ms` rule audit (Branch B — rule NOT violated):**

`rules/no-timestamp-columns.md` literally bans Drizzle's `timestamp` / `date` / `time` / `interval` column factories; `scripts/dev/lint/rules/no-timestamp-columns.ts` enforces this by checking calls to those factories imported from `drizzle-orm/pg-core`. `bigint("reported_at_ms", { mode: "number" })` is NOT a banned factory.

The rule's "But I really need a different timestamp" section is prescriptive about event-time modeling (one row per event), but project precedent diverges from the strict prescription. State-change event timestamps stored inline as `bigint` are well-established across the schema:

- `items.rejected_at_ms` (Phase 4 sub-phase b §1.0).
- `item_admin_actions.created_at_ms` (same round; actively used as a range filter at `queue-data.ts:338`).
- `practice_sessions.{started_at_ms, ended_at_ms, last_heartbeat_ms}`.
- `mastery_state.updated_at_ms`, `user_sub_type_belts.updated_at_ms`.

The `reported_at_ms` column matches this established precedent. The redundancy concern that motivates the rule (PK already encodes creation time) applies only on FIRST submission; under §0.9's ON CONFLICT DO UPDATE re-report semantics, the PK retains the original-submission time while `reported_at_ms` advances to the re-submission time — capturing information not recoverable from the PK. The storage cost is 8 bytes per row; no companion `(reported_at_ms)` index is added so the "pays for it twice" concern is half-mitigated.

If the redirector prefers the stricter Branch A interpretation (drop `reported_at_ms`; accept that re-submission time is lost and only the original-submission time via `timestampFromUuidv7(id)` is available), the column drops cleanly — no downstream code depends on it yet.

**`db:generate` drift handling:**

The redirector flagged that `bun db:generate` from a clean tree currently bundles unrelated drift: ALTER TYPE adding `'mistakes'` to `session_type`. Verified at commit-0 audit (a probe run produced `drizzle/0008_sloppy_medusa.sql` containing only `ALTER TYPE "public"."session_type" ADD VALUE 'mistakes';` — the `mistakes` enum value is in code at `practice-sessions.ts:11` but not yet migrated to the prod DB). The probe artifact was reverted before this plan-doc landed (verified by `git status`).

**Resolution path (decided at this plan-doc; not deferred):**

- Drizzle-generated migrations are **immutable artifacts**. No hand-editing of generated SQL.
- The §1.1 migration commit runs `bun run db:generate` and accepts WHATEVER it bundles. Two outcomes possible:
  - **Outcome A:** generator bundles `mistakes` ALTER TYPE + new user-reports table + new enums into a single migration file. The commit lands all changes together; the commit message names both.
  - **Outcome B:** generator separates them into two files (drizzle-kit historically emits one file per concern). The commit lands both files together.
- In either case, `bun db:migrate` applies the migration(s) atomically. No hand-editing.
- The `mistakes` enum is in-scope for THIS commit (it lands as part of the schema migration this round produces) because v1 of the user-reports feature ships against a database that already has the `mistakes` enum value. Cross-round absorption per §6.14.40 — recorded explicitly so a future audit doesn't flag it as scope-creep.

**Per-commit stop-and-report:** schema files added; migration SQL file name(s); `_journal.json` line delta; outcome A vs B observation; `bun test` count; `bun typecheck` clean; `bun lint` clean.

### §1.2 Server-action commit

**Subject:** `feat(item-user-reports): server action + input schema for user-submitted item reports`

**Scope:**

- `src/server/items/report-input-schema.ts` (Zod schema + sentinel errors + types). Style precedent: `src/server/admin/disposition-input-schema.ts` (already audited).
- `src/server/items/report-actions.ts` (`"use server"` exporting `submitItemReportAction`). Style precedent: `src/server/admin/disposition-actions.ts`.
- Auth gate: `getUserId()` (existing helper used elsewhere in `src/server/items/`).
- Input shape:
  - `itemId: string` (UUID).
  - `reason: "formatting" | "wrong_answer" | "mislabeled" | "other"`.
  - `reasonNote?: string` (required when `reason === "other"`; max ~1000 chars).
- Action behavior:
  - Pre-flight: verify item exists (404 → throw sentinel).
  - INSERT ... ON CONFLICT (user_id, item_id) DO UPDATE per §0.9.
  - `revalidatePath` of post-session route (so the already-reported reflectance state reflects without a refresh).
  - `logger.info` records the submission.

**Per-commit stop-and-report:** files added; test count; typecheck/lint clean; manual smoke (submit from dev server, confirm row landed, confirm re-report re-opens a dismissed row).

---

## §2 User-facing surface

### §2.1 Identify ALL user-facing surfaces

Audit outcome at commit-0:

**Live practice surfaces (intentionally OUT-OF-SCOPE):** FocusShell / ItemPrompt during an active test. The user is answering, not reviewing. Reporting from the live surface conflates "I think this question is broken" with "I'm stuck on this question" and corrupts answer-time telemetry. Live surfaces (`diagnostic/run`, `full-length/run`, `drill/[subTypeId]/run`, `mistakes`) all render `ItemPrompt` and dispatch to body-renderers; NONE of them get a Report button.

**Post-session item-review surface — ONE surface:** `WrongItemsBrowser` at `src/components/post-session/wrong-items-browser.tsx` (886 lines at audit time, unchanged from handoff). All four user-facing flows that produce an attempted-item record (diagnostic, full-length, drill, mistakes) terminate at `/post-session/[sessionId]` (verified empirically: `src/app/(app)/mistakes/content.tsx:47` does `router.push(\`/post-session/${init.sessionId}\`)`). The post-session page renders `WrongItemsBrowser`, which dispatches on `statusFor(item)` to display correct / incorrect / skipped items with filters defaulting to "all". Per D1, the Report button plugs in HERE and ONLY here.

**Past-sessions index (`/review`):** confirmed NOT an item-rendering surface. `<ReviewRow>` shows session metadata (type / score / time) without rendering item bodies. NO Report button.

**Stats charts (`/stats`):** confirmed aggregate-only. NO Report button.

**Item-rendering component count for §2.1 scope: 1.** The §2 commit count is sized accordingly.

### §2.2 Report button component

**Subject:** `feat(post-session): report-question button — submit + already-reported reflectance`

**Scope:**

- New component `src/components/post-session/report-question-button.tsx`. Renders one button per item card in the `WrongItemsBrowser`.
- Two visual states:
  - **Default** (item NOT yet reported): subdued affordance — `text-text-3`, `border-border-soft`, label "Report".
  - **Already reported** (this user reported THIS item, status `open`/`resolved`/`dismissed`): reflectance state. Token palette confirmed at SPEC §13.4.2 — `text-cobalt`, `border-cobalt/40`, `bg-cobalt/5`, `bg-cobalt/10` for the affirmative-reported state; `text-destructive`, `border-destructive/40`, etc. for the dismissed/resolved state if visual distinction is desired. **NO amber tokens** — confirmed absent from the Layer-A + Layer-B inventory (no `amber-300`, no `amber-50`, no `amber-700`).
- Submit flow: button click → modal with reason select + free-text note → server action call → optimistic-update reflectance state.
- The button is added to the existing card layout in `WrongItemsBrowser` (likely in the card-footer region; exact placement at §2.2 commit-0 audit).

**Per-commit stop-and-report:** files added; `wrong-items-browser.tsx` line delta; test count; typecheck/lint clean; manual smoke (default → submit → modal → reflectance → re-click does NOT re-submit because reflectance state shows already-reported).

### §2.3 Reported-items lookup query

**Subject:** `feat(post-session): thread reported-items map through page → content → shell → wrong-items-browser`

**Scope:**

- New loader (likely in `src/server/items/` alongside the report-actions): `loadUserReportedItemIds(userId, itemIds)` returns `ReadonlyMap<itemId, { status, reportedAtMs }>`. Single SQL SELECT; index `(user_id, status)` from §1.1 supports it.
- Threading:
  - `src/app/(diagnostic-flow)/post-session/[sessionId]/page.tsx` initiates the promise (item ids are known at this layer — they're the same items already fetched for the wrong-items list).
  - Promise drilled through `content.tsx` → `post-session-shell.tsx` → `wrong-items-browser.tsx`.
  - Per `rules/rsc-data-fetching-patterns.md`: page initiates, does NOT await; content consumes via `React.use()` (already a `"use client"` component).
- The `WrongItemsBrowser` reads the map per-item to compute the button's initial state.

**Per-commit stop-and-report:** files modified; line delta on each; test count; typecheck/lint clean; manual smoke (submit a report → navigate away → return to post-session → reflectance state persists).

---

## §3 Admin queue Reports tab

### §3.1 Status-tab extension

**Subject:** `feat(admin-review): add Reports tab to queue status tabs`

**Scope:**

- `src/components/admin-review/queue-status-tabs.tsx` — extend `STATUS_TABS` with `{ value: "reports", label: "Reports" }`.
- `src/server/admin/queue-data.ts` — extend `QueueStatusFilter` to include `"reports"` AND extend `StatusCounts` interface with a `reports` field. The existing `aggregateStatusCounts()` walks `items.status` GROUP BY rows; the reports count comes from a SEPARATE COUNT query against `item_user_reports` (where `status='open'`).
- `src/app/(admin)/admin/review/page.tsx` — `coerceStatusFilter()` accepts `"reports"`. The pressure-cell loader stays candidates-only; the queue loader is bypassed (returns `undefined`) when `statusFilter === "reports"`; a new reports-data loader (§3.2) runs in its place.

**Per-commit stop-and-report:** files modified; tab visually renders with badge count; clicking the tab navigates to `?status=reports` (renders empty state until §3.2 lands); test count; typecheck/lint clean.

### §3.2 Reports-data loader + row component

**Subject:** `feat(admin-review): Reports tab data loader + row component`

**Scope:**

- `src/server/admin/reports-data.ts` — `loadAdminReportsData()` SELECTs from `item_user_reports` JOIN `users` (for reporter email) JOIN `items` (for item summary: body preview, sub-type, difficulty). WHERE `status='open'`. ORDER BY `id DESC`. Aggregates per-item open-report-count for items with >1 report.
- New row component `src/components/admin-review/report-row.tsx`. Style precedent: existing `queue-row.tsx`. Renders:
  - Reporter email + reported-at relative time (decoded from UUIDv7 prefix per `rules/no-timestamp-columns.md`).
  - Reason badge + truncated reason-note.
  - Item summary (body preview + sub-type + difficulty).
  - Open-report-count badge if item has >1 open report ("3 reports").
  - "Open item" link → navigates to `/admin/review/[itemId]?fromReport=<reportId>` (the query param signals to the item-detail page that the visit originated from a report; used for the disposition handoff in §3.3).
- `src/app/(admin)/admin/review/content.tsx` — branches on `statusFilter === "reports"` to render the reports list instead of the queue list.

**Per-commit stop-and-report:** files added/modified; reports list renders with seed data; test count; typecheck/lint clean.

### §3.3 Disposition handoff (navigate-to-item-detail)

**Subject:** `feat(admin-review): wire report disposition through item-detail navigation`

**Scope:**

- The item-detail page (`src/app/(admin)/admin/review/[itemId]/page.tsx`) reads `?fromReport=<reportId>` and exposes it to the content via promise drilling.
- When the admin takes an item action (edit / approve / reject) from a `fromReport` context, the corresponding server action (`submitEditAction`, `approveItemAction`, `rejectItemAction` in `src/server/admin/disposition-actions.ts` / `edit-actions.ts`) ALSO writes the report disposition row update: `disposition_kind='resolved_via_item_action'`, `disposition_item_action_id=<the new item_admin_actions.id>`, `disposition_admin_user_id=<admin>`, `disposition_at_ms=now()`, `status='resolved'`.
- A separate "Dismiss without action" button (in the item-detail page when `fromReport` is set) calls a new server action `dismissReportAction` that sets `disposition_kind='dismissed_without_item_action'`, `status='dismissed'`, leaving the item untouched.
- New input-schema + actions module:
  - `src/server/admin/report-disposition-input-schema.ts`.
  - `src/server/admin/report-disposition-actions.ts`.

**Open at commit-0 of §3.3:** whether the disposition write is bundled INTO the existing item-action transaction (atomic guarantee: report row + item row + audit row all commit together) or done as a follow-up server-action call from the client after the item action succeeds. Bundling is preferred per the existing transactional-atomicity convention in `src/server/admin/disposition-actions.ts`; the alternative (two server-action calls) loses atomicity. Decided at §3.3 commit-0 audit.

**Per-commit stop-and-report:** files added/modified; manual smoke (open report → click "Open item" → reject the item → confirm report row is `status='resolved'` with `disposition_item_action_id` pointing at the new reject audit row); test count; typecheck/lint clean.

### §3.4 User-flagged badge composition

**Subject:** `feat(admin-review): User-flagged badge on Candidates/Live/Rejected rows`

**Scope:**

- `src/server/admin/queue-data.ts` — extend `AdminQueueItem` with `openReportCount: number`. The queue SELECT joins to a sub-query that counts open `item_user_reports` per `item_id` (LEFT JOIN with COALESCE to 0).
- `src/components/admin-review/queue-row.tsx` — when `openReportCount > 0`, render a "User-flagged" badge alongside the existing validator-flagged + pressure-cell badges. The badge is independent of validator state — an item can be validator-passed AND user-flagged simultaneously (the two signals are orthogonal per D2).
- Token palette: cobalt for the badge (consistent with the post-session reflectance state).

**Per-commit stop-and-report:** files modified; visual confirmation that the badge composes WITH the existing validator-flagged badge (both can appear on the same row); test count; typecheck/lint clean.

---

## §4 Round close

### §4.1 SPEC anchor decision

At round-close, decide whether to author a SPEC §15 anchor (production reference for the user-reports feature, analogous to §14 for the validator + admin review surface).

**Decision criteria:**

- **Author §15 if:** the surface grows beyond the v1 scope (rate limiting, notifications, anonymous reporting, history retention, etc.). Net code surface justifies a production reference.
- **Defer §15 if:** the v1 scope as shipped is small enough to be discoverable from a single grep of `item_user_reports`. The forensic narrative lives in this plan-doc; that's sufficient.

Default expectation at commit-0 of round-close: **defer §15**. Re-evaluate at round-close empirically.

### §4.2 Residual list

Populated at round-close into §0.10. Anticipated entries:

- `mislabeled` reason sub-axis (deferred from §0.8 — if usage shows the flat enum is insufficient, extend in a follow-up round).
- Report history retention (deferred from §0.9 — if re-report after dismissal is a recurring pattern in prod, introduce `item_user_report_history` ledger).
- Reporting from live practice surfaces (intentionally deferred from §2.1 — if user demand surfaces, design needs to address the answer-time-telemetry concern).
- Rate limiting beyond unique-dedup (deferred from §0.6 — if a single user spams reports across the bank, introduce a per-user-per-hour ceiling).

### §4.3 Test count delta

Track per-commit test count delta. Baseline at commit-0: **370 pass / 0 fail / 1252 expect / 33 files**. Final at round-close: TBD.

---

## §A Audit-step ledger (commit-0)

| Step | Concern | Outcome |
|------|---------|---------|
| 1 | SPEC §6.14 canon + §14 line region | PASS — §14 starts at SPEC.md:2885; production reference for existing admin queue; §13.4.2 confirms NO amber tokens in palette. |
| 2 | Phase 4 plan-doc §0.11 + §0.7.2 + §0.8.1/§0.8.2 + residual #4 status | PASS — §0.11 phase closed; residual #4 (retirement/undo) addressed by `3f0571e`'s reversible row-disposition; rejected→live + live→rejected paths shipped via `queue-row-disposition.tsx` + generalized `disposition-input-schema.ts:7-27`. |
| 3 | Deployment-runbook plan-doc read | PASS — `docs/plans/deployment-runbook.md` (595 lines) read in full. Round opened at `6abb24f` against `d21b52d`/`65d37a1`. Zero scope overlap with this round; no cross-coupling interlock needed. New precedent noted at §0.1. |
| 4 | `item_admin_actions` schema style precedent | PASS — `src/db/schemas/catalog/item-admin-actions.ts` (57 lines) audited. UUIDv7 PK + bigint ms + FK cascade rules inline. §1.1's schema mirrors. |
| 5 | `items` schema status enum + embedding column | PASS — `item_status` 4-value enum (`live | candidate | retired | rejected`); embedding `vector(1536)` nullable; sub-type / difficulty / source enums confirmed. |
| 6 | `queue-data.ts` loader shape | PASS — `loadAdminQueueData(statusFilter)` shape known; `QueueStatusFilter` extends naturally to add `"reports"`. `aggregateStatusCounts` walks `items.status` GROUP BY — reports count comes from a separate query. |
| 7 | `queue-status-tabs.tsx` integration point | PASS — `STATUS_TABS` array at line 24 is the single insertion point. `StatusCounts` interface from queue-data must add `reports` field. |
| 8 | Post-session WrongItemsBrowser line count + scope | PASS — 886 lines (unchanged from handoff). `statusFor()` at line 86 dispatches across correct / incorrect / skipped (D1 verified — all statuses are reportable). |
| 9 | Post-session page/content/shell threading shape | PASS — `page.tsx` initiates promises; `content.tsx` consumes; `post-session-shell.tsx` is `"use client"` (already promise-aware). New `reportedItemsPromise` threads through the existing pattern. |
| 10 | Admin gate + allowlist | PASS — `requireAdminEmail()` at `src/server/auth/admin-gate.ts`; allowlist `["leonardiwata@gmail.com"]` at `src/config/admins.ts`. (admin)/layout.tsx gating intact. |
| 11 | Post-handoff commit survey | PASS — `git log --oneline d21b52d..HEAD` returns 37 commits. Surface IS shifted from the handoff baseline at three load-bearing files (`wrong-items-browser.tsx`, `queue-data.ts`, `queue-status-tabs.tsx`/`queue-row-disposition.tsx`). Plan-doc proceeds against `3f0571e`, not `d21b52d`. |
| 12 | `db:generate` drift baseline | OBSERVED — probe run of `bun db:generate` from clean tree produces `drizzle/0008_sloppy_medusa.sql` containing `ALTER TYPE "public"."session_type" ADD VALUE 'mistakes';`. Probe artifacts reverted before plan-doc landed; baseline confirmed clean (working tree contains only this plan-doc + the untracked forensic log). Resolution path documented at §1.1. |
| 13 | Test baseline at HEAD | PASS — `bun test`: 370 pass / 0 fail / 1252 expect / 33 files. |
| 14 | Typecheck baseline | PASS — `bun typecheck` clean. |
| 15 | Lint baseline | PASS — `bun lint` clean (no staged files; structural lint runner clean). |
