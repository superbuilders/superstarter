import { realtimeMiddleware } from "@inngest/realtime"
import * as logger from "@superbuilders/slog"
import { EventSchemas, type GetEvents, Inngest } from "inngest"
import { z } from "zod"

const events = {
	"test/hello.world": {
		data: z.object({
			email: z.string().email()
		})
	}
}

export const inngest = new Inngest({
	id: "my-app",
	schemas: new EventSchemas().fromZod(events),
	logger,
	middleware: [realtimeMiddleware()]
})

export type Events = GetEvents<typeof inngest>
