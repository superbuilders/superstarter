"use client"

// <TimeSinkMatrix> — sub-type × difficulty performance grid that
// doubles as the filter UI for <TimeSinkChart>.
//
// Rows: a synthetic "All" row on top (column aggregate across every
// difficulty) + each Difficulty present in the session in the canonical
// order (easy → brutal). Columns: every sub-type present, in the
// `subTypes` config order — same mental model as the prior chip row.
// Cells: "correct/total" + "mean s" tinted by accuracy (good /
// pace-warn / destructive, 10% fill). Cells with no attempts render a
// dim em-dash and aren't clickable.
//
// Click model (Excel-flavored):
//   • plain click — replace the highlight with that target. Clicking
//     the same target again clears (toggle-off on identity).
//   • Cmd/Ctrl/Shift + click — toggle that target additively,
//     preserving the rest of the selection.
//   • Click a sub-type column header (or the matching "All" row cell)
//     to highlight the whole column.
//   • Click a difficulty row header to highlight the whole row.
//   • Click the "All" row header to clear (= "show everything").
//
// The component is selection-controlled: parent owns the `Set<string>`
// of `${subTypeId}|${difficulty}` keys and renders the chart's
// dim/highlight pass against the same set.

import * as React from "react"
import { type Difficulty, type SubTypeId, subTypes } from "@/config/sub-types"
import { cn } from "@/lib/utils"

interface AttemptPoint {
	attemptId: string
	latencyMs: number
	correct: boolean
	subTypeId: SubTypeId
	difficulty: Difficulty
}

interface CellStats {
	total: number
	correct: number
	meanLatencyMs: number
}

interface ColumnDef {
	id: SubTypeId
	displayName: string
}

interface MatrixData {
	columns: ReadonlyArray<ColumnDef>
	rows: ReadonlyArray<Difficulty>
	cells: ReadonlyMap<string, CellStats>
	columnAggregate: ReadonlyMap<SubTypeId, CellStats>
	columnKeys: ReadonlyMap<SubTypeId, ReadonlyArray<string>>
	rowKeys: ReadonlyMap<Difficulty, ReadonlyArray<string>>
}

const DIFFICULTY_ORDER: ReadonlyArray<Difficulty> = ["easy", "medium", "hard", "brutal"]
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
	easy: "Easy",
	medium: "Medium",
	hard: "Hard",
	brutal: "Brutal"
}

function makeKey(subTypeId: SubTypeId, difficulty: Difficulty): string {
	return `${subTypeId}|${difficulty}`
}

interface CellAccumulator {
	total: number
	correct: number
	totalMs: number
}

function accumulate<K>(map: Map<K, CellAccumulator>, key: K, a: AttemptPoint): void {
	const correctIncrement = a.correct ? 1 : 0
	const cur = map.get(key)
	if (cur === undefined) {
		map.set(key, {
			total: 1,
			correct: correctIncrement,
			totalMs: a.latencyMs
		})
		return
	}
	cur.total += 1
	cur.correct += correctIncrement
	cur.totalMs += a.latencyMs
}

function finalizeCells<K>(map: ReadonlyMap<K, CellAccumulator>): Map<K, CellStats> {
	const out = new Map<K, CellStats>()
	for (const [k, agg] of map) {
		out.set(k, {
			total: agg.total,
			correct: agg.correct,
			meanLatencyMs: agg.totalMs / agg.total
		})
	}
	return out
}

function buildAxes(attempts: ReadonlyArray<AttemptPoint>): {
	columns: ColumnDef[]
	rows: Difficulty[]
} {
	const presentSubTypes = new Set<SubTypeId>()
	const presentDifficulties = new Set<Difficulty>()
	for (const a of attempts) {
		presentSubTypes.add(a.subTypeId)
		presentDifficulties.add(a.difficulty)
	}
	const columns: ColumnDef[] = []
	for (const s of subTypes) {
		if (presentSubTypes.has(s.id)) {
			columns.push({ id: s.id, displayName: s.displayName })
		}
	}
	const rows: Difficulty[] = []
	for (const d of DIFFICULTY_ORDER) {
		if (presentDifficulties.has(d)) rows.push(d)
	}
	return { columns, rows }
}

