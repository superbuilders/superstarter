import { metrics } from "@opentelemetry/api"
import { ExportResultCode } from "@opentelemetry/core"
import type { LogRecordExporter } from "@opentelemetry/sdk-logs"
import { Array as Arr, Cause, Effect, Result, Schema } from "effect"
import type { Oversized, TelemetryEvidenceEnvelopeTooLarge } from "#evidence-parts.ts"
import { OPERATIONAL_SCOPE } from "#resource.ts"

/** The native exporter's completion: a result code and, when it failed, its error. */
export type Completion = Parameters<Parameters<LogRecordExporter["export"]>[1]>[0]

/**
 * @limitKind published
 * @owner PostHog OTLP export
 * @unit bytes
 * @scope one uncompressed OTLP logs, traces or metrics HTTP request
 * @constraint configurable default
 * @source https://github.com/PostHog/posthog/blob/master/rust/capture-logs/src/config.rs
 * MAX_REQUEST_BODY_SIZE_BYTES defaults to 2097152; main.rs applies the shared /i/v1/{logs,traces,metrics} body
 * limit after decompression. Adopt that receiver default as our packet bound;
 * this does not claim the hosted project's effective setting was inspected.
 * @verified 2026-09-20
 */
const POSTHOG_OTLP_REQUEST_BYTES = 2 * 1024 * 1024

/**
 * @limitKind derived
 * @owner PostHog OTLP export measurements
 * @unit bytes
 * @scope packet-size histogram boundaries, never admission or sampling
 * @derivation Binary byte-size decades through the request bound, POSTHOG_OTLP_REQUEST_BYTES.
 * Shared boundaries permit aggregation across all signals and service processes; the overflow
 * bucket stays present.
 */
const PACKET_BYTE_BUCKETS: ReadonlyArray<number> = Arr.makeBy(
	Math.ceil(Math.log2(POSTHOG_OTLP_REQUEST_BYTES)) + 1,
	(exponent) => 2 ** exponent
)

type OtlpBatchLimits = Readonly<{ bytes: number; records: number }>

export const operationalBatchLimits: OtlpBatchLimits = {
	bytes: POSTHOG_OTLP_REQUEST_BYTES,
	records: Number.POSITIVE_INFINITY
}

/** A packet that was never handed to the exporter: its serialization or the export run itself
 * failed. */
class TelemetryBatchExportRefused extends Schema.TaggedError<
	TelemetryBatchExportRefused,
	{ readonly brand: unique symbol }
>()("TelemetryBatchExportRefused", {
	reason: Schema.Literals(["serialization", "export"]),
	cause: Schema.Unknown
}) {}

/** One record whose own bytes exceed the packet bound and that has no evidence expansion. */
class TelemetryRecordTooLarge extends Schema.TaggedError<
	TelemetryRecordTooLarge,
	{ readonly brand: unique symbol }
>()("TelemetryRecordTooLarge", {
	bytes: Schema.Int,
	limitBytes: Schema.Int
}) {}

/** The native serializer threw or returned no bytes. */
class TelemetrySerializationFailed extends Schema.TaggedError<
	TelemetrySerializationFailed,
	{ readonly brand: unique symbol }
>()("TelemetrySerializationFailed", {
	cause: Schema.Unknown
}) {}

/** Why a candidate packet was never handed to the exporter. */
type PacketRefusal =
	| TelemetrySerializationFailed
	| TelemetryRecordTooLarge
	| TelemetryEvidenceEnvelopeTooLarge

/** The native exporter threw instead of calling back. */
class TelemetrySendThrew extends Schema.TaggedError<
	TelemetrySendThrew,
	{ readonly brand: unique symbol }
>()("TelemetrySendThrew", {
	cause: Schema.Unknown
}) {}

export type OtlpSignal = "logs" | "traces" | "metrics"

