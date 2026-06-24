import pino from "pino"

// biome-ignore lint/style/noProcessEnv: avoid circular dependencies
const isProduction = process.env.NODE_ENV === "production"
const transport = isProduction ? undefined : { target: "pino-pretty", options: { colorize: true } }

const logger = pino({
	level: "debug",
	transport,
	serializers: {
		error: pino.stdSerializers.err
	}
})

export { logger }
