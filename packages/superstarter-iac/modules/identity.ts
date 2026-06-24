import AWS from "alchemy/aws/control"
import type { ModuleContext } from "@/modules/types"

interface IdentityInput {
	readonly context: ModuleContext
	readonly oidcHost: string
	readonly oidcThumbprint: string
	readonly teamSlug: string
	readonly projectName: string
}

interface IdentityOutput {
	readonly roleName: string
	readonly roleArn: string
	readonly oidcProviderArn: string
}

async function provisionIdentity(input: IdentityInput): Promise<IdentityOutput> {
	const { context, oidcHost, oidcThumbprint, teamSlug, projectName } = input
	const { stage, resourcePrefix, tags } = context

	const oidcProvider = await AWS.IAM.OIDCProvider(`vercel-oidc-${stage}`, {
		Url: `https://${oidcHost}/${teamSlug}`,
		ClientIdList: [`https://vercel.com/${teamSlug}`],
		ThumbprintList: [oidcThumbprint],
		Tags: tags
	})
	const oidcProviderArn = oidcProvider.Arn

	const conditionAudKey = `${oidcHost}/${teamSlug}:aud`
	const conditionSubKey = `${oidcHost}/${teamSlug}:sub`
	const conditionAudValue = `https://vercel.com/${teamSlug}`
	const conditionSubValues = ["production", "preview", "development"].map(
		function formatSub(envName) {
			return `owner:${teamSlug}:project:${projectName}:environment:${envName}`
		}
	)

	const roleName = `${resourcePrefix}-vercel`

	const role = await AWS.IAM.Role(`vercel-role-${stage}`, {
		RoleName: roleName,
		Path: "/",
		Description: `${resourcePrefix} vercel oidc application role`,
		MaxSessionDuration: 3600,
		AssumeRolePolicyDocument: {
			Version: "2012-10-17",
			Statement: [
				{
					Effect: "Allow",
					Principal: { Federated: oidcProviderArn },
					Action: "sts:AssumeRoleWithWebIdentity",
					Condition: {
						StringEquals: {
							[conditionAudKey]: conditionAudValue
						},
						StringLike: {
							[conditionSubKey]: conditionSubValues
						}
					}
				}
			]
		},
		Tags: tags
	})

	return {
		roleName,
		roleArn: role.Arn,
		oidcProviderArn
	}
}

export type { IdentityInput, IdentityOutput }
export { provisionIdentity }
