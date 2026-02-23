import { realtimeMiddleware } from "@inngest/realtime/middleware"
import * as logger from "@superbuilders/slog"
import { EventSchemas, Inngest, type Logger } from "inngest"
import { z } from "zod"
import { env } from "@/env"

const schema = {
	"superstarter/hello": z.object({
		message: z.string().min(1)
	}),
	"paul/agents/explore": z.object({
		prompt: z.string().min(1),
		sandboxId: z.string().min(1),
		github: z
			.object({
				repoUrl: z.string().url(),
				branch: z.string().min(1)
			})
			.optional()
	}),
	"paul/agents/code": z.object({
		prompt: z.string().min(1),
		sandboxId: z.string().min(1),
		github: z
			.object({
				repoUrl: z.string().url(),
				branch: z.string().min(1)
			})
			.optional()
	}),
	"paul/sandbox/create": z.object({
		runtime: z.enum(["node24", "node22", "python3.13"]).default("node24"),
		github: z
			.object({
				repoUrl: z.string().url(),
				branch: z.string().min(1),
				token: z.string().min(1).optional()
			})
			.optional()
	}),
	"paul/sandbox/stop": z.object({
		sandboxId: z.string().min(1)
	}),
	"paul/debug/echo": z.object({
		source: z.string().min(1),
		payload: z.record(z.string(), z.unknown())
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
