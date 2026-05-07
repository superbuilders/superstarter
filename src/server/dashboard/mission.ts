// Dashboard "today's mission" picker. STUB: returns the static
// "take your baseline simulation" mission until the weakness-analysis
// pipeline lands. See Dashboard PRD §6.3 + `docs/plans/dashboard.md`
// §5 commit 5 + §9 stub-removal table.
//
// The alternate CTA targets `/drill` (the sub-type picker mounted at
// commit 3 of this round), not `/diagnostic`: every user reaching the
// dashboard is past the (app)/layout.tsx diagnostic-completed gate,
// so /diagnostic is unreachable. Users who want to drill instead of
// taking a sim land on the picker.

import { logger } from "@/logger"
import type { DashboardData } from "@/server/dashboard/types"

// TODO(stub): wire to real data in the Mission Picker PRD
// (`docs/plans/dashboard.md` §9). When real: rank sub-types by
// frequency_on_real_test × (1 - accuracy_at_pace), tie-break by
// proximity to belt promotion.
async function pickTodaysMission(userId: string): Promise<DashboardData["mission"]> {
	logger.debug({ userId }, "pickTodaysMission stub: returning baseline-sim mission")
	return {
		eyebrow: "Today's mission",
		title: "Take your baseline simulation",
		body: "We'll calibrate your belts and recommend daily missions from your first sim onward.",
		primaryHref: "/full-length/configure",
		primaryLabel: "Start full sim",
		alternateHref: "/drill",
		alternateLabel: "Pick a drill"
	}
}

export { pickTodaysMission }
