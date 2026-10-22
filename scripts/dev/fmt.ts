#!/usr/bin/env -S node

import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Array as Arr, Console, Effect, FileSystem, Path, String as Str } from "effect"
import { DevtoolFailure, exitWith, reportFailure } from "#scripts/dev/devtool-failure.ts"
import { findBlankLineViolations, normalizeBlankLines } from "#scripts/dev/fmt/blank-lines.ts"
import { findStrippableComments, stripComments } from "#scripts/dev/fmt/comments.ts"
import { invocationOf } from "#scripts/dev/shared/arguments.ts"
import { configFileNames, nativeSession } from "#scripts/dev/shared/native-api.ts"
import { parseSyntax, type SyntaxInput } from "#scripts/dev/shared/native-syntax.ts"
import {
	covers,
	isGeneratedPath,
	isTypeScriptPath,
	isVendoredPath,
	repositoryPath,
	repositoryRoot
} from "#scripts/dev/shared/repository.ts"

/**
 * The repository formatter's own rules, on top of oxfmt: every comment but JSDoc and tool directives is
 * stripped, then gofumpt's blank lines. Braces on every control-flow body are oxlint's `curly`. It formats the files of the root tsconfig and of every
 * workspace package's tsconfig, vendored shadcn (the app's src/ui) aside, or only the files at or
 * under explicit paths. Without `--write` it is a dry run that reports and exits 1 if anything would
 * change.
 */

/** Removals inside one stripped comment's text land on the next pass; a few passes reach the fixed point. */
const MAX_STRIP_PASSES = 5

type FileReport = Readonly<{ file: string; comments: number; blankLines: number }>

type FormattedFile = FileReport & Readonly<{ original: string; formatted: string }>

const isFormattable = (file: string): boolean =>
	isTypeScriptPath(file) &&
	!Str.endsWith(".d.ts")(file) &&
	!isGeneratedPath(file) &&
	!isVendoredPath(file)

/** The dry run counts every finding in the original text, the way a single write pass would find them. */
const checkFiles = (
	inputs: ReadonlyArray<SyntaxInput>
): Effect.Effect<ReadonlyArray<FormattedFile>, DevtoolFailure> =>
	Effect.scoped(
		Effect.map(parseSyntax(inputs), (sources) =>
			Arr.map(sources, (source) => ({
				file: source.file,
				comments: findStrippableComments(source).length,
				blankLines: findBlankLineViolations(source).length,
				original: source.text,
				formatted: source.text
			}))
		)
	)

/** Strips comments pass by pass until none is left, counting what each file lost. */
const stripAll = (
	inputs: ReadonlyArray<SyntaxInput>
): Effect.Effect<ReadonlyArray<SyntaxInput & Readonly<{ comments: number }>>, DevtoolFailure> =>
	Effect.gen(function* () {
		let current = Arr.map(inputs, (input) => ({ ...input, comments: 0 }))
		for (let pass = 0; pass < MAX_STRIP_PASSES; pass += 1) {
			const sources = yield* Effect.scoped(parseSyntax(current))
			const removals = Arr.map(sources, findStrippableComments)
			if (!Arr.some(removals, Arr.isReadonlyArrayNonEmpty)) {
				return current
			}
			current = Arr.map(Arr.zip(current, removals), ([input, found]) => ({
				...input,
				text: stripComments({ text: input.text, removals: found }),
				comments: input.comments + found.length
			}))
		}
		return yield* DevtoolFailure.make({
			detail: `Comment stripping did not settle after ${MAX_STRIP_PASSES} passes`
		})
	})

/** Comments first, then blank lines on the stripped text, as one write pass. */
const formatFiles = (
	inputs: ReadonlyArray<SyntaxInput>
): Effect.Effect<ReadonlyArray<FormattedFile>, DevtoolFailure> =>
	Effect.gen(function* () {
		const stripped = yield* stripAll(inputs)
		const sources = yield* Effect.scoped(parseSyntax(stripped))
		return Arr.map(Arr.zip(Arr.zip(inputs, stripped), sources), ([[input, strip], source]) => {
			const violations = findBlankLineViolations(source)
			return {
				file: input.file,
				comments: strip.comments,
				blankLines: violations.length,
				original: input.text,
				formatted: normalizeBlankLines({ text: source.text, violations })
			}
		})
	})

