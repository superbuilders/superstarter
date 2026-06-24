import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"

const UUIDV7_MS_HEX_LENGTH = 12

/**
 * Extract the millisecond unix timestamp encoded in a UUIDv7's first 48 bits.
 * UUIDv7 layout (RFC 9562): the first 48 bits are a big-endian unix
 * millisecond timestamp, followed by a 4-bit version (0x7) and random data.
 * Since every row id in the codebase is generated server-side via the
 * PG18 native uuidv7() function, the id itself carries the row's creation
 * time. Prefer this over redundant createdAt columns.
 */
function timestampFromUuidv7(id: string): Date {
	const stripped = id.replace(/-/g, "")
	if (stripped.length !== 32) {
		logger.error({ id }, "uuidv7 id is not 32 hex chars")
		throw errors.new("uuidv7 id has invalid length")
	}
	const msHex = stripped.slice(0, UUIDV7_MS_HEX_LENGTH)
	const ms = Number.parseInt(msHex, 16)
	if (!Number.isFinite(ms)) {
		logger.error({ id, msHex }, "uuidv7 timestamp prefix is not a hex number")
		throw errors.new("uuidv7 timestamp prefix unparseable")
	}
	return new Date(ms)
}

/**
 * Build the minimum possible UUIDv7 at a given instant. Useful as a lower
 * bound for time-ranged `gte` filters against uuidv7-keyed tables:
 *   `WHERE id >= uuidv7LowerBound(cutoff)`
 * is equivalent to
 *   `WHERE created_at >= cutoff`
 * but uses the primary-key index instead of a separate timestamp index.
 */
function uuidv7LowerBound(date: Date): string {
	const ms = date.getTime()
	if (!Number.isFinite(ms) || ms < 0) {
		logger.error({ date: date.toISOString() }, "uuidv7LowerBound got invalid date")
		throw errors.new("uuidv7LowerBound got invalid date")
	}
	const msHex = ms.toString(16).padStart(UUIDV7_MS_HEX_LENGTH, "0")
	return `${msHex.slice(0, 8)}-${msHex.slice(8, 12)}-7000-8000-000000000000`
}

export { timestampFromUuidv7, uuidv7LowerBound }
