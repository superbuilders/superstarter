import { Effect, Schema } from "effect"
import { DevtoolFailure } from "#scripts/dev/devtool-failure.ts"

/** JSON text goes through a Schema, so what a tool prints or hands the compiler has a declared shape. */
export const jsonEncoder =
	<S extends Schema.ConstraintCodec<unknown>>(schema: S) =>
	(value: S["Type"]): Effect.Effect<string, DevtoolFailure> =>
		Schema.encodeEffect(Schema.fromJsonString(schema))(value).pipe(
			Effect.mapError((cause) => DevtoolFailure.make({ detail: "JSON encoding failed", cause }))
		)
