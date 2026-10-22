import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { cognitiveComplexity } from "#scripts/dev/oxlint/rules/cognitive-complexity.ts"

const NESTED = `function tangled(a, b, c, d, e) {
	if (a) {
		for (const item of b) {
			if (c) {
				while (d) {
					if (e && item) {
						break
					}
				}
			}
		}
	}
}`

ruleTester.run("cognitive-complexity", cognitiveComplexity, {
	valid: [
		"function simple(a) { if (a) { return 1 } return 2 }",
		"const ternary = (a) => (a ? 1 : 2)"
	],
	invalid: [
		{
			code: NESTED,
			errors: [{ message: /^Excessive complexity of \d+ detected \(max: 15\)/ }]
		}
	]
})
