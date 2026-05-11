"use client"

// Lego Builder.
//
// Cycles through "odd multiple" puzzles — fractions like 3/8, 7/8,
// 5/6 that aren't roots and aren't single halvings, but sum cleanly
// from anchors. Tap a brick in the palette to push it onto the
// workbench; tap a placed brick to remove it. The running sum is
// computed in exact rational arithmetic so 1/3 + 1/3 = 2/3 cleanly.
// When sum equals target, the panel turns green. Skip cycles forward,
// Reveal autofills the canonical solution.

import * as React from "react"
import {
	type Brick,
	BRICK_PALETTE,
	type LegoPuzzle,
	LEGO_PUZZLES,
	compareFraction,
	fractionsEqual,
	fractionToDisplayPercent,
	rowFraction,
	sumFractions
} from "@/components/lessons/benchmarks/benchmarks-data"

function LegoBuilder() {
	const [puzzleIndex, setPuzzleIndex] = React.useState(0)
	const puzzle = LEGO_PUZZLES[puzzleIndex]
	if (!puzzle) return null
	function nextPuzzle() {
		setPuzzleIndex(function step(prev) {
			return (prev + 1) % LEGO_PUZZLES.length
		})
	}
	return <PuzzleBoard key={puzzleIndex} puzzle={puzzle} onNextPuzzle={nextPuzzle} />
}

interface PuzzleBoardProps {
	puzzle: LegoPuzzle
	onNextPuzzle: () => void
}
function PuzzleBoard({ puzzle, onNextPuzzle }: PuzzleBoardProps) {
	const [placed, setPlaced] = React.useState<ReadonlyArray<Brick>>([])

	const target = { num: puzzle.num, den: puzzle.den }
	const sum = sumFractions(
		placed.map(function asFrac(b) {
			return { num: b.num, den: b.den }
		})
	)
	const built = placed.length > 0 && fractionsEqual(sum, target)
	const overshot = compareFraction(sum, target) === 1
	const sumPercent = fractionToDisplayPercent(sum)
	const targetPercent = puzzle.percent

	function addBrick(brick: Brick) {
		if (built) return
		setPlaced(function push(prev) {
			return [...prev, brick]
		})
	}
	function removeBrickAt(idx: number) {
		setPlaced(function rm(prev) {
			const next = prev.slice()
			next.splice(idx, 1)
			return next
		})
	}
	function revealSolution() {
		const solutionBricks: Array<Brick> = []
		for (const part of puzzle.solution) {
			const match = BRICK_PALETTE.find(function eq(b) {
				return b.num === part.num && b.den === part.den
			})
			if (!match) continue
			solutionBricks.push(match)
		}
		setPlaced(solutionBricks)
	}

	let statusCopy = "Add bricks until they sum to the target."
	let statusTone = "text-text-3"
	if (built) {
		statusCopy = "Built. The bricks sum exactly to the target."
		statusTone = "text-good"
	} else if (overshot) {
		statusCopy = "Overshot. Tap a placed brick to remove it."
		statusTone = "text-pace-over"
	} else if (placed.length > 0) {
		statusCopy = "Keep stacking — close, but not quite."
		statusTone = "text-text-2"
	}

	let totalTone = "text-text-1"
	if (built) totalTone = "text-good"
	else if (overshot) totalTone = "text-pace-over"

	return (
		<section className="mb-4 overflow-hidden rounded-lg border border-border-soft bg-surface">
			<div className="border-border-soft border-b px-5 py-3">
				<p className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Lego builder
				</p>
				<p className="mt-0.5 text-[13px] text-text-2">
					Snap anchor "bricks" together to build the trickier fractions. Sum is exact —
					no rounding.
				</p>
			</div>
			<div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 px-5 py-5 sm:gap-5">
				<TargetCard puzzle={puzzle} />
				<WorkbenchCard
					placed={placed}
					sumPercent={sumPercent}
					targetPercent={targetPercent}
					statusCopy={statusCopy}
					statusTone={statusTone}
					totalTone={totalTone}
					built={built}
					onRemove={removeBrickAt}
				/>
			</div>
			<Palette built={built} onAdd={addBrick} />
			<div className="flex flex-wrap items-center justify-between gap-2 border-border-soft border-t px-5 py-3">
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={function clear() {
							setPlaced([])
						}}
						disabled={placed.length === 0}
						className="rounded-md border border-border-strong bg-surface px-3 py-1.5 font-medium text-[13px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40"
					>
						Clear
					</button>
					<button
						type="button"
						onClick={revealSolution}
						disabled={built}
						className="rounded-md border border-border-strong bg-surface px-3 py-1.5 font-medium text-[13px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40"
					>
						Show solution
					</button>
				</div>
				<button
					type="button"
					onClick={onNextPuzzle}
					className="rounded-md border border-text-1 bg-text-1 px-4 py-1.5 font-medium text-[13px] text-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				>
					Next puzzle →
				</button>
			</div>
		</section>
	)
}

