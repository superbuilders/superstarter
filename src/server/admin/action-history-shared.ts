// Client-safe shared module for the admin audit-history surface (Phase 4
// sub-phase b §2.5 commit 0).
//
// This module is intentionally db-free: it holds the AdminActionHistory-
// Entry shape, the action_type Zod schema, the plain-object type guard,
// and the per-entry pure diff helper. The DB-touching loader lives in
// action-history-data.ts and imports FROM here.
//
// The split exists because audit-history-tab.tsx and its three per-action
// child components are reached transitively from a "use client" parent
// (content.tsx). If they imported anything from action-history-data.ts
// directly (other than `import type`), Next.js would bundle the loader's
// db dependency into the client bundle, which fails at build time
// (Module not found: Can't resolve 'dns', via pg/connection-parameters).

import { z } from "zod"

const adminActionTypeSchema = z.enum([
	"edit",
	"approve",
	"reject",
	"flag",
	"unflag"
])

type AdminActionType = z.infer<typeof adminActionTypeSchema>

interface AdminActionHistoryEntry {
	readonly id: string
	readonly itemId: string
	readonly adminEmail: string
	readonly actionType: AdminActionType
	readonly beforeJson: Readonly<Record<string, unknown>>
	readonly afterJson: Readonly<Record<string, unknown>>
	readonly reason: string | undefined
	readonly createdAtMs: number
}

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
	if (value === null) return false
	if (typeof value !== "object") return false
	if (Array.isArray(value)) return false
	return true
}

// Pure-function helper: returns the sorted list of keys whose serialized
// value differs between before and after. Used by the edit-row renderer
// to summarize "Changed: body, difficulty" for a multi-field edit.
//
// Why JSON.stringify equality: edit audit rows write FULL row snapshots
// in beforeJson/afterJson (per submitEditAction at §2.3 commit-1), not
// field-projected diffs, so the naive `Object.keys` union would yield
// every editable column on every edit. Value-comparison narrows down to
// the actually-changed fields. Stringify equality handles primitives,
// arrays (options), and nested objects (body, metadataJson) uniformly.
function diffChangedKeys(
	beforeJson: Readonly<Record<string, unknown>>,
	afterJson: Readonly<Record<string, unknown>>
): ReadonlyArray<string> {
	const allKeys = new Set<string>()
	for (const k of Object.keys(beforeJson)) allKeys.add(k)
	for (const k of Object.keys(afterJson)) allKeys.add(k)
	const changed: string[] = []
	for (const key of allKeys) {
		const beforeStr = JSON.stringify(beforeJson[key])
		const afterStr = JSON.stringify(afterJson[key])
		if (beforeStr !== afterStr) changed.push(key)
	}
	return changed.sort()
}

export type { AdminActionHistoryEntry, AdminActionType }
export { adminActionTypeSchema, diffChangedKeys, isPlainObject }
