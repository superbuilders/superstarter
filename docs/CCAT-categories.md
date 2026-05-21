# CCAT Sub-Type Reference (v1 Canonical Taxonomy)

Source-of-truth document for the 14 sub-types covered by 18 Seconds v1. Treat this like a config file that happens to be in markdown: when the taxonomy in `src/config/sub-types.ts` changes, this document updates in lockstep.

The CCAT (Criteria Cognitive Aptitude Test) is 50 multiple-choice questions in 15 minutes — roughly 18 seconds per question. No calculator. No revisiting prior answers. Difficulty increases as the test progresses. The test does not assess advanced knowledge; it assesses pattern recognition speed under time pressure.

18 Seconds v1 covers the 14 text-based sub-types listed below: 5 verbal and 9 numerical. Each sub-type has its own latency threshold and is treated as an independent skill with its own mastery state and item bank.

---

## Categories at a Glance

| Section | Sub-types | What it measures |
|---|---|---|
| Verbal | 5 | Vocabulary recognition, word relationships, alphabet-position pattern recognition, logical inference from text |
| Numerical | 9 | Mental arithmetic, numerical pattern recognition, word-to-math translation, ratio and rate problems, quick value comparison |

---

## Sub-Type Inventory

The 14 sub-type identifiers below are the canonical IDs used throughout the codebase. Latency thresholds determine when an attempt counts as "above" or "below" the threshold for mastery computation; they are tighter than 18 seconds because the system targets a faster-than-target tempo.

**Verbal (5):**

| ID | Display name | Latency threshold |
|---|---|---|
| `verbal.antonyms` | Antonyms | 12s |
| `verbal.letter_series` | Letter Series | 12s |
| `verbal.analogies` | Analogies | 15s |
| `verbal.sentence_completion` | Sentence Completion | 15s |
| `verbal.critical_reasoning` | Critical Reasoning | 18s |

**Numerical (9):**

| ID | Display name | Latency threshold |
|---|---|---|
| `numerical.number_series` | Number Series | 12s |
| `numerical.lowest_values` | Lowest Values | 12s |
| `numerical.fractions` | Fractions | 15s |
| `numerical.percentages` | Percentages | 15s |
| `numerical.averages` | Averages | 15s |
| `numerical.ratios` | Ratios | 15s |
| `numerical.workrate` | Work Rate | 15s |
| `numerical.speed_distance_time` | Speed & Distance | 15s |
| `numerical.word_problems` | Word Problems | 18s |

---

## 1. Verbal Sub-Types

Verbal questions test vocabulary recognition, word-relationship reasoning, alphabet-position pattern recognition, and logical inference from short text. They are typically the fastest to answer when the test-taker recognizes the answer immediately, and the easiest to abandon when they don't — partial credit from elimination is rarely productive.

### 1.1 Antonyms — `verbal.antonyms`

Choose the word opposite in meaning to a target word.

**Example:** *Scarce* → **Abundant**

Recognition speed dominates. A common trap: when two answer options seem opposite to the target, the correct answer is usually the more *general* opposite, not the most extreme one. A second trap: words with multiple meanings (e.g., "late" meaning both *tardy* and *deceased*) may have antonyms keyed to the less obvious sense — check every reading before locking in.

### 1.2 Letter Series — `verbal.letter_series`

Identify the next letter, letter pair, or letter-position group in a sequence based on alphabet-position arithmetic.

**Examples:**

- *Q, P, O, N, M, L, ?* → **K** (each letter shifts by −1)
- *A, C, F, ?, O* → **J** (steps of +2, +3, +4, +5)
- *AA, BD, CI, ?* → **DP** (first letter +1; second letter follows position squares 1, 4, 9, 16)
- *xrfm, xqen, xpdo, xocp, ?* → **xnbq** (each character position has its own arithmetic rule)

These problems are pattern recognition on alphabet positions and are categorized as verbal in v1: although the underlying operation is positional arithmetic, the recognition shape is "letters as symbols." The fastest approach is converting any letter that doesn't resolve at a glance to its position number (A=1, B=2, …) and treating the slot as a number series. Memorizing milestones (E=5, J=10, O=15, T=20) saves the seconds otherwise spent finger-counting.

### 1.3 Analogies — `verbal.analogies`

Identify the relationship between a pair of words and select another pair with the same relationship.

**Example:** *Bird : Fly :: Fish : Swim*

The trick is naming the relationship in plain language ("a bird's primary mode of locomotion is flight") *before* scanning options. Without an articulated relationship, similar-looking distractors mislead. Common relationship types: function, category-to-member, part-to-whole, raw-material-to-product, intensity (e.g., "irritated : irate"), and synonymy.

