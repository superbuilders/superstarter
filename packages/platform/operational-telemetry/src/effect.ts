import {
	context,
	type Context as OtelContext,
	type HrTime,
	isSpanContextValid,
	metrics,
	ROOT_CONTEXT,
	type Span,
	type SpanContext,
	SpanKind,
	SpanStatusCode,
	TraceFlags,
	trace
} from "@opentelemetry/api"

import {
	Array as Arr,
	Cause,
	Context,
	Effect,
	Exit,
	Function as Fn,
	Logger,
	Option,
	Record,
	Ref,
	References,
	type Schema,
	Tracer
} from "effect"
import { v7 } from "uuid"
import { requestCorrelation } from "#correlation.ts"
import { failureCodesOf, failureExceptionOf } from "#failure.ts"
import { emitOperationalLog } from "#logs.ts"
import { attributesOfDeployment, OPERATIONAL_SCOPE } from "#resource.ts"

import type { OperationalDeployment, OperationalOrigin, SharedAttributes } from "#schema.ts"

import { correlationAttributes, definedAttributes, telemetryAttributes } from "#span-export.ts"
import type { OperationalSpan, OperationScope } from "#spans.ts"

const spanKinds = {
	internal: SpanKind.INTERNAL,
	server: SpanKind.SERVER,
	client: SpanKind.CLIENT,
	producer: SpanKind.PRODUCER,
	consumer: SpanKind.CONSUMER
} satisfies Record<Tracer.SpanKind, SpanKind>

/** Effect clocks report epoch nanoseconds; OTel's HrTime keeps them exact instead of rounding
 * every span boundary through a floating-point millisecond. */
const hrTimeOf = (nanoseconds: bigint): HrTime => [
	Number(nanoseconds / 1_000_000_000n),
	Number(nanoseconds % 1_000_000_000n)
]

const spanContextOf = (span: Tracer.AnySpan): SpanContext => {
	const traceFlags = span.sampled ? TraceFlags.SAMPLED : TraceFlags.NONE
	return { traceId: span.traceId, spanId: span.spanId, traceFlags }
}

const otelLink = (link: Tracer.SpanLink) => ({
	context: spanContextOf(link.span),
	attributes: telemetryAttributes(link.attributes)
})

/** The outcome word of an exit: interruption is cancellation (a lost race, a closed scope, a
 * departed client), not a failure. */
const outcomeOf = (exit: Exit.Exit<unknown, unknown>) => {
	if (Exit.isSuccess(exit)) {
		return "succeeded"
	}
	return Cause.hasInterruptsOnly(exit.cause) ? "interrupted" : "failed"
}

/** Interruption keeps its own outcome and failure code without an ERROR status. */
const recordCompletion = (span: Span, exit: Exit.Exit<unknown, unknown>): void => {
	if (Exit.isSuccess(exit)) {
		span.setAttributes({ "superstarter.effect.outcome": "succeeded" } satisfies SharedAttributes)
		return
	}
	const outcome = outcomeOf(exit)
	span.setAttributes({
		"superstarter.effect.outcome": outcome,
		"superstarter.failure.codes": [...failureCodesOf(exit.cause)]
	} satisfies SharedAttributes)
	if (outcome === "interrupted") {
		return
	}
	const exception = failureExceptionOf(exit.cause)
	span.recordException(exception)
	span.setStatus({ code: SpanStatusCode.ERROR, message: `${exception.name}: ${exception.message}` })
}

/** HTTP status marks an error from the side that owns it: a server span on 5xx, a client span on
 * 4xx or 5xx. A server's 4xx is the caller's error, not this operation's.
 * https://opentelemetry.io/docs/specs/semconv/http/http-spans/#status */
const isHttpError = (kind: Tracer.SpanKind, status: unknown): boolean => {
	const threshold = kind === "server" ? 500 : 400
	return typeof status === "number" && status >= threshold
}

/** The ids an Effect span carries. A host that issued ids of its own makes its SDK span the Effect
 * span's identity and the one native children parent on (`hosted`); an unsampled or unregistered
 * host hands back the parent's or no ids, and the Effect span carries Effect's. */
const identityOf = (
	span: Span,
	native: Tracer.NativeSpan,
	parentContext: OtelContext
): Readonly<{ identity: SpanContext; hosted: Span | undefined }> => {
	const captured = span.spanContext()
	const issued =
		isSpanContextValid(captured) && captured.spanId !== trace.getSpanContext(parentContext)?.spanId
	return issued
		? { identity: captured, hosted: span }
		: { identity: spanContextOf(native), hosted: undefined }
}

