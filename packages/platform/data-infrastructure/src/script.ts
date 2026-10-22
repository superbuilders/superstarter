import { Effect, Function as Fn, Schema } from "effect"

/** A script ran with arguments its usage does not admit. The usage is the script's own line. */
class ScriptUsage extends Schema.TaggedError<ScriptUsage, { readonly brand: unique symbol }>()(
	"ScriptUsage",
	{ usage: Schema.NonEmptyString }
) {}

/** A Schema a script's arguments decode through, with no services of its own. */
type ArgumentsSchema = Schema.Top & { readonly DecodingServices: never }

const argumentsOfSchema =
	<S extends ArgumentsSchema>(schema: S, usage: string) =>
	(args: unknown): Effect.Effect<S["Type"], ScriptUsage> =>
		Schema.decodeUnknownEffect(schema)(args).pipe(
			Effect.mapError(() => ScriptUsage.make({ usage }))
		)

/** A script's argv, admitted once by its Schema; anything else answers with the usage:
 * `stdio.args.pipe(Effect.flatMap(argumentsOf(Arguments, "deploy <environment>")))`. */
export const argumentsOf: {
	(
		usage: string
	): <S extends ArgumentsSchema>(
		schema: S
	) => (args: unknown) => Effect.Effect<S["Type"], ScriptUsage>
	<S extends ArgumentsSchema>(
		schema: S,
		usage: string
	): (args: unknown) => Effect.Effect<S["Type"], ScriptUsage>
} = Fn.dual(2, argumentsOfSchema)

/** A child's exit code becomes this script's, once the child has exited. */
export const exitWith = (code: number): Effect.Effect<void> =>
	Effect.sync(() => {
		process.exitCode = code
	})
