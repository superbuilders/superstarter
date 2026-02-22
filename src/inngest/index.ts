import { realtimeMiddleware } from "@inngest/realtime/middleware"
import * as logger from "@superbuilders/slog"
import { EventSchemas, Inngest, type Logger } from "inngest"
import type { todosEventSource } from "@/db/programs/events/todos"
import { env } from "@/env"
import type { InferEventSchemas } from "@/event-source"

type Schemas = InferEventSchemas<typeof todosEventSource>

const inngestLogger: Logger = {
	info: logger.info,
	warn: logger.warn,
	error: logger.error,
	debug: logger.debug
}

const inngest = new Inngest({
	id: "superstarter",
	checkpointing: true,
	schemas: new EventSchemas().fromRecord<Schemas>(),
	logger: inngestLogger,
	eventKey: env.INNGEST_EVENT_KEY,
	signingKey: env.INNGEST_SIGNING_KEY,
	middleware: [realtimeMiddleware()]
})

export { inngest }
