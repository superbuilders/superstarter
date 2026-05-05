"use client"

// <WrongItemsBrowser> — display-only wrong-items list for the
// post-session review surface.
//
// Plan: docs/plans/phase5-post-session-review.md §8 + §15.2.
//
// Scope:
//   - Grouped by sub-type (sub-type heading + chronological items
//     within group).
//   - Sub-type group order: verbal-first then alphabetical by
//     displayName, matching <AccuracySummary> + <LatencySummary>.
//   - Within group: ordered by attempt.id ASC (UUIDv7 = chronological).
//   - Each item renders: prompt body, options (with display letters
//     A/B/C/D/E computed at render time per SPEC §3.3.2), correct-/
//     selected-marker, prose explanation.
//   - Empty state ("No wrong items this session.") when items.length
//     === 0.
//
// The §15.2 amendment in the plan is load-bearing: WrongItem here
// carries NO structuredExplanation field. Sub-phase 4 will extend
// WrongItem (and the page query) atomically with the click-to-
// highlight UI. Today the renderer reads `items.explanation` (the
// prose column) only.
//
// Body + options shapes are validated at the boundary using the
// existing `itemBody` Zod schema from @/server/items/body-schema and
// a local options array schema (per rules/zod-usage.md). On parse
// failure the renderer logs and renders a fallback line for that
// item — one bad row never crashes the whole list.
//
// Display letters A/B/C/D/E are computed via `String.fromCharCode(
// 0x41 + index)` per SPEC §3.3.2. They are NOT stored; the stable
// handle is the opaque option id. Decoupling display position from
// id is what unlocks future per-session option shuffling and
// click-to-highlight (sub-phase 4) without breaking explanation
// cross-references.
//
// Visual treatment per Alpha Style:
//   - Sub-type heading: small uppercase tracked label.
//   - Item card: left-rule pl-4 (no nested-card boxes, no shadow).
//   - Options as <ol> with letter+text+marker.
//   - Correct option emphasized via subtle bg-foreground/5 + font-
//     medium + ✓ marker. NO destructive token on text — accent earns
//     placement; the ✓ symbol carries the positive signal.
//   - Selected (incorrect) option: muted text + line-through + ✗
//     marker. The line-through reflects "this is the answer you
//     picked, and it was wrong" without dual-encoding via color.
//   - Other options: neutral foreground.
//
// Per the systemic note from commit 4's audit, this commit avoids
// the text-destructive-on-text pattern entirely. If commit 6's full-
// surface audit surfaces a third occurrence elsewhere, that's the
// signal for a structural token addition.

import type * as React from "react"
import { z } from "zod"
import type { WrongItem } from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { TextBody } from "@/components/item/body-renderers/text"
import { type SubTypeId, subTypes } from "@/config/sub-types"
import { logger } from "@/logger"
import { itemBody, type ItemBody } from "@/server/items/body-schema"

interface WrongItemsBrowserProps {
	items: ReadonlyArray<WrongItem>
}

interface DisplayGroup {
	subTypeId: SubTypeId
	displayName: string
	section: "verbal" | "numerical"
	items: WrongItem[]
}

const SUB_TYPE_BY_ID = new Map(
	subTypes.map(function entry(t) {
		return [t.id, t]
	})
)

const optionShapeSchema = z.object({
	id: z.string(),
	text: z.string()
})

const optionsArraySchema = z.array(optionShapeSchema)

type OptionShape = z.infer<typeof optionShapeSchema>

function compareGroups(a: DisplayGroup, b: DisplayGroup): number {
	if (a.section !== b.section) {
		return a.section === "verbal" ? -1 : 1
	}
	return a.displayName.localeCompare(b.displayName)
}

function compareAttemptIdAsc(a: WrongItem, b: WrongItem): number {
	// UUIDv7 string comparison = chronological order (RFC 9562 byte
	// order matches lex order on hex form). attempt.id is the
	// canonical timestamp.
	if (a.attemptId < b.attemptId) return -1
	if (a.attemptId > b.attemptId) return 1
	return 0
}

function buildDisplayGroups(items: ReadonlyArray<WrongItem>): DisplayGroup[] {
	const byKey = new Map<SubTypeId, WrongItem[]>()
	for (const item of items) {
		const list = byKey.get(item.subTypeId)
		if (list === undefined) {
			byKey.set(item.subTypeId, [item])
		} else {
			list.push(item)
		}
	}
	const groups: DisplayGroup[] = []
	for (const [subTypeId, list] of byKey) {
		const meta = SUB_TYPE_BY_ID.get(subTypeId)
		if (meta === undefined) continue
		const sortedItems = [...list].sort(compareAttemptIdAsc)
		groups.push({
			subTypeId,
			displayName: meta.displayName,
			section: meta.section,
			items: sortedItems
		})
	}
	groups.sort(compareGroups)
	return groups
}

function letterFor(index: number): string {
	return String.fromCharCode(0x41 + index)
}

interface OptionLineProps {
	letter: string
	text: string
	isCorrect: boolean
	isSelected: boolean
}

