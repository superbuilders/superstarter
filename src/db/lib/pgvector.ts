import * as errors from "@superbuilders/errors"
import { customType } from "drizzle-orm/pg-core"
import { logger } from "@/logger"

interface VectorConfig {
	dimensions: number
}

const vector = customType<{ data: number[]; driverData: string; config: VectorConfig }>({
	dataType(config) {
		if (!config) {
			logger.error("vector column requires a dimensions config")
			throw errors.new("vector column requires dimensions config")
		}
		return `vector(${config.dimensions})`
	},
	toDriver(value) {
		return `[${value.join(",")}]`
	},
	fromDriver(value) {
		const parsed = errors.trySync(function parseVector() {
			return JSON.parse(value)
		})
		if (parsed.error) {
			logger.error({ error: parsed.error, value }, "vector column fromDriver parse failed")
			throw errors.wrap(parsed.error, "vector column fromDriver")
		}
		const data = parsed.data
		if (!Array.isArray(data)) {
			logger.error({ value }, "vector column fromDriver result is not an array")
			throw errors.new("vector column fromDriver expected array")
		}
		return data
	}
})

export { vector }
