import { realtimeMiddleware } from "@inngest/realtime/middleware"
import * as logger from "@superbuilders/slog"
import { EventSchemas, Inngest, type Logger } from "inngest"
import { z } from "zod"
import { env } from "@/env"

const schema = {
	"superstarter/hello": z.object({
		message: z.string().min(1)
	}),
	"paul/agents/fs/read": z.object({
		path: z.string().min(1)
	}),
	"paul/agents/fs/glob": z.object({
		dirPath: z.string().min(1),
		pattern: z.string().min(1)
	}),
	"paul/agents/fs/grep": z.object({
		dirPath: z.string().min(1),
		pattern: z.string().min(1),
		glob: z.string().optional(),
		maxResults: z.number().optional()
	}),
	"paul/agents/fs/write": z.object({
		path: z.string().min(1),
		content: z.string()
	}),
	"paul/agents/fs/edit": z.object({
		path: z.string().min(1),
		oldString: z.string().min(1),
		newString: z.string(),
		replaceAll: z.boolean().optional()
	}),
	"paul/agents/explore": z.object({
		prompt: z.string().min(1)
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
