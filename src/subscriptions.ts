import { channel, topic } from "@inngest/realtime"
import { getSubscriptionToken } from "@inngest/realtime"
import type { Realtime } from "@inngest/realtime"
import { getTableName } from "drizzle-orm"
import type { Column, SQL, Table } from "drizzle-orm"
import type { Inngest, Logger } from "inngest"
import type { EventTriggerConfig } from "@/db/programs/triggers/emit-event"

type SubscriptionTrigger<L extends string = string> = {
	readonly operation: "INSERT" | "UPDATE" | "DELETE"
	readonly label: L
	readonly columns?: Column[]
	readonly when?: SQL
}

type ResolvedTrigger<L extends string = string, E extends string = string> = {
	readonly operation: "INSERT" | "UPDATE" | "DELETE"
	readonly label: L
	readonly eventName: E
	readonly columns?: Column[]
	readonly when?: SQL
}

type EventPayload = { data: { id: string; tableName: string } }

type SignalMessage = { readonly id: string }

type DataMessage<TRow> = { readonly id: string; readonly data: TRow }

type SubscriptionMessage<TRow> = SignalMessage | DataMessage<TRow>

type InferRow<S> = S extends { readonly query: (id: string) => Promise<(infer R)[]> } ? R : never

type InferMessage<S> = SubscriptionMessage<InferRow<S>>

type InferEventSchemas<S extends { eventNames: string[] }> = {
	[K in S["eventNames"][number]]: EventPayload
}

function resolveTrigger<A extends string, N extends string, L extends string>(
	appId: A,
	tableName: N,
	trigger: SubscriptionTrigger<L>
): ResolvedTrigger<L, `${A}/${N}.${L}`> {
	const eventName: `${A}/${N}.${L}` = `${appId}/${tableName}.${trigger.label}`
	return {
		operation: trigger.operation,
		label: trigger.label,
		eventName,
		columns: trigger.columns,
		when: trigger.when
	}
}

function createSubscription<
	const TAppId extends string,
	TTable extends Table,
	const T extends readonly [SubscriptionTrigger, ...SubscriptionTrigger[]],
	TRow extends Record<string, unknown> = Record<string, unknown>
>(config: {
	readonly appId: TAppId
	readonly channelName: string
	readonly table: TTable
	readonly triggers: T
	readonly query?: (id: string) => Promise<TRow[]>
}) {
	const firstTrigger = config.triggers[0]
	const tableName = getTableName(config.table)
	const firstResolved = resolveTrigger(config.appId, tableName, firstTrigger)
	const restResolved = config.triggers.slice(1).map(function resolve(t) {
		return resolveTrigger(config.appId, tableName, t)
	})
	const resolved = [firstResolved, ...restResolved]

	const topicNames = resolved.map(function getLabel(t) {
		return t.label
	})

	type TEventName = `${TAppId}/${TTable["_"]["name"]}.${T[number]["label"]}`

	const eventNames: TEventName[] = config.triggers.map(function getEventName(t) {
		return `${config.appId}/${tableName}.${t.label}` as const
	})

	let ch = channel(config.channelName)
	for (const name of topicNames) {
		ch = ch.addTopic(topic(name))
	}

	const triggerConfigs: EventTriggerConfig[] = resolved.map(function toEventTriggerConfig(t) {
		return {
			operation: t.operation,
			appId: config.appId,
			label: t.label,
			columns: t.columns,
			when: t.when
		}
	})

	function createFunctions(inngest: Inngest.Any) {
		return resolved.map(function buildFunction(trigger) {
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

	return {
		channel: ch,
		channelName: config.channelName,
		eventNames,
		triggerConfigs,
		getToken: function getToken(inngest: Inngest.Any) {
			return getSubscriptionToken(inngest, {
				channel: config.channelName,
				topics: topicNames
			})
		},
		createFunctions,
		query: config.query
	}
}

export { createSubscription }
export type {
	EventPayload,
	InferEventSchemas,
	InferMessage,
	InferRow,
	SubscriptionMessage,
	SubscriptionTrigger
}
