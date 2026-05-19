# Plan — Experimental question-audit mode

This document is a planning artifact only. It does not authorize product-code changes, schema migrations, or behavior changes in this round. The goal is to turn the Experimental question-audit idea into a concrete implementation plan for the current 18 Seconds codebase so a later implementation branch can execute against real seams instead of starting from product prose.

The feature should be developed on a branch in the `experimental-question-audit-mode` direction. That name matches the proposed user-facing concept: a parallel practice surface for unaudited items plus the audit workflow needed to decide whether those items should ever enter the normal item bank.

## 1. Summary / product intent

Experimental is a **separate question pool and separate session family** for questions that are not yet trusted enough to enter the canonical mastery flow. Its purpose is fourfold:

1. Let users test unaudited or in-progress questions in realistic practice surfaces.
2. Gather structured feedback about item quality, correctness, subject fit, and difficulty fit.
3. Allow users to submit edit proposals without overwriting the canonical item directly.
4. Keep normal mastery, belts, review scheduling, and progress reporting unaffected until an admin explicitly approves promotion.

In codebase terms, Experimental should not be treated as a cosmetic tag on the existing dashboard flow. It is a parallel surface with distinct routing, distinct session semantics, distinct item-selection queries, and distinct write paths for user feedback. The existing canonical surfaces (`/`, `/full-length/configure`, `/drill/[subTypeId]/run`, `/review`, `/stats`) remain the source of truth for the live mastery system.

## 2. User-facing scope

The user-facing surface should be a new top-level `Experimental` nav entry added through the same chrome used today by [`src/components/dashboard/top-nav.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/components/dashboard/top-nav.tsx:1) and [`src/components/nav/page-nav.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/components/nav/page-nav.tsx:1). It sits beside the existing top-level routes:

- `Dashboard`
- `Practice Test`
- `Lessons`
- `Review`
- `Stats`
- `Experimental` (new)

Inside `Experimental`, the primary v1 subtabs should be:

- `Practice Test`
- `Drills`
- `Review`

Deferred but directionally aligned later tabs:

- `Queue`
- `Admin`

User-facing intent by subtab:

- `Experimental Practice Test`: take a mixed experimental session against unaudited items.
- `Experimental Drills`: take sub-type-specific experimental sessions against unaudited items.
- `Experimental Review`: view a list of completed experimental sessions, click into a session-detail page, and optionally submit item-level audits there, without mixing with normal `/review`.
- `Experimental Queue/Admin` later: moderator-facing or higher-trust surfaces for reviewing aggregate feedback and making promote/reject decisions.

## 3. Core product rules

These rules should be treated as invariant, not copy suggestions:

1. Experimental attempts do not affect `mastery_state`.
2. Experimental attempts do not update belt/tier summaries.
3. Experimental attempts do not write into the normal `review_queue`.
4. Experimental attempts do not appear in normal item-selection pools until an admin promotion decision is recorded.
5. Experimental review history is separate from normal `/review`, which currently functions as a completed-session history surface.
6. Promoted questions need an audit trail showing why and from which source version they were approved.
7. Proposed edits are versioned and additive. They do not destructively mutate the original item body/options/explanation.
8. User feedback is evidence, not direct publication. Canonical item state changes require an admin action.
9. Audit feedback is optional. Users are not required to submit feedback after each question or immediately after a session.
10. The primary MVP audit entry point is Experimental Review: a list of completed experimental sessions, click into a session-detail page, and item-level audit submission during review there.

## 4. Question / audit model

### 4.1 Proposed item-level fields

At minimum the Experimental model needs these conceptual fields:

- `isExperimental`
- `auditStatus = unaudited | approved | rejected | needs_revision`
- `suggestedSubject`
- `suggestedDifficulty`
- `sourceVersion`
- `parentItemId`

Additional practical fields for this repo:

- `auditLockedAtMs` or equivalent moderation timestamp
- `promotedItemId` when an experimental item is turned into a canonical `items` row
- `hiddenAtMs` or `circulationStatus` if admins need to remove a bad item from active Experimental rotation without hard delete
- `createdByUserId` or `originKind` if future ingest/generation paths create experimental items from multiple sources

### 4.2 Where these should live

