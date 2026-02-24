import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { env } from "@/env"

type PRConfig = {
	branch: string
	githubRepoUrl: string
	prompt: string
	analysisOutput: unknown
	approachOutput: unknown
	implOutput: unknown
}

type PRResult = {
	prUrl: string
	prNumber: number
	title: string
	body: string
}

const GitHubPRResponseSchema = z.object({
	html_url: z.string(),
	number: z.number()
})

/**
 * Extracts owner and repo from a GitHub URL.
 *
 * Accepts:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   github.com/owner/repo
 */
function parseRepoUrl(githubRepoUrl: string): { owner: string; repo: string } {
	const cleaned = githubRepoUrl.replace(/\.git$/, "").replace(/\/$/, "")

	const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)$/)
	if (!match) {
		logger.error("invalid github repo url", { githubRepoUrl })
		throw errors.new("invalid github repo url")
	}

	const owner = match[1]
	const repo = match[2]

	if (!owner || !repo) {
		logger.error("empty owner or repo parsed from url", { githubRepoUrl })
		throw errors.new("empty owner or repo in github url")
	}

	return { owner, repo }
}

/**
 * Generates a PR title from the user prompt.
 * Prefixes with `feat:` and truncates to ~72 chars total.
 */
function generateTitle(prompt: string): string {
	const PREFIX = "feat: "
	const MAX_LENGTH = 72
	const available = MAX_LENGTH - PREFIX.length

	const firstLine = prompt.split("\n")[0]
	if (!firstLine) {
		return `${PREFIX}implement changes`
	}

	const trimmed = firstLine.trim().toLowerCase()

	if (trimmed.length <= available) {
		return `${PREFIX}${trimmed}`
	}

	const truncated = trimmed.slice(0, available - 3).replace(/\s+\S*$/, "")
	return `${PREFIX}${truncated}...`
}

/**
 * Stringifies an unknown phase output for inclusion in the PR body.
 * Returns a fenced markdown block.
 */
function formatPhaseOutput(label: string, output: unknown): string {
	if (output === undefined || output === null) {
		return `### ${label}\n\n_No output captured._\n`
	}

	const isString = typeof output === "string"
	const content = isString ? output : JSON.stringify(output, null, 2)

	const MAX_BODY_SECTION = 2000
	const truncated =
		content.length > MAX_BODY_SECTION
			? `${content.slice(0, MAX_BODY_SECTION)}\n\n... (truncated)`
			: content

	const fence = isString ? "" : "json"

	return `### ${label}\n\n\`\`\`${fence}\n${truncated}\n\`\`\`\n`
}

/**
 * Generates the full PR body markdown from phase outputs.
 */
function generateBody(
	prompt: string,
	analysisOutput: unknown,
	approachOutput: unknown,
	implOutput: unknown
): string {
	const sections = [
		`## Prompt\n\n${prompt}\n`,
		formatPhaseOutput("Analysis", analysisOutput),
		formatPhaseOutput("Approach", approachOutput),
		formatPhaseOutput("Implementation", implOutput),
		"---\n\n_This PR was created automatically by Paul._"
	]

	return sections.join("\n")
}

/**
 * Creates a pull request via the GitHub REST API.
 *
 * **Assumption:** The branch already exists on the remote. The implementation
 * phase sandbox must have pushed the branch before this function is called.
 * If the branch does not exist on the remote, the GitHub API will return an
 * error (422 Unprocessable Entity).
 *
 * Uses `env.GITHUB_PAT_TOKEN` which must have `repo` scope (push + PR creation).
 */
async function createPR(config: PRConfig): Promise<PRResult> {
	const token = env.GITHUB_PAT_TOKEN
	if (!token) {
		logger.error("missing github token", { envVar: "GITHUB_PAT_TOKEN" })
		throw errors.new("GITHUB_PAT_TOKEN not set")
	}

	const { owner, repo } = parseRepoUrl(config.githubRepoUrl)
	const title = generateTitle(config.prompt)
	const body = generateBody(
		config.prompt,
		config.analysisOutput,
		config.approachOutput,
		config.implOutput
	)

	logger.info("creating pull request", {
		owner,
		repo,
		branch: config.branch,
		titleLength: title.length,
		bodyLength: body.length
	})

	const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls`

	const fetchResult = await errors.try(
		fetch(apiUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				title,
				body,
				head: config.branch,
				base: "main"
			})
		})
	)
	if (fetchResult.error) {
		logger.error("github api request failed", { error: fetchResult.error })
		throw errors.wrap(fetchResult.error, "github pr creation fetch")
	}

	const response = fetchResult.data

	if (!response.ok) {
		const textResult = await errors.try(response.text())
		if (textResult.error) {
			logger.error("failed reading github error response", {
				error: textResult.error,
				status: response.status
			})
			throw errors.wrap(textResult.error, "github pr error response")
		}

		logger.error("github api returned error", {
			status: response.status,
			body: textResult.data
		})
		throw errors.new(`github api ${response.status}: ${textResult.data}`)
	}

	const jsonResult = await errors.try(response.json())
	if (jsonResult.error) {
		logger.error("failed parsing github response json", { error: jsonResult.error })
		throw errors.wrap(jsonResult.error, "github pr response json")
	}

	const parsed = GitHubPRResponseSchema.safeParse(jsonResult.data)
	if (!parsed.success) {
		logger.error("invalid github pr response shape", { error: parsed.error })
		throw errors.wrap(parsed.error, "github pr response validation")
	}

	const data = parsed.data

	const result: PRResult = {
		prUrl: data.html_url,
		prNumber: data.number,
		title,
		body
	}

	logger.info("pull request created", {
		prUrl: result.prUrl,
		prNumber: result.prNumber
	})

	return result
}

export { createPR, generateBody, generateTitle, parseRepoUrl }

export type { PRConfig, PRResult }
