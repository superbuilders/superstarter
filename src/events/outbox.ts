import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { Inngest } from "inngest"
import { Client, Pool } from "pg"
import { env } from "@/env"

const relay = new Inngest({ id: "superstarter-outbox-relay", eventKey: env.INNGEST_EVENT_KEY })

const pool = new Pool({
	connectionString: env.DATABASE_URL,
	keepAlive: true,
	keepAliveInitialDelayMillis: 30_000,
	idle_in_transaction_session_timeout: 30_000
})

const DRAIN_BATCH_SIZE = 100

async function drain(): Promise<number> {
	const client = await pool.connect()
	using stack = new DisposableStack()
	stack.defer(function releaseClient() {
		client.release()
	})

	const beginResult = await errors.try(client.query("BEGIN"))
	if (beginResult.error) {
		logger.error("outbox drain begin failed", { error: beginResult.error })
		throw errors.wrap(beginResult.error, "outbox drain begin")
	}

	const deleteResult = await errors.try(
		client.query(
			`DELETE FROM core.event_outbox
			 WHERE id IN (
			   SELECT id FROM core.event_outbox
			   ORDER BY created_at ASC
			   LIMIT $1
			   FOR UPDATE SKIP LOCKED
			 )
			 RETURNING id, event_name, entity_id, payload, created_at`,
			[DRAIN_BATCH_SIZE]
		)
	)
	if (deleteResult.error) {
		await rollback(client)
		logger.error("outbox drain delete failed", { error: deleteResult.error })
		throw errors.wrap(deleteResult.error, "outbox drain delete")
	}

	const rows = deleteResult.data.rows
	if (rows.length === 0) {
		await commit(client)
		logger.debug("outbox empty")
		return 0
	}

	const events = rows.map(function mapOutboxRow(row: {
		id: string
		event_name: string
		entity_id: string
		payload: Record<string, unknown>
	}) {
		return {
			id: row.id,
			name: row.event_name,
			data: {
				entityId: row.entity_id,
				...row.payload
			}
		}
	})

	const sendResult = await errors.try(relay.send(events))
	if (sendResult.error) {
		await rollback(client)
		logger.error("outbox drain send failed", { error: sendResult.error })
		throw errors.wrap(sendResult.error, "outbox drain send")
	}

	await commit(client)
	logger.info("outbox drained", { count: rows.length })
	return rows.length
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
		drain().catch(function handleDrainError(err: unknown) {
			logger.error("drain after notification failed", { error: err })
		})
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

async function rollback(client: { query: (text: string) => Promise<unknown> }): Promise<void> {
	const result = await errors.try(client.query("ROLLBACK"))
	if (result.error) {
		logger.error("outbox rollback failed", { error: result.error })
	}
}

async function commit(client: { query: (text: string) => Promise<unknown> }): Promise<void> {
	const result = await errors.try(client.query("COMMIT"))
	if (result.error) {
		logger.error("outbox commit failed", { error: result.error })
		throw errors.wrap(result.error, "outbox commit")
	}
}

export { drain, drainAll, ensureListening }
