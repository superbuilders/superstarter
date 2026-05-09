// /post-session/[sessionId] — session-type-aware post-session review surface.
//
// Plan: docs/plans/phase5-post-session-review.md §3 + §4 + §12 commit 2.
//
// Server component:
//   1. Resolves params to a sessionId promise.
//   2. Loads the session row + auth check; redirects unauthorized
//      access (no session, not the owner, missing row) to / per the
//      existing security shape. **Does not redirect non-diagnostic
//      session types** (sub-phase 1 commit 1 lifted that gate).
//   3. Fires the post-session review aggregations in parallel:
//        - getPerSubTypePerformance → PerSubTypePerformance[]
//          (consolidated accuracy + latency per sub-type; Round 2 §5.4)
//        - getWrongItemsForSession  → WrongItem[]
//        - triageScoreForSession    → TriageScore
//        - pacing-line read (existing, unchanged)
//   4. Derives the "struggled" sub-type set from accuracy + latency
//      per plan §9 (accuracy < 70% OR median > threshold), then chains
//      into getStrategiesForSubTypes for that set. The kind-preference
//      selection per plan §9 is deferred to commit 6 alongside
//      <StrategySurface>; commit 2 returns ALL strategies for each
//      struggled sub-type.
//   5. Passes the bundle to <PostSessionContent> (a client component)
//      which consumes the promise via React.use() and drills resolved
//      values to <PostSessionShell>. The shell does NOT yet render the
//      new fields — slots 2-6 stay as locked-§10-ordering placeholders;
//      this commit only adds the data flow, not the render. Visible
//      behavior is unchanged from commit 1.
//
// Per rules/rsc-data-fetching-patterns.md, prepared statements colocate
// in the page that initiates them and types derived via Awaited<...>
// are exported for child components.

import * as errors from "@superbuilders/errors"
import { and, eq, sql } from "drizzle-orm"
import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { type SubTypeId, subTypes } from "@/config/sub-types"
import { db } from "@/db"
import { attempts } from "@/db/schemas/practice/attempts"
import { items } from "@/db/schemas/catalog/items"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { strategies } from "@/db/schemas/catalog/strategies"
import { timestampFromUuidv7 } from "@/db/lib/uuid-time"
import { logger } from "@/logger"
import { triageScoreForSession, type TriageScore } from "@/server/triage/score"
import { PostSessionContent } from "@/app/(diagnostic-flow)/post-session/[sessionId]/content"
import type { SessionTypeForShell } from "@/components/post-session/post-session-shell"
import {
	getEndSessionTierForDrill,
	type TierForDrillSession
} from "@/server/post-session/end-session-tier"
import {
	deriveStruggledSubTypes,
	selectStrategiesForStruggledSubTypes
} from "@/server/post-session/strategy-selection"

interface PageProps {
	params: Promise<{ sessionId: string }>
}

// Threshold: the real CCAT is 15 minutes for 50 questions. Sessions at
// or under this duration are on-pace and surface no pacing line. Above
// it, the pacing line surfaces with the rounded minute count (rendered
// only on diagnostic sessions per <PostSessionShell>'s gate).
const PACING_THRESHOLD_MS = 15 * 60_000

// ---------------- Prepared statements (plan §4) ----------------

// Per-sub-type performance aggregation — combined accuracy + median latency
// in a single round-trip. Returns one row per sub-type the session touched:
// { subTypeId, correct, total, medianLatencyMs }. percentile_cont(0.5) is
// the linear-interpolation continuous median (NOT percentile_disc, which
// returns the actually-observed value; NOT AVG which is the mean). The
// "no-percentages" constraint in PRD §6.5 applies to the renderer; this
// query returns counts + ms.
//
// Round 2 commit §5.4 (Option 4 split) consolidated the prior two prepared
// statements (`getPerSubTypeAccuracy` + `getPerSubTypeLatency`) into one.
// The deleted statements' shape match was verified at sub-phase 1 commit
// 2's harness (5/10/15/20/25 fixture asserting median = 15). See
// `docs/plans/post-session-audit-fixes-and-wide-token-retrofit.md` §5.4 +
// §0.4 for the consolidation rationale.
const getPerSubTypePerformance = db
	.select({
		subTypeId: sql<SubTypeId>`${items.subTypeId}`,
		correct: sql<number>`COUNT(*) FILTER (WHERE ${attempts.correct})::int`,
		total: sql<number>`COUNT(*)::int`,
		medianLatencyMs: sql<number>`percentile_cont(0.5) WITHIN GROUP (ORDER BY ${attempts.latencyMs})::int`
	})
	.from(attempts)
	.innerJoin(items, eq(attempts.itemId, items.id))
	.where(eq(attempts.sessionId, sql.placeholder("sessionId")))
	.groupBy(items.subTypeId)
	.prepare("app_dgflow_post_session_id_per_sub_type_performance")

