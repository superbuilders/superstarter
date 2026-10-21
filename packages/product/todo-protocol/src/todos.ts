import { Schema } from "effect"

/** The title column's length, shared by the column, its CHECK and the admission Schema. */
export const TODO_TITLE_MAX_LENGTH = 256

/** A todo's id is a server-minted UUIDv7, so its first 48 bits are the row's creation time. */
export const TodoId = Schema.String.check(Schema.isUUID(7)).pipe(Schema.brand("TodoId"))
export type TodoId = typeof TodoId.Type

/** A title as a person typed it: trimmed, never empty, at most the column's length. */
export const TodoTitle = Schema.String.check(
	Schema.isTrimmed(),
	Schema.isMinLength(1),
	Schema.isMaxLength(TODO_TITLE_MAX_LENGTH)
).pipe(Schema.brand("TodoTitle"))
export type TodoTitle = typeof TodoTitle.Type

/** The todo a toggle or delete names no longer exists. */
export class TodoNotFound extends Schema.TaggedError<
	TodoNotFound,
	{ readonly brand: unique symbol }
>()("TodoNotFound", {
	id: TodoId
}) {}
