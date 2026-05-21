// biome-ignore-all lint/style/noProcessEnv: env wrapper needs to be able to access process.env
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

const isServerRuntime = typeof window === "undefined"

if (!process.env.NEXT_RUNTIME && isServerRuntime) {
	const { loadEnvConfig } = require("@next/env")
	const projectDir = process.cwd()
	loadEnvConfig(projectDir)
}

const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		AWS_ROLE_ARN: z.string().startsWith("arn:aws:iam::").optional(),
		DATABASE_HOST: z.string().min(1).optional(),
		DATABASE_ADMIN_SECRET_ARN: z.string().startsWith("arn:aws:secretsmanager:").optional(),
		DATABASE_LOCAL_URL: z
			.string()
			.regex(/^postgres(ql)?:\/\//, "must be a postgres connection string")
			.optional(),
		VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
		VERCEL_GIT_COMMIT_SHA: z.string().optional(),
		VERCEL_OIDC_TOKEN: z.string().optional(),
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		AUTH_SECRET: z.string().min(32),
		AUTH_GOOGLE_ID: z.string().min(1),
		AUTH_GOOGLE_SECRET: z.string().min(1),
		ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
		OPENAI_API_KEY: z.string().startsWith("sk-"),
		CRON_SECRET: z.string().min(32)
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
		AWS_ROLE_ARN: process.env.AWS_ROLE_ARN,
		DATABASE_HOST: process.env.DATABASE_HOST,
		DATABASE_ADMIN_SECRET_ARN: process.env.DATABASE_ADMIN_SECRET_ARN,
		DATABASE_LOCAL_URL: process.env.DATABASE_LOCAL_URL,
		VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
		VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
		VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
		NODE_ENV: process.env.NODE_ENV,
		AUTH_SECRET: process.env.AUTH_SECRET,
		AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
		AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		CRON_SECRET: process.env.CRON_SECRET
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