function buildColumnKeys(
	columns: ReadonlyArray<ColumnDef>,
	rows: ReadonlyArray<Difficulty>,
	cells: ReadonlyMap<string, CellStats>
): Map<SubTypeId, ReadonlyArray<string>> {
	const out = new Map<SubTypeId, ReadonlyArray<string>>()
	for (const c of columns) {
		const keys: string[] = []
		for (const d of rows) {
			const k = makeKey(c.id, d)
			if (cells.has(k)) keys.push(k)
		}
		out.set(c.id, keys)
	}
	return out
}

function buildRowKeys(
	columns: ReadonlyArray<ColumnDef>,
	rows: ReadonlyArray<Difficulty>,
	cells: ReadonlyMap<string, CellStats>
): Map<Difficulty, ReadonlyArray<string>> {
	const out = new Map<Difficulty, ReadonlyArray<string>>()
	for (const d of rows) {
		const keys: string[] = []
		for (const c of columns) {
			const k = makeKey(c.id, d)
			if (cells.has(k)) keys.push(k)
		}
		out.set(d, keys)
	}
	return out
}

function buildMatrix(attempts: ReadonlyArray<AttemptPoint>): MatrixData {
	const { columns, rows } = buildAxes(attempts)

	const cellAgg = new Map<string, CellAccumulator>()
	const colAgg = new Map<SubTypeId, CellAccumulator>()
	for (const a of attempts) {
		accumulate(cellAgg, makeKey(a.subTypeId, a.difficulty), a)
		accumulate(colAgg, a.subTypeId, a)
	}
	const cells = finalizeCells(cellAgg)
	const columnAggregate = finalizeCells(colAgg)

	return {
		columns,
		rows,
		cells,
		columnAggregate,
		columnKeys: buildColumnKeys(columns, rows, cells),
		rowKeys: buildRowKeys(columns, rows, cells)
	}
}

function accuracyTintClass(stats: CellStats): string {
	const ratio = stats.correct / stats.total
	if (ratio >= 0.8) return "bg-good/10"
	if (ratio >= 0.5) return "bg-pace-warn/15"
	return "bg-destructive/10"
}

function allInSet(keys: ReadonlyArray<string>, set: ReadonlySet<string>): boolean {
	if (keys.length === 0) return false
	for (const k of keys) {
		if (!set.has(k)) return false
	}
	return true
}

function setEquals(keys: ReadonlyArray<string>, prev: ReadonlySet<string>): boolean {
	return keys.length === prev.size && allInSet(keys, prev)
}

function replaceSelection(keys: ReadonlyArray<string>, prev: ReadonlySet<string>): Set<string> {
	if (setEquals(keys, prev)) return new Set<string>()
	return new Set(keys)
}

function toggleSelection(keys: ReadonlyArray<string>, prev: ReadonlySet<string>): Set<string> {
	const next = new Set(prev)
	if (allInSet(keys, prev)) {
		for (const k of keys) next.delete(k)
		return next
	}
	for (const k of keys) next.add(k)
	return next
}

function isAdditiveEvent(event: React.MouseEvent): boolean {
	return event.metaKey || event.ctrlKey || event.shiftKey
}

interface CellButtonProps {
	stats: CellStats | undefined
	isSelected: boolean
	ariaLabel: string
	onClick: ((additive: boolean) => void) | undefined
}

