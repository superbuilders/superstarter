import type { SubTypeId } from "@/config/sub-types"
import type { SeedItemInput } from "@/db/seeds/items/types"
import { items as numericalAverages } from "@/db/seeds/items/data/numerical-averages"
import { items as numericalFractions } from "@/db/seeds/items/data/numerical-fractions"
import { items as numericalLowestValues } from "@/db/seeds/items/data/numerical-lowest-values"
import { items as numericalNumberSeries } from "@/db/seeds/items/data/numerical-number-series"
import { items as numericalPercentages } from "@/db/seeds/items/data/numerical-percentages"
import { items as numericalRatios } from "@/db/seeds/items/data/numerical-ratios"
import { items as numericalSpeedDistanceTime } from "@/db/seeds/items/data/numerical-speed-distance-time"
import { items as numericalWordProblems } from "@/db/seeds/items/data/numerical-word-problems"
import { items as numericalWorkrate } from "@/db/seeds/items/data/numerical-workrate"
import { items as verbalAnalogies } from "@/db/seeds/items/data/verbal-analogies"
import { items as verbalAntonyms } from "@/db/seeds/items/data/verbal-antonyms"
import { items as verbalCriticalReasoning } from "@/db/seeds/items/data/verbal-critical-reasoning"
import { items as verbalLetterSeries } from "@/db/seeds/items/data/verbal-letter-series"
import { items as verbalSentenceCompletion } from "@/db/seeds/items/data/verbal-sentence-completion"

const seedDataBySubType: Record<SubTypeId, SeedItemInput[]> = {
	"verbal.antonyms": verbalAntonyms,
	"verbal.analogies": verbalAnalogies,
	"verbal.sentence_completion": verbalSentenceCompletion,
	"verbal.critical_reasoning": verbalCriticalReasoning,
	"verbal.letter_series": verbalLetterSeries,
	"numerical.number_series": numericalNumberSeries,
	"numerical.word_problems": numericalWordProblems,
	"numerical.fractions": numericalFractions,
	"numerical.percentages": numericalPercentages,
	"numerical.averages": numericalAverages,
	"numerical.ratios": numericalRatios,
	"numerical.workrate": numericalWorkrate,
	"numerical.speed_distance_time": numericalSpeedDistanceTime,
	"numerical.lowest_values": numericalLowestValues
}

export { seedDataBySubType }
