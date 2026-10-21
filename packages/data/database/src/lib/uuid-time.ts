import { DateTime, Option, String as Str } from "effect"

/** A UUIDv7's first 48 bits are a big-endian unix-millisecond timestamp: twelve hex digits. */
const UUIDV7_MILLISECOND_HEX_DIGITS = 12

/**
 * The creation instant a UUIDv7 carries. Every primary key is minted by PostgreSQL's uuidv7(), so
 * a row's id already records when it was created and no createdAt column exists.
 * @public
 */
export const timestampFromUuidv7 = (id: string): Option.Option<DateTime.Utc> => {
	const prefix = Str.slice(0, UUIDV7_MILLISECOND_HEX_DIGITS)(Str.replaceAll("-", "")(id))
	const milliseconds = Number.parseInt(prefix, 16)
	if (prefix.length !== UUIDV7_MILLISECOND_HEX_DIGITS || !Number.isFinite(milliseconds)) {
		return Option.none()
	}
	return DateTime.make(milliseconds)
}

/**
 * The smallest UUIDv7 minted at or after `instant`. `WHERE id >= uuidv7LowerBound(cutoff)` is
 * `WHERE created_at >= cutoff` served by the primary-key index.
 * @public
 */
export const uuidv7LowerBound = (instant: DateTime.Utc): string => {
	const hex = Str.padStart(
		UUIDV7_MILLISECOND_HEX_DIGITS,
		"0"
	)(DateTime.toEpochMillis(instant).toString(16))
	return `${Str.slice(0, 8)(hex)}-${Str.slice(8, 12)(hex)}-7000-8000-000000000000`
}
