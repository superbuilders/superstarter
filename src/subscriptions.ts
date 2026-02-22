import { channel, topic } from "@inngest/realtime"
import { getSubscriptionToken } from "@inngest/realtime"
import type { Realtime } from "@inngest/realtime"
import type { Inngest, Logger } from "inngest"
import type { EventSourceTrigger } from "@/event-source"

type SignalMessage = { readonly id: string }

type DataMessage<TRow> = { readonly id: string; readonly data: TRow }

type SubscriptionMessage<TRow> = SignalMessage | DataMessage<TRow>

type InferRow<S> = S extends { readonly query: (id: string) => Promise<(infer R)[]> } ? R : never

type InferMessage<S> = SubscriptionMessage<InferRow<S>>

function createRealtimeSubscription<
	const T extends readonly [EventSourceTrigger, ...EventSourceTrigger[]],
	TRow extends Record<string, unknown> = Record<string, unknown>
>(config: {
	readonly source: {
		readonly triggers: T
		readonly resolved: ReadonlyArray<{ readonly operation: string; readonly label: string; readonly eventName: string }>
		readonly eventNames: string[]
		readonly triggerConfigs: ReadonlyArray<Record<string, unknown>>
		readonly appId: string
	}
	readonly channelName: string
	readonly query?: (id: string) => Promise<TRow[]>
}) {
	const source = config.source

	type TLabel = T[number]["label"]

	const topicNames: TLabel[] = source.triggers.map(function getLabel(t) {
		return t.label
	})

	let ch = channel(config.channelName)
	for (const name of topicNames) {
		ch = ch.addTopic(topic(name))
	}

	function createFunctions(inngest: Inngest.Any) {
		return source.resolved.map(function buildFunction(trigger) {
			const isDelete = trigger.operation === "DELETE"
			const functionId = trigger.eventName.replaceAll("/", "-").replaceAll(".", "-")

			return inngest.createFunction(
				{ id: functionId },
				{ event: trigger.eventName },
				async function handler({
					event,
					logger,
					publish
				}: {
					event: { data: { id: string } }
					logger: Logger
					publish: Realtime.PublishFn
				}) {
					const id = event.data.id

					if (isDelete || !config.query) {
						logger.info("publishing signal", { id, topic: trigger.label })
						await publish({
							channel: config.channelName,
							topic: trigger.label,
							data: { id }
						})
						return { id }
					}

					logger.info("publishing data", { id, topic: trigger.label })

					const rows = await config.query(id)
					const row = rows[0]
					if (!row) {
						logger.warn("row not found", { id })
						await publish({
							channel: config.channelName,
							topic: trigger.label,
							data: { id }
						})
						return { id }
					}

					await publish({
						channel: config.channelName,
						topic: trigger.label,
						data: { id, data: row }
					})
					return { id }
				}
			)
		})
	}

	type TopicPayload<TOp extends string, L extends string> = TOp extends "DELETE"
		? Realtime.Topic.Definition<L, SignalMessage, SignalMessage>
		: Realtime.Topic.Definition<L, DataMessage<TRow>, DataMessage<TRow>>

	type TTopics = { [K in T[number] as K["label"]]: TopicPayload<K["operation"], K["label"]> }
	type TChannel = Realtime.Channel<string, TTopics>
	type TToken = Realtime.Subscribe.Token<TChannel, TLabel[]>

	function getToken(inngest: Inngest.Any): Promise<TToken> {
		const token: Promise<TToken> = getSubscriptionToken(inngest, {
			channel: config.channelName,
			topics: topicNames
		})
		return token
	}

	return {
		...source,
		channel: ch,
		channelName: config.channelName,
		getToken,
		createFunctions,
		query: config.query
	}
}

export { createRealtimeSubscription }
export type { InferMessage, InferRow, SubscriptionMessage }
