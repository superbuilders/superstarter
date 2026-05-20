import * as errors from "@superbuilders/errors"
import { and, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/db"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { logger } from "@/logger"

const EXPERIMENTAL_PRACTICE_TEST_QUESTIONS = 20
const EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM = 2

interface ExperimentalPracticeTestPrimerData {
	availableCount: number
	availableSubTypeCount: number
	readyToStart: boolean
	minimumReadyCount: number
	minimumSubTypeCount: number
	startHref: string
}

async function loadExperimentalPracticeTestPrimerData(): Promise<ExperimentalPracticeTestPrimerData> {
	const result = await errors.try(
		db
			.select({
				availableCount: sql<number>`COUNT(*)::int`,
				availableSubTypeCount: sql<number>`COUNT(DISTINCT ${experimentalItems.subTypeId})::int`
			})
			.from(experimentalItems)
			.where(
				and(
					eq(experimentalItems.auditStatus, "unaudited"),
					isNull(experimentalItems.hiddenAtMs)
				)
			)
	)
	if (result.error) {
		logger.error(
			{ error: result.error },
			"loadExperimentalPracticeTestPrimerData: query failed"
		)
		throw errors.wrap(result.error, "loadExperimentalPracticeTestPrimerData")
	}
	const row = result.data[0]
	const availableCount = row === undefined ? 0 : row.availableCount
	const availableSubTypeCount = row === undefined ? 0 : row.availableSubTypeCount
	const readyToStart =
		availableCount >= EXPERIMENTAL_PRACTICE_TEST_QUESTIONS &&
		availableSubTypeCount >= EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM
	return {
		availableCount,
		availableSubTypeCount,
		readyToStart,
		minimumReadyCount: EXPERIMENTAL_PRACTICE_TEST_QUESTIONS,
		minimumSubTypeCount: EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM,
		startHref: "/experimental/practice-test/run"
	}
}

export {
	EXPERIMENTAL_PRACTICE_TEST_QUESTIONS,
	EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM,
	loadExperimentalPracticeTestPrimerData
}
export type { ExperimentalPracticeTestPrimerData }