interface TargetCardProps {
	puzzle: LegoPuzzle
}
function TargetCard({ puzzle }: TargetCardProps) {
	return (
		<div className="rounded-md border border-border-soft bg-bg p-4 text-center">
			<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">Target</p>
			<p className="mt-1 font-mono font-semibold text-[40px] text-text-1 leading-none">
				{rowFraction({ num: puzzle.num, den: puzzle.den })}
			</p>
			<p className="mt-1 font-mono font-semibold text-[18px] text-cobalt leading-none">
				{puzzle.percent}
			</p>
			<p className="mt-3 text-[12px] text-text-2 italic">{puzzle.hint}</p>
		</div>
	)
}

interface WorkbenchCardProps {
	placed: ReadonlyArray<Brick>
	sumPercent: string
	targetPercent: string
	statusCopy: string
	statusTone: string
	totalTone: string
	built: boolean
	onRemove: (idx: number) => void
}
function WorkbenchCard({
	placed,
	sumPercent,
	targetPercent,
	statusCopy,
	statusTone,
	totalTone,
	built,
	onRemove
}: WorkbenchCardProps) {
	let frameTone = "border-border-soft bg-bg"
	if (built) frameTone = "border-good bg-good/10"

	return (
		<div className={`flex flex-col rounded-md border p-4 ${frameTone}`}>
			<div className="flex items-baseline justify-between">
				<p className="font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">
					Workbench
				</p>
				<p className="font-mono text-[12px] text-text-3">
					<span className={`font-semibold tabular-nums ${totalTone}`}>{sumPercent}</span>
					<span className="text-text-3"> / {targetPercent}</span>
				</p>
			</div>
			<div className="mt-2 flex min-h-[68px] flex-wrap items-start gap-2">
				{placed.length === 0 ? (
					<p className="my-auto w-full text-center text-[12px] text-text-3 italic">
						Empty — tap a brick below to add it here.
					</p>
				) : (
					placed.map(function renderPlaced(brick, idx) {
						const key = `${brick.num}-${brick.den}-${idx}`
						return (
							<button
								type="button"
								key={key}
								onClick={function rm() {
									onRemove(idx)
								}}
								disabled={built}
								aria-label={`Remove ${rowFraction(brick)} brick`}
								className={`group fade-in flex animate-in flex-col items-center rounded-md border-2 bg-surface px-3 py-2 transition-colors duration-200 hover:border-pace-over focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:cursor-default disabled:hover:border-current ${brick.tint}`}
							>
								<span className="font-mono font-semibold text-[16px]">{brick.percent}</span>
								<span className="font-mono text-[10px] text-text-3">
									{rowFraction(brick)}
								</span>
							</button>
						)
					})
				)}
			</div>
			<p className={`mt-3 font-medium text-[12px] ${statusTone}`}>{statusCopy}</p>
		</div>
	)
}

interface PaletteProps {
	built: boolean
	onAdd: (brick: Brick) => void
}
function Palette({ built, onAdd }: PaletteProps) {
	return (
		<div className="border-border-soft border-t px-5 py-4">
			<p className="mb-2 font-semibold text-[10px] text-text-3 uppercase tracking-[0.08em]">
				Bricks
			</p>
			<div className="grid grid-cols-8 gap-2">
				{BRICK_PALETTE.map(function renderBrick(brick) {
					const key = `${brick.num}-${brick.den}`
					return (
						<button
							type="button"
							key={key}
							onClick={function add() {
								onAdd(brick)
							}}
							disabled={built}
							aria-label={`Add ${rowFraction(brick)} brick`}
							className={`flex flex-col items-center rounded-md border-2 bg-bg px-2 py-2 transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40 disabled:hover:translate-y-0 ${brick.tint}`}
						>
							<span className="font-mono font-semibold text-[14px]">{brick.percent}</span>
							<span className="font-mono text-[10px] text-text-3">{rowFraction(brick)}</span>
						</button>
					)
				})}
			</div>
		</div>
	)
}

export { LegoBuilder }
