import { Array as Arr, Effect, Schema, type Scope } from "effect"
import type { FileSystem as NativeFileSystem } from "typescript/unstable/fs"
import { API, type Project } from "typescript/unstable/sync"
import { DevtoolFailure } from "#scripts/dev/shared/devtool.ts"
import { jsonEncoder } from "#scripts/dev/shared/json.ts"
import { directoryOf } from "#scripts/dev/shared/repository.ts"

/**
 * One native compiler session. The tsgo process lives exactly as long as the scope, and every call into it is a
 * synchronous IPC round trip, so callers batch their checker calls.
 */
export const nativeSession = (
	options: Readonly<{ cwd: string; fs?: NativeFileSystem }>
): Effect.Effect<API, DevtoolFailure, Scope.Scope> =>
	Effect.acquireRelease(
		Effect.try({
			try: () => new API(options),
			catch: (cause) =>
				DevtoolFailure.make({ detail: "The native TypeScript compiler did not start", cause })
		}),
		(api) =>
			Effect.sync(() => {
				api.close()
			})
	)

/** Opens one tsconfig project in its own snapshot. A config the compiler rejects is a failure. */
export const openProject = (
	input: Readonly<{ api: API; config: string }>
): Effect.Effect<Project, DevtoolFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const snapshot = yield* Effect.acquireDisposable(
			Effect.try({
				try: () => input.api.updateSnapshot({ openProjects: [input.config] }),
				catch: (cause) =>
					DevtoolFailure.make({ detail: "The native compiler could not build the program", cause })
			})
		)
		const project = snapshot.getProject(input.config)
		if (project === undefined) {
			return yield* DevtoolFailure.make({
				detail: `The native compiler did not open ${input.config}`
			})
		}
		const diagnostics = yield* Effect.try({
			try: () => project.program.getConfigFileParsingDiagnostics(),
			catch: (cause) => DevtoolFailure.make({ detail: `${input.config} could not be read`, cause })
		})
		if (Arr.isReadonlyArrayNonEmpty(diagnostics)) {
			return yield* DevtoolFailure.make({
				detail: Arr.join(
					Arr.map(diagnostics, (diagnostic) => diagnostic.text),
					"\n"
				)
			})
		}
		return project
	})

const OverlayConfig = Schema.Struct({
	extends: Schema.String,
	files: Schema.Array(Schema.String)
})

const encodeOverlay = jsonEncoder(OverlayConfig)

/**
 * Opens a tsconfig's program in a session of its own. Files the tsconfig leaves out (a scratch file a tool was
 * pointed at) are added through an overlay: a virtual config beside the real one, so its relative paths resolve
 * the same, that extends it and adds the files, so they are checked with the project's real options.
 */
export const openProgram = (
	input: Readonly<{ config: string; extraFiles: ReadonlyArray<string> }>
): Effect.Effect<Project, DevtoolFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const cwd = directoryOf(input.config)
		if (!Arr.isReadonlyArrayNonEmpty(input.extraFiles)) {
			const api = yield* nativeSession({ cwd })
			return yield* openProject({ api, config: input.config })
		}
		const overlayConfig = `${cwd}/.overlay.tsconfig.json`
		const overlay = yield* encodeOverlay({ extends: input.config, files: input.extraFiles })
		const nativeFs: NativeFileSystem = {
			readFile: (file) => (file === overlayConfig ? overlay : undefined),
			fileExists: (file) => (file === overlayConfig ? true : undefined)
		}
		const api = yield* nativeSession({ cwd, fs: nativeFs })
		return yield* openProject({ api, config: overlayConfig })
	})

/** The root files a tsconfig selects, from its files, include and exclude, without building a program. */
export const configFileNames = (
	input: Readonly<{ api: API; config: string }>
): Effect.Effect<ReadonlyArray<string>, DevtoolFailure> =>
	Effect.try({
		try: () => input.api.parseConfigFile(input.config).fileNames,
		catch: (cause) => DevtoolFailure.make({ detail: `${input.config} could not be parsed`, cause })
	})
