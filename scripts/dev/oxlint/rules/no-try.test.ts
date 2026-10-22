import { ruleTester } from "#scripts/dev/oxlint/rule-tester.ts"
import { noTry } from "#scripts/dev/oxlint/rules/no-try.ts"

ruleTester.run("no-try", noTry, {
	valid: ["const value = 1"],
	invalid: [
		{ code: "try { f() } catch (error) { g(error) }", errors: [{ message: /^try\.\.\.catch is/ }] },
		{ code: "try { f() } finally { g() }", errors: [{ message: /^try\.\.\.finally is/ }] },
		{
			code: "try { f() } catch (error) { g(error) } finally { h() }",
			errors: [{ message: /^try\.\.\.catch\.\.\.finally is/ }]
		}
	]
})
