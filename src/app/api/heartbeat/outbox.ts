import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { asc, inArray } from "drizzle-orm"
import { Inngest } from "inngest"
import { Client } from "pg"
import { db } from "@/db"
import { coreEventOutbox } from "@/db/schemas/core"
import { env } from "@/env"

const relay = new Inngest({ id: "superstarter-outbox-relay", eventKey: env.INNGEST_EVENT_KEY })

const DRAIN_BATCH_SIZE = 1000
const MAX_BACKOFF_MS = 30_000

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
				appId: coreEventOutbox.appId,
				label: coreEventOutbox.label,
				entityId: coreEventOutbox.entityId,
				tableName: coreEventOutbox.tableName
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
				name: `${row.appId}/${row.tableName}.${row.label}`,
				data: {
					id: row.entityId,
					tableName: row.tableName
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
	const inflight = new Set<Promise<void>>()
	const { promise: done, resolve } = Promise.withResolvers<void>()

	function spawn(): void {
		const p = drain().then(function onDrain(count) {
			inflight.delete(p)
			total += count
			if (count > 0) {
				spawn()
			}
			if (inflight.size === 0) {
				resolve()
			}
		})
		inflight.add(p)
	}

	spawn()
	await done

	return total
}

async function waitForNotifications(client: Client, deadlineMs: number): Promise<void> {
	using cleanup = new DisposableStack()

	const { promise: stopped, resolve: stop } = Promise.withResolvers<void>()

	const timer = setTimeout(function onDeadline() {
		logger.debug("listener deadline reached")
		stop()
	}, deadlineMs)
	cleanup.defer(function clearDeadline() {
		clearTimeout(timer)
	})

	function handleNotification(): void {
		logger.debug("received outbox notification")
		drainAll().then(
			function onDrainComplete(count) {
				logger.debug("notification drain complete", { count })
			},
			function onDrainError(err: unknown) {
				logger.error("notification drain failed", { error: err })
			}
		)
	}

	function handleError(err: unknown): void {
		logger.error("listener connection error", { error: err })
		stop()
	}

	function handleEnd(): void {
		logger.info("listener connection ended")
		stop()
	}

	client.on("notification", handleNotification)
	client.on("error", handleError)
	client.on("end", handleEnd)
	cleanup.defer(function removeListeners() {
		client.removeListener("notification", handleNotification)
		client.removeListener("error", handleError)
		client.removeListener("end", handleEnd)
	})

	await stopped
}

async function listenAndDrain(deadlineMs: number): Promise<void> {
	const deadline = Date.now() + deadlineMs
	const sessionTimeoutMs = deadlineMs
	let attempt = 0

	while (Date.now() < deadline) {
		await using stack = new AsyncDisposableStack()

		const client = new Client({
			connectionString: env.DATABASE_DIRECT_URL,
			connectionTimeoutMillis: 10_000
		})

		stack.defer(async function cleanupClient() {
			const endResult = await errors.try(client.end())
			if (endResult.error) {
				logger.warn("listener client close failed", { error: endResult.error })
			}
		})

		const connectResult = await errors.try(client.connect())
		if (connectResult.error) {
			attempt++
			const backoff = Math.min(1_000 * 2 ** attempt, MAX_BACKOFF_MS)
			logger.warn("listener connect retry", { attempt, backoff, error: connectResult.error })
			await Bun.sleep(backoff)
			continue
		}

		const setupResult = await errors.try(
			client.query(`SET idle_session_timeout = ${sessionTimeoutMs}`)
		)
		if (setupResult.error) {
			logger.warn("listener idle timeout set failed", { error: setupResult.error })
		}

		const listenResult = await errors.try(client.query("LISTEN events"))
		if (listenResult.error) {
			logger.error("listener setup failed", { error: listenResult.error })
			continue
		}

		attempt = 0
		const remaining = deadline - Date.now()
		if (remaining <= 0) {
			break
		}

		logger.info("listener started", { remainingMs: remaining })
		await waitForNotifications(client, remaining)
		logger.info("listener stopped")
	}
}

export { drain, drainAll, listenAndDrain }
