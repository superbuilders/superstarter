import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts"
import { fromNodeProviderChain } from "@aws-sdk/credential-providers"
import { Credentials, createLazyProvider } from "@distilled.cloud/aws/Credentials"
import * as Region from "@distilled.cloud/aws/Region"
import { AWSEnvironment } from "alchemy/AWS"
import { Effect, Layer, Schema } from "effect"
import { AWS_REGION } from "#environment.ts"

/** The caller STS reports. No account is configured: this template admits whichever account the
 * operator's credentials belong to, and every account-scoped name derives from it. */
const Caller = Schema.Struct({
	Account: Schema.String.check(Schema.isPattern(/^\d{12}$/)),
	Arn: Schema.NonEmptyString,
	UserId: Schema.NonEmptyString
})

/** Endpoint overrides in the shell or AWS config never redirect the identity read. */
const CLIENT_CONFIG = { region: AWS_REGION, ignoreConfiguredEndpointUrls: true } as const

/** What the operator sees when the chain yields no usable credentials. */
const HINTS: ReadonlyArray<string> = [
	"Download a fresh DevFactory credentials.json and run through scripts/with-aws.ts, or refresh AWS_PROFILE, SSO or credential_process, and retry."
]

/** An SDK refusal keeps its native error as `cause`: its class and message name the operator's
 * remedy (expired credentials, a missing profile) and carry no credential material. */
class NativeAwsRejected extends Schema.TaggedError<
	NativeAwsRejected,
	{ readonly brand: unique symbol }
>()("NativeAwsRejected", {
	reason: Schema.Literals(["credentials-or-identity", "caller"]),
	cause: Schema.optional(Schema.Defect())
}) {}

/**
 * The operator's AWS session, behind every Alchemy provider, the state store and bootstrap: the AWS
 * SDK's Node provider chain (environment variables first, which `scripts/with-aws.ts` sets, then
 * profiles, SSO and credential_process) and its account, read once through STS. The chain keeps
 * its own refresh behavior; nothing here mints or persists credentials. Distilled takes the
 * credential source as an Effect, and the SDK's refusal surfaces as a defect because its class is
 * not public.
 */
export const nativeAws = Layer.unwrap(
	Effect.gen(function* () {
		const credentials = yield* Effect.sync(() =>
			fromNodeProviderChain({ clientConfig: CLIENT_CONFIG })
		)
		const response = yield* Effect.acquireUseRelease(
			Effect.sync(() => new STSClient({ ...CLIENT_CONFIG, credentials })),
			(client) =>
				Effect.tryPromise({
					try: (signal) => client.send(new GetCallerIdentityCommand({}), { abortSignal: signal }),
					catch: (cause) => NativeAwsRejected.make({ reason: "credentials-or-identity", cause })
				}),
			(client) =>
				Effect.sync(() => {
					client.destroy()
				})
		)
		const caller = yield* Schema.decodeUnknownEffect(Caller)(response).pipe(
			Effect.mapError(() => NativeAwsRejected.make({ reason: "caller" }))
		)
		const distilled = createLazyProvider(
			Effect.promise(() => credentials()),
			"node-provider-chain",
			HINTS,
			Effect.succeed(AWS_REGION)
		)
		const environment = Layer.effect(
			AWSEnvironment,
			Credentials.pipe(
				Effect.map((resolved) =>
					Effect.succeed({ accountId: caller.Account, region: AWS_REGION, credentials: resolved })
				)
			)
		).pipe(Layer.provide(distilled))
		return Layer.mergeAll(environment, distilled, Region.of(AWS_REGION))
	})
)
