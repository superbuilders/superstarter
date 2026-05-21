import { sql } from "drizzle-orm"
import { bigint, index, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { users } from "@/db/schemas/auth/users"
import { itemAdminActions } from "@/db/schemas/catalog/item-admin-actions"
import { items } from "@/db/schemas/catalog/items"

// User-submitted item quality reports (User Question Reports round §1.1
// per docs/plans/user-question-reports.md).
//
// End-users submit a report from the post-session item review surface
// (WrongItemsBrowser) when they believe a question is broken (wrong
// answer, formatting, mislabeled, or other free-text). Admins triage
// from the Reports tab on /admin/review and navigate to the item-detail
// page to take the disposition action.
//
// Per plan-doc §0.7 D4 (Option A, same-row): disposition state lives on
// the report row itself, not in a sibling table. Only the disposer's
// identity is recorded (disposition_admin_user_id) — opening the item-
// detail page is navigation, not a state change.
//
// Per plan-doc §0.9 re-report semantics: a user can re-report the same
// item after a previous report was resolved/dismissed; the server
// action's INSERT ... ON CONFLICT (user_id, item_id) DO UPDATE
// overwrites the row in place — status → 'open', reason / reason_note
// refreshed, disposition columns cleared. Previous disposition is NOT
// preserved (the audit trail of any ITEM action taken in response lives
// in item_admin_actions and is reachable via disposition_item_action_id
// before re-report clears it). v1 simplicity trade-off; a sibling
// history ledger is forward-pinned at §4.2.
//
// FK cascade rules (mirroring item-admin-actions style precedent):
//
// - user_id ON DELETE CASCADE: user-scoped report state is meaningless
//   if the user is gone. Reports vanish with the user (consistent with
//   cascade-by-user policy elsewhere; e.g., practice_sessions.user_id
//   ON DELETE CASCADE).
//
// - item_id ON DELETE CASCADE: report-against-deleted-item is
//   meaningless. Items are NEVER hard-deleted under the Q6 soft-delete
//   model (status='rejected' is the soft-delete path); this CASCADE is
//   a "shouldn't fire" guard mirroring item_admin_actions.item_id.
//
// - disposition_admin_user_id ON DELETE RESTRICT: preserve admin
//   attribution once a disposition is recorded. Mirrors
//   item_admin_actions.admin_user_id rationale — don't allow user
//   deletion if they have authored audit weight. Nullable until a
//   disposition lands.
//
// - disposition_item_action_id ON DELETE SET NULL: item_admin_actions
//   rows are not deleted under normal operation, but if a record were
//   ever pruned, the report row survives with disposition_kind
//   retained and the link nulled out.
//
// Indexes (per plan-doc §1.1 with R5 audit refinement at f4d7985 and
// the post-review drop of (user_id, status) per redirector C1):
//
// - UNIQUE (user_id, item_id): dedup per §0.9; also serves as the
//   index that supports the §2.3 reflectance lookup
//   (`WHERE user_id = ? AND item_id IN (...)` — prefix-scans the
//   composite without needing a separate (user_id, status) index).
//
// - (item_id, status): supports the §3.4 "User-flagged" badge LEFT JOIN
//   aggregation against open reports per item.
//
// `(status, id DESC)` for the admin queue scan and `(user_id, status)`
// for per-user aggregations are intentionally NOT added. The open-
// report row count stays small at v1 (sequential scan beats the
// index), and the unique (user_id, item_id) composite already covers
// the §2.3 reflectance lookup. Project convention per items.ts is to
// defer indexes until query patterns are observed.
//
// `reported_at_ms` is intentionally kept (Branch B at the post-f4d7985
// rule audit). The column captures re-submission time under ON
// CONFLICT DO UPDATE semantics (§0.9): on first write it coincides
// with the UUIDv7 PK prefix, but on re-report the PK retains the
// original-submission time while `reported_at_ms` advances to the
// re-submission time. This matches the established project precedent
// for state-change event timestamps stored inline as `bigint`
// (items.rejected_at_ms, item_admin_actions.created_at_ms,
// practice_sessions.{started_at_ms, ended_at_ms, last_heartbeat_ms}).
// The rule (rules/no-timestamp-columns.md) literally bans Drizzle's
// timestamp / date / time / interval factories; `bigint("..._ms")` is
// not a banned factory. See plan-doc §1.1 for the full rationale.

const itemUserReportReason = pgEnum("item_user_report_reason", [
	"formatting",
	"wrong_answer",
	"mislabeled",
	"other"
])

const itemUserReportStatus = pgEnum("item_user_report_status", [
	"open",
	"resolved",
	"dismissed"
])

const itemUserReportDispositionKind = pgEnum("item_user_report_disposition_kind", [
	"resolved_via_item_action",
	"dismissed_without_item_action"
])

const itemUserReports = pgTable(
	"item_user_reports",
	{
		id: uuid("id").primaryKey().notNull().default(sql`uuidv7()`),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		itemId: uuid("item_id")
			.notNull()
			.references(() => items.id, { onDelete: "cascade" }),
		reason: itemUserReportReason("reason").notNull(),
		reasonNote: text("reason_note"),
		status: itemUserReportStatus("status").notNull().default("open"),
		dispositionAdminUserId: uuid("disposition_admin_user_id").references(
			() => users.id,
			{ onDelete: "restrict" }
		),
		dispositionAtMs: bigint("disposition_at_ms", { mode: "number" }),
		dispositionItemActionId: uuid("disposition_item_action_id").references(
			() => itemAdminActions.id,
			{ onDelete: "set null" }
		),
		dispositionKind: itemUserReportDispositionKind("disposition_kind"),
		reportedAtMs: bigint("reported_at_ms", { mode: "number" })
			.notNull()
			.default(sql`(extract(epoch from now()) * 1000)::bigint`)
	},
	(table) => [
		uniqueIndex("item_user_reports_user_item_uniq").on(table.userId, table.itemId),
		index("item_user_reports_item_status_idx").on(table.itemId, table.status)
	]
)

export {
	itemUserReportDispositionKind,
	itemUserReportReason,
	itemUserReports,
	itemUserReportStatus
}
