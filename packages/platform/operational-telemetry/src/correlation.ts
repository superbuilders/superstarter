import {
	type Attributes,
	type Context,
	context,
	createContextKey,
	isSpanContextValid,
	type TextMapPropagator,
	trace
} from "@opentelemetry/api"
import { Option, Schema, String as Str } from "effect"
import { Uuid } from "#schema.ts"

const replayKey = createContextKey("superstarter.posthog.replay")
/** The header posthog-js adds to same-origin requests (`tracing_headers`) with its session id. */
export const REPLAY_HEADER = "x-posthog-session-id"
const decodeReplay = Schema.decodeUnknownOption(Uuid)

/** An untrusted correlation header is admitted once; it never grants identity or access. */
export const replayAttributes = (value: unknown): Readonly<{ "session.id"?: typeof Uuid.Type }> =>
	Option.match(decodeReplay(value), {
		onNone: () => ({}),
		onSome: (session) => ({ "session.id": session })
	})

/** The replay session the request carried, held in the OTel context the propagator extracted. */
export const requestCorrelation = (parent: Context = context.active()): Attributes => {
	const replay: unknown = parent.getValue(replayKey)
	return typeof replay === "string" ? { "session.id": replay } : {}
}

/** PostHog's browser session header complements W3C trace context. No person id is trusted from
 * the browser. */
export const replayPropagator: TextMapPropagator = {
	fields: () => [REPLAY_HEADER],
	inject(parent, carrier, setter) {
		const replay = requestCorrelation(parent)["session.id"]
		if (typeof replay === "string") {
			setter.set(carrier, REPLAY_HEADER, replay)
		}
	},
	extract(parent, carrier, getter) {
		const replay = replayAttributes(getter.get(carrier, REPLAY_HEADER))["session.id"]
		return replay === undefined ? parent : parent.setValue(replayKey, replay)
	}
}

/**
 * W3C trace context for outbound calls only. Inbound, the `traceparent` Vercel's proxy adds names
 * a span no exporter receives, so extracting it would make every request span a child of a parent
 * PostHog never sees; extraction keeps the request span the root of the application's trace.
 * https://www.w3.org/TR/trace-context/#traceparent-header
 */
export const outboundTraceContextPropagator: TextMapPropagator = {
	fields: () => ["traceparent", "tracestate"],
	inject(parent, carrier, setter) {
		const span = trace.getSpanContext(parent)
		if (span === undefined || !isSpanContextValid(span)) {
			return
		}
		const flags = Str.padStart(2, "0")(span.traceFlags.toString(16))
		setter.set(carrier, "traceparent", `00-${span.traceId}-${span.spanId}-${flags}`)
		const state = span.traceState?.serialize()
		if (state !== undefined && state !== "") {
			setter.set(carrier, "tracestate", state)
		}
	},
	extract: (parent) => parent
}
