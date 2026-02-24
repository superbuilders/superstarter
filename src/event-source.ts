import { getTableName } from "drizzle-orm"
import type { Column, SQL, Table } from "drizzle-orm"
import type { EventTriggerConfig } from "@/db/programs/triggers/emit-event"

type EventSourceTrigger<L extends string = string> = {
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

type InferEventSchemas<S extends { eventNames: string[] }> = {
	[K in S["eventNames"][number]]: EventPayload
}

function resolveTrigger<A extends string, N extends string, L extends string>(
	appId: A,
	tableName: N,
	trigger: EventSourceTrigger<L>
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

function createEventSource<
	const TAppId extends string,
	TTable extends Table,
	const T extends readonly [EventSourceTrigger, ...EventSourceTrigger[]]
>(config: { readonly appId: TAppId; readonly table: TTable; readonly triggers: T }) {
	const firstTrigger = config.triggers[0]
	const tableName = getTableName(config.table)
	const firstResolved = resolveTrigger(config.appId, tableName, firstTrigger)
	const restResolved = config.triggers.slice(1).map(function resolve(t) {
		return resolveTrigger(config.appId, tableName, t)
	})
	const resolved = [firstResolved, ...restResolved]

	type TLabel = T[number]["label"]
	type TEventName = `${TAppId}/${TTable["_"]["name"]}.${TLabel}`

	const eventNames: TEventName[] = config.triggers.map(function getEventName(t) {
		return `${config.appId}/${tableName}.${t.label}` as const
	})

	const triggerConfigs: EventTriggerConfig[] = resolved.map(function toEventTriggerConfig(t) {
		return {
			operation: t.operation,
			appId: config.appId,
			label: t.label,
			columns: t.columns,
			when: t.when
		}
	})

	return {
		appId: config.appId,
		table: config.table,
		triggers: config.triggers,
		resolved,
		eventNames,
		triggerConfigs
	}
}

export { createEventSource }
export type { EventPayload, EventSourceTrigger, InferEventSchemas, ResolvedTrigger }
