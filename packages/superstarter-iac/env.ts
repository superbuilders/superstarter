// biome-ignore-all lint/style/noProcessEnv: iac env wrapper needs direct process.env access

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import * as errors from "@superbuilders/errors"
import * as validate from "@superbuilders/validate"
import { logger } from "@/logger"

// .env.local is the ONLY supported way to supply IaC secrets. Setting them
// on the command line (e.g. `ALCHEMY_PASSWORD=foo bun run deploy`) is
// inherently insecure: visible in `ps`, in shell history, and in terminal
// scrollback. Refuse to run if .env.local is missing, and refuse to run if
// any required key is absent from the file (CLI-only definitions are
// rejected — the key MUST exist in the file).
//
// SKIP_ENV_VALIDATION bypasses both checks (used by typecheck/CI).
const REQUIRED_IN_ENV_LOCAL = ["ALCHEMY_PASSWORD", "VERCEL_TEAM_SLUG"] as const

if (!process.env.SKIP_ENV_VALIDATION) {
	const envLocalPath = join(process.cwd(), ".env.local")
	if (!existsSync(envLocalPath)) {
		logger.error({ path: envLocalPath }, ".env.local missing — refusing to run")
		throw errors.new(
			`.env.local required at ${envLocalPath}. Setup: cp .env.example .env.local and fill in values from your password manager. CLI env-var hardcoding is not supported (visible in ps, shell history, scrollback).`
		)
	}

	const definedInFile = new Set<string>()
	for (const line of readFileSync(envLocalPath, "utf8").split("\n")) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith("#")) continue
		const eqIdx = trimmed.indexOf("=")
		if (eqIdx > 0) definedInFile.add(trimmed.slice(0, eqIdx).trim())
	}

	for (const key of REQUIRED_IN_ENV_LOCAL) {
		if (!definedInFile.has(key)) {
			logger.error({ envLocalPath, key }, "required key not defined in .env.local")
			throw errors.new(
				`${key} must be defined in ${envLocalPath} (CLI override not allowed). Add it to .env.local and re-run.`
			)
		}
	}
}

// AJV runs with useDefaults:false, so defaults are applied here (not in the
// schema) before strict validation of the assembled candidate object.
const awsRegion = process.env.AWS_REGION === undefined ? "us-east-1" : process.env.AWS_REGION
const vercelProjectName =
	process.env.VERCEL_PROJECT_NAME === undefined ? "superstarter" : process.env.VERCEL_PROJECT_NAME

const candidate = {
	AWS_REGION: awsRegion,
	VERCEL_TEAM_SLUG: process.env.VERCEL_TEAM_SLUG,
	VERCEL_PROJECT_NAME: vercelProjectName,
	ALCHEMY_PASSWORD: process.env.ALCHEMY_PASSWORD
}

const EnvSchema = validate.compile({
	type: "object",
	additionalProperties: false,
	required: ["AWS_REGION", "VERCEL_TEAM_SLUG", "VERCEL_PROJECT_NAME", "ALCHEMY_PASSWORD"],
	properties: {
		AWS_REGION: { type: "string", const: "us-east-1" },
		VERCEL_TEAM_SLUG: { type: "string", minLength: 1 },
		VERCEL_PROJECT_NAME: { type: "string", minLength: 1 },
		ALCHEMY_PASSWORD: { type: "string", minLength: 32 }
	}
} as const)

const parseResult = EnvSchema.parse(candidate)
if (!parseResult.success) {
	logger.error({ error: parseResult.error }, "iac env validation failed")
	throw errors.wrap(parseResult.error, "iac env validation")
}

const iacEnv = parseResult.data

export { iacEnv }