/** The SDK span a hosted Effect span opened, when there is one. */
type SdkSpanOf = (span: Tracer.AnySpan) => Span | undefined

/** The OTel context native code sees while a fiber runs under `active`. */
const contextUnder = (sdkSpanOf: SdkSpanOf, active: Tracer.AnySpan | undefined): OtelContext => {
	if (active === undefined) {
		return context.active()
	}
	const sdk = sdkSpanOf(active)
	return sdk === undefined
		? trace.setSpanContext(context.active(), spanContextOf(active))
		: trace.setSpan(context.active(), sdk)
}

/** The OTel context a new span starts under: none for a root, else its Effect parent's ids, else
 * whatever the host has active. */
const parentContextOf = (root: boolean, parent: Tracer.AnySpan | undefined): OtelContext => {
	if (root) {
		return ROOT_CONTEXT
	}
	return parent === undefined
		? context.active()
		: trace.setSpanContext(context.active(), spanContextOf(parent))
}

/** The roster attributes an Effect parent span already carries. */
const attributesOfParent = (parent: Tracer.AnySpan | undefined) =>
	parent?._tag === "Span"
		? definedAttributes(telemetryAttributes(Record.fromEntries(parent.attributes)))
		: {}

/** Effect supplies attributes after span construction. NativeSpan owns Effect's state; the host
 * provider owns native ids, transport and lifetime. No second SDK. */
const operationalTracer = (deployment: OperationalDeployment): Tracer.Tracer => {
	/** The SDK span each hosted Effect span opened. A native child started under the active OTel
	 * context (a fetch or PostgreSQL client span) parents on `trace.getSpan(context)`: with the SDK
	 * span there, the span processor inherits the parent's attributes (`parentAttributes` in
	 * `remote.ts`); with only the ids there (`setSpanContext`), the parent is a NonRecordingSpan with
	 * nothing to inherit. An external span and one the host did not record have no entry: their ids
	 * are all the context can hold. */
	const sdkSpans = new WeakMap<Tracer.AnySpan, Span>()
	return Tracer.make({
		span(options) {
			const native = new Tracer.NativeSpan(options)
			const parent = Option.getOrUndefined(options.parent)
			const parentContext = parentContextOf(options.root, parent)
			const correlationContext = options.root ? context.active() : parentContext
			const inherited = definedAttributes(
				correlationAttributes({
					...requestCorrelation(correlationContext),
					...attributesOfParent(parent)
				})
			)
			const span = trace.getTracer(OPERATIONAL_SCOPE).startSpan(
				options.name,
				{
					kind: spanKinds[options.kind],
					attributes: { ...attributesOfDeployment(deployment), ...inherited },
					links: Arr.map(options.links, otelLink),
					startTime: hrTimeOf(options.startTime)
				},
				parentContext
			)
			const recorded = span.isRecording()
			const { identity, hosted } = identityOf(span, native, parentContext)
			for (const [key, value] of Record.toEntries(inherited)) {
				native.attribute(key, value)
			}
			const bridged: Tracer.Span = {
				_tag: "Span",
				name: options.name,
				traceId: identity.traceId,
				spanId: identity.spanId,
				sampled: (identity.traceFlags & TraceFlags.SAMPLED) !== 0,
				parent: options.parent,
				annotations: options.annotations,
				kind: options.kind,
				get status() {
					return native.status
				},
				get attributes() {
					return native.attributes
				},
				get links() {
					return native.links
				},
				attribute(key, value) {
					native.attribute(key, value)
					span.setAttributes(telemetryAttributes({ [key]: value }))
				},
				event(name, at, attributes = {}) {
					span.addEvent(name, telemetryAttributes(attributes), hrTimeOf(at))
				},
				addLinks(links) {
					native.addLinks(links)
					span.addLinks(Arr.map(links, otelLink))
				},
				end(at, exit) {
					if (native.status._tag === "Ended") {
						return
					}
					native.end(at, exit)
					if (recorded && !span.isRecording()) {
						metrics
							.getMeter(OPERATIONAL_SCOPE)
							.createCounter("superstarter.telemetry.span.ended_by_host", { unit: "{span}" })
							.add(1, { "span.name": options.name, "superstarter.effect.outcome": outcomeOf(exit) })
						return
					}
					recordCompletion(span, exit)
					if (isHttpError(options.kind, native.attributes.get("http.response.status_code"))) {
						span.setStatus({ code: SpanStatusCode.ERROR })
					}
					span.end(hrTimeOf(at))
				}
			}
			if (hosted !== undefined) {
				sdkSpans.set(bridged, hosted)
			}
			return bridged
		},
		context(primitive, fiber) {
			return context.with(
				contextUnder((span) => sdkSpans.get(span), fiber.cache.span),
				() => primitive["~effect/Effect/evaluate"](fiber)
			)
		}
	})
}

