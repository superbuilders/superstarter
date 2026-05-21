"use server"

import * as errors from "@superbuilders/errors"
import { revalidatePath } from "next/cache"
import { logger } from "@/logger"
import { requireAdminEmail } from "@/server/auth/admin-gate"
import { ingestRealItem, type IngestRealItemInput } from "@/server/items/ingest"
import { classifyItem, type TaggerResult } from "@/server/items/tagger"

async function ingestItemAction(input: IngestRealItemInput): Promise<{ itemId: string }> {
	const ctx = await requireAdminEmail()
	logger.info(
		{ adminUserId: ctx.userId, subTypeId: input.subTypeId, difficulty: input.difficulty },
		"ingestItemAction: invoked"
	)

	const result = await errors.try(ingestRealItem(input))
	if (result.error) {
		logger.error({ error: result.error }, "ingestItemAction: ingestRealItem failed")
		throw errors.wrap(result.error, "ingestItemAction")
	}

	revalidatePath("/admin/ingest")
	revalidatePath("/admin/generate")

	return result.data
}

async function suggestTagsAction(input: {
	prompt: string
	options: string[]
}): Promise<TaggerResult> {
	await requireAdminEmail()
	const result = await errors.try(classifyItem(input.prompt, input.options))
	if (result.error) {
		logger.error({ error: result.error }, "suggestTagsAction: classifyItem failed")
		throw errors.wrap(result.error, "suggestTagsAction")
	}
	return result.data
}

export { ingestItemAction, suggestTagsAction }
