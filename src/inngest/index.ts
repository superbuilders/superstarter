import { realtimeMiddleware } from "@inngest/realtime/middleware"
import * as logger from "@superbuilders/slog"
import { EventSchemas, Inngest, type Logger } from "inngest"
import { z } from "zod"
import { env } from "@/env"
import { CtaRequestEventSchema, CtaResponseEventSchema } from "@/lib/agent/cta"

const schema = {
	"superstarter/hello": z.object({
		message: z.string().min(1)
	}),
	"paul/agents/explore": z.object({
		prompt: z.string().min(1),
		sandboxId: z.string().min(1),
		github: z
			.object({
				repoUrl: z.string().url(),
				branch: z.string().min(1)
			})
			.optional()
	}),
	"paul/agents/code": z.object({
		prompt: z.string().min(1),
		sandboxId: z.string().min(1),
		github: z
			.object({
				repoUrl: z.string().url(),
				branch: z.string().min(1)
			})
			.optional()
	}),
	"paul/sandbox/create": z.object({
		runtime: z.enum(["node24", "node22", "python3.13"]).default("node24"),
		github: z
			.object({
				repoUrl: z.string().url(),
				branch: z.string().min(1),
				token: z.string().min(1).optional()
			})
			.optional()
	}),
	"paul/sandbox/stop": z.object({
		sandboxId: z.string().min(1)
	}),
	"paul/agents/orchestrate": z.object({
		prompt: z.string().min(1),
		sandboxId: z.string().min(1),
		github: z
			.object({
				repoUrl: z.string().url(),
				branch: z.string().min(1)
			})
			.optional()
	}),
	"paul/cta/request": CtaRequestEventSchema,
	"paul/cta/response": CtaResponseEventSchema,
	"paul/debug/echo": z.object({
		source: z.string().min(1),
		payload: z.record(z.string(), z.unknown())
	}),
	"paul/pipeline/feature-run": z.object({
		prompt: z.string().min(1),
		githubRepoUrl: z.string().url(),
		githubBranch: z.string().min(1),
		runtime: z.enum(["node24", "node22", "python3.13"]).default("node24")
	}),
	"paul/pipeline/analysis": z.object({
		runId: z.string().uuid(),
		sandboxId: z.string().min(1),
		prompt: z.string().min(1),
		githubRepoUrl: z.string().url(),
		githubBranch: z.string().min(1),
		memories: z.array(
			z.object({
				phase: z.string().min(1),
				kind: z.string().min(1),
				content: z.string().min(1)
			})
		)
	}),
	"paul/pipeline/approaches": z.object({
		runId: z.string().uuid(),
		sandboxId: z.string().min(1),
		prompt: z.string().min(1),
		githubRepoUrl: z.string().url(),
		githubBranch: z.string().min(1),
		memories: z.array(
			z.object({
				phase: z.string().min(1),
				kind: z.string().min(1),
				content: z.string().min(1)
			})
		),
		analysisOutput: z.unknown()
	}),
	"paul/pipeline/judging": z.object({
		runId: z.string().uuid(),
		sandboxId: z.string().min(1),
		prompt: z.string().min(1),
		githubRepoUrl: z.string().url(),
		githubBranch: z.string().min(1),
		memories: z.array(
			z.object({
				phase: z.string().min(1),
				kind: z.string().min(1),
				content: z.string().min(1)
			})
		),
		selectedApproach: z.unknown(),
		analysisOutput: z.unknown()
	}),
	"paul/pipeline/implementation": z.object({
		runId: z.string().uuid(),
		sandboxId: z.string().min(1),
		prompt: z.string().min(1),
		githubRepoUrl: z.string().url(),
		githubBranch: z.string().min(1),
		memories: z.array(
			z.object({
				phase: z.string().min(1),
				kind: z.string().min(1),
				content: z.string().min(1)
			})
		),
		selectedApproach: z.unknown(),
		analysisOutput: z.unknown(),
		judgingOutput: z.unknown()
	})
}

const inngestLogger: Logger = {
	info: logger.info,
	warn: logger.warn,
	error: logger.error,
	debug: logger.debug
}

const inngest = new Inngest({
	id: "superstarter",
	checkpointing: true,
	schemas: new EventSchemas().fromSchema(schema),
	logger: inngestLogger,
	eventKey: env.INNGEST_EVENT_KEY,
	signingKey: env.INNGEST_SIGNING_KEY,
	middleware: [realtimeMiddleware()]
})

export { inngest }
