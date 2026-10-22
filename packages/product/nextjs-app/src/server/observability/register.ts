import "server-only"
import { OperationalTelemetry } from "@superstarter/operational-telemetry/effect"
import type { OperationalDeployment } from "@superstarter/operational-telemetry/schema"
import { Effect, Record } from "effect"
import { webRuntime } from "#server/runtime.ts"

/** The signals that stop a server, by POSIX number: a process a signal stopped exits with 128 plus
 * the signal's number, as Next's own handler would. */
const STOP_SIGNALS = { SIGINT: 2, SIGTERM: 15 } as const

/** How long disposing the runtime may take before the process exits anyway. */
const DISPOSAL_BOUND = "5 seconds"

/**
 * The process's one exit hook. A stop signal disposes the web runtime, which ends the PostgreSQL
 * pool and then shuts the telemetry pipeline down, so the last metrics, spans and logs are written,
 * then exits. Next installs no handler of its own (`NEXT_MANUAL_SIG_HANDLE=true` in the app's
 * scripts): its handler exits as soon as its own cleanup ends, before an async disposal finishes.
 * A signal that arrives while the process is stopping changes nothing; the bound still holds.
 */
const exitOnStop = (dispose: Effect.Effect<void>): void => {
	let stopping = false
	for (const signal of Record.keys(STOP_SIGNALS)) {
		process.on(signal, () => {
			if (stopping) {
				return
			}
			stopping = true
			Effect.runFork(
				dispose.pipe(
					Effect.timeout(DISPOSAL_BOUND),
					Effect.ignore,
					Effect.andThen(
						Effect.sync(() => {
							process.exit(128 + STOP_SIGNALS[signal])
						})
					)
				)
			)
		})
	}
}

/** Builds this process's one runtime, which registers its telemetry, so the instrumentation bundle
 * and every app bundle report under the same instance, tracer and sinks; installs the exit hook;
 * and answers the deployment the runtime admitted. */
export const registerWebObservability = (): Promise<OperationalDeployment> => {
	const runtime = webRuntime()
	exitOnStop(runtime.disposeEffect)
	return runtime.runPromise(Effect.map(OperationalTelemetry, ({ origin }) => origin.deployment))
}
