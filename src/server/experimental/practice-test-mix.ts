import { mulberry32, xmur3 } from "@/config/diagnostic-mix"
import { type Difficulty, type SubTypeId, subTypeIds, subTypes } from "@/config/sub-types"
import { roundDecile, standardCurve } from "@/config/difficulty-curves"

interface ExperimentalPracticeTestPoolRow {
	id: string
	subTypeId: string
	difficulty: Difficulty
}

interface ExperimentalPracticeTestTargetSlot {
	subTypeId: SubTypeId
	difficulty: Difficulty
}

interface ExperimentalPracticeTestComposition {
	subType: Readonly<Record<string, number>>
	difficulty: Readonly<Record<Difficulty, number>>
}

interface ExperimentalPracticeTestDiagnostics {
	requestedQuestionCount: number
	targetDistribution: ExperimentalPracticeTestComposition
	actualDistribution: ExperimentalPracticeTestComposition
	fallbackRedistributionUsed: boolean
	recencyFallbackUsed: boolean
	exactMatchCount: number
	fallbackMatchCount: number
	recencyMatchCount: number
}

interface AllocateExperimentalPracticeTestQueueResult<TRow extends ExperimentalPracticeTestPoolRow> {
	queue: ReadonlyArray<TRow>
	targetSlots: ReadonlyArray<ExperimentalPracticeTestTargetSlot>
	diagnostics: ExperimentalPracticeTestDiagnostics
}

interface BucketState<TRow extends ExperimentalPracticeTestPoolRow> {
	fresh: TRow[]
	recency: TRow[]
}

interface SelectionState {
	selectedSubTypeCounts: Map<string, number>
	selectedDifficultyCounts: Map<string, number>
	selectedCellCounts: Map<string, number>
	selectedSectionCounts: Map<string, number>
	queueLength: number
	previousSubTypeId?: string
}

interface TargetState {
	targetSubTypeCounts: Map<string, number>
	targetDifficultyCounts: Map<string, number>
	targetCellCounts: Map<string, number>
	targetSectionCounts: Map<string, number>
}

interface FallbackCandidate<TRow extends ExperimentalPracticeTestPoolRow> {
	bucketKey: string
	source: "fresh" | "recency"
	row: TRow
	score: number
}

const DIFFICULTY_ORDER: ReadonlyArray<Difficulty> = ["easy", "medium", "hard", "brutal"]

function seededRand(seed: string): () => number {
	const seedFn = xmur3(seed)
	return mulberry32(seedFn())
}

function shuffleInPlace<T>(arr: T[], rand: () => number): void {
	for (let i = arr.length - 1; i > 0; i -= 1) {
		const swapIndex = Math.floor(rand() * (i + 1))
		const left = arr[i]
		const right = arr[swapIndex]
		if (left === undefined || right === undefined) continue
		arr[i] = right
		arr[swapIndex] = left
	}
}

function pickSubTypesWithReplacement(rand: () => number, count: number): SubTypeId[] {
	const picks: SubTypeId[] = []
	for (let i = 0; i < count; i += 1) {
		const picked = subTypeIds[Math.floor(rand() * subTypeIds.length)]
		if (picked === undefined) continue
		picks.push(picked)
	}
	return picks
}

function getSectionForSubType(subTypeId: string): string {
	for (const subType of subTypes) {
		if (subType.id === subTypeId) return subType.section
	}
	return "unknown"
}

function splitQuestionCountIntoBlocks(totalCount: number, blockCount: number): number[] {
	const base = Math.floor(totalCount / blockCount)
	const remainder = totalCount % blockCount
	const blocks: number[] = []
	for (let index = 0; index < blockCount; index += 1) {
		let blockSize = base
		if (index < remainder) {
			blockSize += 1
		}
		blocks.push(blockSize)
	}
	return blocks
}

function buildTargetDecileSlots(args: {
	sessionId: string
	blockIndex: number
	blockSize: number
	distribution: (typeof standardCurve)[number]
}): ExperimentalPracticeTestTargetSlot[] {
	if (args.blockSize <= 0) return []
	const tierCounts = roundDecile(args.distribution, args.blockSize)
	const slots: ExperimentalPracticeTestTargetSlot[] = []
	for (const tier of DIFFICULTY_ORDER) {
		const count = tierCounts[tier]
		if (count === 0) continue
		const subtypeRand = seededRand(`${args.sessionId}:experimental:d${args.blockIndex}:${tier}`)
		const picks = pickSubTypesWithReplacement(subtypeRand, count)
		for (const subTypeId of picks) {
			slots.push({ subTypeId, difficulty: tier })
		}
	}
	const orderRand = seededRand(`${args.sessionId}:experimental:d${args.blockIndex}:order`)
	shuffleInPlace(slots, orderRand)
	return slots
}

