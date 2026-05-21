// scripts/dev/wipe-practice-data.ts
//
// Operational dev-only data wipe. Truncates the items + practice + catalog
// surfaces (items, attempts, practice_sessions, mastery_state,
// candidate_promotion_log, sub_types, strategies) and verifies the
// auth-side tables (users, sessions, accounts, verification_tokens) are
// preserved.
//
// Plan: docs/plans/phase5-data-wipe.md (commit 1).
//
// Scope expanded from plan §2(a) per pre-execution audit finding (see
// commit 1 message body): sub_types and strategies were assumed to be
// at the post-taxonomy-restructure 14/33 state; live dev DB carried
// 11/111 (old taxonomy + accumulated drift). Path (A) per redline:
// expand TRUNCATE list to include both. After this script runs, re-run
// `bun db:seed` to repopulate sub_types + strategies under the new
// taxonomy, then `bun db:seed:items` to repopulate items.
//
// Usage:
//   bun run scripts/dev/wipe-practice-data.ts            # default-on snapshot
//   bun run scripts/dev/wipe-practice-data.ts --no-snapshot
//
// The pre-wipe snapshot lands at scripts/_logs/wipe-snapshot-${ts}.sql
// (gitignored). Snapshot is data-only across the seven wipe-targeted
// tables; provides an undo path if something goes wrong post-wipe.

import "@/env"
import { mkdir } from "node:fs/promises"
import * as errors from "@superbuilders/errors"
import { count, sql } from "drizzle-orm"
import type { PgTable } from "drizzle-orm/pg-core"
import { accounts } from "@/db/schemas/auth/accounts"
import { authSessions } from "@/db/schemas/auth/sessions"
import { users } from "@/db/schemas/auth/users"
import { verificationTokens } from "@/db/schemas/auth/verification_tokens"
import { items } from "@/db/schemas/catalog/items"
import { strategies } from "@/db/schemas/catalog/strategies"
import { subTypes } from "@/db/schemas/catalog/sub-types"
import { candidatePromotionLog } from "@/db/schemas/ops/candidate-promotion-log"
import { attempts } from "@/db/schemas/practice/attempts"
import { masteryState } from "@/db/schemas/practice/mastery-state"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { createAdminDb, type AdminDb } from "@/db/admin"
import { env } from "@/env"
import { logger } from "@/logger"

interface NamedTable {
	name: string
	table: PgTable
}

const WIPE_TABLES: ReadonlyArray<NamedTable> = [
	{ name: "items", table: items },
	{ name: "attempts", table: attempts },
	{ name: "practice_sessions", table: practiceSessions },
	{ name: "mastery_state", table: masteryState },
	{ name: "candidate_promotion_log", table: candidatePromotionLog },
	{ name: "sub_types", table: subTypes },
	{ name: "strategies", table: strategies }
]

const PRESERVE_TABLES: ReadonlyArray<NamedTable> = [
	{ name: "users", table: users },
	{ name: "sessions", table: authSessions },
	{ name: "accounts", table: accounts },
	{ name: "verification_tokens", table: verificationTokens }
]

const ErrPostWipeNotZero = errors.new("post-wipe table count is not zero")
const ErrPreservedTableLost = errors.new("preserved table lost rows during wipe")
const ErrSnapshotFailed = errors.new("pg_dump snapshot failed")
const ErrCountQueryEmpty = errors.new("count query returned no rows")
const ErrLocalUrlMissing = errors.new("DATABASE_LOCAL_URL required for snapshot")

interface CliArgs {
	snapshot: boolean
}

function parseArgs(argv: ReadonlyArray<string>): CliArgs {
	let snapshot = true
	for (const arg of argv) {
		if (arg === "--no-snapshot") {
			snapshot = false
			continue
		}
		if (arg === "--help" || arg === "-h") {
			logger.info(
				"usage: bun run scripts/dev/wipe-practice-data.ts [--no-snapshot]"
			)
			process.exit(0)
		}
	}
	return { snapshot }
}

async function readCount(adminDb: AdminDb, named: NamedTable): Promise<number> {
	const result = await errors.try(
		adminDb.db.select({ n: count() }).from(named.table)
	)
	if (result.error) {
		logger.error(
			{ error: result.error, table: named.name },
			"wipe: count query failed"
		)
		throw errors.wrap(result.error, "count query")
	}
	const row = result.data[0]
	if (!row) {
		logger.error({ table: named.name }, "wipe: count query empty")
		throw errors.wrap(ErrCountQueryEmpty, named.name)
	}
	return row.n
}

async function readCountsFor(
	adminDb: AdminDb,
	tables: ReadonlyArray<NamedTable>
): Promise<Record<string, number>> {
	const counts: Record<string, number> = {}
	for (const named of tables) {
		counts[named.name] = await readCount(adminDb, named)
	}
	return counts
}

