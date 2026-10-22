#!/usr/bin/env -S node

import { Array as Arr, Console, Effect, FileSystem, Option, Path, Result, Schema } from "effect"
import type * as ts from "typescript/unstable/ast"
import type { Checker } from "typescript/unstable/sync"
import { RULES } from "#scripts/dev/lint/rules/index.ts"
import { invocationOf } from "#scripts/dev/shared/arguments.ts"
import { DevtoolFailure, runDevtool } from "#scripts/dev/shared/devtool.ts"
import { type Finding, findingAt, renderFindings, statusOf } from "#scripts/dev/shared/finding.ts"
import { fixtureMismatchesOf, renderFixtureMismatches } from "#scripts/dev/shared/fixtures.ts"
import { nativeSession, openProgram, openProject } from "#scripts/dev/shared/native-api.ts"
import {
	covers,
	isGeneratedPath,
	isTypeScriptPath,
	isVendoredPath,
	repositoryRoot
} from "#scripts/dev/shared/repository.ts"
import { selectFiles } from "#scripts/dev/shared/selection.ts"
import { prepareSemantics } from "#scripts/dev/shared/semantic.ts"

/**
 * Superlint: the repository's opinionated type-aware rules that oxlint has no rule for. It lints the package in the
 * working directory: each workspace package's `lint` task runs it in the package, and the repository root's runs it
 * at the root, whose program is the tooling under scripts/. Explicit paths lint the files at or under them (a file
 * the tsconfig excludes is added to the program); `--fixtures` runs every rule against its fixtures instead. Exit
 * status 1 means findings, 2 that the linter itself failed.
 */

/**
 * One lint run is one package's program: the nearest tsconfig.json at or above the package root, and only the
 * files whose nearest package.json is that package's. A workspace dependency's source the program loads is that
 * dependency's to lint, so no file is reported twice.
 */

const Manifest = Schema.fromJsonString(Schema.Struct({ name: Schema.String }))

const decodeManifest = Schema.decodeUnknownEffect(Manifest)

/** Programs that compile from their own package alone. The tooling under scripts/ imports no workspace package, so
 * its typecheck and repository lint hash only scripts/ and stay correct when a package changes. */
const ISOLATED_PROGRAMS: ReadonlySet<string> = new Set(["superstarter"])

/** A source file the linter reports on, with the checker of the package's program. */
type LintSource = Readonly<{
	sourceFile: ts.SourceFile
	checker: Checker
}>

const inspectionFailure = (subject: string) => (cause: unknown) =>
	DevtoolFailure.make({ detail: `${subject} could not be inspected`, cause })

/** The nearest ancestor directory holding a package.json, no higher than the repository root: the workspace leaf
 * that owns a file. Group folders (packages/data, packages/product, …) hold no package.json and own nothing. */
const leafResolver = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const path = yield* Path.Path
	const known = new Map<string, Option.Option<string>>()
	const lookup = (directory: string): Effect.Effect<Option.Option<string>, DevtoolFailure> =>
		Effect.gen(function* () {
			if (!covers({ selected: repositoryRoot, file: directory })) {
				return Option.none()
			}
			const manifest = yield* fs
				.exists(path.join(directory, "package.json"))
				.pipe(Effect.mapError(inspectionFailure(directory)))
			if (manifest) {
				return Option.some(directory)
			}
			const parent = path.dirname(directory)
			if (directory === repositoryRoot || parent === directory) {
				return Option.none()
			}
			return yield* leafOf(parent)
		})
	const leafOf = (directory: string): Effect.Effect<Option.Option<string>, DevtoolFailure> =>
		Effect.gen(function* () {
			const cached = known.get(directory)
			if (cached !== undefined) {
				return cached
			}
			const found = yield* lookup(directory)
			known.set(directory, found)
			return found
		})
	return leafOf
})