const issuesOf = (report: FileReport): number => report.comments + report.blankLines

const summaryLine = (report: FileReport): string =>
	`${repositoryPath(report.file)}: ${report.comments} comment(s), ${report.blankLines} blank line(s)`

/** The root tsconfig and each workspace package's: packages/<group>/<package>/tsconfig.json. */
const workspaceConfigs = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const packagesRoot = `${repositoryRoot}/packages`
	const entries = yield* fs.readDirectory(packagesRoot)
	const groups = yield* Effect.filter(entries, (entry) =>
		Effect.map(fs.stat(`${packagesRoot}/${entry}`), (info) => info.type === "Directory")
	)
	const leaves = yield* Effect.forEach(groups, (group) =>
		fs
			.readDirectory(`${packagesRoot}/${group}`)
			.pipe(Effect.map((names) => Arr.map(names, (name) => `${packagesRoot}/${group}/${name}`)))
	)
	const packageConfigs = yield* Effect.filter(
		Arr.map(Arr.flatten(leaves), (leaf) => `${leaf}/tsconfig.json`),
		(config) => fs.exists(config)
	)
	return [`${repositoryRoot}/tsconfig.json`, ...packageConfigs]
}).pipe(
	Effect.mapError((cause) =>
		DevtoolFailure.make({ detail: "The workspace packages could not be listed", cause })
	)
)

const main = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const path = yield* Path.Path
	const invocation = yield* invocationOf(["--write"])
	const write = invocation.flags.has("--write")
	const selected = Arr.map(invocation.paths, (argument) => path.resolve(argument))
	const configs = yield* workspaceConfigs
	const configured = yield* Effect.scoped(
		Effect.flatMap(nativeSession({ cwd: repositoryRoot }), (api) =>
			Effect.map(
				Effect.forEach(configs, (config) => configFileNames({ api, config })),
				(names) => Arr.dedupe(Arr.flatten(names))
			)
		)
	)
	const covered = Arr.isReadonlyArrayNonEmpty(selected)
		? Arr.filter(configured, (file) =>
				Arr.some(selected, (choice) => covers({ selected: choice, file }))
			)
		: configured
	const extra = Arr.filter(
		selected,
		(file) => isTypeScriptPath(file) && !Arr.contains(configured, file)
	)
	const files = Arr.filter(Arr.dedupe([...covered, ...extra]), isFormattable)
	const inputs = yield* Effect.forEach(
		files,
		(file) =>
			fs.readFileString(file).pipe(
				Effect.mapError((cause) =>
					DevtoolFailure.make({ detail: `${file} could not be read`, cause })
				),
				Effect.flatMap((text) =>
					Str.startsWith("\uFEFF")(text)
						? DevtoolFailure.make({
								detail: `${file} starts with a byte order mark; remove it first`
							})
						: Effect.succeed({ file, text })
				)
			),
		{ concurrency: 16 }
	)
	const results = write ? yield* formatFiles(inputs) : yield* checkFiles(inputs)
	const changed = Arr.filter(results, (result) => issuesOf(result) > 0)
	const total = Arr.reduce(changed, 0, (sum, result) => sum + issuesOf(result))
	if (!Arr.isReadonlyArrayNonEmpty(changed)) {
		yield* Console.log("No formatting issues found.")
		return
	}
	if (write) {
		yield* Effect.forEach(
			Arr.filter(changed, (result) => result.formatted !== result.original),
			(result) =>
				fs
					.writeFileString(result.file, result.formatted)
					.pipe(
						Effect.mapError((cause) =>
							DevtoolFailure.make({ detail: `${result.file} could not be written`, cause })
						)
					),
			{ concurrency: 16 }
		)
		yield* Console.log(`Fixed ${total} issue(s) in ${changed.length} file(s).`)
		return
	}
	yield* Console.log(
		Arr.join(
			[
				`Found ${total} issue(s) in ${changed.length} file(s).`,
				"",
				...Arr.map(changed, summaryLine),
				"",
				"Run with --write to fix these issues."
			],
			"\n"
		)
	)
	yield* exitWith(1)
}).pipe(Effect.catchTag("DevtoolFailure", reportFailure))

// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(main.pipe(Effect.provide(NodeServices.layer)))
