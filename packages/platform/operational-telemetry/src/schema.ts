import { SERVER_ACTIONS } from "@superstarter/todo-protocol/action"
import { Schema } from "effect"
import { FailureCode } from "#failure.ts"

/** Vercel's deployment targets, the values of `VERCEL_TARGET_ENV`. The app's env module admits its
 * deployment against this list, so a target has one home. */
export const VERCEL_TARGETS = ["production", "preview", "development"] as const

const OPERATIONAL_SERVICES = ["superstarter-web"] as const
const OperationalService = Schema.Literals(OPERATIONAL_SERVICES)
export type OperationalService = typeof OperationalService.Type

export const Count = Schema.Int.check(
	Schema.isGreaterThanOrEqualTo(0),
	Schema.makeFilter(Number.isSafeInteger)
)
const Milliseconds = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))
export const Uuid = Schema.String.check(Schema.isUUID())
/** A closed identifier, a code word or a name: never free text. */
export const Token = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9][A-Za-z0-9_.:/@+=-]*$/))
const GitObjectId = Schema.String.check(
	Schema.isPattern(/^[0-9a-f]{40}$/),
	Schema.makeFilter((value: string) => value !== "0000000000000000000000000000000000000000")
)

/** The process's deployment, the shape the app's env module admits: a Vercel deployment names its target
 * environment, its id and its commit; a local process names none of them. */
const OperationalDeployment = Schema.Union([
	Schema.Struct({ kind: Schema.Literal("local") }),
	Schema.Struct({
		kind: Schema.Literal("hosted"),
		target: Schema.Literals(VERCEL_TARGETS),
		id: Token,
		commit: GitObjectId
	})
])
export type OperationalDeployment = typeof OperationalDeployment.Type

/** The process every signal describes: its service and its deployment, admitted once, and the
 * instance id minted once for the process, so traces, logs and metrics join on one value. */
export type OperationalOrigin = Readonly<{
	service: OperationalService
	deployment: OperationalDeployment
	instanceId: string
}>

/** Configured host and its public deadline observation. An unavailable deadline does not prove
 * absent request context; an observed one does not prove that the export was registered with
 * `waitUntil` or that its invocation remains active. */
const OperationalMetricExportHost = Schema.Union([
	Schema.Struct({ kind: Schema.Literal("process") }),
	Schema.Struct({
		kind: Schema.Literal("function"),
		deadline: Schema.Union([
			Schema.Struct({ kind: Schema.Literal("unavailable") }),
			Schema.Struct({ kind: Schema.Literal("observed"), atMilliseconds: Count })
		])
	})
])
export type OperationalMetricExportHost = typeof OperationalMetricExportHost.Type

/** Export transport timing has no endpoint, headers, payload or error text. Metrics report
 * through the log owner; logging a log export through itself would manufacture telemetry. */
export const OperationalMetricExportRecord = Schema.Struct({
	v: Schema.Literal(2),
	service: OperationalService,
	deployment: OperationalDeployment,
	event: Schema.Literal("telemetry-metric-export"),
	batchId: Uuid,
	instanceId: Uuid,
	metricRecords: Count,
	dataPoints: Count,
	startedAtMilliseconds: Count,
	lifecycle: Schema.Union([
		Schema.Struct({
			kind: Schema.Literal("started"),
			host: OperationalMetricExportHost
		}),
		Schema.Struct({
			kind: Schema.Literal("settled"),
			host: OperationalMetricExportHost,
			outcome: Schema.Literals(["acknowledged", "failed"]),
			endedAtMilliseconds: Count,
			elapsedMilliseconds: Milliseconds
		})
	])
})
export type OperationalMetricExportRecord = typeof OperationalMetricExportRecord.Type

/** Next's request-error hook and its tracer spell their own closed vocabularies; the registry admits
 * the key, the framework owns the words. */
export const FrameworkVocabulary = Schema.String

/**
 * Attributes no single operation owns, written only by the telemetry itself and the server's
 * reporting: the deployment every span opens with, the replay session every child inherits, the
 * cold start, and the outcome the tracer records when a span ends. `superstarter.failure.operation`
 * names the action that reported a handled failure, on its log and its exception. An operation's own
 * attributes are declared with it (`OPERATIONAL_SPANS`).
 */
const SharedAttributes = Schema.Struct({
	"superstarter.deployment.target": Schema.optionalKey(
		Schema.Literals(["local", ...VERCEL_TARGETS])
	),
	"superstarter.deployment.id": Schema.optionalKey(Token),
	"superstarter.deployment.commit": Schema.optionalKey(GitObjectId),
	"session.id": Schema.optionalKey(Uuid),
	"faas.coldstart": Schema.optionalKey(Schema.Boolean),
	"superstarter.effect.outcome": Schema.optionalKey(
		Schema.Literals(["succeeded", "failed", "interrupted"])
	),
	"superstarter.failure.codes": Schema.optionalKey(Schema.Array(FailureCode)),
	"superstarter.failure.operation": Schema.optionalKey(Schema.Literals(SERVER_ACTIONS))
})
export type SharedAttributes = typeof SharedAttributes.Type
