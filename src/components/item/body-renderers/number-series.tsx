// <NumberSeriesBody> — body renderer for `numerical.number_series`
// items. Round 1 §5.8 (drill number-series formatting legibility fix)
// per §0.7 audit + ALPHA_DESIGN.md §4 OpenType polish.
//
// Two prompt-text shapes empirically observed in `numerical.number_series`
// items (audit-step (a) samples from scripts/_stage1/12min_prep_practice_*):
//
//   Shape A — bare sequence with single-space delimiters and a `?`
//     terminator: e.g. "19 18 22 21 25 ?"
//   Shape B — prose framing line + blank line + double-space-delimited
//     sequence: e.g. "What is the next number in the series?\n\n1  4  10
//     22  46"
//
// Shape A renders as a single sequence paragraph; Shape B splits at the
// `\n\n` boundary into a prose paragraph + a sequence paragraph. The
// per-paragraph `isSequenceText` heuristic decides which gets the
// tabular-nums + bumped-size treatment so prose framing stays at the
// default body size (text-lg) while the sequence paragraph gets the
// digit-legibility upgrade (text-3xl + tabular-nums + tracking-wide).
//
// Mirrors <TextBody>'s blank-line paragraph splitting + space-y-3
// stacking so this renderer stays a drop-in alternative for the
// number-series sub-type without changing the ItemBody schema (the
// schema stays text-only per src/server/items/body-schema.ts; the
// dispatch happens in <ItemPrompt>'s renderBody on subTypeId).
//
// Tabular-nums at text-3xl: digits render in fixed-width columns so
// "19 18 22 21 25 ?" reads as a row of comparable glyphs rather than
// a kerning-distorted variable-width string. Tracking-wide adds a
// touch of breathing room between digits without inflating the line
// length excessively.

interface NumberSeriesBodyProps {
	text: string
}

// A "sequence" paragraph is one whose non-whitespace characters are all
// digits and the small set of delimiter/operator glyphs that show up in
// the empirical samples (audit (a)): `? , . - + * / = ( )`. Prose
// paragraphs ("What is the next number in the series?") fail this check
// because of the alphabetic chars and stay at the default body
// formatting.
function isSequenceText(paragraph: string): boolean {
	const trimmed = paragraph.trim()
	if (trimmed.length === 0) return false
	return /^[\d\s?,.\-+*/=()]+$/.test(trimmed)
}

function NumberSeriesBody(props: NumberSeriesBodyProps) {
	const paragraphs = props.text.split(/\n\n+/)
	return (
		<div className="space-y-3">
			{paragraphs.map(function renderParagraph(paragraph, index) {
				const sequenceClass =
					"text-foreground text-3xl leading-relaxed tabular-nums tracking-wide"
				const proseClass = "text-foreground text-lg leading-normal"
				const className = isSequenceText(paragraph) ? sequenceClass : proseClass
				return (
					<p key={index} className={className}>
						{paragraph}
					</p>
				)
			})}
		</div>
	)
}

export type { NumberSeriesBodyProps }
export { NumberSeriesBody }