For this repo, the practical recommendation is:

- Keep canonical `items` unchanged for live-bank behavior.
- Create a dedicated `experimental_items` table instead of overloading `items` with an `isExperimental` boolean.

Reasoning grounded in current schema:

- The canonical `items` table is directly read by the current item-selection engine in [`src/server/items/selection.ts`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/items/selection.ts:1) and drill-bank checks in [`src/app/(app)/drill/[subTypeId]/run/page.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/app/(app)/drill/[subTypeId]/run/page.tsx:1).
- Canonical `items.status` already carries lifecycle meaning (`candidate | live | retired`) for the existing admin generation/review pipeline. Reusing that same table for Experimental would blur two different workflows: candidate-generation moderation and unaudited-user-audit moderation.
- A separate table makes it easier to guarantee the non-contamination rule: no accidental inclusion in canonical drill/full-length queries, no accidental writes into normal performance queries, and no accidental admin queue crossover.

The only field that likely belongs on canonical `items` after promotion is provenance:

- `metadata_json.experimentalOrigin` or a sibling provenance field referencing the promoted experimental record and source version.

### 4.3 Versioning recommendation

Do not update experimental item content in place when feedback leads to an edit. Instead:

- keep the original experimental row immutable enough to preserve audit context
- create a new experimental revision row with `parent_item_id` pointing at the source experimental row
- record the admin decision that superseded the prior revision

That model fits the product requirement that edits be versioned, not destructive.

## 5. Concrete data/storage plan

The storage layer should mirror current repo patterns: explicit tables, UUIDv7 ids, no hidden behavior in blobs when relational columns are better, and joins back to `users` / `practice_sessions` where needed.

### 5.1 `experimental_items`

Purpose:

- source of truth for unaudited or in-progress items served only through Experimental surfaces

Core columns:

- `id uuid primary key default uuidv7()`
- `sub_type_id varchar(64) not null` referencing `sub_types.id`
- `difficulty item_difficulty not null`
- `body jsonb not null`
- `options_json jsonb not null`
- `correct_answer varchar(64) not null`
- `explanation text`
- `metadata_json jsonb not null default '{}'`
- `audit_status experimental_audit_status not null default 'unaudited'`
- `source_version integer not null default 1`
- `parent_experimental_item_id uuid null references experimental_items(id)`
- `promoted_item_id uuid null references items(id)`
- `hidden_at_ms bigint null`
- `created_by_user_id uuid null references users(id)`
- `created_at_ms bigint not null`
- `updated_at_ms bigint not null`

Relationships:

- references existing `sub_types`
- optionally points to canonical `items` once promoted
- optionally chains to a parent experimental revision

Migration notes:

- create as a new table rather than altering `items`
- add indexes mirroring canonical read patterns: `(sub_type_id, audit_status)`, `(audit_status, hidden_at_ms)`, and possibly `(audit_status, difficulty)`

### 5.2 `experimental_sessions`

Purpose:

- session container for Experimental practice-test / drill / review runs

Core columns:

- `id uuid primary key default uuidv7()`
- `user_id uuid not null references users(id)`
- `type experimental_session_type not null` with values like `practice_test | drill | review`
- `sub_type_id varchar(64) null references sub_types(id)`
- `target_question_count integer not null`
- `started_at_ms bigint not null`
- `ended_at_ms bigint null`
- `last_heartbeat_ms bigint not null`
- `completion_reason completion_reason null`
- `recency_excluded_item_ids uuid[] not null default '{}'`
- `metadata_json jsonb not null default '{}'`

Relationships:

- same user ownership model as canonical `practice_sessions`
- separate table rather than extending `practice_sessions.type`

Migration notes:

- separate table is preferred over adding experimental values to the existing `session_type` enum because current stats, review, and selection code assumes canonical semantics off `practice_sessions.type`
- if later reuse pressure strongly favors a shared table, that should be a deliberate re-evaluation, not the MVP default

### 5.3 `experimental_attempts`

Purpose:

- per-question attempt records for Experimental sessions

Core columns:

- `id uuid primary key default uuidv7()`
- `session_id uuid not null references experimental_sessions(id)`
- `experimental_item_id uuid not null references experimental_items(id)`
- `selected_answer varchar(64) null`
- `correct boolean not null`
- `latency_ms integer not null`
- `metadata_json jsonb not null default '{}'`

Relationships:

- intentionally separate from canonical `attempts`

Migration notes:

- this isolation is what makes “no mastery writes / no stats contamination” enforceable by default

### 5.4 `item_audits`

Purpose:

- structured user audit submissions tied to an experimental item, optionally tied to a specific attempt/session, with the MVP expectation that most audits are submitted from Experimental Review after the session is complete

Core columns:

- `id uuid primary key default uuidv7()`
- `experimental_item_id uuid not null references experimental_items(id)`
- `user_id uuid not null references users(id)`
- `experimental_session_id uuid null references experimental_sessions(id)`
- `experimental_attempt_id uuid null references experimental_attempts(id)`
- `makes_sense boolean null`
- `correct_answer_is_right boolean null`
- `subject_tag_is_right boolean null`
- `difficulty_is_right boolean null`
- `suggested_subject varchar(64) null`
- `suggested_difficulty item_difficulty null`
- `notes text null`
- `submitted_at_ms bigint not null`

Relationships:

- many audits per experimental item
- optional joins back to the exact attempt that generated the feedback

Migration notes:

- one user may audit the same item multiple times across revisions; uniqueness should be based on `(user_id, experimental_item_id, source_version)` only if product wants one audit per revision

### 5.5 `item_edit_proposals`

Purpose:

- additive edit suggestions that do not overwrite the source row

Core columns:

- `id uuid primary key default uuidv7()`
- `experimental_item_id uuid not null references experimental_items(id)`
- `user_id uuid not null references users(id)`
- `proposed_body jsonb null`
- `proposed_options_json jsonb null`
- `proposed_correct_answer varchar(64) null`
- `proposed_explanation text null`
- `suggested_subject varchar(64) null`
- `suggested_difficulty item_difficulty null`
- `rationale text null`
- `submitted_at_ms bigint not null`

Relationships:

- multiple proposals can target one experimental item

Migration notes:

- keep proposal data separate from `item_audits` so structured audit answers and full content rewrites do not get conflated

### 5.6 `item_revision_decisions`

Purpose:

- admin moderation ledger for approve / reject / needs_revision / hide / promote actions

Core columns:

- `id uuid primary key default uuidv7()`
- `experimental_item_id uuid not null references experimental_items(id)`
- `proposal_id uuid null references item_edit_proposals(id)`
- `acted_by_user_id uuid not null references users(id)`
- `decision experimental_audit_status not null`
- `promoted_item_id uuid null references items(id)`
- `decision_notes text null`
- `acted_at_ms bigint not null`

Relationships:

- ties admin actions to either the base experimental row or a specific proposal

Migration notes:

- this is the authoritative audit history table that supports future provenance requirements

### 5.7 Rollout note on enums

Recommended new enums:

- `experimental_audit_status = unaudited | approved | rejected | needs_revision`
- `experimental_session_type = practice_test | drill | review`

Keep these separate from current `item_status` and `session_type`.

## 6. Route and UI plan

### 6.1 Top-level nav

Modify the nav model in [`src/components/dashboard/top-nav.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/components/dashboard/top-nav.tsx:1) to add:

