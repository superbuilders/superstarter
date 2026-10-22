/** How many blank lines a gap may hold: at most `blankLines` in any one run between comments, or at least
 * `blankLines` in the whole gap. */
export type BlankLineBound = Readonly<{ kind: "at-most" | "at-least"; blankLines: number }>

/** A gap between two nodes whose blank lines break its bound. The gap holds only whitespace and comments; the
 * formatter changes only its whitespace. */
export type BlankLineViolation = Readonly<{
	file: string
	line: number
	currentBlankLines: number
	bound: BlankLineBound
	start: number
	end: number
}>

/** A comment the formatter deletes, with the text its deletion takes: its line when it stands alone, the
 * spaces beside it otherwise. */
export type CommentRemoval = Readonly<{
	file: string
	line: number
	start: number
	end: number
}>

/** One edit to a file's text: the range it covers and the text that replaces it. */
export type TextEdit = Readonly<{ start: number; end: number }>