// Wrong items for the session, chronologically ordered. The §15.2-
// amendment seam shipped end-to-end at sub-phase 4 — commit 2 landed
// the metadata_json->'structuredExplanation' projection here plus the
// matching field on the WrongItem interface below; commit 4 wired the
// consumer (the <StructuredExplanation> component + <WrongItemCard>'s
// strike/highlight Set state). The 50 NULL-source_folder seed items
// lack the structured form; metadata_json->'structuredExplanation'
// returns NULL for those rows and the boundary normalize maps
// NULL → undefined per rules/no-null-undefined-union.md, then
// <WrongItemCard> falls back to items.explanation prose per plan §3.6.
const getWrongItemsForSession = db
	.select({
		attemptId: attempts.id,
		itemId: items.id,
		subTypeId: sql<SubTypeId>`${items.subTypeId}`,
		body: items.body,
		optionsJson: items.optionsJson,
		correctAnswer: items.correctAnswer,
		selectedAnswer: attempts.selectedAnswer,
		explanation: items.explanation,
		structuredExplanation: sql<unknown>`${items.metadataJson} -> 'structuredExplanation'`
	})
	.from(attempts)
	.innerJoin(items, eq(attempts.itemId, items.id))
	.where(
		and(eq(attempts.sessionId, sql.placeholder("sessionId")), eq(attempts.correct, false))
	)
	.orderBy(attempts.id)
	.prepare("app_dgflow_post_session_id_wrong_items")

// Strategies for a set of struggled sub-types. Bound as a single typed
// varchar[] parameter via `= ANY(...)` — Drizzle's `inArray` +
// sql.placeholder combination renders as `IN $1` (invalid SQL) for
// prepared statements, so we use the explicit ANY-with-cast shape
// instead. Empty input is handled at the call site (we skip the query
// entirely when struggled is empty so an empty array isn't sent).
const getStrategiesForSubTypes = db
	.select({
		id: strategies.id,
		subTypeId: sql<SubTypeId>`${strategies.subTypeId}`,
		kind: strategies.kind,
		text: strategies.text
	})
	.from(strategies)
	.where(sql`${strategies.subTypeId} = ANY(${sql.placeholder("subTypeIds")}::varchar[])`)
	.prepare("app_dgflow_post_session_id_strategies_for_sub_types")

// ---------------- Derived types (plan §4) ----------------

// Per the RSC export-derived-types rule, derive the row type from the
// query's Awaited return shape. Downstream components import this from
// page.tsx so the type contract stays anchored to the query.
type PerSubTypePerformance = Awaited<ReturnType<typeof getPerSubTypePerformance.execute>>[number]

// ──────────────────────────────────────────────────────────────────
// TRANSIENT PROJECTION TYPES + SHIMS — deleted at commit §5.4b.
// `strategy-selection.ts` still consumes per-axis arrays
// (`PerSubTypeAccuracy`, `PerSubTypeLatency`) to derive struggled
// sub-types + select kind-preference strategies. The combined fetcher
// above is the canonical source; these `Pick<>` types + sync
// projection helpers project consolidated rows into per-axis shapes
// for backwards-compat. Commit §5.4b refactors `strategy-selection.ts`
// to consume `PerSubTypePerformance` directly and deletes everything
// in this block.
// ──────────────────────────────────────────────────────────────────

