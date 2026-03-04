import * as logger from "@superbuilders/slog"
import { Inngest, type Logger } from "inngest"
import { env } from "@/env"

const inngestLogger: Logger = {
	info: logger.info,
	warn: logger.warn,
	error: logger.error,
	debug: logger.debug
}

const inngest = new Inngest({
	id: "superstarter",
	logger: inngestLogger,
	eventKey: env.INNGEST_EVENT_KEY,
	signingKey: env.INNGEST_SIGNING_KEY
})

export { inngest }
