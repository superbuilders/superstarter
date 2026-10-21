import { DrizzleQueryError } from "drizzle-orm/errors"
import { Match, Predicate, Schema } from "effect"
import { DatabaseError } from "pg"

/** A PostgreSQL SQLSTATE: five digits or upper-case letters. */
const SqlState = Schema.String.check(Schema.isPattern(/^[0-9A-Z]{5}$/)).pipe(
	Schema.brand("SqlState")
)
type SqlState = typeof SqlState.Type

/** Node's code for a socket that failed below the protocol: refused, reset, timed out, unresolved. */
const TransportCode = Schema.Literals([
	"ECONNREFUSED",
	"ECONNRESET",
	"ETIMEDOUT",
	"EPIPE",
	"ENOTFOUND",
	"EAI_AGAIN",
	"EHOSTUNREACH"
])
type TransportCode = typeof TransportCode.Type

/**
 * What a native failure may say about itself, and nothing more. A failure carries its SQLSTATE and
 * the constraint it names, both owned by this codebase and free of row values; never the message,
 * detail or bound parameters, which can quote what a statement was given.
 */
export const PostgresDiagnostic = Schema.Union([
	Schema.Struct({
		kind: Schema.Literal("sqlstate"),
		sqlState: SqlState,
		constraint: Schema.UndefinedOr(Schema.String)
	}),
	Schema.Struct({ kind: Schema.Literal("transport"), code: TransportCode }),
	Schema.Struct({ kind: Schema.Literal("unclassified") })
])
export type PostgresDiagnostic = typeof PostgresDiagnostic.Type

const isSqlState = Schema.is(SqlState)
const isDatabaseError = (error: unknown): error is DatabaseError => error instanceof DatabaseError
const isTransportCode = Schema.is(TransportCode)

const transportDiagnosticOf = (error: unknown): PostgresDiagnostic => {
	const code = Predicate.hasProperty(error, "code") ? error.code : undefined
	return isTransportCode(code) ? { kind: "transport", code } : { kind: "unclassified" }
}

/** Drizzle wraps every statement's driver failure in a DrizzleQueryError whose `cause` is pg's own
 * error; the diagnostic is read from pg's. */
const driverFailureOf = (error: unknown): unknown =>
	error instanceof DrizzleQueryError ? error.cause : error

/** The one decode of a native pg failure, bare or wrapped by Drizzle, into its admitted diagnostic. */
export const postgresDiagnosticOf = (error: unknown): PostgresDiagnostic =>
	Match.value(driverFailureOf(error)).pipe(
		Match.when(isDatabaseError, (native): PostgresDiagnostic => {
			const sqlState = native.code
			return isSqlState(sqlState)
				? { kind: "sqlstate", sqlState, constraint: native.constraint }
				: { kind: "unclassified" }
		}),
		Match.orElse(transportDiagnosticOf)
	)

export type TransientReason = "serialization-failure" | "deadlock"

/** A SERIALIZABLE conflict (40001) and a deadlock (40P01) leave the attempt without effect, so it
 * may succeed when run again. Callers decide whether to retry; nothing here retries. */
export const transientReasonOf = (diagnostic: PostgresDiagnostic): TransientReason | undefined => {
	if (diagnostic.kind !== "sqlstate") {
		return undefined
	}
	if (diagnostic.sqlState === "40001") {
		return "serialization-failure"
	}
	if (diagnostic.sqlState === "40P01") {
		return "deadlock"
	}
	return undefined
}