function OptionLine(props: OptionLineProps) {
	let containerClass = "flex items-baseline gap-3 rounded-md px-2 py-1.5 text-sm"
	let textClass = "flex-1 text-foreground"
	let marker: React.ReactNode = null

	if (props.isCorrect) {
		containerClass = `${containerClass} bg-foreground/5 font-medium`
		marker = (
			<span aria-label="correct answer" className="text-foreground/80" role="img">
				✓
			</span>
		)
	} else if (props.isSelected) {
		// Selected-incorrect: full-contrast text + strikethrough. The
		// `line-through` is the de-emphasis signal that earns placement
		// (semantically-conventional struck-out treatment). Earlier
		// drafts dimmed the text to /55 in addition to line-through —
		// commit 5's audit flagged this as dual-encoding (same
		// anti-pattern as commit 4's destructive-on-text issue, just
		// with opacity) and as sub-WCAG-AA contrast on meaningful body
		// text. Restored to /80 (matches non-selected) so contrast
		// passes AA; line-through alone carries the "wrong answer"
		// signal. Marker bumped from /40 to /55 to clear WCAG 1.4.11
		// non-text 3:1 floor (~2.5:1 → ~3.7:1).
		textClass = "flex-1 text-foreground/80 line-through"
		marker = (
			<span
				aria-label="your answer (incorrect)"
				className="text-foreground/55"
				role="img"
			>
				✗
			</span>
		)
	} else {
		textClass = "flex-1 text-foreground/80"
	}

	return (
		<li className={containerClass}>
			<span aria-hidden="true" className="w-5 shrink-0 font-mono text-foreground/60">
				{props.letter}.
			</span>
			<span className={textClass}>{props.text}</span>
			{marker}
		</li>
	)
}

function BodyDispatch(props: { body: ItemBody }) {
	switch (props.body.kind) {
		case "text":
			return <TextBody text={props.body.text} />
		default: {
			// Exhaustiveness — when future variants land, this fails
			// the compile until we add a case here.
			const _exhaustive: never = props.body.kind
			return <span>{_exhaustive}</span>
		}
	}
}

interface ParsedItem {
	body: ItemBody
	options: ReadonlyArray<OptionShape>
}

// Defensive: ingest enforces these shapes. If parsing fails at the
// renderer, data drift or schema change has occurred — log + return
// null so the caller renders a degraded line. `safeParse` already
// returns a result type, so no errors.try wrapping needed.
function parseItem(item: WrongItem): ParsedItem | null {
	const bodyResult = itemBody.safeParse(item.body)
	if (!bodyResult.success) {
		logger.error(
			{
				attemptId: item.attemptId,
				itemId: item.itemId,
				error: bodyResult.error
			},
			"WrongItemCard: body parse failed"
		)
		return null
	}
	const optionsResult = optionsArraySchema.safeParse(item.optionsJson)
	if (!optionsResult.success) {
		logger.error(
			{
				attemptId: item.attemptId,
				itemId: item.itemId,
				error: optionsResult.error
			},
			"WrongItemCard: options parse failed"
		)
		return null
	}
	return { body: bodyResult.data, options: optionsResult.data }
}

interface WrongItemCardProps {
	item: WrongItem
}

function WrongItemCard(props: WrongItemCardProps) {
	const parsed = parseItem(props.item)
	if (parsed === null) {
		return (
			<li
				className="border-foreground/15 border-l pl-4 text-foreground/60 text-sm italic"
				data-testid={`post-session-wrong-item-degraded-${props.item.attemptId}`}
			>
				This item could not be displayed.
			</li>
		)
	}

	const { body, options } = parsed

	return (
		<li
			className="space-y-3 border-foreground/15 border-l pl-4"
			data-testid={`post-session-wrong-item-${props.item.attemptId}`}
		>
			<BodyDispatch body={body} />
			<ol className="space-y-1">
				{options.map(function renderOption(option, idx) {
					const letter = letterFor(idx)
					const isCorrect = option.id === props.item.correctAnswer
					const isSelected =
						props.item.selectedAnswer !== undefined &&
						option.id === props.item.selectedAnswer
					return (
						<OptionLine
							key={option.id}
							letter={letter}
							text={option.text}
							isCorrect={isCorrect}
							isSelected={isSelected}
						/>
					)
				})}
			</ol>
			{props.item.explanation === undefined ? null : (
				<p className="text-foreground/70 text-sm leading-relaxed">
					{props.item.explanation}
				</p>
			)}
		</li>
	)
}

function WrongItemsBrowser(props: WrongItemsBrowserProps) {
	const groups = buildDisplayGroups(props.items)
	return (
		<section
			aria-labelledby="post-session-wrong-items-heading"
			className="space-y-4"
			data-testid="post-session-wrong-items-browser-section"
		>
			<h2
				className="font-medium text-foreground text-sm tracking-tight"
				id="post-session-wrong-items-heading"
			>
				Items you got wrong
			</h2>
			{groups.length === 0 ? (
				<p
					className="text-foreground/60 text-sm"
					data-testid="post-session-wrong-items-empty"
				>
					No wrong items this session.
				</p>
			) : (
				<div className="space-y-6">
					{groups.map(function renderGroup(group) {
						return (
							<div
								key={group.subTypeId}
								className="space-y-3"
								data-testid={`post-session-wrong-items-group-${group.subTypeId}`}
							>
								<h3 className="font-medium text-foreground/80 text-xs uppercase tracking-wide">
									{group.displayName}
								</h3>
								<ol className="space-y-5">
									{group.items.map(function renderItem(item) {
										return <WrongItemCard key={item.attemptId} item={item} />
									})}
								</ol>
							</div>
						)
					})}
				</div>
			)}
		</section>
	)
}

export type { WrongItemsBrowserProps }
export {
	BodyDispatch,
	buildDisplayGroups,
	compareAttemptIdAsc,
	compareGroups,
	letterFor,
	OptionLine,
	WrongItemCard,
	WrongItemsBrowser
}
