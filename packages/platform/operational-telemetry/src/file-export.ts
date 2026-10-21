import { NodeFileSystem } from "@effect/platform-node"
import {
	JsonLogsSerializer,
	JsonMetricsSerializer,
	JsonTraceSerializer
} from "@opentelemetry/otlp-transformer"
import type { LogRecordExporter } from "@opentelemetry/sdk-logs"
import type { PushMetricExporter } from "@opentelemetry/sdk-metrics"
import type { SpanExporter } from "@opentelemetry/sdk-trace-base"
import { Effect, FileSystem, ManagedRuntime, Schema } from "effect"
import type { Completion } from "#otlp-batch.ts"

/** The local sink, relative to the process's working directory: the app package under `next dev`,
 * inside its gitignored `out/`. */
const LOCAL_TELEMETRY_DIRECTORY = "out/telemetry"

/** One JSONL file per signal, plus the server exceptions PostHog's Error Tracking would receive. */
type LocalStream = "traces" | "logs" | "metrics" | "exceptions"

/** A local telemetry file could not be written; the export reports it as failed. */
class TelemetryFileWriteFailed extends Schema.TaggedError<
	TelemetryFileWriteFailed,
	{ readonly brand: unique symbol }
>()("TelemetryFileWriteFailed", {
	stream: Schema.Literals(["traces", "logs", "metrics", "exceptions"]),
	cause: Schema.Unknown
}) {}

const textDecoder = new TextDecoder()

const appended = (stream: LocalStream, line: string) =>
	Effect.gen(function* () {
		const fileSystem = yield* FileSystem.FileSystem
		yield* fileSystem.makeDirectory(LOCAL_TELEMETRY_DIRECTORY, { recursive: true })
		yield* fileSystem.writeFileString(`${LOCAL_TELEMETRY_DIRECTORY}/${stream}.jsonl`, `${line}\n`, {
			flag: "a"
		})
	})

/** One line for one stream's file. */
type LocalLine = Readonly<{ stream: LocalStream; line: string }>

/** The local sink: one exporter per signal, plus the line writer the server's exception sink uses. */
export type LocalTelemetryFiles = Readonly<{
	traces: SpanExporter & Readonly<{ forceFlush: () => Promise<void> }>
	logs: LogRecordExporter
	metrics: PushMetricExporter
	append: (entry: LocalLine) => Promise<void>
}>

/**
 * The local sink, built once by the host's runtime. The exporters run in SDK callbacks, outside any
 * Effect program, so the sink owns the file system its writes run on. Each file's writes go out one
 * at a time, in order, so no two lines interleave: the sink owns the tail of each file's queue.
 */
export const makeLocalTelemetryFiles: Effect.Effect<LocalTelemetryFiles> = Effect.sync(() => {
	const files = ManagedRuntime.make(NodeFileSystem.layer)
	const tails = new Map<LocalStream, Promise<void>>()
	const settledTail = (stream: LocalStream): Promise<void> => {
		const tail = tails.get(stream)
		return tail === undefined ? Promise.resolve() : tail
	}
	const append = (entry: LocalLine): Promise<void> => {
		const written = settledTail(entry.stream).then(() =>
			files.runPromise(appended(entry.stream, entry.line))
		)
		tails.set(
			entry.stream,
			written.then(
				() => undefined,
				() => undefined
			)
		)
		return written
	}
	/** One OTLP/JSON export request as one line, the OpenTelemetry Collector file exporter's
	 * format: the same bytes the PostHog arm sends, written instead of sent. */
	const exportLine = (
		stream: LocalStream,
		request: Uint8Array | undefined,
		callback: (result: Completion) => void
	): void => {
		if (request === undefined) {
			callback({
				code: 1,
				error: TelemetryFileWriteFailed.make({
					stream,
					cause: "native serializer returned no bytes"
				})
			})
			return
		}
		append({ stream, line: textDecoder.decode(request) }).then(
			() => {
				callback({ code: 0 })
			},
			(cause: unknown) => {
				callback({ code: 1, error: TelemetryFileWriteFailed.make({ stream, cause }) })
			}
		)
	}
	return {
		traces: {
			export: (spans, callback) => {
				exportLine("traces", JsonTraceSerializer.serializeRequest(spans), callback)
			},
			forceFlush: () => settledTail("traces"),
			shutdown: () => settledTail("traces")
		},
		logs: {
			export: (records, callback) => {
				exportLine("logs", JsonLogsSerializer.serializeRequest(records), callback)
			},
			forceFlush: () => settledTail("logs"),
			shutdown: () => settledTail("logs")
		},
		metrics: {
			export: (data, callback) => {
				exportLine("metrics", JsonMetricsSerializer.serializeRequest(data), callback)
			},
			forceFlush: () => settledTail("metrics"),
			shutdown: () => settledTail("metrics")
		},
		append
	}
})
