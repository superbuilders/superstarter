// /admin/review — admin queue surface (Phase 4 sub-phase b §2.1 commit 0).
//
// Server component, NOT async per rules/rsc-data-fetching-patterns.md
// (Pattern 2 — per-page Suspense; no ViewTransition layout above this
// route). Initiates the data promise via loadAdminQueueData() and passes
// the promise to <AdminReviewContent> inside a <React.Suspense> boundary.
//
// Admin gate is enforced one level up at (admin)/layout.tsx via
// <AdminGateClient gatePromise={requireAdminEmail()...}> — NO per-page
// requireAdminEmail() call here (matches /admin/ingest/page.tsx
// convention). The layout's gate-promise is also wrapped in its own
// <Suspense> so this page only renders inside an allowed gate.
//
// Status tab routing: the queue cohort (candidate / live / rejected) is
// driven by the `?status=` search param. The page parses + validates it
// (defaulting to "candidate" on missing/invalid input) before chaining
// the loader call. Search params are themselves a Promise per Next 15+
// conventions (rules/rsc-data-fetching-patterns.md), so the queue data
// promise is composed via params.then(...).
//
// Pressure-cell dashboard (§2.6 commit 0): on the candidates tab only,
// loads loadPressureCellSnapshot in parallel with the queue data and
// passes the snapshot promise into content. Live and rejected tabs
// resolve the snapshot promise to undefined so the dashboard does not
// render and the query does not run.
//
// Click-to-filter URL contract (§2.6 commit 0): pressure-cell tiles
// link to /admin/review?status=candidate&subType=…&difficulty=… so the
// queue lands pre-filtered. The page reads ?subType + ?difficulty and
// threads them as initial-filter overrides into content; queue-list
// composes them with sessionStorage-persisted state per the URL →
// session → defaults precedence chain (see queue-list.tsx).

import * as React from "react"
import { AdminReviewContent } from "@/app/(admin)/admin/review/content"
import {
	loadAdminQueueData,
	type QueueStatusFilter
} from "@/server/admin/queue-data"
import {
	loadPressureCellSnapshot
} from "@/server/admin/pressure-cell-data"
import type { PressureCellSnapshot } from "@/server/admin/pressure-cell-shared"
import { type Difficulty, type SubTypeId, subTypeIds } from "@/config/sub-types"

interface AdminReviewSearchParams {
	status?: string | string[]
	subType?: string | string[]
	difficulty?: string | string[]
}

interface AdminReviewPageProps {
	searchParams: Promise<AdminReviewSearchParams>
}

const SUB_TYPE_ID_SET: ReadonlySet<string> = new Set<string>(subTypeIds)
const DIFFICULTY_SET: ReadonlySet<string> = new Set<string>([
	"easy",
	"medium",
	"hard",
	"brutal"
])

function firstString(raw: string | string[] | undefined): string | undefined {
	if (Array.isArray(raw)) return raw[0]
	return raw
}

function coerceStatusFilter(raw: string | string[] | undefined): QueueStatusFilter {
	const value = firstString(raw)
	if (value === "candidate" || value === "live" || value === "rejected") return value
	return "candidate"
}

function coerceSubTypeOverride(raw: string | string[] | undefined): SubTypeId | undefined {
	const value = firstString(raw)
	if (value === undefined) return undefined
	if (!SUB_TYPE_ID_SET.has(value)) return undefined
	const matched = subTypeIds.find(function eqs(id) {
		return id === value
	})
	if (matched === undefined) return undefined
	return matched
}

function coerceDifficultyOverride(
	raw: string | string[] | undefined
): Difficulty | undefined {
	const value = firstString(raw)
	if (value === undefined) return undefined
	if (!DIFFICULTY_SET.has(value)) return undefined
	if (value === "easy" || value === "medium" || value === "hard" || value === "brutal") {
		return value
	}
	return undefined
}

function AdminReviewPage(props: AdminReviewPageProps) {
	const dataPromise = props.searchParams.then(function withStatus(params) {
		const statusFilter = coerceStatusFilter(params.status)
		return loadAdminQueueData(statusFilter)
	})
	// Pressure-cell snapshot loads only on the candidates tab. Resolving
	// to undefined on live/rejected lets the consumer skip rendering
	// without a separate prop or branch.
	const pressureCellPromise: Promise<PressureCellSnapshot | undefined> =
		props.searchParams.then(function withStatus(params) {
			const statusFilter = coerceStatusFilter(params.status)
			if (statusFilter !== "candidate") return undefined
			return loadPressureCellSnapshot()
		})
	const initialFilterOverridesPromise = props.searchParams.then(
		function withOverrides(params) {
			return {
				subType: coerceSubTypeOverride(params.subType),
				difficulty: coerceDifficultyOverride(params.difficulty)
			}
		}
	)
	return (
		<React.Suspense fallback={<AdminReviewSkeleton />}>
			<AdminReviewContent
				dataPromise={dataPromise}
				pressureCellPromise={pressureCellPromise}
				initialFilterOverridesPromise={initialFilterOverridesPromise}
			/>
		</React.Suspense>
	)
}

function AdminReviewSkeleton() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1200px] px-7 pt-10 pb-12">
				<p className="text-sm text-text-3">Loading queue…</p>
			</main>
		</div>
	)
}

export default AdminReviewPage
