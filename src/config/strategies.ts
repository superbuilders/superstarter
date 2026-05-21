import type { SubTypeId } from "@/config/sub-types"

type StrategyKind = "recognition" | "technique" | "trap"

interface StrategyEntry {
	kind: StrategyKind
	text: string
}

// All 14 sub-types authored per the strategy-authoring round
// (docs/plans/strategy-authoring.md). Type tightened from
// Partial<Record<...>> to full Record<...> so any future taxonomy add
// fails at typecheck if its strategies are not authored. The seed
// script's `if (!entries) continue` guard remains as defense-in-depth.
const strategies: Record<SubTypeId, ReadonlyArray<StrategyEntry>> = {
	"verbal.antonyms": [
		{
			kind: "recognition",
			text: "Read the target word, say its opposite out loud in your head, then pick the option closest to what you said. Don't reverse-engineer from the options."
		},
		{
			kind: "technique",
			text: "When two options seem opposite to the target, the correct answer is usually the more general opposite, not the most extreme one."
		},
		{
			kind: "trap",
			text: "Words with multiple meanings (e.g., 'late' meaning both tardy and deceased) often have antonyms keyed to the less obvious sense — check every reading before locking in."
		}
	],
	"verbal.analogies": [
		{
			kind: "recognition",
			text: "Name the relationship between the first pair in plain language ('a bird's primary mode of locomotion is flight') before looking at any option."
		},
		{
			kind: "technique",
			text: "Substitute the relationship template into each option: '{X} is to {Y} as {first}'s primary {relationship} is to {second}'. Whichever survives is the answer."
		},
		{
			kind: "trap",
			text: "Don't pick an option just because both words feel related to the target pair — the relationship has to match in kind and direction, not topic."
		}
	],
	"verbal.sentence_completion": [
		{
			kind: "recognition",
			text: "Conjunctions like 'although', 'because', and 'despite' telegraph whether the missing word agrees or contrasts with the surrounding text — read for those first."
		},
		{
			kind: "technique",
			text: "On double-blank questions, eliminate any option whose first word fails before evaluating the second word."
		},
		{
			kind: "trap",
			text: "An option can be grammatically correct and still wrong — the test wants the choice that makes the sentence cohere, not just parse."
		}
	],
	"verbal.critical_reasoning": [
		{
			kind: "recognition",
			text: "Spatial-direction problems and syllogisms reward sketching the relationships ('David west of Katrina; Nathan west of David → N-D-K'). Don't try to hold them in your head."
		},
		{
			kind: "technique",
			text: "Treat the premises as a closed world. Anything you 'know' from outside the prompt is irrelevant to the conclusion."
		},
		{
			kind: "trap",
			text: "When a conclusion sounds strong, prefer 'Uncertain' unless the premises explicitly support it — the test rewards the most modest defensible answer."
		}
	],
	"verbal.letter_series": [
		{
			kind: "recognition",
			text: "Convert each letter to its alphabet position (A=1, B=2, …) any time the pattern doesn't resolve at a glance — pretend it's a number series."
		},
		{
			kind: "technique",
			text: "On multi-letter sequences (xrfm, xqen, xpdo, …), treat each character position as its own independent series and solve them in parallel."
		},
		{
			kind: "trap",
			text: "Don't count alphabet positions on your fingers in real time — that's where seconds vanish. Memorize milestones (E=5, J=10, O=15, T=20)."
		}
	],
	"numerical.number_series": [
		{
			kind: "recognition",
			text: "Test differences between consecutive terms first, then ratios, then second-order differences. Most series resolve at the first level."
		},
		{
			kind: "technique",
			text: "If the linear test fails, scan for an interleaved pair (positions 1, 3, 5 vs 2, 4, 6) before assuming a complex rule."
		},
		{
			kind: "trap",
			text: "Don't fall in love with the first pattern that fits two terms — verify it against at least three before committing."
		}
	],
	"numerical.word_problems": [
		{
			kind: "recognition",
			text: "Skim the question for the units it asks for (dollars, hours, miles per hour) before reading the body — it tells you what equation to set up."
		},
		{
			kind: "technique",
			text: "Sketch the relationship (timeline, two-circle diagram, or rate × time = distance table) before computing. Translation is the bottleneck, not arithmetic."
		},
		{
			kind: "trap",
			text: "When the answer choices are clustered (12, 14, 15, 16), don't trust mental arithmetic — work the problem at least once on paper before picking."
		}
	],
	"numerical.fractions": [
		{
			kind: "recognition",
			text: "Anchor every fraction against 1/2 (or 1) at a glance: 7/13 < 1/2, 14/15 ≈ 1. Most comparisons resolve before any calculation."
		},
		{
			kind: "technique",
			text: "Cross-multiply for two-fraction comparisons (a/b vs c/d → ad vs bc). For 'highest value' near 1, compare the *remaining* part instead (1/15 < 1/13)."
		},
		{
			kind: "trap",
			text: "Don't reflexively find a common denominator on a 4-option fractions question — that's a 30-second computation when 5 seconds of estimation will do."
		}
	],
	"numerical.percentages": [
		{
			kind: "recognition",
			text: "Find 10% by shifting the decimal one place left, then scale (×3 for 30%, ×7 for 70%). This handles most percent-of-whole questions in one step."
		},
		{
			kind: "technique",
			text: "On consecutive percent changes, anchor on the *new* base after each step. 'Up 50% then down 50%' lands at 75% of the original, not 100%."
		},
		{
			kind: "trap",
			text: "'X is what percent of Y' and 'Y is what percent of X' have different denominators — confirm which way the question runs before computing."
		}
	],
	"numerical.averages": [
		{
			kind: "recognition",
			text: "For 'one element added/removed' questions, the new value's distance from the old mean tells you the shift — you rarely have to recompute the whole average."
		},
		{
			kind: "technique",
			text: "Compute the delta from the mean and redistribute over the new count: (new − old_mean) ÷ new_count = mean_shift. Faster than re-averaging."
		},
		{
			kind: "trap",
			text: "'Average rate' or 'average speed' is not the arithmetic mean of the rates — use total quantity over total denominator (total distance ÷ total time)."
		}
	],
	"numerical.ratios": [
		{
			kind: "recognition",
			text: "Decide first whether the question asks parts-to-parts (3:2 means 3 cats per 2 dogs) or parts-to-whole (3:2 means 3 of every 5 are cats). The answer keys to that distinction."
		},
		{
			kind: "technique",
			text: "Scale the ratio to match the question's known quantity. 3:2 with 9 cats → multiply by 3 to get 9:6, so 6 dogs."
		},
		{
			kind: "trap",
			text: "A ratio of 7:9 is not 'split into 7 and 9'; it's 'split into 16 parts'. Setting up 7x + 9x = total before solving prevents the most common error."
		}
	],
	"numerical.workrate": [
		{
			kind: "recognition",
			text: "Workrate splits two ways: scale-one-rate ('8 parts in 20 min, how long for 6?') and combine-two-rates ('A in 6h, B in 12h, together?'). Spot the shape first — they need different setups."
		},
		{
			kind: "technique",
			text: "For two-worker combined-work, T = (A × B) / (A + B). 6h and 12h together → 72 / 18 = 4h. Faster than 1/A + 1/B = 1/T from scratch."
		},
		{
			kind: "trap",
			text: "Don't average the times when two workers combine — '6h and 12h → 9h' is the classic wrong answer; rates add, times don't, so T = (6 × 12)/(6+12) = 4h."
		}
	],
	"numerical.speed_distance_time": [
		{
			kind: "recognition",
			text: "Every SDT problem is d = s × t with one missing variable. Find what the question asks for — that's the missing one; the other two are stated in the body."
		},
		{
			kind: "technique",
			text: "Normalize units before plugging into d = s × t. If km/h mixes with minutes (or mph with seconds), convert to match the unit asked for — most SDT errors are unit mismatches, not arithmetic."
		},
		{
			kind: "trap",
			text: "Upstream/downstream is not still-water — surface_rate = vehicle_rate ± medium_rate. A boat going 120 km / 4h downstream with a 5 km/h stream has still-water speed 30 − 5 = 25 km/h, not 30."
		}
	],
	"numerical.lowest_values": [
		{
			kind: "recognition",
			text: "The stem is fixed — 'Which has the lowest (or highest) value?' — so the work is in the options. Scan the notation mix first (decimals, fractions, '1/8 of 32') before choosing how to compare."
		},
		{
			kind: "technique",
			text: "Anchor against ½, 1, or a known integer to discard candidates without computing each in full. For '0.6, 2/3, 5/6, 0.5, 0.674' the lowest is 0.5 by inspection — only it falls below ½."
		},
		{
			kind: "trap",
			text: "Re-read the stem before picking — 'highest' instead of 'lowest' flips the answer, and the test mixes both. Watch notation slips too: 0.03 ≠ 0.3; 1/9 < 1/8 (a bigger denominator means a smaller fraction)."
		}
	]
}

export type { StrategyEntry, StrategyKind }
export { strategies }