type PerSubTypeAccuracy = Pick<PerSubTypePerformance, "subTypeId" | "correct" | "total">
type PerSubTypeLatency = Pick<PerSubTypePerformance, "subTypeId" | "medianLatencyMs">

function projectAccuracy(
	performance: ReadonlyArray<PerSubTypePerformance>
): PerSubTypeAccuracy[] {
	return performance.map(function project(p) {
		return { subTypeId: p.subTypeId, correct: p.correct, total: p.total }
	})
}

function projectLatency(
	performance: ReadonlyArray<PerSubTypePerformance>
): PerSubTypeLatency[] {
	return performance.map(function project(p) {
		return { subTypeId: p.subTypeId, medianLatencyMs: p.medianLatencyMs }
	})
}

// ──────────────────────────────────────────────────────────────────

// WrongItem: normalize null → undefined at the boundary per
// rules/no-null-undefined-union.md. items.explanation and
// attempts.selectedAnswer are both nullable in the schema, and
// metadata_json -> 'structuredExplanation' returns NULL for the 50
// NULL-source_folder seed items that predate the testbank-re-
// extraction round; downstream renderers treat undefined as absent.
//
// structuredExplanation flows through page-query → page → content →
// shell → wrong-items-browser → wrong-item-card and is consumed by
// <StructuredExplanation> (sub-phase 4 commit 3 component + commit 4
// wire-up). Typed `unknown` here because the page-query boundary
// does not validate the JSON shape; the renderer parses with Zod at
// the render boundary per rules/zod-usage.md.
interface WrongItem {
	attemptId: string
	itemId: string
	subTypeId: SubTypeId
	body: unknown
	optionsJson: unknown
	correctAnswer: string
	selectedAnswer?: string
	explanation?: string
	structuredExplanation?: unknown
}

type SurfacedStrategy = Awaited<ReturnType<typeof getStrategiesForSubTypes.execute>>[number]

// Drill-only: end-session adaptive walker tier + the displayName the
// belt indicator reads for its copy. Sub-phase 5 commit 4 wires it.
// The page resolves the displayName here so the shell stays config-
// import-free; the BeltIndicator props (tier, subTypeDisplayName,
// isPreFloor) match this shape 1:1.
interface EndSessionTierForRender extends TierForDrillSession {
	subTypeDisplayName: string
}

// Bundle returned to content.tsx. Five new fields layered onto the
// existing { sessionId, sessionType, pacingMinutes? } meta plus the
// drill-only endSessionTier (sub-phase 5 commit 4).
interface SessionInfo {
	sessionId: string
	sessionType: SessionTypeForShell
	pacingMinutes?: number
	performance: PerSubTypePerformance[]
	wrongItems: WrongItem[]
	triageScore: TriageScore
	surfacedStrategies: SurfacedStrategy[]
	endSessionTier: EndSessionTierForRender | null
}

// "Struggled" sub-type derivation, failure-mode classification, and
// kind-preference strategy selection all live in
// @/components/post-session/strategy-surface (see plan §9). Imported
// at the top of this file. Numeric anchors (0.7 accuracy floor,
// per-sub-type threshold) live there, not in a config file — v1 has
// one consumer, sub-phase 5's dojo work can refactor if needed.

