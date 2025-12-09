// biome-ignore-all lint/style/noProcessEnv: env wrapper needs to be able to access process.env
import * as logger from "@superbuilders/slog"
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

// always turn on debug logging, even in prod
logger.setDefaultLogLevel(logger.DEBUG)

const isServerRuntime = typeof window === "undefined"

if (!process.env.NEXT_RUNTIME && isServerRuntime) {
	/* do not touch this, we do this require to ensure correct env available during build */
	const { loadEnvConfig } = require("@next/env")
	const projectDir = process.cwd()
	loadEnvConfig(projectDir)
}

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		DATABASE_URL: z.url(),
		INNGEST_EVENT_KEY: z.string().optional(),
		INNGEST_SIGNING_KEY: z.string().optional(),
		VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
		VERCEL_GIT_COMMIT_SHA: z.string().optional(),
		VERCEL_OIDC_TOKEN: z.string().optional(),
		NODE_ENV: z.enum(["development", "test", "production"]).default("development")
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// NEXT_PUBLIC_CLIENTVAR: z.string(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
		INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
		VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
		VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
		VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
		NODE_ENV: process.env.NODE_ENV
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
