// biome-ignore-all lint/style/noProcessEnv: shim mutates env to feed drizzle-kit child process

import { writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import * as errors from "@superbuilders/errors"
import { fetchAdminSecret } from "@/db/admin-secret"
import { DATABASE_NAME } from "@/db/constants"
import { RDS_CA_BUNDLE } from "@/db/rds-ca-bundle"
import { env } from "@/env"
import { logger } from "@/logger"

const forwardedArgs = process.argv.slice(2)

logger.info(
	{ args: forwardedArgs, host: env.DATABASE_HOST, database: DATABASE_NAME },
	"drizzle-kit-shim starting"
)

const secret = await fetchAdminSecret()

const url = `postgresql://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${env.DATABASE_HOST}:5432/${DATABASE_NAME}?sslmode=verify-full`
process.env.DATABASE_URL = url

// drizzle-kit spawns its own pg client from the connection string, so we
// can't inject the RDS CA as a Buffer the way src/db/index.ts does. Write
// the bundled CA to a temp file and point Node at it via NODE_EXTRA_CA_CERTS.
const caPath = join(tmpdir(), `superstarter-rds-ca-${process.pid}.pem`)
const writeCaResult = errors.trySync(function writeCa() {
	writeFileSync(caPath, RDS_CA_BUNDLE)
})
if (writeCaResult.error) {
	logger.error({ error: writeCaResult.error, path: caPath }, "rds ca bundle write failed")
	throw errors.wrap(writeCaResult.error, "rds ca bundle write")
}
process.env.NODE_EXTRA_CA_CERTS = caPath

logger.info({ args: forwardedArgs, caPath }, "drizzle-kit-shim invoking drizzle-kit")

const child = Bun.spawn(["bun", "--bun", "drizzle-kit", ...forwardedArgs], {
	stdio: ["inherit", "inherit", "inherit"],
	env: process.env
})

const exitCode = await child.exited
if (exitCode !== 0) {
	process.exit(exitCode)
}