function buildExperimentalPracticeTestTargetSlots(
	sessionId: string,
	questionCount: number
): ReadonlyArray<ExperimentalPracticeTestTargetSlot> {
	const blockSizes = splitQuestionCountIntoBlocks(questionCount, standardCurve.length)
	const slots: ExperimentalPracticeTestTargetSlot[] = []
	for (const [blockIndex, distribution] of standardCurve.entries()) {
		const blockSize = blockSizes[blockIndex]
		if (blockSize === undefined || blockSize === 0) continue
		const decileSlots = buildTargetDecileSlots({
			sessionId,
			blockIndex,
			blockSize,
			distribution
		})
		for (const slot of decileSlots) {
			slots.push(slot)
		}
	}
	return slots
}

function readRecordCount(record: Readonly<Record<string, number>>, key: string): number {
	const value = record[key]
	if (value === undefined) return 0
	return value
}

function countComposition<T extends { subTypeId: string; difficulty: Difficulty }>(
	rows: ReadonlyArray<T>
): ExperimentalPracticeTestComposition {
	const subType: Record<string, number> = {}
	const difficulty: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0, brutal: 0 }
	for (const row of rows) {
		const currentSubTypeCount = readRecordCount(subType, row.subTypeId)
		subType[row.subTypeId] = currentSubTypeCount + 1
		difficulty[row.difficulty] += 1
	}
	return { subType, difficulty }
}

function cellKey(subTypeId: string, difficulty: Difficulty): string {
	return `${subTypeId}|${difficulty}`
}

function difficultyDistance(a: Difficulty, b: Difficulty): number {
	return Math.abs(DIFFICULTY_ORDER.indexOf(a) - DIFFICULTY_ORDER.indexOf(b))
}

function sectionDistance(targetSubTypeId: SubTypeId, candidateSubTypeId: string): number {
	if (targetSubTypeId === candidateSubTypeId) return 0
	const targetSection = getSectionForSubType(targetSubTypeId)
	const candidateSection = getSectionForSubType(candidateSubTypeId)
	if (targetSection === candidateSection) return 1
	return 2
}

function increment(map: Map<string, number>, key: string): void {
	const current = map.get(key)
	if (current === undefined) {
		map.set(key, 1)
		return
	}
	map.set(key, current + 1)
}

function getCount(map: ReadonlyMap<string, number>, key: string): number {
	const value = map.get(key)
	if (value === undefined) return 0
	return value
}

function deltaMismatch(map: ReadonlyMap<string, number>, key: string, target: number): number {
	const current = getCount(map, key)
	return Math.abs(current + 1 - target) - Math.abs(current - target)
}

function createBuckets<TRow extends ExperimentalPracticeTestPoolRow>(args: {
	rows: ReadonlyArray<TRow>
	recencyExcludedIds: ReadonlySet<string>
	sessionId: string
}): Map<string, BucketState<TRow>> {
	const buckets = new Map<string, BucketState<TRow>>()
	for (const row of args.rows) {
		const key = cellKey(row.subTypeId, row.difficulty)
		let bucket = buckets.get(key)
		if (bucket === undefined) {
			bucket = { fresh: [], recency: [] }
			buckets.set(key, bucket)
		}
		if (args.recencyExcludedIds.has(row.id)) {
			bucket.recency.push(row)
		} else {
			bucket.fresh.push(row)
		}
	}
	for (const [key, bucket] of buckets.entries()) {
		shuffleInPlace(bucket.fresh, seededRand(`${args.sessionId}:fresh:${key}`))
		shuffleInPlace(bucket.recency, seededRand(`${args.sessionId}:recency:${key}`))
	}
	return buckets
}

