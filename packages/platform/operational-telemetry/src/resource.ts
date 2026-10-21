import { DateTime } from "effect"
import type { OperationalDeployment, OperationalOrigin, SharedAttributes } from "#schema.ts"

/** The instrumentation scope of every tracer, meter and logger this pipeline owns. */
export const OPERATIONAL_SCOPE = "superstarter-observability"

/** When this process started (OpenTelemetry `process.creation.time`, ISO 8601): `timeOrigin` is
 * the process's start, so any span's instance age is its start time minus this.
 * https://opentelemetry.io/docs/specs/semconv/resource/process/
 * https://nodejs.org/api/perf_hooks.html#performancetimeorigin */
const processCreationTime = DateTime.formatIso(DateTime.makeUnsafe(performance.timeOrigin))

/** The admitted deployment identity as searchable attributes. Effect spans also carry these on
 * every span, so a span query can filter by revision without joining its resource. */
export const attributesOfDeployment = (deployment: OperationalDeployment): SharedAttributes =>
	deployment.kind === "local"
		? { "superstarter.deployment.target": "local" }
		: {
				"superstarter.deployment.target": deployment.target,
				"superstarter.deployment.id": deployment.id,
				"superstarter.deployment.commit": deployment.commit
			}

/** The one resource every signal of this process reports: traces, logs and metrics carry the same
 * service, instance, environment and revision, so a query can join any two signals on their
 * resource. Standard keys follow the OpenTelemetry resource conventions; each value is derived
 * from the admitted deployment, never read from the host environment a second time.
 * https://opentelemetry.io/docs/specs/semconv/resource/
 * https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/ */
export const operationalResourceAttributes = ({
	service,
	deployment,
	instanceId
}: OperationalOrigin) => ({
	"service.name": service,
	"service.instance.id": instanceId,
	"process.creation.time": processCreationTime,
	"deployment.environment.name": deployment.kind === "local" ? "local" : deployment.target,
	"process.runtime.name": "nodejs",
	"process.runtime.version": process.versions.node,
	...attributesOfDeployment(deployment),
	...(deployment.kind === "local"
		? {}
		: {
				"cloud.provider": "vercel",
				"deployment.id": deployment.id,
				"service.version": deployment.id,
				"vcs.ref.head.revision": deployment.commit
			})
})
