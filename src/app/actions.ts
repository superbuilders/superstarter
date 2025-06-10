"use server"

import { getSubscriptionToken, type Realtime } from "@inngest/realtime"
import { inngest } from "@/inngest/client"
import { helloChannel } from "@/inngest/functions/hello"

export type HelloToken = Realtime.Token<typeof helloChannel, ["logs"]>

/**
 * Creates a short-lived, secure token for a client to subscribe to the
 * specified topics on the helloChannel.
 */
export async function fetchRealtimeSubscriptionToken(): Promise<HelloToken> {
	const token = await getSubscriptionToken(inngest, {
		channel: helloChannel(),
		topics: ["logs"]
	})

	return token
}

/**
 * Triggers the "hello.world" event to demonstrate the realtime functionality.
 */
export async function triggerHelloWorld() {
	await inngest.send({
		name: "test/hello.world",
		data: {
			email: "realtime-user@example.com"
		}
	})
}
