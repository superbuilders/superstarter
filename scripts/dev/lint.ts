#!/usr/bin/env -S node

import { NodeRuntime, NodeServices } from "@effect/platform-node"
import {
	Array as Arr,
	Console,
	Effect,
	FileSystem,
	Option,
	Order,
	Path,
	Result,
	Schema,
	type Scope,
	String as Str
} from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import type * as ts from "typescript/unstable/ast"
import type { FileSystem as NativeFileSystem } from "typescript/unstable/fs"
import type { Checker, Project } from "typescript/unstable/sync"
import { DevtoolFailure, exitWith, reportFailure } from "#scripts/dev/devtool-failure.ts"
import { RULES } from "#scripts/dev/lint/rules/index.ts"
import { prepareSemantics } from "#scripts/dev/lint/semantic.ts"
import { Violation } from "#scripts/dev/lint/types.ts"
import { invocationOf } from "#scripts/dev/shared/arguments.ts"
import { jsonEncoder } from "#scripts/dev/shared/json.ts"
import { nativeSession, openProjects } from "#scripts/dev/shared/native-api.ts"
import {
	covers,
	isGeneratedPath,
	isTypeScriptPath,
	isVendoredPath,
	repositoryPath,
	repositoryRoot
} from "#scripts/dev/shared/repository.ts"

/**
 * Superlint: the repository's opinionated type-aware rules that oxlint has no rule for. It lints one package: the
 * one in the working directory (each workspace package's `lint` task), or with `--repository` the repository
 * root's tooling. `--fixtures` runs every rule against its fixtures instead. `--staged` lints the staged files, explicit paths lint the files at or under them (a file the
 * tsconfig excludes is added to the program), `--json` prints the violations as JSON. Exit status 1 means
 * violations were found, 2 that the linter itself failed.
 */

/**
 * One lint run is one package's program: the nearest tsconfig.json at or above the package root, and only the
 * files whose nearest package.json is that package's. A workspace dependency's source the program loads is that
 * dependency's to lint, so no file is reported twice. The repository root is a package too: its program is the
 * tooling under scripts/.
 */

const OverlayConfig = Schema.Struct({
	extends: Schema.String,
	files: Schema.Array(Schema.String)
})

const encodeOverlay = jsonEncoder(OverlayConfig)

const Manifest = Schema.fromJsonString(Schema.Struct({ name: Schema.String }))

const decodeManifest = Schema.decodeUnknownEffect(Manifest)

/** A program whose package must compile without another package's implementation. The tooling never loads the
 * app: it consumes owned contracts instead. */
const FORBIDDEN_PROGRAMS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
	["superstarter", new Set(["@superstarter/nextjs-app"])]
])

/** A source file the linter reports on, with the checker of the package's program. */
type LintSource = Readonly<{
	sourceFile: ts.SourceFile
	checker: Checker
}>

/** The opened program of one package, with the package's own maintained files. */
type LintProgram = Readonly<{
	project: Project
	sources: ReadonlyArray<LintSource>
	isolation: ReadonlyArray<Violation>
}>

const isInsideRepository = (directory: string): boolean => {
	if (directory === repositoryRoot) {
		return true
	}
	return Str.startsWith(`${repositoryRoot}/`)(directory)
}

/** The nearest ancestor directory holding a package.json, no higher than the repository root: the workspace leaf
 * that owns a file. Group folders (packages/data, packages/product, …) hold no package.json and own nothing. */
const leafResolver = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const path = yield* Path.Path
	const known = new Map<string, Option.Option<string>>()
	const leafOf = (directory: string): Effect.Effect<Option.Option<string>, DevtoolFailure> =>
		Effect.gen(function* () {
			const cached = known.get(directory)
			if (cached !== undefined) {
				return cached
			}
			const inside = isInsideRepository(directory)
			const manifest = yield* fs
				.exists(path.join(directory, "package.json"))
				.pipe(
					Effect.mapError((cause) =>
						DevtoolFailure.make({ detail: `${directory} could not be inspected`, cause })
					)
				)
			const parent = path.dirname(directory)
			const found = yield* resolvedLeaf({ inside, manifest, directory, parent, leafOf })
			known.set(directory, found)
			return found
		})
	return leafOf
})