- `href: "/experimental"`
- `label: "Experimental"`

The existing `PageNav` wrapper means every authenticated page that already consumes `loadNavChrome()` can render the same new tab without bespoke chrome work.

### 6.2 Proposed route map

Recommended route structure:

- `/experimental`
- `/experimental/practice-test`
- `/experimental/practice-test/run`
- `/experimental/drills`
- `/experimental/drills/[subTypeId]`
- `/experimental/drills/[subTypeId]/run`
- `/experimental/review`
- `/experimental/review/[sessionId]`
- `/experimental/admin` later
- `/experimental/queue` later

### 6.3 Why this route shape fits the repo

Current route patterns already split:

- configure/primer routes from run routes for full-length
- sub-type-specific routes for drills
- history/list views from session-detail review views

Concrete parallels:

- canonical full-length primer: [`src/app/(app)/full-length/configure/page.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/app/(app)/full-length/configure/page.tsx:1)
- canonical full-length run: [`src/app/(app)/full-length/run/page.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/app/(app)/full-length/run/page.tsx:1)
- canonical drill run: [`src/app/(app)/drill/[subTypeId]/run/page.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/app/(app)/drill/[subTypeId]/run/page.tsx:1)
- current review/history list: [`src/app/(app)/review/page.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/app/(app)/review/page.tsx:1)

