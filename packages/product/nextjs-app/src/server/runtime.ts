import "server-only"
import {
	makeOperationalTelemetry,
	OperationalTelemetry,
	withOperationalTelemetry
} from "@superstarter/operational-telemetry/effect"
import { Effect, Layer, ManagedRuntime } from "effect"
import { cacheSignal } from "react"
import { deployment } from "#env.ts"
import { type TelemetrySink, TelemetrySinkLive } from "#server/observability/sink.ts"
import { type ApplicationPostgres, ApplicationPostgresLive } from "#server/postgres/runtime.ts"

/** What every web entry point's Effect may require: the process's services, nothing per request. */
export type WebServices = OperationalTelemetry | TelemetrySink | ApplicationPostgres

const OperationalTelemetryLive = Layer.effect(
	OperationalTelemetry,
	Effect.flatMap(Effect.orDie(deployment), (admitted) =>
		makeOperationalTelemetry({ service: "superstarter-web", deployment: admitted })
	)
)

/** The process's services: its telemetry, where that telemetry goes, and its database pool. */
const WebLive = Layer.mergeAll(TelemetrySinkLive, ApplicationPostgresLive).pipe(
	Layer.provideMerge(OperationalTelemetryLive)
)

type WebRuntime = ManagedRuntime.ManagedRuntime<WebServices, never>

declare global {
	// Next evaluates a module once per bundle (instrumentation, then each chunk group), so the one
	// runtime per process lives here, where every bundle finds it. This is the process's only
	// global: everything it holds is a service of the runtime.
	var superstarterWebRuntime: WebRuntime | undefined
}

/**
 * The process's one Effect runtime, built on first use (Next's instrumentation registers telemetry
 * before the first request) and shared by every bundle. Concurrent invocations on one Fluid
 * compute instance run on it together; what belongs to one request stays in that request's fiber
 * and async context, never in a service.
 * https://vercel.com/docs/fluid-compute#isolation-boundaries-and-global-state
 */
export const webRuntime = (): WebRuntime => {
	const existing = globalThis.superstarterWebRuntime
	if (existing !== undefined) {
		return existing
	}
	const created = ManagedRuntime.make(WebLive)
	globalThis.superstarterWebRuntime = created
	return created
}

/** Runs one web entry point's Effect on the process runtime, under the process's telemetry. */
export const runWeb = <A, E>(work: Effect.Effect<A, E, WebServices>): Promise<A> =>
	webRuntime().runPromise(work.pipe(withOperationalTelemetry))

/** The abort signal of the React render now running, when there is one. */
const renderSignal = (): AbortSignal | undefined => {
	const signal = cacheSignal()
	return signal instanceof AbortSignal ? signal : undefined
}

/**
 * A server read run for the React render that awaits it; the render owns its lifetime. React
 * aborts `cacheSignal()` when that render ends: completed, failed, or aborted, as when Next
 * abandons a prospective or prefetch render once its response no longer needs the segment. The
 * abort interrupts the read before the response ends, so it starts no further statement or call
 * and its spans end with their true `interrupted` outcome instead of being ended by `@vercel/otel`
 * with the request's root. Outside a render (a server action) there is no signal.
 */
export const runRenderRead = <A, E>(read: Effect.Effect<A, E, WebServices>): Promise<A> => {
	const signal = renderSignal()
	const options = signal === undefined ? {} : { signal }
	return webRuntime().runPromise(read.pipe(withOperationalTelemetry), options)
}
