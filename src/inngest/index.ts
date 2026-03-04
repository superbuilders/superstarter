import { Inngest } from "inngest"
import { env } from "@/env"
import { logger } from "@/logger"

const inngest = new Inngest({
	id: "superstarter",
	logger: logger,
	eventKey: env.INNGEST_EVENT_KEY,
	signingKey: env.INNGEST_SIGNING_KEY
})

export { inngest }
