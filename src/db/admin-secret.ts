import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager"
import * as errors from "@superbuilders/errors"
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider"
import { z } from "zod"
import { AWS_REGION } from "@/db/constants"
import { env } from "@/env"
import { logger } from "@/logger"

const AdminSecretSchema = z.object({
	username: z.string().min(1),
	password: z.string().min(1)
})

type AdminSecret = z.infer<typeof AdminSecretSchema>

async function fetchAdminSecret(): Promise<AdminSecret> {
	if (!env.DATABASE_ADMIN_SECRET_ARN) {
		logger.error("DATABASE_ADMIN_SECRET_ARN is not set")
		throw errors.new("DATABASE_ADMIN_SECRET_ARN required for admin operations")
	}

	const client = new SecretsManagerClient({
		region: AWS_REGION,
		credentials: awsCredentialsProvider({ roleArn: env.AWS_ROLE_ARN })
	})

	const response = await errors.try(
		client.send(new GetSecretValueCommand({ SecretId: env.DATABASE_ADMIN_SECRET_ARN }))
	)
	if (response.error) {
		logger.error(
			{ error: response.error, secretArn: env.DATABASE_ADMIN_SECRET_ARN },
			"admin secret fetch failed"
		)
		throw errors.wrap(response.error, "secrets manager get")
	}

	const raw = response.data.SecretString
	if (!raw) {
		logger.error({ secretArn: env.DATABASE_ADMIN_SECRET_ARN }, "admin secret has no SecretString")
		throw errors.new("admin secret missing SecretString")
	}

	const parsedJson = errors.trySync(() => JSON.parse(raw))
	if (parsedJson.error) {
		logger.error({ error: parsedJson.error }, "admin secret not valid json")
		throw errors.wrap(parsedJson.error, "admin secret json")
	}

	const result = AdminSecretSchema.safeParse(parsedJson.data)
	if (!result.success) {
		logger.error({ error: result.error }, "admin secret shape invalid")
		throw errors.wrap(result.error, "admin secret schema")
	}

	return result.data
}

export type { AdminSecret }
export { fetchAdminSecret }
