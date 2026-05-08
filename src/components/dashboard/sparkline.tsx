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

interface SparklineProps {
	/** Length-5 array of values, OLDEST-TO-NEWEST. Missing slots are
	 * undefined. */
	data: ReadonlyArray<number | undefined>
	/** Visible label for screen readers (e.g. "Previous score history"). */
	label: string
}

function Sparkline({ data, label }: SparklineProps) {
	const definedValues = data
		.filter(function isDefined(v): v is number {
			return v !== undefined
		})
		.map(function abs(v) {
			return v
		})
	const max = definedValues.length === 0 ? 1 : Math.max(...definedValues, 1)
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
			className="mt-2 h-[22px] w-full"
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
		</svg>
	)
}

export type { SparklineProps }
export { Sparkline }