function CellButton(props: CellButtonProps) {
	if (props.stats === undefined || props.onClick === undefined) {
		return (
			<div
				aria-hidden="true"
				className="flex h-full min-h-[36px] w-full items-center justify-center text-[12px] text-text-3"
			>
				—
			</div>
		)
	}
	const stats = props.stats
	const click = props.onClick
	const tintClass = accuracyTintClass(stats)
	const selectedClass = props.isSelected
		? "ring-1 ring-inset ring-cobalt bg-cobalt/[0.08]"
		: tintClass
	const seconds = `${(stats.meanLatencyMs / 1000).toFixed(1)}s`
	return (
		<button
			type="button"
			aria-label={props.ariaLabel}
			aria-pressed={props.isSelected}
			onClick={function onCellMouseClick(event) {
				click(isAdditiveEvent(event))
			}}
			className={cn(
				"flex h-full min-h-[36px] w-full flex-col items-center justify-center gap-[1px] rounded-[3px] px-1 py-1 text-text-1 transition-colors duration-150 ease-out hover:bg-cobalt/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1",
				selectedClass
			)}
		>
			<span className="font-medium text-[11px] tabular-nums leading-none">
				{stats.correct}/{stats.total}
			</span>
			<span className="text-[10px] text-text-3 tabular-nums leading-none">{seconds}</span>
		</button>
	)
}

interface ColumnHeaderProps {
	displayName: string
	isSelected: boolean
	onClick: (additive: boolean) => void
}

function ColumnHeader(props: ColumnHeaderProps) {
	const stateClass = props.isSelected
		? "bg-cobalt/[0.08] text-cobalt"
		: "text-text-2 hover:bg-lavender hover:text-text-1"
	return (
		<button
			type="button"
			aria-pressed={props.isSelected}
			onClick={function onColMouseClick(event) {
				props.onClick(isAdditiveEvent(event))
			}}
			className={cn(
				"flex h-full w-full items-end justify-center rounded-[3px] px-[2px] pt-1 pb-1 transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1",
				stateClass
			)}
		>
			<span className="inline-block rotate-180 whitespace-nowrap font-medium text-[10px] tracking-[0.01em] [writing-mode:vertical-rl]">
				{props.displayName}
			</span>
		</button>
	)
}

interface RowHeaderProps {
	label: string
	isSelected: boolean
	onClick: (additive: boolean) => void
}

function RowHeader(props: RowHeaderProps) {
	const stateClass = props.isSelected
		? "bg-cobalt/[0.08] text-cobalt"
		: "text-text-2 hover:bg-lavender hover:text-text-1"
	return (
		<button
			type="button"
			aria-pressed={props.isSelected}
			onClick={function onRowMouseClick(event) {
				props.onClick(isAdditiveEvent(event))
			}}
			className={cn(
				"flex h-full w-full items-center justify-end rounded-[3px] px-2 py-1 font-medium text-[11px] tracking-[0.01em] transition-colors duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1",
				stateClass
			)}
		>
			{props.label}
		</button>
	)
}

interface TimeSinkMatrixProps {
	attempts: ReadonlyArray<AttemptPoint>
	selectedKeys: ReadonlySet<string>
	onChange: (next: ReadonlySet<string>) => void
}

