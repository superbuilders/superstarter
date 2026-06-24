// biome-ignore-all lint/style/noProcessEnv: env wrapper needs to be able to access process.env
import * as validate from "@superbuilders/validate"
import { createEnv } from "@t3-oss/env-nextjs"
import { logger } from "@/logger"

const isServerRuntime = typeof window === "undefined"

if (!process.env.NEXT_RUNTIME && isServerRuntime) {
	const { loadEnvConfig } = require("@next/env")
	const projectDir = process.cwd()
	loadEnvConfig(projectDir)
}

/** DO NOT FUCKING TOUCH THIS LINE OF CODE WE SHOULD ALWAYS LOG DEBUG.
 * The old `!process.env.NEXT_RUNTIME` guard was broken: Next.js sets
 * NEXT_RUNTIME="nodejs" inside API route handlers on Vercel, which
 * made this block never fire in production, silently dropping every
 * debug log. Set unconditionally on server.
 */
if (isServerRuntime) {
	logger.level = "debug"
}

type EnvStandardSchema<T> = {
	readonly "~standard": {
		readonly version: 1
		readonly vendor: string
		readonly validate: (
			value: unknown
		) => { value: T; issues?: undefined } | { issues: { message: string }[] }
		readonly types?: { input: unknown; output: T }
	}
}

const nonEmptyStringSchema: EnvStandardSchema<string> = {
	"~standard": {
		version: 1,
		vendor: "superstarter-env",
		validate(value: unknown) {
			if (typeof value === "string" && value.length > 0) {
				return { value }
			}
			return { issues: [{ message: "expected non-empty string" }] }
		}
	}
}

const optionalStringSchema: EnvStandardSchema<string | undefined> = {
	"~standard": {
		version: 1,
		vendor: "superstarter-env",
		validate(value: unknown) {
			if (value === undefined || typeof value === "string") {
				return { value }
			}
			return { issues: [{ message: "expected string or undefined" }] }
		}
	}
}

const iamRoleArnSchema: EnvStandardSchema<string> = {
	"~standard": {
		version: 1,
		vendor: "superstarter-env",
		validate(value: unknown) {
			if (typeof value === "string" && value.startsWith("arn:aws:iam::")) {
				return { value }
			}
			return { issues: [{ message: "expected iam role arn" }] }
		}
	}
}

const optionalSecretsManagerArnSchema: EnvStandardSchema<string | undefined> = {
	"~standard": {
		version: 1,
		vendor: "superstarter-env",
		validate(value: unknown) {
			if (value === undefined) {
				return { value: undefined }
			}
			if (typeof value === "string" && value.startsWith("arn:aws:secretsmanager:")) {
				return { value }
			}
			return { issues: [{ message: "expected secrets manager arn or undefined" }] }
		}
	}
}

/**
 * DO NOT REMOVE THIS DEFAULT.
 *
 * Next.js commands set NODE_ENV for app/server execution, but standalone Bun
 * scripts do not. The old Zod env schema used `.default("development")`, so a
 * missing NODE_ENV was accepted and normalized before validation. The JSON
 * Schema/AJV migration validates the final runtime environment strictly, so we
 * preserve the old behavior by mutating process.env before createEnv reads
 * runtimeEnv. This default is only for the truly-unset case; a present-but-
 * invalid NODE_ENV must still fail loudly below.
 */
if (!Object.hasOwn(process.env, "NODE_ENV")) {
	Object.assign(process.env, { NODE_ENV: "development" })
}

const nodeEnvValue = process.env.NODE_ENV

const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		AWS_ROLE_ARN: iamRoleArnSchema,
		DATABASE_HOST: nonEmptyStringSchema,
		DATABASE_ADMIN_SECRET_ARN: optionalSecretsManagerArnSchema,
		VERCEL_PROJECT_PRODUCTION_URL: optionalStringSchema,
		VERCEL_GIT_COMMIT_SHA: optionalStringSchema,
		VERCEL_OIDC_TOKEN: optionalStringSchema,
		NODE_ENV: validate.compile({
			type: "string",
			enum: ["development", "test", "production"]
		} as const)
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// NEXT_PUBLIC_CLIENTVAR: nonEmptyStringSchema,
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		AWS_ROLE_ARN: process.env.AWS_ROLE_ARN,
		DATABASE_HOST: process.env.DATABASE_HOST,
		DATABASE_ADMIN_SECRET_ARN: process.env.DATABASE_ADMIN_SECRET_ARN,
		VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
		VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
		VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
		NODE_ENV: nodeEnvValue
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true
})

export { env }
