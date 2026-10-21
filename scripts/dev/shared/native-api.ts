import { Array as Arr, Effect, type Scope } from "effect"
import type { FileSystem as NativeFileSystem } from "typescript/unstable/fs"
import { API, type Project, type Snapshot } from "typescript/unstable/sync"
import { DevtoolFailure } from "#scripts/dev/devtool-failure.ts"

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

const projectIn = (snapshot: Snapshot) => (config: string) =>
	Effect.gen(function* () {
		const project = snapshot.getProject(config)
		if (project === undefined) {
			return yield* DevtoolFailure.make({ detail: `The native compiler did not open ${config}` })
		}
		const diagnostics = yield* Effect.try({
			try: () => project.program.getConfigFileParsingDiagnostics(),
			catch: (cause) => DevtoolFailure.make({ detail: `${config} could not be read`, cause })
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

/** Opens tsconfig projects in one snapshot, in config order. A config the compiler rejects is a failure. */
export const openProjects = (
	input: Readonly<{ api: API; configs: ReadonlyArray<string> }>
): Effect.Effect<ReadonlyArray<Project>, DevtoolFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const snapshot = yield* Effect.acquireDisposable(
			Effect.try({
				try: () => input.api.updateSnapshot({ openProjects: [...input.configs] }),
				catch: (cause) =>
					DevtoolFailure.make({ detail: "The native compiler could not build the program", cause })
			})
		)
		return yield* Effect.forEach(input.configs, projectIn(snapshot))
	})

/** The root files a tsconfig selects, from its files, include and exclude, without building a program. */
export const configFileNames = (
	input: Readonly<{ api: API; config: string }>
): Effect.Effect<ReadonlyArray<string>, DevtoolFailure> =>
	Effect.try({
		try: () => input.api.parseConfigFile(input.config).fileNames,
		catch: (cause) => DevtoolFailure.make({ detail: `${input.config} could not be parsed`, cause })
	})
