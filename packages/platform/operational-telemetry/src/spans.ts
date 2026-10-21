import { SERVER_ACTIONS } from "@superstarter/todo-protocol/action"
import { TodoId } from "@superstarter/todo-protocol/todos"
import { Context, Schema, type Tracer } from "effect"
import { Count, FrameworkVocabulary, Token, Uuid } from "#schema.ts"

/** The requirement an operation's work carries while it runs: `observed` provides it and
 * `annotateOperation` needs it, so a fact can only be written to an operation the work runs inside. */
export type OperationScope<Name extends string> = Readonly<{ "~operation": Name }>

/**
 * One operation the application observes: the span name it exports and every attribute its span may
 * carry. `opened` is what the span opens with, required where the operation always knows it;
 * `learned` is what the work finds out on the way. No other key types on this span.
 */
export type OperationalSpan<
	Name extends string,
	Opened extends Schema.Struct.Fields,
	Learned extends Schema.Struct.Fields
> = Readonly<{
	name: Name
	opened: Schema.Struct<Opened>
	learned: Schema.Struct<Learned>
	/** Where the span the operation opened is held. A fact written through it reaches that span,
	 * even from inside a span nested under it. */
	scope: Context.Service<OperationScope<Name>, Tracer.Span>
}>

const operationalSpan = <
	const Name extends string,
	const Opened extends Schema.Struct.Fields,
	const Learned extends Schema.Struct.Fields
>(
	spec: Readonly<{ name: Name; opened: Opened; learned: Learned }>
): OperationalSpan<Name, Opened, Learned> => ({
	name: spec.name,
	opened: Schema.Struct(spec.opened),
	learned: Schema.Struct(spec.learned),
	scope: Context.Service<OperationScope<Name>, Tracer.Span>(`superstarter/operation/${spec.name}`)
})

/** OpenTelemetry's database conventions, as the PostgreSQL owner spells its statements and
 * transactions. https://opentelemetry.io/docs/specs/semconv/database/database-spans/ */
const PostgresSystem = Schema.Literal("postgresql")

/**
 * Every operation the application observes. A name is `superstarter.<area>.<noun>`: never a URL, a
 * query, SQL text, a todo's title or a generated label. A span's variable facts are its attributes:
 * codes, identifiers and closed words, never a body, a message or what a person typed. The host's
 * libraries (Next's tracer, `@vercel/otel`, the PostgreSQL client) name their own spans and need no
 * entry here.
 */
export const OPERATIONAL_SPANS = {
	/** One name for every server action; `superstarter.action.name` says which. */
	serverAction: operationalSpan({
		name: "superstarter.action",
		opened: { "superstarter.action.name": Schema.Literals(SERVER_ACTIONS) },
		learned: {
			/** Its value, a refusal its contract names, a Next navigation, or the opaque failure. */
			"superstarter.result.kind": Schema.Literals(["succeeded", "refused", "navigated", "failed"])
		}
	}),
	/** A failure Next rendered or answered, reported from its error hook. Next spells its own closed
	 * vocabularies (router kind, route type, render source); a route path is Next's pattern
	 * (`/todos/[id]`), never a resolved URL, and `url.path` is a path without its query.
	 * https://nextjs.org/docs/app/guides/open-telemetry */
	frameworkRequestError: operationalSpan({
		name: "superstarter.framework.request-error",
		opened: {
			"next.router_kind": FrameworkVocabulary,
			"next.route_path": FrameworkVocabulary,
			"next.route_type": FrameworkVocabulary,
			"next.render_source": Schema.optionalKey(FrameworkVocabulary),
			"next.revalidate_reason": Schema.optionalKey(FrameworkVocabulary),
			/** Next's opaque action id, never its arguments. */
			"next.action_id": Schema.optionalKey(Token),
			"next.error.digest": Schema.optionalKey(Token),
			"http.request.method": Token,
			"url.path": Schema.optionalKey(Schema.String),
			/** The browser's PostHog replay session, admitted from its header (`correlation.ts`). */
			"session.id": Schema.optionalKey(Uuid)
		},
		learned: {}
	}),
	todosRead: operationalSpan({ name: "superstarter.todos.read", opened: {}, learned: {} }),
	todoCreate: operationalSpan({
		name: "superstarter.todos.create",
		opened: {},
		learned: { "superstarter.todo.id": TodoId }
	}),
	todoToggle: operationalSpan({
		name: "superstarter.todos.toggle",
		opened: { "superstarter.todo.id": TodoId },
		learned: {}
	}),
	todoDelete: operationalSpan({
		name: "superstarter.todos.delete",
		opened: { "superstarter.todo.id": TodoId },
		learned: {}
	}),
	/** Borrowing a pooled client, including its IAM token and TLS handshake when it opens one: whether
	 * the borrow opened the client or reused an idle one, and the pool's own counts at the borrow. */
	postgresConnect: operationalSpan({
		name: "superstarter.postgres.connect",
		opened: { "db.system.name": PostgresSystem },
		learned: {
			/** Whether the borrow opened its client (`connected`) or took an idle one (`reused`), and the
			 * pool's own counts at the borrow. OpenTelemetry's `db.client.connection.*` names are metric
			 * attributes with other meanings, so these are ours. */
			"superstarter.postgres.connection": Schema.Literals(["connected", "reused"]),
			"superstarter.postgres.pool.total": Count,
			"superstarter.postgres.pool.idle": Count,
			"superstarter.postgres.pool.waiting": Count
		}
	}),
	/** One issued statement. A prepared plan names itself; a builder statement has no name, and SQL
	 * text never becomes one. */
	postgresStatement: operationalSpan({
		name: "superstarter.postgres.statement",
		opened: { "db.system.name": PostgresSystem, "db.operation.name": Schema.optionalKey(Token) },
		learned: {}
	}),
	/** BEGIN through COMMIT or ROLLBACK. Every transaction runs SERIALIZABLE; reads are READ ONLY. */
	postgresTransaction: operationalSpan({
		name: "superstarter.postgres.transaction",
		opened: {
			"db.system.name": PostgresSystem,
			"superstarter.postgres.access": Schema.Literals(["read-write", "read-only"])
		},
		learned: {}
	})
} as const