### 1.4 Sentence Completion — `verbal.sentence_completion`

Fill in one or more blanks in a sentence such that the result is logically and grammatically coherent.

**Example:** *Although he was warned, he continued to ___ the rules.*

Context cues — especially conjunctions like "although," "because," "despite" — telegraph whether the missing word should agree or contrast with the surrounding text. Double-blank questions reward eliminating any option whose first word fails before evaluating the second word.

### 1.5 Critical Reasoning — `verbal.critical_reasoning`

Given one or more premises, decide whether a conclusion is **True**, **False**, or **Uncertain** based only on the stated information. Includes syllogisms, spatial-direction problems, and short-passage inference.

**Example:**

- Premise: *All engineers are logical.*
- Statement: *Some logical people are engineers.* → **Uncertain**

The most common trap is relying on real-world knowledge instead of strictly the given premises — the premises define a closed world; nothing outside them counts. Spatial-direction problems (e.g., "David lives west of Katrina; Nathan lives west of David → N-D-K") follow the same rules and reward sketching the relationships rather than holding them in head. When a conclusion sounds strong, prefer "Uncertain" unless the premises explicitly support it; the test rewards the most modest defensible answer.

---

## 2. Numerical Sub-Types

Numerical questions test mental arithmetic, recognition of numerical patterns, ratio and rate reasoning, and word-to-math translation. No calculator is permitted. The math itself is rarely complex; difficulty comes from speed and from recognizing the simplest possible solution path.

This is the section where most test-takers lose the most time. Recognizing the simplest applicable rule before computing is the dominant skill.

### 2.1 Number Series — `numerical.number_series`

Identify the next number in a sequence based on an underlying pattern.

Common patterns:

- Addition or subtraction with a constant difference
- Multiplication or division with a constant ratio
- Alternating rules (e.g., odd positions +2, even positions ×2)
- Second-order patterns (differences of differences, or differences that themselves form a series)
- Interleaved sequences (two independent sequences alternating)
- Recursive sums (each term is the sum of the previous two — Fibonacci-like)
- Recognized special sequences (cubes, primes, squares)

The fastest approach is testing differences between consecutive terms first, then ratios, then second-order patterns, then checking for memorized special sets (cubes: 1, 8, 27, 64, 125…; primes: 2, 3, 5, 7, 11, 13…). Most series resolve at the first level. Don't fall in love with the first pattern that fits two terms — verify against at least three before committing.

### 2.2 Lowest Values — `numerical.lowest_values`

Compare a small set of numeric expressions and pick the smallest (or largest) value.

**Example:** *Which is smallest? 0.5, 1/3, 0.45, 2/5* → **1/3 ≈ 0.333**

The fastest approach is converting all candidates to a common form — usually decimals to two places — then scanning for the extreme. Anchoring against familiar reference points (1/2 = 0.5, 1/3 ≈ 0.33, 1/4 = 0.25) eliminates most candidates without computation. Don't reflexively find a common denominator on a 4-option question; estimation in 5 seconds beats computation in 30.

### 2.3 Fractions — `numerical.fractions`

Compare fractions, find the largest or smallest in a set, or convert between forms.

The test rewards techniques that avoid full computation: cross-multiplication for comparisons (a/b vs c/d → ad vs bc), recognizing common reference points (1/2, 1/4, 1/3), and identifying when a fraction is obviously larger or smaller than another without exact calculation. For "highest value" questions where all fractions are close to 1, comparing the *remaining* part to 1 (i.e., 14/15 leaves only 1/15) is faster than comparing the fractions directly.

### 2.4 Percentages — `numerical.percentages`

Compute percentage increases, decreases, percent-of relationships, and relative comparisons.

A frequent trap: "increased by 50% then decreased by 50%" does not return to the starting value (it lands at 75% of the original). Anchoring on the new base after each step prevents this error. The "10% block trick" — find 10% by shifting the decimal one place left, then scale (×3 for 30%, ×7 for 70%) — handles most percent-of-whole problems in one step. *X is what percent of Y* and *Y is what percent of X* have different denominators; confirm the direction before computing.

### 2.5 Averages — `numerical.averages`

Compute means and weighted averages.

For straight averages, sum-over-count is sufficient for most questions. For "what changes when one element is removed/added" questions, computing the *delta from the mean* and redistributing across the new count is faster than recomputing from scratch: `(new − old_mean) ÷ new_count = mean_shift`. *Average rate* and *average speed* are not the arithmetic mean of the rates — use total quantity over total denominator (total distance ÷ total time).