async function writeSnapshot(localUrl: string): Promise<string> {
	await mkdir("scripts/_logs", { recursive: true })
	const timestamp = new Date()
		.toISOString()
		.replace(/[:.]/g, "-")
		.replace(/Z$/, "")
	const snapshotPath = `scripts/_logs/wipe-snapshot-${timestamp}.sql`

	// pg_dump --data-only across the wipe-targeted tables. Multiple
	// `--table` flags scope the dump to exactly the seven tables we're
	// about to wipe; auth tables and any other non-wipe-scope rows are
	// excluded from the snapshot (they aren't being touched).
	const tableFlags: string[] = []
	for (const named of WIPE_TABLES) {
		tableFlags.push("--table", named.name)
	}

	const args = [
		"pg_dump",
		"--data-only",
		"--no-owner",
		"--no-privileges",
		...tableFlags,
		localUrl
	]
	const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" })

	const stdoutBytes = await new Response(proc.stdout).bytes()
	const exitCode = await proc.exited
	if (exitCode !== 0) {
		const stderr = await new Response(proc.stderr).text()
		logger.error({ exitCode, stderr, snapshotPath }, "wipe: pg_dump failed")
		throw errors.wrap(ErrSnapshotFailed, `exit ${exitCode}: ${stderr}`)
	}

	const writeResult = await errors.try(Bun.write(snapshotPath, stdoutBytes))
	if (writeResult.error) {
		logger.error(
			{ error: writeResult.error, snapshotPath },
			"wipe: snapshot write failed"
		)
		throw errors.wrap(writeResult.error, "snapshot write")
	}

	logger.info(
		{ snapshotPath, bytes: stdoutBytes.length },
		"wipe: snapshot written"
	)
	return snapshotPath
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2))
	logger.info(
		{ snapshot: args.snapshot, wipeTables: WIPE_TABLES.length },
		"wipe: starting"
	)

	await using adminDb = await createAdminDb()

	// Pre-wipe row counts.
	const preWipe = await readCountsFor(adminDb, WIPE_TABLES)
	const prePreserve = await readCountsFor(adminDb, PRESERVE_TABLES)
	logger.info({ counts: preWipe }, "wipe: pre-wipe counts (target tables)")
	logger.info(
		{ counts: prePreserve },
		"wipe: pre-wipe counts (preserved tables)"
	)

	// Pre-wipe snapshot. Only takes the snapshot when DATABASE_LOCAL_URL
	// is set — production wipes go through a different operational path
	// (this script is dev-only).
	if (args.snapshot) {
		const localUrl = env.DATABASE_LOCAL_URL
		if (!localUrl) {
			logger.error("wipe: --no-snapshot required when DATABASE_LOCAL_URL is unset")
			throw ErrLocalUrlMissing
		}
		await writeSnapshot(localUrl)
	} else {
		logger.warn("wipe: --no-snapshot specified; skipping pre-wipe snapshot")
	}

	// Single-statement TRUNCATE. CASCADE walks no further than the
	// explicit set: every CASCADE-reachable child is itself in
	// WIPE_TABLES. RESTART IDENTITY is a no-op (PKs are UUIDv7) but
	// harmless.
	const truncateIdentifiers = WIPE_TABLES.map(function toIdent(t) {
		return sql.identifier(t.name)
	})
	const truncateResult = await errors.try(
		adminDb.db.execute(
			sql`TRUNCATE TABLE ${sql.join(truncateIdentifiers, sql.raw(", "))} RESTART IDENTITY CASCADE`
		)
	)
	if (truncateResult.error) {
		logger.error({ error: truncateResult.error }, "wipe: TRUNCATE failed")
		throw errors.wrap(truncateResult.error, "TRUNCATE")
	}
	logger.info(
		{ tables: WIPE_TABLES.map(function toName(t) { return t.name }) },
		"wipe: TRUNCATE executed"
	)

	// Post-wipe assertions.
	const postWipe = await readCountsFor(adminDb, WIPE_TABLES)
	for (const named of WIPE_TABLES) {
		const n = postWipe[named.name]
		if (n !== 0) {
			logger.error({ table: named.name, count: n }, "wipe: post-wipe count not zero")
			throw errors.wrap(ErrPostWipeNotZero, `${named.name}=${n}`)
		}
	}
	logger.info(
		{ counts: postWipe },
		"wipe: post-wipe counts (target tables, all zero)"
	)

	const postPreserve = await readCountsFor(adminDb, PRESERVE_TABLES)
	for (const named of PRESERVE_TABLES) {
		const before = prePreserve[named.name]
		const after = postPreserve[named.name]
		if (before !== after) {
			logger.error(
				{ table: named.name, before, after },
				"wipe: preserved table count changed"
			)
			throw errors.wrap(
				ErrPreservedTableLost,
				`${named.name}: ${before} -> ${after}`
			)
		}
	}
	logger.info(
		{ counts: postPreserve },
		"wipe: post-wipe counts (preserved tables, unchanged)"
	)

	logger.info("wipe: complete")
}

const result = await errors.try(main())
if (result.error) {
	logger.error({ error: result.error }, "wipe: failed")
	process.exit(1)
}
