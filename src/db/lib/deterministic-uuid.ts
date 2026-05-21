import { createHash } from "node:crypto"
import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"

// Builds a deterministic UUID-shaped string with the version-7 nibble
// and the RFC-4122 variant bits set. The "timestamp" prefix is *not*
// real time — it's the leading bytes of a sha256 hash. Use only for
// seed-time IDs that need to be stable across redeployments (e.g.,
// strategies, whose ids are referenced by `items.strategy_id` and
// would invalidate on regeneration if the catalog seed re-ran with a
// different RNG).
function deterministicUuidv7(input: string): string {
	const hash = createHash("sha256").update(input).digest()
	const bytes = new Uint8Array(hash.buffer, hash.byteOffset, 16)
	const versionByte = bytes[6]
	if (versionByte === undefined) {
		logger.error({ input }, "deterministicUuidv7: hash buffer shorter than 16 bytes (versionByte)")
		throw errors.new("deterministicUuidv7: hash buffer too short")
	}
	bytes[6] = (versionByte & 0x0f) | 0x70
	const variantByte = bytes[8]
	if (variantByte === undefined) {
		logger.error({ input }, "deterministicUuidv7: hash buffer shorter than 16 bytes (variantByte)")
		throw errors.new("deterministicUuidv7: hash buffer too short")
	}
	bytes[8] = (variantByte & 0x3f) | 0x80
	const hex = Buffer.from(bytes).toString("hex")
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export { deterministicUuidv7 }
