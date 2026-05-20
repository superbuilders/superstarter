import * as errors from "@superbuilders/errors"
import { and, eq, isNull, sql } from "drizzle-orm"
import { DEFAULT_DRILL_QUESTIONS, type SubTypeId, subTypeIds, subTypes } from "@/config/sub-types"
import { db } from "@/db"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { logger } from "@/logger"

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)

type ExperimentalDrillSection = "verbal" | "numerical"

interface ExperimentalDrillListEntry {
	subTypeId: SubTypeId
	displayName: string
	section: ExperimentalDrillSection
	availableCount: number
	readyToStart: boolean
	href: string
}

interface ExperimentalDrillIndexSection {
	id: ExperimentalDrillSection
	label: string
	entries: ExperimentalDrillListEntry[]
}

interface ExperimentalDrillIndexData {
	sections: ReadonlyArray<ExperimentalDrillIndexSection>
	minimumReadyCount: number
}

interface ExperimentalDrillPrimerData {
	subTypeId: SubTypeId
	displayName: string
	section: ExperimentalDrillSection
	availableCount: number
	readyToStart: boolean
	startHref: string
}

function asExperimentalDrillSubTypeId(value: string): SubTypeId | undefined {
	if (!subTypeIdSet.has(value)) return undefined
	return subTypeIds.find(function match(known) {
		return known === value
	})
}

async function countAvailableExperimentalItems(subTypeId: SubTypeId): Promise<number> {
	const result = await errors.try(
		db
			.select({ n: sql<number>`COUNT(*)::int` })
			.from(experimentalItems)
			.where(
				and(
					eq(experimentalItems.subTypeId, subTypeId),
					eq(experimentalItems.auditStatus, "unaudited"),
					isNull(experimentalItems.hiddenAtMs)
				)
			)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, subTypeId },
			"countAvailableExperimentalItems: query failed"
		)
		throw errors.wrap(result.error, "countAvailableExperimentalItems")
	}
	const row = result.data[0]
	if (row === undefined) return 0
	return row.n
}

async function loadExperimentalDrillIndexData(): Promise<ExperimentalDrillIndexData> {
	const result = await errors.try(
		db
			.select({
				subTypeId: experimentalItems.subTypeId,
				availableCount: sql<number>`COUNT(*)::int`
			})
			.from(experimentalItems)
			.where(
				and(
					eq(experimentalItems.auditStatus, "unaudited"),
					isNull(experimentalItems.hiddenAtMs)
				)
			)
			.groupBy(experimentalItems.subTypeId)
	)
	if (result.error) {
		logger.error({ error: result.error }, "loadExperimentalDrillIndexData: query failed")
		throw errors.wrap(result.error, "loadExperimentalDrillIndexData")
	}
	const countMap = new Map<string, number>(
		result.data.map(function mapRow(row) {
			return [row.subTypeId, row.availableCount] as const
		})
	)
	const sections: ExperimentalDrillIndexSection[] = [
		{ id: "verbal", label: "Verbal", entries: [] },
		{ id: "numerical", label: "Numerical", entries: [] }
	]
	for (const subType of subTypes) {
		const maybeCount = countMap.get(subType.id)
		const availableCount = maybeCount === undefined ? 0 : maybeCount
		const entry: ExperimentalDrillListEntry = {
			subTypeId: subType.id,
			displayName: subType.displayName,
			section: subType.section,
			availableCount,
			readyToStart: availableCount >= DEFAULT_DRILL_QUESTIONS,
			href: `/experimental/drills/${encodeURIComponent(subType.id)}`
		}
		const section = sections.find(function byId(candidate) {
			return candidate.id === subType.section
		})
		if (section === undefined) {
			logger.error({ subTypeId: subType.id, section: subType.section }, "loadExperimentalDrillIndexData: section missing")
			throw errors.new("loadExperimentalDrillIndexData: section missing")
		}
		section.entries.push(entry)
	}
	return { sections, minimumReadyCount: DEFAULT_DRILL_QUESTIONS }
}

async function loadExperimentalDrillPrimerData(
	subTypeId: SubTypeId
): Promise<ExperimentalDrillPrimerData> {
	const config = subTypes.find(function byId(entry) {
		return entry.id === subTypeId
	})
	if (!config) {
		logger.error({ subTypeId }, "loadExperimentalDrillPrimerData: subtype config missing")
		throw errors.new("loadExperimentalDrillPrimerData: subtype config missing")
	}
	const availableCount = await countAvailableExperimentalItems(subTypeId)
	return {
		subTypeId,
		displayName: config.displayName,
		section: config.section,
		availableCount,
		readyToStart: availableCount >= DEFAULT_DRILL_QUESTIONS,
		startHref: `/experimental/drills/${encodeURIComponent(subTypeId)}/run`
	}
}

export type {
	ExperimentalDrillIndexData,
	ExperimentalDrillIndexSection,
	ExperimentalDrillListEntry,
	ExperimentalDrillPrimerData,
	ExperimentalDrillSection
}
export {
	asExperimentalDrillSubTypeId,
	countAvailableExperimentalItems,
	loadExperimentalDrillIndexData,
	loadExperimentalDrillPrimerData
}
