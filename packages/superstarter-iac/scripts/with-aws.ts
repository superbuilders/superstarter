// biome-ignore-all lint/style/noProcessEnv: launcher reads HOME + DEVFACTORY_CREDS_PATH + spawns child

import { homedir } from "node:os"
import { join } from "node:path"
import * as errors from "@superbuilders/errors"
import { z } from "zod"
import { logger } from "@/logger"

const DevfactoryCredentialsSchema = z.object({
	accessKeyId: z.string().min(1),
	secretAccessKey: z.string().min(1),
	sessionToken: z.string().min(1),
	expiration: z.iso.datetime()
})

type DevfactoryCredentials = z.infer<typeof DevfactoryCredentialsSchema>

const defaultPath = join(homedir(), "Downloads", "credentials.json")
const overridePath = process.env.DEVFACTORY_CREDS_PATH
const credsPath = overridePath ? overridePath : defaultPath

const file = Bun.file(credsPath)
const fileExists = await file.exists()
if (!fileExists) {
	logger.error({ path: credsPath }, "devfactory credentials file not found")
	throw errors.new(
		`credentials.json not found at ${credsPath}; download a fresh dump from the devfactory aws portal`
	)
}

const rawJson = await errors.try(file.json())
if (rawJson.error) {
	logger.error(
		{ path: credsPath, error: rawJson.error },
		"devfactory credentials file not valid json"
	)
	throw errors.wrap(rawJson.error, "credentials.json parse")
}

const parsed = DevfactoryCredentialsSchema.safeParse(rawJson.data)
if (!parsed.success) {
	logger.error({ path: credsPath, error: parsed.error }, "devfactory credentials shape invalid")
	throw errors.wrap(parsed.error, "credentials.json schema")
}

const creds: DevfactoryCredentials = parsed.data

const expiresAtMs = new Date(creds.expiration).getTime()
const nowMs = Date.now()
const msUntilExpiry = expiresAtMs - nowMs
const MIN_HEADROOM_MS = 60_000

if (msUntilExpiry < MIN_HEADROOM_MS) {
	logger.error(
		{ path: credsPath, expiration: creds.expiration, msUntilExpiry },
		"devfactory credentials expired or expiring soon"
	)
	throw errors.new(
		`devfactory credentials expired at ${creds.expiration}; re-download from the aws portal`
	)
}

const childArgv = process.argv.slice(2)
const executable = childArgv[0]
if (!executable) {
	logger.error("with-aws requires a child command")
	throw errors.new("usage: with-aws <command> [args...]")
}
const childArgs = childArgv.slice(1)

const minutesUntilExpiry = Math.floor(msUntilExpiry / 60_000)
logger.info(
	{
		path: credsPath,
		expiration: creds.expiration,
		minutesUntilExpiry,
		command: executable,
		args: childArgs
	},
	"devfactory credentials loaded"
)

const child = Bun.spawn([executable, ...childArgs], {
	stdio: ["inherit", "inherit", "inherit"],
	env: {
		...process.env,
		AWS_ACCESS_KEY_ID: creds.accessKeyId,
		AWS_SECRET_ACCESS_KEY: creds.secretAccessKey,
		AWS_SESSION_TOKEN: creds.sessionToken,
		AWS_REGION: "us-east-1"
	}
})

const exitCode = await child.exited
process.exit(exitCode)
