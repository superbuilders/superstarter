// Coarse "X ago" formatter for the dashboard's <BeltRow> last-drilled
// column. Granularity matches the user spec ("1 hour ago, 1 day ago,
// 3 days ago, etc.") with a "Just now" floor so the column doesn't
// flap between "0m ago" and "1m ago" right after a drill.
//
// Pure function over (pastMs, nowMs); no Date.now() calls inside the
// formatter so the caller controls the clock (important for tests +
// for the React render path, where the clock is read once per render
// rather than re-resolved per row).
//
// Sub-types the user has never drilled don't pass through here — the
// caller renders "Never" directly when lastAttemptedAtMs is undefined.

const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS
const MONTH_MS = 30 * DAY_MS
const YEAR_MS = 365 * DAY_MS

interface Bucket {
	maxDiffMs: number
	unitMs: number
	singular: string
	plural: string
}

// Ordered ascending by maxDiffMs. The first bucket whose maxDiffMs
// strictly exceeds the elapsed diff wins. The final bucket is
// open-ended via Number.POSITIVE_INFINITY.
const BUCKETS: ReadonlyArray<Bucket> = [
	{ maxDiffMs: HOUR_MS, unitMs: MINUTE_MS, singular: "1 min ago", plural: "min ago" },
	{ maxDiffMs: DAY_MS, unitMs: HOUR_MS, singular: "1 hour ago", plural: "hours ago" },
	{ maxDiffMs: WEEK_MS, unitMs: DAY_MS, singular: "1 day ago", plural: "days ago" },
	{ maxDiffMs: MONTH_MS, unitMs: WEEK_MS, singular: "1 week ago", plural: "weeks ago" },
	{ maxDiffMs: YEAR_MS, unitMs: MONTH_MS, singular: "1 month ago", plural: "months ago" },
	{ maxDiffMs: Number.POSITIVE_INFINITY, unitMs: YEAR_MS, singular: "1 year ago", plural: "years ago" }
]

function formatRelativePast(pastMs: number, nowMs: number): string {
	const diff = nowMs - pastMs
	if (diff < MINUTE_MS) return "Just now"
	for (const bucket of BUCKETS) {
		if (diff < bucket.maxDiffMs) {
			const n = Math.floor(diff / bucket.unitMs)
			return n === 1 ? bucket.singular : `${n} ${bucket.plural}`
		}
	}
	// Unreachable: the final bucket has maxDiffMs = +Infinity.
	return "Just now"
}

export { formatRelativePast }
