type RuleId = "no-invalid-color" | "no-arbitrary-color" | "require-data-slot"

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
