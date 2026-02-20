import { realtimeMiddleware } from "@inngest/realtime/middleware"
import * as logger from "@superbuilders/slog"
import { EventSchemas, Inngest, type Logger } from "inngest"
import { z } from "zod"
import { env } from "@/env"

const schema = {
	"superstarter/hello": z.object({
		message: z.string().min(1)
	}),
	"superstarter/file.read": z.object({
		path: z.string().min(1)
	})
}

const inngestLogger: Logger = {
	info: logger.info,
	warn: logger.warn,
	error: logger.error,
	debug: logger.debug
}

const inngest = new Inngest({
	id: "superstarter",
	checkpointing: true,
	schemas: new EventSchemas().fromSchema(schema),
	logger: inngestLogger,
	eventKey: env.INNGEST_EVENT_KEY,
	signingKey: env.INNGEST_SIGNING_KEY,
	middleware: [realtimeMiddleware()]
})

export { inngest }