/** One export batch: its records, the native serializer and exporter, the host's completion and
 * observation callbacks, the receiver's limits, and how an oversized record splits into evidence
 * parts. */
export type SizedBatch<T> = Readonly<{
	items: readonly T[]
	serialize: (items: readonly T[]) => Uint8Array | undefined
	send: (items: readonly T[], callback: (result: Completion) => void) => void
	callback: (result: Completion) => void
	observe: (records: readonly T[], result: Completion, kind: "export" | "refused") => void
	limits: OtlpBatchLimits
	signal: OtlpSignal
	expandOversized?: (
		oversized: Oversized<T>
	) => Effect.Effect<readonly T[], TelemetryEvidenceEnvelopeTooLarge>
}>

type Candidate<T> = Readonly<{ items: readonly T[]; phase: "original" | "evidence" }>
type Packet<T> =
	| Readonly<{ kind: "send"; bytes: number }>
	| Readonly<{ kind: "split"; children: readonly Candidate<T>[] }>

/** The count quota is enforced before any byte serialization, including evidence expansion. */
const countPackets = <T>(
	items: readonly T[],
	records: number,
	phase: Candidate<T>["phase"]
): readonly Candidate<T>[] => {
	if (!Arr.isReadonlyArrayNonEmpty(items)) {
		return []
	}
	if (items.length <= records) {
		return [{ items, phase }]
	}
	return Arr.map(Arr.chunksOf(items, records), (chunk) => ({ items: chunk, phase }))
}

const refused = (reason: "serialization" | "export", cause: unknown): Completion => ({
	code: 1,
	error: TelemetryBatchExportRefused.make({ reason, cause })
})

/** The first failure of a sequence of packets, else the last success. */
const firstFailureOf = (first: Completion, next: Completion): Completion =>
	first.code === ExportResultCode.SUCCESS ? next : first

/** Count admission precedes serialization. Byte admission uses the native SDK serializer; the
 * native exporter still owns transport and retries. Oversized evidence expands only once, then
 * every final part is checked against the same envelope. Packets go out one at a time, in order. */
