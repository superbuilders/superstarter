// @effect-diagnostics nodeBuiltinImport:off
import { describe, it } from "node:test"
import { RuleTester } from "oxlint/plugins-dev"

RuleTester.describe = (text, fn) => {
	void describe(text, fn)
}

RuleTester.it = (text, fn) => {
	void it(text, fn)
}

/** The tester every plugin rule's self-test runs on: oxlint's own, reporting through `node:test`. */
export const ruleTester = new RuleTester()

/** A file at `path` under a repository root, so a rule that reads its filename sees a real layout. */
export const repositoryFile = (path: string): string => `/repository/${path}`
