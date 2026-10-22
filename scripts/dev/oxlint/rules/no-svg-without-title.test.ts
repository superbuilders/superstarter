import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noSvgWithoutTitle } from "#scripts/dev/oxlint/rules/no-svg-without-title.ts"

const tsx = { filename: "icon.tsx" }

ruleTester.run("no-svg-without-title", noSvgWithoutTitle, {
	valid: [
		{ ...tsx, code: "const icon = <svg><title>Close</title></svg>" },
		{ ...tsx, code: 'const icon = <svg aria-hidden="true" />' },
		{ ...tsx, code: "const icon = <svg aria-hidden={true} />" },
		{ ...tsx, code: 'const icon = <svg role="img" aria-label="Close" />' }
	],
	invalid: [
		{ ...tsx, code: "const icon = <svg />", errors: [{ message: /^An svg needs a <title>/ }] },
		{
			...tsx,
			code: 'const icon = <svg role="img" />',
			errors: [{ message: /^An svg needs a <title>/ }]
		}
	]
})
