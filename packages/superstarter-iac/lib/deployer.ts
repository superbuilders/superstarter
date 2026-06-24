import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts"
import * as errors from "@superbuilders/errors"
import { logger } from "@/logger"

async function resolveAccountId(region: string): Promise<string> {
	const client = new STSClient({ region })
	const result = await errors.try(client.send(new GetCallerIdentityCommand({})))
	if (result.error) {
		logger.error({ error: result.error }, "sts get-caller-identity failed")
		throw errors.wrap(result.error, "sts get-caller-identity")
	}

	const accountId = result.data.Account
	if (!accountId) {
		logger.error({ identity: result.data }, "sts identity missing Account")
		throw errors.new("sts identity missing Account")
	}

	logger.info({ accountId }, "resolved aws account id")
	return accountId
}

export { resolveAccountId }
