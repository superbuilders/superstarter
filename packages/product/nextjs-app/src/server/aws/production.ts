import "server-only"
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider"
import { AWS_REGION, type AwsRoleArn } from "#env.ts"

/** The deployment's AWS identity: Vercel's OIDC token exchanged for the runtime role. Uncached on
 * purpose; the Postgres signer asks for it once per new physical connection. */
export const productionAwsCredentialsOf = (roleArn: AwsRoleArn) =>
	awsCredentialsProvider({ roleArn, clientConfig: { region: AWS_REGION } })