### 2.6 Ratios — `numerical.ratios`

Compute proportional splits, scale a known ratio to a target quantity, or compare ratios.

Decide first whether the question asks parts-to-parts (3:2 means 3 cats per 2 dogs) or parts-to-whole (3:2 means 3 of every 5 are cats). The answer keys to that distinction. To scale a ratio to a known quantity, multiply each part by the question's anchor: 3:2 with 9 cats → multiply by 3 → 9:6, so 6 dogs. A ratio of 7:9 is not "split into 7 and 9"; it's "split into 16 parts." Setting up `7x + 9x = total` before solving prevents the most common error.

### 2.7 Work Rate — `numerical.workrate`

Combined-work or rate-of-completion problems: given two or more workers' individual rates, compute the time (or rate) for them working together.

**Example:** *Anna can paint a room in 4 hours; Ben in 6. How long does it take them together?* → **2.4 hours** (1/4 + 1/6 = 5/12 of a room per hour → 12/5 = 2.4 hours)

The canonical setup is *rate × time = work*; convert each worker's individual time to a per-hour rate, sum the rates, then invert to get the combined time. Don't average the times directly — that's the most common trap. Mixed-mode problems (e.g., running plus walking, or one worker who joins partway through) follow the same setup with split intervals.

### 2.8 Speed, Distance, and Time — `numerical.speed_distance_time`

Solve for any one of speed, distance, or time given the other two.

**Example:** *A car travels 180 miles in 3 hours; what is its average speed?* → **60 mph** (distance ÷ time)

The canonical relationship is `speed × time = distance`. The bottleneck is usually setting up the units consistently — minutes vs. hours, kilometers vs. miles. For "two trains approaching each other" or "round-trip" problems, sketch a timeline before computing; the relationships are what's being tested, not the arithmetic.

### 2.9 Word Problems — `numerical.word_problems`

Short real-world problems requiring translation into a calculation. Includes basic algebra (one or two-step equations).

Common topics: cost / price / discount, probability of independent events, combinations and counting, multi-step price-after-tax problems. The math is intentionally light. The bottleneck is the translation, not the arithmetic. Skim the question for the units it asks for (dollars, hours, items) *before* reading the body — units tell you what equation to set up. Sketch the relationship (timeline, two-circle diagram, rate × time table) before computing. When the answer choices are clustered (12, 14, 15, 16), don't trust mental arithmetic — work the problem at least once on paper before picking.

---

## Test Format Notes

- The test is **not divided into sections**. v1 sub-types appear interleaved in random order.
- The test-taker **cannot revisit** prior questions. Once an answer is submitted (or a question is skipped), it is final.
- There is **no penalty for wrong answers**. Guessing on a question the test-taker cannot solve is strictly better than skipping it.
- Difficulty **increases as the test progresses**. The first 10 questions are noticeably easier than the last 10.
- **Less than 1% of test-takers complete all 50 questions.** A score of 31/50 typically lands above the 80th percentile; 40/50 lands in the top percentile.

---

## Strategic Implications

The CCAT rewards knowing when to abandon a question more than per-question speed. The test-takers who score highest are not those who answer every question faster — they are those who recognize unsolvable-in-18-seconds questions early and move on with a guess.

Highest-leverage skills:

- Fast recognition on antonyms, letter series, and number series.
- Fluent fraction, percentage, and lowest-value comparison without full calculation.
- Disciplined ratio-setup (`7x + 9x = total`) before computing splits.
- Recognizing the canonical work-rate / speed-distance-time relationship and applying it without re-deriving.
- Quick recognition + abandonment of wordy arithmetic problems and dense critical-reasoning passages.

Lowest-leverage skills (despite being intuitive places to invest prep time):

- Working through long arithmetic problems carefully.
- Re-reading verbal questions to confirm a vocabulary guess.
- Computing common denominators on fraction comparisons that resolve via cross-multiplication or reference-point anchoring.
- Treating each work-rate or speed-distance problem as a fresh setup instead of an instance of the canonical equation.

---

## Companion Documents

- `docs/PRD.md` — product requirements; treats this file as the canonical taxonomy reference.
- `docs/SPEC.md` — system specification; references this file for sub-type semantics.
- `src/config/sub-types.ts` — the canonical TypeScript source-of-truth for the 14 sub-types and their latency thresholds. When this file disagrees with `src/config/sub-types.ts`, the TypeScript wins and this document needs updating.