Experimental should follow those conventions rather than inventing a modal-only or dashboard-widget-only UI.

### 6.4 Proposed component seams

Expected new component families:

- `src/components/experimental/experimental-home.tsx`
- `src/components/experimental/experimental-subnav.tsx`
- `src/components/experimental/practice-test-primer.tsx`
- `src/components/experimental/drill-primer.tsx`
- `src/components/experimental/review-view.tsx`
- `src/components/experimental/review-session-detail.tsx`
- `src/components/experimental/audit-form.tsx`
- `src/components/experimental/edit-proposal-form.tsx`

Expected server loaders/actions:

- `src/server/experimental/start.ts`
- `src/server/experimental/selection.ts`
- `src/server/experimental/review-data.ts`
- `src/server/experimental/audit-actions.ts`
- `src/server/experimental/admin-data.ts`

## 7. Session behavior plan

### 7.1 Experimental Practice Test

Behavior:

- mixed-item session across experimental items only
- should resemble canonical full-length behavior enough to collect realistic signal
- should write `experimental_sessions` and `experimental_attempts`, not canonical tables

MVP recommendation:

- fixed question count smaller than canonical full-length if pool size is initially limited
- reuse the focus-shell interaction model and pacing chrome, but run through experimental server actions and data loaders

### 7.2 Experimental Drills

Behavior:

- sub-type-specific sessions against `experimental_items`
- no adaptive mastery walker writes
- no belt indicator
- no writes to `mastery_state`

Practical seam:

- fork the current drill path conceptually, but do not call canonical `startSession()` in [`src/server/sessions/start.ts`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/sessions/start.ts:1) against canonical `practice_sessions`
- create an experimental counterpart rather than stretching the existing switch logic immediately

### 7.3 Experimental Review

Behavior:

- a list surface of completed experimental sessions
- click from that list into a required session-detail page for a completed experimental session
- the session-detail page should show attempt outcomes plus optional item-level audit-entry affordances
- should not merge into canonical `/review`, which today is normal practice history only

MVP recommendation:

- Experimental Review is explicitly a two-step flow: session list first, then session detail
- list completed experimental sessions newest-first at `/experimental/review`
- open a session-detail page at `/experimental/review/[sessionId]` for each completed session
- make that session-detail page the primary audit-entry surface
- allow users to optionally submit item-level audits from the session-detail page
- do not require audit submission during the run, after each question, or immediately on session completion

### 7.4 Scoring and display behavior

Allowed:

- show per-session score, correct count, skipped count, latency, and user feedback completion state

Forbidden in MVP:

- any progress language implying mastery gain
- any dashboard/stat inclusion with canonical data
- any normal review due count mutation

## 8. Audit submission workflow

### 8.1 Structured audit form

Each experimental item should support a structured audit with these fields:

- `Makes sense?`
- `Correct answer right?`
- `Subject tag right?`
- `Difficulty right?`
- `Notes`

Optional structured helpers:

- `Suggested subject`
- `Suggested difficulty`

Optional-audit rule for MVP:

- Audit feedback is optional.
- Users are not required to submit audit feedback after each question.
- Users are not required to submit audit feedback immediately after an experimental practice test or drill ends.
- The primary MVP audit entry point is Experimental Review, which is a list of completed experimental sessions that links into a session-detail page.
- Audit submission is item-level during review on that completed session-detail page.

Workflow:

1. User completes an experimental practice test or drill.
2. User later opens Experimental Review and sees a list of completed experimental sessions.
3. User clicks into the session-detail page for a completed session.
4. User opens the audit form for a specific item from that completed session if they choose to leave feedback.
5. Form submits into `item_audits`.

Non-goals for MVP:

- no required in-run audit prompt
- no required per-question interrupt after answer submission
- no forced immediate post-session audit gate
- users may finish a session and leave without submitting any audit

