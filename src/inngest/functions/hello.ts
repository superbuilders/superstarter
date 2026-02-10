import type { Realtime } from "@inngest/realtime"
import type { Context } from "inngest/types"
import { inngest } from "@/inngest"

type RealtimeOverrides = {
	publish: Realtime.PublishFn
}

const helloWorld = inngest.createFunction(
	{ id: "hello-world" },
	{ event: "superstarter/hello" },
	async ({
		event,
		step,
		publish
	}: Context<typeof inngest, "superstarter/hello", RealtimeOverrides>) => {
		await publish({
			channel: `demo:${event.data.message}`,
			topic: "status",
			data: { status: "started" }
		})

		await step.sleep("wait-a-moment", "1s")
		await publish({
			channel: `demo:${event.data.message}`,
			topic: "status",
			data: { status: "processing" }
		})

		await step.sleep("wait-more", "1s")
		await publish({
			channel: `demo:${event.data.message}`,
			topic: "status",
			data: { status: "completed" }
		})

		return { message: `Hello ${event.data.message}!` }
	}
)

export { helloWorld }