const resolvedLeaf = (
	input: Readonly<{
		inside: boolean
		manifest: boolean
		directory: string
		parent: string
		leafOf: (directory: string) => Effect.Effect<Option.Option<string>, DevtoolFailure>
	}>
): Effect.Effect<Option.Option<string>, DevtoolFailure> => {
	if (!input.inside) {
		return Effect.succeedNone
	}
	if (input.manifest) {
		return Effect.succeedSome(input.directory)
	}
	if (input.directory === repositoryRoot || input.parent === input.directory) {
		return Effect.succeedNone
	}
	return input.leafOf(input.parent)
}

/** The nearest tsconfig.json at or above `directory`. */
const configOf = (
	directory: string
): Effect.Effect<string, DevtoolFailure, FileSystem.FileSystem | Path.Path> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem
		const path = yield* Path.Path
		const candidate = path.join(directory, "tsconfig.json")
		const exists = yield* fs
			.exists(candidate)
			.pipe(
				Effect.mapError((cause) =>
					DevtoolFailure.make({ detail: `${candidate} could not be inspected`, cause })
				)
			)
		if (exists) {
			return candidate
		}
		const parent = path.dirname(directory)
		if (parent === directory) {
			return yield* DevtoolFailure.make({ detail: "tsconfig.json not found" })
		}
		return yield* configOf(parent)
	})

/**
 * Opens the package's program in one native session. When a tool is pointed at a file the tsconfig excludes (a
 * scratch file, say), the config is served as an overlay that extends a virtual copy of itself, placed beside it so
 * its relative paths resolve the same, and adds the file, so it is checked with the package's real options.
 */
const openLintProgram = (
	input: Readonly<{ packageRoot: string; extraFiles: ReadonlyArray<string> }>
): Effect.Effect<LintProgram, DevtoolFailure, Scope.Scope | FileSystem.FileSystem | Path.Path> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem
		const path = yield* Path.Path
		const config = yield* configOf(input.packageRoot)
		const configText = yield* fs
			.readFileString(config)
			.pipe(
				Effect.mapError((cause) =>
					DevtoolFailure.make({ detail: `${config} could not be read`, cause })
				)
			)
		const overlayBase = path.join(path.dirname(config), ".superlint-base.tsconfig.json")
		const overlay = yield* encodeOverlay({ extends: overlayBase, files: input.extraFiles })
		const nativeFs: NativeFileSystem = {
			readFile: (file) => {
				if (file === config) {
					return overlay
				}
				return file === overlayBase ? configText : undefined
			},
			fileExists: (file) => (file === overlayBase ? true : undefined)
		}
		const api = yield* Arr.isReadonlyArrayNonEmpty(input.extraFiles)
			? nativeSession({ cwd: input.packageRoot, fs: nativeFs })
			: nativeSession({ cwd: input.packageRoot })
		const [project] = yield* openProjects({ api, configs: [config] })
		if (project === undefined) {
			return yield* DevtoolFailure.make({ detail: `The lint program ${config} was not opened` })
		}
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
				Arr.filterMap(owned, (file) => {
					const sourceFile = project.program.getSourceFile(file)
					if (sourceFile === undefined || sourceFile.isDeclarationFile) {
						return Result.failVoid
					}
					return Result.succeed({ sourceFile, checker: project.checker })
				}),
			catch: (cause) =>
				DevtoolFailure.make({ detail: "The lint program's source files could not be read", cause })
		})
		const isolation = yield* isolationViolationsOf({ fileNames, owner, leafOf, identityOf })
		return { project, sources, isolation }
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
const isolationViolationsOf = (
	input: Readonly<{
		fileNames: ReadonlyArray<string>
		owner: string
		leafOf: (directory: string) => Effect.Effect<Option.Option<string>, DevtoolFailure>
		identityOf: (directory: string) => Effect.Effect<string, DevtoolFailure, FileSystem.FileSystem>
	}>
): Effect.Effect<ReadonlyArray<Violation>, DevtoolFailure, FileSystem.FileSystem | Path.Path> =>
	Effect.gen(function* () {
		const forbidden = FORBIDDEN_PROGRAMS.get(input.owner)
		if (forbidden === undefined) {
			return []
		}
		const path = yield* Path.Path
		const workspaceFiles = Arr.filter(input.fileNames, (file) => !isGeneratedPath(file))
		const violations = yield* Effect.forEach(workspaceFiles, (file) =>
			Effect.gen(function* () {
				const leaf = yield* input.leafOf(path.dirname(file))
				if (Option.isNone(leaf)) {
					return Option.none<Violation>()
				}
				const imported = yield* input.identityOf(leaf.value)
				if (imported === input.owner || !forbidden.has(imported)) {
					return Option.none<Violation>()
				}
				return Option.some<Violation>({
					file,
					line: 1,
					column: 1,
					rule: "program-isolation",
					message: `${input.owner} must compile independently of ${imported}; consume an owned contract instead of its implementation.`
				})
			})
		)
		return Arr.getSomes(violations)
	})

