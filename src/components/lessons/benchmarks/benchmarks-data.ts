// Data for the Anchor Drill lesson.
//
// BENCHMARKS — the 19 fraction–decimal–percent rows the lesson covers.
// LINEAGE   — per-row derivation in the "anchor family tree":
//             root, halve, multiple, sum, or complement. Drives the
//             Show Lineage hint, the Halve It walkthrough, and the
//             Close Enough estimation tag.
// FAMILIES  — the three root lineages used by the Family Tree:
//             1/4 → 1/8 → 1/16, 1/3 → 1/6 → 1/12, 1/5 → 1/10 → 1/20.
// LEGO      — preset puzzles + the brick palette for the builder.
// helpers   — exact rational add/equals so brick sums never drift.

interface BenchmarkRow {
	num: number
	den: number
	decimal: string
	percent: string
}

const BENCHMARKS: ReadonlyArray<BenchmarkRow> = [
	{ num: 1, den: 2, decimal: "0.5", percent: "50%" },
	{ num: 1, den: 3, decimal: "0.333…", percent: "33.33%" },
	{ num: 2, den: 3, decimal: "0.666…", percent: "66.67%" },
	{ num: 1, den: 4, decimal: "0.25", percent: "25%" },
	{ num: 3, den: 4, decimal: "0.75", percent: "75%" },
	{ num: 1, den: 5, decimal: "0.2", percent: "20%" },
	{ num: 2, den: 5, decimal: "0.4", percent: "40%" },
	{ num: 3, den: 5, decimal: "0.6", percent: "60%" },
	{ num: 4, den: 5, decimal: "0.8", percent: "80%" },
	{ num: 1, den: 6, decimal: "0.166…", percent: "16.67%" },
	{ num: 5, den: 6, decimal: "0.833…", percent: "83.33%" },
	{ num: 1, den: 8, decimal: "0.125", percent: "12.5%" },
	{ num: 3, den: 8, decimal: "0.375", percent: "37.5%" },
	{ num: 5, den: 8, decimal: "0.625", percent: "62.5%" },
	{ num: 7, den: 8, decimal: "0.875", percent: "87.5%" },
	{ num: 1, den: 10, decimal: "0.1", percent: "10%" },
	{ num: 1, den: 12, decimal: "0.0833…", percent: "8.33%" },
	{ num: 1, den: 16, decimal: "0.0625", percent: "6.25%" },
	{ num: 1, den: 20, decimal: "0.05", percent: "5%" }
]

interface LineageStep {
	label: string
	percent: string
	op?: string
}

interface ParentRef {
	num: number
	den: number
	percent: string
}

interface Lineage {
	steps: ReadonlyArray<LineageStep>
	parent?: ParentRef
	closeTo?: string
	rootLabel: string
}

