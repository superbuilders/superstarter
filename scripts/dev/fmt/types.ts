/** How many blank lines a gap may hold: at most `blankLines` in any one run between comments, or at least
 * `blankLines` in the whole gap. */
export type BlankLineBound = Readonly<{ kind: "at-most" | "at-least"; blankLines: number }>

/** One edit to a file's text: the range it covers, which its caller replaces. */
export type TextEdit = Readonly<{ start: number; end: number }>

/** A gap between two nodes whose blank lines break its bound. The gap holds only whitespace and comments; the
 * formatter changes only its whitespace. */
export type BlankLineViolation = TextEdit & Readonly<{ bound: BlankLineBound }>
