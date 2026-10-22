import { Array as Arr, Schema } from "effect"

/** The title column's length in characters, shared by the column and the admission Schema. */
export const TODO_TITLE_MAX_LENGTH = 256

/** A server-minted UUIDv7: every primary key is one, so its first 48 bits are its row's creation
 * time. Each table's id brands it further, and stays a Uuidv7. */
export const Uuidv7 = Schema.String.check(Schema.isUUID(7)).pipe(Schema.brand("Uuidv7"))
export type Uuidv7 = typeof Uuidv7.Type

/** A todo's id. */
export const TodoId = Uuidv7.pipe(Schema.brand("TodoId"))
export type TodoId = typeof TodoId.Type

/** A title as a person typed it: trimmed, never empty, at most the column's length in characters,
 * so every title the column and its CHECK accept decodes, and every title that decodes fits. A
 * character is a code point, as PostgreSQL counts `varchar`, not a UTF-16 unit. */
export const TodoTitle = Schema.String.check(
	Schema.isTrimmed(),
	Schema.isMinLength(1),
	Schema.makeFilter((title: string) => Arr.fromIterable(title).length <= TODO_TITLE_MAX_LENGTH)
).pipe(Schema.brand("TodoTitle"))
export type TodoTitle = typeof TodoTitle.Type

/** The todo a toggle or delete names no longer exists. */
export class TodoNotFound extends Schema.TaggedError<
	TodoNotFound,
	{ readonly brand: unique symbol }
>()("TodoNotFound", {
	id: TodoId
}) {}