/** The nearest tsconfig.json at or above `directory`. */
const configOf = (
	directory: string
): Effect.Effect<string, DevtoolFailure, FileSystem.FileSystem | Path.Path> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem
		const path = yield* Path.Path
		const candidate = path.join(directory, "tsconfig.json")
		const exists = yield* fs.exists(candidate).pipe(Effect.mapError(inspectionFailure(candidate)))
		if (exists) {
			return candidate
		}
		const parent = path.dirname(directory)
		if (parent === directory) {
			return yield* DevtoolFailure.make({ detail: "tsconfig.json not found" })
		}
		return yield* configOf(parent)
	})

/** A workspace leaf's declared identity: the name in its package.json, read once per leaf. */
const manifestIdentity = (path: Path.Path) => {
	const known = new Map<string, string>()
	return (directory: string): Effect.Effect<string, DevtoolFailure, FileSystem.FileSystem> =>
		Effect.gen(function* () {
			const cached = known.get(directory)
			if (cached !== undefined) {
				return cached
			}
			const fs = yield* FileSystem.FileSystem
			const manifest = path.join(directory, "package.json")
			const text = yield* fs
				.readFileString(manifest)
				.pipe(
					Effect.mapError((cause) =>
						DevtoolFailure.make({ detail: `${manifest} could not be read`, cause })
					)
				)
			const decoded = yield* decodeManifest(text).pipe(
				Effect.mapError((cause) =>
					DevtoolFailure.make({ detail: `${manifest} has no name`, cause })
				)
			)
			known.set(directory, decoded.name)
			return decoded.name
		})
}

/** Program isolation inspects the resolved program, so an indirect import cannot evade it. */
const isolationFindingsOf = (
	input: Readonly<{
		fileNames: ReadonlyArray<string>
		owner: string
		leafOf: (directory: string) => Effect.Effect<Option.Option<string>, DevtoolFailure>
		identityOf: (directory: string) => Effect.Effect<string, DevtoolFailure, FileSystem.FileSystem>
	}>
): Effect.Effect<ReadonlyArray<Finding>, DevtoolFailure, FileSystem.FileSystem | Path.Path> =>
	Effect.gen(function* () {
		if (!ISOLATED_PROGRAMS.has(input.owner)) {
			return []
		}
		const path = yield* Path.Path
		const findings = yield* Effect.forEach(
			Arr.filter(input.fileNames, (file) => !isGeneratedPath(file)),
			(file) =>
				Effect.gen(function* () {
					const leaf = yield* input.leafOf(path.dirname(file))
					if (Option.isNone(leaf)) {
						return Option.none<Finding>()
					}
					const imported = yield* input.identityOf(leaf.value)
					if (imported === input.owner) {
						return Option.none<Finding>()
					}
					return Option.some<Finding>({
						file,
						line: 1,
						column: 1,
						rule: "program-isolation",
						message: `${input.owner} must compile from its own package alone, but its program loads ${imported}.`
					})
				})
		)
		return Arr.getSomes(findings)
	})

/** The package's program and the source files it owns, with the program's isolation findings. */
const openLintProgram = (
	input: Readonly<{ packageRoot: string; extraFiles: ReadonlyArray<string> }>
) =>
	Effect.gen(function* () {
		const path = yield* Path.Path
		const config = yield* configOf(input.packageRoot)
		const project = yield* openProgram({ config, extraFiles: input.extraFiles })
		const fileNames = yield* Effect.try({
			try: () => project.program.getSourceFileNames(),
			catch: (cause) =>
				DevtoolFailure.make({ detail: "The lint program's source files could not be read", cause })
		})
		const leafOf = yield* leafResolver
		const identityOf = manifestIdentity(path)
		const owner = yield* identityOf(input.packageRoot)
		const owned = yield* Effect.filter(
			Arr.filter(fileNames, (file) => !isGeneratedPath(file) && !isVendoredPath(file)),
			(file) =>
				Effect.map(leafOf(path.dirname(file)), (leaf) => Option.contains(leaf, input.packageRoot))
		)
		const sources = yield* Effect.try({
			try: () =>
				Arr.filterMap(owned, (file): Result.Result<LintSource, void> => {
					const sourceFile = project.program.getSourceFile(file)
					if (sourceFile === undefined || sourceFile.isDeclarationFile) {
						return Result.failVoid
					}
					return Result.succeed({ sourceFile, checker: project.checker })
				}),
			catch: (cause) =>
				DevtoolFailure.make({ detail: "The lint program's source files could not be read", cause })
		})
		const isolation = yield* isolationFindingsOf({ fileNames, owner, leafOf, identityOf })
		return { sources, isolation }
	})