const ViolationReport = Schema.Struct({ violations: Schema.Array(Violation) })

const encodeReport = jsonEncoder(ViolationReport)

const byLocation = Order.combineAll<Violation>([
	Order.mapInput(Order.String, (violation: Violation) => violation.file),
	Order.mapInput(Order.Number, (violation: Violation) => violation.line),
	Order.mapInput(Order.Number, (violation: Violation) => violation.column),
	Order.mapInput(Order.String, (violation: Violation) => violation.rule)
])

const violationsOf = (source: LintSource): ReadonlyArray<Violation> => {
	const semantics = prepareSemantics(source)
	return Arr.flatMap(RULES, (rule) => rule.check({ ...source, semantics }))
}

const renderText = (violations: ReadonlyArray<Violation>): string => {
	if (!Arr.isReadonlyArrayNonEmpty(violations)) {
		return "superlint: no violations found"
	}
	const lines = Arr.flatMap(violations, (violation) => {
		const located = `${repositoryPath(violation.file)}:${violation.line}:${violation.column} ${violation.rule} ${violation.message}`
		return violation.suggestion === undefined ? [located] : [located, `  ↳ ${violation.suggestion}`]
	})
	return Arr.join([...lines, `superlint: ${violations.length} violation(s)`], "\n")
}

const stagedTypeScriptFiles = Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
	const output = yield* spawner
		.string(
			ChildProcess.make("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], {
				cwd: repositoryRoot
			})
		)
		.pipe(
			Effect.mapError((cause) =>
				DevtoolFailure.make({ detail: "git could not list the staged files", cause })
			)
		)
	return Arr.map(
		Arr.filter(Str.split("\0")(output), (file) => Str.isNonEmpty(file) && isTypeScriptPath(file)),
		(file) => `${repositoryRoot}/${file}`
	)
})

/** Each rule's fixtures: `<rule id>/violating.ts` marks with a trailing `// violation` every line the rule must
 * report, and `<rule id>/clean.ts` must draw none. The fixtures compile in their own program; no other tool reads
 * them. */
const FIXTURES_ROOT = `${repositoryRoot}/scripts/dev/lint/fixtures`
const FIXTURE_MARKER = "// violation"
const FIXTURE_FILES: ReadonlyArray<string> = ["violating.ts", "clean.ts"]

/** One fixture whose reported lines differ from its marked lines. */
type FixtureMismatch = Readonly<{
	file: string
	missing: ReadonlyArray<number>
	unexpected: ReadonlyArray<number>
}>

const markedLinesOf = (text: string): ReadonlyArray<number> =>
	Arr.filterMap(Str.split("\n")(text), (line, index) =>
		Str.includes(FIXTURE_MARKER)(line) ? Result.succeed(index + 1) : Result.failVoid
	)

const openFixturePrograms = Effect.gen(function* () {
	const api = yield* nativeSession({ cwd: FIXTURES_ROOT })
	const config = `${FIXTURES_ROOT}/tsconfig.json`
	const [project] = yield* openProjects({ api, configs: [config] })
	if (project === undefined) {
		return yield* DevtoolFailure.make({ detail: `The fixture program ${config} was not opened` })
	}
	return project
})

