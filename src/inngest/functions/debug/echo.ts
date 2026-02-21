import { inngest } from "@/inngest"

const echoFunction = inngest.createFunction(
	{ id: "paul/debug/echo" },
	{ event: "paul/debug/echo" },
	async ({ event, logger }) => {
		logger.info("echo", { source: event.data.source })
		return event.data
	}
)

export { echoFunction }
