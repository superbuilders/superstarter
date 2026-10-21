import * as IAM from "alchemy/AWS/IAM"
import type { Input } from "alchemy/Input"
import { Duration, Effect } from "effect"
import type { VercelProject } from "#env.ts"
import {
	type Names,
	vercelAudience,
	vercelIssuer,
	vercelOidcProviderArn,
	vercelSubjectsOf
} from "#names.ts"

/** IAM's default maximum session, declared so reconciliation compares the value AWS returns. */
const RUNTIME_MAX_SESSION_DURATION = Duration.hours(1)

/**
 * The role Vercel deployments assume through OIDC: trusted only for this team's audience and the
 * project's production, preview and development subjects, holding exactly the given grants. Its
 * inline policy is named for the role, so permissions update in place.
 */
export const runtimeIdentity = Effect.fn(function* (
	input: Readonly<{
		names: Names
		account: string
		vercel: VercelProject
		statements: readonly Input<IAM.PolicyStatement>[]
	}>
) {
	const issuer = vercelIssuer(input.vercel.team)
	return yield* IAM.Role("Runtime", {
		roleName: input.names.runtimeRole,
		description: input.names.runtimeRoleDescription,
		maxSessionDuration: RUNTIME_MAX_SESSION_DURATION,
		assumeRolePolicyDocument: {
			Version: "2012-10-17",
			Statement: [
				{
					Sid: "VercelDeployments",
					Effect: "Allow",
					Principal: {
						Federated: vercelOidcProviderArn({ account: input.account, team: input.vercel.team })
					},
					Action: ["sts:AssumeRoleWithWebIdentity"],
					Condition: {
						StringEquals: {
							[`${issuer}:aud`]: vercelAudience(input.vercel.team),
							[`${issuer}:sub`]: vercelSubjectsOf(input.vercel)
						}
					}
				}
			]
		},
		inlinePolicies: {
			[input.names.runtimePolicy]: { Version: "2012-10-17", Statement: [...input.statements] }
		},
		tags: { ...input.names.tags }
	})
})
