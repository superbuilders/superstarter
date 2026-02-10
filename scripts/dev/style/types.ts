type RuleId =
	| "no-invalid-color"
	| "no-arbitrary-color"
	| "no-arbitrary-spacing"
	| "no-arbitrary-radius"
	| "no-arbitrary-shadow"
	| "require-data-slot"
	| "no-duplicate-data-slot"

interface Violation {
	file: string
	line: number
	column: number
	rule: RuleId
	message: string
	className?: string
	componentName?: string
}

interface ClassLocation {
	text: string
	line: number
	column: number
}

export type { ClassLocation, RuleId, Violation }