export const exportSizedBatch = <T>(batch: SizedBatch<T>): void => {
	const { limits, observe } = batch
	const meter = metrics.getMeter(OPERATIONAL_SCOPE)
	const attributes = { signal: batch.signal }
	const serializationDuration = meter.createHistogram(
		"superstarter.telemetry.serialization.duration",
		{ unit: "ms" }
	)
	const serializationBytes = meter.createCounter("superstarter.telemetry.serialization.bytes", {
		unit: "By"
	})
	const packetBytes = meter.createHistogram("superstarter.telemetry.packet.bytes", {
		unit: "By",
		advice: { explicitBucketBoundaries: [...PACKET_BYTE_BUCKETS] }
	})
	const packetRecords = meter.createHistogram("superstarter.telemetry.packet.records")
	const exportDuration = meter.createHistogram("superstarter.telemetry.export.duration", {
		unit: "ms"
	})
	const serialized = (
		records: readonly T[]
	): Result.Result<Uint8Array, TelemetrySerializationFailed> => {
		const started = performance.now()
		const bytes = Result.try({
			try: () => batch.serialize(records),
			catch: (cause) => TelemetrySerializationFailed.make({ cause })
		})
		serializationDuration.record(performance.now() - started, attributes)
		return Result.flatMap(bytes, (output) => {
			if (output === undefined) {
				return Result.fail(
					TelemetrySerializationFailed.make({ cause: "native serializer returned no bytes" })
				)
			}
			serializationBytes.add(output.byteLength, attributes)
			return Result.succeed(output)
		})
	}
	const fits = (part: T): boolean =>
		Result.match(serialized([part]), {
			onFailure: () => false,
			onSuccess: (bytes) => bytes.byteLength <= limits.bytes
		})
	const expand = (
		candidate: Candidate<T>,
		bytes: Uint8Array
	): Effect.Effect<Packet<T>, PacketRefusal> => {
		const item = Arr.head(candidate.items)
		const expandOversized = batch.expandOversized
		if (candidate.phase !== "original" || item._tag === "None" || expandOversized === undefined) {
			return TelemetryRecordTooLarge.make({ bytes: bytes.byteLength, limitBytes: limits.bytes })
		}
		return expandOversized({ item: item.value, serialized: bytes, fits }).pipe(
			Effect.flatMap((expanded) => {
				if (!Arr.isReadonlyArrayNonEmpty(expanded)) {
					return TelemetryRecordTooLarge.make({
						bytes: bytes.byteLength,
						limitBytes: limits.bytes
					})
				}
				meter.createCounter("superstarter.telemetry.evidence.originals").add(1, attributes)
				meter
					.createCounter("superstarter.telemetry.evidence.parts")
					.add(expanded.length - 1, attributes)
				return Effect.succeed<Packet<T>>({
					kind: "split",
					children: countPackets(expanded, limits.records, "evidence")
				})
			})
		)
	}
	const prepare = (candidate: Candidate<T>): Effect.Effect<Packet<T>, PacketRefusal> => {
		const bytes = serialized(candidate.items)
		if (Result.isFailure(bytes)) {
			return Effect.fail(bytes.failure)
		}
		if (bytes.success.byteLength <= limits.bytes) {
			return Effect.succeed({ kind: "send", bytes: bytes.success.byteLength })
		}
		if (candidate.items.length > 1) {
			const middle = Math.ceil(candidate.items.length / 2)
			return Effect.succeed({
				kind: "split",
				children: [
					{ ...candidate, items: Arr.take(candidate.items, middle) },
					{ ...candidate, items: Arr.drop(candidate.items, middle) }
				]
			})
		}
		return expand(candidate, bytes.success)
	}
	const sent = (records: readonly T[]): Effect.Effect<Completion> =>
		Effect.callback<Completion>((resume) => {
			const handed = Result.try(() => {
				batch.send(records, (result) => {
					resume(Effect.succeed(result))
				})
			})
			if (Result.isFailure(handed)) {
				resume(
					Effect.succeed({ code: 1, error: TelemetrySendThrew.make({ cause: handed.failure }) })
				)
			}
		})
	const transmit = (records: readonly T[], bytes: number): Effect.Effect<Completion> => {
		packetBytes.record(bytes, attributes)
		packetRecords.record(records.length, attributes)
		const started = performance.now()
		return sent(records).pipe(
			Effect.tap((result) =>
				Effect.sync(() => {
					const outcome = result.code === ExportResultCode.SUCCESS ? "acknowledged" : "failed"
					exportDuration.record(performance.now() - started, { ...attributes, outcome })
					observe(records, result, "export")
				})
			)
		)
	}
	const exportCandidate = (candidate: Candidate<T>): Effect.Effect<Completion> =>
		prepare(candidate).pipe(
			Effect.matchEffect({
				onFailure: (cause) =>
					Effect.sync(() => {
						const result = refused("serialization", cause)
						observe(candidate.items, result, "refused")
						return result
					}),
				onSuccess: (packet) =>
					packet.kind === "split"
						? exportCandidates(packet.children)
						: transmit(candidate.items, packet.bytes)
			})
		)
	const exportCandidates = (candidates: readonly Candidate<T>[]): Effect.Effect<Completion> =>
		Effect.reduce(
			candidates,
			(): Completion => ({ code: 0 }),
			(first, candidate) =>
				exportCandidate(candidate).pipe(Effect.map((next) => firstFailureOf(first, next)))
		)
	Effect.runFork(
		exportCandidates(countPackets(batch.items, limits.records, "original")).pipe(
			Effect.catchCause((cause) => Effect.succeed(refused("export", Cause.squash(cause)))),
			Effect.tap((result) =>
				Effect.sync(() => {
					batch.callback(result)
				})
			)
		)
	)
}
