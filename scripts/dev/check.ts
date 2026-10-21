#!/usr/bin/env -S node

import { NodeRuntime, NodeServices } from "@effect/platform-node"
import {
	Array as Arr,
	Config,
	ConfigProvider,
	Effect,
	FileSystem,
	Option,
	Record,
	Schema,
	String as Str
} from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import { DevtoolFailure, reportFailure } from "#scripts/dev/devtool-failure.ts"
import { jsonEncoder } from "#scripts/dev/shared/json.ts"
import { repositoryRoot } from "#scripts/dev/shared/repository.ts"

/**
 * The gate's launcher: `node scripts/dev/check.ts <task…>` runs `turbo run <task…>`, which replays every task whose
 * inputs did not change. Concurrency comes from an explicit `--concurrency`, else the shell's CHECK_CONCURRENCY,
 * else the root .env.local's, else turbo's own default. The Node runtime is part of every task's cache key, so
 * another Node never replays this one's results.
 */

const TURBO = `${repositoryRoot}/node_modules/turbo/bin/turbo`

const LOCAL_ENV_FILE = `${repositoryRoot}/.env.local`

const CheckConcurrency = Schema.Int.check(
	Schema.isGreaterThan(0),
	Schema.makeFilter(Number.isSafeInteger)
)

const checkConcurrency = Config.option(Config.schema(CheckConcurrency, "CHECK_CONCURRENCY"))

/** Runtime identity is a cache input, not an ambient promise about the installed Node. */
const RuntimeIdentity = Schema.Struct({
	versions: Schema.Record(Schema.String, Schema.String),
	platform: Schema.String,
	arch: Schema.String,
	execArgv: Schema.Array(Schema.String)
})

const encodeRuntime = jsonEncoder(RuntimeIdentity)

const concurrencyFailure = (cause: unknown): DevtoolFailure =>
	DevtoolFailure.make({ detail: "CHECK_CONCURRENCY must be a positive safe integer", cause })

/** The root .env.local's CHECK_CONCURRENCY, read from that file alone; nothing else in it is loaded. */
const localConcurrency = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const present = yield* fs.exists(LOCAL_ENV_FILE)
	if (!present) {
		return Option.none()
	}
	const provider = yield* ConfigProvider.fromDotEnv({ path: LOCAL_ENV_FILE })
	return yield* checkConcurrency.pipe(
		Effect.provideService(ConfigProvider.ConfigProvider, provider),
		Effect.mapError(concurrencyFailure)
	)
}).pipe(
	Effect.catchTag("PlatformError", (cause) =>
		Effect.fail(DevtoolFailure.make({ detail: "The root .env.local could not be read", cause }))
	)
)

const isConcurrencyFlag = (argument: string): boolean => {
	if (argument === "--concurrency") {
		return true
	}
	return Str.startsWith("--concurrency=")(argument)
}

const concurrencyArgumentsOf = (taskArguments: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		if (Arr.some(taskArguments, isConcurrencyFlag)) {
			return []
		}
		const shell = yield* checkConcurrency.pipe(Effect.mapError(concurrencyFailure))
		const configured = Option.isSome(shell) ? shell : yield* localConcurrency
		return Option.match(configured, {
			onNone: () => [],
			onSome: (concurrency) => [`--concurrency=${concurrency}`]
		})
	})

const main = Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
	const taskArguments = yield* Effect.sync((): ReadonlyArray<string> => process.argv.slice(2))
	const concurrency = yield* concurrencyArgumentsOf(taskArguments)
	const runtime = yield* encodeRuntime({
		versions: Record.getSomes(Record.map(process.versions, Option.fromNullishOr)),
		platform: process.platform,
		arch: process.arch,
		execArgv: process.execArgv
	})
	const exitCode = yield* spawner
		.exitCode(
			ChildProcess.make(process.execPath, [TURBO, "run", ...concurrency, ...taskArguments], {
				cwd: repositoryRoot,
				env: { SUPERSTARTER_CHECK_RUNTIME: runtime },
				extendEnv: true,
				stdin: "inherit",
				stdout: "inherit",
				stderr: "inherit"
			})
		)
		.pipe(Effect.mapError((cause) => DevtoolFailure.make({ detail: "turbo could not run", cause })))
	yield* Effect.sync(() => {
		process.exitCode = exitCode
	})
}).pipe(Effect.catchTag("DevtoolFailure", reportFailure))

// The entry point provides Node's platform services, once, for the whole command.
// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(main.pipe(Effect.provide(NodeServices.layer)))