Item state remains unchanged when feedback is submitted; aggregate feedback becomes visible to admins later.

### 8.2 Proposed edit workflow

Separate from the yes/no audit, users can submit:

- edited stem/body
- edited choices
- edited correct answer
- edited explanation
- suggested subject
- suggested difficulty
- rationale

Workflow:

1. User opens Experimental Review and chooses a completed session from the session list.
2. User lands on the session-detail page for that completed session.
3. User chooses `Propose edit` for a specific item if they want to suggest a rewrite.
4. Proposal submits into `item_edit_proposals`.
5. Proposal is linked to the source experimental item and source version.
6. No canonical or experimental item row is overwritten immediately.

This separation matters. A user who can identify “wrong subject tag” should not have to author a full rewrite, and a user who does author a rewrite should not bypass moderation.

## 9. Admin workflow

This repo already has an admin route family and queue UI patterns under:

- [`src/app/(admin)/admin/review/page.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/app/(admin)/admin/review/page.tsx:1)
- [`src/server/admin/queue-data.ts`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/admin/queue-data.ts:1)
- [`src/components/admin-review/queue-list.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/components/admin-review/queue-list.tsx:1)

The Experimental moderation plan should reuse that admin route-group pattern rather than inventing a separate permission model in the user route tree.

Recommended workflow:

1. Admin opens an Experimental queue surface.
2. Admin views the original experimental item.
3. Admin sees aggregate structured feedback counts.
4. Admin inspects proposed edits and version lineage.
5. Admin chooses one action:
   - approve as-is
   - approve edited proposal
   - reject
   - mark `needs_revision`
   - hide from circulation

Post-decision state transitions:

- `approve as-is`
  - create canonical `items` row or mark for canonical insertion
  - set `experimental_items.audit_status = approved`
  - record `promoted_item_id`
  - append `item_revision_decisions` record

- `approve edited proposal`
  - materialize a new experimental revision if needed
  - create canonical `items` row from approved revision
  - record linkage from proposal and source version to promoted canonical item

- `reject`
  - set `audit_status = rejected`
  - optionally remove from active Experimental selection

- `needs_revision`
  - set `audit_status = needs_revision`
  - keep eligible or ineligible for circulation based on a separate visibility rule

- `hide from circulation`
  - set `hidden_at_ms`
  - remove from active selection queries without erasing audit history

## 10. Phased rollout

### 10.1 MVP

MVP scope should include:

- top-level `Experimental` nav
- Experimental home + subnav
- Experimental Practice Test
- Experimental Drills
- unaudited experimental pool only
- no mastery writes
- no belt updates
- no canonical review contamination
- Experimental Review list page for completed experimental sessions
- Experimental Review session-detail page at `/experimental/review/[sessionId]`
- basic structured audit form available from the Experimental Review session-detail page
- admin approve / reject / promote path

MVP implementation style should favor safe duplication over premature unification. The current canonical flow is stable and user-visible; Experimental should not destabilize it.

### 10.2 Phase 2

Phase 2 can add:

- edit proposal submission form
- proposal review UI
- revision history / source-version display
- explicit `needs_revision` recirculation logic
- experimental session detail review page polish

### 10.3 Later enhancements

Later phases can add:

- revision diff view
- community consensus scoring
- weighted trust scores for auditors
- experimental review history analytics
- admin queue tooling with filters and cohorting
- optional experimental-to-canonical promotion automation thresholds
- dedicated experimental admin/queue top-level tabs

## 11. Risks / open questions

### 11.1 ID strategy

Open question:

- Should experimental items ever reuse canonical `items.id` after promotion?

Recommendation:

- no. Promotion should create or explicitly map to a canonical row so provenance remains clear.

### 11.2 Shared vs separate session infrastructure

Open question:

- Should Experimental extend `practice_sessions` / `attempts` / `session_type`, or live in parallel tables?

Recommendation:

- separate tables for MVP. The current canonical session engine in [`src/server/sessions/start.ts`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/sessions/start.ts:1) and selection engine in [`src/server/items/selection.ts`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/items/selection.ts:1) are tightly coupled to mastery-safe assumptions.

### 11.3 Meaning of “Review”

Resolved MVP definition:

