import * as errors from "@superbuilders/errors"
import { and, eq, isNull, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { experimentalItems } from "@/db/schemas/experimental/experimental-items"
import { logger } from "@/logger"

const EXPERIMENTAL_PRACTICE_TEST_QUESTIONS = 50
const EXPERIMENTAL_PRACTICE_TEST_DURATION_MINUTES = 15
const EXPERIMENTAL_PRACTICE_TEST_MIN_QUESTIONS = 10
const EXPERIMENTAL_PRACTICE_TEST_MAX_QUESTIONS = 100
const EXPERIMENTAL_PRACTICE_TEST_MIN_DURATION_MINUTES = 5
const EXPERIMENTAL_PRACTICE_TEST_MAX_DURATION_MINUTES = 60
const EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM = 2

const requestedConfigSchema = z.object({
	questionCount: z.coerce
		.number()
		.int()
		.min(EXPERIMENTAL_PRACTICE_TEST_MIN_QUESTIONS)
		.max(EXPERIMENTAL_PRACTICE_TEST_MAX_QUESTIONS),
	durationMinutes: z.coerce
		.number()
		.int()
		.min(EXPERIMENTAL_PRACTICE_TEST_MIN_DURATION_MINUTES)
		.max(EXPERIMENTAL_PRACTICE_TEST_MAX_DURATION_MINUTES)
})

interface ExperimentalPracticeTestConfig {
	questionCount: number
	durationMinutes: number
}

interface ExperimentalPracticeTestPrimerData {
	availableCount: number
	availableSubTypeCount: number
	readyToStart: boolean
	minimumReadyCount: number
	minimumSubTypeCount: number
	startHref: string
	standardDefaultConfig: ExperimentalPracticeTestConfig
	defaultConfig: ExperimentalPracticeTestConfig
	questionCountBounds: {
		min: number
		max: number
	}
	durationBounds: {
		min: number
		max: number
	}
}

type ExperimentalPracticeTestConfigParseResult =
	| { ok: true; config: ExperimentalPracticeTestConfig }
	| { ok: false; reason: string }

function defaultQuestionCountForAvailable(availableCount: number): number {
	if (availableCount >= EXPERIMENTAL_PRACTICE_TEST_QUESTIONS) {
		return EXPERIMENTAL_PRACTICE_TEST_QUESTIONS
	}
	return Math.max(EXPERIMENTAL_PRACTICE_TEST_MIN_QUESTIONS, Math.min(availableCount, EXPERIMENTAL_PRACTICE_TEST_MAX_QUESTIONS))
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
	const maxQuestionCount = Math.min(availableCount, EXPERIMENTAL_PRACTICE_TEST_MAX_QUESTIONS)
	const readyToStart =
		availableCount >= EXPERIMENTAL_PRACTICE_TEST_MIN_QUESTIONS &&
		availableSubTypeCount >= EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM
	return {
		availableCount,
		availableSubTypeCount,
		readyToStart,
		minimumReadyCount: EXPERIMENTAL_PRACTICE_TEST_MIN_QUESTIONS,
		minimumSubTypeCount: EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM,
		startHref: "/experimental/practice-test/run",
		standardDefaultConfig: {
			questionCount: EXPERIMENTAL_PRACTICE_TEST_QUESTIONS,
			durationMinutes: EXPERIMENTAL_PRACTICE_TEST_DURATION_MINUTES
		},
		defaultConfig: {
			questionCount: defaultQuestionCountForAvailable(availableCount),
			durationMinutes: EXPERIMENTAL_PRACTICE_TEST_DURATION_MINUTES
		},
		questionCountBounds: {
			min: EXPERIMENTAL_PRACTICE_TEST_MIN_QUESTIONS,
			max: maxQuestionCount
		},
		durationBounds: {
			min: EXPERIMENTAL_PRACTICE_TEST_MIN_DURATION_MINUTES,
			max: EXPERIMENTAL_PRACTICE_TEST_MAX_DURATION_MINUTES
		}
	}
}

function parseExperimentalPracticeTestConfig(input: {
	questionCount?: unknown
	durationMinutes?: unknown
	primer: ExperimentalPracticeTestPrimerData
}): ExperimentalPracticeTestConfigParseResult {
	if (!input.primer.readyToStart) {
		return {
			ok: false,
			reason: `The current experimental pool has ${input.primer.availableCount} eligible items across ${input.primer.availableSubTypeCount} subtypes. You need at least ${input.primer.minimumReadyCount} items across ${input.primer.minimumSubTypeCount} subtypes to start a practice test.`
		}
	}
	const parsed = requestedConfigSchema.safeParse({
		questionCount:
			input.questionCount === undefined ? input.primer.defaultConfig.questionCount : input.questionCount,
		durationMinutes:
			input.durationMinutes === undefined
				? input.primer.defaultConfig.durationMinutes
				: input.durationMinutes
	})
	if (!parsed.success) {
		return {
			ok: false,
			reason: `Choose between ${input.primer.questionCountBounds.min} and ${input.primer.questionCountBounds.max} questions, and between ${input.primer.durationBounds.min} and ${input.primer.durationBounds.max} minutes.`
		}
	}
	if (parsed.data.questionCount > input.primer.questionCountBounds.max) {
		return {
			ok: false,
			reason: `Only ${input.primer.questionCountBounds.max} eligible experimental questions are available right now. Lower the question count and try again.`
		}
	}
	return { ok: true, config: parsed.data }
}

export {
	EXPERIMENTAL_PRACTICE_TEST_DURATION_MINUTES,
	EXPERIMENTAL_PRACTICE_TEST_MAX_DURATION_MINUTES,
	EXPERIMENTAL_PRACTICE_TEST_MAX_QUESTIONS,
	EXPERIMENTAL_PRACTICE_TEST_MIN_DURATION_MINUTES,
	EXPERIMENTAL_PRACTICE_TEST_MIN_QUESTIONS,
	EXPERIMENTAL_PRACTICE_TEST_QUESTIONS,
	EXPERIMENTAL_PRACTICE_TEST_SUBTYPE_MINIMUM,
	loadExperimentalPracticeTestPrimerData,
	parseExperimentalPracticeTestConfig
}
export type {
	ExperimentalPracticeTestConfig,
	ExperimentalPracticeTestConfigParseResult,
	ExperimentalPracticeTestPrimerData
}