/** Effect's formatter owns causes, fiber identity, log spans and structured messages. Every level
 * and every annotation follows one path in every host. */
const operationalLogger = ({ service, deployment }: OperationalOrigin) =>
	Logger.make<unknown, void>((options) => {
		const formatted = Logger.formatStructured.log(options)
		const current = options.fiber.cache.span
		const held =
			current === undefined ? trace.getSpanContext(context.active()) : spanContextOf(current)
		const spanAttributes = current?._tag === "Span" ? Record.fromEntries(current.attributes) : {}
		emitOperationalLog({
			record: {
				v: 2,
				service,
				deployment,
				...formatted,
				traceId: held?.traceId,
				spanId: held?.spanId,
				attributes: { ...requestCorrelation(), ...formatted.annotations, ...spanAttributes }
			},
			level: options.logLevel
		})
	})

/** The process's telemetry: its origin (with the instance id minted once for it), the one tracer and
 * logger every Effect span and log goes through, and the cold start the first request span claims.
 * One value per process, built by the host's runtime: a second tracer would not know the SDK spans
 * the first one opened. */
export class OperationalTelemetry extends Context.Service<
	OperationalTelemetry,
	Readonly<{
		origin: OperationalOrigin
		tracer: Tracer.Tracer
		loggers: ReadonlySet<Logger.Logger<unknown, void>>
		claimColdStart: Effect.Effect<boolean>
	}>
>()("@superstarter/operational-telemetry/effect/OperationalTelemetry") {}

/** The process's telemetry for a host's runtime to provide: the instance id is minted here, once. */
export const makeOperationalTelemetry = (
	process: Readonly<Omit<OperationalOrigin, "instanceId">>
): Effect.Effect<OperationalTelemetry["Service"]> =>
	Effect.gen(function* () {
		const origin: OperationalOrigin = { ...process, instanceId: v7() }
		const coldStart = yield* Ref.make(true)
		return OperationalTelemetry.of({
			origin,
			tracer: operationalTracer(origin.deployment),
			loggers: new Set([operationalLogger(origin)]),
			claimColdStart: Ref.getAndSet(coldStart, false)
		})
	})