// Drill-only resolution of the adaptive walker's session-end tier
// plus the sub-type displayName the belt indicator copy reads. Gated
// on row.type === 'drill' at the call site so non-drill sessions pay
// zero query cost. Drill is sub-type-locked (PRD §4.2 / SPEC §9.1),
// so row.subTypeId is non-null on row.type === 'drill' by
// construction; the null check is defensive — surfacing the
// invariant violation explicitly per the project's no-fallbacks
// discipline.
async function resolveEndSessionTier(row: {
	id: string
	type: SessionTypeForShell
	subTypeId: string | null
}): Promise<EndSessionTierForRender | null> {
	if (row.type !== "drill") {
		return null
	}
	if (row.subTypeId === null) {
		logger.error(
			{ sessionId: row.id },
			"/post-session: drill session has null sub_type_id (impossible)"
		)
		throw errors.new("drill session missing sub_type_id")
	}
	const drillSubTypeId = row.subTypeId
	const tierResult = await errors.try(getEndSessionTierForDrill(row.id))
	if (tierResult.error) {
		logger.error(
			{ error: tierResult.error, sessionId: row.id },
			"/post-session: end-session-tier query failed"
		)
		throw errors.wrap(tierResult.error, "end-session-tier")
	}
	const tier = tierResult.data
	if (tier === null) {
		return null
	}
	const meta = subTypes.find(function bySubTypeId(t) {
		return t.id === drillSubTypeId
	})
	if (!meta) {
		logger.error(
			{ sessionId: row.id, subTypeId: drillSubTypeId },
			"/post-session: drill sub_type_id not in canonical config"
		)
		throw errors.new("drill sub_type_id not in canonical config")
	}
	return {
		tier: tier.tier,
		attemptCount: tier.attemptCount,
		isPreFloor: tier.isPreFloor,
		subTypeDisplayName: meta.displayName
	}
}

