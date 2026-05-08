// Dashboard belt-row loader. STUB: returns 14 white-belt rows
// (5 verbal + 9 numerical) drawn from the canonical sub-type config.
// No `user_sub_type_belts` rows are read by this round — see
// Dashboard PRD §6.2 + `docs/plans/dashboard.md` §5 commit 5 +
// §9 stub-removal table.
//
// `name` is `s.displayName` directly (Title Case), per
// `docs/plans/dashboard.md` §3 decision F: cross-surface consistency
// with the previous Mastery Map rendering is preserved; if sentence
// case is a product preference, the fix lives at
// src/config/sub-types.ts, not at a dashboard-local transformer.
//
// `href` points at /drill/<subTypeId>/run since practice round commit
// 2 (`docs/plans/practice-round.md` §5 commit 2 + ask 7). Pre-round:
// /drill/<subTypeId> (the configure surface, length picker 5/10/20).
// Post-round: configure deletes, /run hardcodes drillLength = 5 via
// DEFAULT_DRILL_QUESTIONS, and the BeltRow href deep-links straight
// into the run flow.

import { subTypes } from "@/config/sub-types"
import { logger } from "@/logger"
import type { SubtypeRow } from "@/server/dashboard/types"

// TODO(stub): wire to real data in the Belts PRD
// (`docs/plans/dashboard.md` §9). When real: read user_sub_type_belts
// joined to sub_types, ordered by the canonical config order. atRisk
// computed off rolling-30d attempts.
async function loadAllBelts(
	userId: string,
	section: "verbal" | "numerical"
): Promise<ReadonlyArray<SubtypeRow>> {
	logger.debug({ userId, section }, "loadAllBelts stub: returning all-white")
	return subTypes
		.filter(function bySection(s) {
			return s.section === section
		})
		.map(function toRow(s): SubtypeRow {
			return {
				id: s.id,
				slug: s.id,
				name: s.displayName,
				belt: "white",
				progressToNext: 0,
				atRisk: false,
				href: `/drill/${encodeURIComponent(s.id)}/run`
			}
		})
}

export { loadAllBelts }
