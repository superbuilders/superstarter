"use client"

// <StrategySurface> — surfaced strategies for sub-types where the
// user struggled this session.
//
// Plan: docs/plans/phase5-post-session-review.md §9.
//
// Pure presentational. The page does the struggle derivation and
// kind-preference selection (via @/server/post-session/strategy-
// selection); this component just renders the resulting list.
//
// The original plan §9 said "numeric anchors live inside
// <StrategySurface>." Implementation revision: Next.js disallows
// server components from CALLING functions exported by `"use client"`
// modules, so the helpers + anchors live under
// src/server/post-session/strategy-selection.ts where the post-session
// page (server component) can import them. SPEC §6.14 documents this
// in commit 7.
//
// Render: list of one strategy per struggled sub-type with a sub-type
// displayName prefix in font-medium and the strategy text. Sort:
// verbal-first then alphabetical by displayName, matching
// <AccuracySummary> + <LatencySummary> + <WrongItemsBrowser>. Empty
// state matches <WrongItemsBrowser>'s pattern: a single neutral-toned
// line.

import type { SurfacedStrategy } from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { SUB_TYPE_BY_ID, compareBySubTypeDisplay } from "@/components/post-session/_lib/sub-type-display"
import type { SubTypeId } from "@/config/sub-types"

interface StrategySurfaceProps {
	strategies: ReadonlyArray<SurfacedStrategy>
}

interface DisplayRow {
	subTypeId: SubTypeId
	displayName: string
	section: "verbal" | "numerical"
	strategy: SurfacedStrategy
}

function buildDisplay(strategies: ReadonlyArray<SurfacedStrategy>): DisplayRow[] {
	const rows: DisplayRow[] = []
	for (const s of strategies) {
		const meta = SUB_TYPE_BY_ID.get(s.subTypeId)
		if (meta === undefined) continue
		rows.push({
			subTypeId: s.subTypeId,
			displayName: meta.displayName,
			section: meta.section,
			strategy: s
		})
	}
	rows.sort(compareBySubTypeDisplay)
	return rows
}

function StrategySurface(props: StrategySurfaceProps) {
	const display = buildDisplay(props.strategies)
	return (
		<section
			aria-labelledby="post-session-strategy-heading"
			className="space-y-3"
			data-testid="post-session-strategy-surface-section"
		>
			<h2
				className="font-medium text-foreground text-sm tracking-tight"
				id="post-session-strategy-heading"
			>
				Strategies to review
			</h2>
			{display.length === 0 ? (
				<p
					className="text-foreground/60 text-sm"
					data-testid="post-session-strategy-empty"
				>
					No sub-types flagged this session — keep going.
				</p>
			) : (
				<ul className="space-y-3">
					{display.map(function renderRow(row) {
						return (
							<li
								key={row.subTypeId}
								className="border-foreground/15 border-l pl-4"
								data-testid={`post-session-strategy-row-${row.subTypeId}`}
							>
								<p className="text-foreground/80 text-sm leading-relaxed">
									<span className="font-medium text-foreground">
										{row.displayName}.
									</span>{" "}
									{row.strategy.text}
								</p>
							</li>
						)
					})}
				</ul>
			)}
		</section>
	)
}

export type { StrategySurfaceProps }
export { buildDisplay, StrategySurface }
