import { channel, topic } from "@inngest/realtime"
import { z } from "zod"
import { inngest } from "@/inngest/client"

/**
 * Defines a global channel for hello-world realtime messages.
 * This channel has a single topic "logs" for broadcasting simple string messages.
 */
export const helloChannel = channel("hello-world").addTopic(topic("logs").schema(z.object({ message: z.string() })))

export const helloWorld = inngest.createFunction(
	{ id: "hello-world" },
	{ event: "test/hello.world" },
	async ({ event, step, logger, publish }) => {
		logger.info("Hello world function triggered", { event })

		logger.info("Waiting for 1 second...")
		await step.sleep("wait-a-moment", "1s")

		// Publish a message to the "logs" topic on the "hello-world" channel.
		await publish(
			helloChannel().logs({
				message: `Hello ${event.data.email}! Realtime message sent at ${new Date().toLocaleTimeString()}. Sorry that took so long! As you can see from the logs, I was sleeping.`
			})
		)

		return { message: `Hello ${event.data.email}!` }
	}
)