const withTracerAndLoggers =
	(telemetry: OperationalTelemetry["Service"]) =>
	<A, E, R>(work: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
		work.pipe(
			Effect.provideService(References.MinimumLogLevel, "All"),
			Effect.provideService(Tracer.MinimumTraceLevel, "All"),
			Effect.withTracer(telemetry.tracer),
			Effect.provideService(Logger.CurrentLoggers, telemetry.loggers)
		)

/** OpenTelemetry `faas.coldstart` on the first recording request span this process serves, and on
 * no later one. A span the host already ended (Next's render span, when its error hook runs) is
 * never written to. https://opentelemetry.io/docs/specs/semconv/faas/faas-spans/ */
const markColdStart = (telemetry: OperationalTelemetry["Service"]): Effect.Effect<void> =>
	Effect.suspend(() => {
		const active = trace.getActiveSpan()
		if (active?.isRecording() !== true) {
			return Effect.void
		}
		return Effect.flatMap(telemetry.claimColdStart, (first) =>
			first
				? Effect.sync(() => {
						active.setAttributes({ "faas.coldstart": true } satisfies SharedAttributes)
					})
				: Effect.void
		)
	})

/** Host execution boundary. Effect's fiber context remains the sole owner of application tracing;
 * native libraries share the host OTel context. */
export const withOperationalTelemetry = <A, E, R>(
	work: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R | OperationalTelemetry> =>
	Effect.flatMap(OperationalTelemetry, (telemetry) =>
		Effect.suspend(() => {
			const parent = trace.getSpanContext(context.active())
			const rooted =
				parent !== undefined && isSpanContextValid(parent)
					? work.pipe(Effect.withParentSpan(Tracer.externalSpan(parent)))
					: work
			return markColdStart(telemetry).pipe(Effect.andThen(rooted), withTracerAndLoggers(telemetry))
		})
	)

/** The span `Effect.withSpan` just opened, held under the operation's key for the work inside it. */
const holdingSpan = <Name extends string>(
	scope: Context.Service<OperationScope<Name>, Tracer.Span>
) => Effect.provideServiceEffect(scope, Effect.orDie(Effect.currentSpan))

/**
 * Work the response does not wait on (scheduled with Next's `after()`): the operation is its own root
 * span, linked to the request span active where it runs, and it keeps that request's correlation. A
 * request child would be ended by the host when the request's local root ends, under work that is
 * still running, so background work is never one.
 */
export const withBackgroundOperationalTelemetry =
	<Name extends string, Opened extends Schema.Struct.Fields, Learned extends Schema.Struct.Fields>(
		operation: OperationalSpan<Name, Opened, Learned>
	) =>
	<A, E, R>(
		work: Effect.Effect<A, E, R>
	): Effect.Effect<A, E, Exclude<R, OperationScope<Name>> | OperationalTelemetry> =>
		Effect.flatMap(OperationalTelemetry, (telemetry) =>
			Effect.suspend(() => {
				const request = trace.getSpanContext(context.active())
				const links =
					request !== undefined && isSpanContextValid(request)
						? [{ span: Tracer.externalSpan(request), attributes: {} }]
						: []
				return work.pipe(
					holdingSpan(operation.scope),
					Effect.withSpan(operation.name, { root: true, links }),
					withTracerAndLoggers(telemetry)
				)
			})
		)

type OpenedOf<Opened extends Schema.Struct.Fields> = Schema.Struct<Opened>["Type"]

/** An operation's opened attributes as arguments: required when it declares a required one. */
type OpenedArguments<Opened extends Schema.Struct.Fields> =
	Partial<OpenedOf<Opened>> extends OpenedOf<Opened>
		? readonly [attributes?: OpenedOf<Opened>]
		: readonly [attributes: OpenedOf<Opened>]

/**
 * One span for an operation of the registry, opened with that operation's attributes, which its logs
 * carry too. The work may write the operation's learned attributes (`annotateOperation`) while it
 * runs; outside it, they do not type. Data-last (`work.pipe(observed(operation, attributes))`) or
 * data-first.
 */
export const observed: {
	<Name extends string, Opened extends Schema.Struct.Fields, Learned extends Schema.Struct.Fields>(
		operation: OperationalSpan<Name, Opened, Learned>,
		...attributes: OpenedArguments<Opened>
	): <A, E, R>(
		work: Effect.Effect<A, E, R>
	) => Effect.Effect<A, E, Exclude<R, OperationScope<Name>>>
	<
		A,
		E,
		R,
		Name extends string,
		Opened extends Schema.Struct.Fields,
		Learned extends Schema.Struct.Fields
	>(
		work: Effect.Effect<A, E, R>,
		operation: OperationalSpan<Name, Opened, Learned>,
		...attributes: OpenedArguments<Opened>
	): Effect.Effect<A, E, Exclude<R, OperationScope<Name>>>
} = Fn.dual(
	(args) => Effect.isEffect(args[0]),
	<A, E, R, Name extends string>(
		work: Effect.Effect<A, E, R>,
		operation: Readonly<{ name: Name; scope: Context.Service<OperationScope<Name>, Tracer.Span> }>,
		attributes: Readonly<Record<string, unknown>> = {}
	): Effect.Effect<A, E, Exclude<R, OperationScope<Name>>> =>
		work.pipe(
			holdingSpan(operation.scope),
			Effect.withSpan(operation.name, { attributes: { ...attributes } }),
			Effect.annotateLogs(attributes)
		)
)

/**
 * The one way work writes a fact onto its operation's span: only that operation's learned
 * attributes type, and only inside `observed` for that operation. The fact lands on the operation's
 * own span even when the work is inside a span nested under it.
 */
export const annotateOperation: {
	<Name extends string, Opened extends Schema.Struct.Fields, Learned extends Schema.Struct.Fields>(
		attributes: Partial<Schema.Struct<Learned>["Type"]>
	): (
		operation: OperationalSpan<Name, Opened, Learned>
	) => Effect.Effect<void, never, OperationScope<Name>>
	<Name extends string, Opened extends Schema.Struct.Fields, Learned extends Schema.Struct.Fields>(
		operation: OperationalSpan<Name, Opened, Learned>,
		attributes: Partial<Schema.Struct<Learned>["Type"]>
	): Effect.Effect<void, never, OperationScope<Name>>
} = Fn.dual(
	2,
	<Name extends string>(
		operation: Readonly<{ scope: Context.Service<OperationScope<Name>, Tracer.Span> }>,
		attributes: Readonly<Record<string, unknown>>
	): Effect.Effect<void, never, OperationScope<Name>> =>
		Effect.flatMap(operation.scope, (span) =>
			Effect.sync(() => {
				for (const [key, value] of Record.toEntries(attributes)) {
					span.attribute(key, value)
				}
			})
		)
)