function buildTargetState(targetSlots: ReadonlyArray<ExperimentalPracticeTestTargetSlot>): TargetState {
	const targetDistribution = countComposition(targetSlots)
	const targetSubTypeCounts = new Map<string, number>()
	for (const [subTypeId, count] of Object.entries(targetDistribution.subType)) {
		targetSubTypeCounts.set(subTypeId, count)
	}
	const targetDifficultyCounts = new Map<string, number>()
	for (const difficulty of DIFFICULTY_ORDER) {
		targetDifficultyCounts.set(difficulty, targetDistribution.difficulty[difficulty])
	}
	const targetCellCounts = new Map<string, number>()
	const targetSectionCounts = new Map<string, number>()
	for (const slot of targetSlots) {
		increment(targetCellCounts, cellKey(slot.subTypeId, slot.difficulty))
		increment(targetSectionCounts, getSectionForSubType(slot.subTypeId))
	}
	return {
		targetSubTypeCounts,
		targetDifficultyCounts,
		targetCellCounts,
		targetSectionCounts
	}
}

function createSelectionState(): SelectionState {
	return {
		selectedSubTypeCounts: new Map<string, number>(),
		selectedDifficultyCounts: new Map<string, number>(),
		selectedCellCounts: new Map<string, number>(),
		selectedSectionCounts: new Map<string, number>(),
		queueLength: 0,
		previousSubTypeId: undefined
	}
}

function takeExactMatch<TRow extends ExperimentalPracticeTestPoolRow>(
	buckets: ReadonlyMap<string, BucketState<TRow>>,
	slot: ExperimentalPracticeTestTargetSlot
): { row: TRow; usedRecency: boolean } | null {
	const exactBucket = buckets.get(cellKey(slot.subTypeId, slot.difficulty))
	if (exactBucket !== undefined && exactBucket.fresh.length > 0) {
		const row = exactBucket.fresh.shift()
		if (row !== undefined) return { row, usedRecency: false }
	}
	if (exactBucket !== undefined && exactBucket.recency.length > 0) {
		const row = exactBucket.recency.shift()
		if (row !== undefined) return { row, usedRecency: true }
	}
	return null
}

function scoreCandidate<TRow extends ExperimentalPracticeTestPoolRow>(args: {
	targetSlot: ExperimentalPracticeTestTargetSlot
	row: TRow
	source: "fresh" | "recency"
	selectionState: SelectionState
	targetState: TargetState
}): number {
	const candidateCellKey = cellKey(args.row.subTypeId, args.row.difficulty)
	const candidateSection = getSectionForSubType(args.row.subTypeId)
	let score = 0
	score +=
		deltaMismatch(
			args.selectionState.selectedCellCounts,
			candidateCellKey,
			getCount(args.targetState.targetCellCounts, candidateCellKey)
		) * 8
	score +=
		deltaMismatch(
			args.selectionState.selectedSubTypeCounts,
			args.row.subTypeId,
			getCount(args.targetState.targetSubTypeCounts, args.row.subTypeId)
		) * 6
	score +=
		deltaMismatch(
			args.selectionState.selectedDifficultyCounts,
			args.row.difficulty,
			getCount(args.targetState.targetDifficultyCounts, args.row.difficulty)
		) * 6
	score +=
		deltaMismatch(
			args.selectionState.selectedSectionCounts,
			candidateSection,
			getCount(args.targetState.targetSectionCounts, candidateSection)
		) * 3
	score += sectionDistance(args.targetSlot.subTypeId, args.row.subTypeId) * 2
	score += difficultyDistance(args.targetSlot.difficulty, args.row.difficulty)
	if (args.source === "recency") score += 3
	if (args.selectionState.previousSubTypeId === args.row.subTypeId) score += 1
	return score
}

function isBetterFallbackCandidate<TRow extends ExperimentalPracticeTestPoolRow>(args: {
	best: FallbackCandidate<TRow> | null
	candidate: FallbackCandidate<TRow>
}): boolean {
	if (args.best === null) return true
	if (args.candidate.score < args.best.score) return true
	if (args.candidate.score > args.best.score) return false
	const candidateKey = `${args.candidate.bucketKey}:${args.candidate.source}`
	const bestKey = `${args.best.bucketKey}:${args.best.source}`
	return candidateKey < bestKey
}

