// biome-ignore-all lint/style/noProcessEnv: env wrapper needs to be able to access process.env
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"
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

const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		AWS_ROLE_ARN: z.string().startsWith("arn:aws:iam::"),
		DATABASE_HOST: z.string().min(1),
		DATABASE_ADMIN_SECRET_ARN: z.string().startsWith("arn:aws:secretsmanager:").optional(),
		VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
		VERCEL_GIT_COMMIT_SHA: z.string().optional(),
		VERCEL_OIDC_TOKEN: z.string().optional(),
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		CLERK_SECRET_KEY: z.string().min(1)
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1)
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
		NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
		CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY
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
