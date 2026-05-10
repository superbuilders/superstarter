// <Sparkline> — 5-bar SVG mini-chart for the rebuilt <ScoreStrip>'s
// Previous Score + Previous Pace tiles. Practice round commit 9.
//
// Mirrors <PaceMetric>'s SVG-bar shape but with 5 bars instead of 7.
// <PaceMetric> deletes at commit 10's atomic prune; this is its
// successor for sparkline-style sim-history visualization in the
// new top panel.
//
// **Data shape:** ReadonlyArray<number | undefined> length 5,
// OLDEST-TO-NEWEST. Undefined slots render at minimum-height with
// the pale fill (visual placeholder for "no sim here yet"). Defined
// slots render with normal fill, normalized against the array's max
// (or 1 if all undefined/zero).
//
// **Today highlight:** the LAST defined slot (newest sim) renders
// in cobalt; earlier slots use alpha-accent. Empty (undefined) slots
// always use pale.
//
// **Reference line (Round 1 commit 2):** when a `referenceLine` prop
// is provided, a horizontal dashed cobalt line renders at the
// reference value's normalized height (Previous Score: user's goal;
// Previous Pace: 18s CCAT target). The reference value is included
// in the chart's max (`computeChartMax`) so the line is always within
// bounds. The line carries its own aria-label per ALPHA_DESIGN §9
// (alt text describes information, not image).
//
// Pure presentational server component. No "use client". Same
// SVG-with-attributes pattern as <BeltRow>'s progress bar +
// <PaceMetric>'s bars (per gritql/no-inline-style.grit ban on
// runtime-derived inline styles).

const CHART_VIEW_HEIGHT = 22
const CHART_VIEW_WIDTH = 100
const BAR_GAP = 2
const BAR_COUNT = 5
const BAR_WIDTH = (CHART_VIEW_WIDTH - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT
const MIN_BAR_HEIGHT = 1

interface ReferenceLine {
	value: number
	ariaLabel: string
}

interface SparklineProps {
	/** Length-5 array of values, OLDEST-TO-NEWEST. Missing slots are
	 * undefined. */
	data: ReadonlyArray<number | undefined>
	/** Visible label for screen readers (e.g. "Previous score history"). */
	label: string
	/** Optional horizontal reference line. When provided, the value is
	 * included in the chart's max so the line is always visible within
	 * bounds; the dashed cobalt line carries its own ariaLabel. */
	referenceLine?: ReferenceLine
}

function computeChartMax(definedValues: number[], referenceLine: ReferenceLine | undefined): number {
	const candidates: number[] = [1, ...definedValues]
	if (referenceLine !== undefined) {
		candidates.push(referenceLine.value)
	}
	return Math.max(...candidates)
}

function buildReferenceLineElement(referenceLine: ReferenceLine, max: number) {
	const referenceY = CHART_VIEW_HEIGHT - (referenceLine.value / max) * CHART_VIEW_HEIGHT
	return (
		<line
			x1={0}
			x2={CHART_VIEW_WIDTH}
			y1={referenceY}
			y2={referenceY}
			strokeWidth={1}
			strokeDasharray="2 2"
			vectorEffect="non-scaling-stroke"
			aria-label={referenceLine.ariaLabel}
			className="stroke-cobalt opacity-60"
		/>
	)
}

function Sparkline({ data, label, referenceLine }: SparklineProps) {
	const definedValues = data
		.filter(function isDefined(v): v is number {
			return v !== undefined
		})
		.map(function abs(v) {
			return v
		})
	const max = computeChartMax(definedValues, referenceLine)
	// Newest (last defined) slot index, for the cobalt highlight.
	let newestDefinedIdx = -1
	for (let i = data.length - 1; i >= 0; i--) {
		if (data[i] !== undefined) {
			newestDefinedIdx = i
			break
		}
	}
	return (
		<svg
			viewBox={`0 0 ${CHART_VIEW_WIDTH} ${CHART_VIEW_HEIGHT}`}
			preserveAspectRatio="none"
			role="img"
			aria-label={label}
			className="h-[22px] w-full"
		>
			{data.map(function renderBar(value, i) {
				const isDefined = value !== undefined
				const proportion = isDefined && max > 0 ? value / max : 0
				const fullBar = proportion * CHART_VIEW_HEIGHT
				const barHeight = fullBar < MIN_BAR_HEIGHT ? MIN_BAR_HEIGHT : fullBar
				const x = i * (BAR_WIDTH + BAR_GAP)
				const y = CHART_VIEW_HEIGHT - barHeight
				const fillClass = !isDefined
					? "fill-pale"
					: i === newestDefinedIdx
						? "fill-cobalt"
						: "fill-alpha-accent"
				return (
					<rect
						key={i}
						x={x}
						y={y}
						width={BAR_WIDTH}
						height={barHeight}
						rx={1}
						className={fillClass}
					/>
				)
			})}
			{referenceLine !== undefined && buildReferenceLineElement(referenceLine, max)}
		</svg>
	)
}

export type { SparklineProps }
export { Sparkline }
