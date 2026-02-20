import { after } from "next/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { drainAll, ensureListening } from "@/events/outbox"

/** Maximum function duration in seconds. Enterprise plan allows up to 800s. */
const maxDuration = 800

async function GET(): Promise<Response> {
	const drainResult = await errors.try(drainAll())
	if (drainResult.error) {
		logger.error("heartbeat drain failed", { error: drainResult.error })
		return new Response("drain failed", { status: 500 })
	}

	logger.info("heartbeat drain complete", { count: drainResult.data })

	after(function backgroundEnsureListening() {
		ensureListening()
	})

	return new Response("ok", { status: 200 })
}

export { GET, maxDuration }
