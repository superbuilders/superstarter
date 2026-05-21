import * as errors from "@superbuilders/errors"
import { randomBytes } from "node:crypto"
import { logger } from "@/logger"

// Crockford's base32 alphabet (digits + lowercase consonants minus i/l/o/u
// to avoid visual ambiguity). 32 chars = 5 bits per character; 8 chars per id
// gives 40 bits of entropy. See docs/plans/opaque-option-ids-and-pipeline-split.md §2.1.
const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"

function generateOptionId(): string {
	const bytes = randomBytes(8)
	let out = ""
	for (const byte of bytes) {
		const char = ALPHABET[byte & 31]
		if (char === undefined) {
			logger.error({ byte }, "generateOptionId: alphabet index out of bounds")
			throw errors.new("alphabet index out of bounds")
		}
		out += char
	}
	return out
}

function assignOptionIds(
	options: { text: string }[]
): { id: string; text: string }[] {
	return options.map(function withId(option) {
		return { id: generateOptionId(), text: option.text }
	})
}

export { assignOptionIds, generateOptionId }