function pickFallbackCandidate<TRow extends ExperimentalPracticeTestPoolRow>(args: {
	buckets: ReadonlyMap<string, BucketState<TRow>>
	targetSlot: ExperimentalPracticeTestTargetSlot
	selectionState: SelectionState
	targetState: TargetState
}): FallbackCandidate<TRow> | null {
	let best: FallbackCandidate<TRow> | null = null
	for (const [bucketKey, bucket] of args.buckets.entries()) {
		for (const source of ["fresh", "recency"] as const) {
			const candidateRow = bucket[source][0]
			if (candidateRow === undefined) continue
			const candidate: FallbackCandidate<TRow> = {
				bucketKey,
				source,
				row: candidateRow,
				score: scoreCandidate({
					targetSlot: args.targetSlot,
					row: candidateRow,
					source,
					selectionState: args.selectionState,
					targetState: args.targetState
				})
			}
			if (isBetterFallbackCandidate({ best, candidate })) {
				best = candidate
			}
		}
	}
	return best
}

function takeFallbackMatch<TRow extends ExperimentalPracticeTestPoolRow>(args: {
	buckets: ReadonlyMap<string, BucketState<TRow>>
	targetSlot: ExperimentalPracticeTestTargetSlot
	selectionState: SelectionState
	targetState: TargetState
}): { row: TRow; usedRecency: boolean } | null {
	const candidate = pickFallbackCandidate(args)
	if (candidate === null) return null
	const bucket = args.buckets.get(candidate.bucketKey)
	const row = bucket?.[candidate.source].shift()
	if (row === undefined) return null
	return { row, usedRecency: candidate.source === "recency" }
}

function recordSelection(state: SelectionState, row: ExperimentalPracticeTestPoolRow): void {
	increment(state.selectedSubTypeCounts, row.subTypeId)
	increment(state.selectedDifficultyCounts, row.difficulty)
	increment(state.selectedCellCounts, cellKey(row.subTypeId, row.difficulty))
	increment(state.selectedSectionCounts, getSectionForSubType(row.subTypeId))
	state.queueLength += 1
	state.previousSubTypeId = row.subTypeId
}

function allocateExperimentalPracticeTestQueue<TRow extends ExperimentalPracticeTestPoolRow>(args: {
	sessionId: string
	questionCount: number
	rows: ReadonlyArray<TRow>
	recencyExcludedIds: ReadonlyArray<string>
}): AllocateExperimentalPracticeTestQueueResult<TRow> {
	const targetSlots = buildExperimentalPracticeTestTargetSlots(args.sessionId, args.questionCount)
	const targetDistribution = countComposition(targetSlots)
	const recencyExcludedIds = new Set(args.recencyExcludedIds)
	const buckets = createBuckets({
		rows: args.rows,
		recencyExcludedIds,
		sessionId: args.sessionId
	})
	const targetState = buildTargetState(targetSlots)
	const selectionState = createSelectionState()
	const queue: TRow[] = []
	let exactMatchCount = 0
	let fallbackMatchCount = 0
	let recencyMatchCount = 0

	for (const slot of targetSlots) {
		let match = takeExactMatch(buckets, slot)
		if (match !== null) {
			exactMatchCount += 1
		} else {
			// Global fallback instead of early failure: when an exact bucket is empty,
			// we score every remaining bucket against the current subtype, difficulty,
			// and section deficits so the queue stays as close as possible to the
			// canonical full-length mix before the allocator gives up.
			match = takeFallbackMatch({
				buckets,
				targetSlot: slot,
				selectionState,
				targetState
			})
			if (match !== null) {
				fallbackMatchCount += 1
			}
		}
		if (match === null) break
		if (match.usedRecency) {
			recencyMatchCount += 1
		}
		queue.push(match.row)
		recordSelection(selectionState, match.row)
	}

	const actualDistribution = countComposition(queue)
	let fallbackRedistributionUsed = false
	if (fallbackMatchCount > 0) {
		fallbackRedistributionUsed = true
	}
	if (queue.length < targetSlots.length) {
		fallbackRedistributionUsed = true
	}
	return {
		queue,
		targetSlots,
		diagnostics: {
			requestedQuestionCount: args.questionCount,
			targetDistribution,
			actualDistribution,
			fallbackRedistributionUsed,
			recencyFallbackUsed: recencyMatchCount > 0,
			exactMatchCount,
			fallbackMatchCount,
			recencyMatchCount
		}
	}
}

export type {
	AllocateExperimentalPracticeTestQueueResult,
	ExperimentalPracticeTestComposition,
	ExperimentalPracticeTestDiagnostics,
	ExperimentalPracticeTestPoolRow,
	ExperimentalPracticeTestTargetSlot
}
export { buildExperimentalPracticeTestTargetSlots, allocateExperimentalPracticeTestQueue, countComposition }