const LINEAGE: Record<string, Lineage> = {
	"1-2": {
		steps: [{ label: "1/2", percent: "50%" }],
		rootLabel: "Half — the original anchor"
	},
	"1-3": {
		steps: [{ label: "1/3", percent: "33.33%" }],
		rootLabel: "Root anchor"
	},
	"1-4": {
		steps: [{ label: "1/4", percent: "25%" }],
		rootLabel: "Root anchor"
	},
	"1-5": {
		steps: [{ label: "1/5", percent: "20%" }],
		rootLabel: "Root anchor"
	},
	"1-8": {
		steps: [
			{ label: "1/4", percent: "25%" },
			{ label: "1/8", percent: "12.5%", op: "÷ 2" }
		],
		parent: { num: 1, den: 4, percent: "25%" },
		closeTo: "Just over 10%",
		rootLabel: "Quarters lineage"
	},
	"1-16": {
		steps: [
			{ label: "1/4", percent: "25%" },
			{ label: "1/8", percent: "12.5%", op: "÷ 2" },
			{ label: "1/16", percent: "6.25%", op: "÷ 2" }
		],
		parent: { num: 1, den: 8, percent: "12.5%" },
		closeTo: "A hair over 6%",
		rootLabel: "Quarters lineage"
	},
	"1-6": {
		steps: [
			{ label: "1/3", percent: "33.33%" },
			{ label: "1/6", percent: "16.67%", op: "÷ 2" }
		],
		parent: { num: 1, den: 3, percent: "33.33%" },
		closeTo: "Halfway between 15% and 20%",
		rootLabel: "Thirds lineage"
	},
	"1-12": {
		steps: [
			{ label: "1/3", percent: "33.33%" },
			{ label: "1/6", percent: "16.67%", op: "÷ 2" },
			{ label: "1/12", percent: "8.33%", op: "÷ 2" }
		],
		parent: { num: 1, den: 6, percent: "16.67%" },
		closeTo: "Just under 10%",
		rootLabel: "Thirds lineage"
	},
	"1-10": {
		steps: [
			{ label: "1/5", percent: "20%" },
			{ label: "1/10", percent: "10%", op: "÷ 2" }
		],
		parent: { num: 1, den: 5, percent: "20%" },
		rootLabel: "Fifths lineage"
	},
	"1-20": {
		steps: [
			{ label: "1/5", percent: "20%" },
			{ label: "1/10", percent: "10%", op: "÷ 2" },
			{ label: "1/20", percent: "5%", op: "÷ 2" }
		],
		parent: { num: 1, den: 10, percent: "10%" },
		rootLabel: "Fifths lineage"
	},
	"2-3": {
		steps: [
			{ label: "1/3", percent: "33.33%" },
			{ label: "2/3", percent: "66.67%", op: "× 2" }
		],
		closeTo: "1 minus 1/3",
		rootLabel: "Multiple of 1/3"
	},
	"3-4": {
		steps: [
			{ label: "1/4", percent: "25%" },
			{ label: "3/4", percent: "75%", op: "1 −" }
		],
		closeTo: "1 minus 1/4",
		rootLabel: "Complement of 1/4"
	},
	"2-5": {
		steps: [
			{ label: "1/5", percent: "20%" },
			{ label: "2/5", percent: "40%", op: "× 2" }
		],
		rootLabel: "Multiple of 1/5"
	},
	"3-5": {
		steps: [
			{ label: "1/5", percent: "20%" },
			{ label: "3/5", percent: "60%", op: "× 3" }
		],
		rootLabel: "Multiple of 1/5"
	},
	"4-5": {
		steps: [
			{ label: "1/5", percent: "20%" },
			{ label: "4/5", percent: "80%", op: "1 −" }
		],
		closeTo: "1 minus 1/5",
		rootLabel: "Complement of 1/5"
	},
	"5-6": {
		steps: [
			{ label: "1/2 + 1/3", percent: "50% + 33.33%" },
			{ label: "5/6", percent: "83.33%", op: "sum" }
		],
		closeTo: "1 minus 1/6",
		rootLabel: "Half plus a third"
	},
	"3-8": {
		steps: [
			{ label: "1/4 + 1/8", percent: "25% + 12.5%" },
			{ label: "3/8", percent: "37.5%", op: "sum" }
		],
		closeTo: "Between 1/3 and 1/2",
		rootLabel: "Quarter plus an eighth"
	},
	"5-8": {
		steps: [
			{ label: "1/2 + 1/8", percent: "50% + 12.5%" },
			{ label: "5/8", percent: "62.5%", op: "sum" }
		],
		closeTo: "Between 1/2 and 2/3",
		rootLabel: "Half plus an eighth"
	},
	"7-8": {
		steps: [
			{ label: "1/2 + 1/4 + 1/8", percent: "50% + 25% + 12.5%" },
			{ label: "7/8", percent: "87.5%", op: "sum" }
		],
		closeTo: "1 minus 1/8",
		rootLabel: "All three quarters lineage parts"
	}
}

interface FamilyMember {
	num: number
	den: number
	percent: string
	decimal: string
}

interface FamilyDefinition {
	id: "quarters" | "thirds" | "fifths"
	title: string
	subtitle: string
	accent: string
	tint: string
	rows: ReadonlyArray<FamilyMember>
}

const FAMILIES: ReadonlyArray<FamilyDefinition> = [
	{
		id: "quarters",
		title: "The Quarters",
		subtitle: "Halve, halve again",
		accent: "text-cobalt",
		tint: "bg-cobalt",
		rows: [
			{ num: 1, den: 4, percent: "25%", decimal: "0.25" },
			{ num: 1, den: 8, percent: "12.5%", decimal: "0.125" },
			{ num: 1, den: 16, percent: "6.25%", decimal: "0.0625" }
		]
	},
	{
		id: "thirds",
		title: "The Thirds",
		subtitle: "Repeating decimals",
		accent: "text-alpha-accent",
		tint: "bg-alpha-accent",
		rows: [
			{ num: 1, den: 3, percent: "33.33%", decimal: "0.333…" },
			{ num: 1, den: 6, percent: "16.67%", decimal: "0.166…" },
			{ num: 1, den: 12, percent: "8.33%", decimal: "0.0833…" }
		]
	},
	{
		id: "fifths",
		title: "The Fifths",
		subtitle: "Cleanest of all",
		accent: "text-indigo-deep",
		tint: "bg-indigo-deep",
		rows: [
			{ num: 1, den: 5, percent: "20%", decimal: "0.2" },
			{ num: 1, den: 10, percent: "10%", decimal: "0.1" },
			{ num: 1, den: 20, percent: "5%", decimal: "0.05" }
		]
	}
]

interface Brick {
	num: number
	den: number
	percent: string
	tint: string
}

