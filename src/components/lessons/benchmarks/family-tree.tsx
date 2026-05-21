"use client"

// Family Tree visual.
//
// Three columns — Quarters, Thirds, Fifths. Each column starts with
// only its Root card visible. Click anywhere in the column (the column
// itself is the button) to reveal the next generation by halving the
// current bottom card. A connecting line + "÷ 2" tag slots in between
// generations and fades in on reveal. Reset collapses all three back
// to roots.
//
// This is a study surface, not a graded one — no mastery wiring.

import * as React from "react"
import {
	type FamilyDefinition,
	type FamilyMember,
	FAMILIES,
	rowFraction
} from "@/components/lessons/benchmarks/benchmarks-data"

type GenMap = Record<FamilyDefinition["id"], number>

const INITIAL_GEN: GenMap = { quarters: 1, thirds: 1, fifths: 1 }
const FULL_GEN: GenMap = { quarters: 3, thirds: 3, fifths: 3 }

function FamilyTree() {
	const [generations, setGenerations] = React.useState<GenMap>(INITIAL_GEN)
	const allFull =
		generations.quarters === 3 && generations.thirds === 3 && generations.fifths === 3
	const allRoot =
		generations.quarters === 1 && generations.thirds === 1 && generations.fifths === 1

	function advance(id: FamilyDefinition["id"]) {
		setGenerations(function step(prev) {
			const current = prev[id]
			if (current >= 3) return prev
			return { ...prev, [id]: current + 1 }
		})
	}
	return (
		<section className="mb-4 overflow-hidden rounded-lg border border-border-soft bg-surface">
			<div className="border-border-soft border-b px-5 py-3">
				<p className="font-semibold text-[11px] text-text-3 uppercase tracking-[0.06em]">
					The anchor family tree
				</p>
				<p className="mt-0.5 text-[13px] text-text-2">
					Three roots — <span className="font-mono text-text-1">1/4</span>,{" "}
					<span className="font-mono text-text-1">1/3</span>,{" "}
					<span className="font-mono text-text-1">1/5</span>. Tap a column to halve
					the bottom card. Two halves down covers the hardest CCAT anchors.
				</p>
			</div>
			<div className="grid grid-cols-1 gap-6 px-5 py-6 sm:grid-cols-3 sm:gap-3">
				{FAMILIES.map(function renderColumn(family) {
					const gen = generations[family.id]
					return (
						<FamilyColumn
							key={family.id}
							family={family}
							generation={gen}
							onAdvance={function go() {
								advance(family.id)
							}}
						/>
					)
				})}
			</div>
			<div className="flex flex-wrap justify-end gap-2 border-border-soft border-t px-5 py-3">
				<button
					type="button"
					onClick={function expand() {
						setGenerations(FULL_GEN)
					}}
					disabled={allFull}
					className="rounded-md border border-border-strong bg-surface px-4 py-2 font-medium text-[13px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40"
				>
					Expand all
				</button>
				<button
					type="button"
					onClick={function collapse() {
						setGenerations(INITIAL_GEN)
					}}
					disabled={allRoot}
					className="rounded-md border border-border-strong bg-surface px-4 py-2 font-medium text-[13px] text-text-1 transition-colors hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40"
				>
					Reset
				</button>
			</div>
		</section>
	)
}

