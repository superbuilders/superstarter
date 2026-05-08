type Difficulty = "easy" | "medium" | "hard" | "brutal"

const subTypeIds = [
	"verbal.antonyms",
	"verbal.analogies",
	"verbal.sentence_completion",
	"verbal.critical_reasoning",
	"verbal.letter_series",
	"numerical.number_series",
	"numerical.word_problems",
	"numerical.fractions",
	"numerical.percentages",
	"numerical.averages",
	"numerical.ratios",
	"numerical.workrate",
	"numerical.speed_distance_time",
	"numerical.lowest_values"
] as const

type SubTypeId = (typeof subTypeIds)[number]

interface SubTypeConfig {
	id: SubTypeId
	displayName: string
	section: "verbal" | "numerical"
	latencyThresholdMs: number
	bankTargetByDifficulty: Record<Difficulty, number>
}

const DEFAULT_BANK_TARGETS: Record<Difficulty, number> = {
	easy: 50,
	medium: 50,
	hard: 50,
	brutal: 50
}

const subTypes: ReadonlyArray<SubTypeConfig> = [
	// Recognition (12s)
	{
		id: "verbal.antonyms",
		displayName: "Antonyms",
		section: "verbal",
		latencyThresholdMs: 12_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	{
		id: "verbal.letter_series",
		displayName: "Letter Series",
		section: "verbal",
		latencyThresholdMs: 12_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	{
		id: "numerical.number_series",
		displayName: "Number Series",
		section: "numerical",
		latencyThresholdMs: 12_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	{
		id: "numerical.lowest_values",
		displayName: "Lowest Values",
		section: "numerical",
		latencyThresholdMs: 12_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	// Quick structured reasoning (15s)
	{
		id: "verbal.analogies",
		displayName: "Analogies",
		section: "verbal",
		latencyThresholdMs: 15_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	{
		id: "verbal.sentence_completion",
		displayName: "Sentence Completion",
		section: "verbal",
		latencyThresholdMs: 15_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	{
		id: "numerical.fractions",
		displayName: "Fractions",
		section: "numerical",
		latencyThresholdMs: 15_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	{
		id: "numerical.percentages",
		displayName: "Percentages",
		section: "numerical",
		latencyThresholdMs: 15_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	{
		id: "numerical.averages",
		displayName: "Averages",
		section: "numerical",
		latencyThresholdMs: 15_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	{
		id: "numerical.ratios",
		displayName: "Ratios",
		section: "numerical",
		latencyThresholdMs: 15_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	{
		id: "numerical.workrate",
		displayName: "Work Rate",
		section: "numerical",
		latencyThresholdMs: 15_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	{
		id: "numerical.speed_distance_time",
		displayName: "Speed & Distance",
		section: "numerical",
		latencyThresholdMs: 15_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	// Sustained multi-constraint reasoning (18s)
	{
		id: "verbal.critical_reasoning",
		displayName: "Critical Reasoning",
		section: "verbal",
		latencyThresholdMs: 18_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	},
	{
		id: "numerical.word_problems",
		displayName: "Word Problems",
		section: "numerical",
		latencyThresholdMs: 18_000,
		bankTargetByDifficulty: DEFAULT_BANK_TARGETS
	}
]

/*
 * Default drill question count. Practice round commit 2 (ask 7):
 * "All drills default to 5 questions. Remove the drill configure
 * page entirely; users land directly on /run." Pre-round: drill
 * length picker offered 5/10/20 with default 10. Post-round: a
 * single hardcoded 5 — the configure page deletes; /drill/<id>/run
 * uses this constant for both startSession's drillLength input AND
 * the empty-bank pre-check threshold (renders <EmptyBankPane> if a
 * sub-type has fewer than DEFAULT_DRILL_QUESTIONS live items, since
 * a drill of N questions cannot start with a bank of <N items).
 *
 * Must be a member of start.ts's DrillLength = 5 | 10 | 20 union so
 * startSession accepts it as input. If the future redesign widens
 * the default beyond {5, 10, 20}, update DrillLength in
 * src/server/sessions/start.ts in the same commit.
 */
const DEFAULT_DRILL_QUESTIONS = 5

export type { Difficulty, SubTypeConfig, SubTypeId }
export { DEFAULT_DRILL_QUESTIONS, subTypeIds, subTypes }