/** Every rule over one file in a single traversal; the engine stamps each report with its rule's id. */
const findingsOf = (source: LintSource): ReadonlyArray<Finding> => {
	const context = { ...source, semantics: prepareSemantics(source) }
	const visitors = Arr.map(RULES, (rule) => ({ rule: rule.id, visit: rule.visit(context) }))
	const findings: Array<Finding> = []
	const walk = (node: ts.Node): void => {
		findings.push(
			...Arr.flatMap(visitors, ({ rule, visit }) =>
				Arr.map(visit(node), (report) => findingAt({ sourceFile: source.sourceFile, rule, report }))
			)
		)
		node.forEachChild(walk)
	}
	walk(source.sourceFile)
	return findings
}

/** Each rule's fixtures compile in their own program; no other tool reads them. */
const FIXTURES_ROOT = `${repositoryRoot}/scripts/dev/lint/fixtures`

const checkFixtures = Effect.gen(function* () {
	const mismatches = yield* Effect.scoped(
		Effect.gen(function* () {
			const api = yield* nativeSession({ cwd: FIXTURES_ROOT })
			const project = yield* openProject({ api, config: `${FIXTURES_ROOT}/tsconfig.json` })
			return yield* Effect.try({
				try: () =>
					fixtureMismatchesOf({
						root: FIXTURES_ROOT,
						extension: ".ts",
						rules: Arr.map(RULES, (rule) => rule.id),
						runOf: ({ rule, file }) =>
							Option.map(
								Option.fromUndefinedOr(project.program.getSourceFile(file)),
								(sourceFile) => ({
									text: sourceFile.text,
									reported: Arr.filterMap(
										findingsOf({ sourceFile, checker: project.checker }),
										(finding) =>
											finding.rule === rule ? Result.succeed(finding.line) : Result.failVoid
									)
								})
							)
					}),
				catch: (cause) => DevtoolFailure.make({ detail: "superlint fixtures failed to run", cause })
			})
		})
	)
	yield* Console.log(
		renderFixtureMismatches({ tool: "superlint", rules: RULES.length, mismatches })
	)
	return statusOf(mismatches)
})

const main = Effect.gen(function* () {
	const invocation = yield* invocationOf(["--fixtures"])
	if (invocation.flags.has("--fixtures")) {
		return yield* checkFixtures
	}
	const packageRoot = yield* Effect.sync(() => process.cwd())
	const findings = yield* Effect.scoped(
		Effect.gen(function* () {
			const program = yield* openLintProgram({
				packageRoot,
				extraFiles: Arr.filter(invocation.paths, isTypeScriptPath)
			})
			const selected = yield* selectFiles({
				available: Arr.map(program.sources, (source) => source.sourceFile.fileName),
				paths: invocation.paths
			})
			const sources = Arr.filter(program.sources, (source) =>
				Arr.contains(selected, source.sourceFile.fileName)
			)
			return yield* Effect.try({
				try: () => [...program.isolation, ...Arr.flatMap(sources, findingsOf)],
				catch: (cause) =>
					DevtoolFailure.make({ detail: "superlint failed while collecting findings", cause })
			})
		})
	)
	yield* Console.log(renderFindings({ tool: "superlint", findings }))
	return statusOf(findings)
})

runDevtool(main)
