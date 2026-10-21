import * as iam from "@distilled.cloud/aws/iam"
import { Array as Arr, Effect, Schema } from "effect"
import type { VercelTeamSlug } from "#env.ts"
import { requiredTags, vercelAudience, vercelIssuer, vercelOidcProviderArn } from "#names.ts"

class SharedIdentityMismatch extends Schema.TaggedError<
	SharedIdentityMismatch,
	{ readonly brand: unique symbol }
>()("SharedIdentityMismatch", { providerArn: Schema.String }) {}

/**
 * The team's Vercel OIDC provider. The issuer is shared by every project of the team in the
 * account, so an existing provider is admitted, never adopted or retagged. No thumbprint: IAM
 * verifies the issuer's TLS certificate against its own trusted authorities.
 */
export const ensureVercelOidcProvider = Effect.fn(function* (
	target: Readonly<{ account: string; team: VercelTeamSlug }>
) {
	const issuer = vercelIssuer(target.team)
	const audience = vercelAudience(target.team)
	const providerArn = vercelOidcProviderArn(target)
	const existing = yield* iam
		.getOpenIDConnectProvider({ OpenIDConnectProviderArn: providerArn })
		.pipe(
			Effect.map((provider) => ({ kind: "existing", provider }) as const),
			Effect.catchTag("NoSuchEntityException", () => Effect.succeed({ kind: "absent" } as const))
		)
	if (existing.kind === "existing") {
		const url = existing.provider.Url
		const audiences = existing.provider.ClientIDList
		const admitted =
			Arr.contains([issuer, `https://${issuer}`], url) &&
			audiences !== undefined &&
			Arr.contains(audiences, audience)
		if (!admitted) {
			return yield* SharedIdentityMismatch.make({ providerArn })
		}
		return
	}
	yield* iam.createOpenIDConnectProvider({
		Url: `https://${issuer}`,
		ClientIDList: [audience],
		// No Project tag: the provider serves every project of the team in this account.
		Tags: [{ Key: "Stage", Value: requiredTags("shared").Stage }]
	})
})
