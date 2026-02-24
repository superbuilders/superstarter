import * as logger from "@superbuilders/slog"
import { inngest } from "@/inngest"

const prompt = process.argv[2]
const repoUrl = process.argv[3]
const branch = process.argv[4]

if (!prompt) {
	logger.error("missing prompt argument")
	logger.info("usage: bun scripts/trigger-feature-run.ts <prompt> <repoUrl> [branch]")
	process.exit(1)
}

if (!repoUrl) {
	logger.error("missing repoUrl argument")
	logger.info("usage: bun scripts/trigger-feature-run.ts <prompt> <repoUrl> [branch]")
	process.exit(1)
}

const targetBranch = branch ? branch : "main"

logger.info("triggering feature run", {
	prompt,
	repoUrl,
	branch: targetBranch
})

const result = await inngest.send({
	name: "paul/pipeline/feature-run",
	data: {
		prompt,
		githubRepoUrl: repoUrl,
		githubBranch: targetBranch,
		runtime: "node24"
	}
})

logger.info("event sent", { ids: result.ids })
