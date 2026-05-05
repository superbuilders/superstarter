// /drill/[subTypeId] — drill configure page. Plan §6.4 +
// docs/plans/phase3-drill-mode.md §6.
//
// Validates the route param against subTypeIds; on miss → notFound().
// Pre-checks the sub-type's live-item count; if zero, renders the
// <EmptyBankPane> instead of the length-picker (per
// docs/plans/phase3-drill-mode.md §6 / §11.1: surface the empty case
// as an informational pane rather than failing through to
// startSession's ErrFirstItemMissing).
//
// Otherwise renders a small length-picker form (5 / 10 / 20, default
// 10). The form action navigates to `/drill/<subTypeId>/run?length=N`
// where the run page kicks off `startSession`.
//
// No timer-mode selector — `standard` is the only timer mode in v1.
// `speed_ramp` and `brutal` modes were cut from v1 2026-05-04 (PRD §4.4
// + SPEC §3.4 markers); the timer_mode enum was truncated to
// `['standard']` in v1-code-cleanup commit 3 (`938f771`).

import * as errors from "@superbuilders/errors"
import { and, count, eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import * as React from "react"
import { type SubTypeId, type SubTypeConfig, subTypeIds, subTypes } from "@/config/sub-types"
import { Button } from "@/components/ui/button"
import { EmptyBankPane } from "@/components/drill/empty-bank-pane"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { logger } from "@/logger"

const ErrLiveCountReadFailed = errors.new("drill configure: live-item count read failed")

const subTypeIdSet: ReadonlySet<string> = new Set<string>(subTypeIds)
function asSubTypeId(s: string): SubTypeId | undefined {
	if (!subTypeIdSet.has(s)) return undefined
	return subTypeIds.find(function eq(known) {
		return known === s
	})
}

interface PageProps {
	params: Promise<{ subTypeId: string }>
}

interface DrillConfigureInit {
	config: SubTypeConfig
	liveCount: number
}

async function resolveInit(
	paramsPromise: Promise<{ subTypeId: string }>
): Promise<DrillConfigureInit> {
	const params = await paramsPromise
	const id = asSubTypeId(params.subTypeId)
	if (id === undefined) notFound()
	const config = subTypes.find(function byId(s) {
		return s.id === id
	})
	if (!config) notFound()

	// Pre-check live-item count for the sub-type. Uses the existing
	// `items_sub_type_status_idx` index. EXPLAIN ANALYZE during commit
	// development confirmed an Index Only Scan; cost ~0.04ms.
	const result = await errors.try(
		db
			.select({ n: count() })
			.from(items)
			.where(and(eq(items.subTypeId, config.id), eq(items.status, "live")))
	)
	if (result.error) {
		logger.error(
			{ error: result.error, subTypeId: config.id },
			"drill configure: live-item count read failed"
		)
		throw errors.wrap(result.error, "live-item count")
	}
	const row = result.data[0]
	if (!row) {
		logger.error({ subTypeId: config.id }, "drill configure: live-item count returned no rows (impossible)")
		throw ErrLiveCountReadFailed
	}
	return { config, liveCount: row.n }
}

function Page(props: PageProps) {
	const initPromise = resolveInit(props.params)
	return (
		<React.Suspense fallback={<DrillConfigureSkeleton />}>
			<DrillConfigure initPromise={initPromise} />
		</React.Suspense>
	)
}

function DrillConfigureSkeleton() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-6">
			<p className="text-muted-foreground text-sm">Loading…</p>
		</main>
	)
}

async function DrillConfigure(props: {
	initPromise: ReturnType<typeof resolveInit>
}) {
	const init = await props.initPromise
	if (init.liveCount === 0) {
		return <EmptyBankPane displayName={init.config.displayName} />
	}
	const runPath = `/drill/${init.config.id}/run`
	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
			<header className="space-y-2">
				<h1 className="font-semibold text-2xl tracking-tight">{init.config.displayName}</h1>
				<p className="text-muted-foreground text-sm">
					Standard timing. Pick a length and start.
				</p>
			</header>
			<form action={runPath} method="get" className="space-y-6">
				<fieldset className="space-y-2">
					<legend className="font-medium text-sm">Length</legend>
					<div className="flex gap-3">
						<LengthRadio value="5" />
						<LengthRadio value="10" defaultChecked />
						<LengthRadio value="20" />
					</div>
				</fieldset>
				<div className="flex justify-end">
					<Button type="submit" size="lg">
						Start drill
					</Button>
				</div>
			</form>
		</main>
	)
}

function LengthRadio(props: { value: string; defaultChecked?: boolean }) {
	const id = `length-${props.value}`
	return (
		<label
			htmlFor={id}
			className="flex flex-1 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-3 text-sm shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
		>
			<input
				id={id}
				name="length"
				type="radio"
				value={props.value}
				defaultChecked={props.defaultChecked}
				className="sr-only"
			/>
			<span>{props.value} items</span>
		</label>
	)
}

export default Page
