// Dashboard pure formatters and headline derivation. Dashboard PRD §7
// + `docs/plans/dashboard.md` §5 commit 5.
//
// No I/O, no module-level state, no imports beyond TypeScript and
// Intl. Every function is referentially transparent given a fixed
// `new Date()` (which only formatToday consumes).

function deriveHeadline(input: { delta?: number; hasSim: boolean }): string {
	if (!input.hasSim) return "Let's begin."
	if (input.delta === undefined) return "Steady today."
	if (input.delta > 0) return "You're climbing."
	if (input.delta < 0) return "Reset and reload."
	return "Steady today."
}

function formatToday(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric"
	}).format(date)
}

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60)
	const s = Math.floor(seconds % 60)
	const sPadded = s.toString().padStart(2, "0")
	return `${m}:${sPadded}`
}

function clamp01(n: number): number {
	if (Number.isNaN(n)) return 0
	if (n < 0) return 0
	if (n > 1) return 1
	return n
}

export { clamp01, deriveHeadline, formatDuration, formatToday }