/** Every rule against its own fixtures, line for line. A missing fixture is a mismatch too. */
const fixtureMismatchesOf = (project: Project): ReadonlyArray<FixtureMismatch> =>
	Arr.flatMap(RULES, (rule) =>
		Arr.filterMap(FIXTURE_FILES, (name) => {
			const file = `${FIXTURES_ROOT}/${rule.id}/${name}`
			const sourceFile = project.program.getSourceFile(file)
			if (sourceFile === undefined) {
				return Result.succeed({ file, missing: [0], unexpected: [] })
			}
			const source = { sourceFile, checker: project.checker }
			const semantics = prepareSemantics(source)
			const reported = Arr.dedupe(
				Arr.map(
					Arr.filter(
						rule.check({ ...source, semantics }),
						(violation) => violation.rule === rule.id
					),
					(violation) => violation.line
				)
			)
			const marked = markedLinesOf(sourceFile.text)
			const expectsSome = name === "violating.ts"
			const missing = Arr.difference(marked, reported)
			const unexpected = Arr.difference(reported, marked)
			const unmarked = expectsSome && !Arr.isReadonlyArrayNonEmpty(marked)
			if (
				Arr.isReadonlyArrayNonEmpty(missing) ||
				Arr.isReadonlyArrayNonEmpty(unexpected) ||
				unmarked
			) {
				return Result.succeed({ file, missing: unmarked ? [0] : missing, unexpected })
			}
			return Result.failVoid
		})
	)

const renderFixtures = (mismatches: ReadonlyArray<FixtureMismatch>): string => {
	if (!Arr.isReadonlyArrayNonEmpty(mismatches)) {
		return `superlint fixtures: ${RULES.length} rules agree with their fixtures`
	}
	const lines = Arr.map(
		mismatches,
		(mismatch) =>
			`${repositoryPath(mismatch.file)}: missing [${Arr.join(Arr.map(mismatch.missing, String), ", ")}] unexpected [${Arr.join(Arr.map(mismatch.unexpected, String), ", ")}]`
	)
	return Arr.join([...lines, `superlint fixtures: ${mismatches.length} fixture(s) disagree`], "\n")
}

const checkFixtures = Effect.gen(function* () {
	const mismatches = yield* Effect.scoped(
		Effect.gen(function* () {
			const project = yield* openFixturePrograms
			return yield* Effect.try({
				try: () => fixtureMismatchesOf(project),
				catch: (cause) => DevtoolFailure.make({ detail: "superlint fixtures failed to run", cause })
			})
		})
	)
	yield* Console.log(renderFixtures(mismatches))
	if (Arr.isReadonlyArrayNonEmpty(mismatches)) {
		yield* exitWith(1)
	}
})

const main = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const path = yield* Path.Path
	const invocation = yield* invocationOf(["--json", "--staged", "--repository", "--fixtures"])
	if (invocation.flags.has("--fixtures")) {
		return yield* checkFixtures
	}
	const packageRoot = invocation.flags.has("--repository")
		? repositoryRoot
		: yield* Effect.sync(() => process.cwd())
	const explicit = Arr.map(invocation.paths, (argument) => path.resolve(argument))
	const staged = invocation.flags.has("--staged")
	const selected = staged ? yield* stagedTypeScriptFiles : explicit
	if (staged && !Arr.isReadonlyArrayNonEmpty(selected)) {
		yield* Console.log("superlint: no staged TypeScript files")
		return
	}
	const missing = yield* Effect.filter(explicit, (file) =>
		fs.exists(file).pipe(
			Effect.map((exists) => !exists),
			Effect.mapError((cause) =>
				DevtoolFailure.make({ detail: `${file} could not be checked`, cause })
			)
		)
	)
	if (Arr.isReadonlyArrayNonEmpty(missing)) {
		return yield* DevtoolFailure.make({ detail: `No such path: ${Arr.join(missing, ", ")}` })
	}
	const selects = (file: string): boolean => {
		if (!Arr.isReadonlyArrayNonEmpty(selected)) {
			return true
		}
		return Arr.some(selected, (choice) => covers({ selected: choice, file }))
	}
	const violations = yield* Effect.scoped(
		Effect.gen(function* () {
			const program = yield* openLintProgram({
				packageRoot,
				extraFiles: Arr.filter(explicit, isTypeScriptPath)
			})
			const sources = Arr.filter(program.sources, (source) => selects(source.sourceFile.fileName))
			return yield* Effect.try({
				try: () =>
					Arr.sort([...program.isolation, ...Arr.flatMap(sources, violationsOf)], byLocation),
				catch: (cause) =>
					DevtoolFailure.make({ detail: "superlint failed while collecting violations", cause })
			})
		})
	)
	const output = invocation.flags.has("--json")
		? yield* encodeReport({ violations })
		: renderText(violations)
	yield* Console.log(output)
	if (Arr.isReadonlyArrayNonEmpty(violations)) {
		yield* exitWith(1)
	}
}).pipe(Effect.catchTag("DevtoolFailure", reportFailure))

// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(main.pipe(Effect.provide(NodeServices.layer)))
