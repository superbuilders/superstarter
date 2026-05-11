"use client"

// <PressureCellGrid> — visualizes the 14 sub-types × 4 difficulties live
// matrix at the head of the candidate-review queue (Phase 4 sub-phase b
// §2.6 commit 0).
//
// Cell rendering rules (per pressure-cell-data.ts semantics):
//   - hasPressureSemantics=true + isPressureCell=true: cobalt-accented
//     anchor showing "N / target Needed". Click navigates to the
//     candidate queue filtered to the cell's (subType, difficulty),
//     surfacing the candidates that could relieve this pressure.
//   - hasPressureSemantics=true + isPressureCell=false: filled-target
//     neutral chip showing the live count.
//   - hasPressureSemantics=false (easy/medium): informational neutral
//     chip showing the live count. No interaction; no pressure status.
//
// Click-to-filter URL contract: the queue page reads ?subType= and
// ?difficulty= search params and seeds initial filter state from them.
// See queue-list.tsx initial-state composition for the URL → sessionStorage
// → defaults precedence chain.
//
// Minimize affordance: collapsed/expanded state persists in localStorage
// under COLLAPSED_STORAGE_KEY so admins can hide the dashboard once and
// have the choice survive cohort-tab navigation (candidate → live →
// rejected → candidate). Hydration starts in the expanded default to
// match the SSR markup, then a useEffect reconciles to the stored value.

import * as errors from "@superbuilders/errors"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { type Difficulty, type SubTypeId, subTypes } from "@/config/sub-types"
import { logger } from "@/logger"
import {
	DIFFICULTIES,
	type PressureCell,
	type PressureCellSnapshot
} from "@/server/admin/pressure-cell-shared"

const COLLAPSED_STORAGE_KEY = "18sec:admin:pressure-cell-collapsed"

interface PressureCellGridProps {
	readonly snapshot: PressureCellSnapshot
}

function cellKey(subTypeId: SubTypeId, difficulty: Difficulty): string {
	return `${subTypeId}:${difficulty}`
}

function readCollapsed(): boolean {
	if (typeof window === "undefined") return false
	const raw = window.localStorage.getItem(COLLAPSED_STORAGE_KEY)
	return raw === "1"
}

function writeCollapsed(collapsed: boolean): void {
	if (typeof window === "undefined") return
	const writeResult = errors.trySync(function write() {
		const value = collapsed ? "1" : "0"
		window.localStorage.setItem(COLLAPSED_STORAGE_KEY, value)
	})
	if (writeResult.error) {
		logger.warn(
			{ error: writeResult.error, collapsed },
			"pressure-cell-grid: failed to write collapsed state to localStorage"
		)
	}
}

function PressureCellGrid({ snapshot }: PressureCellGridProps) {
	const [collapsed, setCollapsed] = React.useState<boolean>(false)
	React.useEffect(function loadCollapsed() {
		setCollapsed(readCollapsed())
	}, [])

	function handleToggle() {
		setCollapsed(function next(prev) {
			const value = !prev
			writeCollapsed(value)
			return value
		})
	}

	const cellMap = new Map<string, PressureCell>()
	for (const cell of snapshot.cells) {
		cellMap.set(cellKey(cell.subTypeId, cell.difficulty), cell)
	}
	const headerSummary =
		snapshot.totalPressureCells === 0
			? "All hard + brutal cells at target"
			: `${snapshot.totalPressureCells} of 28 hard/brutal cells under target · ${snapshot.totalPressureCandidates} candidates needed to clear`
	const ToggleIcon = collapsed ? ChevronDownIcon : ChevronUpIcon
	const toggleLabel = collapsed
		? "Expand pressure-cell dashboard"
		: "Minimize pressure-cell dashboard"
	const headerBorderClass = collapsed ? "" : "border-border-soft border-b"
	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header
				className={`flex flex-wrap items-center justify-between gap-2 px-4 pt-2 pb-1 ${headerBorderClass}`}
			>
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					Pressure-cell dashboard
				</h3>
				<div className="flex items-center gap-3">
					<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						{headerSummary}
					</span>
					<button
						type="button"
						onClick={handleToggle}
						aria-expanded={!collapsed}
						aria-controls="pressure-cell-grid-body"
						aria-label={toggleLabel}
						title={toggleLabel}
						className="-mr-1 inline-flex size-7 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"
					>
						<ToggleIcon className="size-4" aria-hidden="true" />
					</button>
				</div>
			</header>
			{!collapsed && (
				<div id="pressure-cell-grid-body" className="overflow-x-auto p-3">
					<table className="w-full border-separate border-spacing-1 text-[13px]">
						<thead>
							<tr>
								<th className="pb-2 text-left font-normal text-[10px] text-text-3 uppercase tracking-[0.06em]">
									Sub-type
								</th>
								{DIFFICULTIES.map(function renderHeader(d) {
									return (
										<th
											key={d}
											className="pb-2 text-center font-normal text-[10px] text-text-3 uppercase tracking-[0.06em]"
										>
											{d}
										</th>
									)
								})}
							</tr>
						</thead>
						<tbody>
							{subTypes.map(function renderRow(st) {
								return (
									<tr key={st.id}>
										<td className="whitespace-nowrap py-1 pr-3 text-text-1">
											<span>{st.displayName}</span>
											<span className="ml-2 text-[10px] text-text-3 uppercase tracking-[0.06em]">
												{st.section}
											</span>
										</td>
										{DIFFICULTIES.map(function renderCell(difficulty) {
											const cell = cellMap.get(cellKey(st.id, difficulty))
											if (cell === undefined) {
												return (
													<td key={difficulty} className="p-0 text-center text-text-3">
														—
													</td>
												)
											}
											return <CellTile key={difficulty} cell={cell} />
										})}
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}
		</section>
	)
}

interface CellTileProps {
	readonly cell: PressureCell
}

function CellTile({ cell }: CellTileProps) {
	if (cell.hasPressureSemantics && cell.isPressureCell) {
		const title = `${cell.liveCount} of ${cell.target} live items at ${cell.difficulty} — click to filter candidates`
		return (
			<td className="p-0 text-center">
				<Link
					href={{
						pathname: "/admin/review",
						query: {
							status: "candidate",
							subType: cell.subTypeId,
							difficulty: cell.difficulty
						}
					}}
					title={title}
					className="inline-flex flex-col items-center rounded-md border border-cobalt/40 bg-cobalt/5 px-2 py-[3px] text-cobalt hover:bg-cobalt/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"
				>
					<span className="font-medium text-[13px] tabular-nums">
						{cell.liveCount} / {cell.target}
					</span>
					<span className="text-[9px] uppercase tracking-[0.06em]">Needed</span>
				</Link>
			</td>
		)
	}
	return (
		<td className="p-0 text-center">
			<div className="inline-flex items-center rounded-md bg-surface-2 px-2 py-[3px] text-text-2">
				<span className="text-[13px] tabular-nums">{cell.liveCount}</span>
			</div>
		</td>
	)
}

export type { PressureCellGridProps }
export { PressureCellGrid }
