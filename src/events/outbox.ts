import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { asc, inArray } from "drizzle-orm"
import { Inngest } from "inngest"
import { Client } from "pg"
import { db } from "@/db"
import { coreEventOutbox } from "@/db/schemas/core"
import { env } from "@/env"

const relay = new Inngest({ id: "superstarter-outbox-relay", eventKey: env.INNGEST_EVENT_KEY })

const DRAIN_BATCH_SIZE = 100

async function drain(): Promise<number> {
	return db.transaction(async function drainTransaction(tx) {
		const lockSubquery = tx
			.select({ id: coreEventOutbox.id })
			.from(coreEventOutbox)
			.orderBy(asc(coreEventOutbox.createdAt))
			.limit(DRAIN_BATCH_SIZE)
			.for("update", { skipLocked: true })

		const deleteResult = await errors.try(
			tx.delete(coreEventOutbox).where(inArray(coreEventOutbox.id, lockSubquery)).returning({
				id: coreEventOutbox.id,
				eventName: coreEventOutbox.eventName,
				entityId: coreEventOutbox.entityId
			})
		)
		if (deleteResult.error) {
			logger.error("outbox drain delete failed", { error: deleteResult.error })
			throw errors.wrap(deleteResult.error, "outbox drain delete")
		}

		const rows = deleteResult.data
		if (rows.length === 0) {
			logger.debug("outbox empty")
			return 0
		}

		const events = rows.map(function mapOutboxRow(row) {
			return {
				id: row.id,
				name: row.eventName,
				data: {
					entityId: row.entityId
				}
			}
		})

		const sendResult = await errors.try(relay.send(events))
		if (sendResult.error) {
			logger.error("outbox drain send failed", { error: sendResult.error })
			throw errors.wrap(sendResult.error, "outbox drain send")
		}

		logger.info("outbox drained", { count: rows.length })
		return rows.length
	})
}

async function drainAll(): Promise<number> {
	let total = 0
	let batch = await drain()
	while (batch > 0) {
		total += batch
		batch = await drain()
	}
	return total
}

let listener: Client | null = null
let connecting = false
let draining = false
let pendingDrain = false

function scheduleDrain(): void {
	if (draining) {
		pendingDrain = true
		return
	}
	draining = true
	runDrainLoop()
}

async function runDrainLoop(): Promise<void> {
	while (true) {
		const result = await errors.try(drainAll())
		if (result.error) {
			logger.error("drain after notification failed", { error: result.error })
		}
		if (!pendingDrain) {
			break
		}
		pendingDrain = false
	}
	draining = false
}

async function ensureListening(): Promise<void> {
	if (listener !== null || connecting) {
		return
	}

	connecting = true
	const client = new Client({
		connectionString: env.DATABASE_URL,
		keepAlive: true,
		keepAliveInitialDelayMillis: 30_000,
		connectionTimeoutMillis: 10_000
	})

	const connectResult = await errors.try(client.connect())
	if (connectResult.error) {
		connecting = false
		logger.error("listen connect failed", { error: connectResult.error })
		return
	}

	const listenResult = await errors.try(client.query("LISTEN events"))
	if (listenResult.error) {
		connecting = false
		await client.end()
		logger.error("listen setup failed", { error: listenResult.error })
		return
	}

	client.on("notification", function handleNotification() {
		logger.debug("received outbox notification")
		scheduleDrain()
	})

	client.on("error", function handleListenerError(err: unknown) {
		logger.error("listener connection error", { error: err })
		listener = null
	})

	client.on("end", function handleListenerEnd() {
		logger.info("listener connection ended")
		listener = null
	})

	listener = client
	connecting = false
	logger.info("listening on events channel")
}

export { drain, drainAll, ensureListening }
