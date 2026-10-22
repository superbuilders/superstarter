import { Array as Arr, Option, Result, String as Str } from "effect"
import { repositoryPath } from "#scripts/dev/shared/repository.ts"

/** A violating fixture marks with a trailing `// violation` every line its rule must report; a clean fixture must
 * draw no report. */
const FIXTURE_MARKER = "// violation"

const FIXTURE_ROLES: ReadonlyArray<"violating" | "clean"> = ["violating", "clean"]

/** How one fixture disagrees with its rule. */
type FixtureMismatch =
	| Readonly<{ kind: "absent"; file: string }>
	| Readonly<{ kind: "unmarked"; file: string }>
	| Readonly<{
			kind: "disagrees"
			file: string
			missing: ReadonlyArray<number>
			unexpected: ReadonlyArray<number>
	  }>

/** A fixture as its rule saw it: its text and the lines the rule reported there. */
export type FixtureRun = Readonly<{ text: string; reported: ReadonlyArray<number> }>

const markedLinesOf = (text: string): ReadonlyArray<number> =>
	Arr.filterMap(Str.split("\n")(text), (line, index) =>
		Str.includes(FIXTURE_MARKER)(line) ? Result.succeed(index + 1) : Result.failVoid
	)

const mismatchOf = (
	file: string,
	role: "violating" | "clean",
	run: FixtureRun
): Option.Option<FixtureMismatch> => {
	const marked = markedLinesOf(run.text)
	if (role === "violating" && !Arr.isReadonlyArrayNonEmpty(marked)) {
		return Option.some({ kind: "unmarked", file })
	}
	const missing = Arr.difference(marked, run.reported)
	const unexpected = Arr.difference(Arr.dedupe(run.reported), marked)
	if (!Arr.isReadonlyArrayNonEmpty(missing) && !Arr.isReadonlyArrayNonEmpty(unexpected)) {
		return Option.none()
	}
	return Option.some({ kind: "disagrees", file, missing, unexpected })
}

/** Every rule against its `<root>/<rule>/violating<extension>` and `clean<extension>` fixtures, line for line. A
 * fixture `runOf` cannot find is absent, which is a mismatch too. */
export const fixtureMismatchesOf = (
	input: Readonly<{
		root: string
		extension: string
		rules: ReadonlyArray<string>
		runOf: (fixture: Readonly<{ rule: string; file: string }>) => Option.Option<FixtureRun>
	}>
): ReadonlyArray<FixtureMismatch> =>
	Arr.flatMap(input.rules, (rule) =>
		Arr.filterMap(FIXTURE_ROLES, (role) => {
			const file = `${input.root}/${rule}/${role}${input.extension}`
			const mismatch = Option.match(input.runOf({ rule, file }), {
				onNone: (): Option.Option<FixtureMismatch> => Option.some({ kind: "absent", file }),
				onSome: (run) => mismatchOf(file, role, run)
			})
			return Option.isSome(mismatch) ? Result.succeed(mismatch.value) : Result.failVoid
		})
	)

const lineList = (lines: ReadonlyArray<number>): string =>
	`[${Arr.join(Arr.map(lines, String), ", ")}]`

const describe = (mismatch: FixtureMismatch): string => {
	switch (mismatch.kind) {
		case "absent":
			return `${repositoryPath(mismatch.file)}: absent`
		case "unmarked":
			return `${repositoryPath(mismatch.file)}: marks no line with ${FIXTURE_MARKER}`
		case "disagrees":
			return `${repositoryPath(mismatch.file)}: missing ${lineList(mismatch.missing)} unexpected ${lineList(mismatch.unexpected)}`
	}
}

/** The mismatches, one per line, and the tool's tally. */
export const renderFixtureMismatches = (
	input: Readonly<{ tool: string; rules: number; mismatches: ReadonlyArray<FixtureMismatch> }>
): string => {
	if (!Arr.isReadonlyArrayNonEmpty(input.mismatches)) {
		return `${input.tool} fixtures: ${input.rules} rules agree with their fixtures`
	}
	return Arr.join(
		[
			...Arr.map(input.mismatches, describe),
			`${input.tool} fixtures: ${input.mismatches.length} fixture(s) disagree`
		],
		"\n"
	)
}
