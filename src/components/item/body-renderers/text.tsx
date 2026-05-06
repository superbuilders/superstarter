interface TextBodyProps {
	text: string
}

// Split on blank-line boundaries (one or more `\n\n`) and render each
// chunk as its own `<p>`. The body-schema (src/server/items/body-schema.ts)
// stores `body.text` as a single string with literal `\n\n` separators
// for paragraph breaks; the prior render used `whitespace-pre-wrap` to
// preserve those separators as visible blank lines, which dominated
// the perceived vertical spacing on multi-paragraph items (e.g.,
// Assumptions/Conclusions logic items). Replacing the blank-line
// rendering with explicit `<p>` elements + `space-y-3` (12px gap)
// substantially reduces vertical real-estate while preserving the
// cognitive grouping that paragraph breaks signal.
//
// Single-paragraph bodies split into a one-element array; the render
// produces a single `<p>` indistinguishable from the prior single-
// paragraph rendering. Within-paragraph newlines (single `\n`) — if
// present in any body — become space characters via the default
// whitespace-collapse, matching the typical text-render expectation
// for prose-style bodies.
function TextBody(props: TextBodyProps) {
	const paragraphs = props.text.split(/\n\n+/)
	return (
		<div className="space-y-3">
			{paragraphs.map(function renderParagraph(paragraph, index) {
				return (
					// biome-ignore lint/suspicious/noArrayIndexKey: paragraphs are derived from a stable split; reordering is impossible without the source string itself changing
					<p key={index} className="text-foreground text-lg leading-normal">
						{paragraph}
					</p>
				)
			})}
		</div>
	)
}

export type { TextBodyProps }
export { TextBody }