interface FamilyColumnProps {
	family: FamilyDefinition
	generation: number
	onAdvance: () => void
}
function FamilyColumn({ family, generation, onAdvance }: FamilyColumnProps) {
	const root = family.rows[0]
	const child = family.rows[1]
	const grand = family.rows[2]
	if (!root || !child || !grand) return null

	const canAdvance = generation < 3
	let cta = ""
	if (generation === 1) cta = "Tap to halve →"
	else if (generation === 2) cta = "Halve again →"
	else cta = "Lineage complete"

	let ctaTone = "text-text-3"
	if (canAdvance) ctaTone = family.accent

	return (
		<button
			type="button"
			onClick={onAdvance}
			disabled={!canAdvance}
			aria-label={`${family.title}: reveal next halving`}
			className="group flex flex-col items-center rounded-md border border-border-soft bg-bg p-3 text-left transition-colors hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 disabled:cursor-default disabled:hover:border-border-soft"
		>
			<header className="mb-3 flex w-full items-baseline justify-between">
				<p className={`font-semibold text-[12px] uppercase tracking-[0.06em] ${family.accent}`}>
					{family.title}
				</p>
				<p className="text-[10px] text-text-3 uppercase tracking-[0.06em]">{family.subtitle}</p>
			</header>
			<TreeCard row={root} variant="root" tint={family.tint} accent={family.accent} />
			{generation >= 2 ? (
				<>
					<HalveConnector tint={family.tint} />
					<TreeCard row={child} variant="child" tint={family.tint} accent={family.accent} />
				</>
			) : null}
			{generation >= 3 ? (
				<>
					<HalveConnector tint={family.tint} />
					<TreeCard row={grand} variant="grand" tint={family.tint} accent={family.accent} />
				</>
			) : null}
			<p className={`mt-3 font-semibold text-[11px] uppercase tracking-[0.08em] ${ctaTone}`}>
				{cta}
			</p>
		</button>
	)
}

interface TreeCardProps {
	row: FamilyMember
	variant: "root" | "child" | "grand"
	tint: string
	accent: string
}
function TreeCard({ row, variant, tint, accent }: TreeCardProps) {
	let cardSize = "w-32 px-3 py-3"
	let fractionSize = "text-[26px]"
	let percentSize = "text-[16px]"
	if (variant === "child") {
		cardSize = "w-28 px-3 py-2.5"
		fractionSize = "text-[22px]"
		percentSize = "text-[14px]"
	} else if (variant === "grand") {
		cardSize = "w-24 px-2.5 py-2"
		fractionSize = "text-[18px]"
		percentSize = "text-[12px]"
	}

	let containerClass =
		"flex animate-in flex-col items-center fade-in duration-300 slide-in-from-top-2"
	if (variant === "root") containerClass = "flex flex-col items-center"

	return (
		<div className={containerClass}>
			{variant === "root" ? (
				<span
					className={`mb-1 rounded-full ${tint} px-2 py-0.5 font-semibold text-[10px] text-bg uppercase tracking-[0.06em]`}
				>
					Root
				</span>
			) : null}
			<div
				className={`flex flex-col items-center rounded-md border border-border-strong bg-surface text-center ${cardSize}`}
			>
				<p className={`font-mono font-semibold text-text-1 leading-tight ${fractionSize}`}>
					{rowFraction(row)}
				</p>
				<p className={`font-mono font-semibold leading-tight ${accent} ${percentSize}`}>
					{row.percent}
				</p>
				<p className="mt-0.5 font-mono text-[10px] text-text-3">{row.decimal}</p>
			</div>
		</div>
	)
}

interface HalveConnectorProps {
	tint: string
}
function HalveConnector({ tint }: HalveConnectorProps) {
	return (
		<div className="fade-in flex h-10 w-full animate-in items-center justify-center duration-300">
			<svg
				viewBox="0 0 60 40"
				role="presentation"
				focusable="false"
				className="block h-full w-12"
				aria-hidden="true"
			>
				<title>Halving step</title>
				<line
					x1={30}
					y1={2}
					x2={30}
					y2={38}
					strokeWidth={2}
					strokeDasharray="3 3"
					className="stroke-border-strong"
				/>
				<rect x={12} y={14} width={36} height={14} rx={6} className={tint} />
				<text
					x={30}
					y={24}
					textAnchor="middle"
					className="fill-bg font-mono font-semibold text-[10px]"
				>
					÷ 2
				</text>
			</svg>
		</div>
	)
}

export { FamilyTree }