- Experimental Review is a list of completed experimental sessions at `/experimental/review`.
- Each row links to a session-detail page at `/experimental/review/[sessionId]`.
- Optional item-level audits are submitted on that session-detail page.

Repo-specific constraint:

- current `/review` is history of completed normal sessions, not a due-item study queue
- current `/post-session/[sessionId]` is the detailed per-session review surface

Implementation note:

- Experimental Review should borrow the route semantics of canonical history plus detail, but its content and writes remain separate from normal `/review` and normal post-session flows.

### 11.4 Admin permission model

Open question:

- Should Experimental moderation use the existing admin allowlist at [`src/config/admins.ts`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/config/admins.ts:1), or should there be a separate “auditor” role?

Recommendation:

- MVP should reuse the existing admin gate. Additional moderator roles can come later if needed.

### 11.5 Promotion visibility

Open question:

- After approval, should an item remain visible in Experimental history?

Recommendation:

- yes for provenance/history, but no for active experimental selection once promoted.

### 11.6 Reuse of focus-shell

Open question:

- How much of the existing run/content and post-session infrastructure can be reused without risking canonical side effects?

Recommendation:

- reuse UI shell components where they are presentation-only
- fork or wrap server writes and data loaders wherever canonical writes happen

### 11.7 Coexistence with current admin review queue

Open question:

- The repo already has an admin review queue for canonical candidate items. Should Experimental be folded into that queue or kept separate?

Recommendation:

- separate queue tabs/data loaders, shared admin layout and shared filter/list patterns

## 12. Recommended implementation order

1. Add planning follow-up ADR/SPEC updates if the team wants this feature formally adopted before code.
2. Add schema migrations for `experimental_items`, `experimental_sessions`, `experimental_attempts`, `item_audits`, `item_edit_proposals`, and `item_revision_decisions`.
3. Add experimental server-side selection/start/read/write modules in a dedicated `src/server/experimental/*` area.
4. Add top-level `Experimental` nav entry and Experimental landing page with subtabs.
5. Build Experimental Drills first, because the route shape is simpler and the existing drill flow provides the clearest reuse seam.
6. Build Experimental Practice Test next, reusing the same selection/session primitives but with mixed-sub-type selection.
7. Build Experimental Review as a session-list route plus a required session-detail route.
8. Add the structured audit form and persistence.
9. Add admin moderation surface reusing the existing `(admin)` route-group conventions and queue UI patterns.
10. Add promotion flow from approved experimental revision into canonical `items`, with provenance recording and explicit no-contamination verification.
11. Add edit proposals and revision-history tooling after the base moderation path works.

## 13. Out of scope

Explicitly out of MVP scope:

- changing canonical mastery behavior
- changing existing dashboard, stats, or review calculations
- auto-promoting items into the live bank
- community reputation systems
- consensus-weighted scoring
- destructive in-place item editing
- merging Experimental data into canonical `/review` or `/stats`
- replacing the existing admin candidate-item queue
- building Queue/Admin user-facing tabs before the core Experimental practice surfaces exist

## 14. Repo-grounded implementation notes

These observations from repo inspection should shape later implementation:

1. The top nav is centrally owned by [`src/components/dashboard/top-nav.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/components/dashboard/top-nav.tsx:1). Adding `Experimental` there is the cleanest top-level entry.
2. Shared non-dashboard pages already use [`src/components/nav/page-nav.tsx`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/components/nav/page-nav.tsx:1) plus [`src/server/nav/chrome.ts`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/nav/chrome.ts:1), so Experimental routes should do the same.
3. Canonical session start and selection are centered in [`src/server/sessions/start.ts`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/sessions/start.ts:1) and [`src/server/items/selection.ts`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/items/selection.ts:1). Those modules are optimized for live-bank assumptions and should not be casually widened in MVP.
4. Current `/review` is completed-session history, as implemented in [`src/server/review/data.ts`](/home/riwata/Documents/projects/ai_engineering/gauntlet-curriculum/partner/18seconds/src/server/review/data.ts:1). “Experimental Review” should be named with that existing meaning in mind.
5. There is already an admin route-group and queue surface for candidate items. Experimental moderation should reuse those layout and interaction patterns rather than creating ad hoc admin UI in `(app)`.