function TimeSinkMatrix(props: TimeSinkMatrixProps) {
	const matrix = React.useMemo(
		function memoMatrix() {
			return buildMatrix(props.attempts)
		},
		[props.attempts]
	)

	const onChange = props.onChange
	const selectedKeys = props.selectedKeys

	function applyKeys(keys: ReadonlyArray<string>, additive: boolean): void {
		if (keys.length === 0) return
		const next = additive
			? toggleSelection(keys, selectedKeys)
			: replaceSelection(keys, selectedKeys)
		onChange(next)
	}
	function handleColumnClick(subTypeId: SubTypeId, additive: boolean) {
		const keys = matrix.columnKeys.get(subTypeId)
		if (keys === undefined) return
		applyKeys(keys, additive)
	}
	function handleRowClick(d: Difficulty, additive: boolean) {
		const keys = matrix.rowKeys.get(d)
		if (keys === undefined) return
		applyKeys(keys, additive)
	}
	function handleAllClick() {
		if (selectedKeys.size === 0) return
		onChange(new Set<string>())
	}

	const columnSelected = new Map<SubTypeId, boolean>()
	for (const c of matrix.columns) {
		const keys = matrix.columnKeys.get(c.id)
		if (keys === undefined) {
			columnSelected.set(c.id, false)
			continue
		}
		columnSelected.set(c.id, allInSet(keys, selectedKeys))
	}
	const rowSelected = new Map<Difficulty, boolean>()
	for (const d of matrix.rows) {
		const keys = matrix.rowKeys.get(d)
		if (keys === undefined) {
			rowSelected.set(d, false)
			continue
		}
		rowSelected.set(d, allInSet(keys, selectedKeys))
	}
	const allSelected = selectedKeys.size === 0

	return (
		<div className="space-y-1.5" data-testid="post-session-time-sink-matrix">
			<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Filter by sub-type × difficulty
				</span>
				<span className="text-[10px] text-text-3">Click to focus · Cmd/Ctrl + click to add</span>
			</div>
			<div className="overflow-x-auto">
				<table
					className="w-full table-fixed border-separate border-spacing-[2px] text-text-2"
					aria-label="Performance by sub-type and difficulty"
				>
					<colgroup>
						<col className="w-[80px]" />
						{matrix.columns.map(function renderCol(col) {
							return <col key={`col-${col.id}`} className="w-auto min-w-[44px]" />
						})}
					</colgroup>
					<thead>
						<tr>
							<th className="h-[96px] p-0" />
							{matrix.columns.map(function renderColHeader(col) {
								const isSelected = columnSelected.get(col.id) === true
								return (
									<th key={`colhead-${col.id}`} scope="col" className="h-[96px] p-0 align-bottom">
										<ColumnHeader
											displayName={col.displayName}
											isSelected={isSelected}
											onClick={function onClick(additive) {
												handleColumnClick(col.id, additive)
											}}
										/>
									</th>
								)
							})}
						</tr>
					</thead>
					<tbody>
						<tr>
							<th scope="row" className="p-0">
								<RowHeader label="All" isSelected={allSelected} onClick={handleAllClick} />
							</th>
							{matrix.columns.map(function renderAllCell(col) {
								const stats = matrix.columnAggregate.get(col.id)
								const keys = matrix.columnKeys.get(col.id)
								const isSelected = columnSelected.get(col.id) === true
								let ariaLabel = `No attempts for ${col.displayName}`
								if (stats !== undefined) {
									ariaLabel = `All ${col.displayName}: ${stats.correct} of ${stats.total} correct, mean ${(stats.meanLatencyMs / 1000).toFixed(1)} seconds`
								}
								let click: ((additive: boolean) => void) | undefined
								if (stats !== undefined && keys !== undefined) {
									click = function onClick(additive) {
										applyKeys(keys, additive)
									}
								}
								return (
									<td key={`allcell-${col.id}`} className="p-0">
										<CellButton
											stats={stats}
											isSelected={isSelected}
											ariaLabel={ariaLabel}
											onClick={click}
										/>
									</td>
								)
							})}
						</tr>
						{matrix.rows.map(function renderRow(d) {
							const isRowSelected = rowSelected.get(d) === true
							return (
								<tr key={`row-${d}`}>
									<th scope="row" className="p-0">
										<RowHeader
											label={DIFFICULTY_LABEL[d]}
											isSelected={isRowSelected}
											onClick={function onClick(additive) {
												handleRowClick(d, additive)
											}}
										/>
									</th>
									{matrix.columns.map(function renderCell(col) {
										const key = makeKey(col.id, d)
										const stats = matrix.cells.get(key)
										const isSelected = selectedKeys.has(key)
										let ariaLabel = `No ${DIFFICULTY_LABEL[d]} attempts for ${col.displayName}`
										if (stats !== undefined) {
											ariaLabel = `${DIFFICULTY_LABEL[d]} ${col.displayName}: ${stats.correct} of ${stats.total} correct, mean ${(stats.meanLatencyMs / 1000).toFixed(1)} seconds`
										}
										let click: ((additive: boolean) => void) | undefined
										if (stats !== undefined) {
											click = function onClick(additive) {
												applyKeys([key], additive)
											}
										}
										return (
											<td key={`cell-${key}`} className="p-0">
												<CellButton
													stats={stats}
													isSelected={isSelected}
													ariaLabel={ariaLabel}
													onClick={click}
												/>
											</td>
										)
									})}
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}

export type { AttemptPoint, TimeSinkMatrixProps }
export { makeKey, TimeSinkMatrix }
