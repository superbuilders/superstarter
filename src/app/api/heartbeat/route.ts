import { after } from "next/server"
import * as errors from "@superbuilders/errors"
import { drainAll, listenAndDrain } from "@/app/api/heartbeat/outbox"
import { logger } from "@/logger"

/** Must match the maxDuration in vercel.json for this route. */
const MAX_DURATION_S = 800

async function GET(): Promise<Response> {
	const drainResult = await errors.try(drainAll())
	if (drainResult.error) {
		logger.error({ error: drainResult.error }, "heartbeat drain failed")
		return new Response("drain failed", { status: 500 })
	}

	logger.info({ count: drainResult.data }, "heartbeat drain complete")

	const listenDurationMs = (MAX_DURATION_S / 2) * 1_000

	after(function backgroundListener() {
		return listenAndDrain(listenDurationMs)
	})

	return new Response("ok", { status: 200 })
}

export { GET }
