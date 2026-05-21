// Mistakes-redrill picker. Selects up to N random distinct items where
// the user has at least one wrong attempt and no correct attempts.
// Returns full ItemForRender shape so the /mistakes page can hydrate
// the FocusShell without a follow-up read per item.

import * as errors from "@superbuilders/errors"
import { sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { items } from "@/db/schemas/catalog/items"
import { attempts } from "@/db/schemas/practice/attempts"
import { practiceSessions } from "@/db/schemas/practice/practice-sessions"
import { logger } from "@/logger"
import { itemBody } from "@/server/items/body-schema"
import type { ItemForRender } from "@/server/items/selection"

const ErrInvalidItemBody = errors.new("invalid item body for mistake item")
const ErrInvalidOptions = errors.new("invalid options shape for mistake item")

const optionsJsonSchema = z
	.array(
		z.object({
			id: z.string().min(1),
			text: z.string().min(1)
		})
	)
	.min(2)
	.max(5)

interface PickedMistakeItem {
	item: ItemForRender
	subTypeId: string
}

async function pickMistakeItems(userId: string, limit: number): Promise<PickedMistakeItem[]> {
	const result = await errors.try(
		db
			.select({
				id: items.id,
				body: items.body,
				optionsJson: items.optionsJson,
				difficulty: items.difficulty,
				subTypeId: items.subTypeId
			})
			.from(items)
			.where(sql`
				EXISTS (
					SELECT 1
					FROM ${attempts} a
					INNER JOIN ${practiceSessions} ps ON ps.id = a.session_id
					WHERE ps.user_id = ${userId}
						AND a.item_id = ${items.id}
						AND a.correct = false
				)
				AND NOT EXISTS (
					SELECT 1
					FROM ${attempts} a2
					INNER JOIN ${practiceSessions} ps2 ON ps2.id = a2.session_id
					WHERE ps2.user_id = ${userId}
						AND a2.item_id = ${items.id}
						AND a2.correct = true
				)
			`)
			.orderBy(sql`random()`)
			.limit(limit)
	)
	if (result.error) {
		logger.error({ error: result.error, userId, limit }, "pickMistakeItems: query failed")
		throw errors.wrap(result.error, "pickMistakeItems")
	}

	const out: PickedMistakeItem[] = []
	for (const row of result.data) {
		const bodyParse = itemBody.safeParse(row.body)
		if (!bodyParse.success) {
			logger.error(
				{ itemId: row.id, issues: bodyParse.error.issues },
				"pickMistakeItems: item body schema invalid"
			)
			throw errors.wrap(ErrInvalidItemBody, `item id '${row.id}'`)
		}
		const optionsParse = optionsJsonSchema.safeParse(row.optionsJson)
		if (!optionsParse.success) {
			logger.error(
				{ itemId: row.id, issues: optionsParse.error.issues },
				"pickMistakeItems: options_json schema invalid"
			)
			throw errors.wrap(ErrInvalidOptions, `item id '${row.id}'`)
		}
		out.push({
			item: {
				id: row.id,
				body: bodyParse.data,
				options: optionsParse.data,
				selection: {
					servedAtTier: row.difficulty,
					fallbackLevel: "fresh"
				}
			},
			subTypeId: row.subTypeId
		})
	}
	logger.debug({ userId, limit, picked: out.length }, "pickMistakeItems: returned")
	return out
}

export type { PickedMistakeItem }
export { pickMistakeItems }