const BRICK_PALETTE: ReadonlyArray<Brick> = [
	{ num: 1, den: 2, percent: "50%", tint: "border-cobalt text-cobalt" },
	{ num: 1, den: 3, percent: "33.33%", tint: "border-alpha-accent text-alpha-accent" },
	{ num: 1, den: 4, percent: "25%", tint: "border-cobalt text-cobalt" },
	{ num: 1, den: 5, percent: "20%", tint: "border-indigo-deep text-indigo-deep" },
	{ num: 1, den: 6, percent: "16.67%", tint: "border-alpha-accent text-alpha-accent" },
	{ num: 1, den: 8, percent: "12.5%", tint: "border-cobalt text-cobalt" },
	{ num: 1, den: 10, percent: "10%", tint: "border-indigo-deep text-indigo-deep" },
	{ num: 1, den: 12, percent: "8.33%", tint: "border-alpha-accent text-alpha-accent" }
]

interface LegoPuzzle {
	num: number
	den: number
	percent: string
	hint: string
	solution: ReadonlyArray<{ num: number; den: number }>
}

const LEGO_PUZZLES: ReadonlyArray<LegoPuzzle> = [
	{
		num: 3,
		den: 4,
		percent: "75%",
		hint: "Half + a quarter",
		solution: [
			{ num: 1, den: 2 },
			{ num: 1, den: 4 }
		]
	},
	{
		num: 3,
		den: 8,
		percent: "37.5%",
		hint: "A quarter + an eighth",
		solution: [
			{ num: 1, den: 4 },
			{ num: 1, den: 8 }
		]
	},
	{
		num: 5,
		den: 8,
		percent: "62.5%",
		hint: "Half + an eighth",
		solution: [
			{ num: 1, den: 2 },
			{ num: 1, den: 8 }
		]
	},
	{
		num: 7,
		den: 8,
		percent: "87.5%",
		hint: "Half + a quarter + an eighth",
		solution: [
			{ num: 1, den: 2 },
			{ num: 1, den: 4 },
			{ num: 1, den: 8 }
		]
	},
	{
		num: 5,
		den: 6,
		percent: "83.33%",
		hint: "Half + a third",
		solution: [
			{ num: 1, den: 2 },
			{ num: 1, den: 3 }
		]
	},
	{
		num: 2,
		den: 3,
		percent: "66.67%",
		hint: "A third twice",
		solution: [
			{ num: 1, den: 3 },
			{ num: 1, den: 3 }
		]
	},
	{
		num: 3,
		den: 5,
		percent: "60%",
		hint: "Three fifths — stack the unit",
		solution: [
			{ num: 1, den: 5 },
			{ num: 1, den: 5 },
			{ num: 1, den: 5 }
		]
	},
	{
		num: 4,
		den: 5,
		percent: "80%",
		hint: "Half + a fifth + a tenth",
		solution: [
			{ num: 1, den: 2 },
			{ num: 1, den: 5 },
			{ num: 1, den: 10 }
		]
	}
]

function rowKey(row: { num: number; den: number }): string {
	return `${row.num}-${row.den}`
}

function rowFraction(row: { num: number; den: number }): string {
	return `${row.num}/${row.den}`
}

function gcd(a: number, b: number): number {
	let x = Math.abs(Math.trunc(a))
	let y = Math.abs(Math.trunc(b))
	while (y !== 0) {
		const t = y
		y = x % y
		x = t
	}
	if (x === 0) return 1
	return x
}

function reduce(num: number, den: number): { num: number; den: number } {
	const g = gcd(num, den)
	return { num: num / g, den: den / g }
}

function addFraction(
	a: { num: number; den: number },
	b: { num: number; den: number }
): { num: number; den: number } {
	return reduce(a.num * b.den + b.num * a.den, a.den * b.den)
}

function sumFractions(
	parts: ReadonlyArray<{ num: number; den: number }>
): { num: number; den: number } {
	let acc = { num: 0, den: 1 }
	for (const p of parts) {
		acc = addFraction(acc, p)
	}
	return acc
}

function fractionsEqual(
	a: { num: number; den: number },
	b: { num: number; den: number }
): boolean {
	return a.num * b.den === b.num * a.den
}

function compareFraction(
	a: { num: number; den: number },
	b: { num: number; den: number }
): -1 | 0 | 1 {
	const left = a.num * b.den
	const right = b.num * a.den
	if (left < right) return -1
	if (left > right) return 1
	return 0
}

function fractionToDisplayPercent(f: { num: number; den: number }): string {
	const v = (f.num * 100) / f.den
	if (Number.isInteger(v)) return `${v}%`
	return `${v.toFixed(2).replace(/\.?0+$/, "")}%`
}

export type {
	BenchmarkRow,
	Brick,
	FamilyDefinition,
	FamilyMember,
	LegoPuzzle,
	Lineage,
	LineageStep,
	ParentRef
}
export {
	addFraction,
	BENCHMARKS,
	BRICK_PALETTE,
	compareFraction,
	FAMILIES,
	fractionsEqual,
	fractionToDisplayPercent,
	gcd,
	LEGO_PUZZLES,
	LINEAGE,
	reduce,
	rowFraction,
	rowKey,
	sumFractions
}
