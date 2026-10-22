import { Schema } from "effect"

/** Every resource lives in one region: the database, its IAM authentication, the certificate
 * authorities `rds-ca.ts` pins, and the infrastructure's state. */
export const AWS_REGION = "us-east-1"

/** An RDS endpoint in the region, with no scheme and no port. */
export const RdsEndpoint = Schema.String.check(
	Schema.isPattern(new RegExp(`^[a-z0-9-]+\\.[a-z0-9]+\\.${AWS_REGION}\\.rds\\.amazonaws\\.com$`))
).pipe(Schema.brand("RdsEndpoint"))
export type RdsEndpoint = typeof RdsEndpoint.Type

/** The IAM role Vercel deployments and the operator scripts assume through Vercel OIDC: it signs
 * the application login's RDS IAM tokens and reads the master secret. */
export const AwsRoleArn = Schema.String.check(
	Schema.isPattern(/^arn:aws:iam::[0-9]{12}:role\/[A-Za-z0-9+=,.@_/-]+$/)
).pipe(Schema.brand("AwsRoleArn"))
export type AwsRoleArn = typeof AwsRoleArn.Type
