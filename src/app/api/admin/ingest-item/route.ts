import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { subTypeIds } from "@/config/sub-types"
import { env } from "@/env"
import { logger } from "@/logger"
import { itemBody } from "@/server/items/body-schema"
import { ingestRealItem } from "@/server/items/ingest"

// TODO: introduce a dedicated ADMIN_API_TOKEN env var if scripts beyond the
// initial seed start using this route. Reusing CRON_SECRET conflates two
// distinct trust contexts (cron jobs vs admin scripts).
const requestSchema = z.object({
	subTypeId: z.enum(subTypeIds),
	difficulty: z.enum(["easy", "medium", "hard", "brutal"]),
	body: itemBody,
	options: z
		.array(
			z.object({
				id: z.string().regex(/^[0-9a-z]{8}$/),
				text: z.string().min(1)
			})
		)
		.min(2)
		.max(5),
	correctAnswer: z.string().regex(/^[0-9a-z]{8}$/),
	explanation: z.string().min(1).optional(),
	strategyId: z.string().uuid().optional(),
	sourceFolder: z.string().min(1).max(128).optional(),
	sourceFilename: z.string().min(1).max(256).optional(),
	metadata: z
		.object({
			originalExplanation: z.string().min(1).optional(),
			importSource: z.string().min(1).max(64).optional(),
			structuredExplanation: z
				.object({
					parts: z
						.array(
							z.object({
								kind: z.enum(["recognition", "elimination", "tie-breaker"]),
								text: z.string().min(1),
								referencedOptions: z.array(z.string())
							})
						)
						.min(2)
						.max(3)
				})
				.refine(
					(d) => {
						if (d.parts[0]?.kind !== "recognition") return false
						if (d.parts[1]?.kind !== "elimination") return false
						if (d.parts.length < 3) return true
						return d.parts[2]?.kind === "tie-breaker"
					},
					{
						message:
							"parts must be in order: recognition, elimination, optional tie-breaker"
					}
				)
				.optional()
		})
		.optional()
})

async function POST(req: Request): Promise<Response> {
	const auth = req.headers.get("authorization")
	const expected = `Bearer ${env.CRON_SECRET}`
	if (auth !== expected) {
		logger.warn({ hasHeader: Boolean(auth) }, "ingest-item route: unauthorized")
		return Response.json({ error: "unauthorized" }, { status: 401 })
	}

	const jsonResult = await errors.try(req.json())
	if (jsonResult.error) {
		logger.warn({ error: jsonResult.error }, "ingest-item route: invalid json body")
		return Response.json({ error: "invalid json" }, { status: 400 })
	}

	const parsed = requestSchema.safeParse(jsonResult.data)
	if (!parsed.success) {
		logger.warn({ issues: parsed.error.issues }, "ingest-item route: schema validation failed")
		return Response.json(
			{ error: "schema validation failed", issues: parsed.error.issues },
			{ status: 400 }
		)
	}

	logger.info(
		{ subTypeId: parsed.data.subTypeId, difficulty: parsed.data.difficulty },
		"ingest-item route: dispatching"
	)

	const ingestResult = await errors.try(ingestRealItem(parsed.data))
	if (ingestResult.error) {
		logger.error({ error: ingestResult.error }, "ingest-item route: ingestRealItem failed")
		return Response.json({ error: "internal error" }, { status: 500 })
	}

	return Response.json({ itemId: ingestResult.data.itemId }, { status: 201 })
}

export { POST }