async function loadSession(sessionIdPromise: Promise<string>): Promise<SessionInfo> {
	const sessionId = await sessionIdPromise
	const session = await auth()
	if (!session?.user?.id) {
		logger.debug({ sessionId }, "/post-session: no auth session, redirect /login")
		redirect("/login")
	}
	const userId = session.user.id

	const rows = await db
		.select({
			id: practiceSessions.id,
			userId: practiceSessions.userId,
			type: practiceSessions.type,
			subTypeId: practiceSessions.subTypeId,
			startedAtMs: practiceSessions.startedAtMs,
			endedAtMs: practiceSessions.endedAtMs
		})
		.from(practiceSessions)
		.where(eq(practiceSessions.id, sessionId))
		.limit(1)

	const row = rows[0]
	if (!row) {
		logger.warn({ sessionId, userId }, "/post-session: session not found, redirect /")
		redirect("/")
	}
	if (row.userId !== userId) {
		logger.warn(
			{ sessionId, userId, ownerUserId: row.userId },
			"/post-session: not owner, redirect /"
		)
		redirect("/")
	}

	// Parallel reads against the resolved sessionId. The pacing-line
	// read keeps its existing inline (non-prepared) shape; the
	// performance + wrong-items + triage-score aggregations fire
	// alongside. Round 2 commit §5.4 consolidated the prior two
	// per-sub-type queries (accuracy + latency) into a single
	// `getPerSubTypePerformance` round-trip; transient projection
	// shims (above) project per-axis shapes for `strategy-selection.ts`
	// consumption until §5.4b retires the per-axis types.
	const performanceResult = await errors.try(
		getPerSubTypePerformance.execute({ sessionId: row.id })
	)
	if (performanceResult.error) {
		logger.error(
			{ error: performanceResult.error, sessionId: row.id },
			"/post-session: per-sub-type performance query failed"
		)
		throw errors.wrap(performanceResult.error, "per-sub-type performance")
	}
	const wrongItemsResult = await errors.try(
		getWrongItemsForSession.execute({ sessionId: row.id })
	)
	if (wrongItemsResult.error) {
		logger.error(
			{ error: wrongItemsResult.error, sessionId: row.id },
			"/post-session: wrong-items query failed"
		)
		throw errors.wrap(wrongItemsResult.error, "wrong-items")
	}
	const triageScoreResult = await errors.try(triageScoreForSession(row.id))
	if (triageScoreResult.error) {
		logger.error(
			{ error: triageScoreResult.error, sessionId: row.id },
			"/post-session: triage-score query failed"
		)
		throw errors.wrap(triageScoreResult.error, "triage score")
	}
	const lastAttemptResult = await errors.try(
		db
			.select({
				lastAttemptId: sql<string | null>`max(${attempts.id}::text)::uuid`
			})
			.from(attempts)
			.where(eq(attempts.sessionId, row.id))
	)
	if (lastAttemptResult.error) {
		logger.error(
			{ error: lastAttemptResult.error, sessionId: row.id },
			"/post-session: last-attempt query failed"
		)
		throw errors.wrap(lastAttemptResult.error, "last attempt")
	}

	const performance = performanceResult.data
	// Transient per-axis projections for strategy-selection.ts (deleted
	// at commit §5.4b together with the projection helpers).
	const accuracy = projectAccuracy(performance)
	const latency = projectLatency(performance)
	const wrongItemsRaw = wrongItemsResult.data
	const triageScore = triageScoreResult.data
	const lastAttemptRow = lastAttemptResult.data[0]

	// Normalize null → undefined at the boundary
	// (rules/no-null-undefined-union.md).
	const wrongItems: WrongItem[] = wrongItemsRaw.map(function normalize(r) {
		return {
			attemptId: r.attemptId,
			itemId: r.itemId,
			subTypeId: r.subTypeId,
			body: r.body,
			optionsJson: r.optionsJson,
			correctAnswer: r.correctAnswer,
			selectedAnswer: r.selectedAnswer === null ? undefined : r.selectedAnswer,
			explanation: r.explanation === null ? undefined : r.explanation,
			structuredExplanation:
				r.structuredExplanation === null ? undefined : r.structuredExplanation
		}
	})

	let pacingMinutes: number | undefined
	if (lastAttemptRow?.lastAttemptId) {
		const lastAttemptMs = timestampFromUuidv7(lastAttemptRow.lastAttemptId).getTime()
		const elapsedMs = lastAttemptMs - row.startedAtMs
		if (elapsedMs > PACING_THRESHOLD_MS) {
			pacingMinutes = Math.round(elapsedMs / 60_000)
		}
	}

	// Chain: derive struggled sub-types from accuracy + latency, then
	// fire the strategies query for that set. Per plan §4 the empty
	// case is short-circuited (no SQL `IN ()` syntax error). Per plan
	// §9 kind-preference selection picks ONE strategy per struggled
	// sub-type matching the failure mode (fast-wrong → trap, slow-
	// wrong → recognition, slow-but-right → recognition; technique as
	// universal fallback). Sub-types with zero strategies don't
	// surface a row.
	const struggledIds = deriveStruggledSubTypes(accuracy, latency)
	let surfacedStrategies: SurfacedStrategy[] = []
	if (struggledIds.length > 0) {
		const strategiesResult = await errors.try(
			getStrategiesForSubTypes.execute({ subTypeIds: struggledIds })
		)
		if (strategiesResult.error) {
			logger.error(
				{ error: strategiesResult.error, struggledIds },
				"/post-session: strategies query failed"
			)
			throw errors.wrap(strategiesResult.error, "strategies for struggled")
		}
		surfacedStrategies = selectStrategiesForStruggledSubTypes(
			accuracy,
			latency,
			strategiesResult.data
		)
	}

	// Drill-only end-session walker tier (sub-phase 5 commit 4, plan
	// §5.4). Extracted to keep loadSession under the cyclomatic-
	// complexity cap; the per-session-type branch already pushed the
	// fetch+chain+derive function near the limit.
	const endSessionTier = await resolveEndSessionTier(row)

	return {
		sessionId: row.id,
		sessionType: row.type,
		pacingMinutes,
		performance,
		wrongItems,
		triageScore,
		surfacedStrategies,
		endSessionTier
	}
}

function Page(props: PageProps) {
	const sessionIdPromise = props.params.then(function pickId(p) {
		return p.sessionId
	})
	const sessionPromise = loadSession(sessionIdPromise)
	return (
		<React.Suspense fallback={<PostSessionSkeleton />}>
			<PostSessionContent sessionPromise={sessionPromise} />
		</React.Suspense>
	)
}

function PostSessionSkeleton() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-xl items-center justify-center px-6">
			<p className="text-muted-foreground text-sm">Loading session…</p>
		</main>
	)
}

export type {
	EndSessionTierForRender,
	PerSubTypeAccuracy,
	PerSubTypeLatency,
	PerSubTypePerformance,
	SessionInfo,
	SurfacedStrategy,
	WrongItem
}
export default Page
