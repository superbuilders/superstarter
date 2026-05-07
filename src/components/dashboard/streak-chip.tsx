// <StreakChip> — compact streak indicator for the TopNav.
// Dashboard PRD §10.10 + `docs/plans/dashboard.md` §5 commit 6.
//
// Two visual states:
//   - streakDays === 0 → neutral pill ("Start your streak") in
//     bg-surface-2 + text-text-2. No flame icon. This is the v1
//     default because computeStreak (commit 5) stubs to 0.
//   - streakDays > 0 → branded pill ("{N}-day streak") in bg-lavender
//     + text-indigo + Flame icon. The icon is decorative — the
//     adjacent text ("{N}-day streak") carries the semantic load.
//
// Pure presentational. No state, no effects. Server component (no
// "use client"). Used inside <TopNav> (commit 9) but renders nothing
// route-dependent — could be lifted into any context.

import { Flame } from "lucide-react"

interface StreakChipProps {
	streakDays: number
}

function StreakChip({ streakDays }: StreakChipProps) {
	if (streakDays === 0) {
		return (
			<span className="inline-flex items-center rounded-full bg-surface-2 px-[10px] py-[4px] font-medium text-[12px] text-text-2">
				Start your streak
			</span>
		)
	}
	return (
		<span className="inline-flex items-center gap-[6px] rounded-full bg-lavender px-[10px] py-[4px] font-medium text-[12px] text-indigo">
			<Flame aria-hidden="true" className="h-[13px] w-[13px]" />
			<span>{streakDays}-day streak</span>
		</span>
	)
}

export type { StreakChipProps }
export { StreakChip }
