import { Schema } from "effect"

/** A second owner already installed the process's global log or meter provider: every signal of
 * this process must flow through one pipeline, so registration refuses rather than shares it. */
export class OperationalTelemetryProviderConflict extends Schema.TaggedError<
	OperationalTelemetryProviderConflict,
	{ readonly brand: unique symbol }
>()("OperationalTelemetryProviderConflict", {
	signal: Schema.Literals(["logs", "metrics"])
}) {}

/** PostHog's US cloud ingestion serves browser and server alike; an EU project is `eu` here.
 * https://posthog.com/docs/advanced/proxy */
export const POSTHOG_INGESTION_ORIGIN = "https://us.i.posthog.com"

/** Fixed OTLP paths; the project token enters only the Authorization header.
 * https://posthog.com/docs/distributed-tracing/installation/nodejs
 * https://posthog.com/docs/logs/installation/nextjs
 * https://posthog.com/docs/metrics */
export const posthogExportRequests = (projectToken: string) => {
	const request = (path: string) => ({
		url: `${POSTHOG_INGESTION_ORIGIN}${path}`,
		headers: { Authorization: `Bearer ${projectToken}` }
	})
	return {
		traces: request("/i/v1/traces"),
		logs: request("/i/v1/logs"),
		metrics: request("/i/v1/metrics")
	}
}
