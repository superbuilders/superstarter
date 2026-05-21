import pino from "pino"

// biome-ignore lint/style/noProcessEnv: avoid circular dependencies
const isProduction = process.env.NODE_ENV === "production"
const transport = isProduction ? undefined : { target: "pino-pretty", options: { colorize: true } }

/** DO NOT FUCKING TOUCH THE LEVEL — WE SHOULD ALWAYS LOG DEBUG ON THE SERVER.
 * The previous setter lived in src/env.ts behind an `isServerRuntime` guard.
 * That guard had to move here because env.ts is reachable through the Node
 * runtime via Next.js's transpile-config (which doesn't honor the `@/`
 * alias), and importing the logger there pulls pino through Turbopack's
 * external-module path that is broken under `bun --bun`. Hardcoding
 * "debug" at construction preserves the always-debug-on-server invariant.
 */
const logger = pino({
	level: "debug",
	transport,
	serializers: {
		error: pino.stdSerializers.err
	}
})

export { logger }
