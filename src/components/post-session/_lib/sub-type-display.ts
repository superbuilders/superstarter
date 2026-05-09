// Shared sub-type display lib — consumed by the post-session sub-type-
// keyed components (`<AccuracySummary>`, `<LatencySummary>`, `<StrategySurface>`,
// `<WrongItemsBrowser>`).
//
// Plan: docs/plans/post-session-audit-fixes-and-wide-token-retrofit.md §5.4a
// (extraction-before-combine commit; supersedes original §5.10 per Leo's
// 2026-05-09 redirect). Closes audit doc §B.3 sort-DRY drift (4 near-identical
// `compareRows`/`compareGroups`/`compareDisplay` functions + 4 separate
// `SUB_TYPE_BY_ID` Maps replicated across the 4 components).
//
// Exports:
//   - `SUB_TYPE_BY_ID` — canonical `Map<SubTypeId, SubTypeConfig>` built from
//     the `subTypes` config array. Replaces 4 local Maps.
//   - `compareBySubTypeDisplay(a, b)` — comparator: verbal section first, then
//     alphabetical by `displayName` within section. Generic on
//     `SubTypeIdHaver { subTypeId }`. Validates meta exists; throws via
//     `errors.new()` if not (defense-in-depth — `buildDisplayRows` filters
//     undefined-meta cases at build time, so the comparator should never
//     receive an unknown id in practice).

import * as errors from "@superbuilders/errors"
import { type SubTypeConfig, type SubTypeId, subTypes } from "@/config/sub-types"
import { logger } from "@/logger"

const SUB_TYPE_BY_ID: ReadonlyMap<SubTypeId, SubTypeConfig> = new Map(
	subTypes.map(function entry(t) {
		return [t.id, t]
	})
)

interface SubTypeIdHaver {
	readonly subTypeId: SubTypeId
}

function compareBySubTypeDisplay(a: SubTypeIdHaver, b: SubTypeIdHaver): number {
	const metaA = SUB_TYPE_BY_ID.get(a.subTypeId)
	const metaB = SUB_TYPE_BY_ID.get(b.subTypeId)
	if (metaA === undefined || metaB === undefined) {
		logger.error(
			{ aSubTypeId: a.subTypeId, bSubTypeId: b.subTypeId },
			"compareBySubTypeDisplay invariant violated: unknown subType id"
		)
		throw errors.new("compareBySubTypeDisplay: unknown subType id")
	}
	if (metaA.section !== metaB.section) {
		return metaA.section === "verbal" ? -1 : 1
	}
	return metaA.displayName.localeCompare(metaB.displayName)
}

export type { SubTypeIdHaver }
export { SUB_TYPE_BY_ID, compareBySubTypeDisplay }
