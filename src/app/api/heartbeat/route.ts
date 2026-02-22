import { after } from "next/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { drainAll, listenAndDrain } from "@/app/api/heartbeat/outbox"

/** Must match the maxDuration in vercel.json for this route. */
const MAX_DURATION_S = 800

async function GET(): Promise<Response> {
	const drainResult = await errors.try(drainAll())
	if (drainResult.error) {
		logger.error("heartbeat drain failed", { error: drainResult.error })
		return new Response("drain failed", { status: 500 })
	}

	logger.info("heartbeat drain complete", { count: drainResult.data })

	const listenDurationMs = (MAX_DURATION_S / 2) * 1_000

	after(function backgroundListener() {
		return listenAndDrain(listenDurationMs)
	})

	return new Response("ok", { status: 200 })
}

export { GET }
