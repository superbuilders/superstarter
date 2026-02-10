"use server"

import { getSubscriptionToken } from "@inngest/realtime"
import { inngest } from "@/inngest"

async function getRealtimeToken(channel: string) {
	const token = await getSubscriptionToken(inngest, {
		channel,
		topics: ["status"]
	})
	return token
}

async function triggerHello(message: string) {
	await inngest.send({
		name: "superstarter/hello",
		data: { message }
	})
}

export { getRealtimeToken, triggerHello }
