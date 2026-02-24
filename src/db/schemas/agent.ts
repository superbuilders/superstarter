import type { AnyPgColumn } from "drizzle-orm/pg-core"
import {
	boolean,
	index,
	integer,
	jsonb,
	pgSchema,
	text,
	timestamp,
	uuid
} from "drizzle-orm/pg-core"

const agentSchema = pgSchema("agent")

const sandboxStatusEnum = agentSchema.enum("sandbox_status", [
	"pending",
	"running",
	"stopping",
	"stopped",
	"failed",
	"aborted",
	"snapshotting"
])

const sandboxSourceTypeEnum = agentSchema.enum("sandbox_source_type", [
	"git",
	"tarball",
	"snapshot",
	"empty"
])

const featurePhaseEnum = agentSchema.enum("feature_phase", [
	"analysis",
	"approaches",
	"judging",
	"implementation",
	"pr",
	"completed",
	"failed"
])

const phaseStatusEnum = agentSchema.enum("phase_status", ["running", "passed", "failed"])

const ctaKindEnum = agentSchema.enum("cta_kind", ["approval", "text", "choice"])

const sandboxes = agentSchema.table("sandboxes", {
	id: text("id").primaryKey(),
	status: sandboxStatusEnum("status").notNull(),
	runtime: text("runtime").notNull(),
	memory: integer("memory").notNull(),
	vcpus: integer("vcpus").notNull(),
	region: text("region").notNull(),
	cwd: text("cwd").notNull(),
	timeout: integer("timeout").notNull(),
	networkPolicy: jsonb("network_policy"),
	interactivePort: integer("interactive_port"),
	routes: jsonb("routes"),
	sourceSnapshotId: text("source_snapshot_id"),
	sourceType: sandboxSourceTypeEnum("source_type"),
	sourceUrl: text("source_url"),
	sourceRevision: text("source_revision"),
	sourceDepth: integer("source_depth"),
	requestedAt: timestamp("requested_at", { mode: "date", withTimezone: true }),
	createdAt: timestamp("created_at", { mode: "date", withTimezone: true }),
	startedAt: timestamp("started_at", { mode: "date", withTimezone: true }),
	requestedStopAt: timestamp("requested_stop_at", { mode: "date", withTimezone: true }),
	stoppedAt: timestamp("stopped_at", { mode: "date", withTimezone: true }),
	abortedAt: timestamp("aborted_at", { mode: "date", withTimezone: true }),
	snapshottedAt: timestamp("snapshotted_at", { mode: "date", withTimezone: true }),
	duration: integer("duration")
})

const featureRuns = agentSchema.table(
	"feature_runs",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		prompt: text("prompt").notNull(),
		sandboxId: text("sandbox_id")
			.notNull()
			.references(() => sandboxes.id),
		githubRepoUrl: text("github_repo_url").notNull(),
		githubBranch: text("github_branch").notNull(),
		currentPhase: featurePhaseEnum("current_phase").notNull(),
		memories: jsonb("memories").notNull(),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull(),
		completedAt: timestamp("completed_at", { mode: "date", withTimezone: true })
	},
	(table) => [index("feature_runs_created_at_idx").on(table.createdAt)]
)

const phaseResults = agentSchema.table(
	"phase_results",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		runId: uuid("run_id")
			.notNull()
			.references(() => featureRuns.id),
		phase: featurePhaseEnum("phase").notNull(),
		status: phaseStatusEnum("status").notNull(),
		output: jsonb("output"),
		startedAt: timestamp("started_at", { mode: "date", withTimezone: true }).notNull(),
		completedAt: timestamp("completed_at", { mode: "date", withTimezone: true })
	},
	(table) => [index("phase_results_run_id_phase_idx").on(table.runId, table.phase)]
)

const agentInvocations = agentSchema.table("agent_invocations", {
	id: uuid("id").defaultRandom().primaryKey(),
	phaseResultId: uuid("phase_result_id")
		.notNull()
		.references(() => phaseResults.id),
	parentInvocationId: uuid("parent_invocation_id").references(
		(): AnyPgColumn => agentInvocations.id
	),
	agentType: text("agent_type").notNull(),
	modelId: text("model_id").notNull(),
	systemPrompt: text("system_prompt").notNull(),
	inputMessages: jsonb("input_messages").notNull(),
	finishReason: text("finish_reason"),
	outputText: text("output_text"),
	inputTokens: integer("input_tokens"),
	outputTokens: integer("output_tokens"),
	totalTokens: integer("total_tokens"),
	steps: jsonb("steps"),
	toolCalls: jsonb("tool_calls"),
	rawResponse: jsonb("raw_response"),
	startedAt: timestamp("started_at", { mode: "date", withTimezone: true }).notNull(),
	completedAt: timestamp("completed_at", { mode: "date", withTimezone: true })
})

const ctaEvents = agentSchema.table(
	"cta_events",
	{
		id: uuid("id").primaryKey(),
		runId: uuid("run_id")
			.notNull()
			.references(() => featureRuns.id),
		phaseResultId: uuid("phase_result_id")
			.notNull()
			.references(() => phaseResults.id),
		invocationId: uuid("invocation_id").references(() => agentInvocations.id),
		toolCallId: text("tool_call_id"),
		kind: ctaKindEnum("kind").notNull(),
		requestMessage: text("request_message"),
		requestPrompt: text("request_prompt"),
		requestPlaceholder: text("request_placeholder"),
		requestOptions: jsonb("request_options"),
		responseApproved: boolean("response_approved"),
		responseReason: text("response_reason"),
		responseText: text("response_text"),
		responseSelectedId: text("response_selected_id"),
		requestedAt: timestamp("requested_at", { mode: "date", withTimezone: true }).notNull(),
		respondedAt: timestamp("responded_at", { mode: "date", withTimezone: true }),
		timedOut: boolean("timed_out")
	},
	(table) => [index("cta_events_run_id_idx").on(table.runId)]
)

export {
	agentInvocations,
	agentSchema,
	ctaEvents,
	ctaKindEnum,
	featurePhaseEnum,
	featureRuns,
	phaseResults,
	phaseStatusEnum,
	sandboxSourceTypeEnum,
	sandboxStatusEnum,
	sandboxes
}
